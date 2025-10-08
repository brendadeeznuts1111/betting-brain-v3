// Down-sample Cron Job – Roll hot → warm → cold tiers
// Runs hourly: 60 × 1-min KV → 1 × 1-h AE
// Runs daily: 24 × 1-h AE → 1 × 1-day R2 Parquet

import type { Env } from '../types/api';
import {
  queryHot,
  writeWarm,
  writeCold,
  type BucketedPoint
} from '../analytics/timeSeriesLayer';

/**
 * Hourly cron: Roll 1-min buckets into 1-hour aggregates
 * Cron: 0 * * * * (every hour)
 */
export async function hourlyDownSample(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const requestId = Date.now().toString(36);
  console.log(`[${requestId}] ⏰ Hourly down-sample started`);

  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  const twoHoursAgo = now - 2 * 60 * 60 * 1000;

  // Query hot tier for last complete hour
  // Note: We process the hour BEFORE the last hour to ensure all 1-min buckets are complete
  const metrics = ['velocity', 'sharpness', 'concentration'];
  const hourlyAggregates: BucketedPoint[] = [];

  try {
    // Get list of agents (from recent activity)
    const agentIds = await getActiveAgents(env, twoHoursAgo);
    console.log(`[${requestId}] Found ${agentIds.length} active agents`);

    // For each agent and metric, aggregate last complete hour
    for (const agentId of agentIds) {
      for (const metric of metrics) {
        const minuteBuckets = await queryHot(env, metric, agentId, twoHoursAgo, oneHourAgo);

        if (minuteBuckets.length > 0) {
          // Aggregate 60 × 1-min buckets → 1 × 1-hour bucket
          const hourly = aggregateBuckets(minuteBuckets, twoHoursAgo, oneHourAgo);
          hourlyAggregates.push(hourly);
        }
      }
    }

    // Write to warm tier (Analytics Engine)
    await writeWarm(env, ctx, hourlyAggregates);

    // Clean up hot tier (delete KV keys older than 48h)
    const fortyEightHoursAgo = now - 48 * 60 * 60 * 1000;
    await cleanupHot(env, ctx, agentIds, metrics, fortyEightHoursAgo);

    console.log(`[${requestId}] ✅ Hourly down-sample complete: ${hourlyAggregates.length} hourly buckets`);

    return new Response(JSON.stringify({
      success: true,
      buckets: hourlyAggregates.length,
      timestamp: now
    }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error(`[${requestId}] ❌ Hourly down-sample failed:`, error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

/**
 * Daily cron: Roll 24 × 1-hour AE buckets → 1 × 1-day R2 Parquet
 * Cron: 0 0 * * * (midnight UTC)
 */
export async function dailyDownSample(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const requestId = Date.now().toString(36);
  console.log(`[${requestId}] ⏰ Daily down-sample started`);

  const now = Date.now();
  const yesterday = new Date(now - 24 * 60 * 60 * 1000);
  yesterday.setUTCHours(0, 0, 0, 0);
  const yesterdayStart = yesterday.getTime();
  const yesterdayEnd = yesterdayStart + 24 * 60 * 60 * 1000;

  try {
    // Query warm tier for yesterday's 24 hourly buckets
    // Note: Warm tier query not fully implemented yet (placeholder)
    const agentIds = await getActiveAgents(env, yesterdayStart);
    const dailyAggregates: BucketedPoint[] = [];

    console.log(`[${requestId}] Processing ${agentIds.length} agents for date ${yesterday.toISOString()}`);

    // Placeholder: In production, would query Analytics Engine SQL API
    // for all hourly buckets from yesterday, then aggregate to daily

    // Write to cold tier (R2 Parquet)
    await writeCold(env, ctx, dailyAggregates, yesterday);

    console.log(`[${requestId}] ✅ Daily down-sample complete: ${dailyAggregates.length} daily buckets`);

    return new Response(JSON.stringify({
      success: true,
      date: yesterday.toISOString(),
      buckets: dailyAggregates.length,
      timestamp: now
    }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error(`[${requestId}] ❌ Daily down-sample failed:`, error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get list of active agents from hot tier metadata
 */
async function getActiveAgents(env: Env, since: number): Promise<string[]> {
  if (!env.FANTASY_CACHE) return [];

  // List all keys matching `meta:*` pattern
  const list = await env.FANTASY_CACHE.list({ prefix: 'meta:' });
  const agentIds = list.keys
    .map(k => k.name.replace('meta:', ''))
    .filter(aid => aid.length > 0);

  return agentIds;
}

/**
 * Aggregate multiple minute buckets into one hourly bucket
 */
function aggregateBuckets(
  buckets: BucketedPoint[],
  hourStart: number,
  hourEnd: number
): BucketedPoint {
  const values = buckets.flatMap(b => Array(b.values.count).fill(b.values.avg));

  return {
    bucketStart: hourStart,
    bucketEnd: hourEnd,
    agentId: buckets[0].agentId,
    metric: buckets[0].metric,
    values: {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((sum, v) => sum + v, 0) / values.length,
      sum: values.reduce((sum, v) => sum + v, 0),
      count: values.length
    }
  };
}

/**
 * Clean up hot tier (delete keys older than 48h)
 */
async function cleanupHot(
  env: Env,
  ctx: ExecutionContext,
  agentIds: string[],
  metrics: string[],
  cutoff: number
): Promise<void> {
  if (!env.FANTASY_CACHE) return;

  const cutoffBucket = Math.floor(cutoff / 60000) * 60000;
  const deletes: Promise<void>[] = [];

  // Delete all minute buckets before cutoff
  for (const agentId of agentIds) {
    for (const metric of metrics) {
      // Scan last 48h of buckets and delete old ones
      for (let bucket = cutoffBucket - 48 * 60 * 60 * 1000; bucket <= cutoffBucket; bucket += 60000) {
        const key = `ts:hot:${metric}:${agentId}:${bucket}`;
        deletes.push(env.FANTASY_CACHE.delete(key));
      }
    }
  }

  ctx.waitUntil(Promise.all(deletes));
  console.log(`Cleaned up ${deletes.length} hot tier keys`);
}
