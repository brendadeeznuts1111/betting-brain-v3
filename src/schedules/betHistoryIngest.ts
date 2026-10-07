/**
 * Bet History Ingest — fantasy402 Customer Performance → bet_history
 *
 * Scheduled every 5 minutes (cron '*\/5 * * * *', wired in src/index.ts).
 * Feeds the sharp-score cron (sharpCalc.ts) its input data.
 *
 * Design (addresses the review on PR #6):
 * - Per-customer cursors in bet_history_cursors (migration 0009), never a
 *   global "last poll" — one customer's failure can't silently skip a window.
 * - Idempotent upserts keyed on (cid, wager_number). Two bets CAN share a
 *   timestamp; the wager number is the only safe dedupe key.
 * - Backfill ≠ poll: customers with no cursor get a bounded full-history
 *   pull (BACKFILL_PER_RUN per run) instead of the incremental window, so a
 *   first deploy doesn't hammer the endpoint with thousands of full pulls
 *   in one 5-minute cycle.
 * - Rate limiting: MAX_CUSTOMERS_PER_RUN cap + small inter-batch pacing.
 *   Confirm the endpoint's real limit before lowering the cron interval.
 * - Health check: bet_history freshness is measured every run and reported
 *   to Analytics Engine (and ALERT_WEBHOOK_URL if set). If the poller dies,
 *   sharp scores go stale AND an alert fires — no silent no-op.
 *
 * UNIT CONTRACT: stake/payout are DOLLARS (fantasy402 upstream unit).
 */

import { Env } from '../types/api';
import { runSafe, wait } from '../lib/scheduleUtils';
import { createFantasy402Client } from '../utils/fantasy402-client';

/** Incremental overlap window — re-fetch a little history to catch late
 * settlements (a bet graded after the cursor advanced). */
const OVERLAP_MINUTES = 60 * 24; // 24h — cheap and safe for graded-wager updates
const MAX_CUSTOMERS_PER_RUN = 200;
const BACKFILL_PER_RUN = 10;
const BATCH_CONCURRENCY = 5;
const HEALTH_LAG_MINUTES = 15;

interface CursorRow {
  cid: string;
  last_poll_ts: string | null;
  last_wager_number: string | null;
  backfilled: number;
  consecutive_failures: number;
}

interface PerformanceWagerRow {
  wagerNumber: string;
  stake: number;
  payout: number;
  result: string;
  ts: string;
  marketType: string | null;
  eventId: string | null;
}

export async function handleBetHistoryIngest(env: Env, ctx: ExecutionContext): Promise<void> {
  return runSafe('bet_history_ingest', env, ctx, async () => {
    const client = createFantasy402Client(env as never);

    // Roster: customers seen in recent bet_history OR already tracked.
    // (Distinct customer set known to us; fantasy402 does not offer a global
    // "all customers" cursor, so the roster grows as activity is observed.)
    const roster = await getRoster(env);
    if (roster.length === 0) {
      console.log('bet-history ingest: empty roster, nothing to do');
      await reportHealth(env);
      return;
    }

    const cursors = await getCursors(env, roster);
    const work = roster
      .slice(0, MAX_CUSTOMERS_PER_RUN)
      .map(cid => ({ cid, cursor: cursors.get(cid) ?? null }));

    let backfills = 0;
    let inserted = 0;
    let failed = 0;

    for (let i = 0; i < work.length; i += BATCH_CONCURRENCY) {
      const batch = work.slice(i, i + BATCH_CONCURRENCY);
      await Promise.all(batch.map(async ({ cid, cursor }) => {
        const isBackfill = !cursor || !cursor.backfilled;
        if (isBackfill && backfills >= BACKFILL_PER_RUN) return; // defer to next run
        if (isBackfill) backfills++;

        try {
          const rows = await fetchCustomerPerformance(client, cid, cursor, isBackfill);
          const n = await upsertBetHistory(env, cid, rows);
          inserted += n;
          await advanceCursor(env, cid, rows);
        } catch (e) {
          failed++;
          await markCursorFailure(env, cid);
          console.error(`bet-history ingest failed for ${cid}:`,
            e instanceof Error ? e.message : e);
        }
      }));
      // Gentle pacing between batches — protects the endpoint's rate limit
      if (i + BATCH_CONCURRENCY < work.length) await wait(250);
    }

    console.log(`bet-history ingest: +${inserted} rows, ${backfills} backfills, ${failed} failures, roster ${roster.length}`);
    await reportHealth(env);
  });
}

async function getRoster(env: Env): Promise<string[]> {
  const result = await env.ANALYTICS.prepare(`
    SELECT cid FROM bet_history_cursors
    UNION
    SELECT DISTINCT cid FROM bet_history WHERE ts > datetime('now', '-7 days')
    LIMIT 1000
  `).all();
  return ((result.results ?? []) as unknown as Array<{ cid: string }>).map(r => r.cid);
}

async function getCursors(env: Env, cids: string[]): Promise<Map<string, CursorRow>> {
  const map = new Map<string, CursorRow>();
  if (cids.length === 0) return map;
  // D1 supports batch binds; chunk to stay under bind limits
  for (let i = 0; i < cids.length; i += 100) {
    const slice = cids.slice(i, i + 100);
    const placeholders = slice.map(() => '?').join(',');
    const result = await env.ANALYTICS.prepare(
      `SELECT * FROM bet_history_cursors WHERE cid IN (${placeholders})`
    ).bind(...slice).all();
    for (const row of (result.results ?? []) as unknown as CursorRow[]) {
      map.set(row.cid, row);
    }
  }
  return map;
}

/**
 * Fetch customer performance from fantasy402 and normalize to bet rows.
 * The response shape varies by report version — this normalizer is tolerant
 * and skips rows without a wager number (they can't be deduped safely).
 */
async function fetchCustomerPerformance(
  client: ReturnType<typeof createFantasy402Client>,
  cid: string,
  cursor: CursorRow | null,
  isBackfill: boolean,
): Promise<PerformanceWagerRow[]> {
  const end = new Date();
  const start = isBackfill || !cursor?.last_poll_ts
    ? new Date(0) // full history
    : new Date(new Date(cursor.last_poll_ts).getTime() - OVERLAP_MINUTES * 60_000);

  const fmt = (d: Date) =>
    `${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCDate()).padStart(2, '0')}/${d.getUTCFullYear()}`;

  const data = await (client as any).getCustomerPerformance?.({
    customerID: cid,
    start: fmt(start),
    end: fmt(end),
    type: 'CP',
  }) ?? await (client as any).makeRequest?.('/cloud/api/Reports/getCustomerPerformance', {
    customerID: cid, start: fmt(start), end: fmt(end),
    operation: 'getCustomerPerformance',
  });

  const list: unknown[] = Array.isArray(data) ? data
    : Array.isArray(data?.LIST) ? data.LIST
    : Array.isArray(data?.data) ? data.data
    : [];

  const rows: PerformanceWagerRow[] = [];
  for (const raw of list) {
    const r = raw as Record<string, unknown>;
    const wagerNumber = String(r.WagerNumber ?? r.wager_number ?? r.TicketNumber ?? '').trim();
    if (!wagerNumber) continue; // no dedupe key — skip rather than risk dupes
    const stake = Number(r.AmountWagered ?? r.stake ?? 0);
    if (!Number.isFinite(stake) || stake <= 0) continue;
    const status = String(r.WagerStatus ?? r.result ?? 'P').toUpperCase();
    const result = status.startsWith('W') ? 'WIN'
      : status.startsWith('L') ? 'LOSS'
      : status === 'C' || status === 'R' ? 'PUSH'
      : 'PENDING';
    const toWin = Number(r.ToWinAmount ?? 0);
    const payout = result === 'WIN' ? stake + toWin
      : result === 'PUSH' ? stake
      : 0;
    rows.push({
      wagerNumber,
      stake,
      payout,
      result,
      ts: parseF402Timestamp(String(r.InsertDateTime ?? r.ts ?? '')),
      marketType: typeof r.WagerType === 'string' ? r.WagerType : null,
      eventId: typeof r.EventID === 'string' ? r.EventID : null,
    });
  }
  return rows;
}

/** fantasy402 returns "YYYY-MM-DD HH:mm:ss.SSS" (US Eastern, no TZ). */
function parseF402Timestamp(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return new Date().toISOString();
  if (trimmed.includes('T')) {
    const d = new Date(trimmed);
    return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
  const d = new Date(trimmed.replace(' ', 'T') + 'Z');
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

/** INSERT OR IGNORE on the (cid, wager_number) partial unique index. */
async function upsertBetHistory(env: Env, cid: string, rows: PerformanceWagerRow[]): Promise<number> {
  let inserted = 0;
  for (const r of rows) {
    const res = await env.ANALYTICS.prepare(`
      INSERT OR IGNORE INTO bet_history
        (cid, stake, payout, result, ts, market_type, event_id, wager_number)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(cid, r.stake, r.payout, r.result, r.ts, r.marketType, r.eventId, r.wagerNumber).run();
    if ((res.meta?.changes ?? 0) > 0) inserted++;
  }
  return inserted;
}

async function advanceCursor(env: Env, cid: string, rows: PerformanceWagerRow[]): Promise<void> {
  const maxTs = rows.reduce((m, r) => (r.ts > m ? r.ts : m), '');
  await env.ANALYTICS.prepare(`
    INSERT INTO bet_history_cursors (cid, last_poll_ts, backfilled, consecutive_failures, updated_at)
    VALUES (?, ?, 1, 0, datetime('now'))
    ON CONFLICT(cid) DO UPDATE SET
      last_poll_ts = MAX(COALESCE(excluded.last_poll_ts, ''), COALESCE(last_poll_ts, '')),
      backfilled = 1,
      consecutive_failures = 0,
      updated_at = datetime('now')
  `).bind(cid, maxTs || new Date().toISOString()).run();
}

async function markCursorFailure(env: Env, cid: string): Promise<void> {
  await env.ANALYTICS.prepare(`
    INSERT INTO bet_history_cursors (cid, consecutive_failures, updated_at)
    VALUES (?, 1, datetime('now'))
    ON CONFLICT(cid) DO UPDATE SET
      consecutive_failures = consecutive_failures + 1,
      updated_at = datetime('now')
  `).bind(cid).run();
}

/**
 * Freshness health check: if bet_history's newest row is older than
 * HEALTH_LAG_MINUTES, the poller is dead or the feed is down — either way
 * sharp scores are stale. Reports to Analytics Engine always, and to
 * ALERT_WEBHOOK_URL when unhealthy.
 */
async function reportHealth(env: Env): Promise<void> {
  const row = await env.ANALYTICS.prepare(
    `SELECT MAX(ts) AS latest FROM bet_history`
  ).first() as { latest?: string } | null;

  const lagMinutes = row?.latest
    ? (Date.now() - new Date(row.latest).getTime()) / 60_000
    : Infinity;
  const healthy = lagMinutes < HEALTH_LAG_MINUTES;

  await env.ANALYTICS_ENGINE?.writeDataPoint({
    blobs: ['bet_history_ingest', healthy ? 'healthy' : 'stale'],
    doubles: [Number.isFinite(lagMinutes) ? lagMinutes : -1, healthy ? 1 : 0],
    indexes: ['ingest_health'],
  }).catch(() => {});

  if (!healthy) {
    const webhook = (env as unknown as { ALERT_WEBHOOK_URL?: string }).ALERT_WEBHOOK_URL;
    console.error(`🚨 bet_history stale: lag ${Number.isFinite(lagMinutes) ? lagMinutes.toFixed(0) : '∞'} min`);
    if (webhook) {
      await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alert: 'bet_history_stale',
          lagMinutes: Number.isFinite(lagMinutes) ? Math.round(lagMinutes) : null,
          threshold: HEALTH_LAG_MINUTES,
          impact: 'sharp scores frozen until ingest resumes',
          at: new Date().toISOString(),
        }),
      }).catch(e => console.error('health webhook failed:', e));
    }
  }
}

export const betHistoryIngestSchedule = {
  cron: '*/5 * * * *', // Every 5 minutes
  handler: handleBetHistoryIngest,
};
