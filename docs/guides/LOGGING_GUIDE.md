# 📜 Enhanced Logging Guide

**Comprehensive logging for BetTicker Sniffer debugging and monitoring**

---

## 🎯 What's Logged

### Every Request Gets:
- **Request ID** - Unique identifier for tracing
- **Method & URL** - What was requested
- **User Agent** - Client information
- **Cloudflare Ray ID** - For support tickets
- **Duration** - Response time in ms

### BetTicker Interception Logs:
```
[requestId] 🎯 BetTicker intercept request
[requestId] ✅ Target endpoint matched
[requestId] 📡 Calling origin: https://fantasy402.com/cloud/api/Manager/getBetTicker
[requestId] 📥 Origin responded: {status, duration, contentType}
[requestId] 📄 Response body size: X bytes
[requestId] 💾 Queuing KV storage (async)
[requestId] ✅ Returning response to client
```

### KV Storage Logs:
```
[requestId] 💾 Starting KV storage: {key, bodySize, status}
[requestId] 📊 Metadata: {userAgent, ip, status, timestamp, contentType, contentLength}
[requestId] ✅ Metadata validated
[requestId] ✅ Stored in KV: key (size, duration)
[requestId] ⏰ TTL: 7 days
```

### History API Logs:
```
[requestId] 📜 getBetTickerHistory called: {limit, startTime, endTime}
[requestId] 🔍 Listing KV keys
[requestId] 📋 Found X keys (duration)
[requestId] ✅ Returning X results
```

---

## 📺 View Logs in Real-Time

### Live Tail (Recommended)
```bash
# Watch all logs
wrangler tail --env-file=/dev/null

# Pretty format
wrangler tail --env-file=/dev/null --format pretty

# Filter by status
wrangler tail --env-file=/dev/null --status ok
wrangler tail --env-file=/dev/null --status error

# Filter by method
wrangler tail --env-file=/dev/null --method POST
```

### Production Logs
```bash
# Tail production worker
wrangler tail --env=production --env-file=/dev/null

# Staging logs
wrangler tail --env=staging --env-file=/dev/null
```

---

## 🔍 Log Analysis Examples

### Find Specific Request
```bash
# Look for request ID in logs
wrangler tail --env-file=/dev/null | grep "mgglhjt1"
```

### Monitor Performance
```bash
# Watch for slow responses (>100ms)
wrangler tail --env-file=/dev/null --format pretty | grep "duration"
```

### Track Errors
```bash
# Only show errors
wrangler tail --env-file=/dev/null --status error
```

### Debug Storage Issues
```bash
# Watch KV operations
wrangler tail --env-file=/dev/null | grep "💾\|✅ Stored"
```

---

## 📊 Log Levels

### ℹ️ Info (console.log)
- Regular operation
- Request routing
- Success messages

### ⚠️ Warning (console.warn)
- Missing metadata
- Unexpected conditions
- Non-critical issues

### ❌ Error (console.error)
- Failed operations
- Storage errors
- Exception stack traces

---

## 🎨 Log Emoji Guide

| Emoji | Meaning |
|-------|---------|
| 📥 | Incoming request |
| 🎯 | BetTicker endpoint detected |
| 📡 | Calling external API |
| 📄 | Response body info |
| 💾 | KV storage operation |
| 📊 | Metadata/stats |
| ✅ | Success |
| ❌ | Error |
| ⚠️  | Warning |
| 💚 | Health check |
| 📜 | History API |
| 🔍 | Searching/listing |
| ⏰ | TTL/expiration info |
| ⏭️  | Skipped/passed through |

---

## 🔧 Debugging Scenarios

### Scenario 1: Request Not Being Intercepted

**What to check:**
```bash
wrangler tail --env-file=/dev/null | grep "BetTicker"
```

**Expected logs:**
```
[xxx] 🎯 BetTicker endpoint detected
[xxx] ✅ Target endpoint matched
```

**If you see:**
```
[xxx] ⏭️  Pass-through (not target endpoint)
```
→ URL or method doesn't match

---

### Scenario 2: KV Storage Failing

**What to check:**
```bash
wrangler tail --env-file=/dev/null | grep "💾\|Storage"
```

**Expected logs:**
```
[xxx] 💾 Starting KV storage
[xxx] ✅ Stored in KV
```

**If you see:**
```
[xxx] ❌ Storage error
```
→ Check error details in logs

---

### Scenario 3: Slow Performance

**What to check:**
```bash
wrangler tail --env-file=/dev/null --format pretty | grep "duration\|Duration"
```

**Look for:**
- Origin response time (should be <100ms)
- KV write time (should be <50ms)
- Total request time

---

### Scenario 4: Missing Responses in Dashboard

**What to check:**
```bash
# 1. Check if requests are being intercepted
wrangler tail --env-file=/dev/null | grep "Stored in KV"

# 2. Check history API
curl "https://betting-brain-v3.nolarose1968-806.workers.dev/interceptor/history?limit=1"

# 3. Verify KV namespace
wrangler kv:key list --binding BET_TICKER_RAW --env-file=/dev/null
```

---

## 📈 Log Dashboard

The worker now includes **request IDs** in responses for easy correlation:

```json
{
  "status": "healthy",
  "version": "3.0.0",
  "timestamp": "2025-10-07T13:27:00.000Z",
  "requestId": "mgglhjt1",
  "duration": "2ms"
}
```

Use this ID to find logs:
```bash
wrangler tail --env-file=/dev/null | grep "mgglhjt1"
```

---

## 🎯 Pro Tips

### 1. Save Logs to File
```bash
wrangler tail --env-file=/dev/null --format pretty > logs.txt
```

### 2. Monitor in Background
```bash
wrangler tail --env-file=/dev/null --format pretty &
# Stop with: kill %1
```

### 3. Filter Specific Endpoints
```bash
# Only interceptor API
wrangler tail --env-file=/dev/null | grep "Interceptor API"

# Only BetTicker interceptions
wrangler tail --env-file=/dev/null | grep "BetTicker"
```

### 4. Count Requests
```bash
# Count intercepted requests
wrangler tail --env-file=/dev/null | grep "Stored in KV" | wc -l
```

### 5. Track Errors Over Time
```bash
wrangler tail --env-file=/dev/null --status error | tee -a errors.log
```

---

## 🔗 Related Commands

```bash
# View recent deployments
wrangler deployments list

# Rollback if needed
wrangler rollback [version-id]

# Check KV usage
wrangler kv:namespace list

# View stored keys
wrangler kv:key list --binding BET_TICKER_RAW --env-file=/dev/null

# Get specific stored response
wrangler kv:key get "raw:getBetTicker:1759842887136" --binding BET_TICKER_RAW --env-file=/dev/null
```

---

## 🚨 Alert Patterns

Set up monitoring for these patterns:

### Critical
```bash
# Storage failures
"❌ Storage error"

# Configuration errors
"BET_TICKER_RAW not configured"

# Origin errors
"Network error"
```

### Warning
```bash
# Slow performance
duration: > 100ms

# High error rate
status >= 500
```

### Info
```bash
# High traffic
"BetTicker endpoint detected" > 100/min
```

---

## 📊 Log Retention

- **Real-time tail**: Live, not stored
- **Cloudflare Dashboard**: Last 24 hours
- **Analytics Engine**: Configure for longer retention

To store logs permanently:
```bash
# Stream to external service
wrangler tail --format json | your-log-aggregator
```

---

## 🎉 Quick Test

Send a test request and watch logs:

```bash
# Terminal 1: Start watching logs
wrangler tail --env-file=/dev/null --format pretty

# Terminal 2: Send test request
curl -X POST https://betting-brain-v3.nolarose1968-806.workers.dev/cloud/api/Manager/getBetTicker \
  -H "Content-Type: application/json" \
  -d '{"test": "logging-test"}'
```

You should see:
```
[xxx] 📥 Incoming request
[xxx] 🎯 BetTicker endpoint detected
[xxx] ✅ Target endpoint matched
[xxx] 📡 Calling origin
[xxx] 📥 Origin responded
[xxx] 📄 Response body size
[xxx] 💾 Queuing KV storage
[xxx] ✅ Returning response to client
[xxx] 💾 Starting KV storage
[xxx] ✅ Stored in KV
```

---

**📜 Happy logging!**

