/**
 * 30-Second Exposure Calculation Schedule
 * Real-time exposure tracking with max 50 rows per event constraint
 */

import { ExposureTracking, ExposureTrackingInsert } from '../types/database';
import { ExposureMetrics } from '../types/metrics';
import { Env } from '../types/api';
import { costCapGuard } from '../guards/costCap';

export async function handleExposureCalculation(env: Env, ctx: ExecutionContext): Promise<void> {
  try {
    console.log('Starting 30-second exposure calculation...');
    
    // Check cost cap before processing
    const costCheck = await costCapGuard.checkRequest(new Request('https://internal'), env);
    if (!costCheck.allowed) {
      console.warn('Exposure calculation blocked by cost cap:', costCheck.reason);
      return;
    }

    // Get all active events with recent line movements
    const activeEvents = await getActiveEvents(env);
    console.log(`Processing exposure for ${activeEvents.length} active events`);
    
    // Process each event (max 50 rows constraint)
    const exposureUpdates = await Promise.all(
      activeEvents.slice(0, 50).map(eventId => calculateEventExposure(eventId, env))
    );
    
    // Update exposure tracking
    await updateExposureTracking(exposureUpdates, env);
    
    // Check for alerts
    await checkExposureAlerts(exposureUpdates, env);
    
    console.log('30-second exposure calculation completed');
  } catch (error) {
    console.error('Error in exposure calculation:', error);
  }
}

async function getActiveEvents(env: Env): Promise<string[]> {
  // Get events with recent line movements (last 5 minutes)
  const result = await env.ANALYTICS.prepare(`
    SELECT DISTINCT eid
    FROM line_movements
    WHERE ing > datetime('now', '-5 minutes')
    ORDER BY ing DESC
    LIMIT 50
  `).all();
  
  return result.map((row: any) => row.eid);
}

async function calculateEventExposure(eventId: string, env: Env): Promise<ExposureMetrics> {
  // Get current exposure data for this event
  const exposureData = await env.ANALYTICS.prepare(`
    SELECT side, risk, net
    FROM exposure_tracking
    WHERE eid = ?
  `).bind(eventId).all();
  
  // Calculate total risk and max exposure
  let totalRisk = 0;
  let maxExposure = 0;
  const sides: ExposureMetrics['sides'] = [];
  
  for (const row of exposureData) {
    const risk = (row.risk as number) || 0;
    const net = (row.net as number) || 0;
    const side = (row.side as string) || 'UNKNOWN';
    
    totalRisk += risk;
    maxExposure = Math.max(maxExposure, Math.abs(net));
    
    sides.push({
      side: side as 'HOME' | 'AWAY',
      risk,
      net,
      percentage: risk > 0 ? (net / risk) * 100 : 0
    });
  }
  
  return {
    eventId,
    sides,
    totalRisk,
    maxExposure,
    lastUpdated: new Date().toISOString(),
    alertThreshold: {
      maxAmount: 50000, // $50k
      maxPercentage: 60 // 60%
    }
  };
}

async function updateExposureTracking(exposureUpdates: ExposureMetrics[], env: Env): Promise<void> {
  const now = new Date().toISOString();
  
  for (const exposure of exposureUpdates) {
    for (const side of exposure.sides) {
      await env.ANALYTICS.prepare(`
        INSERT OR REPLACE INTO exposure_tracking (eid, side, risk, net, upd)
        VALUES (?, ?, ?, ?, ?)
      `).bind(
        exposure.eventId,
        side.side,
        side.risk,
        side.net,
        now
      ).run();
    }
  }
}

async function checkExposureAlerts(exposureUpdates: ExposureMetrics[], env: Env): Promise<void> {
  for (const exposure of exposureUpdates) {
    // Check if max exposure exceeds threshold
    if (exposure.maxExposure > exposure.alertThreshold.maxAmount) {
      await sendExposureAlert(exposure, 'MAX_AMOUNT', env);
    }
    
    // Check if any side exceeds percentage threshold
    for (const side of exposure.sides) {
      if (Math.abs(side.percentage) > exposure.alertThreshold.maxPercentage) {
        await sendExposureAlert(exposure, 'MAX_PERCENTAGE', env);
        break;
      }
    }
  }
}

async function sendExposureAlert(exposure: ExposureMetrics, alertType: string, env: Env): Promise<void> {
  console.log(`🚨 EXPOSURE ALERT: Event ${exposure.eventId}`);
  console.log(`Alert Type: ${alertType}`);
  console.log(`Total Risk: $${exposure.totalRisk.toLocaleString()}`);
  console.log(`Max Exposure: $${exposure.maxExposure.toLocaleString()}`);
  console.log(`Sides:`, exposure.sides);
  
  // Log to Analytics Engine
  await env.ANALYTICS_ENGINE.writeDataPoint({
    blobs: [exposure.eventId, alertType],
    doubles: [exposure.totalRisk, exposure.maxExposure],
    indexes: ['exposure_alert']
  });
}

// Export for use in scheduled trigger
export const exposureCalculationSchedule = {
  cron: '*/30 * * * * *', // Every 30 seconds
  handler: handleExposureCalculation
};
