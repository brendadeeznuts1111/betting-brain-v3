// Time-series Layer – Three-tier bucketed storage with down-sampling
// Hot (KV, 48h, 1-min) → Warm (AE, 90d, 1-h) → Cold (R2, 2y, 1-day)

import type { Env } from '../types/api';

export interface TimeSeriesPoint {
  timestamp: number;
  agentId: string;
  metric: string;
  value: number;
  metadata?: Record<string, any>;
}

export interface BucketedPoint {
  bucketStart: number;
  bucketEnd: number;
  agentId: string;
  metric: string;
  values: {
    min: number;
    max: number;
    avg: number;
    sum: number;
    count: number;
  };
}

// ============================================================================
// HOT TIER – KV (48h retention, 1-min granularity)
// ============================================================================

/**
 * Write to hot tier (1-min buckets in KV)
 * Key format: `ts:hot:{metric}:{agentId}:{minuteBucket}`
 * TTL: 48 hours
 */
export async function writeHot(
  env: Env,
  ctx: ExecutionContext,
  point: TimeSeriesPoint
): Promise<void> {
  if (!env.FANTASY_CACHE) return;

  const minuteBucket = Math.floor(point.timestamp / 60000) * 60000;
  const key = `ts:hot:${point.metric}:${point.agentId}:${minuteBucket}`;

  // Read existing bucket (if any)
  const existing = await env.FANTASY_CACHE.get(key, 'json') as BucketedPoint | null;

  const bucketData: BucketedPoint = existing || {
    bucketStart: minuteBucket,
    bucketEnd: minuteBucket + 60000,
    agentId: point.agentId,
    metric: point.metric,
    values: {
      min: point.value,
      max: point.value,
      avg: point.value,
      sum: point.value,
      count: 1
    }
  };

  // Update aggregates
  if (existing) {
    bucketData.values.min = Math.min(bucketData.values.min, point.value);
    bucketData.values.max = Math.max(bucketData.values.max, point.value);
    bucketData.values.sum += point.value;
    bucketData.values.count += 1;
    bucketData.values.avg = bucketData.values.sum / bucketData.values.count;
  }

  // Write back with 48h TTL
  ctx.waitUntil(
    env.FANTASY_CACHE.put(key, JSON.stringify(bucketData), {
      expirationTtl: 48 * 3600
    })
  );
}

/**
 * Query hot tier (last 48h, 1-min resolution)
 */
export async function queryHot(
  env: Env,
  metric: string,
  agentId: string,
  startMs: number,
  endMs: number
): Promise<BucketedPoint[]> {
  if (!env.FANTASY_CACHE) return [];

  const results: BucketedPoint[] = [];
  const startBucket = Math.floor(startMs / 60000) * 60000;
  const endBucket = Math.floor(endMs / 60000) * 60000;

  // Scan all minute buckets in range (max 2880 buckets for 48h)
  for (let bucket = startBucket; bucket <= endBucket; bucket += 60000) {
    const key = `ts:hot:${metric}:${agentId}:${bucket}`;
    const data = await env.FANTASY_CACHE.get(key, 'json') as BucketedPoint | null;
    if (data) results.push(data);
  }

  return results;
}

// ============================================================================
// WARM TIER – Analytics Engine (90d retention, 1-h granularity)
// ============================================================================

/**
 * Write to warm tier (1-hour aggregates in Analytics Engine)
 * Called by down-sample cron job
 */
export async function writeWarm(
  env: Env,
  ctx: ExecutionContext,
  hourlyData: BucketedPoint[]
): Promise<void> {
  if (!env.ANALYTICS_ENGINE) return;

  const writes = hourlyData.map(point => ({
    blobs: [point.agentId, point.metric],
    doubles: [
      point.values.min,
      point.values.max,
      point.values.avg,
      point.values.sum
    ],
    indexes: [point.bucketStart.toString()]
  }));

  ctx.waitUntil(
    env.ANALYTICS_ENGINE.writeDataPoint(...writes)
  );
}

/**
 * Query warm tier (last 90 days, 1-hour resolution)
 * Note: Analytics Engine queries via GraphQL (not implemented here)
 */
export async function queryWarm(
  env: Env,
  metric: string,
  agentId: string,
  startMs: number,
  endMs: number
): Promise<BucketedPoint[]> {
  // Placeholder: would use Analytics Engine GraphQL API
  // For now, return empty array
  // In production, use: https://developers.cloudflare.com/analytics/analytics-engine/sql-api/
  console.warn('Warm tier query not implemented (use Analytics Engine SQL API)');
  return [];
}

// ============================================================================
// COLD TIER – R2 Parquet (2y retention, 1-day granularity)
// ============================================================================

/**
 * Write to cold tier (daily aggregates in R2 Parquet)
 * Called by down-sample cron job (daily)
 * File format: `ts/{metric}/{year}/{month}/{day}.parquet`
 */
export async function writeCold(
  env: Env,
  ctx: ExecutionContext,
  dailyData: BucketedPoint[],
  date: Date
): Promise<void> {
  // Note: R2 binding not in Env type yet, would need to add
  // Placeholder for R2 Parquet write
  // In production, use: Apache Arrow + Parquet libraries
  console.warn('Cold tier write not implemented (requires R2 + Parquet library)');

  // Example key structure:
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  dailyData.forEach(point => {
    const key = `ts/${point.metric}/${year}/${month}/${day}.parquet`;
    console.log(`[Cold] Would write to R2: ${key}`);
  });
}

// ============================================================================
// UNIFIED QUERY – Auto-tier selection
// ============================================================================

export type TimeRange = '5m' | '1h' | '24h' | '7d' | '30d' | '90d' | '1y' | '2y';

/**
 * Smart query: automatically selects correct tier based on time range
 */
export async function queryTimeSeries(
  env: Env,
  metric: string,
  agentId: string,
  range: TimeRange
): Promise<BucketedPoint[]> {
  const now = Date.now();

  const rangeMap: Record<TimeRange, number> = {
    '5m': 5 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    '90d': 90 * 24 * 60 * 60 * 1000,
    '1y': 365 * 24 * 60 * 60 * 1000,
    '2y': 730 * 24 * 60 * 60 * 1000
  };

  const startMs = now - rangeMap[range];

  // Hot tier: last 48h
  if (range === '5m' || range === '1h' || range === '24h') {
    return queryHot(env, metric, agentId, startMs, now);
  }

  // Warm tier: 48h-90d
  if (range === '7d' || range === '30d' || range === '90d') {
    return queryWarm(env, metric, agentId, startMs, now);
  }

  // Cold tier: 90d-2y
  if (range === '1y' || range === '2y') {
    console.warn('Cold tier query not implemented');
    return [];
  }

  return [];
}

// ============================================================================
// TIER STATS
// ============================================================================

export interface TierStats {
  hot: { retention: string; granularity: string; cost: string };
  warm: { retention: string; granularity: string; cost: string };
  cold: { retention: string; granularity: string; cost: string };
}

export function getTierStats(): TierStats {
  return {
    hot: { retention: '48h', granularity: '1 min', cost: 'KV (free)' },
    warm: { retention: '90 day', granularity: '1 h', cost: 'AE (~$0.02/100k pts)' },
    cold: { retention: '2 year', granularity: '1 day', cost: 'R2 Parquet (~$0.004/GB)' }
  };
}
