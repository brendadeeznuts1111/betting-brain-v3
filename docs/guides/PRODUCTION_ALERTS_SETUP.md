# 🚨 Production Alerts Setup Guide

**Time to Complete:** 15 minutes  
**Prerequisites:** Cloudflare account, Telegram account  
**Criticality:** Required for production

---

## 🎯 Quick Start

We'll set up 3 critical alerts that catch 95% of production issues:

1. **Worker Error Rate** - First line of defense
2. **Queue Back-Pressure** - Detect async pipeline issues
3. **D1 Query Latency** - Database performance monitoring

---

## 📱 Step 1: Create Telegram Bot (5 minutes)

### 1.1 Create Bot

```
1. Open Telegram
2. Search for: @BotFather
3. Send: /newbot
4. Follow prompts:
   - Bot name: "Betting Brain Alerts"
   - Username: "betting_brain_alerts_bot"
5. Save the TOKEN: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz
```

### 1.2 Get Chat ID

```
1. Start chat with your new bot
2. Send any message: "Hello"
3. Visit: https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
4. Find "chat":{"id":123456789}
5. Save the CHAT_ID: 123456789
```

### 1.3 Test Webhook

```bash
# Replace with your values
export BOT_TOKEN="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
export CHAT_ID="123456789"

# Test message
curl -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
  -H "Content-Type: application/json" \
  -d "{
    \"chat_id\": \"${CHAT_ID}\",
    \"text\": \"🧪 Test alert from Betting Brain\",
    \"parse_mode\": \"HTML\"
  }"

# You should receive the message in Telegram!
```

---

## 🔧 Step 2: Configure Cloudflare Alerts (10 minutes)

### 2.1 Worker Error Rate Alert

```
1. Go to: Cloudflare Dashboard
2. Click: Workers & Pages
3. Select: betting-brain-v3
4. Click: Alerts tab
5. Click: "Add Alert"

Alert Configuration:
├─ Alert Type: "Worker Error Rate"
├─ Worker: betting-brain-v3
├─ Condition: Error rate
│   ├─ Threshold: ≥ 1 %
│   └─ Duration: ≥ 2 minutes
├─ Notification:
│   ├─ Type: Webhook
│   ├─ Name: "Telegram Alerts"
│   └─ URL: See "Webhook URL" section below
└─ Message Template: See "Message Templates" section
```

**Webhook URL:**
```
https://api.telegram.org/bot<BOT_TOKEN>/sendMessage
```

**Body Template:**
```json
{
  "chat_id": "<CHAT_ID>",
  "text": "🔥 <b>Worker Error Rate Alert</b>\n\nWorker: betting-brain-v3\nError Rate: {{error_rate}}%\nTime: {{timestamp}}\n\n<a href='https://dash.cloudflare.com'>View Dashboard</a>",
  "parse_mode": "HTML"
}
```

---

### 2.2 Queue Back-Pressure Alert

```
1. Go to: Cloudflare Dashboard
2. Click: Queues
3. Select: fantasy402-logs
4. Click: Alerts tab
5. Click: "Add Alert"

Alert Configuration:
├─ Alert Type: "Queue Depth"
├─ Queue: fantasy402-logs
├─ Condition: Messages queued
│   ├─ Threshold: ≥ 1,000 messages
│   └─ Duration: ≥ 5 minutes
├─ Notification:
│   ├─ Type: Webhook
│   ├─ Name: "Telegram Alerts"
│   └─ URL: https://api.telegram.org/bot<TOKEN>/sendMessage
└─ Body: See template below
```

**Body Template:**
```json
{
  "chat_id": "<CHAT_ID>",
  "text": "⚠️ <b>Queue Back-Pressure Alert</b>\n\nQueue: fantasy402-logs\nDepth: {{queue_depth}} messages\nTime: {{timestamp}}\n\nAction: Check consumer worker health\n\n<a href='https://dash.cloudflare.com/queues'>View Queue</a>",
  "parse_mode": "HTML"
}
```

---

### 2.3 D1 Query Latency Alert

```
1. Go to: Cloudflare Dashboard
2. Click: D1
3. Select: RAW_FEED_DB
4. Click: Alerts tab
5. Click: "Add Alert"

Alert Configuration:
├─ Alert Type: "Query Latency"
├─ Database: RAW_FEED_DB
├─ Condition: P95 query latency
│   ├─ Threshold: ≥ 400 ms
│   └─ Duration: ≥ 5 minutes
├─ Notification:
│   ├─ Type: Webhook
│   ├─ Name: "Telegram Alerts"
│   └─ URL: https://api.telegram.org/bot<TOKEN>/sendMessage
└─ Body: See template below
```

**Body Template:**
```json
{
  "chat_id": "<CHAT_ID>",
  "text": "🐌 <b>D1 Latency Alert</b>\n\nDatabase: RAW_FEED_DB\nP95 Latency: {{p95_latency}}ms\nTime: {{timestamp}}\n\nAction: Check for SQLITE_BUSY errors\n\n<a href='https://dash.cloudflare.com/d1'>View Database</a>",
  "parse_mode": "HTML"
}
```

---

## 🧪 Step 3: Test Alerts (5 minutes)

### 3.1 Test Error Rate Alert

**Option A: Intentional Error**

```typescript
// In src/index.ts, temporarily add:
if (url.pathname === '/test-error') {
    throw new Error('🧪 Canary error for testing alerts');
}

// Deploy
wrangler deploy

// Trigger
for i in {1..100}; do
    curl https://betting-brain-v3.nolarose1968-806.workers.dev/test-error
done

// Wait 2-3 minutes for alert to fire
// Remove test code and redeploy
```

**Option B: Simulate via Dashboard**

```
1. Go to: Workers → betting-brain-v3 → Alerts
2. Click: "Test" next to Error Rate alert
3. Should receive Telegram message
```

---

### 3.2 Test Queue Alert

```bash
# Publish test messages to queue
for i in {1..2000}; do
    echo '{"test": "message", "id": '$i'}' | \
    wrangler queue send fantasy402-logs
done

# Check queue depth
wrangler queues list

# Alert should fire within 5 minutes
# Clean up: Let consumer drain the queue
```

---

### 3.3 Test D1 Latency Alert

```typescript
// In src/api/routes.ts, temporarily add slow query:
if (url.pathname === '/test-slow-query') {
    await env.RAW_FEED_DB.prepare(`
        SELECT * FROM fantasy402_raw_feed
        ORDER BY timestamp DESC
        LIMIT 10000  -- Intentionally slow
    `).all();
    return new Response('OK');
}

// Trigger 100 times
for i in {1..100}; do
    curl https://betting-brain-v3.nolarose1968-806.workers.dev/test-slow-query
done

// Wait 5 minutes for alert
// Remove test code
```

---

## 📊 Step 4: Add Structured Logging (10 minutes)

### 4.1 Update Worker Code

```typescript
// In src/index.ts
import { createLogger, logMetric } from './utils/logger';

export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        // Create logger with trace ID
        const logger = createLogger(request);
        const startTime = Date.now();

        try {
            logger.info('request_started', {
                method: request.method,
                path: new URL(request.url).pathname
            });

            // Your request handling...
            const response = await handleRequest(request, env, ctx);

            // Log success
            const latencyMs = Date.now() - startTime;
            logger.info('request_completed', {
                status: response.status,
                latencyMs
            });

            // Send to Analytics Engine
            logMetric(env, 'api_request', {
                endpoint: new URL(request.url).pathname,
                status: response.status,
                latencyMs
            });

            return response;

        } catch (error) {
            // Log error with full context
            const latencyMs = Date.now() - startTime;
            logger.error('request_failed', {
                latencyMs,
                errorType: error.constructor.name
            }, error);

            throw error;
        }
    }
};
```

### 4.2 Query Logs in LogExplorer

```sql
-- In Cloudflare Dashboard → Analytics → Logs

-- Find slow requests
SELECT 
    message,
    context.path,
    context.latencyMs,
    timestamp
FROM logs
WHERE level = 'info'
AND message = 'request_completed'
AND context.latencyMs > 1000
ORDER BY timestamp DESC
LIMIT 100

-- Find errors by type
SELECT 
    context.errorType,
    COUNT(*) as count
FROM logs
WHERE level = 'error'
AND timestamp > NOW() - INTERVAL '1' HOUR
GROUP BY context.errorType
ORDER BY count DESC
```

---

## 🔍 Step 5: Advanced Monitoring (Optional - 30 minutes)

### 5.1 Custom Metrics Dashboard

```typescript
// In src/utils/logger.ts, add custom metrics

export function logBusinessMetric(
    env: { ANALYTICS_ENGINE?: any },
    metric: string,
    value: number,
    metadata?: Record<string, string>
): void {
    if (!env.ANALYTICS_ENGINE) return;

    env.ANALYTICS_ENGINE.writeDataPoint({
        blobs: [metric],
        doubles: [value, Date.now()],
        indexes: [
            metadata?.agentId || 'unknown',
            metadata?.sport || 'unknown'
        ]
    });
}

// Usage
logBusinessMetric(env, 'bet_placed', amount, {
    agentId: 'BILLY666',
    sport: 'NFL'
});
```

### 5.2 Grafana Integration (Advanced)

```yaml
# grafana-datasource.yml
apiVersion: 1
datasources:
  - name: Cloudflare Analytics
    type: cloudflare-analytics
    url: https://api.cloudflare.com/client/v4
    jsonData:
      accountId: your-account-id
      zoneId: your-zone-id
    secureJsonData:
      apiToken: your-api-token
```

---

## ✅ Verification Checklist

- [ ] Telegram bot created and tested
- [ ] Worker Error Rate alert configured
- [ ] Queue Back-Pressure alert configured
- [ ] D1 Latency alert configured
- [ ] All alerts tested successfully
- [ ] Structured logging implemented
- [ ] LogExplorer queries working
- [ ] Analytics Engine receiving metrics
- [ ] Team notified of alert channels

---

## 📚 Alert Response Playbooks

When you receive an alert:

| Alert | Runbook | Response Time |
|-------|---------|---------------|
| **Worker Error Rate** | [High Error Rate](runbooks/high-error-rate.md) | < 5 min |
| **Queue Back-Pressure** | [Queue Backlog](runbooks/queue-backlog.md) | < 15 min |
| **D1 Latency** | [D1 SQLITE_BUSY](runbooks/d1-busy.md) | < 10 min |
| **Any Critical Issue** | [Rollback Now](runbooks/rollback.md) | < 5 min |

---

## 🎯 Alert Thresholds

### Conservative (Recommended for Start)

| Metric | Threshold | Duration | Rationale |
|--------|-----------|----------|-----------|
| Error Rate | ≥ 1% | 2 min | Catches issues early |
| Queue Depth | ≥ 1,000 | 5 min | Prevents backlog |
| D1 Latency | ≥ 400ms | 5 min | Before user impact |

### Aggressive (After Stable Period)

| Metric | Threshold | Duration | Rationale |
|--------|-----------|----------|-----------|
| Error Rate | ≥ 0.5% | 1 min | Faster detection |
| Queue Depth | ≥ 500 | 3 min | Earlier warning |
| D1 Latency | ≥ 200ms | 3 min | Proactive |

---

## 🔗 Related Documentation

- [Runbooks Directory](runbooks/) - Response procedures
- [Architecture Complete](ARCHITECTURE_COMPLETE.md) - System overview
- [Queue-Based Logging](QUEUE_BASED_LOGGING.md) - Async processing

---

**Status:** ✅ Production-Ready  
**Last Updated:** 2025-10-08  
**Owner:** DevOps Team

