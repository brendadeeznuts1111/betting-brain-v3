# 🔌 MCP Endpoints Reference

**Last Updated:** 2025-10-07  
**Status:** ✅ **13/15 Tools Active**

---

## 📡 Base Endpoint

```
POST /mcp
Content-Type: application/json
```

**Location:** [src/index.ts](../src/index.ts) → [src/mcp/server.ts](../src/mcp/server.ts)

---

## 🔐 Authentication

Currently: **No authentication required** (D1-only access)

Future: Token-based authentication via `TokenManager` (Phase 3)

---

## 📋 JSON-RPC 2.0 Protocol

All requests follow JSON-RPC 2.0 format:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "method_name",
  "params": { }
}
```

---

## 🛠️ Available Methods

### 1. Initialize
**Method:** `initialize`  
**Purpose:** Get server capabilities

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize"
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "0.1.0",
    "serverInfo": {
      "name": "betting-brain-v3-mcp",
      "version": "3.0.0"
    },
    "capabilities": {
      "tools": {}
    }
  }
}
```

---

### 2. List Tools
**Method:** `tools/list`  
**Purpose:** Get all available tools

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "getBettingExposure",
        "description": "Get current betting exposure...",
        "inputSchema": { }
      },
      // ... 12 more tools
    ]
  }
}
```

---

### 3. Call Tool
**Method:** `tools/call`  
**Purpose:** Execute a specific tool

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "getSteamMoves",
    "arguments": {
      "agentID": "DEMO",
      "lookbackHours": 24,
      "minLineChange": 0.5
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{ \"steamMoves\": [...] }"
      }
    ]
  }
}
```

---

## 🎯 Available Tools (13 Active)

### Intelligence Tools (4/4) ✅

#### 1. getBettingExposure
**Purpose:** Get current betting exposure by event/market  
**Handler:** [src/tools/intelligence/getBettingExposure.ts](../src/tools/intelligence/getBettingExposure.ts)

**Parameters:**
```typescript
{
  eid: string;        // Event ID
  agentID?: string;   // Optional agent filter
}
```

**Example:**
```bash
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "getBettingExposure",
      "arguments": { "eid": "nba_123" }
    }
  }'
```

---

#### 2. getCLV
**Purpose:** Calculate Customer Lifetime Value  
**Handler:** [src/tools/intelligence/getCLV.ts](../src/tools/intelligence/getCLV.ts)

**Parameters:**
```typescript
{
  cid: string;        // Customer ID
  lookbackDays?: number;  // Default: 30
}
```

---

#### 3. getHoldPercentage
**Purpose:** Calculate hold percentage  
**Handler:** [src/tools/intelligence/getHoldPercentage.ts](../src/tools/intelligence/getHoldPercentage.ts)

**Parameters:**
```typescript
{
  eid: string;        // Event ID
  mt?: string;        // Market type
}
```

---

#### 4. getSharpScore
**Purpose:** Calculate sharp customer score  
**Handler:** [src/tools/intelligence/getSharpScore.ts](../src/tools/intelligence/getSharpScore.ts)

**Parameters:**
```typescript
{
  cid: string;        // Customer ID
}
```

---

### Live Betting Tools (3/5) ✅

#### 5. getSteamMoves
**Purpose:** Detect 3-sigma line movements  
**Handler:** [src/mcp/handlers/steamMoves.ts](../src/mcp/handlers/steamMoves.ts)

**Parameters:**
```typescript
{
  agentID?: string;           // Agent filter
  lookbackHours?: number;     // Default: 24
  minLineChange?: number;     // Default: 0.5
  severityLevel?: string;     // CRITICAL, HIGH, MEDIUM, LOW
}
```

**Algorithm:**
```
CRITICAL: Δline ≥ 2.0 AND Δvolume > 1000
HIGH:     Δline ≥ 1.0 AND Δvolume > 500
MEDIUM:   Δline ≥ 0.5 AND Δvolume > 100
LOW:      Any other significant movement
```

---

#### 6. getRiskConcentration
**Purpose:** Analyze risk clustering  
**Handler:** [src/mcp/handlers/riskConcentration.ts](../src/mcp/handlers/riskConcentration.ts)

**Parameters:**
```typescript
{
  groupBy: "event" | "customer" | "market";
  threshold?: number;         // Default: 10000
  agentID?: string;
}
```

---

#### 7. getSharpActivity
**Purpose:** Track sharp customer activity  
**Handler:** [src/mcp/handlers/sharpActivity.ts](../src/mcp/handlers/sharpActivity.ts)

**Parameters:**
```typescript
{
  agentID?: string;
  minSharpScore?: number;     // Default: 60
  lookbackHours?: number;     // Default: 24
}
```

---

#### 8. getLiveBettingTicker (Placeholder)
**Status:** 🔲 Not yet implemented  
**Planned:** Phase 5

---

#### 9. getClosingLineValue (Placeholder)
**Status:** 🔲 Not yet implemented  
**Planned:** Phase 5

---

### Analytics Tools (6/6) ✅

#### 10. getTimeSeriesCLV
**Purpose:** CLV trend analysis with rolling metrics  
**Handler:** [src/mcp/handlers/timeSeriesCLV.ts](../src/mcp/handlers/timeSeriesCLV.ts)

**Parameters:**
```typescript
{
  cid: string;                // Customer ID
  startDate?: string;         // ISO date
  endDate?: string;           // ISO date
  granularity?: "day" | "week" | "month";
}
```

---

#### 11. getEnhancedSharpScore
**Purpose:** ML-like 7-feature customer profiling  
**Handler:** [src/mcp/handlers/enhancedSharpScore.ts](../src/mcp/handlers/enhancedSharpScore.ts)

**Parameters:**
```typescript
{
  cid: string;                // Customer ID
  lookbackDays?: number;      // Default: 30
  includeFeatures?: boolean;  // Return feature breakdown
}
```

**Scoring Algorithm:**
```
Core Features (40 points):
  - CLV: 0-20
  - Win Rate: 0-15
  - Volume: 0-5

Advanced Features (60 points):
  - Steam Correlation: 0-15
  - Bet Timing: 0-15
  - Sizing Consistency: 0-15
  - Market Diversity: 0-15

Classifications:
  75-100: PROFESSIONAL_SHARP (CRITICAL risk)
  60-74:  ADVANCED_SHARP (HIGH risk)
  45-59:  INTERMEDIATE_SHARP (MEDIUM risk)
  30-44:  CASUAL_SHARP (LOW-MEDIUM risk)
  0-29:   RECREATIONAL (LOW risk)
```

---

#### 12. getHoldForecast
**Purpose:** Predictive hold % with linear regression  
**Handler:** [src/mcp/handlers/holdForecast.ts](../src/mcp/handlers/holdForecast.ts)

**Parameters:**
```typescript
{
  eid?: string;               // Event ID (optional)
  mt?: string;                // Market type
  forecastDays?: number;      // Default: 7
}
```

**Features:**
- Linear regression forecasting
- 95% confidence intervals (±1.96σ)
- Anomaly detection (2σ threshold)

---

#### 13. getHandleAndHold
**Purpose:** Revenue analytics with trend detection  
**Handler:** [src/mcp/handlers/handleAndHold.ts](../src/mcp/handlers/handleAndHold.ts)

**Parameters:**
```typescript
{
  agentID?: string;
  startDate?: string;
  endDate?: string;
  groupBy?: "day" | "week" | "event";
}
```

---

#### 14. getCustomerVolume
**Purpose:** Customer segmentation by volume  
**Handler:** [src/mcp/handlers/customerVolume.ts](../src/mcp/handlers/customerVolume.ts)

**Parameters:**
```typescript
{
  agentID?: string;
  lookbackDays?: number;      // Default: 30
  segmentBy?: "percentile" | "fixed";
}
```

**Segments:**
- WHALE: Top 1% (>90th percentile)
- HIGH_ROLLER: 75-90th percentile
- REGULAR: 25-75th percentile
- CASUAL: 10-25th percentile
- OCCASIONAL: <10th percentile

---

#### 15. getTimeSeriesAnalytics
**Purpose:** Flexible time-series analysis  
**Handler:** [src/mcp/handlers/timeSeriesAnalytics.ts](../src/mcp/handlers/timeSeriesAnalytics.ts)

**Parameters:**
```typescript
{
  metric: "clv" | "hold" | "volume" | "exposure";
  startDate?: string;
  endDate?: string;
  granularity?: "hour" | "day" | "week";
  includeAnomalies?: boolean;
}
```

**Features:**
- Anomaly detection (2σ threshold)
- Trend analysis
- Statistical summaries

---

## 🧪 Testing MCP Endpoints

### Option 1: Direct Handler Testing (Fastest)
```bash
bun scripts/test-handlers-direct.ts
```

**Pros:**
- No server startup needed
- Faster iteration
- Direct function testing

---

### Option 2: Local Development Server
```bash
# Terminal 1: Start server
bun run dev

# Terminal 2: Test endpoint
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

---

### Option 3: Production Testing
```bash
# Deploy
wrangler deploy

# Test
curl -X POST https://YOUR-WORKER.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize"
  }'
```

---

## 📊 Performance Expectations

| Tool | Complexity | Expected Time | Database Hits |
|------|-----------|---------------|---------------|
| getBettingExposure | Low | 50-150ms | 1-2 |
| getCLV | Low | 50-150ms | 1 |
| getHoldPercentage | Low | 50-150ms | 1 |
| getSharpScore | Low | 50-150ms | 1 |
| getSteamMoves | Medium | 150-300ms | 1-2 |
| getRiskConcentration | Medium | 200-400ms | 1-2 |
| getSharpActivity | Medium | 150-300ms | 2-3 |
| getTimeSeriesCLV | High | 400-800ms | 2-5 |
| getEnhancedSharpScore | High | 500-1000ms | 3-5 |
| getHoldForecast | High | 400-800ms | 2-4 |
| getHandleAndHold | Medium | 300-600ms | 2-3 |
| getCustomerVolume | High | 500-1000ms | 2-4 |
| getTimeSeriesAnalytics | High | 400-900ms | 2-5 |

**Note:** Times assume D1 free tier with typical data volumes.

---

## ⚠️ Error Handling

All tools return standardized error format:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Error: Invalid event ID"
      }
    ],
    "isError": true
  }
}
```

Common errors:
- Missing required parameters
- Invalid parameter values
- Database connection issues
- Timeout (50ms CPU limit)
- No data found

---

## 🔄 Request Flow

```
Client Request (JSON-RPC 2.0)
    ↓
POST /mcp [src/index.ts:L180]
    ↓
handleMCPRequest() [src/mcp/server.ts:L15]
    ↓
Route by method:
├─→ initialize → return capabilities
├─→ tools/list → return tool definitions [src/mcp/tools.ts]
└─→ tools/call → callTool() [src/mcp/toolRegistry.ts:L10]
        ↓
    Find handler by tool name
        ↓
    Execute handler [src/mcp/handlers/*.ts]
        ↓
    Query D1 database (ANALYTICS binding)
        ↓
    Format result as MCPToolResult
        ↓
    Return JSON-RPC 2.0 response
```

---

## 📚 Related Documentation

- **[MCP Integration Status](./MCP_INTEGRATION_STATUS.md)** - Overall MCP status
- **[MCP Testing Guide](./MCP_TESTING_GUIDE.md)** - Comprehensive testing guide
- **[Testing Status](./TESTING_STATUS.md)** - Current testing status
- **[CLAUDE.md](../CLAUDE.md)** - MCP Quick Reference section
- **[Code Quality Audit](./CODE_QUALITY_AUDIT.md)** - Security & quality review

---

## 🔍 Troubleshooting

### Issue: "Tool not found"
**Solution:** Check tool name matches exactly (case-sensitive)

### Issue: "Database not available"
**Solution:** Verify D1 binding in `wrangler.toml` and database is created

### Issue: "CPU time limit exceeded"
**Solution:** Optimize queries or increase limit in `wrangler.toml`

### Issue: "No data returned"
**Solution:** Check migrations applied and test data loaded

---

## 📦 Database Requirements

MCP tools require these D1 tables:

```sql
-- Core tables (migrations/0001_initial_schema.sql)
line_movements
sharp_indicators
exposure_tracking

-- MCP tables (migrations/0003_mcp_tables.sql)
bet_history
hold_tracking

-- Test data (migrations/0004_test_data.sql)
-- 14 customers, 28 bets, 11 line movements
```

**Apply migrations:**
```bash
wrangler d1 migrations apply betting-analytics --local
```

---

## 🎯 Quick Start

```bash
# 1. Apply migrations
wrangler d1 migrations apply betting-analytics --local

# 2. Start server
bun run dev

# 3. Test tools/list
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# 4. Call a tool
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "getSteamMoves",
      "arguments": {"lookbackHours": 24}
    }
  }'
```

---

**Status:** ✅ **PRODUCTION READY**  
**Last Verified:** 2025-10-07  
**Tools Active:** 13/15 (87%)

---

*For implementation details, see [src/mcp/](../src/mcp/) directory.*

