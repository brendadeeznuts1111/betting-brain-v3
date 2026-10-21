/**
 * Fresh-deploy bootstrap: with empty bet_history and bet_history_cursors the
 * poller must still find customers from an independent source, and must not
 * silently no-op when there is none.
 */
import { describe, expect, spyOn, test } from 'bun:test';
import { getRoster, handleBetHistoryIngest } from '../../src/schedules/betHistoryIngest';
import { createMigratedSqlite, d1 } from '../utils/d1-sqlite-shim';

const ctx = { waitUntil() {}, passThroughOnException() {} } as any;

// Production skips the 0004 test-data seed (deployment/docs/PRODUCTION_CONFIG.md),
// which would otherwise put demo customers in bet_history.
const PROD_MIGRATIONS_SKIP = ['0004_test_data.sql'];

function freshDeploy(extra: Record<string, unknown> = {}) {
  const analytics = createMigratedSqlite(PROD_MIGRATIONS_SKIP);
  const raw = createMigratedSqlite(PROD_MIGRATIONS_SKIP);
  const points: any[] = [];
  const env: any = {
    ANALYTICS: d1(analytics),
    RAW_FEED_DB: d1(raw),
    ANALYTICS_ENGINE: { writeDataPoint: (p: any) => void points.push(p) },
    ...extra,
  };
  return { analytics, raw, env, points };
}

function addPlayer(raw: any, cid: string, active = 1) {
  raw
    .query(`INSERT INTO fantasy402_players (customer_id, agent_id, active, captured_at) VALUES (?, 'AG1', ?, ?)`)
    .run(cid, active, new Date().toISOString());
}

describe('bet-history ingest roster bootstrap', () => {
  test('fresh deploy: roster comes from captured fantasy402_players (active only)', async () => {
    const { raw, env } = freshDeploy();
    addPlayer(raw, 'CUST1');
    addPlayer(raw, 'CUST2');
    addPlayer(raw, 'GONE', 0);
    expect((await getRoster(env)).sort()).toEqual(['CUST1', 'CUST2']);
  });

  test('fresh deploy: BET_HISTORY_SEED_CIDS seeds the roster', async () => {
    const { env } = freshDeploy({ BET_HISTORY_SEED_CIDS: ' A1, B2 ,,' });
    expect((await getRoster(env)).sort()).toEqual(['A1', 'B2']);
  });

  test('missing fantasy402_players table does not break the roster', async () => {
    const { env } = freshDeploy({ RAW_FEED_DB: d1(new (require('bun:sqlite').Database)(':memory:')) });
    const warn = spyOn(console, 'warn').mockImplementation(() => {});
    expect(await getRoster(env)).toEqual([]);
    warn.mockRestore();
  });

  test('fresh deploy end-to-end: seeded customer is actually polled and ingested', async () => {
    const { analytics, raw, env } = freshDeploy();
    addPlayer(raw, 'CUST1');
    const calls: string[] = [];
    const client: any = {
      async makeRequest(_e: string, params: Record<string, string>) {
        calls.push(params.customerID);
        return {
          LIST: [
            {
              WagerNumber: '1',
              AmountWagered: 50,
              ToWinAmount: 45,
              WagerStatus: 'P',
              InsertDateTime: '2026-10-20 12:00:00.000',
            },
          ],
        };
      },
    };
    const log = spyOn(console, 'log').mockImplementation(() => {});
    const err = spyOn(console, 'error').mockImplementation(() => {});
    await handleBetHistoryIngest(env, ctx, client);
    log.mockRestore();
    err.mockRestore();
    expect(calls).toEqual(['CUST1']);
    expect(analytics.query('SELECT cid, wager_number, result FROM bet_history').all()).toEqual([
      { cid: 'CUST1', wager_number: '1', result: 'PENDING' },
    ]);
    expect(analytics.query('SELECT cid, backfilled FROM bet_history_cursors').all()).toEqual([
      { cid: 'CUST1', backfilled: 1 },
    ]);
  });

  test('no source at all: loud error + empty_roster datapoint, no upstream calls', async () => {
    const { env, points } = freshDeploy();
    const errors: string[] = [];
    const err = spyOn(console, 'error').mockImplementation((...a: unknown[]) => void errors.push(a.join(' ')));
    let called = false;
    await handleBetHistoryIngest(env, ctx, { makeRequest: async () => ((called = true), []) } as any);
    err.mockRestore();
    expect(called).toBe(false);
    expect(errors.some(e => e.includes('empty roster'))).toBe(true);
    expect(points.some(p => p.blobs?.[1] === 'empty_roster')).toBe(true);
  });
});

describe('bet-history ingest health check', () => {
  test('stale bet_history fires the alert webhook even with Analytics Engine bound', async () => {
    const { env } = freshDeploy({ ALERT_WEBHOOK_URL: 'https://alerts.invalid/hook' });
    const posted: string[] = [];
    const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation((async (url: string) => {
      posted.push(String(url));
      return new Response('ok');
    }) as any);
    const err = spyOn(console, 'error').mockImplementation(() => {});
    await handleBetHistoryIngest(env, ctx, { makeRequest: async () => [] } as any);
    err.mockRestore();
    fetchSpy.mockRestore();
    expect(posted).toEqual(['https://alerts.invalid/hook']);
  });
});

describe('bet-history ingest work rotation', () => {
  test('roster larger than the per-run cap: never-polled customers go first', async () => {
    const { analytics, env } = freshDeploy();
    const all = Array.from({ length: 250 }, (_, i) => `C${String(i).padStart(3, '0')}`);
    // First 200 already polled (cursor exists, backfilled); last 50 never polled.
    for (const cid of all.slice(0, 200)) {
      analytics
        .query(`INSERT INTO bet_history_cursors (cid, last_poll_ts, backfilled, updated_at) VALUES (?, ?, 1, ?)`)
        .run(cid, '2026-10-20T00:00:00.000Z', '2026-10-20 00:00:00');
    }
    env.BET_HISTORY_SEED_CIDS = all.slice(200).join(',');
    const polled: string[] = [];
    const client: any = {
      makeRequest: async (_e: string, p: Record<string, string>) => (polled.push(p.customerID), []),
    };
    const quiet = [spyOn(console, 'log'), spyOn(console, 'error')].map(s => s.mockImplementation(() => {}));
    // Skip the 250ms inter-batch pacing (40 batches) so the test stays fast.
    const timers = spyOn(globalThis, 'setTimeout').mockImplementation(((fn: () => void) => (fn(), 0)) as any);
    await handleBetHistoryIngest(env, ctx, client);
    timers.mockRestore();
    quiet.forEach(s => s.mockRestore());
    // BACKFILL_PER_RUN (10) of the never-polled customers get their first pull.
    expect(polled.filter(c => all.slice(200).includes(c)).length).toBe(10);
  });
});
