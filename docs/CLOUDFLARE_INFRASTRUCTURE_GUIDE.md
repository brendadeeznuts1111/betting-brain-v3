# 🌐 Cloudflare Infrastructure Guide

**Date:** 2025-10-08  
**Status:** ✅ PRODUCTION READY  
**Scope:** Complete Cloudflare Edge Infrastructure  
**Version:** v1.0-cache-optimization  

## 📊 **Infrastructure Overview**

### 🏗️ **Core Architecture**
- **Edge Runtime**: Cloudflare Workers (V8 isolates)
- **Database**: D1 (SQLite at the edge)
- **Storage**: KV (Key-Value at the edge)
- **Analytics**: Analytics Engine (time-series)
- **Queues**: Cloudflare Queues (event-driven)
- **Caching**: Edge caching with KV
- **Security**: Rate limiting, CORS, input validation

### 🎯 **Infrastructure Components**

| Component | Type | Binding | Purpose | Status |
|-----------|------|---------|---------|--------|
| **Worker** | Edge Function | `main` | Request handling | ✅ Active |
| **D1 Analytics** | Database | `ANALYTICS` | Betting analytics | ✅ Active |
| **D1 Raw Feed** | Database | `RAW_FEED_DB` | Fantasy402 data | ✅ Active |
| **KV BetTicker** | Storage | `BET_TICKER_RAW` | API responses | ✅ Active |
| **KV Tokens** | Storage | `TOKEN_STORE` | JWT management | ✅ Active |
| **KV Users** | Storage | `USER_STORE` | User sessions | ✅ Active |
| **KV Sessions** | Storage | `SESSION_STORE` | Active sessions | ✅ Active |
| **KV Refresh** | Storage | `REFRESH_STORE` | Token refresh | ✅ Active |
| **KV LiveBets** | Storage | `LIVEBETS_STORE` | Live betting | ✅ Active |
| **KV Fantasy** | Storage | `FANTASY_CACHE` | Fantasy402 cache | ✅ Active |
| **KV Config** | Storage | `FANTASY_CONFIG_CACHE` | Config cache | ✅ Active |
| **KV Rate Limit** | Storage | `RATE_LIMITER` | Rate limiting | ✅ Active |
| **KV Sports** | Storage | `SPORTS_CACHE` | Sports data | ✅ Active |
| **Analytics Engine** | Metrics | `ANALYTICS_ENGINE` | Time-series | ✅ Active |
| **Queue Line** | Queue | `LINE_INGRESS` | Line movements | ✅ Active |
| **Queue Steam** | Queue | `STEAM_WEBHOOK` | Steam moves | ✅ Active |
| **Queue Processor** | Queue | `STEAM_QUEUE` | Steam processing | ✅ Active |
| **Queue Exposure** | Queue | `EXPOSURE_QUEUE` | Exposure calc | ✅ Active |
| **Queue Fantasy** | Queue | `FANTASY402_QUEUE` | Fantasy402 logs | ✅ Active |

## 🗄️ **Database Infrastructure**

### **D1 Databases**

#### **Analytics Database** (`ANALYTICS`)
```sql
-- Core betting analytics tables
CREATE TABLE line_movements (
  eid TEXT NOT NULL,           -- Event ID
  mt TEXT NOT NULL,           -- Market Type
  lb REAL,                    -- Line Before
  la REAL,                    -- Line After
  vb INTEGER,                 -- Volume Before
  va INTEGER,                 -- Volume After
  ts TEXT NOT NULL,           -- Timestamp
  ing TEXT DEFAULT (datetime('now'))
);

CREATE TABLE sharp_indicators (
  cid TEXT PRIMARY KEY,        -- Customer ID
  clv REAL NOT NULL,          -- Customer Lifetime Value
  wr REAL NOT NULL,           -- Win Rate
  ao INTEGER NOT NULL,        -- Action Count
  nb REAL NOT NULL,          -- Net Bet
  upd TEXT DEFAULT (datetime('now'))
);

CREATE TABLE exposure_tracking (
  eid TEXT NOT NULL,          -- Event ID
  side TEXT NOT NULL,         -- Side (HOME/AWAY)
  risk INTEGER NOT NULL,       -- Risk Amount (cents)
  net INTEGER NOT NULL,       -- Net Exposure (cents)
  ts TEXT NOT NULL,           -- Timestamp
  upd TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (eid, side)
);
```

#### **Raw Feed Database** (`RAW_FEED_DB`)
```sql
-- Fantasy402 data ingestion
CREATE TABLE fantasy402_raw_feed (
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
  jwt_user_id TEXT,
  jwt_office TEXT,
  jwt_expires_at TEXT,
  jwt_valid BOOLEAN,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### **Database Bindings**
```toml
# Development
[[d1_databases]]
binding = "ANALYTICS"
database_name = "betting-analytics"
database_id = "1fd6d6d3-7b0f-4488-a651-a234c61705b1"
migrations_dir = "migrations"

[[d1_databases]]
binding = "RAW_FEED_DB"
database_name = "fantasy42-raw-feed"
database_id = "1b2e8ea8-a702-4cc7-9665-a8bea78b5dea"

# Production
[[env.production.d1_databases]]
binding = "ANALYTICS"
database_name = "betting-analytics"
database_id = "1fd6d6d3-7b0f-4488-a651-a234c61705b1"
migrations_dir = "migrations"

[[env.production.d1_databases]]
binding = "RAW_FEED_DB"
database_name = "fantasy42-raw-feed"
database_id = "1b2e8ea8-a702-4cc7-9665-a8bea78b5dea"
```

## 🗂️ **KV Storage Infrastructure**

### **KV Namespace Mappings**

| Binding | Purpose | Retention | ID (Dev) | ID (Prod) |
|---------|---------|-----------|----------|-----------|
| `BET_TICKER_RAW` | API responses | 7 days | `0d4410da8b824c70834a0f105654029e` | `8b9618cb00c647f18ad83458e0061018` |
| `TOKEN_STORE` | JWT tokens | 24 hours | `47da877d6aab4edc91ee6f052a056769` | `47da877d6aab4edc91ee6f052a056769` |
| `USER_STORE` | User sessions | 7 days | `74003502667e42ae9271ec9a1591a2b0` | `74003502667e42ae9271ec9a1591a2b0` |
| `SESSION_STORE` | Active sessions | 24 hours | `c00d737fbf124185868c638af8ff3507` | `c00d737fbf124185868c638af8ff3507` |
| `REFRESH_STORE` | Refresh tokens | 30 days | `0e4571a38a9d4c4781a982d05fd1291b` | `0e4571a38a9d4c4781a982d05fd1291b` |
| `LIVEBETS_STORE` | Live betting | 1 hour | `321ecd09a5764e1cb04a3e87c37d590c` | `321ecd09a5764e1cb04a3e87c37d590c` |
| `FANTASY_CACHE` | Fantasy402 cache | 30 minutes | `e8ea80789b5246e58ea95798f04d0047` | `e8ea80789b5246e58ea95798f04d0047` |
| `FANTASY_CONFIG_CACHE` | Config cache | 24 hours | `2e7c333ad95e4933b65a0686e7d5bf6b` | `2e7c333ad95e4933b65a0686e7d5bf6b` |
| `RATE_LIMITER` | Rate limiting | 1 hour | `40765b38805b4cae8fa3e90de40776d3` | `126aa83f7b6342d6bd68bde184f431dc` |
| `SPORTS_CACHE` | Sports data | 30 seconds | `4b0ce52be11041299d35f4c741666afa` | `eb56dd8a866041219232c98c88b59e52` |

### **KV Configuration**
```toml
# Development KV Namespaces
[[kv_namespaces]]
binding = "BET_TICKER_RAW"
id = "8b9618cb00c647f18ad83458e0061018"
preview_id = "0d4410da8b824c70834a0f105654029e"

[[kv_namespaces]]
binding = "TOKEN_STORE"
id = "47da877d6aab4edc91ee6f052a056769"

[[kv_namespaces]]
binding = "USER_STORE"
id = "74003502667e42ae9271ec9a1591a2b0"

[[kv_namespaces]]
binding = "SESSION_STORE"
id = "c00d737fbf124185868c638af8ff3507"

[[kv_namespaces]]
binding = "REFRESH_STORE"
id = "0e4571a38a9d4c4781a982d05fd1291b"

[[kv_namespaces]]
binding = "LIVEBETS_STORE"
id = "321ecd09a5764e1cb04a3e87c37d590c"

[[kv_namespaces]]
binding = "FANTASY_CACHE"
id = "e8ea80789b5246e58ea95798f04d0047"

[[kv_namespaces]]
binding = "FANTASY_CONFIG_CACHE"
id = "2e7c333ad95e4933b65a0686e7d5bf6b"

[[kv_namespaces]]
binding = "RATE_LIMITER"
id = "40765b38805b4cae8fa3e90de40776d3"

[[kv_namespaces]]
binding = "SPORTS_CACHE"
id = "4b0ce52be11041299d35f4c741666afa"
```

## 🔄 **Queue Infrastructure**

### **Queue Configuration**

| Queue | Purpose | Batch Size | Timeout | Retries | Binding |
|-------|---------|------------|---------|---------|---------|
| `line-ingress` | Line movements | 10 | 5s | 0 | `LINE_INGRESS` |
| `steam-webhook` | Steam moves | 5 | 10s | 0 | `STEAM_WEBHOOK` |
| `steam-processor` | Steam processing | 10 | 2s | 2 | `STEAM_QUEUE` |
| `exposure-calculator` | Exposure calc | 50 | 10s | 3 | `EXPOSURE_QUEUE` |
| `fantasy402-logs` | Fantasy402 data | 100 | 5s | 5 | `FANTASY402_QUEUE` |

### **Queue Configuration**
```toml
# Development Queues
[[queues.producers]]
binding = "LINE_INGRESS"
queue = "line-ingress"

[[queues.consumers]]
queue = "line-ingress"
max_batch_size = 10
max_batch_timeout = 5

[[queues.producers]]
binding = "STEAM_WEBHOOK"
queue = "steam-webhook"

[[queues.consumers]]
queue = "steam-webhook"
max_batch_size = 5
max_batch_timeout = 10

[[queues.producers]]
binding = "STEAM_QUEUE"
queue = "steam-processor"

[[queues.consumers]]
queue = "steam-processor"
max_batch_size = 10
max_batch_timeout = 2
max_retries = 2

[[queues.producers]]
binding = "EXPOSURE_QUEUE"
queue = "exposure-calculator"

[[queues.consumers]]
queue = "exposure-calculator"
max_batch_size = 50
max_batch_timeout = 10
max_retries = 3

[[queues.producers]]
binding = "FANTASY402_QUEUE"
queue = "fantasy402-logs"

[[queues.consumers]]
queue = "fantasy402-logs"
max_batch_size = 100
max_batch_timeout = 5
max_retries = 5
```

## 📊 **Analytics Engine**

### **Analytics Engine Configuration**
```toml
# Development
[[analytics_engine_datasets]]
binding = "ANALYTICS_ENGINE"
dataset = "betting-metrics"

# Production
[[env.production.analytics_engine_datasets]]
binding = "ANALYTICS_ENGINE"
dataset = "betting-metrics-prod"
```

### **Analytics Data Points**
```typescript
// Example analytics data point
await env.ANALYTICS_ENGINE.writeDataPoint({
  blobs: [
    'line_movement',           // Event type
    'NBA_123',                // Event ID
    'SPREAD',                 // Market type
    'Pinnacle'                // Bookmaker
  ],
  doubles: [
    3.5,                      // Old line
    4.0,                      // New line
    1000,                     // Volume
    0.95                      // Confidence
  ],
  indexes: [
    `line_${Date.now()}`,     // Unique index
    'nba',                    // Sport
    'spread'                  // Market
  ]
});
```

## ⏰ **Cron Jobs**

### **Scheduled Tasks**
```toml
[triggers]
crons = [
  "0 * * * *",      # Hourly sharp calculation
  "* * * * *",      # Every minute exposure calculation
  "*/1 * * * *",    # Every minute MCP cache warming
  "0 3 * * *"       # Daily at 3 AM UTC MCP cleanup
]
```

### **Cron Job Handlers**
- **Sharp Calculation** (`0 * * * *`): Calculates customer sharp indicators
- **Exposure Calculation** (`* * * * *`): Updates real-time exposure tracking
- **Cache Warming** (`*/1 * * * *`): Warms MCP caches for performance
- **Data Cleanup** (`0 3 * * *`): Cleans old data from KV and D1

## 🔒 **Security Infrastructure**

### **Rate Limiting**
- **Per IP**: 10 requests/second
- **Per Endpoint**: Varies by endpoint
- **KV Storage**: `RATE_LIMITER` namespace
- **Implementation**: In-memory + KV fallback

### **CORS Configuration**
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400'
};
```

### **Input Validation**
- **Zod Schemas**: All inputs validated
- **Type Safety**: TypeScript throughout
- **SQL Injection**: Parameterized queries only
- **XSS Prevention**: Output sanitization

## 🚀 **Deployment Infrastructure**

### **Environment Configuration**

#### **Development Environment**
```bash
# Deploy to development
wrangler deploy

# Apply migrations
wrangler d1 migrations apply betting-analytics --local
wrangler d1 migrations apply fantasy42-raw-feed --local

# Create KV namespaces
wrangler kv:namespace create "BET_TICKER_RAW" --preview
wrangler kv:namespace create "TOKEN_STORE"
wrangler kv:namespace create "USER_STORE"
# ... (all other namespaces)
```

#### **Production Environment**
```bash
# Deploy to production
wrangler deploy --env production

# Apply migrations
wrangler d1 migrations apply betting-analytics --remote
wrangler d1 migrations apply fantasy42-raw-feed --remote

# Set secrets
wrangler secret put JWT_SECRET --env production
wrangler secret put PINNACLE_API_KEY --env production
wrangler secret put BET365_API_KEY --env production
```

### **Environment Variables**
```toml
# Development
[vars]
EXTENSION_SECRET = "default-dev-secret-change-me"

# Production (secrets)
# JWT_SECRET - JWT signing secret
# PINNACLE_API_KEY - Pinnacle API key
# BET365_API_KEY - Bet365 API key
# SPORTSDATA_API_KEY - SportsData.io API key
```

## 📈 **Performance Infrastructure**

### **CPU Limits**
```toml
[limits]
cpu_ms = 50  # 50ms CPU time limit per request
```

### **Caching Strategy**
- **KV Cache**: 30-second TTL for sports data
- **D1 Cache**: Query result caching
- **Edge Cache**: Cloudflare edge caching
- **Warm Cache**: Proactive cache warming

### **Cost Optimization**
- **D1 Queries**: Parameterized, indexed
- **KV Usage**: TTL-based cleanup
- **Queue Batching**: Optimal batch sizes
- **Analytics**: Sampled data points

## 🔧 **Infrastructure Management**

### **Health Monitoring**
```bash
# Check worker health
curl https://betting-brain-v3.nolarose1968-806.workers.dev/health

# Check floor status
curl https://betting-brain-v3.nolarose1968-806.workers.dev/floor/status

# Check MCP tools
curl -X POST https://betting-brain-v3.nolarose1968-806.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

### **Database Management**
```bash
# List migrations
wrangler d1 migrations list betting-analytics

# Apply migrations
wrangler d1 migrations apply betting-analytics --remote

# Query database
wrangler d1 execute betting-analytics --command "SELECT COUNT(*) FROM line_movements"
```

### **KV Management**
```bash
# List KV namespaces
wrangler kv:namespace list

# Get KV value
wrangler kv:key get "key" --binding BET_TICKER_RAW

# Put KV value
wrangler kv:key put "key" "value" --binding BET_TICKER_RAW
```

### **Queue Management**
```bash
# List queues
wrangler queues list

# Send message to queue
wrangler queues send "line-ingress" "message"

# Consume queue
wrangler queues consumer list
```

## 📊 **Monitoring & Observability**

### **Metrics Collection**
- **Analytics Engine**: Time-series metrics
- **D1 Queries**: Performance tracking
- **KV Operations**: Cache hit rates
- **Queue Processing**: Message throughput
- **Worker Performance**: CPU usage, response times

### **Logging**
- **Structured Logging**: JSON format
- **Request ID**: Unique per request
- **Error Tracking**: Comprehensive error logging
- **Performance**: Response time tracking

### **Alerting**
- **Health Checks**: Automated monitoring
- **Cost Alerts**: Resource usage alerts
- **Error Rates**: Failure rate monitoring
- **Performance**: Response time alerts

## 🛠️ **Development Tools**

### **Local Development**
```bash
# Start local development
wrangler dev --local

# Run migrations locally
wrangler d1 migrations apply betting-analytics --local

# Test KV locally
wrangler kv:key get "test" --binding BET_TICKER_RAW --local
```

### **Testing Infrastructure**
```bash
# Run tests
bun test

# Run with coverage
bun run test:coverage

# Run AI-friendly tests
bun run test:ai
```

### **Debugging**
```bash
# View logs
wrangler tail

# View specific logs
wrangler tail --format pretty

# View production logs
wrangler tail --env production
```

## 📚 **Documentation References**

### **Cloudflare Documentation**
- [Workers Documentation](https://developers.cloudflare.com/workers/)
- [D1 Documentation](https://developers.cloudflare.com/d1/)
- [KV Documentation](https://developers.cloudflare.com/kv/)
- [Queues Documentation](https://developers.cloudflare.com/queues/)
- [Analytics Engine Documentation](https://developers.cloudflare.com/analytics/)

### **Project Documentation**
- [Floor Control Dashboard](dashboards/floor-control.html)
- [API Reference](docs/REST_API_REFERENCE.md)
- [MCP Integration](docs/MCP_INTEGRATION_STATUS.md)
- [Testing Guide](docs/testing/INTEGRATED_TESTING_SYSTEM.md)

## 🎯 **Best Practices**

### **Infrastructure Best Practices**
1. **Use Environment Variables**: Never hardcode secrets
2. **Parameterized Queries**: Prevent SQL injection
3. **Rate Limiting**: Protect against abuse
4. **Caching**: Optimize performance
5. **Monitoring**: Track all metrics
6. **Error Handling**: Graceful degradation
7. **Security**: Input validation, CORS, authentication
8. **Performance**: Optimize queries, use indexes
9. **Cost Management**: Monitor usage, set limits
10. **Documentation**: Keep infrastructure docs updated

### **Deployment Best Practices**
1. **Test Locally**: Use `wrangler dev --local`
2. **Apply Migrations**: Before deployment
3. **Set Secrets**: Use `wrangler secret put`
4. **Monitor Deployment**: Check logs and metrics
5. **Rollback Plan**: Keep previous versions
6. **Health Checks**: Verify deployment success
7. **Performance Testing**: Load test after deployment
8. **Documentation**: Update deployment docs

---

**Status:** Production Ready ✅  
**Last Updated:** 2025-10-08  
**Maintainer:** Betting-Brain Team  
**Infrastructure:** Cloudflare Edge (100% Edge-Native)
