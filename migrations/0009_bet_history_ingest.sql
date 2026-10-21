-- 🧠 Betting-Brain v3 - Bet History Ingest Support
-- Idempotency key for fantasy402 customer-performance ingest + per-customer cursors

-- wager_number is the only reliable dedupe key: two bets can share (cid, ts).
-- Nullable so pre-migration rows and rows from other writers stay valid.
ALTER TABLE bet_history ADD COLUMN wager_number TEXT;

-- Partial unique index: dedupe only applies when wager_number is present
-- (SQLite treats NULLs as distinct, so legacy NULL rows never collide).
CREATE UNIQUE INDEX IF NOT EXISTS idx_bet_history_wager
  ON bet_history(cid, wager_number)
  WHERE wager_number IS NOT NULL;

-- Per-customer poll cursors. A global cursor would permanently skip the
-- window of any customer whose poll fails while others succeed.
CREATE TABLE IF NOT EXISTS bet_history_cursors (
  cid TEXT PRIMARY KEY,           -- Customer ID
  last_poll_ts TEXT,              -- ISO timestamp of last successful poll
  last_wager_number TEXT,         -- Highest wager number seen (tie-break)
  backfilled INTEGER NOT NULL DEFAULT 0, -- 1 once full history has been pulled
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now'))
) STRICT;

-- Record this migration
INSERT INTO schema_migrations (version, description)
VALUES (9, 'Add wager_number idempotency key to bet_history; add per-customer ingest cursor table');
