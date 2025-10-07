-- 🧠 Betting-Brain v3 - TTL Triggers
-- Automatic data cleanup for cost-cap compliance

-- TTL cleanup trigger for line_movements (7-day retention)
CREATE TRIGGER IF NOT EXISTS trg_line_movements_ttl
AFTER INSERT ON line_movements
BEGIN
  DELETE FROM line_movements 
  WHERE ing < datetime('now', '-7 days');
END;

-- TTL cleanup trigger for steam_dedupe (5-minute retention)
CREATE TRIGGER IF NOT EXISTS trg_steam_dedupe_ttl
AFTER INSERT ON steam_dedupe
BEGIN
  DELETE FROM steam_dedupe 
  WHERE ts < datetime('now', '-5 minutes');
END;

-- TTL cleanup trigger for old sharp_indicators (30-day retention)
CREATE TRIGGER IF NOT EXISTS trg_sharp_indicators_ttl
AFTER INSERT ON sharp_indicators
BEGIN
  DELETE FROM sharp_indicators 
  WHERE upd < datetime('now', '-30 days');
END;

-- TTL cleanup trigger for old exposure_tracking (24-hour retention)
CREATE TRIGGER IF NOT EXISTS trg_exposure_tracking_ttl
AFTER INSERT ON exposure_tracking
BEGIN
  DELETE FROM exposure_tracking 
  WHERE upd < datetime('now', '-24 hours');
END;

-- Record this migration
INSERT OR IGNORE INTO schema_migrations (version, description)
VALUES (2, 'Added TTL triggers for automatic data cleanup');
