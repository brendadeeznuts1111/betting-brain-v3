# Cloudflare Service Integration Reference

**Version:** 1.0-cache-optimization
**Last Updated:** 2025-10-08
**Total Integrations:** 50 (46 bindings + 4 cron triggers)

---

## Integration Summary

| Category | Development | Production | Total |
|----------|-------------|------------|-------|
| **D1 Databases** | 2 | 2 | 4 |
| **KV Namespaces** | 10 | 10 | 20 |
| **Queue Producers** | 5 | 5 | 10 |
| **Queue Consumers** | 5 | 5 | 10 |
| **Analytics Datasets** | 1 | 1 | 2 |
| **Subtotal (Bindings)** | **23** | **23** | **46** |
| **Cron Triggers** | - | - | **4** |
| **GRAND TOTAL** | - | - | **50** |

---

## D1 Databases (4 total)

### Development (2)
1. **ANALYTICS** (binding)
   - Database Name: `betting-analytics`
   - Database ID: `1fd6d6d3-7b0f-4488-a651-a234c61705b1`
   - Migrations: `migrations/` directory
   - Tables: 15 (line_movements, sharp_indicators, exposure_tracking, etc.)
   - Indexes: 99 across all tables

2. **RAW_FEED_DB** (binding)
   - Database Name: `fantasy42-raw-feed`
   - Database ID: `1b2e8ea8-a702-4cc7-9665-a8bea78b5dea`
   - Purpose: Fantasy402 raw data ingestion
   - Retention: Per-table TTL policies

### Production (2)
Same bindings as development with identical IDs.

**Configuration:**
```toml
# wrangler.toml lines 11-22 (dev)
# wrangler.toml lines 26-35 (prod)
[[d1_databases]]
binding = "ANALYTICS"
database_name = "betting-analytics"
database_id = "1fd6d6d3-7b0f-4488-a651-a234c61705b1"
migrations_dir = "migrations"

[[d1_databases]]
binding = "RAW_FEED_DB"
database_name = "fantasy42-raw-feed"
database_id = "1b2e8ea8-a702-4cc7-9665-a8bea78b5dea"
```

**TypeScript Usage:**
```typescript
// From src/types/api.ts
export interface Env {
  ANALYTICS: D1Database;
  RAW_FEED_DB: D1Database;
}

// Query example
const result = await env.ANALYTICS.prepare(
  'SELECT * FROM agent_graph WHERE agent_owner = ?'
).bind(agentOwner).all();
```

---

## KV Namespaces (20 total)

### Development (10)
1. **FANTASY_CACHE** (primary)
   - ID: `e8ea80789b5246e58ea95798f04d0047`
   - Purpose: Agent hierarchy caching (v1.0 optimization)
   - TTL: 1 hour (3600s) initially, 24h after stable
   - Keys: Multi-key pattern (by-owner, by-agent, latest)

2. **FANTASY_CONFIG_CACHE**
   - ID: `2e7c333ad95e4933b65a0686e7d5bf6b`
   - Purpose: Bootstrap config data caching

3. **BET_TICKER_RAW**
   - ID: `8b9618cb00c647f18ad83458e0061018`
   - Preview ID: `0d4410da8b824c70834a0f105654029e`
   - Purpose: Intercepted BetTicker API responses
   - Retention: 7 days

4. **TOKEN_STORE**
   - ID: `47da877d6aab4edc91ee6f052a056769`
   - Purpose: MCP authentication tokens

5. **USER_STORE**
   - ID: `74003502667e42ae9271ec9a1591a2b0`
   - Purpose: User data storage

6. **SESSION_STORE**
   - ID: `c00d737fbf124185868c638af8ff3507`
   - Purpose: Session management

7. **REFRESH_STORE**
   - ID: `0e4571a38a9d4c4781a982d05fd1291b`
   - Purpose: Refresh token storage

8. **LIVEBETS_STORE**
   - ID: `321ecd09a5764e1cb04a3e87c37d590c`
   - Purpose: Live betting data

9. **RATE_LIMITER**
   - ID: `40765b38805b4cae8fa3e90de40776d3`
   - Purpose: Rate limiting counters (10 req/s per IP)

10. **SPORTS_CACHE**
    - ID: `4b0ce52be11041299d35f4c741666afa`
    - Purpose: Sports API response caching

### Production (10)
Same 10 namespaces with identical IDs (no preview_id).

**Configuration:**
```toml
# wrangler.toml lines 194-237 (dev)
# wrangler.toml lines 90-129 (prod)
[[kv_namespaces]]
binding = "FANTASY_CACHE"
id = "e8ea80789b5246e58ea95798f04d0047"
```

**TypeScript Usage:**
```typescript
// From src/types/api.ts
export interface Env {
  FANTASY_CACHE: KVNamespace;
  BET_TICKER_RAW?: KVNamespace;
  TOKEN_STORE?: KVNamespace;
  // ... (10 total)
}

// Write example (v1.0 multi-key pattern)
const cacheKeys = [
  `fantasy402:agents:by-owner:${agentOwner}`,
  `fantasy402:agents:by-agent:${agentID}`,
  `fantasy402:agents:latest:${agentOwner}`
].filter(Boolean);

await Promise.all(
  cacheKeys.map(key =>
    env.FANTASY_CACHE.put(key, JSON.stringify(data), {
      expirationTtl: 3600 // 1 hour
    })
  )
);

// Read example
const cached = await env.FANTASY_CACHE.get(
  `fantasy402:agents:by-owner:${agentOwner}`,
  'json'
);
```

---

## Queues (20 total)

### Development Producers (5)
1. **LINE_INGRESS**
   - Queue: `line-ingress`
   - Purpose: Line movement ingestion

2. **STEAM_WEBHOOK**
   - Queue: `steam-webhook`
   - Purpose: Steam move notifications

3. **STEAM_QUEUE**
   - Queue: `steam-processor`
   - Purpose: MCP steam event processing

4. **EXPOSURE_QUEUE**
   - Queue: `exposure-calculator`
   - Purpose: MCP exposure calculation

5. **FANTASY402_QUEUE**
   - Queue: `fantasy402-logs`
   - Purpose: Fantasy402 data ingestion (v1.0)

### Development Consumers (5)
Same 5 queues with batch configuration:

1. **line-ingress**
   - Batch size: 10 messages
   - Batch timeout: 5s
   - Handler: `src/queues/lineIngress.ts`

2. **steam-webhook**
   - Batch size: 5 messages
   - Batch timeout: 10s
   - Handler: `src/queues/steamWebhook.ts`

3. **steam-processor**
   - Batch size: 10 messages
   - Batch timeout: 2s
   - Max retries: 2
   - Handler: `src/queues/steamProcessor.ts`

4. **exposure-calculator**
   - Batch size: 50 messages
   - Batch timeout: 10s
   - Max retries: 3
   - Handler: `src/queues/exposureCalculator.ts`

5. **fantasy402-logs**
   - Batch size: 100 messages (highest)
   - Batch timeout: 5s
   - Max retries: 5
   - Handler: `src/queues/fantasy402-logger.ts`

### Production (10)
Same 5 producers + 5 consumers with `-prod` suffix:
- `line-ingress-prod`
- `steam-webhook-prod`
- `steam-processor-prod`
- `exposure-calculator-prod`
- `fantasy402-logs-prod`

**Configuration:**
```toml
# wrangler.toml lines 130-178 (dev)
# wrangler.toml lines 37-83 (prod)
[[queues.producers]]
binding = "FANTASY402_QUEUE"
queue = "fantasy402-logs"

[[queues.consumers]]
queue = "fantasy402-logs"
max_batch_size = 100
max_batch_timeout = 5
max_retries = 5
```

**TypeScript Usage:**
```typescript
// From src/types/api.ts
export interface Env {
  LINE_INGRESS: Queue;
  STEAM_WEBHOOK: Queue;
  STEAM_QUEUE: Queue;
  EXPOSURE_QUEUE: Queue;
  FANTASY402_QUEUE: Queue;
}

// Send to queue
await env.FANTASY402_QUEUE.send({
  timestamp: new Date().toISOString(),
  operation: 'getListAgenstByAgent',
  data: agentData
});

// Consumer handler
export async function processFantasy402Logs(
  batch: MessageBatch<Fantasy402LogMessage>,
  env: Env
): Promise<void> {
  console.log(`Processing ${batch.messages.length} messages`);
  // Batch process and ack
  for (const message of batch.messages) {
    // Process...
    message.ack();
  }
}
```

---

## Analytics Engine (2 total)

### Development (1)
- **Binding:** `ANALYTICS_ENGINE`
- **Dataset:** `betting-metrics`
- **Retention:** 7 days
- **Purpose:** Time-series metrics collection

### Production (1)
- **Binding:** `ANALYTICS_ENGINE`
- **Dataset:** `betting-metrics-prod`
- **Retention:** 7 days

**Configuration:**
```toml
# wrangler.toml lines 188-191 (dev)
# wrangler.toml lines 85-88 (prod)
[[analytics_engine_datasets]]
binding = "ANALYTICS_ENGINE"
dataset = "betting-metrics"
retention_days = 7
```

**TypeScript Usage:**
```typescript
// From src/types/api.ts
export interface Env {
  ANALYTICS_ENGINE: AnalyticsEngineDataset;
}

// Write data point
env.ANALYTICS_ENGINE.writeDataPoint({
  blobs: ['cache-hit'],
  doubles: [1],
  indexes: [`fantasy402:agents:by-owner:${agentOwner}`]
});
```

---

## Cron Triggers (4 total)

**Note:** Cron triggers are not environment-specific (apply to all environments).

### 1. Hourly Sharp Calculation
- **Schedule:** `0 * * * *` (every hour at :00)
- **Handler:** `src/schedules/sharpCalc.ts`
- **Purpose:** Calculate sharp customer indicators

### 2. Minute Exposure Calculation
- **Schedule:** `* * * * *` (every minute)
- **Handler:** `src/schedules/exposureCalc.ts`
- **Purpose:** Exposure tracking (closest to 30s possible)
- **Note:** 30s cron not supported by Cloudflare

### 3. Minute MCP Cache Warming
- **Schedule:** `*/1 * * * *` (every minute)
- **Handler:** `src/schedules/mcpCacheWarm.ts`
- **Purpose:** Pre-warm cache for MCP queries

### 4. Daily Cleanup (3 AM UTC)
- **Schedule:** `0 3 * * *` (daily at 3:00 AM UTC)
- **Handler:** `src/schedules/dailyCleanup.ts`
- **Purpose:** Cleanup old data + agent graph population

**Configuration:**
```toml
# wrangler.toml lines 180-186
[triggers]
crons = [
  "0 * * * *",    # hourly sharp calculation
  "* * * * *",    # every minute exposure calculation
  "*/1 * * * *",  # every minute MCP cache warming
  "0 3 * * *"     # daily at 3 AM UTC
]
```

**TypeScript Usage:**
```typescript
// From src/index.ts
export default {
  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    const cron = event.cron;

    if (cron === '0 * * * *') {
      await handleSharpCalc(env);
    } else if (cron === '* * * * *' || cron === '*/1 * * * *') {
      await handleExposureCalc(env);
    } else if (cron === '0 3 * * *') {
      await handleDailyCleanup(env);
    }
  }
};
```

---

## Resource Quotas & Limits

### Workers Paid Plan Limits

| Resource | Limit | Current Usage | Headroom |
|----------|-------|---------------|----------|
| **CPU Time** | 50ms per request | ~5-10ms avg | 80-90% |
| **KV Storage** | 1 GB | ~500 KB (0.05%) | 99.95% |
| **KV Reads** | 10M/day | ~50K/day (0.5%) | 99.5% |
| **KV Writes** | 1M/day | ~5K/day (0.5%) | 99.5% |
| **D1 Rows Read** | Unlimited | - | - |
| **D1 Rows Written** | Unlimited | - | - |
| **Queue Messages** | Unlimited | - | - |
| **Analytics Data Points** | Unlimited | - | - |

### Optimization Impact (v1.0)

**Before v1.0:**
- KV writes: ~50K/day (5% quota)
- D1 writes: ~30K/day

**After v1.0:**
- KV writes: ~5K/day (0.5% quota) - **90% reduction**
- D1 writes: ~2K/day - **93.3% reduction**

**Headroom:** 95%+ quota available for growth (10x-100x traffic scalable)

---

## Verification Commands

### List All Bindings

```bash
# D1 databases
wrangler d1 list

# KV namespaces
wrangler kv:namespace list

# Queues
wrangler queues list

# Worker configuration
wrangler deploy --dry-run --outdir=./dist
```

### Test Each Integration

```bash
# D1 query
wrangler d1 execute betting-analytics --local \
  --command "SELECT COUNT(*) FROM agent_graph"

# KV read
wrangler kv:key get --binding=FANTASY_CACHE "test-key" --local

# KV write
wrangler kv:key put --binding=FANTASY_CACHE "test-key" "test-value" --local

# Queue send (requires worker running)
curl -X POST http://localhost:8787/api/fantasy402/ingest \
  -H "Content-Type: application/json" \
  -H "X-Extension-Secret: default-dev-secret-change-me" \
  -d '{"operation": "test", "data": {}}'

# Analytics (view in dashboard)
# Workers & Pages → betting-brain-v3 → Analytics
```

---

## Migration Checklist

When adding new Cloudflare services:

- [ ] Update `wrangler.toml` (dev and prod sections)
- [ ] Add TypeScript interface in `src/types/api.ts`
- [ ] Document in this file
- [ ] Update binding count in summary table
- [ ] Test locally with `wrangler dev --local`
- [ ] Deploy to staging first
- [ ] Update monitoring dashboards
- [ ] Document in CLAUDE.md

---

## Related Documentation

- **[wrangler.toml](../../wrangler.toml)** - Configuration file
- **[src/types/api.ts](../../src/types/api.ts)** - TypeScript interfaces
- **[PRODUCTION_CONFIG.md](./PRODUCTION_CONFIG.md)** - Production setup
- **[Cloudflare Docs](https://developers.cloudflare.com/workers/)** - Official documentation

---

**Document Version:** 1.0
**Last Updated:** 2025-10-08
**Maintained By:** Betting-Brain Team
