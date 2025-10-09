# Production Deployment Guide

Complete end-to-end deployment workflow using Bun + Cloudflare Workers.

## 🎯 Zero-Drift Guarantee

With our `bunfig.toml` configuration, deployments are **100% reproducible**:

```bash
# CI Command (same as local)
bun install --frozen-lockfile --production --silent
```

**Guarantees:**
- ✅ Same dependency tree every time (frozen lockfile)
- ✅ No devDependencies in production (--production)
- ✅ Clean CI logs (--silent)
- ✅ Patches auto-applied from `/patches`
- ✅ No lifecycle scripts (trustLevel='low')

## 🚀 Deployment Pipeline

### 1. **Install Phase** (2-5 seconds with cache)

```yaml
- name: Install dependencies
  env:
    NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
  run: bun install --frozen-lockfile --production --silent
```

**Why it's fast:**
- Remote cache hits 99% of the time (`[install.cache]`)
- Binary lockfile (`bun.lock` vs `package-lock.json`)
- Native Bun speed (20-100x faster than npm)

### 2. **Quality Gates**

```bash
# Type check
bun run type-check              # TypeScript validation

# Lint
bun run lint                    # Code style checks

# Test
bun test --coverage            # Unit + integration tests
```

**Exit codes:**
- `0` = Pass → Continue pipeline
- `1` = Fail → Block deployment

### 3. **Database Migrations**

```bash
# Apply D1 migrations (idempotent)
wrangler d1 migrations apply betting-analytics --remote
```

**Safety:**
- Migrations run before worker deployment
- Idempotent SQL (safe to re-run)
- Rollback available via `--local` testing

### 4. **Worker Deployment**

```bash
# Deploy to Cloudflare Workers
bun run deploy

# Health check
curl -f https://betting-brain-v3-prod.workers.dev/health
```

**Zero-downtime:**
- Cloudflare routes traffic to new version
- Old version stays live during rollout
- Health check validates deployment

### 5. **Dashboard Deployment**

```bash
# Deploy static dashboards to Pages
wrangler pages deploy dashboards --project-name=betting-brain-dashboards
```

**Auto-updated:**
- floor-control.html
- hierarchy-enhanced.html
- All CDN assets (Chart.js, htmx)

### 6. **Smoke Tests**

```bash
# Test critical endpoints
curl -f https://betting-brain-v3-prod.workers.dev/health
curl -f https://betting-brain-v3-prod.workers.dev/mcp
curl -f https://betting-brain-v3-prod.workers.dev/api/f402/agents

# Test dashboards
curl -f https://betting-brain-dashboards.pages.dev/floor-control.html
```

## 📋 Pre-Deployment Checklist

### Local Testing

```bash
# 1. Install with production config
bun install --frozen-lockfile

# 2. Run full test suite
bun test --coverage

# 3. Type check
bun run type-check

# 4. Test migrations locally
wrangler d1 migrations apply betting-analytics --local

# 5. Test worker locally
wrangler dev --local

# 6. Test dashboards
bun dashboards/server.ts
```

### Environment Variables

Ensure these secrets are set in GitHub Actions:

```bash
CLOUDFLARE_API_TOKEN       # Workers deployment
CLOUDFLARE_ACCOUNT_ID      # Account identifier
NPM_TOKEN                  # Private registry (if used)
```

**Set via:**
```bash
gh secret set CLOUDFLARE_API_TOKEN
gh secret set CLOUDFLARE_ACCOUNT_ID
gh secret set NPM_TOKEN
```

## 🔄 Update Workflow

### Safe Dependency Updates

```bash
# Update all deps to latest within range
bun update

# Test locally
bun test

# Verify no breaking changes
bun run type-check

# Commit lockfile
git add bun.lock
git commit -m "chore: update dependencies"
git push
```

**CI automatically:**
- Installs with new lockfile
- Runs all tests
- Deploys if green

### Patching Dependencies

```bash
# Create a patch
bun patch <package>@<version>
# Example: bun patch left-pad@1.3.0

# Edit the package in your editor
# Save when done

# Patch saved to patches/left-pad@1.3.0.patch

# Test locally
bun install  # Applies patch
bun test

# Commit patch
git add patches/
git commit -m "fix: patch left-pad to handle edge case"
```

**Patches auto-apply** in CI via `patchDir = "patches"` in bunfig.toml.

## 🛡️ Security Best Practices

### 1. **No Lifecycle Scripts**

```toml
[install]
trustLevel = "low"  # Disables postinstall hooks
```

**Why:** Prevents supply chain attacks via malicious install scripts.

**Whitelist if needed:**
```toml
allowedScripts = ["esbuild", "@prisma/engines"]
```

### 2. **Frozen Lockfile in CI**

```bash
bun install --frozen-lockfile
```

**Why:** Ensures exact dependency versions (no surprise updates).

### 3. **Production-Only Deps**

```bash
bun install --production
```

**Why:** Smaller attack surface (no dev tools in production).

### 4. **Environment Variable Auth**

```toml
[install.registry]
password = "$NPM_TOKEN"  # Never commit secrets
```

**Why:** Secrets in env vars, not in repo.

## 📊 Monitoring Post-Deployment

### Worker Health

```bash
# Basic health check
curl https://betting-brain-v3-prod.workers.dev/health

# Expected response:
{
  "status": "healthy",
  "version": "3.3.0",
  "timestamp": "2025-10-08T20:00:00.000Z"
}
```

### Dashboard Status

```bash
# Floor Control
curl -I https://betting-brain-dashboards.pages.dev/floor-control.html
# Expected: HTTP/1.1 200 OK

# Hierarchy Enhanced
curl -I https://betting-brain-dashboards.pages.dev/hierarchy-enhanced.html
# Expected: HTTP/1.1 200 OK
```

### MCP Tools

```bash
# List available tools
curl https://betting-brain-v3-prod.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# Expected: 13 tools
```

### Analytics Engine

Check Cloudflare Dashboard → Analytics Engine for:
- Request volume
- Error rates
- P50/P95/P99 latency
- Cache hit rates

## 🔧 Troubleshooting

### Deployment Fails at Install

**Error:** `lockfile drift detected`

**Fix:**
```bash
# Regenerate lockfile locally
rm bun.lock
bun install
git add bun.lock
git commit -m "fix: regenerate lockfile"
```

### Deployment Fails at Migration

**Error:** `migration already applied`

**Fix:** Migrations are idempotent, safe to re-run. Check migration history:

```bash
wrangler d1 migrations list betting-analytics --remote
```

### Worker Returns 500

**Debug:**
```bash
# Check logs
wrangler tail --format=pretty

# Check specific errors
wrangler tail | grep ERROR
```

### Dashboard Shows No Data

**Checklist:**
1. ✅ Worker deployed and healthy?
2. ✅ Database migrations applied?
3. ✅ Agent data synced? (`bun scripts/sync-agent-tree.js`)
4. ✅ CORS headers set in worker?

**Test data flow:**
```bash
# 1. Worker responds
curl https://betting-brain-v3-prod.workers.dev/api/f402/agents

# 2. Dashboard can fetch
curl -H "Origin: https://betting-brain-dashboards.pages.dev" \
  https://betting-brain-v3-prod.workers.dev/api/f402/agents
```

## 🎯 One-Command Deploy

For local deployments (use CI for production):

```bash
# Complete deployment in one command
bun install --frozen-lockfile && \
  bun test && \
  wrangler d1 migrations apply betting-analytics --remote && \
  bun run deploy && \
  wrangler pages deploy dashboards --project-name=betting-brain-dashboards

# With health check
curl -f https://betting-brain-v3-prod.workers.dev/health || \
  echo "❌ Deployment failed!"
```

## 📚 Related Documentation

- [bunfig.toml Configuration](../bunfig.toml)
- [Bun Cheat Sheet](../.bun-cheatsheet.md)
- [Dashboard README](../dashboards/README.md)
- [GitHub Actions Workflows](../.github/workflows/)

## 🔗 Production URLs

- **Worker**: https://betting-brain-v3-prod.nolarose1968-806.workers.dev
- **Mission Control**: https://betting-brain-dashboards.pages.dev/floor-control.html
- **Hierarchy**: https://betting-brain-dashboards.pages.dev/hierarchy-enhanced.html

---

**Last Updated:** 2025-10-08
**Bun Version:** 1.2.23
**Deployment Strategy:** Zero-drift, frozen lockfile, production-only deps
