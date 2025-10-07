-- 🧠 Betting-Brain v3 - MCP Analytics Tables
-- Add tables required for MCP analytics tools

-- Bet History Table
-- Stores historical betting data for customer analytics and CLV tracking
CREATE TABLE IF NOT EXISTS bet_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cid TEXT NOT NULL,              -- Customer ID
  stake REAL NOT NULL,            -- Bet amount (stake)
  payout REAL NOT NULL,           -- Payout amount (0 if loss)
  result TEXT,                    -- WIN, LOSS, PUSH, PENDING
  ts TEXT NOT NULL,               -- Timestamp (ISO 8601)
  market_type TEXT,               -- SPREAD, MONEYLINE, TOTAL, PROP
  event_id TEXT,                  -- Event ID
  time_to_event INTEGER,          -- Seconds until event start (for timing analysis)
  created_at TEXT DEFAULT (datetime('now'))
) STRICT;

-- Indexes for bet_history (optimized for analytics queries)
CREATE INDEX IF NOT EXISTS idx_bet_history_cid_ts ON bet_history(cid, ts);
CREATE INDEX IF NOT EXISTS idx_bet_history_ts ON bet_history(ts);
CREATE INDEX IF NOT EXISTS idx_bet_history_event ON bet_history(event_id, ts);
CREATE INDEX IF NOT EXISTS idx_bet_history_market ON bet_history(market_type, ts);

-- Hold Tracking Table
-- Stores hold percentage history for forecasting and trend analysis
CREATE TABLE IF NOT EXISTS hold_tracking (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  eid TEXT NOT NULL,              -- Event ID
  mt TEXT NOT NULL,               -- Market Type (SPREAD, MONEYLINE, TOTAL)
  hold_pct REAL NOT NULL,         -- Hold percentage (0-100)
  volume REAL NOT NULL,           -- Total betting volume
  ts TEXT NOT NULL,               -- Timestamp (ISO 8601)
  created_at TEXT DEFAULT (datetime('now'))
) STRICT;

-- Indexes for hold_tracking (optimized for time-series queries)
CREATE INDEX IF NOT EXISTS idx_hold_tracking_ts ON hold_tracking(ts);
CREATE INDEX IF NOT EXISTS idx_hold_tracking_mt_ts ON hold_tracking(mt, ts);
CREATE INDEX IF NOT EXISTS idx_hold_tracking_eid ON hold_tracking(eid, ts);

-- Update Exposure Tracking Table
-- Add ts field for time-series analysis (SQLite doesn't support ALTER COLUMN, so recreate)

-- Create new table with ts field
CREATE TABLE IF NOT EXISTS exposure_tracking_new (
  eid TEXT NOT NULL,              -- Event ID
  side TEXT NOT NULL,             -- Side (HOME/AWAY)
  risk INTEGER NOT NULL,          -- Risk Amount (cents)
  net INTEGER NOT NULL,           -- Net Exposure (cents)
  ts TEXT NOT NULL,               -- Timestamp for time-series
  upd TEXT DEFAULT (datetime('now')), -- Update timestamp
  PRIMARY KEY (eid, side)
) STRICT, WITHOUT ROWID;

-- Copy existing data if table exists
INSERT OR IGNORE INTO exposure_tracking_new (eid, side, risk, net, ts, upd)
SELECT eid, side, risk, net, datetime('now'), upd
FROM exposure_tracking;

-- Drop old table and rename new one
DROP TABLE IF EXISTS exposure_tracking;
ALTER TABLE exposure_tracking_new RENAME TO exposure_tracking;

-- Recreate indexes for exposure_tracking
CREATE INDEX IF NOT EXISTS idx_exposure_tracking_risk ON exposure_tracking(risk DESC);
CREATE INDEX IF NOT EXISTS idx_exposure_tracking_ts ON exposure_tracking(ts);
CREATE INDEX IF NOT EXISTS idx_exposure_tracking_upd ON exposure_tracking(upd);

-- Record this migration
INSERT INTO schema_migrations (version, description)
VALUES (3, 'Add bet_history and hold_tracking tables, add ts field to exposure_tracking for MCP analytics');
