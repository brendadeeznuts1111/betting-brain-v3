-- Agent Graph Temporal Edge Weights Migration
-- Adds temporal dimensions for steam propagation analysis
-- Non-breaking: uses ALTER TABLE with DEFAULT values

-- Add temporal edge weight columns
ALTER TABLE agent_graph
  ADD COLUMN last_steamed_same_game INTEGER DEFAULT 0;

ALTER TABLE agent_graph
  ADD COLUMN avg_lag_ms INTEGER DEFAULT 0;

-- Create indexes for new columns
CREATE INDEX idx_agent_graph_last_steam ON agent_graph(last_steamed_same_game);
CREATE INDEX idx_agent_graph_lag ON agent_graph(avg_lag_ms);

-- Composite index for ring-fence query with lag filter
CREATE INDEX idx_agent_graph_ring_fence_lag ON agent_graph(customer_overlap, avg_lag_ms, edge_type)
  WHERE customer_overlap > 0.8 AND avg_lag_ms >= 5000;

-- Comment: last_steamed_same_game is Unix timestamp of last shared steam event
-- Comment: avg_lag_ms is average milliseconds between parent and child steam bets
-- Comment: Ring-fence now excludes edges where avg_lag_ms < 5000 (genuine fast followers)
