// Predictive Signals – Dead-simple regression for downstream ML
// Exports 0-100 signals, NOT models (model lives outside critical path)

import type { Env } from '../types/api';

/**
 * Steam Signal: composite 0-100 score from velocity + sharpness + lag
 * Formula: 30% velocity + 50% sharpness + 20% lag
 * Written to KV key: `signal:{agentId}` every minute
 */
export function steamSignal(
  velocity: number,    // bets/min (normalize to 0-100)
  sharpness: number,   // % steam bets (already 0-100)
  avgLag: number       // ms (normalize: 0ms=100, 60s+=0)
): number {
  // Normalize velocity: 0 bets/min = 0, 50+ bets/min = 100
  const vNorm = Math.min(100, (velocity / 50) * 100);

  // Sharpness already 0-100
  const sNorm = sharpness;

  // Normalize lag: inverse scale (faster = higher signal)
  // 0ms = 100, 5s = 50, 60s+ = 0
  const lNorm = Math.max(0, 100 - (avgLag / 60000) * 100);

  // Weighted composite
  return 0.3 * vNorm + 0.5 * sNorm + 0.2 * lNorm;
}

/**
 * Risk Signal: composite 0-100 score from concentration + recency + exposure
 * Formula: 40% concentration + 30% recency + 30% exposure
 */
export function riskSignal(
  gini: number,         // 0-1 (convert to 0-100)
  recency: number,      // 0-1 (convert to 0-100)
  exposurePct: number   // % of total exposure (0-100)
): number {
  // Normalize Gini to 0-100 (higher = more risk)
  const cNorm = gini * 100;

  // Normalize recency to 0-100 (higher = more active = more risk)
  const rNorm = recency * 100;

  // Exposure already 0-100
  const eNorm = exposurePct;

  // Weighted composite
  return 0.4 * cNorm + 0.3 * rNorm + 0.3 * eNorm;
}

/**
 * Volume Signal: composite 0-100 score from bet count + stake size + frequency
 * Formula: 30% count + 40% size + 30% frequency
 */
export function volumeSignal(
  betCount: number,     // normalize to 0-100 (0=0, 100+=100)
  avgStake: number,     // normalize to 0-100 (0=0, $1000+=100)
  frequency: number     // bets per hour (0-100)
): number {
  // Normalize bet count: 0 = 0, 100+ = 100
  const countNorm = Math.min(100, betCount);

  // Normalize avg stake: $0 = 0, $1000+ = 100
  const stakeNorm = Math.min(100, (avgStake / 1000) * 100);

  // Normalize frequency: 0 bets/h = 0, 100+ bets/h = 100
  const freqNorm = Math.min(100, frequency);

  // Weighted composite
  return 0.3 * countNorm + 0.4 * stakeNorm + 0.3 * freqNorm;
}

// ============================================================================
// Signal Writer (parallel KV writes)
// ============================================================================

export interface SignalSet {
  agentId: string;
  steam: number;
  risk: number;
  volume: number;
  timestamp: number;
}

/**
 * Compute all signals and write to KV in parallel
 * Non-blocking via waitUntil()
 */
export async function computeAndStoreSignals(
  env: Env,
  ctx: ExecutionContext,
  agentId: string,
  analytics: {
    velocity: number;
    sharpness: number;
    concentration: number;
    recency: number;
    avgLag: number;
    betCount: number;
    avgStake: number;
    frequency: number;
    exposurePct: number;
  }
): Promise<SignalSet> {
  // Compute all three signals
  const steam = steamSignal(analytics.velocity, analytics.sharpness, analytics.avgLag);
  const risk = riskSignal(analytics.concentration, analytics.recency, analytics.exposurePct);
  const volume = volumeSignal(analytics.betCount, analytics.avgStake, analytics.frequency);

  const signals: SignalSet = {
    agentId,
    steam: Math.round(steam * 100) / 100, // 2 decimals
    risk: Math.round(risk * 100) / 100,
    volume: Math.round(volume * 100) / 100,
    timestamp: Date.now()
  };

  // Write to KV (TTL: 5 min)
  if (env.FANTASY_CACHE) {
    ctx.waitUntil(Promise.all([
      env.FANTASY_CACHE.put(`signal:steam:${agentId}`, signals.steam.toFixed(2), { expirationTtl: 300 }),
      env.FANTASY_CACHE.put(`signal:risk:${agentId}`, signals.risk.toFixed(2), { expirationTtl: 300 }),
      env.FANTASY_CACHE.put(`signal:volume:${agentId}`, signals.volume.toFixed(2), { expirationTtl: 300 }),
      env.FANTASY_CACHE.put(`signal:all:${agentId}`, JSON.stringify(signals), { expirationTtl: 300 })
    ]));
  }

  return signals;
}

/**
 * Retrieve signals from KV
 */
export async function getSignals(
  env: Env,
  agentId: string
): Promise<SignalSet | null> {
  if (!env.FANTASY_CACHE) return null;

  const data = await env.FANTASY_CACHE.get(`signal:all:${agentId}`, 'json') as SignalSet | null;
  return data;
}

/**
 * Get signal percentile ranking (for thresholds)
 */
export function getSignalThreshold(signal: number): {
  level: 'low' | 'medium' | 'high' | 'critical';
  percentile: number;
} {
  if (signal >= 80) return { level: 'critical', percentile: 95 };
  if (signal >= 60) return { level: 'high', percentile: 75 };
  if (signal >= 40) return { level: 'medium', percentile: 50 };
  return { level: 'low', percentile: 25 };
}

/**
 * Export signal to Analytics Engine for downstream ML
 * Data science team can query this for model building
 */
export async function exportSignalToAE(
  env: Env,
  ctx: ExecutionContext,
  signals: SignalSet
): Promise<void> {
  if (!env.ANALYTICS_ENGINE) return;

  ctx.waitUntil(
    env.ANALYTICS_ENGINE.writeDataPoint({
      blobs: [signals.agentId, 'steam_signal', 'risk_signal', 'volume_signal'],
      doubles: [signals.steam, signals.risk, signals.volume],
      indexes: [signals.timestamp.toString()]
    })
  );
}
