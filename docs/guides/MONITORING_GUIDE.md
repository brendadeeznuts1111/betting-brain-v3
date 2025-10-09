# 📊 Monitoring Guide - Fantasy402 Integration

**Version:** v3.0.0  
**Last Updated:** 2025-10-08

---

## 🎯 **Quick Start**

### All-in-One Monitoring Dashboard
```bash
bun run monitor:dashboard
```

This opens:
- 📊 Web-based log viewer
- 🌐 Cloudflare Dashboard
- 📡 Real-time terminal logs

---

## 🛠️ **Individual Monitoring Tools**

### 1. **Terminal Log Monitor** 📡
Real-time logs in your terminal

```bash
bun run monitor:logs
```

**Features:**
- ✅ Auto-refreshes every 2 seconds
- ✅ Color-coded by severity
- ✅ Running statistics
- ✅ Press Ctrl+C to stop

**What you'll see:**
```
🔍 Starting Enhanced Extension Log Monitor...
📡 Worker URL: https://betting-brain-v3.nolarose1968-806.workers.dev
🆔 Session ID: monitor-1733737234567
📝 Press Ctrl+C to stop
============================================================

[2025-10-08 07:15:23] INFO: [mghmyx95] 📥 Fantasy402 data: getBetTicker
[2025-10-08 07:15:24] INFO: [mghmyx95] ✅ Queued for processing
[2025-10-08 07:15:25] INFO: [mghmyx96] 📦 Processing batch of 1 messages

Statistics:
- Total Logs: 150
- Errors: 0
- Warnings: 2
- Info: 148
- Uptime: 00:05:23
```

---

### 2. **Web Log Viewer** 🌐
Beautiful dashboard in your browser

```bash
bun run monitor:web
```

**Features:**
- ✅ Real-time log streaming
- ✅ Filter by level (ERROR, WARN, INFO, DEBUG)
- ✅ Search functionality
- ✅ Auto-scroll toggle
- ✅ Clear logs button
- ✅ Connection status indicator
- ✅ Dark theme

**URL:** `tools/logging/log-viewer.html`

**Controls:**
- **▶️ Start** - Begin fetching logs
- **⏸️ Pause** - Stop fetching (keeps current logs)
- **🗑️ Clear** - Clear all logs
- **🔍 Search** - Filter logs by text
- **📊 Filter** - Show only specific levels

---

### 3. **Worker Tail** 🔧
Official Cloudflare logs

```bash
bun run monitor:worker
```

**Features:**
- ✅ Shows all Worker requests
- ✅ Real-time streaming
- ✅ Formatted output
- ✅ Request/response details

**What you'll see:**
```
GET https://betting-brain-v3.nolarose1968-806.workers.dev/health 200 OK
[mghmyx95] 💚 Health check
[mghmyx95] ✅ Response time: 45ms

POST https://betting-brain-v3.nolarose1968-806.workers.dev/api/fantasy402/ingest 202 Accepted
[mghmyx96] 📥 Fantasy402 data: getBetTicker
[mghmyx96] ✅ Queued for processing
```

---

### 4. **Queue Monitor** 📦
Check queue status

```bash
bun run monitor:queues
```

**Output:**
```
Queue Name              Messages    Consumers    Status
fantasy402-logs         0           1            Active
line-ingress           0           1            Active
steam-webhook          0           1            Active
steam-processor        0           1            Active
exposure-calculator    0           1            Active
```

**What to watch:**
- ⚠️ **Messages > 100** - Queue back-pressure, check runbook
- ⚠️ **Consumers = 0** - Worker not processing, redeploy
- ✅ **Messages = 0** - Everything processing smoothly

---

### 5. **Health Check** 🏥
Quick health verification

```bash
bun run health:check
```

**Expected Response:**
```json
{
  "status": "healthy",
  "version": "3.0.0",
  "timestamp": "2025-10-08T07:15:23.433Z",
  "requestId": "mghmyx95",
  "duration": "0ms"
}
```

**Status Codes:**
- ✅ **200** - All systems operational
- ⚠️ **500** - Worker error, check logs
- ❌ **503** - Service down, redeploy

---

## 📈 **Monitoring Workflows**

### **Daily Monitoring** (5 min)
```bash
# 1. Check health
bun run health:check

# 2. Check queue status
bun run monitor:queues

# 3. Quick log review (1 min)
bun run monitor:logs
# Press Ctrl+C after 1 minute
```

**What to look for:**
- ✅ Health status: "healthy"
- ✅ Queue messages: < 10
- ✅ No ERROR logs
- ⚠️ < 5% WARNING logs

---

### **Debugging Issues** (15 min)
```bash
# 1. Start full monitoring dashboard
bun run monitor:dashboard

# This opens:
# - Web log viewer (keep open in browser)
# - Cloudflare dashboard (check metrics)
# - Terminal logs (watch in real-time)

# 2. In separate terminal, check queues
bun run monitor:queues

# 3. Reproduce the issue
# - Use browser extension
# - Make API calls
# - Watch logs in real-time
```

---

### **Performance Analysis** (30 min)
```bash
# 1. Start monitoring
bun run monitor:dashboard

# 2. In separate terminal, run load test
# (simulate normal traffic)

# 3. Monitor these metrics:
# - Response times (target: < 100ms)
# - Queue depth (target: < 10 messages)
# - Error rate (target: < 0.1%)
# - Cache hit rate (target: > 95%)
```

---

## 🚨 **Alert Thresholds**

### **Critical (Immediate Action)**
- ❌ **Error rate > 5%** - Check error logs immediately
- ❌ **Queue depth > 1000** - Back-pressure, see runbook
- ❌ **Health check failing** - Worker down, redeploy

### **Warning (Review within 1 hour)**
- ⚠️ **Error rate > 1%** - Investigate errors
- ⚠️ **Queue depth > 100** - Performance degradation
- ⚠️ **Response time > 500ms** - Slow queries

### **Info (Review daily)**
- ℹ️ **Error rate > 0.1%** - Normal fluctuations
- ℹ️ **Queue depth > 10** - Normal burst traffic
- ℹ️ **Response time > 100ms** - Monitor trend

---

## 📊 **Log Levels**

### **ERROR** 🔴
Critical failures that need immediate attention

**Examples:**
```
[mghmyx95] ❌ Error: D1 query failed
[mghmyx96] ❌ Error: Queue send failed
[mghmyx97] ❌ Error: Invalid Fantasy402 data
```

**Action:** Investigate immediately

---

### **WARN** 🟡
Potential issues that should be reviewed

**Examples:**
```
[mghmyx95] ⚠️  Cache miss, warming...
[mghmyx96] ⚠️  Queue depth: 150 messages
[mghmyx97] ⚠️  Slow query: 450ms
```

**Action:** Review within 1 hour

---

### **INFO** 🟢
Normal operations and significant events

**Examples:**
```
[mghmyx95] ✅ Fantasy402 data queued
[mghmyx96] 📦 Processing batch of 10 messages
[mghmyx97] 💚 Health check passed
```

**Action:** Review daily summary

---

### **DEBUG** 🔵
Detailed information for debugging

**Examples:**
```
[mghmyx95] 🔍 Request headers: {...}
[mghmyx96] 🔍 D1 query: SELECT * FROM...
[mghmyx97] 🔍 Cache lookup: fantasy402:config
```

**Action:** Only when debugging specific issues

---

## 🔧 **Log Patterns to Watch**

### **Success Patterns** ✅
```
[requestId] 📥 Fantasy402 data: <operation>
[requestId] ✅ Queued for processing
[requestId] 📦 Processing batch of <N> messages
[requestId] ✅ Batch inserted <N> records
```

### **Warning Patterns** ⚠️
```
[requestId] ⚠️  Cache miss, warming...
[requestId] ⚠️  Queue depth: <N> messages
[requestId] ⚠️  Fallback: Queue unavailable
```

### **Error Patterns** ❌
```
[requestId] ❌ Error: <error message>
[requestId] ❌ D1 batch error: <details>
[requestId] ❌ Deployment failed: <reason>
```

---

## 📈 **Key Performance Indicators (KPIs)**

### **Availability**
- **Target:** 99.999% uptime
- **Monitor:** `bun run health:check` (every 5 min)
- **Alert:** < 99.9% in 1 hour window

### **Performance**
- **Target:** P95 < 100ms
- **Monitor:** Worker logs, response times
- **Alert:** P95 > 500ms for 5 minutes

### **Reliability**
- **Target:** < 0.1% error rate
- **Monitor:** Log ERROR count vs total
- **Alert:** > 1% error rate for 2 minutes

### **Queue Health**
- **Target:** < 10 messages depth
- **Monitor:** `bun run monitor:queues`
- **Alert:** > 1000 messages for 5 minutes

---

## 🛠️ **Troubleshooting**

### **"No logs showing"**
1. Check Worker is deployed: `bun run health:check`
2. Check network: `curl https://betting-brain-v3.nolarose1968-806.workers.dev/health`
3. Try Worker tail: `bun run monitor:worker`

### **"Queue depth growing"**
1. Check consumer status: `bun run monitor:queues`
2. Check error rate: `bun run monitor:logs`
3. Follow runbook: [docs/runbooks/queue-backlog.md](runbooks/queue-backlog.md)

### **"High error rate"**
1. Check recent deployments: `wrangler deployments list`
2. Check error logs: `bun run monitor:logs` (filter ERROR)
3. Consider rollback: [docs/runbooks/rollback.md](runbooks/rollback.md)

---

## 📚 **Related Documentation**

- **[DEPLOYMENT_SUCCESS.md](DEPLOYMENT_SUCCESS.md)** - Live deployment status
- **[PRODUCTION_ALERTS_SETUP.md](PRODUCTION_ALERTS_SETUP.md)** - Alert configuration
- **[OBSERVABILITY_COMPLETE.md](OBSERVABILITY_COMPLETE.md)** - Observability overview
- **[runbooks/](runbooks/)** - Incident response procedures

---

## 🎯 **Quick Reference**

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `bun run monitor:dashboard` | All-in-one monitoring | Daily review, debugging |
| `bun run monitor:logs` | Terminal logs | Quick status check |
| `bun run monitor:web` | Web dashboard | Extended monitoring session |
| `bun run monitor:worker` | Official Worker logs | Cloudflare-specific issues |
| `bun run monitor:queues` | Queue status | Check queue health |
| `bun run health:check` | Health verification | Automated monitoring |

---

## 🚀 **Best Practices**

### **1. Daily Routine**
- ✅ Morning: Run `bun run health:check`
- ✅ Midday: Check `bun run monitor:queues`
- ✅ Evening: Review logs with `bun run monitor:logs` (1 min)

### **2. Before Deployment**
- ✅ Check current health: `bun run health:check`
- ✅ Note current queue depth: `bun run monitor:queues`
- ✅ Start monitoring: `bun run monitor:dashboard`

### **3. After Deployment**
- ✅ Verify health: `bun run health:check`
- ✅ Watch logs: `bun run monitor:logs` (5 min)
- ✅ Check queues: `bun run monitor:queues`
- ✅ Monitor for 30 minutes with dashboard

### **4. During Incidents**
- ✅ Start full monitoring: `bun run monitor:dashboard`
- ✅ Check relevant runbook: [docs/runbooks/](runbooks/)
- ✅ Document issue in logs
- ✅ Follow post-incident review process

---

## 💡 **Pro Tips**

1. **Keep Web Viewer Open** - Leave `log-viewer.html` open in a browser tab for quick reference

2. **Use Multiple Terminals** - Run different monitoring commands in separate terminals:
   ```bash
   # Terminal 1
   bun run monitor:logs
   
   # Terminal 2
   bun run monitor:worker
   
   # Terminal 3
   watch -n 5 "bun run monitor:queues"
   ```

3. **Set Up Aliases** (add to `.zshrc` or `.bashrc`):
   ```bash
   alias mon="cd /Users/nolarose/ffffff && bun run monitor:dashboard"
   alias health="cd /Users/nolarose/ffffff && bun run health:check"
   alias queues="cd /Users/nolarose/ffffff && bun run monitor:queues"
   ```

4. **Automate Health Checks** - Add to cron for automated monitoring:
   ```bash
   */5 * * * * cd /Users/nolarose/ffffff && bun run health:check
   ```

---

**Status:** ✅ Production Ready  
**Tools:** 5 monitoring commands available  
**Response Time:** < 2 seconds for all checks  

**Happy Monitoring!** 📊🚀

