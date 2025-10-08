# 🎯 Fantasy402.com Data Integration Guide

Complete guide for ingesting real-time data from Fantasy402.com into Betting-Brain v3.

---

## 📊 What Gets Captured

The browser extension intercepts and forwards all Fantasy402.com API calls to your Cloudflare Worker:

### Authentication
- **Endpoint**: `/cloud/api/System/authenticateCustomer`
- **Captures**: Customer ID, JWT tokens, login timestamps
- **Storage**: Tokens → `TOKEN_STORE` KV namespace

### Account Info
- **Endpoint**: `/cloud/api/Manager/getAccountInfoOwner`
- **Captures**: Agent ID, account details, balances
- **Storage**: D1 → `fantasy402_raw_feed` table

### Weekly Figures
- **Endpoint**: `/cloud/api/Manager/getWeeklyFigureByAgentLite`
- **Captures**: Win/loss data, betting volumes, by-day breakdowns
- **Storage**: D1 → `fantasy402_raw_feed` table

### Agent Lists
- **Endpoint**: `/cloud/api/Manager/getListAgenstByAgent`
- **Captures**: Agent hierarchies, downstream agents
- **Storage**: D1 → `fantasy402_raw_feed` table

### More Endpoints
- Config/reports
- Sports types
- Authorizations
- Messages
- Customer analytics

---

## 🚀 Setup Instructions

### Step 1: Deploy Worker (Already Done ✅)

Your worker is already deployed:
- **URL**: `https://betting-brain-v3.nolarose1968-806.workers.dev`
- **Ingestion Endpoint**: `/api/fantasy402/ingest`

Test the ingestion endpoint:
```bash
curl https://betting-brain-v3.nolarose1968-806.workers.dev/health
# Should return: { "status": "healthy", "version": "3.0.0" }
```

---

### Step 2: Install Browser Extension

#### Load Extension in Chrome

1. **Open Chrome Extensions:**
   ```
   chrome://extensions/
   ```

2. **Enable Developer Mode:**
   - Toggle "Developer mode" in the top-right corner

3. **Load Extension:**
   - Click "Load unpacked"
   - Navigate to: `/Users/nolarose/ffffff/browser-extension/`
   - Select the folder

4. **Verify Installation:**
   - Extension icon appears in Chrome toolbar
   - Extension name: "BetTicker Debug Extension"

---

### Step 3: Test Data Capture

1. **Open Fantasy402.com:**
   ```
   https://fantasy402.com/
   ```

2. **Login:**
   - Use your credentials: `BILLY666` / `BACKDOOR69`

3. **Open Browser Console:**
   - Press `F12` or `Cmd+Option+I`
   - Check for logs:
     ```
     [Fantasy402] 🚀 Interceptor initialized
     [Fantasy402] 📡 Worker URL: https://betting-brain-v3.nolarose1968-806.workers.dev
     [Fantasy402] 🎯 Monitoring endpoints: [...]
     ```

4. **Watch for Interceptions:**
   - As you navigate the site, you'll see:
     ```
     [Fantasy402] 🔍 Intercepting: https://fantasy402.com/cloud/api/Manager/getAccountInfoOwner
     [Fantasy402] ✅ Forwarded to worker: /cloud/api/Manager/getAccountInfoOwner
     ```

---

### Step 4: Verify Data in Worker

#### Check Worker Logs

```bash
# Stream worker logs
wrangler tail --env=""

# You should see:
# [${requestId}] 📥 Fantasy402 data: /cloud/api/Manager/getAccountInfoOwner, getAccountInfoOwner
# [${requestId}] ✅ Stored in KV: fantasy402:...
# [${requestId}] ✅ Stored in D1: ...
```

#### Query Stored Data

```bash
# Check KV storage
wrangler kv key list --namespace-id=e8ea80789b5246e58ea95798f04d0047

# Check D1 database
wrangler d1 execute fantasy42-raw-feed --remote --command="SELECT COUNT(*) FROM fantasy402_raw_feed"
```

---

## 🗄️ Database Schema

The intercepted data is stored in the `fantasy402_raw_feed` table:

```sql
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
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_fantasy402_timestamp ON fantasy402_raw_feed(timestamp);
CREATE INDEX idx_fantasy402_endpoint ON fantasy402_raw_feed(endpoint);
CREATE INDEX idx_fantasy402_operation ON fantasy402_raw_feed(operation);
CREATE INDEX idx_fantasy402_agent ON fantasy402_raw_feed(agent_id);
```

---

## 📊 Query Examples

### Get Recent Authentication Attempts

```sql
SELECT 
  timestamp,
  customer_id,
  response_status,
  duration_ms
FROM fantasy402_raw_feed
WHERE operation = 'authenticateCustomer'
ORDER BY timestamp DESC
LIMIT 10;
```

### Get Weekly Figures by Agent

```sql
SELECT 
  agent_id,
  response_body,
  timestamp
FROM fantasy402_raw_feed
WHERE operation = 'getWeeklyFigureByAgentLite'
  AND agent_id = 'BILLY666'
ORDER BY timestamp DESC
LIMIT 1;
```

### Get All Endpoints Hit Today

```sql
SELECT 
  endpoint,
  COUNT(*) as hit_count,
  AVG(duration_ms) as avg_duration_ms
FROM fantasy402_raw_feed
WHERE timestamp > datetime('now', '-1 day')
GROUP BY endpoint
ORDER BY hit_count DESC;
```

---

## 🔍 Debugging

### Check Extension Status

```javascript
// In browser console on fantasy402.com
console.log('Interceptor active:', typeof window.fetch !== 'function');
```

### Check KV Storage

```bash
# List recent keys
wrangler kv key list --namespace-id=e8ea80789b5246e58ea95798f04d0047 --limit=10

# Get specific key
wrangler kv key get "fantasy402:2025-10-08_..." --namespace-id=e8ea80789b5246e58ea95798f04d0047
```

### Check D1 Database

```bash
# Count records
wrangler d1 execute fantasy42-raw-feed --remote \
  --command="SELECT COUNT(*) as count FROM fantasy402_raw_feed"

# Get recent records
wrangler d1 execute fantasy42-raw-feed --remote \
  --command="SELECT * FROM fantasy402_raw_feed ORDER BY id DESC LIMIT 5"
```

---

## 🚨 Troubleshooting

### Issue: Extension Not Intercepting

**Solution:**
1. Check extension is loaded:
   ```
   chrome://extensions/
   ```
2. Check content script is injected:
   - Open console on fantasy402.com
   - Look for initialization log: `[Fantasy402] 🚀 Interceptor initialized`

3. Reload extension:
   - Click "Reload" button in chrome://extensions/

---

### Issue: Data Not Reaching Worker

**Solution:**
1. Check worker is accessible:
   ```bash
   curl https://betting-brain-v3.nolarose1968-806.workers.dev/health
   ```

2. Check CORS (should be open for `*`):
   ```bash
   curl -I -X OPTIONS \
     https://betting-brain-v3.nolarose1968-806.workers.dev/api/fantasy402/ingest
   ```

3. Check browser console for errors:
   - Look for `[Fantasy402] ❌ Failed to forward:` logs

---

### Issue: D1 Table Doesn't Exist

**Solution:**
```bash
# Create table manually
wrangler d1 execute fantasy42-raw-feed --remote --command="
CREATE TABLE IF NOT EXISTS fantasy402_raw_feed (
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
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);"
```

---

## 📈 Next Steps

Once data is flowing:

1. **Build Dashboards** - Visualize agent performance
2. **Create Alerts** - Monitor suspicious activity
3. **Analyze Patterns** - Identify sharp bettors
4. **Compare Data** - Cross-reference with BetTicker data
5. **Export Reports** - Generate weekly summaries

---

## 🔗 Related Documentation

- [MCP Integration](../MCP_INTEGRATION_STATUS.md) - MCP protocol setup
- [REST API Reference](../REST_API_REFERENCE.md) - API endpoints
- [Cloudflare Setup](./CLOUDFLARE_WRANGLER_SETUP.md) - Worker deployment

---

**Status:** ✅ **READY FOR DATA INGESTION**

Your worker is deployed and the browser extension is configured. Just load the extension and navigate to fantasy402.com to start capturing data!

