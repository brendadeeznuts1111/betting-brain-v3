-- 🧠 Betting-Brain v3 - Test Data Fixtures
-- Realistic test data for MCP analytics tools

-- ============================================================================
-- SHARP INDICATORS (Customer Profiling Data)
-- ============================================================================

-- Professional Sharp Customers (75-100 composite score)
INSERT OR IGNORE INTO sharp_indicators (cid, clv, wr, ao, nb) VALUES
('sharp-pro-001', 5000, 62, 250, 5000),
('sharp-pro-002', 4500, 60, 220, 4500),
('sharp-pro-003', 6200, 65, 300, 6200);

-- Advanced Sharp Customers (60-74 composite score)
INSERT OR IGNORE INTO sharp_indicators (cid, clv, wr, ao, nb) VALUES
('sharp-adv-001', 2500, 58, 150, 2500),
('sharp-adv-002', 3000, 57, 180, 3000),
('sharp-adv-003', 2800, 59, 160, 2800);

-- Intermediate Sharp Customers (45-59 composite score)
INSERT OR IGNORE INTO sharp_indicators (cid, clv, wr, ao, nb) VALUES
('sharp-int-001', 1500, 54, 100, 1500),
('sharp-int-002', 1800, 53, 120, 1800);

-- Casual/Recreational Customers (< 45 composite score)
INSERT OR IGNORE INTO sharp_indicators (cid, clv, wr, ao, nb) VALUES
('rec-001', 500, 51, 40, 500),
('rec-002', -300, 48, 60, -300),
('rec-003', 200, 50, 30, 200),
('rec-004', -500, 45, 80, -500);

-- Whale Customers (high volume, mixed performance)
INSERT OR IGNORE INTO sharp_indicators (cid, clv, wr, ao, nb) VALUES
('whale-001', 10000, 52, 500, 10000),
('whale-002', -2000, 49, 450, -2000);

-- ============================================================================
-- LINE MOVEMENTS (Steam Detection Data)
-- ============================================================================

-- Recent significant line movements (CRITICAL severity)
INSERT OR IGNORE INTO line_movements (eid, mt, lb, la, vb, va, ts) VALUES
('nba_lal_vs_gsw', 'SPREAD', 5.5, 8.0, 10000, 35000, datetime('now', '-2 hours')),
('nfl_kc_vs_buf', 'SPREAD', -3.0, -5.5, 15000, 40000, datetime('now', '-1 hour'));

-- HIGH severity movements
INSERT OR IGNORE INTO line_movements (eid, mt, lb, la, vb, va, ts) VALUES
('nba_lal_vs_gsw', 'TOTAL', 220.5, 222.0, 12000, 25000, datetime('now', '-90 minutes')),
('nfl_kc_vs_buf', 'TOTAL', 52.5, 54.0, 18000, 30000, datetime('now', '-45 minutes')),
('mlb_nyy_vs_bos', 'MONEYLINE', -150, -180, 8000, 15000, datetime('now', '-3 hours'));

-- MEDIUM severity movements
INSERT OR IGNORE INTO line_movements (eid, mt, lb, la, vb, va, ts) VALUES
('nba_bos_vs_mia', 'SPREAD', -2.5, -3.0, 5000, 8000, datetime('now', '-4 hours')),
('nfl_dal_vs_phi', 'SPREAD', 7.0, 7.5, 6000, 9000, datetime('now', '-5 hours')),
('nba_den_vs_lac', 'TOTAL', 215.0, 215.5, 4000, 6000, datetime('now', '-6 hours'));

-- LOW/No movement
INSERT OR IGNORE INTO line_movements (eid, mt, lb, la, vb, va, ts) VALUES
('mlb_lad_vs_sf', 'SPREAD', -1.5, -1.7, 2000, 2500, datetime('now', '-12 hours')),
('nba_mem_vs_sas', 'TOTAL', 210.0, 210.2, 3000, 3200, datetime('now', '-8 hours'));

-- ============================================================================
-- BET HISTORY (Customer Analytics Data)
-- ============================================================================

-- Sharp-pro-001 bets (winning customer, early timing, consistent sizing)
INSERT OR IGNORE INTO bet_history (cid, stake, payout, result, ts, market_type, event_id, time_to_event) VALUES
-- Last 30 days - winning bets
('sharp-pro-001', 500, 950, 'WIN', datetime('now', '-1 day'), 'SPREAD', 'nba_lal_vs_gsw', 14400),
('sharp-pro-001', 500, 950, 'WIN', datetime('now', '-2 days'), 'SPREAD', 'nfl_kc_vs_buf', 21600),
('sharp-pro-001', 500, 0, 'LOSS', datetime('now', '-3 days'), 'TOTAL', 'mlb_nyy_vs_bos', 18000),
('sharp-pro-001', 500, 950, 'WIN', datetime('now', '-4 days'), 'MONEYLINE', 'nba_bos_vs_mia', 25200),
('sharp-pro-001', 500, 950, 'WIN', datetime('now', '-5 days'), 'SPREAD', 'nfl_dal_vs_phi', 28800),
('sharp-pro-001', 500, 0, 'LOSS', datetime('now', '-6 days'), 'TOTAL', 'nba_den_vs_lac', 10800),
('sharp-pro-001', 500, 950, 'WIN', datetime('now', '-7 days'), 'SPREAD', 'mlb_lad_vs_sf', 32400),
('sharp-pro-001', 500, 950, 'WIN', datetime('now', '-10 days'), 'MONEYLINE', 'nba_mem_vs_sas', 19800),
('sharp-pro-001', 500, 0, 'LOSS', datetime('now', '-12 days'), 'SPREAD', 'nfl_kc_vs_buf', 36000),
('sharp-pro-001', 500, 950, 'WIN', datetime('now', '-15 days'), 'TOTAL', 'nba_lal_vs_gsw', 27000);

-- Rec-002 bets (losing customer, late timing, inconsistent sizing)
INSERT OR IGNORE INTO bet_history (cid, stake, payout, result, ts, market_type, event_id, time_to_event) VALUES
('rec-002', 100, 0, 'LOSS', datetime('now', '-1 day'), 'PARLAY', 'nba_lal_vs_gsw', 1800),
('rec-002', 250, 0, 'LOSS', datetime('now', '-2 days'), 'PROP', 'nfl_kc_vs_buf', 900),
('rec-002', 50, 95, 'WIN', datetime('now', '-4 days'), 'MONEYLINE', 'mlb_nyy_vs_bos', 600),
('rec-002', 500, 0, 'LOSS', datetime('now', '-5 days'), 'PARLAY', 'nba_bos_vs_mia', 1200),
('rec-002', 75, 0, 'LOSS', datetime('now', '-8 days'), 'SPREAD', 'nfl_dal_vs_phi', 2700),
('rec-002', 200, 380, 'WIN', datetime('now', '-10 days'), 'TOTAL', 'nba_den_vs_lac', 3600);

-- Whale-001 bets (high volume, mixed results)
INSERT OR IGNORE INTO bet_history (cid, stake, payout, result, ts, market_type, event_id, time_to_event) VALUES
('whale-001', 2000, 3800, 'WIN', datetime('now', '-1 day'), 'SPREAD', 'nfl_kc_vs_buf', 10800),
('whale-001', 2000, 0, 'LOSS', datetime('now', '-1 day'), 'TOTAL', 'nba_lal_vs_gsw', 12000),
('whale-001', 2000, 3800, 'WIN', datetime('now', '-2 days'), 'MONEYLINE', 'mlb_nyy_vs_bos', 14400),
('whale-001', 2000, 0, 'LOSS', datetime('now', '-3 days'), 'SPREAD', 'nba_bos_vs_mia', 9000),
('whale-001', 2000, 3800, 'WIN', datetime('now', '-4 days'), 'TOTAL', 'nfl_dal_vs_phi', 16200);

-- Add more bets for other customers
INSERT OR IGNORE INTO bet_history (cid, stake, payout, result, ts, market_type, event_id, time_to_event) VALUES
('sharp-adv-001', 300, 570, 'WIN', datetime('now', '-1 day'), 'SPREAD', 'nba_lal_vs_gsw', 18000),
('sharp-adv-001', 300, 0, 'LOSS', datetime('now', '-2 days'), 'TOTAL', 'nfl_kc_vs_buf', 21600),
('sharp-adv-001', 300, 570, 'WIN', datetime('now', '-3 days'), 'MONEYLINE', 'mlb_nyy_vs_bos', 25200),
('sharp-int-001', 200, 380, 'WIN', datetime('now', '-1 day'), 'SPREAD', 'nba_bos_vs_mia', 14400),
('sharp-int-001', 200, 0, 'LOSS', datetime('now', '-2 days'), 'TOTAL', 'nfl_dal_vs_phi', 19800),
('rec-001', 100, 190, 'WIN', datetime('now', '-1 day'), 'MONEYLINE', 'nba_den_vs_lac', 3600),
('rec-003', 150, 0, 'LOSS', datetime('now', '-1 day'), 'SPREAD', 'mlb_lad_vs_sf', 7200);

-- ============================================================================
-- EXPOSURE TRACKING (Risk Concentration Data)
-- ============================================================================

INSERT OR IGNORE INTO exposure_tracking (eid, side, risk, net, ts) VALUES
-- High concentration events
('nba_lal_vs_gsw', 'HOME', 150000, -25000, datetime('now', '-1 hour')),
('nba_lal_vs_gsw', 'AWAY', 80000, 15000, datetime('now', '-1 hour')),
('nfl_kc_vs_buf', 'HOME', 200000, -45000, datetime('now', '-2 hours')),
('nfl_kc_vs_buf', 'AWAY', 120000, 30000, datetime('now', '-2 hours')),

-- Medium concentration
('mlb_nyy_vs_bos', 'HOME', 50000, -8000, datetime('now', '-3 hours')),
('mlb_nyy_vs_bos', 'AWAY', 40000, 5000, datetime('now', '-3 hours')),
('nba_bos_vs_mia', 'HOME', 75000, -12000, datetime('now', '-4 hours')),
('nba_bos_vs_mia', 'AWAY', 60000, 8000, datetime('now', '-4 hours')),

-- Low concentration
('nfl_dal_vs_phi', 'HOME', 30000, -3000, datetime('now', '-5 hours')),
('nfl_dal_vs_phi', 'AWAY', 25000, 2000, datetime('now', '-5 hours')),
('nba_den_vs_lac', 'HOME', 20000, -1500, datetime('now', '-6 hours')),
('nba_den_vs_lac', 'AWAY', 18000, 1000, datetime('now', '-6 hours'));

-- ============================================================================
-- HOLD TRACKING (Forecasting Data)
-- ============================================================================

-- Daily hold percentage for last 30 days (simulated trend)
INSERT OR IGNORE INTO hold_tracking (eid, mt, hold_pct, volume, ts) VALUES
-- SPREAD market - healthy 4-6% hold with slight uptrend
('daily_aggregate', 'SPREAD', 4.2, 50000, datetime('now', '-30 days')),
('daily_aggregate', 'SPREAD', 4.5, 52000, datetime('now', '-29 days')),
('daily_aggregate', 'SPREAD', 4.3, 48000, datetime('now', '-28 days')),
('daily_aggregate', 'SPREAD', 4.8, 55000, datetime('now', '-27 days')),
('daily_aggregate', 'SPREAD', 5.1, 58000, datetime('now', '-26 days')),
('daily_aggregate', 'SPREAD', 4.9, 54000, datetime('now', '-25 days')),
('daily_aggregate', 'SPREAD', 5.2, 60000, datetime('now', '-24 days')),
('daily_aggregate', 'SPREAD', 5.5, 62000, datetime('now', '-23 days')),
('daily_aggregate', 'SPREAD', 5.3, 59000, datetime('now', '-22 days')),
('daily_aggregate', 'SPREAD', 5.6, 65000, datetime('now', '-21 days')),
('daily_aggregate', 'SPREAD', 5.4, 63000, datetime('now', '-20 days')),
('daily_aggregate', 'SPREAD', 5.7, 67000, datetime('now', '-19 days')),
('daily_aggregate', 'SPREAD', 5.9, 70000, datetime('now', '-18 days')),
('daily_aggregate', 'SPREAD', 5.8, 68000, datetime('now', '-17 days')),
('daily_aggregate', 'SPREAD', 6.0, 72000, datetime('now', '-16 days')),

-- TOTAL market - lower hold with more volatility
('daily_aggregate', 'TOTAL', 3.5, 40000, datetime('now', '-30 days')),
('daily_aggregate', 'TOTAL', 3.8, 42000, datetime('now', '-29 days')),
('daily_aggregate', 'TOTAL', 3.2, 38000, datetime('now', '-28 days')),
('daily_aggregate', 'TOTAL', 4.1, 45000, datetime('now', '-27 days')),
('daily_aggregate', 'TOTAL', 3.9, 43000, datetime('now', '-26 days')),
('daily_aggregate', 'TOTAL', 3.6, 41000, datetime('now', '-25 days')),
('daily_aggregate', 'TOTAL', 4.3, 47000, datetime('now', '-24 days')),
('daily_aggregate', 'TOTAL', 4.0, 44000, datetime('now', '-23 days')),

-- MONEYLINE market - higher hold
('daily_aggregate', 'MONEYLINE', 6.5, 30000, datetime('now', '-30 days')),
('daily_aggregate', 'MONEYLINE', 6.8, 32000, datetime('now', '-29 days')),
('daily_aggregate', 'MONEYLINE', 6.3, 29000, datetime('now', '-28 days')),
('daily_aggregate', 'MONEYLINE', 7.1, 35000, datetime('now', '-27 days')),
('daily_aggregate', 'MONEYLINE', 6.9, 33000, datetime('now', '-26 days'));

-- ============================================================================
-- SUMMARY
-- ============================================================================

-- Total records created:
-- - 15 customers in sharp_indicators
-- - 11 line movements
-- - 30+ bets in bet_history
-- - 12 exposure records
-- - 28 hold tracking records

-- This provides enough data to test:
-- ✅ getSteamMoves (line movements with various severities)
-- ✅ getRiskConcentration (exposure by event/customer/market)
-- ✅ getSharpActivity (sharp customers with recent activity)
-- ✅ getTimeSeriesCLV (bet history for CLV trends)
-- ✅ getEnhancedSharpScore (multi-dimensional profiling)
-- ✅ getHoldForecast (hold % forecasting with trend)
-- ✅ getHandleAndHold (volume and hold analysis)
-- ✅ getCustomerVolume (customer segmentation)
-- ✅ getTimeSeriesAnalytics (flexible time-series)
