/**
 * Minimal D1Database shim over bun:sqlite, with every migration in
 * migrations/ applied in order. Lets tests exercise real D1 SQL (upserts,
 * partial unique indexes, ON CONFLICT guards) instead of mocking it away.
 */
import { Database } from 'bun:sqlite';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const MIGRATIONS_DIR = join(import.meta.dir, '..', '..', 'migrations');

/** @param skip migration file names to leave out (e.g. the 0004 test-data seed). */
export function createMigratedSqlite(skip: string[] = []): Database {
  const db = new Database(':memory:');
  for (const f of readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql') && !skip.includes(f))
    .sort()) {
    db.exec(readFileSync(join(MIGRATIONS_DIR, f), 'utf8'));
  }
  return db;
}

class Stmt {
  constructor(
    private db: Database,
    private sql: string,
    private args: unknown[] = []
  ) {}
  bind(...args: unknown[]) {
    return new Stmt(this.db, this.sql, args);
  }
  async run() {
    const r = this.db.query(this.sql).run(...(this.args as any[]));
    return { success: true, meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } };
  }
  async all() {
    return { success: true, results: this.db.query(this.sql).all(...(this.args as any[])) };
  }
  async first(col?: string) {
    const row = this.db.query(this.sql).get(...(this.args as any[])) as Record<string, unknown> | null;
    if (!row) return null;
    return col ? row[col] : row;
  }
}

export function d1(db: Database): any {
  return { prepare: (sql: string) => new Stmt(db, sql) };
}
