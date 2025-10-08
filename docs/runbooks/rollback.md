# 🚨 Runbook: Rollback Now

**Severity:** Critical  
**Impact:** Production outage, data corruption  
**Response Time:** < 5 minutes

---

## ⚡ Quick Rollback (30 seconds)

### Option 1: Dashboard (Fastest)

```
1. Go to: Cloudflare Dashboard
2. Click: Workers & Pages
3. Select: betting-brain-v3
4. Click: Versions tab
5. Find: Previous working version
6. Click: "Promote to Production"
7. Confirm: ✅
```

**Time:** 30 seconds  
**Impact:** Instant rollback to last known good version

---

### Option 2: CLI (Fastest for SSH access)

```bash
# List recent versions
wrangler deployments list --name betting-brain-v3

# Rollback to previous version
wrangler rollback --message "Emergency rollback: high error rate"

# Verify
curl https://betting-brain-v3.nolarose1968-806.workers.dev/health
```

**Time:** 1 minute

---

## 🔍 When to Rollback

### Immediate Rollback (< 5 min)

- ✅ Error rate ≥ 5%
- ✅ Complete service outage
- ✅ Data corruption detected
- ✅ Security vulnerability
- ✅ Critical bug in production

### Investigate First (< 30 min)

- ⚠️ Error rate 1-5%
- ⚠️ Performance degradation
- ⚠️ Partial feature failure
- ⚠️ Non-critical bugs

---

## 📊 Pre-Rollback Checklist

### 1. Confirm Issue (30 seconds)

```bash
# Check error rate
wrangler tail --format pretty | grep -c ERROR

# Check health endpoint
curl https://betting-brain-v3.nolarose1968-806.workers.dev/health

# Check queue depth
wrangler queues list
```

### 2. Document Issue (30 seconds)

```bash
# Save logs for post-mortem
wrangler tail > rollback-$(date +%Y%m%d-%H%M%S).log &
LOGPID=$!

# Take screenshot of dashboard
# Open: Dashboard → Workers → betting-brain-v3 → Metrics
```

### 3. Notify Team (30 seconds)

```bash
# Telegram alert (if configured)
curl -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
  -d chat_id="${CHAT_ID}" \
  -d text="🚨 ROLLBACK IN PROGRESS: betting-brain-v3"
```

---

## 🛠️ Rollback Procedures

### Standard Rollback

```bash
# Step 1: List versions
wrangler deployments list --name betting-brain-v3

# Output:
# Version ID: abc123 (current) - Deployed 5 min ago
# Version ID: def456          - Deployed 2 hours ago ← Roll back to this
# Version ID: ghi789          - Deployed 1 day ago

# Step 2: Rollback
wrangler rollback --message "High error rate detected"

# Step 3: Verify
curl https://betting-brain-v3.nolarose1968-806.workers.dev/health
# Should return: {"status":"healthy","version":"3.0.0"}
```

---

### Gradual Rollback (Safer)

```bash
# Step 1: Route only 10% traffic to new version
wrangler versions upload --tag stable
wrangler versions deploy --percentage 10

# Step 2: Monitor for 5 minutes
wrangler tail --format pretty

# Step 3: If still broken, route 0% to new version
wrangler versions deploy --percentage 0

# Step 4: 100% back to old version
wrangler versions deploy --id def456 --percentage 100
```

---

### Emergency Full Rollback

```bash
# Nuclear option: Delete new version, force old version
wrangler delete --name betting-brain-v3 --version abc123
wrangler deploy --env production --tag emergency-rollback
```

---

## 🔄 Post-Rollback

### 1. Verify System Health (5 minutes)

```bash
# Check all critical endpoints
curl https://...workers.dev/health
curl https://...workers.dev/api/fantasy402/config
wscat -c wss://...workers.dev/ws

# Check queue processing
wrangler queues list

# Check D1 health
wrangler d1 execute RAW_FEED_DB --command "SELECT COUNT(*) FROM fantasy402_raw_feed"
```

### 2. Root Cause Analysis (30 minutes)

```markdown
## Rollback Post-Mortem

**Date:** 2025-10-08 14:30 UTC
**Duration:** 5 minutes
**Impact:** 5% error rate, 500 affected requests

### Timeline
- 14:25: Deploy v3.0.1
- 14:26: Error rate spikes to 5%
- 14:28: Alert fired
- 14:30: Rollback initiated
- 14:31: Service restored

### Root Cause
- Bug in fantasy402-config.ts line 45
- Missing null check for env.FANTASY_CACHE

### Fix
- Add null check: `if (!env.FANTASY_CACHE) return fallback;`
- Add test: `test('handles missing FANTASY_CACHE')`

### Prevention
- Add integration test for missing bindings
- Gradual rollout (10% → 50% → 100%)
```

### 3. Fix and Redeploy (variable)

```bash
# Fix the issue
git checkout -b hotfix/fantasy402-config-null-check
# ... make fixes ...

# Test locally
bun test
bun run dev

# Deploy to staging first
wrangler deploy --env staging

# Test staging
npm run test:staging

# Gradual production rollout
wrangler versions upload --tag hotfix-v3.0.2
wrangler versions deploy --percentage 10  # 10% canary
# Wait 10 minutes, monitor
wrangler versions deploy --percentage 100  # Full rollout
```

---

## 📈 Success Criteria

- ✅ Error rate < 0.1%
- ✅ All health checks passing
- ✅ Queue processing normally
- ✅ D1 queries successful
- ✅ WebSocket connections stable
- ✅ No user-reported issues

---

## 🔗 Related Runbooks

- [High Error Rate](high-error-rate.md)
- [Queue Backing Up](queue-backlog.md)
- [D1 SQLITE_BUSY](d1-busy.md)

---

## 📞 Escalation

If rollback doesn't resolve the issue:

1. Check Cloudflare Status: https://www.cloudflarestatus.com/
2. Contact Cloudflare Support: support@cloudflare.com
3. Emergency contact: [Your DevOps Lead]

---

**Last Updated:** 2025-10-08  
**Owner:** DevOps Team  
**Severity:** Critical

