# 🚀 Deployment Guide

Complete deployment documentation for Betting Brain v3.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Deployment Architecture](#deployment-architecture)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Deployment Methods](#deployment-methods)
- [CI/CD Pipeline](#cicd-pipeline)
- [Monitoring](#monitoring)
- [Rollback Procedures](#rollback-procedures)
- [Troubleshooting](#troubleshooting)

## 📋 Prerequisites

Before deploying, ensure you have:

1. **Cloudflare Account** - Free tier is sufficient
2. **Node.js 18+** - For running build scripts
3. **Wrangler CLI** - `bun install -g wrangler`
4. **Git** - For version control
5. **GitHub Account** - For CI/CD (optional)

## 🏗️ Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   GitHub Repository                      │
│  (Source Code + CI/CD Workflows)                        │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ Push to main/PR
                 ▼
┌─────────────────────────────────────────────────────────┐
│                  GitHub Actions                          │
│  • Run Tests                                            │
│  • Security Scan                                        │
│  • Deploy to Staging (PRs)                             │
│  • Deploy to Production (main)                         │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ Deploys to
                 ▼
┌─────────────────────────────────────────────────────────┐
│              Cloudflare Workers Edge                     │
│  ┌──────────────────┐  ┌──────────────────┐           │
│  │  Staging Env     │  │  Production Env  │           │
│  │  (PR Testing)    │  │  (Live Traffic)  │           │
│  └──────────────────┘  └──────────────────┘           │
│                                                         │
│  Connected to:                                          │
│  • D1 Database (serverless SQL)                        │
│  • Queues (line-ingress, steam-webhook)                │
│  • Analytics Engine (metrics)                          │
│  • KV Storage (caching - optional)                     │
└─────────────────────────────────────────────────────────┘
                 │
                 │ Monitored by
                 ▼
┌─────────────────────────────────────────────────────────┐
│              Grafana Dashboard                           │
│  • 17 monitoring panels                                 │
│  • Cost cap tracking                                    │
│  • Performance metrics                                  │
│  • Business intelligence                                │
└─────────────────────────────────────────────────────────┘
```

## 🎯 Quick Start

### 1. Clone and Install
```bash
git clone https://github.com/brendadeeznuts1111/betting-brain-v3.git
cd betting-brain-v3
bun install
```

### 2. Authenticate with Cloudflare
```bash
wrangler login
```

### 3. Setup Production Environment
```bash
chmod +x deployment/deploy/*.sh
./deployment/deploy/setup-production.sh
```

This will:
- Create D1 database
- Create queues
- Prompt for API secrets

### 4. Deploy to Production
```bash
./deploy/production-deploy.sh
```

## 🔧 Configuration

### Environment Files

**wrangler.toml** (main configuration):
```toml
name = "betting-brain-v3"
main = "src/index.ts"
compatibility_date = "2023-12-01"

[env.production]
name = "betting-brain-v3-prod"

[[d1_databases]]
binding = "ANALYTICS"
database_name = "betting-analytics"
database_id = "your-database-id"
```

### Secrets Configuration

Set secrets using wrangler CLI:
```bash
wrangler secret put SPORTSBET_IO_API_KEY --env=production
wrangler secret put PINNACLE_API_KEY --env=production
wrangler secret put ODDS_API_KEY --env=production
wrangler secret put BET_MGM_API_KEY --env=production
wrangler secret put CLONE_BOTANICA_API_KEY --env=production
```

Or use the setup script which prompts for each secret interactively.

## 🚀 Deployment Methods

### Method 1: Automated Deployment (Recommended)

**Via GitHub Actions:**

1. Push to `main` branch triggers production deployment
2. Pull requests trigger staging deployment
3. All deployments include automated testing

```bash
git add .
git commit -m "Deploy to production"
git push origin main
```

Monitor deployment at: https://github.com/your-username/betting-brain-v3/actions

### Method 2: Manual Deployment

**Staging (Quick Testing):**
```bash
./deploy/staging-deploy.sh
```

**Production (With Health Checks):**
```bash
./deploy/production-deploy.sh
```

### Method 3: Direct Wrangler

**For advanced users:**
```bash
# Apply migrations
bunx wrangler d1 migrations apply betting-analytics --env production

# Deploy worker
bunx wrangler deploy --env production
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflows

**1. Main Deployment Pipeline** (`.github/workflows/deploy.yml`)
- Triggered on: Push to main, Pull requests
- Steps:
  1. Link check documentation
  2. Run tests
  3. Deploy to staging (PRs)
  4. Deploy to production (main branch)
  5. Create release tags

**2. Documentation Deployment** (`.github/workflows/deploy-docs.yml`)
- Triggered on: Doc changes, manual dispatch
- Deploys documentation to GitHub Pages
- Creates beautiful HTML documentation site

### Required GitHub Secrets

Configure these in your repository settings:

| Secret | Description | How to Get |
|--------|-------------|------------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token | Create at https://dash.cloudflare.com/profile/api-tokens |
| `CLOUDFLARE_ACCOUNT_ID` | Your account ID | Find at https://dash.cloudflare.com |

## 📊 Monitoring

### Health Checks

**Basic Health:**
```bash
curl https://betting-brain-v3-prod.workers.dev/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-07T12:00:00Z"
}
```

### Grafana Dashboard

Access your monitoring dashboard:
1. Import `monitoring/grafana/dashboard.json` to your Grafana instance
2. Configure data sources (Cloudflare Analytics Engine + Prometheus)
3. View 17 real-time monitoring panels

See `monitoring/grafana/README.md` for detailed setup instructions.

### Cloudflare Dashboard

Monitor your deployment:
- **Workers:** https://dash.cloudflare.com/workers
- **D1:** https://dash.cloudflare.com/d1
- **Queues:** https://dash.cloudflare.com/queues
- **Analytics:** https://dash.cloudflare.com/analytics-engine

### Logs

View real-time logs:
```bash
wrangler tail --env=production
```

Filter by status:
```bash
wrangler tail --env=production --status error
```

## 🚨 Rollback Procedures

### Automatic Rollback

The production deployment script creates rollback tags automatically.

### Manual Rollback

**Option 1: Rollback via Git**
```bash
# View recent commits
git log --oneline -5

# Rollback to previous commit
git checkout HEAD~1

# Deploy previous version
bunx wrangler deploy --env=production
```

**Option 2: Rollback via Wrangler**
```bash
# List recent deployments
wrangler deployments list --env=production

# Rollback to specific deployment
wrangler rollback <deployment-id> --env=production
```

**Option 3: Use Rollback Tag**
```bash
# Find rollback tag
ls -la backups/

# Checkout tag
git checkout $(cat backups/latest/rollback-tag.txt)

# Deploy
bunx wrangler deploy --env=production
```

## 🐛 Troubleshooting

### Common Issues

**Issue: "wrangler not found"**
```bash
# Solution: Install wrangler globally
bun install -g wrangler@latest
```

**Issue: "Not authenticated with Cloudflare"**
```bash
# Solution: Login to Cloudflare
wrangler login
```

**Issue: "Database not found"**
```bash
# Solution: Run setup script
./deployment/deploy/setup-production.sh

# Or create database manually
wrangler d1 create betting-analytics
```

**Issue: "Deployment failed"**
```bash
# Check logs
wrangler tail --env=production --status error

# Verify configuration
wrangler whoami
wrangler d1 list
wrangler secret list --env=production
```

**Issue: "Tests failing"**
```bash
# Run tests locally
bun test

# Check TypeScript errors
bun run lint

# Fix and retry
```

### Health Check Failures

If health checks fail after deployment:

1. **Check worker logs:**
   ```bash
   wrangler tail --env=production
   ```

2. **Verify database:**
   ```bash
   wrangler d1 execute betting-analytics --command "SELECT 1"
   ```

3. **Check secrets:**
   ```bash
   wrangler secret list --env=production
   ```

4. **Rollback if needed:**
   ```bash
   wrangler rollback --env=production
   ```

## 📈 Best Practices

### Pre-Deployment Checklist

- [ ] All tests pass (`bun test`)
- [ ] TypeScript compiles (`bun run lint`)
- [ ] Documentation links verified (`bun run link-check`)
- [ ] Secrets configured correctly
- [ ] Staging deployment tested
- [ ] Database migrations reviewed
- [ ] Rollback procedure understood

### Deployment Frequency

- **Staging:** As often as needed for testing
- **Production:** 
  - Hotfixes: Immediately after verification
  - Features: During low-traffic periods
  - Major changes: With extended monitoring

### Security Best Practices

1. **Never commit secrets** to git
2. **Rotate API keys** regularly
3. **Use environment-specific secrets** (staging vs production)
4. **Enable Cloudflare WAF** for production
5. **Monitor for unusual activity** in Grafana
6. **Keep dependencies updated** (`bun audit`)

## 🌍 Custom Domain Setup

### Optional: Configure Custom Domain

1. **Add domain in Cloudflare Dashboard**
2. **Update wrangler.toml:**
   ```toml
   [env.production]
   routes = [
     { pattern = "api.yourdomain.com/*", zone_name = "yourdomain.com" }
   ]
   ```

3. **Add DNS record:**
   ```
   Type: CNAME
   Name: api
   Target: betting-brain-v3-prod.workers.dev
   ```

4. **Deploy:**
   ```bash
   bunx wrangler deploy --env=production
   ```

## 📚 Additional Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Guide](https://developers.cloudflare.com/workers/wrangler/)
- [D1 Database Guide](https://developers.cloudflare.com/d1/)
- [Queues Documentation](https://developers.cloudflare.com/queues/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

## ✅ Post-Deployment Verification

After deployment, verify:

1. **Health endpoint returns 200:**
   ```bash
   curl -I https://betting-brain-v3-prod.workers.dev/health
   ```

2. **Grafana dashboard shows metrics**
3. **Queues are processing messages**
4. **Database migrations applied successfully**
5. **No errors in Cloudflare dashboard**

---

**Version:** 3.0.0  
**Last Updated:** October 7, 2025  
**Maintained By:** Betting-Brain Team  
**Status:** ✅ Production Ready

