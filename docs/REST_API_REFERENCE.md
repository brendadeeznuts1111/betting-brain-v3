# 🔌 REST API Reference

**Last Updated:** 2025-10-07  
**Status:** ✅ **COMPLETE - PRODUCTION READY**  
**Version:** 3.0.0  
**Base URL:** `https://betting-brain-v3.nolarose1968-806.workers.dev`

---

**Metadata:**
- **Total Endpoints:** 9 REST API endpoints + 4 intelligence tools + 13 MCP tools = 26 total
- **Authentication:** None required (add auth in production)
- **Rate Limiting:** 10 req/s per IP (Cloudflare Workers)
- **Topics:** #api #rest #documentation #endpoints
- **Audience:** Developers, Integrators
- **Related Docs:** [MCP_ENDPOINTS.md](MCP_ENDPOINTS.md), [ENDPOINT_DASHBOARD_INTEGRATION.md](ENDPOINT_DASHBOARD_INTEGRATION.md)

---

## 📊 API Overview

The Betting-Brain v3 REST API provides easy-to-use endpoints for betting intelligence, analytics, and system monitoring. All endpoints return JSON and support CORS.

### Endpoint Categories

1. **Core REST API** (`/api/*`) - 9 endpoints
2. **Intelligence Tools** (`/tools/*`) - 4 endpoints
3. **MCP Protocol** (`/mcp`) - 13 tools via JSON-RPC 2.0
4. **System** (`/health`, `/diagnostics`, `/system-status`) - 3 endpoints

---

## 🔐 Authentication & Security

### Current State
- ✅ **CORS Enabled:** All endpoints support cross-origin requests
- ✅ **Input Validation:** Comprehensive validation on all endpoints
- ✅ **Error Handling:** Standardized error responses
- ⚠️ **No Authentication:** Add API keys or JWT tokens for production

### Recommended for Production
```typescript
// Add to request headers:
{
  "Authorization": "Bearer YOUR_API_KEY",
  "X-API-Key": "YOUR_API_KEY"
}
```

---

## 📡 REST API Endpoints

### Base Path: `/api`

All REST API endpoints are prefixed with `/api/` and return JSON.

---

### 1. **GET /api/events** - List Active Events

Get all active events with recent line movements.

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `sport` | string | No | - | Filter by sport (NFL, NBA, MLB, NHL, etc.) |
| `limit` | number | No | 100 | Max results (1-500) |
| `offset` | number | No | 0 | Pagination offset |

**Example Request:**
```bash
curl "https://betting-brain-v3.nolarose1968-806.workers.dev/api/events?sport=NFL&limit=50"
```

**Example Response:**
```json
{
  "events": [
    {
      "eventID": "nfl_2024_wk5_chiefs_vs_49ers",
      "lastUpdate": "2025-10-07T14:30:00.000Z",
      "marketCount": 15
    }
  ],
  "total": 25,
  "limit": 50,
  "offset": 0,
  "requestId": "abc123",
  "timestamp": "2025-10-07T14:45:00.000Z"
}
```

---

### 2. **GET /api/exposure** - Real-Time Exposure

Get current betting exposure metrics by event, market, or customer.

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `agentID` | string | **Yes** | - | Agent ID (e.g., "DEMO") |
| `eventID` | string | No | - | Specific event ID |
| `sport` | string | No | - | Filter by sport |
| `exposureLevel` | string | No | - | Filter: LOW, MEDIUM, HIGH, CRITICAL |

**Example Request:**
```bash
curl "https://betting-brain-v3.nolarose1968-806.workers.dev/api/exposure?agentID=DEMO&exposureLevel=HIGH"
```

**Example Response:**
```json
{
  "agentID": "DEMO",
  "summary": {
    "totalRisk": 5420000,
    "totalNet": -3800000,
    "eventCount": 12,
    "highRiskEvents": 3
  },
  "events": [
    {
      "eventID": "nfl_2024_wk5_chiefs_vs_49ers",
      "totalRisk": 1200000,
      "netExposure": -850000,
      "level": "HIGH"
    }
  ],
  "requestId": "abc123",
  "timestamp": "2025-10-07T14:45:00.000Z"
}
```

---

### 3. **GET /api/sharp-customers** - Sharp Customer List

Get list of customers with high sharp scores.

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `agentID` | string | **Yes** | - | Agent ID |
| `threshold` | number | No | 60 | Minimum sharp score (0-100) |
| `limit` | number | No | 50 | Max results (1-100) |

**Example Request:**
```bash
curl "https://betting-brain-v3.nolarose1968-806.workers.dev/api/sharp-customers?agentID=DEMO&threshold=70"
```

**Example Response:**
```json
{
  "agentID": "DEMO",
  "customers": [
    {
      "customerID": "cust_12345",
      "sharpScore": 85,
      "CLV": 3.2,
      "winRate": 58.5,
      "actionCount": 245
    }
  ],
  "total": 12,
  "threshold": 70,
  "requestId": "abc123",
  "timestamp": "2025-10-07T14:45:00.000Z"
}
```

---

### 4. **GET /api/steam-moves** - Recent Steam Moves

Get recent rapid line movements (steam moves).

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `eventID` | string | No | - | Filter by event |
| `marketType` | string | No | - | Filter by market (MONEYLINE, SPREAD, TOTAL) |
| `limit` | number | No | 50 | Max results (1-100) |

**Example Request:**
```bash
curl "https://betting-brain-v3.nolarose1968-806.workers.dev/api/steam-moves?limit=20"
```

**Example Response:**
```json
{
  "steamMoves": [
    {
      "eventID": "nfl_2024_wk5_chiefs_vs_49ers",
      "marketType": "SPREAD",
      "timestamp": "2025-10-07T14:42:15.000Z"
    }
  ],
  "total": 8,
  "requestId": "abc123",
  "timestamp": "2025-10-07T14:45:00.000Z"
}
```

---

### 5. **GET /api/clv** - CLV Analysis

Get Closing Line Value analysis for customers.

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `agentID` | string | **Yes** | - | Agent ID |
| `customerID` | string | No | - | Specific customer |
| `startDate` | string | No | - | Start date (YYYY-MM-DD) |
| `endDate` | string | No | - | End date (YYYY-MM-DD) |
| `threshold` | number | No | -2.0 | CLV threshold (%) |

**Example Request:**
```bash
curl "https://betting-brain-v3.nolarose1968-806.workers.dev/api/clv?agentID=DEMO&startDate=2025-10-01&endDate=2025-10-07"
```

**Example Response:**
```json
{
  "agentID": "DEMO",
  "customers": [
    {
      "customerID": "cust_12345",
      "CLV": 3.2,
      "totalBets": 125,
      "avgCLV": 2.8,
      "positiveCLV": 85
    }
  ],
  "summary": {
    "totalCustomers": 245,
    "avgCLV": 1.5,
    "positiveCustomers": 145
  },
  "requestId": "abc123",
  "timestamp": "2025-10-07T14:45:00.000Z"
}
```

---

### 6. **GET /api/hold** - Hold Percentage Analysis

Get hold percentage and volume metrics by market.

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `agentID` | string | **Yes** | - | Agent ID |
| `eventID` | string | No | - | Specific event |
| `marketType` | string | **Yes** | - | Market type (required) |
| `startDate` | string | No | - | Start date (YYYY-MM-DD) |
| `endDate` | string | No | - | End date (YYYY-MM-DD) |

**Example Request:**
```bash
curl "https://betting-brain-v3.nolarose1968-806.workers.dev/api/hold?agentID=DEMO&marketType=SPREAD"
```

**Example Response:**
```json
{
  "agentID": "DEMO",
  "marketType": "SPREAD",
  "holdPercentage": 5.2,
  "totalVolume": 12500000,
  "profit": 650000,
  "betCount": 2450,
  "requestId": "abc123",
  "timestamp": "2025-10-07T14:45:00.000Z"
}
```

---

### 7. **GET /api/markets** - List Markets

Get list of markets with activity.

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `eventID` | string | No | - | Filter by event |
| `marketType` | string | No | - | Filter by market type |

**Example Request:**
```bash
curl "https://betting-brain-v3.nolarose1968-806.workers.dev/api/markets?eventID=nfl_2024_wk5_chiefs_vs_49ers"
```

**Example Response:**
```json
{
  "markets": [
    {
      "marketType": "SPREAD",
      "updateCount": 45,
      "lastUpdate": "2025-10-07T14:42:00.000Z"
    },
    {
      "marketType": "TOTAL",
      "updateCount": 38,
      "lastUpdate": "2025-10-07T14:41:00.000Z"
    }
  ],
  "total": 5,
  "requestId": "abc123",
  "timestamp": "2025-10-07T14:45:00.000Z"
}
```

---

### 8. **GET /api/customers** - Customer Analytics

Get customer analytics and metrics.

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `agentID` | string | **Yes** | - | Agent ID |
| `limit` | number | No | 100 | Max results (1-500) |

**Example Request:**
```bash
curl "https://betting-brain-v3.nolarose1968-806.workers.dev/api/customers?agentID=DEMO&limit=50"
```

**Example Response:**
```json
{
  "customers": [
    {
      "customerID": "cust_12345",
      "CLV": 3.2,
      "winRate": 58.5,
      "actionCount": 245,
      "netBets": 125000,
      "lastUpdate": "2025-10-07T14:30:00.000Z"
    }
  ],
  "total": 50,
  "agentID": "DEMO",
  "requestId": "abc123",
  "timestamp": "2025-10-07T14:45:00.000Z"
}
```

---

### 9. **GET /api/stats** - System Statistics

Get system-wide statistics and health metrics.

**No Parameters Required**

**Example Request:**
```bash
curl "https://betting-brain-v3.nolarose1968-806.workers.dev/api/stats"
```

**Example Response:**
```json
{
  "lineMovements": {
    "last24Hours": 12450
  },
  "steamMoves": {
    "lastHour": 23
  },
  "customers": {
    "activeLastWeek": 1245
  },
  "storage": {
    "kvRecords": 450,
    "kvSizeEstimate": "4.39 KB"
  },
  "system": {
    "version": "3.0.0",
    "uptime": "N/A (Cloudflare Workers)",
    "requestId": "abc123"
  },
  "timestamp": "2025-10-07T14:45:00.000Z"
}
```

---

## 🔧 Intelligence Tools

### Base Path: `/tools`

Direct access to intelligence tool endpoints (also accessible via MCP).

---

### **POST /tools/getBettingExposure**

See [MCP_ENDPOINTS.md](MCP_ENDPOINTS.md#getbettingexposure) for full details.

**Request Body:**
```json
{
  "agentID": "DEMO",
  "eventID": "nfl_2024_wk5_chiefs_vs_49ers",
  "exposureLevel": "HIGH"
}
```

---

### **POST /tools/getCLV**

See [MCP_ENDPOINTS.md](MCP_ENDPOINTS.md#getclv) for full details.

---

### **POST /tools/getSharpScore**

See [MCP_ENDPOINTS.md](MCP_ENDPOINTS.md#getsharpscore) for full details.

---

### **POST /tools/getHoldPercentage**

See [MCP_ENDPOINTS.md](MCP_ENDPOINTS.md#getholdpercentage) for full details.

---

## ⚠️ Error Handling

All endpoints return standardized error responses.

### Error Response Format

```json
{
  "error": "VALIDATION_ERROR",
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "details": {
    "errors": [
      "agentID is required",
      "limit must be at most 500"
    ]
  },
  "requestId": "abc123",
  "timestamp": "2025-10-07T14:45:00.000Z",
  "path": "/api/events"
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `BAD_REQUEST` | 400 | Invalid request format |
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Access denied |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMIT` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Internal server error |
| `DATABASE_ERROR` | 500 | Database query failed |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |
| `TIMEOUT` | 504 | Request timeout |

---

## 📊 Response Format

All successful responses include:

```json
{
  // ... response data ...
  "requestId": "abc123",
  "timestamp": "2025-10-07T14:45:00.000Z"
}
```

- `requestId`: Unique identifier for request tracking
- `timestamp`: ISO 8601 timestamp of response

---

## 🚀 Rate Limiting

**Current:** 10 requests/second per IP (in-memory, per-worker instance)

**Recommended for Production:**
- Implement Cloudflare Durable Objects for distributed rate limiting
- Add API key-based rate limiting
- Different limits for different tiers

**Rate Limit Headers** (future):
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1696723456
```

---

## 🔍 Validation Rules

### Common Validations

**agentID:**
- Required: Yes (most endpoints)
- Type: string
- Format: Alphanumeric, underscores, hyphens
- Length: 1-100 characters

**eventID:**
- Required: No (optional filter)
- Type: string
- Length: 1-100 characters

**marketType:**
- Required: Varies by endpoint
- Type: string
- Enum: `MONEYLINE`, `SPREAD`, `TOTAL`, `PROP`, `FUTURE`, `PARLAY`

**sport:**
- Required: No
- Type: string
- Enum: `NFL`, `NBA`, `MLB`, `NHL`, `NCAAF`, `NCAAB`, `SOCCER`, `MMA`, `BOXING`, `TENNIS`, `GOLF`

**limit:**
- Required: No
- Type: number
- Range: 1-500 (some endpoints: 1-1000)
- Default: Varies by endpoint

**dates:**
- Required: No
- Type: string
- Format: `YYYY-MM-DD`
- Example: `2025-10-07`

---

## 📚 Related Documentation

- **[MCP_ENDPOINTS.md](MCP_ENDPOINTS.md)** - Complete MCP API reference (13 tools)
- **[ENDPOINT_DASHBOARD_INTEGRATION.md](ENDPOINT_DASHBOARD_INTEGRATION.md)** - Dashboard integration guide
- **[MCP_VERIFICATION_REPORT.md](MCP_VERIFICATION_REPORT.md)** - MCP verification results
- **[SRC_DIRECTORY_REVIEW.md](SRC_DIRECTORY_REVIEW.md)** - Codebase analysis

---

## 🧪 Testing Examples

### Using cURL

```bash
# Health check
curl https://betting-brain-v3.nolarose1968-806.workers.dev/health

# Get events
curl "https://betting-brain-v3.nolarose1968-806.workers.dev/api/events?sport=NFL"

# Get exposure
curl "https://betting-brain-v3.nolarose1968-806.workers.dev/api/exposure?agentID=DEMO"

# Get system stats
curl https://betting-brain-v3.nolarose1968-806.workers.dev/api/stats
```

### Using JavaScript

```javascript
const API_URL = 'https://betting-brain-v3.nolarose1968-806.workers.dev';

// Get events
const events = await fetch(`${API_URL}/api/events?sport=NFL&limit=50`)
  .then(r => r.json());

// Get sharp customers
const sharpCustomers = await fetch(`${API_URL}/api/sharp-customers?agentID=DEMO&threshold=70`)
  .then(r => r.json());

// Get system stats
const stats = await fetch(`${API_URL}/api/stats`)
  .then(r => r.json());
```

### Using Python

```python
import requests

API_URL = 'https://betting-brain-v3.nolarose1968-806.workers.dev'

# Get events
events = requests.get(f'{API_URL}/api/events', params={
    'sport': 'NFL',
    'limit': 50
}).json()

# Get exposure
exposure = requests.get(f'{API_URL}/api/exposure', params={
    'agentID': 'DEMO',
    'exposureLevel': 'HIGH'
}).json()

# Get stats
stats = requests.get(f'{API_URL}/api/stats').json()
```

---

## ✅ API Status

| Category | Status | Endpoints |
|----------|--------|-----------|
| **REST API** | ✅ Complete | 9 endpoints |
| **Intelligence Tools** | ✅ Complete | 4 endpoints |
| **MCP Protocol** | ✅ Complete | 13 tools |
| **System** | ✅ Complete | 3 endpoints |
| **Validation** | ✅ Comprehensive | All endpoints |
| **Error Handling** | ✅ Standardized | All endpoints |
| **CORS** | ✅ Enabled | All endpoints |
| **Documentation** | ✅ Complete | This document |

---

**Total Endpoints:** 26 (9 REST + 4 intelligence + 13 MCP + 3 system)  
**Status:** ✅ **PRODUCTION-READY**

---

**Generated:** 2025-10-07  
**Maintainer:** Betting-Brain Team  
**API Version:** 3.0.0

