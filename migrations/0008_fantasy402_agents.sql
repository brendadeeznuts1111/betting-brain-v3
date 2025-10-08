-- Migration: Fantasy402 Agents Hierarchy Table
-- Purpose: Store agent hierarchy for enhanced hierarchy dashboard
-- Version: 0008
-- Date: 2025-10-08

-- Drop table if exists (for local dev, remove for production)
DROP TABLE IF EXISTS fantasy402_agents;

-- Create fantasy402_agents table
CREATE TABLE IF NOT EXISTS fantasy402_agents (
  -- Identity
  agent_id TEXT PRIMARY KEY NOT NULL,        -- e.g., "NOLAWOLF"
  parent_id TEXT,                             -- Parent agent ID (NULL for root)
  agent_type TEXT NOT NULL,                   -- M=Master, A=Agent, P=Player
  agent_owner TEXT,                           -- Top-level owner

  -- Hierarchy metadata
  level INTEGER DEFAULT 0,                    -- Depth in tree (0=root)
  path TEXT,                                  -- Materialized path: "/BILLY666/NOLAWOLF"

  -- Agent details
  agent_name TEXT,                            -- Display name
  credit_limit REAL DEFAULT 0,                -- Credit limit
  outstanding_balance REAL DEFAULT 0,         -- Current balance
  hold_percentage REAL DEFAULT 0,             -- Hold %

  -- Risk metrics (computed from live bets)
  risk_score REAL DEFAULT 0,                  -- 0-100 risk score
  steam_percentage REAL DEFAULT 0,            -- % bets on steam moves
  velocity REAL DEFAULT 0,                    -- Bets per minute (5-min window)
  sharpness REAL DEFAULT 0,                   -- Sharp score 0-100

  -- Activity tracking
  total_bets INTEGER DEFAULT 0,               -- Lifetime bet count
  total_stake REAL DEFAULT 0,                 -- Lifetime stake
  last_bet_timestamp INTEGER,                 -- Unix timestamp of last bet

  -- Metadata
  active INTEGER DEFAULT 1,                   -- 0=inactive, 1=active
  site_id INTEGER DEFAULT 1,                  -- Site identifier
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  synced_at INTEGER,                          -- Last sync from Fantasy402

  -- Constraints
  FOREIGN KEY (parent_id) REFERENCES fantasy402_agents(agent_id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_fantasy402_agents_parent ON fantasy402_agents(parent_id);
CREATE INDEX IF NOT EXISTS idx_fantasy402_agents_type ON fantasy402_agents(agent_type);
CREATE INDEX IF NOT EXISTS idx_fantasy402_agents_owner ON fantasy402_agents(agent_owner);
CREATE INDEX IF NOT EXISTS idx_fantasy402_agents_path ON fantasy402_agents(path);
CREATE INDEX IF NOT EXISTS idx_fantasy402_agents_active ON fantasy402_agents(active);
CREATE INDEX IF NOT EXISTS idx_fantasy402_agents_risk ON fantasy402_agents(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_fantasy402_agents_steam ON fantasy402_agents(steam_percentage DESC);
CREATE INDEX IF NOT EXISTS idx_fantasy402_agents_last_bet ON fantasy402_agents(last_bet_timestamp DESC);

-- Create agent_tree_cache table for fast tree queries
CREATE TABLE IF NOT EXISTS agent_tree_cache (
  cache_key TEXT PRIMARY KEY NOT NULL,        -- "tree:BILLY666" or "tree:all"
  tree_json TEXT NOT NULL,                    -- JSON-encoded tree structure
  agent_count INTEGER DEFAULT 0,              -- Total agents in tree
  max_depth INTEGER DEFAULT 0,                -- Maximum tree depth
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  expires_at INTEGER NOT NULL,                -- Cache TTL (5 minutes)

  -- Index for cleanup
  CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS idx_agent_tree_cache_expires ON agent_tree_cache(expires_at);

-- Insert sample data for testing
INSERT OR REPLACE INTO fantasy402_agents (
  agent_id, parent_id, agent_type, agent_owner, level, path,
  agent_name, risk_score, steam_percentage, velocity, sharpness,
  total_bets, total_stake, last_bet_timestamp, active
) VALUES
  -- Root (Master)
  ('BILLY666', NULL, 'M', 'BILLY666', 0, '/BILLY666',
   'Billy (Master)', 45.2, 32.1, 8.5, 61.3,
   1247, 123456.78, unixepoch() - 3600, 1),

  -- Level 1 (Agents)
  ('NOLAWOLF', 'BILLY666', 'A', 'BILLY666', 1, '/BILLY666/NOLAWOLF',
   'Nola Wolf', 78.4, 67.2, 12.5, 85.1,
   2341, 234567.89, unixepoch() - 1800, 1),

  ('SHARPSHOOTER', 'BILLY666', 'A', 'BILLY666', 1, '/BILLY666/SHARPSHOOTER',
   'Sharp Shooter', 92.1, 89.3, 15.2, 94.7,
   3456, 345678.90, unixepoch() - 900, 1),

  ('CASUALCARL', 'BILLY666', 'A', 'BILLY666', 1, '/BILLY666/CASUALCARL',
   'Casual Carl', 23.4, 12.1, 3.2, 28.5,
   567, 56789.01, unixepoch() - 7200, 1),

  -- Level 2 (Sub-agents)
  ('WOLFCUB1', 'NOLAWOLF', 'P', 'BILLY666', 2, '/BILLY666/NOLAWOLF/WOLFCUB1',
   'Wolf Cub 1', 65.3, 54.2, 9.8, 71.2,
   1123, 112345.67, unixepoch() - 2400, 1),

  ('WOLFCUB2', 'NOLAWOLF', 'P', 'BILLY666', 2, '/BILLY666/NOLAWOLF/WOLFCUB2',
   'Wolf Cub 2', 71.8, 62.4, 11.3, 78.9,
   1456, 145678.90, unixepoch() - 1200, 1),

  ('SNIPERPRO', 'SHARPSHOOTER', 'P', 'BILLY666', 2, '/BILLY666/SHARPSHOOTER/SNIPERPRO',
   'Sniper Pro', 88.9, 82.1, 14.6, 91.3,
   2789, 278901.23, unixepoch() - 600, 1);

-- Cache the sample tree
INSERT OR REPLACE INTO agent_tree_cache (
  cache_key, tree_json, agent_count, max_depth, expires_at
) VALUES (
  'tree:BILLY666',
  '{"agent_id":"BILLY666","children":[{"agent_id":"NOLAWOLF","children":[{"agent_id":"WOLFCUB1"},{"agent_id":"WOLFCUB2"}]},{"agent_id":"SHARPSHOOTER","children":[{"agent_id":"SNIPERPRO"}]},{"agent_id":"CASUALCARL"}]}',
  7,
  2,
  unixepoch() + 300
);
