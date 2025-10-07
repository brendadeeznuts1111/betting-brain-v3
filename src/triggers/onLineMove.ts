/**
 * D1 Trigger for Line Movement Processing
 * Automatically processes line movements when they're inserted
 */

import { LineMovement } from '../types/database';
import { Env } from '../types/api';

export async function onLineMove(env: Env, newRow: LineMovement): Promise<void> {
  try {
    console.log(`Processing line movement trigger for event ${newRow.eid}, market ${newRow.mt}`);
    
    // Calculate line movement metrics
    const metrics = calculateLineMovementMetrics(newRow);
    
    // Check if this is a significant movement
    if (metrics.isSignificant) {
      // Trigger additional processing
      await triggerAdditionalProcessing(newRow, metrics, env);
    }
    
    // Update real-time metrics
    await updateRealTimeMetrics(newRow, env);
    
    console.log(`Line movement trigger completed for event ${newRow.eid}`);
  } catch (error) {
    console.error('Error in line movement trigger:', error);
    // Don't throw - triggers should not fail the insert operation
  }
}

interface LineMovementMetrics {
  isSignificant: boolean;
  lineChange: number;
  volumeChange: number;
  changePercentage: number;
  timestamp: string;
}

function calculateLineMovementMetrics(row: LineMovement): LineMovementMetrics {
  const lineChange = (row.lb !== null && row.la !== null) ? row.la - row.lb : 0;
  const volumeChange = (row.vb !== null && row.va !== null) ? row.va - row.vb : 0;
  
  // Calculate change percentage
  let changePercentage = 0;
  if (row.lb !== null && row.lb !== 0) {
    changePercentage = (lineChange / Math.abs(row.lb)) * 100;
  }
  
  // Determine if movement is significant
  const isSignificant = 
    Math.abs(lineChange) >= 2 || // 2+ point line change
    Math.abs(changePercentage) >= 10 || // 10%+ change
    (row.vb !== null && row.va !== null && row.vb > 0 && 
     Math.abs(volumeChange) / row.vb >= 0.5); // 50%+ volume change
  
  return {
    isSignificant,
    lineChange,
    volumeChange,
    changePercentage,
    timestamp: row.ts
  };
}

async function triggerAdditionalProcessing(
  row: LineMovement, 
  metrics: LineMovementMetrics, 
  env: Env
): Promise<void> {
  // Send to steam webhook queue for steam move detection
  await env.STEAM_WEBHOOK.send({
    eid: row.eid,
    mt: row.mt,
    lb: row.lb,
    la: row.la,
    vb: row.vb,
    va: row.va,
    ts: row.ts,
    trigger: 'line_movement_trigger',
    metrics: {
      lineChange: metrics.lineChange,
      volumeChange: metrics.volumeChange,
      changePercentage: metrics.changePercentage
    }
  });
  
  console.log(`Triggered additional processing for significant movement: ${metrics.lineChange} points`);
}

async function updateRealTimeMetrics(row: LineMovement, env: Env): Promise<void> {
  // Update real-time exposure tracking
  await updateExposureForEvent(row.eid, env);
  
  // Update hold percentage if this affects betting volume
  if (row.vb !== null && row.va !== null) {
    await updateHoldPercentage(row.eid, row.mt, env);
  }
}

async function updateExposureForEvent(eventId: string, env: Env): Promise<void> {
  // This would update exposure tracking based on line movements
  // For now, just log that we would update exposure
  console.log(`Would update exposure tracking for event ${eventId}`);
}

async function updateHoldPercentage(eventId: string, marketType: string, env: Env): Promise<void> {
  // This would recalculate hold percentage based on new volume data
  // For now, just log that we would update hold percentage
  console.log(`Would update hold percentage for event ${eventId}, market ${marketType}`);
}

// Export for use in D1 trigger configuration
export const lineMovementTrigger = {
  table: 'line_movements',
  operation: 'INSERT',
  handler: onLineMove
};
