-- Fantasy402.com Data Ingestion Tables
-- Stores intercepted API calls from Fantasy402.com

-- Main raw feed table
CREATE TABLE IF NOT EXISTS fantasy402_raw_feed (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  packet_id TEXT UNIQUE NOT NULL,
  timestamp TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  operation TEXT NOT NULL,
  method TEXT NOT NULL,
  url TEXT NOT NULL,
  request_body TEXT,
  response_status INTEGER NOT NULL,
  response_body TEXT,
  duration_ms INTEGER,
  agent_id TEXT,
  customer_id TEXT,
  
  -- JWT Claims
  jwt_user_id TEXT,
  jwt_office TEXT,
  jwt_expires_at TEXT,
  jwt_valid BOOLEAN,
  
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_fantasy402_timestamp ON fantasy402_raw_feed(timestamp);
CREATE INDEX IF NOT EXISTS idx_fantasy402_endpoint ON fantasy402_raw_feed(endpoint);
CREATE INDEX IF NOT EXISTS idx_fantasy402_operation ON fantasy402_raw_feed(operation);
CREATE INDEX IF NOT EXISTS idx_fantasy402_agent ON fantasy402_raw_feed(agent_id);
CREATE INDEX IF NOT EXISTS idx_fantasy402_jwt_user ON fantasy402_raw_feed(jwt_user_id);
CREATE INDEX IF NOT EXISTS idx_fantasy402_jwt_office ON fantasy402_raw_feed(jwt_office);

-- JWT Token tracking table
CREATE TABLE IF NOT EXISTS fantasy402_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  office TEXT,
  token_hash TEXT NOT NULL,
  issued_at TEXT NOT NULL,
  expires_at TEXT,
  is_valid BOOLEAN DEFAULT 1,
  last_used_at TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fantasy402_tokens_user ON fantasy402_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_fantasy402_tokens_expires ON fantasy402_tokens(expires_at);

-- Agent activity tracking
CREATE TABLE IF NOT EXISTS fantasy402_agents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT UNIQUE NOT NULL,
  agent_owner TEXT,
  agent_type TEXT,
  office TEXT,
  first_seen TEXT NOT NULL,
  last_active TEXT NOT NULL,
  total_requests INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fantasy402_agents_office ON fantasy402_agents(office);
CREATE INDEX IF NOT EXISTS idx_fantasy402_agents_type ON fantasy402_agents(agent_type);

-- Weekly figures cache
CREATE TABLE IF NOT EXISTS fantasy402_weekly_figures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  week_number INTEGER NOT NULL,
  week_year INTEGER NOT NULL,
  figures_json TEXT NOT NULL,
  captured_at TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(agent_id, week_number, week_year)
);

CREATE INDEX IF NOT EXISTS idx_fantasy402_weekly_agent ON fantasy402_weekly_figures(agent_id);
CREATE INDEX IF NOT EXISTS idx_fantasy402_weekly_week ON fantasy402_weekly_figures(week_number, week_year);

-- Authorizations tracking
CREATE TABLE IF NOT EXISTS fantasy402_authorizations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  master_agent_id TEXT,
  master_login TEXT,
  permissions_json TEXT NOT NULL,
  commission_percent REAL DEFAULT 0,
  inet_head_count_rate REAL DEFAULT 0,
  charge_core_plus_inet BOOLEAN DEFAULT 0,
  captured_at TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fantasy402_auth_agent ON fantasy402_authorizations(agent_id);
CREATE INDEX IF NOT EXISTS idx_fantasy402_auth_master ON fantasy402_authorizations(master_agent_id);
CREATE INDEX IF NOT EXISTS idx_fantasy402_auth_captured ON fantasy402_authorizations(captured_at);

-- Account balance snapshots (for historical tracking)
CREATE TABLE IF NOT EXISTS fantasy402_account_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id TEXT NOT NULL,
  agent_id TEXT,
  office TEXT,
  agent_type TEXT,
  current_balance REAL NOT NULL,
  available_balance REAL NOT NULL,
  credit_limit REAL DEFAULT 0,
  pending_wager_balance REAL DEFAULT 0,
  free_play_balance REAL DEFAULT 0,
  currency_code TEXT DEFAULT 'USD',
  active BOOLEAN DEFAULT 1,
  suspend_sportsbook BOOLEAN DEFAULT 0,
  read_only BOOLEAN DEFAULT 0,
  wager_limit REAL DEFAULT 0,
  minimum_wager REAL DEFAULT 0,
  max_prop_payout REAL DEFAULT 0,
  captured_at TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fantasy402_snapshots_customer ON fantasy402_account_snapshots(customer_id);
CREATE INDEX IF NOT EXISTS idx_fantasy402_snapshots_office ON fantasy402_account_snapshots(office);
CREATE INDEX IF NOT EXISTS idx_fantasy402_snapshots_captured ON fantasy402_account_snapshots(captured_at);

