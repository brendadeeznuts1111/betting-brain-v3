/**
 * sharpCalc lifetime metrics must cover a customer's whole bet_history, not
 * the newest N rows (PR #6 review P1: a 200-bet LIMIT skewed clv / nb / wr /
 * ao for any customer with more than 200 bets).
 */
import { describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { calculateSharpScore, getCustomerLifetimeStats } from '../../src/schedules/sharpCalc';

const MIGRATIONS = join(import.meta.dir, '..', '..', 'migrations');

function envWithBets(bets: Array<{ stake: number; payout: number; result: string; ts: string }>, cid = 'C1') {
  const db = new Database(':memory:');
  for (const f of readdirSync(MIGRATIONS)
    .filter(f => f.endsWith('.sql') && f !== '0004_test_data.sql')
    .sort()) {
    db.exec(readFileSync(join(MIGRATIONS, f), 'utf8'));
  }
  const ins = db.query('INSERT INTO bet_history (cid, stake, payout, result, ts) VALUES (?, ?, ?, ?, ?)');
  for (const b of bets) ins.run(cid, b.stake, b.payout, b.result, b.ts);
  const stmt = (sql: string, args: unknown[] = []) => ({
    bind: (...a: unknown[]) => stmt(sql, a),
    first: async () => db.query(sql).get(...(args as any[])) ?? null,
    all: async () => ({ results: db.query(sql).all(...(args as any[])) }),
    run: async () => ({ meta: { changes: db.query(sql).run(...(args as any[])).changes } }),
  });
  return { ANALYTICS: { prepare: (sql: string) => stmt(sql) } } as any;
}

const ts = (i: number) => new Date(Date.UTC(2026, 0, 1) + i * 3_600_000).toISOString();

describe('sharpCalc lifetime metrics', () => {
  // 300 old winning bets, then 200 newest losing bets + 20 pending + 10 pushes.
  // A newest-200 window would see only losses: clv -20000, win rate 0.
  const bets = [
    ...Array.from({ length: 300 }, (_, i) => ({ stake: 100, payout: 190, result: 'WIN', ts: ts(i) })),
    ...Array.from({ length: 10 }, (_, i) => ({ stake: 50, payout: 50, result: 'PUSH', ts: ts(300 + i) })),
    ...Array.from({ length: 200 }, (_, i) => ({ stake: 100, payout: 0, result: 'LOSS', ts: ts(310 + i) })),
    ...Array.from({ length: 20 }, (_, i) => ({ stake: 70, payout: 0, result: 'PENDING', ts: ts(510 + i) })),
  ];

  test('aggregates over every bet, not the newest 200', async () => {
    const stats = await getCustomerLifetimeStats('C1', envWithBets(bets));
    expect(stats.actionCount).toBe(530); // PENDING counted as action
    expect(stats.clv).toBe(300 * 90 - 200 * 100); // pushes net 0, pending excluded
    expect(stats.netBet).toBe(300 * 100 + 10 * 50 + 200 * 100); // settled stake only
    expect(stats.winRate).toBeCloseTo((300 / 500) * 100, 10); // WIN/(WIN+LOSS)
  });

  test('calculateSharpScore persists lifetime values', async () => {
    const m = await calculateSharpScore('C1', envWithBets(bets));
    expect(m.actionCount).toBe(530);
    expect(m.clv).toBe(7000);
    expect(m.netBet).toBe(50500);
    expect(m.winRate).toBeCloseTo(60, 10);
    expect(m.sharpScore).toBeGreaterThan(0);
  });

  test('only the requested customer is aggregated', async () => {
    const env = envWithBets(bets, 'OTHER');
    expect(await getCustomerLifetimeStats('C1', env)).toEqual({ actionCount: 0, clv: 0, netBet: 0, winRate: 0 });
    expect((await calculateSharpScore('C1', env)).sharpScore).toBe(0);
  });

  test('all-pending customer: action counted, no P&L, win rate 0', async () => {
    const env = envWithBets([{ stake: 10, payout: 0, result: 'PENDING', ts: ts(0) }]);
    expect(await getCustomerLifetimeStats('C1', env)).toEqual({ actionCount: 1, clv: 0, netBet: 0, winRate: 0 });
  });
});
