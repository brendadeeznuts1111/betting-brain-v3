// Micro-analytics 2.0 – Pre-computed agent performance dimensions
// Budget: 80 LOC | Target: < 50ms p99 | Zero raw data leakage

import type { Env } from '../types/api';

// ============================================================================
// Core Dimensions (pure functions)
// ============================================================================

/**
 * Velocity: bets per minute in rolling 5-min window
 * KV key: `vm:{agentId}` | TTL: 5 min
 * Dashboard: "⚡ 47 bets/min (‑12 % vs prev 5 min)"
 */
export function betsPerMinute(bets: any[], windowMs = 5 * 60 * 1000): number {
  const now = Date.now();
  const recentBets = bets.filter(b =>
    new Date(b.InsertDateTime).getTime() >= now - windowMs
  );
  return recentBets.length / (windowMs / 60000); // per minute
}

/**
 * Sharpness: % of bets placed on steam moves
 * KV key: `sharp:{agentId}` | TTL: 5 min
 * Dashboard: "🎯 68 % steam bets (top 5 % of agents)"
 */
export function percentBetsOnSteam(bets: any[], steamEvents: Set<string>): number {
  if (bets.length === 0) return 0;
  const steamBets = bets.filter(b => steamEvents.has(b.EventID));
  return (steamBets.length / bets.length) * 100;
}

/**
 * Concentration: Gini coefficient of customer stake distribution
 * KV key: `gini:{agentId}` | TTL: 1 h
 * Dashboard: "📊 stake Gini 0.82 (highly concentrated)"
 * Higher = more concentrated (0=equal, 1=single customer)
 */
export function giniCoefficient(customerStakes: Map<string, number>): number {
  const stakes = Array.from(customerStakes.values()).sort((a, b) => a - b);
  if (stakes.length === 0) return 0;

  const n = stakes.length;
  const sum = stakes.reduce((acc, val) => acc + val, 0);
  if (sum === 0) return 0;

  let numerator = 0;
  stakes.forEach((stake, i) => {
    numerator += (2 * (i + 1) - n - 1) * stake;
  });

  return numerator / (n * sum);
}

/**
 * Recency: exponential decay score (0-1) based on last activity
 * KV key: `rec:{customerId}` | TTL: 1 h
 * Dashboard: "🔥 Customer #432 active 3 h ago (score 0.87)"
 * halfLife: 24h by default
 */
export function decayScore(lastActivityMs: number, halfLife = 24 * 60 * 60 * 1000): number {
  const age = Date.now() - lastActivityMs;
  return Math.exp(-Math.LN2 * age / halfLife);
}

// ============================================================================
// Batch Analytics Writer (parallel KV writes)
// ============================================================================

export interface MicroAnalytics {
  agentId: string;
  velocity: number;
  sharpness: number;
  concentration: number;
  timestamp: number;
}

export interface CustomerRecency {
  customerId: string;
  recencyScore: number;
  lastActivity: number;
}

/**
 * Compute all four dimensions and write to KV in parallel
 * Uses waitUntil() to avoid blocking the response
 */
export async function computeAndStore(
  env: Env,
  ctx: ExecutionContext,
  agentId: string,
  bets: any[],
  steamEvents: Set<string>
): Promise<MicroAnalytics> {
  // Compute dimensions
  const velocity = betsPerMinute(bets);
  const sharpness = percentBetsOnSteam(bets, steamEvents);

  // Build customer stakes map for Gini
  const customerStakes = new Map<string, number>();
  bets.forEach(bet => {
    const cid = bet.CustomerID;
    let amount = Number(bet.AmountWagered); // Use let because we might reassign
    if (isNaN(amount)) {
      console.warn(`[MicroAnalytics] Invalid AmountWagered for bet: ${bet.AmountWagered}. Defaulting to 0.`);
      amount = 0; // Default to 0 for invalid numbers
    }
    customerStakes.set(cid, (customerStakes.get(cid) || 0) + amount);
  });
  const concentration = giniCoefficient(customerStakes);

  const analytics: MicroAnalytics = {
    agentId,
    velocity,
    sharpness,
    concentration,
    timestamp: Date.now()
  };

  // Write all four KV keys in parallel (non-blocking)
  if (env.FANTASY_CACHE) {
    ctx.waitUntil(Promise.all([
      env.FANTASY_CACHE.put(`vm:${agentId}`, velocity.toFixed(2), { expirationTtl: 300 }),
      env.FANTASY_CACHE.put(`sharp:${agentId}`, sharpness.toFixed(2), { expirationTtl: 300 }),
      env.FANTASY_CACHE.put(`gini:${agentId}`, concentration.toFixed(3), { expirationTtl: 3600 }),
      env.FANTASY_CACHE.put(`meta:${agentId}`, JSON.stringify(analytics), { expirationTtl: 300 })
    ]));
  }

  return analytics;
}

/**
 * Compute customer recency scores in batch
 */
export async function computeCustomerRecency(
  env: Env,
  ctx: ExecutionContext,
  customerActivities: Map<string, number> // customerId -> lastActivityMs
): Promise<CustomerRecency[]> {
  const recencies: CustomerRecency[] = [];

  const writes: Promise<void>[] = [];
  customerActivities.forEach((lastActivity, customerId) => {
    const score = decayScore(lastActivity);
    recencies.push({ customerId, recencyScore: score, lastActivity });

    if (env.FANTASY_CACHE) {
      writes.push(
        env.FANTASY_CACHE.put(`rec:${customerId}`, score.toFixed(3), { expirationTtl: 3600 })
      );
    }
  });

  ctx.waitUntil(Promise.all(writes));
  return recencies;
}
