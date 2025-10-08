-- Fantasy402 Player Information Tables
-- Stores player/customer information from getInfoPlayer operations

-- Player information table
CREATE TABLE IF NOT EXISTS fantasy402_players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  player_name TEXT,
  player_type TEXT,
  office TEXT,
  status TEXT,
  registration_date TEXT,
  last_login TEXT,
  total_wagers INTEGER DEFAULT 0,
  total_risk REAL DEFAULT 0,
  total_win REAL DEFAULT 0,
  net_income REAL DEFAULT 0,
  commission_rate REAL DEFAULT 0,
  credit_limit REAL DEFAULT 0,
  available_balance REAL DEFAULT 0,
  pending_balance REAL DEFAULT 0,
  free_play_balance REAL DEFAULT 0,
  currency_code TEXT DEFAULT 'USD',
  active BOOLEAN DEFAULT 1,
  suspend_sportsbook BOOLEAN DEFAULT 0,
  read_only BOOLEAN DEFAULT 0,
  wager_limit REAL DEFAULT 0,
  minimum_wager REAL DEFAULT 0,
  max_prop_payout REAL DEFAULT 0,
  permissions_json TEXT,
  preferences_json TEXT,
  contact_info_json TEXT,
  raw_response_json TEXT,
  captured_at TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_fantasy402_players_customer ON fantasy402_players(customer_id);
CREATE INDEX IF NOT EXISTS idx_fantasy402_players_agent ON fantasy402_players(agent_id);
CREATE INDEX IF NOT EXISTS idx_fantasy402_players_office ON fantasy402_players(office);
CREATE INDEX IF NOT EXISTS idx_fantasy402_players_status ON fantasy402_players(status);
CREATE INDEX IF NOT EXISTS idx_fantasy402_players_active ON fantasy402_players(active);
CREATE INDEX IF NOT EXISTS idx_fantasy402_players_captured ON fantasy402_players(captured_at);

-- Player activity tracking
CREATE TABLE IF NOT EXISTS fantasy402_player_activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  activity_description TEXT,
  amount REAL,
  balance_before REAL,
  balance_after REAL,
  metadata_json TEXT,
  captured_at TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fantasy402_activity_customer ON fantasy402_player_activity(customer_id);
CREATE INDEX IF NOT EXISTS idx_fantasy402_activity_agent ON fantasy402_player_activity(agent_id);
CREATE INDEX IF NOT EXISTS idx_fantasy402_activity_type ON fantasy402_player_activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_fantasy402_activity_captured ON fantasy402_player_activity(captured_at);

-- Player performance tracking
CREATE TABLE IF NOT EXISTS fantasy402_player_performance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  period_type TEXT DEFAULT 'CP',
  period_number INTEGER DEFAULT -1,
  period_name TEXT DEFAULT 'Custom',
  total_risk REAL DEFAULT 0,
  total_win REAL DEFAULT 0,
  total_commission REAL DEFAULT 0,
  net_income REAL DEFAULT 0,
  total_wagers INTEGER DEFAULT 0,
  pending_wagers INTEGER DEFAULT 0,
  settled_wagers INTEGER DEFAULT 0,
  free_play_used REAL DEFAULT 0,
  free_play_win REAL DEFAULT 0,
  sport_breakdown_json TEXT,
  captured_at TEXT NOT NULL,
  raw_response_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fantasy402_player_perf_customer ON fantasy402_player_performance(customer_id);
CREATE INDEX IF NOT EXISTS idx_fantasy402_player_perf_agent ON fantasy402_player_performance(agent_id);
CREATE INDEX IF NOT EXISTS idx_fantasy402_player_perf_period ON fantasy402_player_performance(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_fantasy402_player_perf_captured ON fantasy402_player_performance(captured_at);

-- Player sport-specific performance
CREATE TABLE IF NOT EXISTS fantasy402_player_sport_performance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  performance_id INTEGER NOT NULL,
  customer_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  sport TEXT NOT NULL,
  risk REAL DEFAULT 0,
  win REAL DEFAULT 0,
  wager_count INTEGER DEFAULT 0,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  captured_at TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (performance_id) REFERENCES fantasy402_player_performance(id)
);

CREATE INDEX IF NOT EXISTS idx_fantasy402_player_sport_perf_id ON fantasy402_player_sport_performance(performance_id);
CREATE INDEX IF NOT EXISTS idx_fantasy402_player_sport_perf_customer ON fantasy402_player_sport_performance(customer_id);
CREATE INDEX IF NOT EXISTS idx_fantasy402_player_sport_perf_sport ON fantasy402_player_sport_performance(sport);
CREATE INDEX IF NOT EXISTS idx_fantasy402_player_sport_perf_period ON fantasy402_player_sport_performance(period_start, period_end);

-- Transaction tracking
CREATE TABLE IF NOT EXISTS fantasy402_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_number TEXT UNIQUE NOT NULL,
  customer_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  tran_code TEXT NOT NULL,
  tran_type TEXT NOT NULL,
  amount REAL NOT NULL,
  description TEXT,
  tran_date_time TEXT NOT NULL,
  hold_amount REAL DEFAULT 0,
  grade_num TEXT,
  entered_by TEXT,
  balance REAL NOT NULL,
  captured_at TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fantasy402_transactions_customer ON fantasy402_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_fantasy402_transactions_agent ON fantasy402_transactions(agent_id);
CREATE INDEX IF NOT EXISTS idx_fantasy402_transactions_code ON fantasy402_transactions(tran_code);
CREATE INDEX IF NOT EXISTS idx_fantasy402_transactions_type ON fantasy402_transactions(tran_type);
CREATE INDEX IF NOT EXISTS idx_fantasy402_transactions_date ON fantasy402_transactions(tran_date_time);
CREATE INDEX IF NOT EXISTS idx_fantasy402_transactions_captured ON fantasy402_transactions(captured_at);

-- Transaction summary
CREATE TABLE IF NOT EXISTS fantasy402_transaction_summary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  total_transactions INTEGER DEFAULT 0,
  total_wager_loss REAL DEFAULT 0,
  total_wager_win REAL DEFAULT 0,
  total_casino_win REAL DEFAULT 0,
  total_casino_loss REAL DEFAULT 0,
  total_deposits REAL DEFAULT 0,
  total_withdrawals REAL DEFAULT 0,
  net_balance REAL DEFAULT 0,
  captured_at TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fantasy402_transaction_summary_customer ON fantasy402_transaction_summary(customer_id);
CREATE INDEX IF NOT EXISTS idx_fantasy402_transaction_summary_agent ON fantasy402_transaction_summary(agent_id);
CREATE INDEX IF NOT EXISTS idx_fantasy402_transaction_summary_captured ON fantasy402_transaction_summary(captured_at);

-- Pending wagers tracking
CREATE TABLE IF NOT EXISTS fantasy402_pending_wagers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wager_id TEXT UNIQUE NOT NULL,
  customer_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  sport TEXT,
  bet_type TEXT,
  stake REAL DEFAULT 0,
  odds REAL DEFAULT 0,
  risk REAL DEFAULT 0,
  potential_win REAL DEFAULT 0,
  event_id TEXT,
  event_name TEXT,
  wager_date TEXT,
  status TEXT DEFAULT 'Pending',
  description TEXT,
  captured_at TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fantasy402_pending_customer ON fantasy402_pending_wagers(customer_id);
CREATE INDEX IF NOT EXISTS idx_fantasy402_pending_agent ON fantasy402_pending_wagers(agent_id);
CREATE INDEX IF NOT EXISTS idx_fantasy402_pending_sport ON fantasy402_pending_wagers(sport);
CREATE INDEX IF NOT EXISTS idx_fantasy402_pending_status ON fantasy402_pending_wagers(status);
CREATE INDEX IF NOT EXISTS idx_fantasy402_pending_date ON fantasy402_pending_wagers(wager_date);
CREATE INDEX IF NOT EXISTS idx_fantasy402_pending_captured ON fantasy402_pending_wagers(captured_at);

-- Pending wagers summary
CREATE TABLE IF NOT EXISTS fantasy402_pending_summary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  total_wagers INTEGER DEFAULT 0,
  total_risk REAL DEFAULT 0,
  total_potential_win REAL DEFAULT 0,
  total_stake REAL DEFAULT 0,
  average_odds REAL DEFAULT 0,
  sport_breakdown_json TEXT,
  bet_type_breakdown_json TEXT,
  captured_at TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fantasy402_pending_summary_customer ON fantasy402_pending_summary(customer_id);
CREATE INDEX IF NOT EXISTS idx_fantasy402_pending_summary_agent ON fantasy402_pending_summary(agent_id);
CREATE INDEX IF NOT EXISTS idx_fantasy402_pending_summary_captured ON fantasy402_pending_summary(captured_at);

-- Player analysis reports
CREATE TABLE IF NOT EXISTS fantasy402_player_analysis (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  report_type TEXT DEFAULT 'PlayerAnalysis',
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  line_type TEXT DEFAULT 'All',
  total_wagers INTEGER DEFAULT 0,
  total_risk REAL DEFAULT 0,
  total_win REAL DEFAULT 0,
  net_income REAL DEFAULT 0,
  win_rate REAL DEFAULT 0,
  average_odds REAL DEFAULT 0,
  sports_breakdown_json TEXT,
  bet_types_breakdown_json TEXT,
  time_breakdown_json TEXT,
  raw_analysis_json TEXT,
  captured_at TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fantasy402_analysis_customer ON fantasy402_player_analysis(customer_id);
CREATE INDEX IF NOT EXISTS idx_fantasy402_analysis_agent ON fantasy402_player_analysis(agent_id);
CREATE INDEX IF NOT EXISTS idx_fantasy402_analysis_period ON fantasy402_player_analysis(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_fantasy402_analysis_type ON fantasy402_player_analysis(report_type);
CREATE INDEX IF NOT EXISTS idx_fantasy402_analysis_captured ON fantasy402_player_analysis(captured_at);

-- Player sport-specific analysis
CREATE TABLE IF NOT EXISTS fantasy402_player_sport_analysis (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  sport TEXT NOT NULL,
  wager_count INTEGER DEFAULT 0,
  total_risk REAL DEFAULT 0,
  total_win REAL DEFAULT 0,
  net_income REAL DEFAULT 0,
  win_rate REAL DEFAULT 0,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  captured_at TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fantasy402_sport_analysis_customer ON fantasy402_player_sport_analysis(customer_id);
CREATE INDEX IF NOT EXISTS idx_fantasy402_sport_analysis_agent ON fantasy402_player_sport_analysis(agent_id);
CREATE INDEX IF NOT EXISTS idx_fantasy402_sport_analysis_sport ON fantasy402_player_sport_analysis(sport);
CREATE INDEX IF NOT EXISTS idx_fantasy402_sport_analysis_period ON fantasy402_player_sport_analysis(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_fantasy402_sport_analysis_captured ON fantasy402_player_sport_analysis(captured_at);
