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
  const result = await env.ANALYTICS.prepare(
    `
    SELECT DISTINCT cid
    FROM bet_history
    WHERE ts > datetime('now', '-24 hours')
    ORDER BY ts DESC
    LIMIT 1000
  `
  ).all();

  const customers = result.results as unknown as Array<{ cid: string }>;
  return customers.map(row => row.cid);
}

async function processBatchSharpCalculation(customerIds: string[], env: Env): Promise<void> {
  const sharpScores = await Promise.all(customerIds.map(customerId => calculateSharpScore(customerId, env)));

  // Update database with new sharp scores
  await updateSharpScores(sharpScores, env);
}

export async function calculateSharpScore(customerId: string, env: Env): Promise<SharpScoreMetrics> {
  // Lifetime aggregates over ALL of the customer's bet_history rows,
  // computed in SQL. (A previous revision summed the newest 200 rows in JS,
  // so any customer with >200 bets had clv / nb / wr / ao silently computed
  // over a moving window while being stored and exposed as lifetime values.)
  const stats = await getCustomerLifetimeStats(customerId, env);

  const empty: SharpScoreMetrics = {
    customerId,
    sharpScore: 0,
    clv: 0,
    winRate: 0,
    actionCount: 0,
    netBet: 0,
    lastUpdated: new Date().toISOString(),
    alertThreshold: 60,
  };
  if (stats.actionCount === 0) {
    return empty;
  }

  const { clv, winRate, actionCount, netBet } = stats;
  const sharpScore = calculateSharpScoreAlgorithm(clv, winRate, actionCount);

  return {
    ...empty,
    sharpScore,
    clv,
    winRate,
    actionCount,
    netBet,
  };
}

export interface LifetimeStats {
  /** All bets, PENDING included (sharp_indicators.ao). */
  actionCount: number;
  /** Net P&L in dollars over settled bets: Σ(payout − stake), PENDING excluded. */
  clv: number;
  /** Σ stake in dollars over settled bets (sharp_indicators.nb). */
  netBet: number;
  /** WIN / (WIN + LOSS) × 100; PUSH and PENDING excluded. */
  winRate: number;
}

/**
 * Lifetime metrics from bet_history (migration 0003) as a single SQL
 * aggregate — no row limit, no rows shipped to the Worker. Uses the
 * (cid, ts) index for the cid filter.
 * payout is 0 on losses and includes returned stake on wins.
 */
export async function getCustomerLifetimeStats(customerId: string, env: Env): Promise<LifetimeStats> {
  const row = (await env.ANALYTICS.prepare(
    `
    SELECT
      COUNT(*) AS action_count,
      COALESCE(SUM(CASE WHEN result IS NOT NULL AND result != 'PENDING' THEN payout - stake END), 0) AS clv,
      COALESCE(SUM(CASE WHEN result IS NOT NULL AND result != 'PENDING' THEN stake END), 0) AS net_bet,
      COALESCE(SUM(CASE WHEN result = 'WIN' THEN 1 ELSE 0 END), 0) AS wins,
      COALESCE(SUM(CASE WHEN result IN ('WIN', 'LOSS') THEN 1 ELSE 0 END), 0) AS decided
    FROM bet_history
    WHERE cid = ?
  `
  )
    .bind(customerId)
    .first()) as Record<string, unknown> | null;

  const num = (v: unknown) => {
    const n = Number(v ?? 0);
    return Number.isFinite(n) ? n : 0;
  };
  const decided = num(row?.decided);
  return {
    actionCount: num(row?.action_count),
    clv: num(row?.clv),
    netBet: num(row?.net_bet),
    winRate: decided > 0 ? (num(row?.wins) / decided) * 100 : 0,
  };
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
    // nb = lifetime net bet volume (Σ stake over settled bets); previously this
    // column received a second copy of clv, making it meaningless.
    await env.ANALYTICS.prepare(
      `
      INSERT OR REPLACE INTO sharp_indicators (cid, clv, wr, ao, nb, upd)
      VALUES (?, ?, ?, ?, ?, ?)
    `
    )
      .bind(score.customerId, score.clv, score.winRate, score.actionCount, score.netBet, now)
      .run();

    // Write to analytics engine
    await env.ANALYTICS_ENGINE.writeDataPoint({
      blobs: [score.customerId, 'sharp_score'],
      doubles: [score.sharpScore, score.clv, score.winRate, score.actionCount],
      indexes: ['sharp_calculation'],
    });
  }
}

async function cleanupOldSharpData(env: Env): Promise<void> {
  // Clean up sharp indicators older than 30 days
  await env.ANALYTICS.prepare(
    `
    DELETE FROM sharp_indicators 
    WHERE upd < datetime('now', '-30 days')
  `
  ).run();

  console.log('Cleaned up old sharp data');
}

// Export for use in scheduled trigger
export const sharpCalculationSchedule = {
  cron: '0 * * * *', // Every hour
  handler: handleSharpCalculation,
};
