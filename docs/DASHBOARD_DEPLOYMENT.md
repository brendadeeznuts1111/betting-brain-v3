# Dashboard Deployment Guide

Quick guide to deploy dashboards to Cloudflare Pages.

## 🎯 Current Status

**Local Development:**
- ✅ Dashboards running locally via Bun server
- ✅ Worker running on `http://localhost:8787`
- ✅ Dashboards available at `http://localhost:8081`

**Production:**
- ⏳ Cloudflare Pages not yet configured
- ⏳ Need to create Pages project first

## 🚀 Deploy to Cloudflare Pages

### Option 1: Using Wrangler CLI (Recommended)

```bash
# 1. Login to Cloudflare
wrangler login

# 2. Deploy dashboards directory
wrangler pages deploy dashboards \
  --project-name=betting-brain-dashboards \
  --branch=main

# Expected output:
# ✨ Deployment complete!
# 🌍 https://betting-brain-dashboards.pages.dev
```

### Option 2: Using Cloudflare Dashboard (Web UI)

1. **Go to Cloudflare Dashboard**
   - Navigate to https://dash.cloudflare.com
   - Select your account
   - Click "Workers & Pages" in left sidebar

2. **Create Pages Project**
   - Click "Create application"
   - Select "Pages" tab
   - Click "Upload assets"
   - Name: `betting-brain-dashboards`

3. **Upload Files**
   - Select all files from `dashboards/` directory
   - Click "Deploy site"

4. **Configure Settings** (Optional)
   - Custom domain: Add if needed
   - Environment variables: None required
   - Build settings: None (static files)

### Option 3: Git Integration (CI/CD)

```yaml
# .github/workflows/deploy-dashboards.yml
name: Deploy Dashboards

on:
  push:
    branches: [main]
    paths:
      - 'dashboards/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy dashboards --project-name=betting-brain-dashboards
```

## 🔧 Configuration

### Update Worker URL in Dashboards

Once deployed, update the worker URL in the dashboards:

**floor-control.html** (line ~631):
```javascript
const WORKER_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:8787'
  : 'https://betting-brain-v3-prod.nolarose1968-806.workers.dev';
```

**hierarchy-enhanced.html** (line ~330):
```html
<div id="live-data"
  hx-get="https://betting-brain-v3-prod.nolarose1968-806.workers.dev/api/f402/agents/tree?owner=BILLY666&depth=99"
  ...>
</div>
```

**sse-demo.html** (line ~76):
```html
sse-connect="https://betting-brain-v3-prod.nolarose1968-806.workers.dev/api/f402/agents/stream"
```

### Enable CORS on Worker

Ensure your worker has CORS headers configured:

```typescript
// src/index.ts
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Or specific domain
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
```

## 📊 Current URLs (Local Development)

```bash
# Worker (local)
http://localhost:8787

# Dashboard Server (Bun)
http://localhost:8081

# Dashboards (local)
http://localhost:8081/floor-control.html
http://localhost:8081/hierarchy-enhanced.html
http://localhost:8081/sse-demo.html

# SSE Streams (worker)
http://localhost:8787/api/f402/agents/stream
http://localhost:8787/api/health/stream
http://localhost:8787/api/f402/bets/stream
```

## 🌐 Production URLs (After Deployment)

```bash
# Worker (deployed)
https://betting-brain-v3-prod.nolarose1968-806.workers.dev

# Dashboards (will be available after deployment)
https://betting-brain-dashboards.pages.dev/floor-control.html
https://betting-brain-dashboards.pages.dev/hierarchy-enhanced.html
https://betting-brain-dashboards.pages.dev/sse-demo.html

# SSE Streams (worker)
https://betting-brain-v3-prod.nolarose1968-806.workers.dev/api/f402/agents/stream
https://betting-brain-v3-prod.nolarose1968-806.workers.dev/api/health/stream
https://betting-brain-v3-prod.nolarose1968-806.workers.dev/api/f402/bets/stream
```

## ✅ Deployment Checklist

- [ ] Worker deployed and accessible
- [ ] CORS headers configured
- [ ] Database migrations applied
- [ ] Agent data synced (KV cache populated)
- [ ] Pages project created
- [ ] Dashboards deployed to Pages
- [ ] Worker URLs updated in dashboards
- [ ] SSL/TLS working (https)
- [ ] SSE streams functional
- [ ] Health checks passing

## 🔍 Troubleshooting

### DNS_PROBE_FINISHED_NXDOMAIN

**Error:** `This site can't be reached` for `.pages.dev` domain

**Cause:** Pages project hasn't been created yet

**Fix:**
```bash
# Deploy dashboards to create the project
wrangler pages deploy dashboards --project-name=betting-brain-dashboards
```

### CORS Errors

**Error:** `Access to fetch blocked by CORS policy`

**Fix:** Update worker CORS headers to allow dashboard domain:
```typescript
'Access-Control-Allow-Origin': 'https://betting-brain-dashboards.pages.dev'
```

### SSE Stream Not Connecting

**Error:** `EventSource failed` or connection timeout

**Fix:**
1. Check worker is running: `curl https://your-worker.workers.dev/health`
2. Check SSE endpoint: `curl -N https://your-worker.workers.dev/api/health/stream`
3. Verify CORS headers include `Content-Type: text/event-stream`

### Dashboard Shows No Data

**Checklist:**
1. ✅ Worker deployed and healthy?
2. ✅ KV cache populated? (`bun scripts/sync-agent-tree.js`)
3. ✅ Database migrations applied?
4. ✅ CORS configured correctly?
5. ✅ Worker URL in dashboard correct?

## 📚 Related Documentation

- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Wrangler Pages Commands](https://developers.cloudflare.com/workers/wrangler/commands/#pages)
- [Production Deployment Guide](./PRODUCTION_DEPLOYMENT.md)
- [Bun Cheat Sheet](../.bun-cheatsheet.md)

---

**Last Updated:** 2025-10-08
**Status:** Local development ✅ | Production deployment ⏳
