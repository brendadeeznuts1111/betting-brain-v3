# Autonomous Trading System Documentation

**Version**: 3.4.0
**Status**: ✅ Production-Ready
**Date**: 2025-10-08

## Overview

Betting-Brain v3.4.0 introduces a fully autonomous trading layer that ingests real-time betting data, predicts hold percentages using machine learning, generates auto-hedge signals, and executes hedging bets automatically via MCP.

## Architecture

```
┌─────────────────┐
│ Fantasy402      │
│ WebSocket       │ ──→ Stream Manager
└─────────────────┘         │
                            ↓
                    ┌───────────────┐
                    │ Hold Predictor│ (Linear Regression)
                    └───────────────┘
                            │
                            ↓
                    ┌───────────────┐
                    │ Signal        │
                    │ Generator     │ ──→ Validator
                    └───────────────┘         │
                            ↓
                    ┌───────────────┐
                    │ Circuit       │
                    │ Breaker       │ ──→ Risk Limits
                    └───────────────┘         │
                            ↓
                    ┌───────────────┐
                    │ MCP Tool:     │
                    │ placeHedgeBet │ ──→ fantasy402 API
                    └───────────────┘         │
                            ↓
                    ┌───────────────┐
                    │ Alert Manager │ ──→ Slack/Telegram
                    └───────────────┘
                            │
                            ↓
                    ┌───────────────┐
                    │ Audit Trail   │ (Analytics Engine)
                    └───────────────┘
```

## Core Components

### 1. **Stream Layer**
- **fantasy402-adapter.ts**: WebSocket adapter with auto-reconnect
- **stream-manager.ts**: Multi-source stream orchestration
- Handles `bet_placed`, `line_moved`, `hold_calculated`, `exposure_updated` events

### 2. **Predictive Model**
- **hold-predictor.ts**: Linear regression (7-day training window)
- **Features**: hold%, volume, sharp_score, time_of_day, day_of_week, event_count, exposure_delta
- **Output**: predicted_hold, confidence_interval (95%), uncertainty_score (0-1)
- **Training**: Auto-trains every 24 hours, requires ≥10 samples

### 3. **Signal Generation**
- **hedge-generator.ts**: Auto-hedge signal logic
- **Tiers**:
  - CRITICAL: predicted_hold < -5%
  - HIGH: -5% ≤ predicted_hold < -2%
  - MEDIUM: -2% ≤ predicted_hold < 0%
  - NONE: predicted_hold ≥ 0%
- **signal-validator.ts**: Validates signals against risk rules

### 4. **Risk Management**
- **trading-circuit-breaker.ts**: Halts trading when:
  - Model uncertainty > 15%
  - API failures > 3 consecutive
  - Daily loss > $10,000
  - Balance delta < -10%
- **risk-limits.ts**: Hard limits:
  - Max bet: $1,000
  - Max daily volume: $10,000
  - Max total exposure: $50,000
  - Max event exposure: $5,000

### 5. **Alert System**
- **slack-notifier.ts**: Slack webhook integration
- **telegram-notifier.ts**: Telegram Bot API
- **alert-manager.ts**: Unified dispatcher with rate limiting (30 alerts/min)

### 6. **MCP Tool: placeHedgeBet**
- **Input**: event_id, market, amount, odds, side, dry_run
- **Output**: bet_id, status, confirmation_timestamp
- **Safety**: Checks circuit breaker, risk limits, validation rules before placement

### 7. **Audit Trail**
- **trading-logger.ts**: Logs all events to Analytics Engine
- **Events**: prediction_made, signal_generated, bet_placed, bet_result, circuit_breaker_triggered

### 8. **Orchestration**
- **auto-trader.ts**: Main trading loop
  - Subscribes to streams
  - Makes predictions
  - Generates signals
  - Executes bets
- **tradingScheduler.ts**: Cron job (every 30s) maintains auto-trader instance

## Usage

### Quick Start

1. **Install dependencies**:
   ```bash
   bun install
   ```

2. **Configure environment** (`.env`):
   ```bash
   TRADING_ENABLED=false           # Start disabled!
   TRADING_DRY_RUN=true            # Dry run mode
   FANTASY402_WS_URL=wss://fantasy402.com/live
   SLACK_WEBHOOK_URL=https://hooks.slack.com/...
   TELEGRAM_BOT_TOKEN=your-token
   TELEGRAM_CHAT_ID=your-chat-id
   ```

3. **Deploy**:
   ```bash
   wrangler deploy
   ```

4. **Test in dry-run mode** (1 week minimum):
   - Monitor dashboard: `/trading/dashboard`
   - Check logs for signal generation
   - Verify circuit breaker triggers correctly

5. **Enable live trading** (when ready):
   ```bash
   wrangler secret put TRADING_ENABLED
   # Enter: true
   ```

### MCP Integration

**List trading tools**:
```bash
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

**Place hedge bet** (manual test):
```bash
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "placeHedgeBet",
      "arguments": {
        "event_id": "test-event-1",
        "market": "moneyline",
        "amount": 100,
        "odds": 2.0,
        "side": "away",
        "dry_run": true
      }
    }
  }'
```

### Manual Circuit Breaker Control

**Check status**:
```bash
curl https://YOUR-WORKER.workers.dev/trading/circuit-breaker/status
```

**Reset** (admin only):
```bash
curl -X POST https://YOUR-WORKER.workers.dev/trading/circuit-breaker/reset \
  -H "Authorization: Bearer YOUR-ADMIN-TOKEN"
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TRADING_ENABLED` | `false` | Master trading switch |
| `TRADING_DRY_RUN` | `true` | Dry run mode (no real bets) |
| `FANTASY402_WS_URL` | `wss://fantasy402.com/live` | WebSocket stream URL |
| `SLACK_WEBHOOK_URL` | - | Slack notifications |
| `TELEGRAM_BOT_TOKEN` | - | Telegram bot API token |
| `TELEGRAM_CHAT_ID` | - | Telegram chat ID |
| `TRADING_MAX_BET_SIZE` | `1000` | Max bet size ($) |
| `TRADING_MAX_DAILY_VOLUME` | `10000` | Max daily volume ($) |
| `CB_MAX_MODEL_UNCERTAINTY` | `0.15` | Circuit breaker uncertainty threshold |
| `CB_MAX_CONSECUTIVE_FAILURES` | `3` | Max API failures before CB trip |
| `MODEL_AUTO_TRAIN` | `true` | Enable auto-training |
| `MODEL_TRAINING_INTERVAL_HOURS` | `24` | Training frequency |

### Risk Limits

Adjust in `src/guards/risk-limits.ts`:

```typescript
export const DEFAULT_RISK_LIMITS: RiskLimits = {
  maxBetSize: 1000,          // $1,000 per bet
  maxDailyVolume: 10000,     // $10,000 daily
  maxTotalExposure: 50000,   // $50,000 total
  maxSingleEventExposure: 5000, // $5,000 per event
  minOdds: 1.01,
  maxOdds: 100,
};
```

## Safety Features

### Circuit Breaker

**Automatic Trip Conditions**:
1. Model uncertainty > 15%
2. 3+ consecutive API failures
3. Daily loss > $10,000
4. Balance delta < -10%
5. Manual admin trigger

**Behavior**:
- Stops all bet placement immediately
- Sends CRITICAL alert to Slack/Telegram
- Requires manual reset
- Logs trip reason + metrics to audit trail

### Signal Validation

**Pre-Execution Checks**:
- ✅ Bet size within limits
- ✅ Daily volume limit not exceeded
- ✅ Model confidence sufficient (≥70% R²)
- ✅ Uncertainty below threshold (≤30%)
- ✅ Market whitelisted
- ✅ Odds valid (1.01 - 100)

### Audit Trail

**All events logged** to Analytics Engine:
- Every prediction made
- Every signal generated
- Every bet placed/rejected
- Every circuit breaker trip
- Every alert sent

**Query audit logs**:
```sql
SELECT * FROM ANALYTICS_ENGINE
WHERE blobs[1] = 'trading_audit'
ORDER BY indexes[1] DESC
LIMIT 100;
```

## Monitoring

### Dashboard

**URL**: `https://YOUR-WORKER.workers.dev/trading/dashboard`

**Features**:
- Real-time SSE stream
- Live predictions chart
- Signal history
- Bet placements
- Circuit breaker status
- Model metrics (R², std error)

### Alerts

**Slack/Telegram notifications** for:
- 🚨 CRITICAL/HIGH signals
- ✅ Bet placements
- 🛑 Circuit breaker trips
- 🤖 Model training complete
- ⚠️ Validation failures

### Logs

**Key log patterns**:
- `[AutoTrader]` - Main trading loop
- `[HoldPredictor]` - Model predictions
- `[HedgeGenerator]` - Signal generation
- `[CircuitBreaker]` - Safety events
- `[TradingAudit]` - Audit trail

## Testing

### Unit Tests

```bash
# Test hold predictor
bun test tests/unit/hold-predictor.test.ts

# Test hedge generator
bun test tests/unit/hedge-generator.test.ts
```

### Integration Tests

```bash
# Test full trading loop
bun test tests/integration/auto-trader.test.ts
```

### Validation Script

```bash
# Pre-deployment validation
bun scripts/validate-trading-system.ts
```

**Checks**:
- ✅ Model trains successfully
- ✅ Signals generate correctly
- ✅ Circuit breaker trips on threshold
- ✅ Risk limits enforce properly
- ✅ MCP tool responds
- ✅ Alerts send successfully

## Deployment Checklist

- [ ] Set `TRADING_ENABLED=false` initially
- [ ] Set `TRADING_DRY_RUN=true`
- [ ] Configure Slack webhook
- [ ] Configure Telegram bot
- [ ] Deploy to Cloudflare Workers
- [ ] Verify WebSocket connection
- [ ] Train initial model (≥10 samples)
- [ ] Test signal generation in dry-run
- [ ] Monitor for 1 week minimum
- [ ] Verify circuit breaker triggers correctly
- [ ] Review audit logs daily
- [ ] Gradually enable live trading

## Troubleshooting

### Model Won't Train
- **Cause**: Insufficient data (< 10 samples)
- **Fix**: Run system for 24+ hours to accumulate data

### Circuit Breaker Keeps Tripping
- **Cause**: High model uncertainty or API failures
- **Fix**: Review training data quality, check API connectivity

### Bets Not Placing
- **Check**: `TRADING_ENABLED=true`?
- **Check**: `TRADING_DRY_RUN=false`?
- **Check**: Circuit breaker status
- **Check**: Risk limits not exceeded
- **Check**: Signal validation passing

### High Uncertainty Scores
- **Cause**: Volatile betting patterns, insufficient training data
- **Fix**: Increase training window, filter noisy data

## Performance

- **Model Training**: ~100ms for 168 samples (7 days)
- **Prediction**: ~10ms per prediction
- **Signal Generation**: ~5ms per signal
- **Bet Placement**: ~200ms (API latency)
- **Memory**: ~50MB per auto-trader instance

## Roadmap

- [ ] Multi-model ensemble (ARIMA + Linear Regression)
- [ ] Feature engineering (rolling averages, volatility)
- [ ] Adaptive risk limits (adjust based on performance)
- [ ] Multi-event hedging strategies
- [ ] Historical backtesting dashboard
- [ ] A/B testing framework for models

---

**For questions/issues**: See [docs/TRADING_SAFETY.md](./TRADING_SAFETY.md)
