# Post-Deployment Verification - v1.0

## Immediate Checks (0-5 minutes)

### Health Endpoint
- [ ] `/health` returns 200 OK
- [ ] Response includes version: "3.0.0"
- [ ] Response time < 100ms

**Command:**
```bash
curl https://YOUR-WORKER.workers.dev/health
```

### Cache Metrics Endpoint
- [ ] `/api/f402/cache/metrics` returns 200 OK
- [ ] Response includes `summary` object
- [ ] Initial metrics show zero requests

**Command:**
```bash
curl https://YOUR-WORKER.workers.dev/api/f402/cache/metrics | jq '.summary'
```

### Cache Warming
- [ ] `POST /api/f402/cache/warm` returns 200 OK
- [ ] Response shows agents warmed
- [ ] Duration < 1 second

**Command:**
```bash
curl -X POST https://YOUR-WORKER.workers.dev/api/f402/cache/warm | jq '.warmed'
```

### Security Check
- [ ] Ingest without secret returns 401
- [ ] Error message: "Valid X-Extension-Secret header required"

**Command:**
```bash
curl -X POST https://YOUR-WORKER.workers.dev/api/fantasy402/ingest \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
# Expected: 401 Unauthorized
```

---

## Short-term Monitoring (1-4 hours)

### Cache Performance
- [ ] Hit rate reaches 80%+ within 1 hour
- [ ] Hit rate stabilizes at 90%+ within 2 hours
- [ ] D1 write reduction reaches 90%+

**Dashboard:** Cache Performance Card

### Agent Tree
- [ ] ASCII view renders correctly
- [ ] D3 view renders correctly
- [ ] Toggle between views works
- [ ] Agent count matches expected

**Dashboard:** Agent Hierarchy Card

### Extension Integration
- [ ] Extension sends X-Extension-Secret header
- [ ] Ingest requests succeed (200/202)
- [ ] Agent data appears in dashboard
- [ ] No 401 errors in extension logs

**Browser Console:** Check for authorization errors

---

## Medium-term Validation (4-24 hours)

### Performance Metrics
- [ ] Cache hit rate maintains 90%+
- [ ] D1 write reduction maintains 90%+
- [ ] P95 response time < 200ms
- [ ] No timeout errors

**Monitoring:** Wrangler analytics

### Data Quality
- [ ] Agent hierarchies update correctly
- [ ] Cache warming succeeds on schedule
- [ ] KV TTLs expire correctly (1 hour)
- [ ] D1 writes only on data changes

**Dashboard:** Monitor all cards

### Export Functionality
- [ ] JSON export downloads successfully
- [ ] CSV export downloads successfully
- [ ] Exported data is valid
- [ ] Timestamps are correct

**Test:** Click export buttons in dashboard

---

## Long-term Health (24-48 hours)

### Stability Checks
- [ ] No worker crashes
- [ ] No KV quota exceeded errors
- [ ] No D1 connection errors
- [ ] Memory usage stable

**Wrangler:** `wrangler tail` to monitor logs

### Production Tuning Decision
- [ ] If stable for 48h: Increase TTL to 24h
- [ ] If issues: Keep TTL at 1h or rollback

**File to edit:** `src/api/fantasy402-ingest.ts` and `src/routes/api/cache-warm.ts`

---

## Rollback Triggers

Rollback immediately if:
- [ ] Cache hit rate drops below 50%
- [ ] D1 write errors exceed 1%
- [ ] Worker crashes more than once
- [ ] Extension auth consistently fails
- [ ] Dashboard shows incorrect data

**Rollback Command:**
```bash
git checkout security-gate-v1
wrangler deploy
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

---

## Sign-Off

- [ ] Deployment verified by: _______________
- [ ] Date: _______________
- [ ] Cache hit rate achieved: ___%
- [ ] Issues found: _______________
- [ ] Resolution: _______________

**Status:** [ ] Success  [ ] Partial Success  [ ] Rollback Required
