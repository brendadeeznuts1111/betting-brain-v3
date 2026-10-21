/**
 * Bet lifecycle model check (see docs/bet-lifecycle.md).
 *
 * Drives the REAL ingest code path (normalizePerformanceRows → upsertBetHistory
 * / ingestCustomer, against bun:sqlite with every migration applied) with:
 *   1. an exhaustive enumeration of every delivery sequence (length 1..6) of a
 *      single wager, for every terminal outcome — covers duplicates and
 *      out-of-order (stale PENDING after settlement) delivery of one bet ID;
 *   2. seeded random interleavings of many wagers per poll, with duplicates
 *      inside one response and stale snapshots;
 *   3. a multi-poll scenario through ingestCustomer's cursor/window logic.
 *
 * Invariants:
 *   I1 exactly-once terminal: a settled wager ends terminal, enters a terminal
 *      state exactly once, and never changes afterwards;
 *   I2 no dropped transition: PENDING later delivered settled is updated;
 *   I3 no illegal transition (only none→any, PENDING→any);
 *   I4 one row per (cid, wager_number).
 */
import { describe, expect, test } from 'bun:test';
import type { Database } from 'bun:sqlite';
import { ingestCustomer, normalizePerformanceRows, upsertBetHistory } from '../../src/schedules/betHistoryIngest';
import { createMigratedSqlite, d1 } from '../utils/d1-sqlite-shim';

type Stored = 'PENDING' | 'WIN' | 'LOSS' | 'PUSH';
const TERMINAL = new Set<Stored>(['WIN', 'LOSS', 'PUSH']);
/** Upstream WagerStatus codes and the stored state the normalizer maps them to. */
const OUTCOMES: Array<{ code: string; stored: Stored }> = [
  { code: 'W', stored: 'WIN' },
  { code: 'L', stored: 'LOSS' },
  { code: 'C', stored: 'PUSH' },
  { code: 'R', stored: 'PUSH' },
];
const STAKE = 100;
const TO_WIN = 90;
const expectedPayout = (s: Stored) => (s === 'WIN' ? STAKE + TO_WIN : s === 'PUSH' ? STAKE : 0);

function freshEnv(): { db: Database; env: any } {
  const db = createMigratedSqlite();
  return { db, env: { ANALYTICS: d1(db), RAW_FEED_DB: d1(db) } };
}

function wager(n: string, status: string, insert = '2026-10-20 12:00:00.000') {
  return { WagerNumber: n, AmountWagered: STAKE, ToWinAmount: TO_WIN, WagerStatus: status, InsertDateTime: insert };
}

function rowsFor(db: Database, cid: string, n: string) {
  return db.query('SELECT result, payout FROM bet_history WHERE cid = ? AND wager_number = ?').all(cid, n) as Array<{
    result: Stored;
    payout: number;
  }>;
}

const LEGAL = (from: Stored | null, to: Stored) => from === null || from === to || from === 'PENDING';

/** Apply deliveries one poll at a time, recording every observed transition. */
// One migrated DB shared by the exhaustive runs; each sequence gets its own cid.
const shared = freshEnv();
let seqId = 0;

async function runSequence(statuses: string[], dupWithinPoll = false) {
  const { db, env } = shared;
  const cid = `S${++seqId}`;
  let prev: Stored | null = null;
  const transitions: Array<[Stored | null, Stored]> = [];
  let terminalEntries = 0;
  for (const st of statuses) {
    const list = dupWithinPoll ? [wager('W1', st), wager('W1', st)] : [wager('W1', st)];
    await upsertBetHistory(env, cid, normalizePerformanceRows({ LIST: list }));
    const rows = rowsFor(db, cid, 'W1');
    expect(rows.length).toBe(1); // I4
    const cur = rows[0].result;
    if (cur !== prev) {
      transitions.push([prev, cur]);
      if (TERMINAL.has(cur)) terminalEntries++;
    }
    prev = cur;
  }
  return { final: rowsFor(db, cid, 'W1')[0], transitions, terminalEntries };
}

function* sequences(alphabet: string[], maxLen: number): Generator<string[]> {
  for (let len = 1; len <= maxLen; len++) {
    const idx = new Array(len).fill(0);
    while (true) {
      yield idx.map(i => alphabet[i]);
      let k = len - 1;
      while (k >= 0 && ++idx[k] === alphabet.length) idx[k--] = 0;
      if (k < 0) break;
    }
  }
}

/** Collected counterexamples, printed so the gate log records what the model caught. */
function report(name: string, failures: string[]) {
  if (failures.length) {
    console.log(`[bet-lifecycle-model] ${name}: ${failures.length} counterexample(s); first: ${failures[0]}`);
  }
}

describe('bet lifecycle model (exhaustive, single wager)', () => {
  test('I3/I4: no illegal transition, one row per wager, any duplicates/out-of-order', async () => {
    const failures: string[] = [];
    for (const { code } of OUTCOMES) {
      for (const seq of sequences(['P', code], 6)) {
        for (const dup of [false, true]) {
          const { transitions } = await runSequence(seq, dup);
          for (const [a, b] of transitions) if (!LEGAL(a, b)) failures.push(`${seq.join('')}: ${a}->${b}`);
        }
      }
    }
    report('I3', failures);
    expect(failures).toEqual([]);
  });

  test('I1/I2: settled wager reaches its terminal state exactly once (no dropped PENDING->settled)', async () => {
    const failures: string[] = [];
    for (const { code, stored } of OUTCOMES) {
      for (const seq of sequences(['P', code], 6)) {
        if (!seq.includes(code)) continue;
        const { final, terminalEntries } = await runSequence(seq);
        if (final.result !== stored || final.payout !== expectedPayout(stored) || terminalEntries !== 1) {
          failures.push(`${seq.join(',')} -> ${final.result}/${final.payout} (terminal entries ${terminalEntries})`);
        }
      }
    }
    report('I1/I2', failures);
    expect(failures).toEqual([]);
  });

  test('I3: a stale PENDING delivered after settlement never regresses the row', async () => {
    for (const { code, stored } of OUTCOMES) {
      const { final } = await runSequence([code, 'P', 'P']);
      expect(final.result).toBe(stored);
    }
  });

  test('re-grade is not a defined transition: first settlement wins', async () => {
    const { final } = await runSequence(['P', 'W', 'L']);
    expect(final.result).toBe('WIN');
  });
});

describe('bet lifecycle model (randomized interleavings)', () => {
  // Mulberry32 — deterministic, so a failure is reproducible from the seed.
  const rng = (seed: number) => () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  test('I1–I4 hold over 300 random multi-wager runs', async () => {
    const failures: string[] = [];
    for (let seed = 1; seed <= 300; seed++) {
      const r = rng(seed);
      const { db, env } = freshEnv();
      const n = 1 + Math.floor(r() * 5);
      // Ground truth: each wager settles (or not) at a random poll index.
      const truth = Array.from({ length: n }, (_, i) => ({
        id: `W${i}`,
        settleAt: r() < 0.8 ? Math.floor(r() * 6) : Infinity,
        outcome: OUTCOMES[Math.floor(r() * OUTCOMES.length)],
      }));
      const last = new Map<string, Stored>();
      const entries = new Map<string, number>();
      for (let poll = 0; poll < 8; poll++) {
        const list: unknown[] = [];
        for (const w of truth) {
          if (r() < 0.25) continue; // missing from this response
          // Stale snapshot: the response may reflect an earlier poll's view.
          const view = poll - (r() < 0.3 ? Math.floor(r() * 4) : 0);
          const st = view >= w.settleAt ? w.outcome.code : 'P';
          list.push(wager(w.id, st));
          if (r() < 0.2) list.push(wager(w.id, st)); // duplicate in same response
        }
        list.sort(() => r() - 0.5);
        await upsertBetHistory(env, 'C1', normalizePerformanceRows({ LIST: list }));
        for (const w of truth) {
          const rows = rowsFor(db, 'C1', w.id);
          if (rows.length > 1) failures.push(`seed ${seed}: ${w.id} has ${rows.length} rows`);
          if (!rows.length) continue;
          const prev = last.get(w.id) ?? null;
          const cur = rows[0].result;
          if (cur !== prev) {
            if (!LEGAL(prev, cur)) failures.push(`seed ${seed}: ${w.id} ${prev}->${cur}`);
            if (TERMINAL.has(cur)) entries.set(w.id, (entries.get(w.id) ?? 0) + 1);
          }
          last.set(w.id, cur);
        }
      }
      // Final fresh poll at the true current state, delivered once.
      await upsertBetHistory(
        env,
        'C1',
        normalizePerformanceRows({ LIST: truth.map(w => wager(w.id, 8 >= w.settleAt ? w.outcome.code : 'P')) })
      );
      for (const w of truth) {
        if (w.settleAt === Infinity) continue;
        const row = rowsFor(db, 'C1', w.id)[0];
        if (row.result !== w.outcome.stored)
          failures.push(`seed ${seed}: ${w.id} stuck ${row.result}, expected ${w.outcome.stored}`);
      }
    }
    report('random', failures);
    expect(failures).toEqual([]);
  });
});

describe('bet lifecycle model (poll window via ingestCustomer)', () => {
  /**
   * Fake Customer Performance endpoint. ASSUMPTION (documented in
   * docs/bet-lifecycle.md): the report's start/end range filters on placement
   * date (InsertDateTime, Eastern), the only date field the normalizer reads.
   */
  function fakeClient(book: Map<string, { status: string; insert: string }>) {
    const calls: Array<Record<string, string>> = [];
    const client = {
      async makeRequest(_endpoint: string, params: Record<string, string>) {
        calls.push(params);
        const [m, d, y] = params.start.split('/');
        const start = `${y}-${m}-${d}`;
        return {
          LIST: [...book.entries()]
            .filter(([, w]) => w.insert.slice(0, 10) >= start)
            .map(([id, w]) => wager(id, w.status, w.insert)),
        };
      },
    };
    return { client: client as any, calls };
  }

  // KNOWN-FAILING at PR #7 head; flipped to test() by the fix that resolves it.
  test.failing('I2: a wager open longer than the overlap window still settles', async () => {
    const { db, env } = freshEnv();
    const book = new Map([
      ['FUT1', { status: 'P', insert: '2026-10-01 12:00:00.000' }], // long-dated future
      ['W2', { status: 'P', insert: '2026-10-19 12:00:00.000' }],
    ]);
    const { client } = fakeClient(book);
    const cursor = () => (db.query('SELECT * FROM bet_history_cursors WHERE cid = ?').get('C1') as any) ?? null;

    await ingestCustomer(env, client, 'C1', null, true); // backfill sees both PENDING
    book.set('W3', { status: 'W', insert: '2026-10-20 12:00:00.000' }); // newer activity
    await ingestCustomer(env, client, 'C1', cursor(), false);
    book.set('FUT1', { status: 'W', insert: '2026-10-01 12:00:00.000' }); // future settles
    await ingestCustomer(env, client, 'C1', cursor(), false);

    const fut = rowsFor(db, 'C1', 'FUT1');
    report('window', fut[0]?.result === 'WIN' ? [] : [`FUT1 stuck ${fut[0]?.result}`]);
    expect(fut).toEqual([{ result: 'WIN', payout: STAKE + TO_WIN }]);
  });
});
