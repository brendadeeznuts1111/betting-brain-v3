# Player Analysis Report Capture - Added ✅

**Date:** 2025-10-08
**Endpoint:** `POST /cloud/api/Manager/getReportPlayerAnalysis`
**Status:** Ingest handler updated, extension already supports
**TTL:** 1 hour (3600 seconds)

---

## 🎯 Implementation

### User Provided API Call
```javascript
fetch("https://fantasy402.com/cloud/api/Manager/getReportPlayerAnalysis", {
  "headers": {
    "authorization": "Bearer eyJhbGci...",
    "content-type": "application/x-www-form-urlencoded; charset=UTF-8"
  },
  "body": "agentID=BILLY666&agentOwner=BILLY666&customerID=&reportType=1&startDate=2025-09-24&endDate=2025-10-08&lineType=1&token=eyJhbGci...&operation=getReportPlayerAnalysis&RRO=1&agentSite=1",
  "method": "POST"
});
```

### Parameters
- **agentID:** Agent identifier (e.g., "BILLY666")
- **agentOwner:** Owner agent (e.g., "BILLY666")
- **customerID:** Customer filter (empty = all)
- **reportType:** Report type (1 = standard analysis)
- **startDate:** Period start (YYYY-MM-DD)
- **endDate:** Period end (YYYY-MM-DD)
- **lineType:** Line type filter (1 = main lines)
- **operation:** "getReportPlayerAnalysis"
- **token:** JWT authentication token

---

## 📊 Data Storage

### KV Namespace: `FANTASY_CACHE`
**Key:** `playerAnalysis:latest`

**Value Structure:**
```typescript
{
  raw: any,                      // Complete Fantasy402 response
  timestamp: string,             // ISO 8601 capture time
  capturedAt: string,            // Worker processing time
  metadata: {
    reportType: number,          // Report type (1, 2, etc.)
    startDate: string,           // "2025-09-24"
    endDate: string,             // "2025-10-08"
    lineType: number,            // Line type filter
    agentID: string,             // "BILLY666"
    customerID: string | null    // Customer filter (if any)
  }
}
```

**TTL:** 3600 seconds (1 hour)
- Longer than scores (5 min) because analysis reports change less frequently
- Shorter than auth tokens to ensure fresh data

---

## 🔄 Data Flow

### Capture Flow
```
1. User navigates to Fantasy402 Manager page
   ↓
2. Page makes POST to /cloud/api/Manager/getReportPlayerAnalysis
   ↓
3. Extension intercepts via fetch wrapper
   ↓
4. background.js forwards to worker (CORS-safe)
   POST http://localhost:8787/api/fantasy402/ingest
   ↓
5. fantasy402-ingest.ts detects operation=getReportPlayerAnalysis
   ↓
6. Stores in FANTASY_CACHE KV namespace
   Key: 'playerAnalysis:latest'
   Value: {raw, timestamp, capturedAt, metadata}
   TTL: 3600 seconds
   ↓
7. Queues to fantasy402-logs for async processing
```

### Retrieval Flow (Future)
```
Dashboard/API requests player analysis:
GET /api/player-analysis?agentID=BILLY666&startDate=2025-09-24&endDate=2025-10-08
   ↓
Check FANTASY_CACHE for 'playerAnalysis:latest'
   ├─ Cache hit (<1 hour old) → Return cached data  ✅
   ├─ Cache miss/stale → Query D1 historical data
   └─ No data → Return empty/mock data
```

---

## 📝 Code Changes

### Updated: `src/api/fantasy402-ingest.ts` (lines 91-117)
```typescript
// If this is a Player Analysis report, store in FANTASY_CACHE for analytics
if (packet.operation === 'getReportPlayerAnalysis' && packet.response?.body && env.FANTASY_CACHE) {
    try {
        // Store raw player analysis data
        await env.FANTASY_CACHE.put(
            'playerAnalysis:latest',
            JSON.stringify({
                raw: packet.response.body,
                timestamp: packet.timestamp,
                capturedAt: new Date().toISOString(),
                metadata: {
                    reportType: packet.request?.body?.reportType,
                    startDate: packet.request?.body?.startDate,
                    endDate: packet.request?.body?.endDate,
                    lineType: packet.request?.body?.lineType,
                    agentID: packet.request?.body?.agentID,
                    customerID: packet.request?.body?.customerID,
                }
            }),
            { expirationTtl: 3600 } // 1 hour
        );

        console.log(`[${requestId}] 📊 Stored player analysis in FANTASY_CACHE`);
    } catch (error) {
        console.warn(`[${requestId}] ⚠️ Failed to store player analysis:`, error);
    }
}
```

### No Extension Changes Needed ✅
Extension already intercepts ALL `/cloud/api/` endpoints via pattern matching:
```javascript
const INTERCEPT_PATTERNS = [
  '/cloud/api/' // Captures everything under /cloud/api/*
];
```

---

## 🧪 Testing

### Manual Test (Once Worker Restarts)
1. Visit fantasy402.com/manager.html
2. Navigate to Player Analysis report
3. Submit report request (dates, filters, etc.)
4. Check worker logs for: `📊 Stored player analysis in FANTASY_CACHE`
5. Verify KV storage:
```bash
curl -s http://localhost:8787/api/player-analysis
# Should return cached report data
```

### Test with Sample Data (Simulated)
```typescript
// In scripts/test-player-analysis-ingest.ts
const sampleRequest = {
  endpoint: 'getReportPlayerAnalysis',
  operation: 'getReportPlayerAnalysis',
  timestamp: new Date().toISOString(),
  request: {
    body: {
      agentID: 'BILLY666',
      agentOwner: 'BILLY666',
      customerID: '',
      reportType: 1,
      startDate: '2025-09-24',
      endDate: '2025-10-08',
      lineType: 1,
    }
  },
  response: {
    status: 200,
    body: {
      /* Sample player analysis response */
      players: [
        {
          customerID: 'PLAYER123',
          totalRisk: 5000,
          totalWin: 4200,
          netIncome: -800,
          wagerCount: 45,
          avgBetSize: 111.11,
          winRate: 0.48
        }
      ],
      summary: {
        totalPlayers: 1,
        totalRisk: 5000,
        totalWin: 4200,
        totalNet: -800
      }
    }
  },
  metadata: {
    duration: 150,
    agentID: 'BILLY666',
    agentOwner: 'BILLY666'
  }
};
```

---

## ✅ Verification Checklist

- [x] **Ingest handler updated** (lines 91-117)
- [x] **Operation detection** (getReportPlayerAnalysis)
- [x] **KV storage** (FANTASY_CACHE namespace)
- [x] **TTL configured** (3600 seconds = 1 hour)
- [x] **Metadata extraction** (reportType, dates, agentID, customerID)
- [x] **Raw response preserved** (complete data capture)
- [x] **Error handling** (try-catch with warning log)
- [x] **Extension support** (already intercepts /cloud/api/*)
- [ ] **API endpoint created** (future: GET /api/player-analysis)
- [ ] **Dashboard card** (future: Player Analysis card)

---

## 🎯 Next Steps (Optional)

### 1. Create API Endpoint
**File:** `src/routes/api/player-analysis.ts`
```typescript
export async function getPlayerAnalysis(
  request: Request,
  env: Env,
  requestId: string
): Promise<Response> {
  // Check cache first
  const cached = await env.FANTASY_CACHE.get('playerAnalysis:latest');
  if (cached) {
    const data = JSON.parse(cached);
    const cacheAge = Date.now() - new Date(data.capturedAt).getTime();

    // Use cache if less than 1 hour old
    if (cacheAge < 3600000) {
      return new Response(JSON.stringify({
        ...data,
        cached: true,
        cacheAge: Math.round(cacheAge / 1000)
      }), {headers: corsHeaders});
    }
  }

  // Fallback to D1 historical data
  // ... query fantasy402_players table
}
```

### 2. Register Route
**File:** `src/api/routes.ts`
```typescript
case '/player-analysis':
  const { getPlayerAnalysis } = await import('../routes/api/player-analysis');
  return await getPlayerAnalysis(request, env, requestId);
```

### 3. Add Dashboard Card
**File:** `dashboards/floor-control.html`
```html
<div class="card">
  <div class="card-header">
    <span class="card-icon">📊</span>
    <span class="card-title">Player Analysis</span>
  </div>
  <div class="card-content">
    <div class="big-number" id="total-players-analyzed">-</div>
    <div class="label">Total Players</div>
    <div class="stats">
      <div>
        <strong id="total-risk-analyzed">$0</strong>
        <span>Total Risk</span>
      </div>
      <div>
        <strong id="total-net-analyzed">$0</strong>
        <span>Net Income</span>
      </div>
    </div>
  </div>
</div>
```

---

## 📊 Expected Response Format (Fantasy402)

Based on typical player analysis reports:

```json
{
  "players": [
    {
      "customerID": "string",
      "playerName": "string",
      "totalWagers": number,
      "totalRisk": number,
      "totalWin": number,
      "netIncome": number,
      "winRate": number,
      "avgBetSize": number,
      "largestBet": number,
      "sportBreakdown": [
        {
          "sport": "string",
          "wagerCount": number,
          "risk": number,
          "win": number,
          "net": number
        }
      ]
    }
  ],
  "summary": {
    "totalPlayers": number,
    "totalWagers": number,
    "totalRisk": number,
    "totalWin": number,
    "totalNet": number,
    "avgRiskPerPlayer": number,
    "avgWinRate": number
  },
  "period": {
    "startDate": "2025-09-24",
    "endDate": "2025-10-08",
    "days": 14
  }
}
```

---

## 🎉 Summary

**Status:** ✅ COMPLETE (ingest handler)
- Added `getReportPlayerAnalysis` detection to ingest handler
- Stores complete raw response in FANTASY_CACHE with 1-hour TTL
- Captures report metadata (dates, reportType, agentID, etc.)
- Extension already intercepts the endpoint (no changes needed)
- Ready for API endpoint and dashboard integration

**User Action Required:**
1. Visit fantasy402.com/manager.html
2. Generate a Player Analysis report
3. Extension will automatically capture and store the data

**Future Enhancements:**
- Create `/api/player-analysis` endpoint to retrieve cached data
- Add dashboard card to visualize player analysis
- Store historical analysis in D1 for trend tracking

---

*Last Updated: 2025-10-08 14:10*
*Added to complete Fantasy402 data capture suite*
*Part of: Live Scores, BetTicker, and now Player Analysis capture*
