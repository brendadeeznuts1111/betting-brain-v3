# Dashboard API Status & Error Mapping

**Last Updated:** 2025-10-08
**Dashboard:** `floor-control.html` (13 cards)
**Worker:** `http://localhost:8787`

---

## ✅ Working Endpoints

| Card | Endpoint | Status | Response |
|------|----------|--------|----------|
| **Floor Health** | `/floor/status` | ✅ Working | `{version, status, health{worker, database, queue}}` |
| **Forest Grove** | `/health` | ✅ Working | `{status, version, timestamp, requestId}` |
| **MCP Tools** | `/mcp` (POST) | ✅ Working | JSON-RPC 2.0 (tools/list) |
| **DNS Health** | `/api/health/dns?host=fantasy402.com` | ✅ Working | `{host, ip, latency, cached}` |
| **Mission Control** | `/api/f402/mission-control` | ✅ Working | All Fantasy402 data (unified) |

---

## ❌ Broken Endpoints

| Card | Endpoint | Error | Root Cause |
|------|----------|-------|------------|
| **Live Odds (NBA)** | `/api/live-odds?sport=nba&market=moneyline&limit=10` | `Internal error` | Handler exists (`src/routes/api/live-odds.ts`) but not registered in main router |
| **Live Scores** | `/api/live-scores?sport=nba` | `NOT_FOUND` | Endpoint not implemented |
| **Database Metrics** | Dashboard tries `/api/database/metrics` | ❓ Unknown | No endpoint defined (should query D1 directly) |
| **Recent Activity** | Dashboard tries `/api/activity` | ❓ Unknown | No endpoint defined (should query logs/KV) |

---

## 🔧 Data Mapping Issues

### 1. **MCP Tools Card**
**Current Dashboard Code:**
```javascript
const floorData = await getJSON('/floor/status', 'mcp');
// Then also calls:
const d = await getJSON('/mcp', 'mcp');
```

**Problem:** Dashboard calls `/mcp` expecting REST GET, but `/mcp` only supports **POST** (JSON-RPC 2.0).

**Fix Options:**
- A) Add GET handler to `/mcp` that returns `tools/list` automatically
- B) Update dashboard to POST:
  ```javascript
  fetch('/mcp', {
    method: 'POST',
    body: JSON.stringify({jsonrpc: '2.0', id: 1, method: 'tools/list'})
  })
  ```
- C) Use unified endpoint `/api/f402/mission-control` which already includes MCP tools

---

### 2. **Live Odds Card**
**File Exists:** `src/routes/api/live-odds.ts`
**Problem:** Not registered in `src/index.ts` main router

**Current Router Check:**
```bash
$ grep -n "live-odds" src/index.ts
# No matches found
```

**Fix:** Add to `src/index.ts`:
```typescript
if (url.pathname.startsWith('/api/live-odds')) {
  const { getLiveOdds } = await import('./routes/api/live-odds');
  return getLiveOdds(request, env, ctx);
}
```

---

### 3. **Live Scores Card**
**File Exists:** None
**Problem:** Endpoint not implemented

**Options:**
- A) Create `/api/live-scores` handler (fetch from external API)
- B) Show mock data for now
- C) Hide card until implemented

---

### 4. **Database Metrics Card**
**Current:** Dashboard expects `/api/database/metrics`
**Available:** None

**Fix:** Create handler that queries D1:
```typescript
// src/routes/api/database-metrics.ts
export async function getDatabaseMetrics(request: Request, env: Env) {
  const lineMovements = await env.ANALYTICS.prepare(
    'SELECT COUNT(*) as count FROM line_movements'
  ).first();

  const sharpIndicators = await env.ANALYTICS.prepare(
    'SELECT COUNT(*) as count FROM sharp_indicators'
  ).first();

  const exposureTracking = await env.ANALYTICS.prepare(
    'SELECT COUNT(*) as count FROM exposure_tracking'
  ).first();

  return {
    total: lineMovements.count + sharpIndicators.count + exposureTracking.count,
    lineMovements: lineMovements.count,
    sharpIndicators: sharpIndicators.count,
    exposureTracking: exposureTracking.count
  };
}
```

---

### 5. **Recent Activity Card**
**Current:** Dashboard expects `/api/activity`
**Available:** None

**Options:**
- A) Query `LIVEBETS_STORE` KV for recent activity
- B) Query D1 `line_movements` with `ORDER BY timestamp DESC LIMIT 10`
- C) Return Fantasy402 transaction stream from mission-control

---

## 📊 Fantasy402 Cards (Working via Unified Endpoint)

All Fantasy402 cards work correctly via `/api/f402/mission-control`:

| Card | Data Source | Status |
|------|-------------|--------|
| **🎲 Live Bets** | `response.liveBets{count, volume, buckets}` | ✅ Working (shows 0 when no data) |
| **🤖 Agent Performance** | `response.agents{totalPnl, top[]}` | ✅ Working |
| **👥 Customer Pulse** | `response.customers{active, staked}` | ✅ Working |
| **💸 Transaction Ticker** | `response.transactions[]` | ✅ Working |

**Note:** All show `0` because `dataSource: "mock"` (no real intercepts yet). Once extension captures data, these will populate automatically.

---

## 🎯 Quick Fixes (Priority Order)

### **High Priority (Broken Cards)**

1. **Register `/api/live-odds` route** (3 min)
   - File: `src/index.ts`
   - Add route handler for existing `live-odds.ts`

2. **Fix MCP card data fetching** (5 min)
   - Option A: Add GET handler to `/mcp`
   - Option B: Update dashboard to use mission-control data

3. **Create `/api/database/metrics`** (10 min)
   - Query D1 for table counts
   - Return total + breakdown

### **Medium Priority (Missing Features)**

4. **Implement `/api/live-scores`** (30 min)
   - Fetch from external sports API
   - Cache results (5 min TTL)
   - Return active games count + details

5. **Create `/api/activity`** (15 min)
   - Query recent line movements OR
   - Return Fantasy402 transaction stream

### **Low Priority (Enhancements)**

6. **Error handling standardization**
   - All endpoints return consistent error format
   - Add `requestId` to all responses
   - Add `cached` flag where applicable

---

## 🧪 Testing Checklist

```bash
# Test all endpoints
curl -s http://localhost:8787/floor/status | jq '.version'
curl -s http://localhost:8787/health | jq '.status'
curl -s http://localhost:8787/mcp -X POST -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | jq '.result.tools | length'
curl -s http://localhost:8787/api/f402/mission-control | jq '.dataSource'
curl -s 'http://localhost:8787/api/health/dns?host=fantasy402.com' | jq '.ip'

# Should fail (needs fixing)
curl -s 'http://localhost:8787/api/live-odds?sport=nba&limit=10' | jq '.error'
curl -s 'http://localhost:8787/api/live-scores?sport=nba' | jq '.error'
curl -s http://localhost:8787/api/database/metrics | jq '.error'
curl -s http://localhost:8787/api/activity | jq '.error'
```

---

## 📝 Dashboard Update Strategy

**Option 1: Fix All Endpoints (Complete)**
- Register all missing routes
- Implement missing handlers
- Test all 13 cards
- Time: ~2 hours

**Option 2: Quick Win (Show Working Cards)**
- Comment out broken cards in HTML
- Focus on 9 working cards
- Add "Coming Soon" placeholders
- Time: 10 minutes

**Option 3: Graceful Degradation (Recommended)**
- Keep all cards visible
- Show "No data available" for broken endpoints
- Add error logging to dashboard
- Implement fixes incrementally
- Time: 5 min setup + fixes as needed

---

## 🚀 Recommended Next Steps

1. **Immediate (5 min):**
   - Update dashboard to handle errors gracefully
   - Show "No data" instead of empty cards

2. **Short-term (1 hour):**
   - Register `/api/live-odds` route
   - Create `/api/database/metrics` handler
   - Fix MCP card data fetching

3. **Medium-term (next session):**
   - Implement `/api/live-scores`
   - Create `/api/activity`
   - Add error monitoring

---

**Status Summary:**
- ✅ **8 of 13 cards working** (61%)
- ⚠️ **3 cards need route registration**
- ❌ **2 cards need implementation**
- 🎯 **Fantasy402 integration complete** (needs real data)
