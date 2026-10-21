/**
 * Migration 0010: fantasy402_players.customer_id is UNIQUE, so
 * processPlayerInfo's `INSERT ... ON CONFLICT(customer_id) DO UPDATE` works
 * against real SQLite (it errored on every write before), and the migration's
 * dedupe keeps the most recent row per customer.
 */
import { Database } from 'bun:sqlite';
import { describe, expect, spyOn, test } from 'bun:test';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { processPlayerInfo } from '../../src/api/fantasy402/processors';
import { getRoster } from '../../src/schedules/betHistoryIngest';
import { createMigratedSqlite, d1 } from '../utils/d1-sqlite-shim';

const PROD_MIGRATIONS_SKIP = ['0004_test_data.sql'];
const MIGRATIONS_DIR = join(import.meta.dir, '..', '..', 'migrations');
const MIGRATION_0010 = '0010_fantasy402_players_unique_customer.sql';

function kv() {
  const store = new Map<string, string>();
  return {
    store,
    put: async (k: string, v: string) => void store.set(k, v),
    get: async (k: string) => store.get(k) ?? null,
  };
}

function packet(timestamp: string) {
  return {
    timestamp,
    endpoint: '/cloud/api/Manager/getInfoPlayer',
    operation: 'getInfoPlayer',
    method: 'POST',
    url: 'https://fantasy402.invalid/cloud/api/Manager/getInfoPlayer',
    request: {},
    response: { status: 200, statusText: 'OK', body: {} },
    metadata: { duration: 1, agentID: 'AG1' },
  };
}

async function capture(env: any, ts: string, player: Record<string, unknown>) {
  const errors: unknown[] = [];
  const quiet = spyOn(console, 'log').mockImplementation(() => {});
  const err = spyOn(console, 'error').mockImplementation((...a: unknown[]) => void errors.push(a));
  await processPlayerInfo(packet(ts) as any, { player }, env, 'req-test');
  quiet.mockRestore();
  err.mockRestore();
  return errors;
}

describe('fantasy402_players customer_id upsert (migration 0010)', () => {
  test('processPlayerInfo inserts, then updates the same row on re-capture', async () => {
    const raw = createMigratedSqlite(PROD_MIGRATIONS_SKIP);
    const env: any = { RAW_FEED_DB: d1(raw), FANTASY_CACHE: kv() };

    expect(
      await capture(env, '2026-10-20T10:00:00.000Z', {
        customerID: 'CUST1',
        playerName: 'First',
        availableBalance: 100,
        active: true,
      })
    ).toEqual([]);
    expect(
      await capture(env, '2026-10-21T10:00:00.000Z', {
        customerID: 'CUST1',
        playerName: 'Second',
        availableBalance: 250,
        active: false,
      })
    ).toEqual([]);

    const rows = raw
      .query(
        'SELECT customer_id, agent_id, player_name, available_balance, active, captured_at FROM fantasy402_players'
      )
      .all();
    expect(rows).toEqual([
      {
        customer_id: 'CUST1',
        agent_id: 'AG1',
        player_name: 'Second',
        available_balance: 250,
        active: 0,
        captured_at: '2026-10-21T10:00:00.000Z',
      },
    ]);
    // Both captures reached the activity insert that follows the upsert.
    expect(raw.query('SELECT COUNT(*) AS n FROM fantasy402_player_activity').get()).toEqual({ n: 2 });
  });

  test('upserted players feed the bet-history roster bootstrap', async () => {
    const raw = createMigratedSqlite(PROD_MIGRATIONS_SKIP);
    const analytics = createMigratedSqlite(PROD_MIGRATIONS_SKIP);
    const env: any = { RAW_FEED_DB: d1(raw), ANALYTICS: d1(analytics), FANTASY_CACHE: kv() };
    await capture(env, '2026-10-21T10:00:00.000Z', { customerID: 'CUST1', active: true });
    await capture(env, '2026-10-21T10:00:00.000Z', { customerID: 'CUST2', active: true });
    await capture(env, '2026-10-21T11:00:00.000Z', { customerID: 'CUST1', active: true });
    expect((await getRoster(env)).sort()).toEqual(['CUST1', 'CUST2']);
  });

  test('raw ON CONFLICT(customer_id) upsert succeeds and duplicates are rejected', () => {
    const raw = createMigratedSqlite(PROD_MIGRATIONS_SKIP);
    const upsert = raw.query(`
      INSERT INTO fantasy402_players (customer_id, agent_id, player_name, captured_at)
      VALUES (?, 'AG1', ?, ?)
      ON CONFLICT(customer_id) DO UPDATE SET player_name = excluded.player_name, captured_at = excluded.captured_at
    `);
    upsert.run('C1', 'a', '2026-10-20T00:00:00.000Z');
    upsert.run('C1', 'b', '2026-10-21T00:00:00.000Z');
    expect(raw.query('SELECT customer_id, player_name FROM fantasy402_players').all()).toEqual([
      { customer_id: 'C1', player_name: 'b' },
    ]);
    expect(() =>
      raw.query(`INSERT INTO fantasy402_players (customer_id, agent_id, captured_at) VALUES ('C1', 'AG1', 'x')`).run()
    ).toThrow(/UNIQUE/);
  });

  test('migration dedupes pre-existing rows, keeping the latest per customer_id', () => {
    // Apply every migration before 0010, seed duplicates, then apply 0010.
    const db = new Database(':memory:');
    const files = readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql') && !PROD_MIGRATIONS_SKIP.includes(f))
      .sort();
    for (const f of files.filter(f => f < MIGRATION_0010)) db.exec(readFileSync(join(MIGRATIONS_DIR, f), 'utf8'));

    const ins = db.query(
      `INSERT INTO fantasy402_players (customer_id, agent_id, player_name, captured_at, updated_at) VALUES (?, 'AG1', ?, ?, ?)`
    );
    ins.run('DUP', 'newest', '2026-10-21T00:00:00.000Z', '2026-10-21 00:00:00'); // newest captured_at, inserted first
    ins.run('DUP', 'older', '2026-10-19T00:00:00.000Z', '2026-10-22 00:00:00');
    ins.run('TIE', 'tie-old-update', '2026-10-20T00:00:00.000Z', '2026-10-20 00:00:00');
    ins.run('TIE', 'tie-new-update', '2026-10-20T00:00:00.000Z', '2026-10-20 05:00:00');
    ins.run('ID', 'id-first', '2026-10-20T00:00:00.000Z', '2026-10-20 00:00:00');
    ins.run('ID', 'id-last', '2026-10-20T00:00:00.000Z', '2026-10-20 00:00:00');
    ins.run('SOLO', 'solo', '2026-10-18T00:00:00.000Z', '2026-10-18 00:00:00');

    db.exec(readFileSync(join(MIGRATIONS_DIR, MIGRATION_0010), 'utf8'));

    expect(db.query('SELECT customer_id, player_name FROM fantasy402_players ORDER BY customer_id').all()).toEqual([
      { customer_id: 'DUP', player_name: 'newest' },
      { customer_id: 'ID', player_name: 'id-last' },
      { customer_id: 'SOLO', player_name: 'solo' },
      { customer_id: 'TIE', player_name: 'tie-new-update' },
    ]);
    const idx = db
      .query(`SELECT name, sql FROM sqlite_master WHERE type = 'index' AND tbl_name = 'fantasy402_players'`)
      .all() as Array<{
      name: string;
      sql: string;
    }>;
    expect(idx.some(i => i.name === 'idx_fantasy402_players_customer_unique' && /UNIQUE/i.test(i.sql))).toBe(true);
    expect(idx.some(i => i.name === 'idx_fantasy402_players_customer')).toBe(false);
    expect(db.query('SELECT version FROM schema_migrations WHERE version = 10').get()).toEqual({ version: 10 });

    // Re-running is a no-op (idempotent).
    db.exec(readFileSync(join(MIGRATIONS_DIR, MIGRATION_0010), 'utf8'));
    expect(db.query('SELECT COUNT(*) AS n FROM fantasy402_players').get()).toEqual({ n: 4 });
  });
});
