/**
 * Line Movement Ingestion Queue Consumer
 * Processes incoming line movement data with validation and deduplication
 */

import { LineMovement, LineMovementInsert } from '../types/database';
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

// Validation schema for line movement data
const LineMovementSchema = z.object({
  eid: z.string().min(1),
  mt: z.string().min(1),
  lb: z.number().nullable(),
  la: z.number().nullable(),
  vb: z.number().nullable(),
  va: z.number().nullable(),
  ts: z.string().datetime()
});

// Type inference from schema
type LineMovementData = z.infer<typeof LineMovementSchema>;

export async function handleLineIngress(message: Message, env: Env, ctx: ExecutionContext): Promise<void> {
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
    const validatedData = LineMovementSchema.parse(data);
    
    // Check cost cap before processing
    const costCheck = await costCapGuard.checkRequest(new Request('https://internal'), env);
    if (!costCheck.allowed) {
      console.warn('Line ingress blocked by cost cap:', costCheck.reason);
      // Acknowledge message even if blocked by cost cap to prevent retry loops
      return;
    }

    // Process the line movement
    await processLineMovement(validatedData, env);
    
    console.log(`Processed line movement for event ${validatedData.eid}, market ${validatedData.mt}`);
    
    // Message will be automatically acknowledged on successful completion
  } catch (error) {
    console.error('Error processing line movement:', error);
    
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

async function processLineMovement(data: LineMovementInsert, env: Env): Promise<void> {
  const now = new Date().toISOString();
  
  // Insert line movement into database
  await env.ANALYTICS.prepare(`
    INSERT INTO line_movements (eid, mt, lb, la, vb, va, ts, ing)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    data.eid,
    data.mt,
    data.lb,
    data.la,
    data.vb,
    data.va,
    data.ts,
    now
  ).run();

  // Check if this is a significant line movement
  const isSignificant = await checkSignificantMovement(data, env);
  
  if (isSignificant) {
    // Trigger steam move detection
    await triggerSteamMoveDetection(data, env);
  }

  // Update exposure tracking if needed
  await updateExposureTracking(data, env);
  
  // Write metrics to analytics engine
  await env.ANALYTICS_ENGINE.writeDataPoint({
    blobs: [data.eid, data.mt, 'line_ingress'],
    doubles: [
      data.lb || 0,
      data.la || 0,
      data.vb || 0,
      data.va || 0
    ],
    indexes: ['line_ingress']
  });
}

async function checkSignificantMovement(data: LineMovementInsert, env: Env): Promise<boolean> {
  // Check if line change is significant (e.g., > 2 points)
  if (data.lb !== null && data.la !== null) {
    const lineChange = Math.abs(data.la - data.lb);
    if (lineChange >= 2) {
      return true;
    }
  }

  // Check if volume change is significant (e.g., > 50% increase)
  if (data.vb !== null && data.va !== null && data.vb > 0) {
    const volumeChange = (data.va - data.vb) / data.vb;
    if (volumeChange >= 0.5) {
      return true;
    }
  }

  return false;
}

async function triggerSteamMoveDetection(data: LineMovementInsert, env: Env): Promise<void> {
  // Send to steam webhook queue for further processing
  await env.STEAM_WEBHOOK.send({
    eid: data.eid,
    mt: data.mt,
    lb: data.lb,
    la: data.la,
    vb: data.vb,
    va: data.va,
    ts: data.ts,
    trigger: 'line_movement'
  });
}

async function updateExposureTracking(data: LineMovementInsert, env: Env): Promise<void> {
  // This would update exposure tracking based on line movements
  // For now, just log that we would update exposure
  console.log(`Would update exposure tracking for event ${data.eid}`);
}

// Batch processing for efficiency
export async function handleBatchLineIngress(messages: Message[], env: Env, ctx: ExecutionContext): Promise<void> {
  const batchSize = 10; // Max batch size from wrangler.toml
  const batches = [];
  
  for (let i = 0; i < messages.length; i += batchSize) {
    batches.push(messages.slice(i, i + batchSize));
  }

  for (const batch of batches) {
    await Promise.all(
      batch.map(message => handleLineIngress(message, env, ctx))
    );
  }
}
