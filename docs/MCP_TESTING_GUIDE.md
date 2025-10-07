# MCP Testing Guide

## Quick Start

The MCP server is accessible at the `/mcp` endpoint and uses JSON-RPC 2.0 protocol.

**Base URL:** `http://localhost:8787/mcp` (development) or `https://your-worker.workers.dev/mcp` (production)

---

## Testing with cURL

### 1. List Available Tools

```bash
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

**Expected Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "getBettingExposure",
        "description": "Get current betting exposure...",
        "inputSchema": {...}
      },
      // ... 12 more tools
    ]
  }
}
```

---

### 2. Test Steam Detection

```bash
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "getSteamMoves",
      "arguments": {
        "agentID": "DEMO",
        "lookbackHours": 24,
        "minLineChange": 0.5
      }
    }
  }'
```

**Expected Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"agentID\":\"DEMO\",\"lookbackHours\":24,\"steam_moves\":[...]}"
      }
    ],
    "isError": false
  }
}
```

---

### 3. Test Enhanced Sharp Score

```bash
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "getEnhancedSharpScore",
      "arguments": {
        "cid": "test-customer-1",
        "lookbackDays": 30,
        "includeFeatures": true
      }
    }
  }'
```

---

### 4. Test Hold Forecasting

```bash
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "getHoldForecast",
      "arguments": {
        "lookbackDays": 30,
        "forecastHours": 24,
        "marketType": "SPREAD"
      }
    }
  }'
```

---

### 5. Test Customer Volume Segmentation

```bash
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 5,
    "method": "tools/call",
    "params": {
      "name": "getCustomerVolume",
      "arguments": {
        "agentID": "DEMO",
        "lookbackDays": 30,
        "minBets": 5,
        "segmentBy": "volume"
      }
    }
  }'
```

---

### 6. Test Time-Series CLV

```bash
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 6,
    "method": "tools/call",
    "params": {
      "name": "getTimeSeriesCLV",
      "arguments": {
        "cid": "test-customer-1",
        "lookbackDays": 30,
        "granularity": "daily"
      }
    }
  }'
```

---

### 7. Test Risk Concentration

```bash
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 7,
    "method": "tools/call",
    "params": {
      "name": "getRiskConcentration",
      "arguments": {
        "agentID": "DEMO",
        "groupBy": "event",
        "topN": 20
      }
    }
  }'
```

---

### 8. Test Sharp Activity Tracking

```bash
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 8,
    "method": "tools/call",
    "params": {
      "name": "getSharpActivity",
      "arguments": {
        "agentID": "DEMO",
        "lookbackHours": 24,
        "minSharpScore": 60
      }
    }
  }'
```

---

### 9. Test Handle & Hold Analytics

```bash
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 9,
    "method": "tools/call",
    "params": {
      "name": "getHandleAndHold",
      "arguments": {
        "agentID": "DEMO",
        "lookbackDays": 7,
        "granularity": "daily"
      }
    }
  }'
```

---

### 10. Test Time-Series Analytics

```bash
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 10,
    "method": "tools/call",
    "params": {
      "name": "getTimeSeriesAnalytics",
      "arguments": {
        "metric": "volume",
        "lookbackDays": 30,
        "granularity": "daily",
        "groupBy": "market_type"
      }
    }
  }'
```

---

## Testing with Postman

### Collection Setup

1. Create new collection: "Betting-Brain MCP Tests"
2. Set base URL variable: `{{mcp_url}}` = `http://localhost:8787/mcp`
3. Import the requests above

### Environment Variables

```json
{
  "mcp_url": "http://localhost:8787/mcp",
  "test_customer_id": "test-customer-1",
  "agent_id": "DEMO"
}
```

---

## Testing with JavaScript/TypeScript

### Node.js Example

```typescript
async function testMCPTool(toolName: string, args: Record<string, any>) {
  const response = await fetch('http://localhost:8787/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args,
      },
    }),
  });

  const result = await response.json();
  console.log(JSON.stringify(result, null, 2));
  return result;
}

// Test enhanced sharp score
await testMCPTool('getEnhancedSharpScore', {
  cid: 'test-customer-1',
  lookbackDays: 30,
  includeFeatures: true,
});

// Test steam detection
await testMCPTool('getSteamMoves', {
  agentID: 'DEMO',
  lookbackHours: 24,
  minLineChange: 0.5,
});
```

---

## Expected Response Format

### Success Response

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"key\":\"value\",...}"
      }
    ],
    "isError": false
  }
}
```

### Error Response

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32602,
    "message": "Invalid params",
    "data": {
      "details": "Missing required parameter: cid"
    }
  }
}
```

---

## All Available Tools

### Intelligence Tools (4)
1. `getBettingExposure` - Current exposure by event/market
2. `getCLV` - Customer lifetime value
3. `getHoldPercentage` - Hold percentage analysis
4. `getSharpScore` - Basic sharp score calculation

### Live Betting Tools (5)
5. `getLiveBettingTicker` - Real-time betting feed (not implemented)
6. **`getSteamMoves`** - 3-sigma steam detection ✅
7. **`getRiskConcentration`** - Risk clustering analysis ✅
8. **`getSharpActivity`** - Sharp customer tracking ✅
9. `getClosingLineValue` - CLV analysis (not implemented)

### Analytics Tools (6)
10. **`getTimeSeriesCLV`** - CLV trend analysis ✅
11. **`getEnhancedSharpScore`** - ML-like customer profiling ✅
12. **`getHoldForecast`** - Predictive hold analytics ✅
13. **`getHandleAndHold`** - Revenue analytics ✅
14. **`getCustomerVolume`** - Customer segmentation ✅
15. **`getTimeSeriesAnalytics`** - Flexible time-series ✅

**Total:** 15 tools defined (13 implemented ✅, 2 placeholders)

---

## Troubleshooting

### Tool Not Found
**Error:** `Tool not found: toolName`

**Solution:** Check available tools with `tools/list` method

---

### Missing Database
**Error:** `ANALYTICS database not available`

**Solution:** Ensure D1 database is bound in `wrangler.toml`:
```toml
[[d1_databases]]
binding = "ANALYTICS"
database_name = "betting-analytics"
database_id = "your-database-id"
```

---

### Invalid Parameters
**Error:** `Invalid params`

**Solution:** Check tool schema with `tools/list` and ensure all required parameters are provided

---

### Customer Not Found
**Response:** `{"error": "Customer not found", "cid": "..."}`

**Solution:** Use a valid customer ID that exists in the `sharp_indicators` table

---

## Development Workflow

### 1. Start Local Server

```bash
bun run dev
# Server starts on http://localhost:8787
```

### 2. Test Tool List

```bash
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

### 3. Test Specific Tool

Use one of the cURL examples above

### 4. Check Logs

Server logs show:
```
[request-id] 🤖 MCP Protocol request
[MCP] Executing tool: getSteamMoves { args: {...} }
[MCP] Tool completed: getSteamMoves { isError: false }
```

### 5. Inspect Response

Parse the `result.content[0].text` field which contains JSON data

---

## Database Requirements

Tools expect these D1 tables:

### `sharp_indicators`
```sql
CREATE TABLE sharp_indicators (
  cid TEXT PRIMARY KEY,
  clv REAL,
  wr REAL,
  ao INTEGER,
  nb REAL
);
```

### `line_movements`
```sql
CREATE TABLE line_movements (
  eid TEXT,
  mt TEXT,
  lb REAL,
  la REAL,
  vb INTEGER,
  va INTEGER,
  ts TEXT,
  ing TEXT
);
```

### `bet_history`
```sql
CREATE TABLE bet_history (
  cid TEXT,
  stake REAL,
  payout REAL,
  result TEXT,
  ts TEXT,
  market_type TEXT,
  event_id TEXT,
  time_to_event INTEGER
);
```

### `exposure_tracking`
```sql
CREATE TABLE exposure_tracking (
  eid TEXT,
  side TEXT,
  risk REAL,
  net REAL,
  ts TEXT
);
```

### `hold_tracking`
```sql
CREATE TABLE hold_tracking (
  eid TEXT,
  mt TEXT,
  hold_pct REAL,
  volume REAL,
  ts TEXT
);
```

---

## Performance Benchmarks

Expected response times (with populated database):

| Tool | Query Complexity | Expected Time |
|------|------------------|---------------|
| getSteamMoves | Medium | 150-300ms |
| getRiskConcentration | Medium | 200-400ms |
| getSharpActivity | Medium | 150-300ms |
| getTimeSeriesCLV | High | 400-800ms |
| getEnhancedSharpScore | High | 500-1000ms |
| getHoldForecast | High | 400-800ms |
| getHandleAndHold | Medium | 300-600ms |
| getCustomerVolume | High | 500-1000ms |
| getTimeSeriesAnalytics | High | 400-900ms |

*Note: Times assume D1 database with < 100K rows. Larger datasets may be slower.*

---

## Next Steps

1. ✅ Run `bun run dev` to start local server
2. ✅ Test `tools/list` to verify MCP server is running
3. ✅ Test each tool with sample data
4. 🔲 Create test fixtures for consistent testing
5. 🔲 Set up automated integration tests
6. 🔲 Deploy to production and test with real data

---

## Additional Resources

- **MCP Specification:** https://modelcontextprotocol.io/
- **D1 Documentation:** https://developers.cloudflare.com/d1/
- **Cloudflare Workers:** https://developers.cloudflare.com/workers/

---

*Last Updated: 2025-10-07*
*Betting-Brain v3 MCP Server Testing Guide*
