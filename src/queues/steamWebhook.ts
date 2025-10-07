/**
 * Steam Move Webhook Queue Consumer
 * Processes steam move notifications with deduplication and alerting
 */

import { SteamDedupe, SteamDedupeInsert } from '../types/database';
import { SteamMoveMetrics } from '../types/metrics';
import { Env } from '../types/api';
import { costCapGuard } from '../guards/costCap';
import { z } from 'zod';

// Helper function to determine if an error should trigger a retry
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    // Don't retry validation errors or parsing errors
    if (error.name === 'ZodError' || error.message.includes('validation')) {
      return false;
    }
    
    // Don't retry database constraint errors
    if (error.message.includes('UNIQUE constraint') || 
        error.message.includes('FOREIGN KEY constraint')) {
      return false;
    }
    
    // Retry network errors, timeouts, and other transient errors
    if (error.message.includes('timeout') || 
        error.message.includes('network') ||
        error.message.includes('connection')) {
      return true;
    }
  }
  
  // Default to retryable for unknown errors
  return true;
}

// Validation schema for steam move data
const SteamMoveSchema = z.object({
  eid: z.string().min(1),
  mt: z.string().min(1),
  lb: z.number().nullable(),
  la: z.number().nullable(),
  vb: z.number().nullable(),
  va: z.number().nullable(),
  ts: z.string().datetime(),
  trigger: z.string().optional()
});

// Type inference from schema
type SteamMoveData = z.infer<typeof SteamMoveSchema>;

export async function handleSteamWebhook(message: Message, env: Env, ctx: ExecutionContext): Promise<void> {
  try {
    let data;
    try {
      data = JSON.parse(message.body as string);
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      // JSON parsing errors are non-retryable
      return;
    }
    
    // Validate incoming data
    const validatedData = SteamMoveSchema.parse(data);
    
    // Check cost cap before processing
    const costCheck = await costCapGuard.checkRequest(new Request('https://internal'), env);
    if (!costCheck.allowed) {
      console.warn('Steam webhook blocked by cost cap:', costCheck.reason);
      // Acknowledge message even if blocked by cost cap to prevent retry loops
      return;
    }

    // Check for deduplication
    const isDuplicate = await checkDeduplication(validatedData, env);
    if (isDuplicate) {
      console.log(`Steam move already processed for event ${validatedData.eid}, market ${validatedData.mt}`);
      // Acknowledge duplicate messages to prevent retry loops
      return;
    }

    // Process the steam move
    await processSteamMove(validatedData, env);
    
    console.log(`Processed steam move for event ${validatedData.eid}, market ${validatedData.mt}`);
    
    // Message will be automatically acknowledged on successful completion
  } catch (error) {
    console.error('Error processing steam webhook:', error);
    
    // Check if this is a retryable error
    if (isRetryableError(error)) {
      console.log('Retryable error detected, message will be retried');
      throw error; // This will trigger message retry
    } else {
      console.error('Non-retryable error, acknowledging message to prevent retry loop');
      // For non-retryable errors, we don't throw, so the message is acknowledged
      // This prevents infinite retry loops for validation errors, etc.
    }
  }
}

async function checkDeduplication(data: SteamMoveData, env: Env): Promise<boolean> {
  const dedupeKey = `${data.eid}_${data.mt}`;
  
  // Check if we've already processed this event/market combination recently
  const existing = await env.ANALYTICS.prepare(`
    SELECT 1 FROM steam_dedupe 
    WHERE eid = ? AND mt = ? 
    AND ts > datetime('now', '-5 minutes')
  `).bind(data.eid, data.mt).first();

  if (existing) {
    return true; // Duplicate found
  }

  // Insert deduplication record
  await env.ANALYTICS.prepare(`
    INSERT OR REPLACE INTO steam_dedupe (eid, mt, ts)
    VALUES (?, ?, ?)
  `).bind(data.eid, data.mt, data.ts).run();

  return false; // Not a duplicate
}

async function processSteamMove(data: SteamMoveData, env: Env): Promise<void> {
  // Calculate steam move metrics
  const metrics = await calculateSteamMoveMetrics(data, env);
  
  // Check if this qualifies as a steam move
  const isSteamMove = await evaluateSteamMove(metrics, env);
  
  if (isSteamMove) {
    // Send alert
    await sendSteamMoveAlert(metrics, env);
    
    // Log to analytics engine
    await logSteamMoveToAnalytics(metrics, env);
  }
}

async function calculateSteamMoveMetrics(data: SteamMoveData, env: Env): Promise<SteamMoveMetrics> {
  // Calculate line change
  const lineChange = (data.lb !== null && data.la !== null) ? data.la - data.lb : 0;
  
  // Calculate volume change
  const volumeChange = (data.vb !== null && data.va !== null) ? data.va - data.vb : 0;
  
  // Calculate sigma (standard deviation) - simplified calculation
  const sigma = await calculateSigma(data.eid, data.mt, env);
  
  return {
    eventId: data.eid,
    marketType: data.mt,
    lineChange,
    volumeChange,
    sigma,
    timestamp: data.ts,
    isSteamMove: false, // Will be determined by evaluateSteamMove
    alertThreshold: {
      sigma: 3,
      timeWindow: 60 // 60 seconds
    }
  };
}

async function calculateSigma(eventId: string, marketType: string, env: Env): Promise<number> {
  // Get recent line movements for this event/market to calculate sigma
  const recentMovements = await env.ANALYTICS.prepare(`
    SELECT lb, la, ts
    FROM line_movements 
    WHERE eid = ? AND mt = ? 
    AND ts > datetime('now', '-1 hour')
    ORDER BY ts DESC
    LIMIT 100
  `).bind(eventId, marketType).all() as Array<{
    lb: number | null;
    la: number | null;
    ts: string;
  }>;

  if (recentMovements.length < 2) {
    return 0; // Not enough data
  }

  // Calculate standard deviation of line changes
  const changes = recentMovements
    .map((row: any) => row.lb !== null && row.la !== null ? row.la - row.lb : 0)
    .filter(change => change !== 0);

  if (changes.length < 2) {
    return 0;
  }

  const mean = changes.reduce((sum, change) => sum + change, 0) / changes.length;
  const variance = changes.reduce((sum, change) => sum + Math.pow(change - mean, 2), 0) / changes.length;
  
  return Math.sqrt(variance);
}

async function evaluateSteamMove(metrics: SteamMoveMetrics, env: Env): Promise<boolean> {
  // Check if line change exceeds 3 sigma threshold
  const sigmaThreshold = metrics.alertThreshold.sigma;
  const timeWindow = metrics.alertThreshold.timeWindow;
  
  // Check if this is a significant move within the time window
  const isSignificantMove = Math.abs(metrics.lineChange) >= (sigmaThreshold * metrics.sigma);
  
  if (isSignificantMove) {
    // Check if this happened within the time window
    const moveTime = new Date(metrics.timestamp).getTime();
    const now = Date.now();
    const timeDiff = (now - moveTime) / 1000; // seconds
    
    return timeDiff <= timeWindow;
  }
  
  return false;
}

async function sendSteamMoveAlert(metrics: SteamMoveMetrics, env: Env): Promise<void> {
  // In a real implementation, this would send alerts via webhook, email, etc.
  console.log(`🚨 STEAM MOVE ALERT: Event ${metrics.eventId}, Market ${metrics.marketType}`);
  console.log(`Line Change: ${metrics.lineChange}, Sigma: ${metrics.sigma.toFixed(2)}`);
  console.log(`Volume Change: ${metrics.volumeChange}, Time: ${metrics.timestamp}`);
}

async function logSteamMoveToAnalytics(metrics: SteamMoveMetrics, env: Env): Promise<void> {
  // Log to Cloudflare Analytics Engine
  await env.ANALYTICS_ENGINE.writeDataPoint({
    blobs: [metrics.eventId, metrics.marketType],
    doubles: [metrics.lineChange, metrics.volumeChange, metrics.sigma],
    indexes: ['steam_move']
  });
}

// Batch processing for efficiency
export async function handleBatchSteamWebhook(messages: Message[], env: Env, ctx: ExecutionContext): Promise<void> {
  const batchSize = 5; // Max batch size from wrangler.toml
  const batches = [];
  
  for (let i = 0; i < messages.length; i += batchSize) {
    batches.push(messages.slice(i, i + batchSize));
  }

  for (const batch of batches) {
    await Promise.all(
      batch.map(message => handleSteamWebhook(message, env, ctx))
    );
  }
}
