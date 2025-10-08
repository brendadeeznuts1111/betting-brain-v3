# Production Configuration Guide - v1.0

**Version:** 1.0-cache-optimization
**Target Environment:** Cloudflare Workers
**Last Updated:** 2025-10-08

---

## Overview

This guide covers production configuration for Betting-Brain v1.0 with Fantasy402 cache optimization achieving:
- **90%+ cache hit rate**
- **93.3% D1 write reduction**
- **Secure ingest endpoint** with secret-based authentication

---

## Pre-Deployment Requirements

### 1. Wrangler CLI

```bash
# Install Wrangler (if not already installed)
npm install -g wrangler

# Verify installation
wrangler --version

# Login to Cloudflare
wrangler login
```

### 2. Environment Access

Ensure you have:
- ✅ Cloudflare account access
- ✅ Workers & Pages permissions
- ✅ D1 database access
- ✅ KV namespace access
- ✅ Queues access

### 3. Git Tag

Verify you're deploying the correct version:

```bash
git describe --tags --exact-match
# Expected: v1.0-cache-optimization
```

### 4. Cloudflare Service Bindings

This deployment uses **50 Cloudflare integrations**:
- 46 service bindings (23 per environment)
- 4 cron triggers

For complete integration details, see:
📄 **[CLOUDFLARE_INTEGRATION.md](./CLOUDFLARE_INTEGRATION.md)**

Quick summary:
- 4 D1 databases (2 dev + 2 prod)
- 20 KV namespaces (10 dev + 10 prod)
- 20 Queues (10 dev + 10 prod)
- 2 Analytics datasets (1 dev + 1 prod)
- 4 Cron triggers (shared)

---

## Critical Configuration Steps

### Step 5: Set EXTENSION_SECRET

**⚠️ CRITICAL:** This secret protects the Fantasy402 ingest endpoint from unauthorized access.

#### Generate Strong Secret

```bash
# Generate a cryptographically secure secret (32 bytes, base64-encoded)
openssl rand -base64 32
# Example output: kJ8s7dH2lP9xQ4vR6tY8uZ1aB3cD5eF7gH9iJ0kL2mN4oP=
```

#### Set in Wrangler (Production)

```bash
# Set the secret in Cloudflare Workers
wrangler secret put EXTENSION_SECRET

# You'll be prompted to enter the secret
# Paste the generated secret and press Enter
```

#### Verify Secret is Set

```bash
# List all secrets (doesn't show values, only names)
wrangler secret list

# Expected output:
# [
#   {
#     "name": "EXTENSION_SECRET",
#     "type": "secret_text"
#   }
# ]
```

#### Test Secret Protection

```bash
# Test without secret (should return 401)
curl -X POST https://betting-brain-v3.workers.dev/api/fantasy402/ingest \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# Expected response:
# {
#   "error": "Unauthorized",
#   "message": "Valid X-Extension-Secret header required",
#   "requestId": "..."
# }

# Test with secret (should return 200/202)
curl -X POST https://betting-brain-v3.workers.dev/api/fantasy402/ingest \
  -H "Content-Type: application/json" \
  -H "X-Extension-Secret: YOUR_SECRET_HERE" \
  -d '{"operation": "getListAgenstByAgent", "data": {...}}'
```

---

### Step 6: Configure Browser Extension

**Location:** `browser-extension/manifest.json`

#### Update Extension Secret

1. **Open extension code:**
   ```bash
   cd browser-extension
   ```

2. **Edit `background.js`:**
   ```javascript
   // Find this line:
   const EXTENSION_SECRET = 'default-dev-secret-change-me';

   // Replace with your production secret:
   const EXTENSION_SECRET = 'kJ8s7dH2lP9xQ4vR6tY8uZ1aB3cD5eF7gH9iJ0kL2mN4oP=';
   ```

3. **Update worker URL (if using custom domain):**
   ```javascript
   // Find this line:
   const WORKER_URL = 'http://localhost:8787';

   // Replace with production URL:
   const WORKER_URL = 'https://betting-brain-v3.workers.dev';
   // Or custom domain:
   const WORKER_URL = 'https://api.yourdomain.com';
   ```

4. **Reload extension:**
   - Open `chrome://extensions/`
   - Click "Reload" button on Betting-Brain extension
   - Verify version updated

5. **Test extension:**
   - Visit `https://fantasy402.com/`
   - Open browser console (F12)
   - Look for:
     ```
     [Fantasy402] 🚀 Interceptor initialized
     [Fantasy402] 🔍 Intercepting: /cloud/api/Manager/getBetTicker
     [Fantasy402] ✅ Forwarded to worker: /cloud/api/... (200)
     ```

---

### Step 7: Tune KV TTLs

**Default (Development):** 1 hour (`expirationTtl: 3600`)
**Recommended (Production):** 24 hours (`expirationTtl: 86400`)

#### Files to Update

**1. `src/api/fantasy402-ingest.ts`** (lines ~1450-1460):

```typescript
// Current (development):
await env.FANTASY_CACHE!.put(key, JSON.stringify(cacheData), {
  expirationTtl: 3600 // 1 hour
});

// Production (after 48h stable):
await env.FANTASY_CACHE!.put(key, JSON.stringify(cacheData), {
  expirationTtl: 86400 // 24 hours
});
```

**2. `src/routes/api/cache-warm.ts`** (lines ~80-85):

```typescript
// Current (development):
await env.FANTASY_CACHE.put(key, JSON.stringify(cacheData), {
  expirationTtl: 3600
});

// Production (after 48h stable):
await env.FANTASY_CACHE.put(key, JSON.stringify(cacheData), {
  expirationTtl: 86400
});
```

#### TTL Tuning Strategy

| Phase | TTL | Duration | Goal |
|-------|-----|----------|------|
| **Initial Deployment** | 1 hour | 0-48 hours | Validate cache correctness |
| **Stable Production** | 24 hours | 48h+ | Maximize performance |
| **Hot Fix/Schema Change** | 5 minutes | During migration | Fast iteration |

#### When to Keep 1-Hour TTL

Keep `expirationTtl: 3600` if:
- Agent hierarchies change frequently (new agents added daily)
- Data accuracy is more important than performance
- Debugging cache issues

---

### Step 8: Database Migrations

Apply migrations to production D1:

```bash
# List pending migrations
wrangler d1 migrations list betting-analytics --remote

# Apply all pending migrations
wrangler d1 migrations apply betting-analytics --remote

# Verify migration status
wrangler d1 execute betting-analytics --remote \
  --command "SELECT name FROM d1_migrations ORDER BY id DESC LIMIT 5"
```

Expected migrations:
- `0001_initial_schema.sql` - Core tables
- `0002_add_ttl.sql` - TTL columns
- `0003_mcp_tables.sql` - MCP-specific tables
- `0004_test_data.sql` - Optional test data (skip in production)

---

### Step 9: KV Namespace Verification

Verify all KV namespaces are bound:

```bash
# List all KV namespaces
wrangler kv:namespace list

# Verify bindings match wrangler.toml
# Expected namespaces:
# - FANTASY_CACHE (main cache)
# - FANTASY_CONFIG_CACHE (config data)
# - BET_TICKER_RAW (intercepted responses)
# - TOKEN_STORE, USER_STORE, SESSION_STORE, REFRESH_STORE (MCP auth)
# - LIVEBETS_STORE (live betting data)
# - RATE_LIMITER (rate limiting)
# - SPORTS_CACHE (sports API cache)
```

---

### Step 10: Queue Configuration

Verify queues are configured:

```bash
# List all queues
wrangler queues list

# Expected queues:
# - line-ingress-prod (batch: 10, timeout: 5s)
# - steam-webhook-prod (batch: 5, timeout: 10s)
# - steam-processor-prod (batch: 10, timeout: 2s)
# - exposure-calculator-prod (batch: 50, timeout: 10s)
# - fantasy402-logs-prod (batch: 100, timeout: 5s)
```

If queues don't exist, create them:

```bash
wrangler queues create line-ingress-prod
wrangler queues create steam-webhook-prod
wrangler queues create steam-processor-prod
wrangler queues create exposure-calculator-prod
wrangler queues create fantasy402-logs-prod
```

---

## Deployment Execution

### Automated Deployment (Recommended)

Use the provided deployment script:

```bash
# Make script executable
chmod +x deployment/scripts/deploy-v1.0.sh

# Run deployment
./deployment/scripts/deploy-v1.0.sh
```

The script performs:
1. ✅ Pre-flight checks (wrangler, git, bun, curl, jq installed)
2. ✅ Git tag verification
3. ✅ EXTENSION_SECRET validation
4. ✅ Worker deployment via `wrangler deploy`
5. ✅ Health checks
6. ✅ Cache warming
7. ✅ Metrics verification

### Manual Deployment

If you prefer manual steps:

```bash
# 1. Deploy worker
wrangler deploy

# 2. Verify health
curl -s https://betting-brain-v3.workers.dev/health | jq '.'

# 3. Warm cache
curl -X POST https://betting-brain-v3.workers.dev/api/f402/cache/warm | jq '.warmed'

# 4. Check metrics
curl -s https://betting-brain-v3.workers.dev/api/f402/cache/metrics | jq '.summary'
```

---

## Post-Deployment Verification

### Immediate Checks (0-5 minutes)

Follow the checklist in:
📄 **[deployment/checklists/post-deployment.md](../checklists/post-deployment.md)**

Key checks:
- [ ] `/health` returns 200 OK with version 3.0.0
- [ ] `/api/f402/cache/metrics` shows initial metrics
- [ ] Cache warming completes in <1 second
- [ ] Ingest without secret returns 401
- [ ] Extension integration works

### Short-Term Monitoring (1-4 hours)

- [ ] Cache hit rate reaches 80%+ within 1 hour
- [ ] Cache hit rate stabilizes at 90%+ within 2 hours
- [ ] D1 write reduction reaches 90%+
- [ ] No authorization errors in extension logs

### Medium-Term Validation (4-24 hours)

- [ ] Cache hit rate maintains 90%+
- [ ] D1 write reduction maintains 90%+
- [ ] P95 response time < 200ms
- [ ] No timeout errors
- [ ] Agent hierarchies update correctly
- [ ] Export functionality working

### Long-Term Health (24-48 hours)

- [ ] No worker crashes
- [ ] No KV quota exceeded errors
- [ ] No D1 connection errors
- [ ] Memory usage stable

**Decision Point:** If stable for 48h → Increase TTL to 24h

---

## Monitoring & Alerting

### Dashboard Access

**Floor Control Dashboard:**
```
http://localhost:8080/floor-control.html
```

Update worker URL in dashboard header to production URL:
```javascript
// Find this line in floor-control.html:
const WORKER_URL = 'http://localhost:8787';

// Update to production:
const WORKER_URL = 'https://betting-brain-v3.workers.dev';
```

### Wrangler Tail (Live Logs)

```bash
# Stream live logs
wrangler tail

# Filter for Fantasy402 events
wrangler tail | grep "fantasy402"

# JSON format
wrangler tail --format json | jq '.logs[]'
```

### Analytics Engine

View metrics in Cloudflare dashboard:
1. Go to **Workers & Pages** → **betting-brain-v3**
2. Click **Analytics** tab
3. View:
   - Request count
   - Error rate
   - CPU time
   - KV operations

---

## Rollback Procedure

### Automatic Rollback Triggers

Rollback immediately if:
- Cache hit rate drops below 50%
- D1 write errors exceed 1%
- Worker crashes more than once
- Extension auth consistently fails
- Dashboard shows incorrect data

### Rollback Steps

```bash
# 1. Checkout previous stable version
git checkout security-gate-v1

# 2. Deploy immediately
wrangler deploy

# 3. Verify rollback
curl -s https://betting-brain-v3.workers.dev/health | jq '.version'
# Expected: Previous version number

# 4. Notify team
# (Send notification via Slack/email)

# 5. Investigate issues
# Check logs, metrics, and error reports
```

### Post-Rollback Investigation

1. **Review logs:**
   ```bash
   wrangler tail --format json > rollback-logs.json
   ```

2. **Export metrics:**
   - Visit dashboard
   - Click "Export JSON" and "Export CSV"
   - Analyze cache hit rate, error rates

3. **Test in staging:**
   - Deploy to staging environment
   - Reproduce issue
   - Fix and re-test

---

## Security Considerations

### Secrets Management

**✅ DO:**
- Use strong, random secrets (32+ bytes)
- Rotate secrets every 90 days
- Store secrets in Wrangler (encrypted at rest)
- Use different secrets for dev/staging/production

**❌ DON'T:**
- Commit secrets to git
- Share secrets via chat/email
- Use predictable secrets
- Hardcode secrets in code

### CORS Configuration

Production CORS headers (already configured):
```typescript
'Access-Control-Allow-Origin': '*',
'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
'Access-Control-Allow-Headers': 'Content-Type, X-Extension-Secret',
```

For stricter security, update to specific origin:
```typescript
'Access-Control-Allow-Origin': 'https://fantasy402.com',
```

### Rate Limiting

Current rate limit: **10 req/s per IP** (in-memory, per-instance)

For production-grade rate limiting:
1. Implement Durable Objects-based rate limiter
2. Or use Cloudflare Rate Limiting Rules

---

## Performance Tuning

### Cache Hit Rate Optimization

**Target:** 90%+ sustained hit rate

**Strategies:**
1. **Warm cache on deployment:**
   ```bash
   curl -X POST https://betting-brain-v3.workers.dev/api/f402/cache/warm
   ```

2. **Monitor cache misses:**
   ```bash
   curl -s https://betting-brain-v3.workers.dev/api/f402/cache/metrics | \
     jq '.summary.cacheMisses'
   ```

3. **Increase TTL (after 48h stable):**
   - Update `expirationTtl: 86400` (24 hours)

4. **Pre-warm before traffic spikes:**
   - Schedule cache warming before known high-traffic events

### D1 Write Reduction

**Target:** 90%+ write reduction

**Achieved via:**
- Hash-based change detection
- Skip D1 writes when data unchanged
- Only write when hash changes

**Monitor:**
```bash
curl -s https://betting-brain-v3.workers.dev/api/f402/cache/metrics | \
  jq '.summary.d1WriteReduction'
```

### KV Storage Optimization

**Current usage:**
- Multi-key caching: 3 keys per agent hierarchy
- Individual agent indexing: 1 key per agent
- Metrics: 5 counters (7-day retention)

**Estimate for 1000 agents:**
- Agent lists: ~60 KB × 3 keys = 180 KB
- Individual agents: ~0.3 KB × 1000 = 300 KB
- Total: ~500 KB

**KV Quotas (Workers Paid plan):**
- Storage: 1 GB
- Read operations: 10M/day
- Write operations: 1M/day

---

## Troubleshooting

### Issue: Cache Hit Rate < 50%

**Possible causes:**
1. Cache not warmed after deployment
2. TTL too short (1 hour in high-traffic scenario)
3. Agent data changing frequently

**Solutions:**
```bash
# 1. Warm cache manually
curl -X POST https://betting-brain-v3.workers.dev/api/f402/cache/warm

# 2. Check TTL configuration
grep "expirationTtl" src/api/fantasy402-ingest.ts

# 3. Monitor D1 write frequency
curl -s https://betting-brain-v3.workers.dev/api/f402/cache/metrics | \
  jq '.summary.d1WritesExecuted'
```

### Issue: Extension Auth Fails (401 errors)

**Possible causes:**
1. EXTENSION_SECRET not set in Wrangler
2. Extension using wrong secret
3. Typo in secret value

**Solutions:**
```bash
# 1. Verify secret is set
wrangler secret list

# 2. Re-set secret
wrangler secret put EXTENSION_SECRET

# 3. Test with curl
curl -X POST https://betting-brain-v3.workers.dev/api/fantasy402/ingest \
  -H "X-Extension-Secret: YOUR_SECRET" \
  -d '{}'
```

### Issue: Dashboard Shows Zeros

**Possible causes:**
1. No data intercepted yet (extension not active)
2. KV cache empty (cold start)
3. Worker URL misconfigured in dashboard

**Solutions:**
```bash
# 1. Verify extension is intercepting
# Check browser console (F12) on fantasy402.com

# 2. Warm cache
curl -X POST https://betting-brain-v3.workers.dev/api/f402/cache/warm

# 3. Check worker URL in dashboard header
# Update to production URL
```

---

## Success Criteria

All of the following must be true:
- ✅ Cache hit rate: 90%+
- ✅ D1 write reduction: 90%+
- ✅ No security vulnerabilities
- ✅ Dashboard fully functional
- ✅ Extension integration working
- ✅ Export functionality working
- ✅ Health checks passing
- ✅ No worker crashes
- ✅ Response time < 200ms (P95)

---

## Support & Resources

### Documentation
- **[RELEASE_v1.0.md](../../RELEASE_v1.0.md)** - Release notes and benchmarks
- **[CACHE_ARCHITECTURE.md](./CACHE_ARCHITECTURE.md)** - Architecture diagram
- **[post-deployment.md](../checklists/post-deployment.md)** - Verification checklist

### Monitoring
- **Cloudflare Dashboard:** Workers & Pages → betting-brain-v3 → Analytics
- **Floor Control Dashboard:** Local or hosted HTML dashboard
- **Wrangler Tail:** `wrangler tail` for live logs

### Emergency Contacts
- **Team:** [Your team contact info]
- **On-Call:** [On-call rotation]
- **Escalation:** [Escalation path]

---

**Document Version:** 1.0
**Last Updated:** 2025-10-08
**Maintained By:** Betting-Brain Team
