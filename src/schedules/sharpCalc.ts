/**
 * Hourly Sharp Calculation Schedule
 * Calculates sharp scores for all customers based on CLV and performance metrics
 *
 * DATA SOURCE: bet_history table (migration 0003), populated from the
 * fantasy402 Customer Performance feed (/cloud/api/Reports/getCustomerPerformance)
 * and graded-wager ingest. The previous revision scored every customer from
 * three hardcoded fake bets — see issue #4.
 *
 * UNIT CONTRACT: bet_history.stake / payout are DOLLARS (fantasy402 upstream
 * unit). CLV here is "customer lifetime value" (net P&L in dollars) — NOT
 * closing-line value. The closing-line-value metric lives in the feed repo's
 * sharp-detector. Do not conflate the two; sharp_indicators.clv stores the
 * P&L figure and sharp_indicators.nb stores net bet volume.
 */

import { SharpIndicator, SharpIndicatorInsert } from '../types/database';
import { SharpScoreMetrics } from '../types/metrics';
import { Env } from '../types/api';
import { runSafe, chunk, isCostCapReached } from '../lib/scheduleUtils';

interface BetHistoryRow {
  stake: number;
  payout: number;
  result: string | null;
  ts: string;
}

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
  // Customers with bets in the last 24 hours.
  // (Previously read DISTINCT cid FROM sharp_indicators — circular: the table
  // this job writes was also its input roster, so new customers never got
  // scored until something else inserted them first.)
  const result = await env.ANALYTICS.prepare(`
    SELECT DISTINCT cid
    FROM bet_history
    WHERE ts > datetime('now', '-24 hours')
    ORDER BY ts DESC
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
  // Get customer's real betting history from bet_history
  const bettingHistory = await getCustomerBettingHistory(customerId, env);

  const empty: SharpScoreMetrics = {
    customerId,
    sharpScore: 0,
    clv: 0,
    winRate: 0,
    actionCount: 0,
    netBet: 0,
    lastUpdated: new Date().toISOString(),
    alertThreshold: 60
  };
  if (bettingHistory.length === 0) {
    return empty;
  }

  // Net P&L in dollars (customer lifetime value)
  const clv = calculateCLV(bettingHistory);

  // Win rate over settled bets only
  const winRate = calculateWinRate(bettingHistory);

  // Action count + net bet volume
  const actionCount = bettingHistory.length;
  const netBet = calculateNetBet(bettingHistory);

  // Calculate sharp score
  const sharpScore = calculateSharpScoreAlgorithm(clv, winRate, actionCount);

  return {
    ...empty,
    sharpScore,
    clv,
    winRate,
    actionCount,
    netBet
  };
}

/**
 * Real betting history from the bet_history table (migration 0003).
 * Last 200 bets, newest first — enough for a stable score without a
 * full-table scan per customer.
 */
async function getCustomerBettingHistory(customerId: string, env: Env): Promise<BetHistoryRow[]> {
  const result = await env.ANALYTICS.prepare(`
    SELECT stake, payout, result, ts
    FROM bet_history
    WHERE cid = ?
    ORDER BY ts DESC
    LIMIT 200
  `).bind(customerId).all();

  return (result.results ?? []) as unknown as BetHistoryRow[];
}

/**
 * Customer lifetime value: net P&L in dollars.
 * payout is 0 on losses and includes returned stake on wins, so
 * net = Σ(payout − stake) over settled bets. PENDING rows are excluded.
 */
function calculateCLV(bettingHistory: BetHistoryRow[]): number {
  return bettingHistory
    .filter(bet => bet.result && bet.result !== 'PENDING')
    .reduce((total, bet) => total + (bet.payout - bet.stake), 0);
}

/** Total stake in dollars over the window (goes to sharp_indicators.nb). */
function calculateNetBet(bettingHistory: BetHistoryRow[]): number {
  return bettingHistory
    .filter(bet => bet.result && bet.result !== 'PENDING')
    .reduce((total, bet) => total + bet.stake, 0);
}

function calculateWinRate(bettingHistory: BetHistoryRow[]): number {
  const settled = bettingHistory.filter(bet => bet.result === 'WIN' || bet.result === 'LOSS');
  if (settled.length === 0) return 0;
  const wins = settled.filter(bet => bet.result === 'WIN').length;
  return (wins / settled.length) * 100;
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
    // nb = net bet volume (Σ stake over settled window); previously this
    // column received a second copy of clv, making it meaningless.
    await env.ANALYTICS.prepare(`
      INSERT OR REPLACE INTO sharp_indicators (cid, clv, wr, ao, nb, upd)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      score.customerId,
      score.clv,
      score.winRate,
      score.actionCount,
      score.netBet,
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
