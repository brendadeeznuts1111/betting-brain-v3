# 🚨 Runbook: Queue Backing Up

**Severity:** High  
**Impact:** Data processing delays, potential data loss  
**Response Time:** < 15 minutes

---

## 🔍 Symptoms

- Alert: "Queued messages ≥ 1,000 for ≥ 5 minutes"
- Dashboard shows growing queue depth
- Processing lag increasing
- Real-time features degraded

---

## 📊 Diagnosis

### Step 1: Check Queue Depth

```bash
# View current queue status
wrangler queues list

# Expected output:
# fantasy402-logs: 2,345 messages (BACKING UP!)
```

### Step 2: Check Consumer Worker Health

```bash
# Tail consumer worker logs
wrangler tail --format pretty

# Look for:
# - High error rate
# - Slow processing times
# - Timeout errors
```

### Step 3: Identify Bottleneck

```bash
# Check D1 latency
wrangler d1 execute RAW_FEED_DB --command "EXPLAIN QUERY PLAN SELECT * FROM fantasy402_raw_feed LIMIT 1"

# Check consumer metrics
# Dashboard → Workers → fantasy402-logger → Metrics
```

---

## 🛠️ Resolution

### Option 1: Scale Consumer Concurrency (Fast - 2 min)

```toml
# In wrangler.toml
[[queues.consumers]]
queue = "fantasy402-logs"
max_batch_size = 100
max_batch_timeout = 5
max_retries = 5
max_concurrency = 10  # ← Increase this (was 1)
```

```bash
# Deploy immediately
wrangler deploy

# Monitor queue depth
watch -n 5 'wrangler queues list'
```

**Expected:** Queue drains within 5-10 minutes

---

### Option 2: Optimize Batch Processing (Medium - 10 min)

```typescript
// In src/queues/fantasy402-logger.ts

// ❌ SLOW: Individual inserts
for (const message of batch.messages) {
    await env.DB.prepare('INSERT ...').bind(...).run();
}

// ✅ FAST: Batch insert
const statements = batch.messages.map(msg =>
    env.DB.prepare('INSERT ...').bind(...)
);
await env.DB.batch(statements);  // All at once!
```

---

### Option 3: Add Jitter to Prevent Thundering Herd (Medium - 15 min)

```typescript
// In src/queues/fantasy402-logger.ts

export async function processFantasy402Logs(batch, env) {
    // Add random delay to spread load
    const jitter = Math.random() * 1000; // 0-1 second
    await new Promise(resolve => setTimeout(resolve, jitter));
    
    // Process batch
    await processBatch(batch, env);
}
```

---

### Option 4: Add Second Consumer Worker (High Impact - 30 min)

```bash
# Create second consumer worker
cp src/queues/fantasy402-logger.ts src/queues/fantasy402-logger-2.ts

# Update wrangler.toml
[[queues.consumers]]
queue = "fantasy402-logs"
max_batch_size = 100
max_concurrency = 10

[[queues.consumers]]
queue = "fantasy402-logs"
max_batch_size = 100
max_concurrency = 10  # Second consumer!
script_name = "fantasy402-logger-2"  # Different worker
```

---

## 🔄 Prevention

### 1. Circuit Breaker Pattern

```typescript
// Add to producer (fantasy402-ingest.ts)
const QUEUE_DEPTH_LIMIT = 10000;

async function sendToQueue(data, env) {
    const currentDepth = await getQueueDepth(env);
    
    if (currentDepth > QUEUE_DEPTH_LIMIT) {
        // Circuit breaker: Don't queue, log directly
        console.warn('Queue overloaded, logging directly');
        await logToFallbackStorage(data, env);
        return;
    }
    
    await env.FANTASY402_QUEUE.send(data);
}
```

### 2. Monitoring Alert

```bash
# Set up alert in Cloudflare Dashboard:
# Workers → fantasy402-logs → Alerts → Add Alert

Alert Type: Queue Depth
Threshold: ≥ 1,000 messages
Duration: ≥ 5 minutes
Destination: Telegram webhook
```

### 3. Auto-Scaling (Advanced)

```typescript
// Auto-adjust batch size based on queue depth
const queueDepth = await getQueueDepth(env);
const batchSize = queueDepth > 5000 ? 200 : 100;

// Process larger batches when backed up
```

---

## 📈 Verification

### Success Metrics

- ✅ Queue depth < 100 messages
- ✅ Processing latency < 5 seconds
- ✅ No consumer errors in logs
- ✅ Real-time features restored

### Check Commands

```bash
# Queue depth
wrangler queues list | grep fantasy402-logs

# Consumer health
wrangler tail --format pretty | grep fantasy402

# D1 performance
# Dashboard → D1 → RAW_FEED_DB → Metrics
```

---

## 🔗 Related Runbooks

- [D1 SQLITE_BUSY](d1-busy.md)
- [Rollback Now](rollback.md)
- [High Error Rate](high-error-rate.md)

---

**Last Updated:** 2025-10-08  
**Owner:** DevOps Team  
**Severity:** High

