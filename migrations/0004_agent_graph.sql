-- Agent Graph Table Migration
-- Creates agent_graph table for storing agent relationships and graph data
-- Used for ring-fencing detection, steam propagation analysis, and credit risk assessment

CREATE TABLE agent_graph (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id TEXT NOT NULL,           -- Parent agent ID
  child_id TEXT NOT NULL,            -- Child agent ID  
  edge_type TEXT NOT NULL,           -- Relationship type: 'owns', 'refers', 'shares-credit'
  weight REAL NOT NULL DEFAULT 0.0,  -- Relationship strength (0.0 to 1.0)
  customer_overlap REAL DEFAULT 0.0, -- Percentage of shared customers (0.0 to 1.0)
  steam_correlation REAL DEFAULT 0.0, -- Steam move correlation (0.0 to 1.0)
  credit_risk_score REAL DEFAULT 0.0, -- Credit risk assessment (0.0 to 1.0)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure no duplicate relationships
  UNIQUE(parent_id, child_id, edge_type)
);

-- Indexes for performance
CREATE INDEX idx_agent_graph_parent ON agent_graph(parent_id);
CREATE INDEX idx_agent_graph_child ON agent_graph(child_id);
CREATE INDEX idx_agent_graph_type ON agent_graph(edge_type);
CREATE INDEX idx_agent_graph_weight ON agent_graph(weight);
CREATE INDEX idx_agent_graph_overlap ON agent_graph(customer_overlap);
CREATE INDEX idx_agent_graph_updated ON agent_graph(updated_at);

-- Composite indexes for common queries
CREATE INDEX idx_agent_graph_parent_type ON agent_graph(parent_id, edge_type);
CREATE INDEX idx_agent_graph_child_type ON agent_graph(child_id, edge_type);
CREATE INDEX idx_agent_graph_ring_fence ON agent_graph(customer_overlap, edge_type) WHERE customer_overlap > 0.8;
