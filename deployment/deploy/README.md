# 🚀 Deployment Guide

Comprehensive deployment infrastructure for Betting Brain v3.

## 📁 Scripts Overview

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `setup-production.sh` | Initial production setup | One-time, before first deployment |
| `staging-deploy.sh` | Quick staging deployment | Testing changes before production |
| `production-deploy.sh` | Safe production deployment | Deploying to live environment |

## 🎯 Quick Start

### 1. Initial Setup (One Time)
```bash
# Make scripts executable
chmod +x deploy/*.sh

# Setup production environment
./deploy/setup-production.sh
```

This creates:
- ✅ Production D1 database
- ✅ Production queues (line-ingress, steam-webhook, DLQs)
- ✅ Required secrets configuration

### 2. Regular Deployment Flow
```bash
# Step 1: Deploy to staging for testing
./deploy/staging-deploy.sh

# Step 2: Test staging environment
curl https://betting-brain-v3-staging.workers.dev/health

# Step 3: Deploy to production
./deploy/production-deploy.sh
```

## 🔧 Script Details

### setup-production.sh
**Initial production environment setup**

Features:
- Checks Cloudflare authentication
- Creates D1 database
- Creates all required queues
- Configures production secrets
- Provides next steps guidance

Example:
```bash
./deploy/setup-production.sh
```

### staging-deploy.sh
**Quick staging deployment for testing**

Features:
- Runs quick tests
- Applies database migrations
- Deploys to staging environment
- Provides staging URL for testing

Example:
```bash
./deploy/staging-deploy.sh
```

### production-deploy.sh
**Safe production deployment with rollback**

Features:
- Dependency validation
- Comprehensive testing
- Automatic backup creation
- Database migration application
- Health checks
- Smoke tests
- Deployment monitoring
- Rollback capability

Example:
```bash
./deploy/production-deploy.sh
```

## 🌍 Environments

### Staging Environment
- **Purpose:** Testing and validation
- **URL:** `https://betting-brain-v3-staging.workers.dev`
- **Database:** Local/staging D1
- **Deployment:** Quick, no health checks required

### Production Environment
- **Purpose:** Live traffic
- **URL:** `https://betting-brain-v3-prod.workers.dev`
- **Database:** Production D1 with backups
- **Deployment:** Full checks, monitoring, rollback support

## 🔐 Secrets Management

Required secrets for production:

```bash
# Set using wrangler CLI
wrangler secret put SPORTSBET_IO_API_KEY --env=production
wrangler secret put PINNACLE_API_KEY --env=production
wrangler secret put ODDS_API_KEY --env=production
wrangler secret put BET_MGM_API_KEY --env=production
wrangler secret put CLONE_BOTANICA_API_KEY --env=production
```

Or use the setup script which will prompt for each:
```bash
./deploy/setup-production.sh
```

## 📊 Monitoring

### Health Check Endpoints
```bash
# Basic health
curl https://betting-brain-v3-prod.workers.dev/health

# Detailed status (when implemented)
curl https://betting-brain-v3-prod.workers.dev/api/v3/status
```

### Cloudflare Dashboard
Monitor your deployment at: https://dash.cloudflare.com

### Grafana Dashboard
View real-time metrics in your Grafana dashboard (see `grafana/` directory)

## 🚨 Rollback Procedures

### Automatic Rollback
The production deployment script creates automatic rollback tags.

### Manual Rollback
```bash
# Find rollback tag
cat backups/*/rollback-tag.txt

# Rollback to previous version
git checkout HEAD~1
npx wrangler deploy --env=production
```

## 🔄 CI/CD Integration

The deployment scripts integrate with GitHub Actions:

### Workflows
- `.github/workflows/deploy.yml` - Main deployment pipeline
- Automated testing on PRs
- Staging deployment for PRs
- Production deployment on main branch

### GitHub Secrets Required
- `CLOUDFLARE_API_TOKEN` - Your Cloudflare API token
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID

## 📋 Pre-Deployment Checklist

Before deploying to production:

- [ ] All tests pass (`npm test`)
- [ ] TypeScript compiles (`npm run lint`)
- [ ] Secrets are configured
- [ ] Database migrations are ready
- [ ] Staging deployment tested
- [ ] Grafana dashboard configured
- [ ] Rollback plan understood

## 🐛 Troubleshooting

### "wrangler not found"
```bash
npm install -g wrangler@latest
```

### "Not authenticated"
```bash
wrangler login
```

### "Database not found"
```bash
# Run setup script
./deploy/setup-production.sh
```

### "Deployment failed"
```bash
# Check logs
wrangler tail --env=production

# Verify secrets
wrangler secret list --env=production
```

## 📖 Additional Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)
- [D1 Database Docs](https://developers.cloudflare.com/d1/)
- [Queues Docs](https://developers.cloudflare.com/queues/)

## 🎉 Success Indicators

After deployment, verify:
- ✅ Health endpoint returns 200
- ✅ No errors in Cloudflare dashboard
- ✅ Grafana dashboard shows metrics
- ✅ Queues are processing messages
- ✅ Database migrations applied

---

**Version:** 3.0.0  
**Last Updated:** October 7, 2025  
**Maintained By:** Betting-Brain Team

