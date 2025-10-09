# 🔍 Kimi K2 AI Integration - Deep Dive

## Complete Bindings, Data Pipeline & Integration Architecture

---

## 📊 **Current Cloudflare Workers Bindings**

### D1 Databases (2)
```toml
[[d1_databases]]
binding = "ANALYTICS"                    # Main betting analytics database
database_name = "betting-analytics"
database_id = "1fd6d6d3-7b0f-4488-a651-a234c61705b1"

[[d1_databases]]
binding = "RAW_FEED_DB"                  # Fantasy402 raw feed data
database_name = "fantasy42-raw-feed"
database_id = "1b2e8ea8-a702-4cc7-9665-a8bea78b5dea"
```

### Queues (5)
```toml
LINE_INGRESS         # Line movement ingestion
STEAM_WEBHOOK        # Steam move webhooks
STEAM_QUEUE          # Steam move processing
EXPOSURE_QUEUE       # Exposure calculation
FANTASY402_QUEUE     # Fantasy402 data ingestion
```

### KV Namespaces (10)
```toml
BET_TICKER_RAW       # BetTicker interception storage
FANTASY_CACHE        # Fantasy402 data cache (1-hour TTL)
FANTASY_CONFIG_CACHE # Fantasy402 bootstrap data
TOKEN_STORE          # MCP token storage
USER_STORE           # MCP user credentials
SESSION_STORE        # MCP active sessions
REFRESH_STORE        # MCP refresh tokens
LIVEBETS_STORE       # MCP live betting cache
RATE_LIMITER         # Rate limiting
SPORTS_CACHE         # Sports API cache
```

### Analytics Engine (1)
```toml
ANALYTICS_ENGINE     # Betting metrics dataset
dataset = "betting-metrics"
retention_days = 7
```

### Environment Variables
```toml
EXTENSION_SECRET     # Browser extension secret
FANTASY402_JWT_TOKEN # Fantasy402.com JWT token
JWT_SECRET           # JWT signing secret
```

---

## 🗄️ **Database Schema (ANALYTICS D1)**

### Core Tables (4)

#### 1. `line_movements` (7-day TTL)
```sql
CREATE TABLE line_movements (
  eid  TEXT NOT NULL,           -- Event ID
  mt   TEXT NOT NULL,           -- Market Type (SPREAD, MONEYLINE, TOTAL, PROP)
  lb   REAL,                    -- Line Before
  la   REAL,                    -- Line After
  vb   INTEGER,                 -- Volume Before (cents)
  va   INTEGER,                 -- Volume After (cents)
  ts   TEXT NOT NULL,           -- Timestamp (ISO 8601)
  ing  TEXT DEFAULT (datetime('now'))
) STRICT;

-- Indexes
CREATE INDEX idx_line_movements_eid_mt ON line_movements(eid, mt);
CREATE INDEX idx_line_movements_ts ON line_movements(ts);
```

**AI Use Case:** Steam move detection
- Query recent line movements for an event
- Analyze line change + volume change
- Detect sharp money patterns

#### 2. `sharp_indicators` (hourly refresh)
```sql
CREATE TABLE sharp_indicators (
  cid  TEXT PRIMARY KEY,        -- Customer ID
  clv  REAL NOT NULL,           -- Customer Lifetime Value
  wr   REAL NOT NULL,           -- Win Rate (0-100)
  ao   INTEGER NOT NULL,        -- Action Count (number of bets)
  nb   REAL NOT NULL,           -- Net Bet (profit/loss)
  upd  TEXT DEFAULT (datetime('now'))
) STRICT;

-- Indexes
CREATE INDEX idx_sharp_indicators_clv ON sharp_indicators(clv DESC);
CREATE INDEX idx_sharp_indicators_upd ON sharp_indicators(upd);
```

**AI Use Case:** Sharp customer identification
- Query customer metrics by cid
- Analyze CLV, win rate, action count
- Classify as SHARP, RECREATIONAL, or MONITOR

#### 3. `exposure_tracking` (30s refresh)
```sql
CREATE TABLE exposure_tracking (
  eid  TEXT NOT NULL,           -- Event ID
  side TEXT NOT NULL,           -- Side (HOME/AWAY)
  risk INTEGER NOT NULL,        -- Risk Amount (cents)
  net  INTEGER NOT NULL,        -- Net Exposure (cents)
  ts   TEXT NOT NULL,           -- Timestamp
  upd  TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (eid, side)
) STRICT, WITHOUT ROWID;

-- Indexes
CREATE INDEX idx_exposure_tracking_risk ON exposure_tracking(risk DESC);
CREATE INDEX idx_exposure_tracking_ts ON exposure_tracking(ts);
```

**AI Use Case:** Risk assessment & hedge recommendations
- Query exposure by event ID
- Calculate total risk and net exposure
- Generate hedge strategies

#### 4. `bet_history` (MCP analytics)
```sql
CREATE TABLE bet_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cid TEXT NOT NULL,            -- Customer ID
  stake REAL NOT NULL,          -- Bet amount
  payout REAL NOT NULL,         -- Payout (0 if loss)
  result TEXT,                  -- WIN, LOSS, PUSH, PENDING
  ts TEXT NOT NULL,             -- Timestamp
  market_type TEXT,             -- SPREAD, MONEYLINE, TOTAL, PROP
  event_id TEXT,                -- Event ID
  time_to_event INTEGER,        -- Seconds until event start
  created_at TEXT DEFAULT (datetime('now'))
) STRICT;

-- Indexes
CREATE INDEX idx_bet_history_cid_ts ON bet_history(cid, ts);
CREATE INDEX idx_bet_history_event ON bet_history(event_id, ts);
```

**AI Use Case:** Historical analysis
- Query customer betting patterns
- Analyze timing and market preferences
- Calculate win rates and CLV

---

## 🔄 **Data Pipeline Flow**

### 1. Fantasy402.com → Browser Extension → Worker
```
Fantasy402.com (billy666/backdoor69)
    ↓ (intercept API calls)
Browser Extension (Chrome)
    ↓ (POST /api/ingest)
Cloudflare Worker
    ↓ (write to queue)
FANTASY402_QUEUE
    ↓ (batch process)
RAW_FEED_DB (D1)
```

### 2. Line Movement Processing
```
Line Movement Event
    ↓
LINE_INGRESS Queue
    ↓
handleLineIngress()
    ↓
ANALYTICS.line_movements (INSERT)
    ↓
Check for Steam Move
    ↓ (if detected)
STEAM_QUEUE
    ↓
handleSteamWebhook()
    ↓
🆕 AI Steam Analysis (NEW!)
```

### 3. Sharp Customer Calculation (Hourly Cron)
```
Cron: "0 * * * *"
    ↓
handleSharpCalculation()
    ↓
Query bet_history
    ↓
Calculate CLV, Win Rate, Action Count
    ↓
ANALYTICS.sharp_indicators (UPSERT)
    ↓
🆕 AI Sharp Analysis (NEW!)
```

### 4. Exposure Calculation (Every Minute)
```
Cron: "* * * * *"
    ↓
handleExposureCalculation()
    ↓
Query current bets
    ↓
Calculate risk & net exposure
    ↓
ANALYTICS.exposure_tracking (UPSERT)
    ↓
🆕 AI Risk Report (NEW!)
```

---

## 🤖 **AI Integration Points**

### Integration Point 1: Sharp Customer Analysis
**Trigger:** Hourly cron OR on-demand via MCP tool

**Data Flow:**
```typescript
// 1. Query customer data from D1
const customer = await env.ANALYTICS.prepare(`
  SELECT cid, clv, wr, ao, nb, upd
  FROM sharp_indicators
  WHERE cid = ?
`).bind(customerId).first();

// 2. Pass to AI analyzer
const analyzer = new BettingAnalyzer({
  apiKey: env.KIMI_API_KEY,  // 🆕 NEW BINDING NEEDED
});

const result = await analyzer.analyzeSharpBehavior({
  cid: customer.cid,
  clv: customer.clv,
  wr: customer.wr,
  ao: customer.ao,
  nb: customer.nb,
});

// 3. Store AI insights (optional)
await env.ANALYTICS.prepare(`
  INSERT INTO ai_sharp_analysis (cid, sharp_score, confidence, recommendation, insights, ts)
  VALUES (?, ?, ?, ?, ?, datetime('now'))
`).bind(
  result.customerId,
  result.sharpScore,
  result.confidence,
  result.recommendation,
  JSON.stringify(result.insights)
).run();
```

### Integration Point 2: Steam Move Detection
**Trigger:** Line movement event OR on-demand via MCP tool

**Data Flow:**
```typescript
// 1. Query line movement from D1
const lineMovement = await env.ANALYTICS.prepare(`
  SELECT eid, mt, lb, la, vb, va, ts
  FROM line_movements
  WHERE eid = ? AND mt = ?
  ORDER BY ts DESC
  LIMIT 1
`).bind(eventId, marketType).first();

// 2. Pass to AI analyzer
const result = await analyzer.analyzeSteamMove({
  eid: lineMovement.eid,
  mt: lineMovement.mt,
  lb: lineMovement.lb,
  la: lineMovement.la,
  vb: lineMovement.vb,
  va: lineMovement.va,
  ts: lineMovement.ts,
});

// 3. If steam detected, trigger alert
if (result.isSteamMove && result.severity === 'HIGH') {
  await env.STEAM_WEBHOOK.send({
    eventId: result.eventId,
    severity: result.severity,
    confidence: result.confidence,
    insights: result.insights,
  });
}
```

### Integration Point 3: Risk Report Generation
**Trigger:** On-demand via MCP tool OR scheduled

**Data Flow:**
```typescript
// 1. Query exposure data from D1
const exposureData = await env.ANALYTICS.prepare(`
  SELECT eid, side, risk, net, ts
  FROM exposure_tracking
  WHERE eid = ?
`).bind(eventId).all();

// 2. Pass to AI analyzer
const result = await analyzer.generateRiskReport(
  exposureData.results.map(row => ({
    eid: row.eid,
    side: row.side,
    risk: row.risk,
    net: row.net,
    ts: row.ts,
  }))
);

// 3. Return recommendations
return {
  riskLevel: result.riskLevel,
  recommendations: result.recommendations,
  hedgeStrategy: result.hedgeStrategy,
  totalCost: calculateCost(result.usage.inputTokens, result.usage.outputTokens),
};
```

### Integration Point 4: Interactive Chat
**Trigger:** POST /api/ai/chat

**Data Flow:**
```typescript
// 1. Receive chat message
const { messages } = await request.json();

// 2. Optionally enrich with context from D1
const context = await env.ANALYTICS.prepare(`
  SELECT COUNT(*) as total_customers,
         AVG(clv) as avg_clv,
         AVG(wr) as avg_win_rate
  FROM sharp_indicators
`).first();

// 3. Add context to system message
const enrichedMessages = [
  {
    role: 'system',
    content: `Current platform stats: ${context.total_customers} customers, avg CLV ${context.avg_clv}, avg win rate ${context.avg_win_rate}%`,
  },
  ...messages,
];

// 4. Pass to AI analyzer
const result = await analyzer.chatAboutBettingData(enrichedMessages);

// 5. Return response with cost tracking
return new Response(JSON.stringify({
  response: result.response,
  usage: result.usage,
  cost: result.cost,
}), {
  headers: { 'Content-Type': 'application/json' },
});
```

---

## 🔧 **Required Changes to wrangler.toml**

### Add KIMI_API_KEY Binding

```toml
# Add to [vars] section
[vars]
EXTENSION_SECRET = "default-dev-secret-change-me"
FANTASY402_JWT_TOKEN = "dev-token-change-me"
JWT_SECRET = "dev-jwt-secret-local-development-key"
KIMI_API_KEY = "sk-..."  # 🆕 ADD THIS (dev only)

# For production, use secrets instead:
# wrangler secret put KIMI_API_KEY --env production
```

### Update Env Interface

```typescript
// src/types/api.ts
export interface Env {
  // ... existing bindings ...
  
  // 🆕 NEW: AI Integration
  KIMI_API_KEY: string;  // Kimi K2 API key
}
```

---

## 📋 **New Database Tables (Optional)**

### AI Analysis Cache
```sql
-- Cache AI analysis results to reduce costs
CREATE TABLE IF NOT EXISTS ai_analysis_cache (
  cache_key TEXT PRIMARY KEY,   -- Hash of input data
  analysis_type TEXT NOT NULL,  -- 'sharp', 'steam', 'risk', 'chat'
  result TEXT NOT NULL,         -- JSON result
  cost REAL NOT NULL,           -- USD cost
  tokens_used INTEGER NOT NULL, -- Total tokens
  created_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL      -- TTL
) STRICT, WITHOUT ROWID;

CREATE INDEX idx_ai_cache_expires ON ai_analysis_cache(expires_at);
CREATE INDEX idx_ai_cache_type ON ai_analysis_cache(analysis_type);
```

### AI Usage Tracking
```sql
-- Track AI usage and costs
CREATE TABLE IF NOT EXISTS ai_usage_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  analysis_type TEXT NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  cost REAL NOT NULL,
  user_id TEXT,
  event_id TEXT,
  customer_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
) STRICT;

CREATE INDEX idx_ai_usage_created ON ai_usage_log(created_at);
CREATE INDEX idx_ai_usage_type ON ai_usage_log(analysis_type);
```

---

## 🚀 **Implementation Checklist**

### Phase 1: Setup ✅
- [x] Install AI SDK packages
- [x] Configure environment variables
- [x] Create AI module directory
- [x] Create type definitions
- [x] Create provider configuration
- [x] Create BettingAnalyzer class
- [x] Create test suite
- [x] All tests passing

### Phase 2: Bindings & Types (CURRENT)
- [ ] Add KIMI_API_KEY to wrangler.toml
- [ ] Update Env interface in src/types/api.ts
- [ ] Create AIEnv interface extending Env
- [ ] Add AI analysis cache table (optional)
- [ ] Add AI usage tracking table (optional)
- [ ] Test D1 database access from AI module

### Phase 3: API Endpoints
- [ ] Create src/api/ai-chat.ts
- [ ] Add POST /api/ai/chat endpoint
- [ ] Add authentication/authorization
- [ ] Add rate limiting
- [ ] Add cost tracking
- [ ] Test endpoint with curl/Postman

### Phase 4: MCP Tools Integration
- [ ] Create src/mcp/handlers/ai-sharp-analysis.ts
- [ ] Create src/mcp/handlers/ai-steam-detection.ts
- [ ] Create src/mcp/handlers/ai-risk-report.ts
- [ ] Register tools in src/mcp/toolRegistry.ts
- [ ] Test MCP tools via JSON-RPC

### Phase 5: Worker Integration
- [ ] Update src/index.ts routing
- [ ] Add AI chat route
- [ ] Add error handling
- [ ] Add logging
- [ ] Test full integration

### Phase 6: Deployment
- [ ] Add KIMI_API_KEY to Cloudflare Secrets
- [ ] Deploy to staging
- [ ] Run integration tests
- [ ] Deploy to production
- [ ] Monitor costs and performance

---

## 💰 **Cost Estimation**

### Per-Analysis Costs
- Sharp Customer Analysis: ~$0.003 (0.3¢)
- Steam Move Detection: ~$0.003 (0.3¢)
- Risk Report Generation: ~$0.004 (0.4¢)
- Chat Message: ~$0.002-0.005 (0.2-0.5¢)

### Monthly Estimates (1000 customers, 100 events/day)
- Hourly sharp analysis (24/day × 1000 customers): ~$72/month
- Steam detection (100 events/day): ~$9/month
- Risk reports (50/day): ~$6/month
- Chat (100 messages/day): ~$12/month

**Total: ~$99/month** (with caching: ~$50/month)

---

## 🔒 **Security Considerations**

### API Key Management
- ✅ Store in Cloudflare Secrets (production)
- ✅ Never commit to git
- ✅ Rotate periodically
- ✅ Monitor usage for anomalies

### Rate Limiting
- Implement per-user rate limits
- Implement per-endpoint rate limits
- Track costs per user/tenant
- Hard cap at $X/day

### Data Privacy
- Don't send PII to AI (use customer IDs, not names)
- Log AI requests for audit
- Implement data retention policies
- GDPR compliance for EU customers

---

## 📊 **Monitoring & Observability**

### Metrics to Track
- AI requests per minute
- AI cost per hour/day/month
- AI response time (p50, p95, p99)
- AI error rate
- Cache hit rate
- Token usage (input/output)

### Alerts
- Cost exceeds $X/day
- Error rate > 5%
- Response time > 10s
- API key quota exceeded

### Dashboards
- Real-time AI usage
- Cost breakdown by analysis type
- Top customers by AI usage
- AI insights quality metrics

---

## 🎯 **Next Immediate Steps**

1. **Update wrangler.toml** - Add KIMI_API_KEY binding
2. **Update Env interface** - Add KIMI_API_KEY type
3. **Create AIEnv interface** - Extend Env with AI-specific bindings
4. **Test D1 access** - Verify AI can query database
5. **Create integration test** - Test full data pipeline

**Ready to proceed?** Let me know and I'll implement these changes!

