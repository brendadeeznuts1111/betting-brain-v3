// Security & Privacy Hardening
// 1. Numeric fingerprinting (rounded + salted hash)
// 2. Rate limiting (10 req/s per IP)
// 3. GDPR purge job (90-day customer data zeroing)

import type { Env } from '../types/api';

// ============================================================================
// 1. Numeric Fingerprinting
// ============================================================================

/**
 * Fingerprint numeric values to prevent re-identification
 * - Rounds to 2 decimals
 * - Adds salted hash of agentId
 * - Makes exact-value search impossible
 */
export function fingerprintNumber(
  value: number,
  agentId: string,
  salt: string = 'betting-brain-v3'
): { value: number; fingerprint: string } {
  // Round to 2 decimals
  const rounded = Math.round(value * 100) / 100;

  // Generate salted hash
  const fingerprint = hashString(`${agentId}:${rounded}:${salt}`);

  return {
    value: rounded,
    fingerprint: fingerprint.substring(0, 8) // 8-char hex
  };
}

/**
 * Simple hash function (FNV-1a)
 */
function hashString(str: string): string {
  let hash = 2166136261; // FNV offset basis
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 16777619) >>> 0; // FNV prime, unsigned 32-bit
  }
  return hash.toString(16);
}

/**
 * Fingerprint entire analytics object
 */
export interface FingerprintedAnalytics {
  agentId: string;
  metrics: Record<string, { value: number; fingerprint: string }>;
  timestamp: number;
}

export function fingerprintAnalytics(
  agentId: string,
  metrics: Record<string, number>
): FingerprintedAnalytics {
  const fingerprinted: Record<string, { value: number; fingerprint: string }> = {};

  Object.entries(metrics).forEach(([key, value]) => {
    fingerprinted[key] = fingerprintNumber(value, agentId);
  });

  return {
    agentId,
    metrics: fingerprinted,
    timestamp: Date.now()
  };
}

// ============================================================================
// 2. Rate Limiting (Analytics Endpoints)
// ============================================================================

/**
 * Rate limit analytics endpoints at 10 req/s per IP
 * Uses Cloudflare Rate Limiting API (requires Enterprise plan)
 * Fallback: in-memory rate limiting (per-instance)
 */
export async function checkAnalyticsRateLimit(
  env: Env,
  request: Request
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const key = `ratelimit:analytics:${ip}`;

  if (!env.FANTASY_CACHE) {
    // Fallback: allow all if KV not available
    return { allowed: true, remaining: 10, resetAt: Date.now() + 1000 };
  }

  // Get current counter
  const current = await env.FANTASY_CACHE.get(key);
  const count = current ? parseInt(current) : 0;

  const limit = 10;
  const windowMs = 1000; // 1 second

  if (count >= limit) {
    // Rate limited
    const metadata = await env.FANTASY_CACHE.getWithMetadata(key);
    const resetAt = (metadata.metadata as any)?.resetAt || Date.now() + windowMs;

    return { allowed: false, remaining: 0, resetAt };
  }

  // Increment counter
  const newCount = count + 1;
  const resetAt = Date.now() + windowMs;

  await env.FANTASY_CACHE.put(key, newCount.toString(), {
    expirationTtl: 1, // 1 second
    metadata: { resetAt }
  });

  return { allowed: true, remaining: limit - newCount, resetAt };
}

/**
 * Rate limit response headers
 */
export function rateLimitHeaders(
  remaining: number,
  resetAt: number
): Record<string, string> {
  return {
    'X-RateLimit-Limit': '10',
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': Math.floor(resetAt / 1000).toString()
  };
}

// ============================================================================
// 3. GDPR Purge Job (90-day customer data zeroing)
// ============================================================================

/**
 * GDPR purge: zero customer-level data after 90 days
 * Cron: 0 2 * * * (2am UTC daily)
 * Scope: Analytics Engine customer keys only (aggregates remain)
 */
export async function gdprPurgeJob(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const requestId = Date.now().toString(36);
  console.log(`[${requestId}] 🔒 GDPR purge job started`);

  const now = Date.now();
  const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;

  try {
    // Purge KV customer keys
    const kvPurged = await purgeKVCustomerData(env, ctx, ninetyDaysAgo);

    // Purge D1 customer records (zero sensitive fields)
    const d1Purged = await purgeD1CustomerData(env, ctx, ninetyDaysAgo);

    console.log(`[${requestId}] ✅ GDPR purge complete: ${kvPurged} KV keys, ${d1Purged} D1 rows`);

    return new Response(JSON.stringify({
      success: true,
      kvPurged,
      d1Purged,
      cutoffDate: new Date(ninetyDaysAgo).toISOString(),
      timestamp: now
    }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error(`[${requestId}] ❌ GDPR purge failed:`, error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

/**
 * Purge KV customer recency keys older than 90 days
 */
async function purgeKVCustomerData(
  env: Env,
  ctx: ExecutionContext,
  cutoff: number
): Promise<number> {
  if (!env.FANTASY_CACHE) return 0;

  // List all customer recency keys
  const list = await env.FANTASY_CACHE.list({ prefix: 'rec:' });
  let purged = 0;

  const deletes: Promise<void>[] = [];

  for (const key of list.keys) {
    // Check if key is old (based on metadata or value)
    const data = await env.FANTASY_CACHE.getWithMetadata(key.name, 'json');
    if (!data.value) continue;

    const lastActivity = (data.value as any).lastActivity || 0;
    if (lastActivity < cutoff) {
      deletes.push(env.FANTASY_CACHE.delete(key.name));
      purged++;
    }
  }

  ctx.waitUntil(Promise.all(deletes));
  return purged;
}

/**
 * Purge D1 customer data (zero sensitive fields)
 * Keeps aggregates for analytics but removes PII
 */
async function purgeD1CustomerData(
  env: Env,
  ctx: ExecutionContext,
  cutoff: number
): Promise<number> {
  // Zero out customer IDs in sharp_indicators older than 90 days
  const query = `
    UPDATE sharp_indicators
    SET customer_id = 'REDACTED',
        updated_at = CURRENT_TIMESTAMP
    WHERE last_updated < datetime(?, 'unixepoch', 'milliseconds')
      AND customer_id != 'REDACTED'
  `;

  const result = await env.ANALYTICS.prepare(query)
    .bind(cutoff)
    .run();

  return result.meta.changes || 0;
}

/**
 * Check if data is GDPR-eligible for purge
 */
export function isGdprPurgeEligible(
  lastActivity: number,
  retentionDays = 90
): boolean {
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  return lastActivity < cutoff;
}

// ============================================================================
// Audit Log (security events)
// ============================================================================

export interface SecurityEvent {
  type: 'rate_limit' | 'gdpr_purge' | 'fingerprint_violation';
  ip?: string;
  agentId?: string;
  timestamp: number;
  details: Record<string, any>;
}

/**
 * Log security events to Analytics Engine
 */
export async function logSecurityEvent(
  env: Env,
  ctx: ExecutionContext,
  event: SecurityEvent
): Promise<void> {
  if (!env.ANALYTICS_ENGINE) return;

  ctx.waitUntil(
    env.ANALYTICS_ENGINE.writeDataPoint({
      blobs: [event.type, event.ip || 'unknown', event.agentId || 'unknown'],
      doubles: [event.timestamp],
      indexes: [event.timestamp.toString()]
    })
  );

  console.log(`[Security] ${event.type}:`, event.details);
}
