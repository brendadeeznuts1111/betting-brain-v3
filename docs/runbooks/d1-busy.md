# 🚨 Runbook: D1 Returns SQLITE_BUSY

**Severity:** High  
**Impact:** Database write failures, data loss risk  
**Response Time:** < 10 minutes

---

## 🔍 Symptoms

- Error: `SQLITE_BUSY: database is locked`
- Dashboard shows high D1 write latency
- Failed database operations
- Queue consumer retrying frequently

---

## 📊 Diagnosis

### Step 1: Check D1 Metrics

```bash
# View D1 performance
# Dashboard → D1 → RAW_FEED_DB → Metrics

# Look for:
# - Write latency spikes
# - High concurrent connections
# - Lock wait times
```

### Step 2: Identify Concurrent Writes

```bash
# Tail worker logs
wrangler tail --format pretty | grep SQLITE_BUSY

# Count frequency
wrangler tail | grep -c SQLITE_BUSY
```

---

## 🛠️ Resolution

### Option 1: Batch Writes (Fast - 5 min)

```typescript
// ❌ BAD: Many individual writes
for (const record of records) {
    await env.DB.prepare(`
        INSERT INTO fantasy402_raw_feed VALUES (?, ?, ?)
    `).bind(record.id, record.data, record.ts).run();
}

// ✅ GOOD: Single batch write
const statements = records.map(r =>
    env.DB.prepare('INSERT INTO fantasy402_raw_feed VALUES (?, ?, ?)').bind(r.id, r.data, r.ts)
);

await env.DB.batch(statements);  // All or nothing!
```

**Expected:** 90% reduction in SQLITE_BUSY errors

---

### Option 2: Add Jitter (Fast - 5 min)

```typescript
// Add random delay to spread concurrent writes
async function writeWithJitter(data, env) {
    // Random delay 0-500ms
    const jitter = Math.random() * 500;
    await new Promise(resolve => setTimeout(resolve, jitter));
    
    // Now write
    await env.DB.prepare('INSERT ...').bind(...).run();
}
```

**Expected:** Reduces thundering herd, smoother load

---

### Option 3: Use UNION ALL for Bulk Inserts (Medium - 10 min)

```typescript
// ✅ BEST: Single INSERT with UNION ALL
const values = records.map(r => 
    `SELECT '${r.id}', '${r.data}', '${r.ts}'`
).join(' UNION ALL ');

await env.DB.prepare(`
    INSERT INTO fantasy402_raw_feed (id, data, ts)
    ${values}
`).run();
```

**Expected:** Maximum throughput, minimal locks

---

### Option 4: Read-Heavy Optimization (Medium - 15 min)

```sql
-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_fantasy402_operation 
ON fantasy402_raw_feed(operation, timestamp);

CREATE INDEX IF NOT EXISTS idx_fantasy402_timestamp 
ON fantasy402_raw_feed(timestamp DESC);

-- Apply
wrangler d1 execute RAW_FEED_DB --file=migrations/0007_add_indexes.sql --remote
```

---

### Option 5: Retry with Exponential Backoff (Medium - 15 min)

```typescript
async function writeWithRetry(data, env, maxRetries = 3) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            await env.DB.prepare('INSERT ...').bind(...).run();
            return;  // Success!
            
        } catch (error) {
            if (error.message.includes('SQLITE_BUSY')) {
                const backoff = Math.pow(2, attempt) * 100;  // 100ms, 200ms, 400ms
                console.warn(`SQLITE_BUSY, retry ${attempt + 1}/${maxRetries} after ${backoff}ms`);
                await new Promise(resolve => setTimeout(resolve, backoff));
            } else {
                throw error;  // Different error, don't retry
            }
        }
    }
    
    throw new Error('Max retries exceeded for SQLITE_BUSY');
}
```

---

## 🔄 Prevention

### 1. Batch All Writes

```typescript
// Global rule: Never write one-by-one in loops
// Always collect and batch

const statements = [];
for (const item of items) {
    statements.push(
        env.DB.prepare('INSERT ...').bind(item.id, item.data)
    );
}

await env.DB.batch(statements);  // ✅ Always batch!
```

### 2. Monitor Write Latency

```typescript
// Add performance tracking
const timer = Date.now();
await env.DB.batch(statements);
const latencyMs = Date.now() - timer;

if (latencyMs > 400) {
    console.warn(`Slow D1 write: ${latencyMs}ms`);
}

// Log to Analytics Engine
env.ANALYTICS_ENGINE.writeDataPoint({
    blobs: ['d1_write_latency'],
    doubles: [latencyMs]
});
```

### 3. Circuit Breaker for D1

```typescript
let consecutiveFailures = 0;
const FAILURE_THRESHOLD = 5;

async function writeWithCircuitBreaker(data, env) {
    if (consecutiveFailures >= FAILURE_THRESHOLD) {
        // Circuit open: Fail fast, don't try D1
        console.error('D1 circuit breaker open');
        await fallbackStorage(data);
        return;
    }
    
    try {
        await env.DB.prepare('INSERT ...').bind(...).run();
        consecutiveFailures = 0;  // Reset on success
    } catch (error) {
        consecutiveFailures++;
        throw error;
    }
}
```

---

## 📈 Verification

### Success Metrics

- ✅ SQLITE_BUSY errors < 0.1%
- ✅ Write latency P95 < 200ms
- ✅ No failed transactions
- ✅ Queue processing smooth

### Check Commands

```bash
# Count SQLITE_BUSY in last hour
wrangler tail | grep -c SQLITE_BUSY

# Check D1 performance
# Dashboard → D1 → RAW_FEED_DB → Metrics → Write Latency

# Verify batch processing
wrangler tail | grep "Batch inserted"
```

---

## 🔗 Related Runbooks

- [Queue Backing Up](queue-backlog.md)
- [High Error Rate](high-error-rate.md)
- [Rollback Now](rollback.md)

---

## 📚 References

- [Cloudflare D1 Best Practices](https://developers.cloudflare.com/d1/platform/limits/)
- [SQLite Transaction Modes](https://www.sqlite.org/lockingv3.html)

---

**Last Updated:** 2025-10-08  
**Owner:** Database Team  
**Severity:** High

