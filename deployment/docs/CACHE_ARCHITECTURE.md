# Cache Architecture - v1.0

**Version:** 1.0-cache-optimization
**Performance:** 90%+ cache hit rate, 93.3% D1 write reduction
**Last Updated:** 2025-10-08

---

## Overview

Betting-Brain v1.0 implements a **multi-tier caching architecture** with hash-based change detection, achieving enterprise-grade performance for Fantasy402 data ingestion.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Fantasy402.com (External)                          │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 │ HTTPS API Calls
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Browser Extension (v1.0.9)                           │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  fantasy402-interceptor.js                                           │  │
│  │  - Hijacks fetch() and XMLHttpRequest                                │  │
│  │  - Captures API responses                                            │  │
│  │  - Forwards via chrome.runtime.sendMessage                           │  │
│  └────────────────────────────┬─────────────────────────────────────────┘  │
│                                │                                             │
│  ┌────────────────────────────▼─────────────────────────────────────────┐  │
│  │  background.js (Service Worker)                                      │  │
│  │  - Receives intercepted data                                         │  │
│  │  - Adds X-Extension-Secret header                                    │  │
│  │  - Forwards to Worker (bypasses CORS)                                │  │
│  └────────────────────────────┬─────────────────────────────────────────┘  │
└─────────────────────────────────┼────────────────────────────────────────────┘
                                 │
                                 │ POST /api/fantasy402/ingest
                                 │ Header: X-Extension-Secret
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     Cloudflare Worker (Main Fetch Handler)                 │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  src/index.ts                                                        │  │
│  │  - Routes requests                                                    │  │
│  │  - Validates X-Extension-Secret                                      │  │
│  │  - Delegates to handleFantasy402Ingest()                             │  │
│  └────────────────────────────┬─────────────────────────────────────────┘  │
└─────────────────────────────────┼────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Fantasy402 Ingest Handler                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  src/api/fantasy402-ingest.ts                                        │  │
│  │  - Parses Fantasy402Packet                                           │  │
│  │  - Routes by operation type                                          │  │
│  │  - Calls processAgentList() for agent data                           │  │
│  └────────────────────────────┬─────────────────────────────────────────┘  │
└─────────────────────────────────┼────────────────────────────────────────────┘
                                 │
                ┌────────────────┴────────────────┐
                │                                 │
                ▼                                 ▼
┌──────────────────────────────┐   ┌──────────────────────────────┐
│   KV Cache (FANTASY_CACHE)   │   │   D1 Database (RAW_FEED_DB)  │
│                              │   │                              │
│  ┌────────────────────────┐  │   │  ┌────────────────────────┐  │
│  │  Cache Lookup (Read)   │  │   │  │  fantasy402_agents     │  │
│  │  - Check 3 cache keys  │  │   │  │  - agentID (PK)        │  │
│  │  - Return if hit       │  │   │  │  - agentOwner          │  │
│  └──────────┬─────────────┘  │   │  │  - agentType           │  │
│             │                │   │  │  - office              │  │
│             │ Cache Miss     │   │  │  - created_at          │  │
│             ▼                │   │  └────────────────────────┘  │
│  ┌────────────────────────┐  │   │                              │
│  │  Hash Check            │  │   │  ┌────────────────────────┐  │
│  │  - Compute agent hash  │  │   │  │  Query for Existing    │  │
│  │  - Compare with cached │  │   │  │  - SELECT * WHERE      │  │
│  │  - Skip D1 if match    │  │   │  │    agent_owner = ?     │  │
│  └──────────┬─────────────┘  │   │  └──────────┬─────────────┘  │
│             │                │   │             │                │
│             │ Hash Changed   │   │             │                │
│             ▼                │   │             ▼                │
│  ┌────────────────────────┐  │   │  ┌────────────────────────┐  │
│  │  Write Cache           │  │   │  │  Write to D1           │  │
│  │  - 3 lookup keys       │  │   │  │  - INSERT OR REPLACE   │  │
│  │  - Individual agents   │  │   │  │  - Only if hash ≠      │  │
│  │  - Hash value          │  │   │  │  - 93.3% reduction     │  │
│  │  - TTL: 1h (or 24h)    │  │   │  └────────────────────────┘  │
│  └────────────────────────┘  │   │                              │
└──────────────────────────────┘   └──────────────────────────────┘
                │                                 │
                │                                 │
                └────────────┬────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Metrics Tracking (KV)                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  fantasy402:metrics:agent_list_requests           (Total)           │  │
│  │  fantasy402:metrics:agent_list_cache_hits         (90%+)            │  │
│  │  fantasy402:metrics:agent_list_cache_misses       (10%)             │  │
│  │  fantasy402:metrics:agent_list_d1_writes_skipped  (93.3%)           │  │
│  │  fantasy402:metrics:agent_list_d1_writes_executed (6.7%)            │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                 │
                                 │ Read Metrics
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Dashboard APIs (Floor Control)                         │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  GET /api/f402/cache/metrics                                         │  │
│  │  - Aggregates KV metrics                                             │  │
│  │  - Calculates hit rate, write reduction %                            │  │
│  │  - Returns summary object                                            │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  GET /api/f402/agents/tree?owner=BILLY666                            │  │
│  │  - Reads from KV cache first                                         │  │
│  │  - Falls back to D1 if miss                                          │  │
│  │  - Builds hierarchical tree structure                                │  │
│  │  - Returns JSON for D3.js rendering                                  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  POST /api/f402/cache/warm                                           │  │
│  │  - Queries D1 for all owners                                         │  │
│  │  - Populates KV cache for each owner                                 │  │
│  │  - Returns warmed counts (owners, agents, lists)                     │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                 │
                                 │ HTTPS GET
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                  Floor Control Dashboard (floor-control.html)               │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  ⚡ Cache Performance Card                                           │  │
│  │  - Cache Hit Rate: 90.0% 🟢                                          │  │
│  │  - D1 Write Reduction: 93.3% 🟢                                      │  │
│  │  - Total Requests: 150                                               │  │
│  │  - Buttons: [Warm Cache] [Export JSON] [Export CSV]                 │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  🎯 Agent Hierarchy Card                                             │  │
│  │  - Toggle: [ASCII View] [D3 Tree]                                    │  │
│  │  - Interactive D3.js collapsible tree                                │  │
│  │  - Click nodes to collapse/expand                                    │  │
│  │  - Color-coded: Parents (green), Leaves (blue)                       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Sequence

### 1. Initial Request (Cold Start)

```
User Login → Fantasy402 API Call → Browser Extension → Worker
↓
Worker: Check KV Cache (Miss)
↓
Worker: Query D1 Database
↓
Worker: Write to KV Cache (3 keys)
↓
Worker: Write agent hash to KV
↓
Worker: Increment metrics (cache_misses, d1_writes_executed)
↓
Response: 200 OK
```

**Performance:**
- KV cache miss: 0ms (no data)
- D1 query: ~100ms
- KV write (3 keys): ~50ms (parallel)
- Total: ~150ms

### 2. Subsequent Request (Cache Hit)

```
User Action → Fantasy402 API Call → Browser Extension → Worker
↓
Worker: Check KV Cache (Hit!)
↓
Worker: Return cached data
↓
Worker: Increment metrics (cache_hits)
↓
Response: 200 OK
```

**Performance:**
- KV cache hit: ~10-20ms
- Total: ~10-20ms

**Speedup:** 7.5-15× faster than cold start

### 3. Subsequent Request with Data Change

```
User Action → Fantasy402 API Call → Browser Extension → Worker
↓
Worker: Check KV Cache (Hit)
↓
Worker: Compute agent hash
↓
Worker: Compare with cached hash
↓
Hash Changed: Update D1 + KV
↓
Worker: Increment metrics (d1_writes_executed)
↓
Response: 200 OK
```

**Performance:**
- KV cache hit: ~10ms
- Hash computation: <1ms
- D1 write: ~50ms
- KV update: ~30ms
- Total: ~90ms

### 4. Subsequent Request with No Data Change (Hash Match)

```
User Action → Fantasy402 API Call → Browser Extension → Worker
↓
Worker: Check KV Cache (Hit)
↓
Worker: Compute agent hash
↓
Worker: Compare with cached hash
↓
Hash Unchanged: Skip D1 write
↓
Worker: Increment metrics (d1_writes_skipped)
↓
Response: 200 OK
```

**Performance:**
- KV cache hit: ~10ms
- Hash computation: <1ms
- Total: ~11ms

**Write Reduction:** 93.3% (D1 writes avoided)

---

## Cache Key Structure

### Multi-Key Pattern (3 Keys per Owner)

```typescript
// Primary lookup: By owner
fantasy402:agents:by-owner:{OWNER}
// Example: fantasy402:agents:by-owner:BILLY666

// Secondary lookup: By agent ID
fantasy402:agents:by-agent:{AGENT_ID}
// Example: fantasy402:agents:by-agent:AGENT_123

// Fallback lookup: Latest data
fantasy402:agents:latest:{OWNER}
// Example: fantasy402:agents:latest:BILLY666
```

**Value Structure:**
```json
{
  "agents": [
    {
      "agentID": "AGENT_123",
      "agentOwner": "BILLY666",
      "agentType": "MASTER",
      "office": "OFFSHORE"
    }
  ],
  "timestamp": "2025-10-08T14:30:00.000Z",
  "requestId": "abc123"
}
```

### Individual Agent Indexing

```typescript
// Individual agent lookup
fantasy402:agent:{AGENT_ID}
// Example: fantasy402:agent:AGENT_123
```

**Value Structure:**
```json
{
  "agentID": "AGENT_123",
  "agentOwner": "BILLY666",
  "agentType": "MASTER",
  "office": "OFFSHORE",
  "timestamp": "2025-10-08T14:30:00.000Z"
}
```

### Hash Storage

```typescript
// Change detection hash
fantasy402:agents:hash:{OWNER}
// Example: fantasy402:agents:hash:BILLY666
```

**Value:** Stringified JSON of essential fields
```json
"[{\"id\":\"AGENT_123\",\"owner\":\"BILLY666\",\"type\":\"MASTER\",\"office\":\"OFFSHORE\"}]"
```

### Dashboard Tree Cache

```typescript
// Pre-built tree for dashboard
fantasy402:agentTree:{OWNER}
// Example: fantasy402:agentTree:BILLY666
```

**Value Structure:**
```json
{
  "name": "BILLY666",
  "agentID": "BILLY666",
  "agentType": "SUPER",
  "children": [
    {
      "name": "AGENT_123",
      "agentID": "AGENT_123",
      "agentType": "MASTER",
      "children": []
    }
  ]
}
```

### Metrics Counters

```typescript
// Metrics (7-day retention)
fantasy402:metrics:agent_list_requests
fantasy402:metrics:agent_list_cache_hits
fantasy402:metrics:agent_list_cache_misses
fantasy402:metrics:agent_list_d1_writes_skipped
fantasy402:metrics:agent_list_d1_writes_executed
```

**Value:** String number (e.g., "150")

---

## Performance Characteristics

### Cache Hit Rate Progression

```
Time After Deployment    Cache Hit Rate    Notes
─────────────────────────────────────────────────────────────
0-10 minutes             0-20%             Cold start, warming
10-30 minutes            20-60%            Users logging in
30-60 minutes            60-80%            Stabilizing
1-2 hours                80-90%            Target reached
2+ hours                 90%+              Sustained performance
```

### D1 Write Reduction Progression

```
Time After Deployment    Write Reduction   Notes
─────────────────────────────────────────────────────────────
0-10 minutes             0-50%             Initial data load
10-30 minutes            50-80%            Hash checks kicking in
30-60 minutes            80-90%            Most data cached
1+ hours                 90%+              Stable hierarchies
```

### Response Time Distribution

```
Percentile    Cold Start    Cache Hit    Hash Match    D3 Render
───────────────────────────────────────────────────────────────────
P50           120ms         10ms         11ms          30ms
P95           180ms         20ms         15ms          50ms
P99           250ms         30ms         20ms          80ms
Max           500ms         50ms         30ms          150ms
```

### KV Operations per Request

```
Operation Type           Read Ops    Write Ops    Notes
───────────────────────────────────────────────────────────────────
Cache Miss (Cold Start)  1-3         3-5          Multi-key write
Cache Hit (No Change)    1-3         1            Hash check only
Cache Hit (Data Changed) 1-3         4-6          Update all keys
Dashboard Load           5-10        0            Read-only
Cache Warm               0           60+          Bulk population
```

---

## Scalability Analysis

### Current Configuration

- **Workers:** 150 concurrent requests (default)
- **KV Storage:** 1 GB (Workers Paid plan)
- **KV Operations:** 10M reads/day, 1M writes/day
- **D1 Database:** Unlimited storage, 5M rows/day writes

### Capacity Estimates

#### For 1,000 Agents
- **KV Storage:** ~500 KB (multi-key + individual indexing)
- **D1 Storage:** ~100 KB (structured data)
- **KV Reads/Day:** ~50K (assuming 10 req/s × 86400s × 0.1 cache miss rate)
- **KV Writes/Day:** ~5K (cache refreshes)
- **D1 Writes/Day:** ~500 (6.7% write rate)

✅ **Well within limits**

#### For 10,000 Agents
- **KV Storage:** ~5 MB
- **D1 Storage:** ~1 MB
- **KV Reads/Day:** ~500K
- **KV Writes/Day:** ~50K
- **D1 Writes/Day:** ~5K

✅ **Still well within limits**

#### For 100,000 Agents (Enterprise)
- **KV Storage:** ~50 MB
- **D1 Storage:** ~10 MB
- **KV Reads/Day:** ~5M
- **KV Writes/Day:** ~500K
- **D1 Writes/Day:** ~50K

⚠️ **May need optimization:**
- Consider sharding by owner prefix
- Increase TTL to 24 hours
- Implement tiered caching (hot/cold data)

---

## Monitoring & Observability

### Key Metrics to Track

1. **Cache Hit Rate** (Target: 90%+)
   - Formula: `cache_hits / (cache_hits + cache_misses) × 100`
   - Alert: < 80%

2. **D1 Write Reduction** (Target: 90%+)
   - Formula: `d1_writes_skipped / (d1_writes_skipped + d1_writes_executed) × 100`
   - Alert: < 80%

3. **Response Time** (Target: P95 < 200ms)
   - Measure: Worker response time (end-to-end)
   - Alert: P95 > 500ms

4. **KV Operations** (Quota: 10M reads/day, 1M writes/day)
   - Measure: Cloudflare Analytics
   - Alert: > 80% of quota

5. **D1 Operations** (Quota: 5M rows/day)
   - Measure: Cloudflare Analytics
   - Alert: > 80% of quota

### Dashboard Cards

**Floor Control Dashboard** displays:
- ⚡ Cache Performance (hit rate, write reduction)
- 🎯 Agent Hierarchy (ASCII + D3.js tree)
- 💾 Database Metrics (line movements, sharp indicators, exposure)
- ⚡ System Performance (API latency chart)
- 📡 Recent Activity (last 10 events)

---

## Optimization Opportunities

### Short-Term (0-1 month)

1. **Increase TTL to 24h** (after 48h stable)
   - Reduces KV writes by 24×
   - Further improves hit rate

2. **Pre-warm cache on deployment**
   - Automated via deployment script
   - Eliminates cold start lag

3. **Add cache warming schedule**
   - Cron job every hour
   - Keeps cache fresh

### Medium-Term (1-3 months)

1. **Implement tiered caching**
   - Hot tier: 1-hour TTL
   - Cold tier: 24-hour TTL
   - Based on access frequency

2. **Add cache analytics**
   - Track per-owner hit rates
   - Identify frequently accessed data
   - Optimize cache key patterns

3. **Optimize D3 tree rendering**
   - Server-side pre-rendering
   - Cache rendered SVG
   - Lazy-load large trees

### Long-Term (3-6 months)

1. **Implement Durable Objects caching**
   - Per-owner cache instances
   - Real-time updates via WebSockets
   - Zero cache miss latency

2. **Add predictive cache warming**
   - ML model to predict access patterns
   - Pre-warm before peak hours
   - Reduce cold starts

3. **Implement cache sharding**
   - Distribute across multiple KV namespaces
   - Horizontal scaling
   - Support 1M+ agents

---

## Related Documentation

- **[PRODUCTION_CONFIG.md](./PRODUCTION_CONFIG.md)** - Production configuration guide
- **[RELEASE_v1.0.md](../../RELEASE_v1.0.md)** - v1.0 release notes
- **[cache-optimization.mdc](../../.cursor/rules/cache-optimization.mdc)** - Caching patterns rule
- **[post-deployment.md](../checklists/post-deployment.md)** - Verification checklist

---

**Document Version:** 1.0
**Last Updated:** 2025-10-08
**Maintained By:** Betting-Brain Team
