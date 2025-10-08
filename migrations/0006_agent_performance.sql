-- Migration: Agent Performance Tracking
-- Stores performance metrics captured from getAgentPerformance API calls
-- Created: 2025-10-08

-- Agent performance snapshots (historical tracking)
CREATE TABLE IF NOT EXISTS fantasy402_agent_performance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Agent identification
  agent_id TEXT NOT NULL,
  agent_owner TEXT,
  
  -- Period
  period_start TEXT NOT NULL,  -- Date: MM/DD/YYYY
  period_end TEXT NOT NULL,
  period_type TEXT,            -- CP = Custom Period
  period_number INTEGER,
  period_name TEXT,
  
  -- Financial metrics (all in dollars, converted from cents)
  total_risk REAL DEFAULT 0,
  total_win REAL DEFAULT 0,
  total_commission REAL DEFAULT 0,
  net_income REAL DEFAULT 0,
  
  -- Wager counts
  total_wagers INTEGER DEFAULT 0,
  pending_wagers INTEGER DEFAULT 0,
  settled_wagers INTEGER DEFAULT 0,
  
  -- Free play
  free_play_used REAL DEFAULT 0,
  free_play_win REAL DEFAULT 0,
  
  -- Sport breakdown (JSON array)
  sport_breakdown_json TEXT,
  
  -- Metadata
  captured_at TEXT NOT NULL,   -- ISO 8601 timestamp
  
  -- Raw response
  raw_response_json TEXT,
  
  -- Indexes for fast lookups
  CONSTRAINT unique_performance UNIQUE (agent_id, period_start, period_end, captured_at)
);

-- Indexes for performance queries
CREATE INDEX IF NOT EXISTS idx_agent_performance_agent_id 
  ON fantasy402_agent_performance(agent_id);

CREATE INDEX IF NOT EXISTS idx_agent_performance_period 
  ON fantasy402_agent_performance(period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_agent_performance_captured_at 
  ON fantasy402_agent_performance(captured_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_performance_agent_period 
  ON fantasy402_agent_performance(agent_id, period_start, period_end);

-- Sport-specific performance (denormalized for fast queries)
CREATE TABLE IF NOT EXISTS fantasy402_sport_performance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Link to parent performance record
  performance_id INTEGER NOT NULL,
  
  -- Agent identification
  agent_id TEXT NOT NULL,
  
  -- Sport
  sport TEXT NOT NULL,
  
  -- Metrics
  risk REAL DEFAULT 0,
  win REAL DEFAULT 0,
  wager_count INTEGER DEFAULT 0,
  
  -- Period
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  
  -- Metadata
  captured_at TEXT NOT NULL,
  
  FOREIGN KEY (performance_id) REFERENCES fantasy402_agent_performance(id) ON DELETE CASCADE
);

-- Indexes for sport performance
CREATE INDEX IF NOT EXISTS idx_sport_performance_agent_id 
  ON fantasy402_sport_performance(agent_id);

CREATE INDEX IF NOT EXISTS idx_sport_performance_sport 
  ON fantasy402_sport_performance(sport);

CREATE INDEX IF NOT EXISTS idx_sport_performance_agent_sport 
  ON fantasy402_sport_performance(agent_id, sport);

CREATE INDEX IF NOT EXISTS idx_sport_performance_period 
  ON fantasy402_sport_performance(period_start, period_end);

-- Performance summary view (for quick analytics)
CREATE VIEW IF NOT EXISTS v_agent_performance_summary AS
SELECT 
  agent_id,
  agent_owner,
  COUNT(*) as total_reports,
  SUM(total_risk) as lifetime_risk,
  SUM(total_win) as lifetime_win,
  SUM(total_commission) as lifetime_commission,
  SUM(net_income) as lifetime_net_income,
  SUM(total_wagers) as lifetime_wagers,
  MIN(period_start) as first_period,
  MAX(period_end) as last_period,
  MAX(captured_at) as last_captured
FROM fantasy402_agent_performance
GROUP BY agent_id, agent_owner;

-- Sport performance summary view
CREATE VIEW IF NOT EXISTS v_sport_performance_summary AS
SELECT 
  agent_id,
  sport,
  COUNT(*) as report_count,
  SUM(risk) as total_risk,
  SUM(win) as total_win,
  SUM(wager_count) as total_wagers,
  ROUND(SUM(win) * 100.0 / NULLIF(SUM(risk), 0), 2) as win_percentage,
  MIN(period_start) as first_period,
  MAX(period_end) as last_period
FROM fantasy402_sport_performance
GROUP BY agent_id, sport;

