/**
 * Hourly Sharp Calculation Schedule
 * Calculates sharp scores for all customers based on CLV and performance metrics
 */

import { SharpIndicator, SharpIndicatorInsert } from '../types/database';
import { SharpScoreMetrics } from '../types/metrics';
import { Env } from '../types/api';
import { runSafe, chunk, isCostCapReached } from '../lib/scheduleUtils';

export async function handleSharpCalculation(env: Env, ctx: ExecutionContext): Promise<void> {
  return runSafe('sharp_calc', env, ctx, async () => {
    console.log('Starting hourly sharp calculation...');

    // Check cost cap before processing
    if (await isCostCapReached(env)) {
      console.warn('Sharp calculation blocked by cost cap');
      return; // Early exit OK
    }

    // Get all customers with recent activity
    const customers = await getActiveCustomers(env);
    console.log(`Processing ${customers.length} active customers`);

    if (!customers.length) {
      console.log('No active customers to process');
      return; // Early exit OK
    }

    // Calculate sharp scores in batches
    const batchSize = 100;
    const batches = chunk(customers, batchSize);

    let processedCount = 0;
    for (const batch of batches) {
      // Check cost cap before each batch
      if (await isCostCapReached(env)) {
        console.warn('Sharp calculation stopped due to cost cap');
        break; // Early exit OK
      }

      await processBatchSharpCalculation(batch, env);
      processedCount += batch.length;
      console.log(`Processed ${processedCount}/${customers.length} customers`);
    }

    // Clean up old data
    await cleanupOldSharpData(env);

    console.log('Hourly sharp calculation completed');
  });
}

async function getActiveCustomers(env: Env): Promise<string[]> {
  // Get customers with activity in the last 24 hours
  const result = await env.ANALYTICS.prepare(`
    SELECT DISTINCT cid
    FROM sharp_indicators
    WHERE upd > datetime('now', '-24 hours')
    ORDER BY upd DESC
    LIMIT 1000
  `).all();

  const customers = result.results as unknown as Array<{ cid: string }>;
  return customers.map(row => row.cid);
}

async function processBatchSharpCalculation(customerIds: string[], env: Env): Promise<void> {
  const sharpScores = await Promise.all(
    customerIds.map(customerId => calculateSharpScore(customerId, env))
  );

  // Update database with new sharp scores
  await updateSharpScores(sharpScores, env);
}

async function calculateSharpScore(customerId: string, env: Env): Promise<SharpScoreMetrics> {
  // Get customer's betting history
  const bettingHistory = await getCustomerBettingHistory(customerId, env);

  if (bettingHistory.length === 0) {
    return {
      customerId,
      sharpScore: 0,
      clv: 0,
      winRate: 0,
      actionCount: 0,
      lastUpdated: new Date().toISOString(),
      alertThreshold: 60
    };
  }

  // Calculate CLV (Customer Lifetime Value)
  const clv = calculateCLV(bettingHistory);

  // Calculate win rate
  const winRate = calculateWinRate(bettingHistory);

  // Calculate action count
  const actionCount = bettingHistory.length;

  // Calculate sharp score (simplified algorithm)
  const sharpScore = calculateSharpScoreAlgorithm(clv, winRate, actionCount);

  return {
    customerId,
    sharpScore,
    clv,
    winRate,
    actionCount,
    lastUpdated: new Date().toISOString(),
    alertThreshold: 60
  };
}

async function getCustomerBettingHistory(customerId: string, env: Env): Promise<any[]> {
  // This would query actual betting history from your betting system
  // For now, return mock data
  return [
    { amount: 100, outcome: 'win', timestamp: new Date().toISOString() },
    { amount: 50, outcome: 'loss', timestamp: new Date().toISOString() },
    { amount: 200, outcome: 'win', timestamp: new Date().toISOString() }
  ];
}

function calculateCLV(bettingHistory: any[]): number {
  return bettingHistory.reduce((total, bet) => {
    const value = bet.outcome === 'win' ? bet.amount * 0.9 : -bet.amount; // 10% house edge
    return total + value;
  }, 0);
}

function calculateWinRate(bettingHistory: any[]): number {
  const wins = bettingHistory.filter(bet => bet.outcome === 'win').length;
  return bettingHistory.length > 0 ? (wins / bettingHistory.length) * 100 : 0;
}

function calculateSharpScoreAlgorithm(clv: number, winRate: number, actionCount: number): number {
  // Simplified sharp score calculation
  // In reality, this would be much more sophisticated

  const clvScore = Math.min(Math.max(clv / 1000, 0), 50); // CLV component (0-50)
  const winRateScore = Math.min(Math.max(winRate - 50, 0), 30); // Win rate component (0-30)
  const volumeScore = Math.min(Math.max(actionCount / 10, 0), 20); // Volume component (0-20)

  return clvScore + winRateScore + volumeScore;
}

async function updateSharpScores(sharpScores: SharpScoreMetrics[], env: Env): Promise<void> {
  const now = new Date().toISOString();

  for (const score of sharpScores) {
    await env.ANALYTICS.prepare(`
      INSERT OR REPLACE INTO sharp_indicators (cid, clv, wr, ao, nb, upd)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      score.customerId,
      score.clv,
      score.winRate,
      score.actionCount,
      score.clv, // Using CLV as net bet for simplicity
      now
    ).run();

    // Write to analytics engine
    await env.ANALYTICS_ENGINE.writeDataPoint({
      blobs: [score.customerId, 'sharp_score'],
      doubles: [score.sharpScore, score.clv, score.winRate, score.actionCount],
      indexes: ['sharp_calculation']
    });
  }
}

async function cleanupOldSharpData(env: Env): Promise<void> {
  // Clean up sharp indicators older than 30 days
  await env.ANALYTICS.prepare(`
    DELETE FROM sharp_indicators 
    WHERE upd < datetime('now', '-30 days')
  `).run();

  console.log('Cleaned up old sharp data');
}

// Export for use in scheduled trigger
export const sharpCalculationSchedule = {
  cron: '0 * * * *', // Every hour
  handler: handleSharpCalculation
};
