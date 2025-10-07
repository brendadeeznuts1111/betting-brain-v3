-- 🧠 Betting-Brain v3 - Initial Schema
-- Edge-optimized with ROWID, WITHOUT ROWID, and LZ4 compression

-- Line Movements (7-day TTL, ROWID+LZ4)
-- Tracks all line movements with volume changes
CREATE TABLE IF NOT EXISTS line_movements (
  eid  TEXT NOT NULL,           -- Event ID
  mt   TEXT NOT NULL,           -- Market Type (SPREAD, MONEYLINE, TOTAL, PROP)
  lb   REAL,                    -- Line Before
  la   REAL,                    -- Line After
  vb   INTEGER,                 -- Volume Before
  va   INTEGER,                 -- Volume After
  ts   TEXT NOT NULL,           -- Timestamp (ISO 8601)
  ing  TEXT DEFAULT (datetime('now')) -- Ingestion timestamp
) STRICT;

-- Indexes for line_movements
CREATE INDEX IF NOT EXISTS idx_line_movements_eid_mt ON line_movements(eid, mt);
CREATE INDEX IF NOT EXISTS idx_line_movements_ts ON line_movements(ts);
CREATE INDEX IF NOT EXISTS idx_line_movements_ing ON line_movements(ing);

-- Sharp Indicators (hourly refresh)
-- Tracks customer sharp scores and betting performance
CREATE TABLE IF NOT EXISTS sharp_indicators (
  cid  TEXT PRIMARY KEY,        -- Customer ID
  clv  REAL NOT NULL,           -- Customer Lifetime Value
  wr   REAL NOT NULL,           -- Win Rate (0-100)
  ao   INTEGER NOT NULL,        -- Action Count
  nb   REAL NOT NULL,           -- Net Bet
  upd  TEXT DEFAULT (datetime('now')) -- Update timestamp
) STRICT;

-- Indexes for sharp_indicators
CREATE INDEX IF NOT EXISTS idx_sharp_indicators_clv ON sharp_indicators(clv DESC);
CREATE INDEX IF NOT EXISTS idx_sharp_indicators_upd ON sharp_indicators(upd);

-- Exposure Tracking (30s refresh)
-- Real-time exposure monitoring per event and side
CREATE TABLE IF NOT EXISTS exposure_tracking (
  eid  TEXT NOT NULL,           -- Event ID
  side TEXT NOT NULL,           -- Side (HOME/AWAY)
  risk INTEGER NOT NULL,        -- Risk Amount (cents)
  net  INTEGER NOT NULL,        -- Net Exposure (cents)
  upd  TEXT DEFAULT (datetime('now')), -- Update timestamp
  PRIMARY KEY (eid, side)
) STRICT, WITHOUT ROWID;

-- Indexes for exposure_tracking
CREATE INDEX IF NOT EXISTS idx_exposure_tracking_risk ON exposure_tracking(risk DESC);
CREATE INDEX IF NOT EXISTS idx_exposure_tracking_upd ON exposure_tracking(upd);

-- Steam Dedupe (5min TTL)
-- Prevents duplicate steam move alerts
CREATE TABLE IF NOT EXISTS steam_dedupe (
  eid  TEXT NOT NULL,           -- Event ID
  mt   TEXT NOT NULL,           -- Market Type
  ts   TEXT NOT NULL,           -- Timestamp
  PRIMARY KEY (eid, mt)
) STRICT, WITHOUT ROWID;

-- Index for steam_dedupe TTL cleanup
CREATE INDEX IF NOT EXISTS idx_steam_dedupe_ts ON steam_dedupe(ts);

-- Migration metadata
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT DEFAULT (datetime('now')),
  description TEXT
) STRICT;

-- Record this migration
INSERT OR IGNORE INTO schema_migrations (version, description)
VALUES (1, 'Initial schema with line_movements, sharp_indicators, exposure_tracking, steam_dedupe');
