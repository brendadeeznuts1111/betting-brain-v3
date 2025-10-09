# Command Reference - Floor, Forest & CLI

## Overview

Betting-Brain v3.3.0 provides **three tiers of commands** for development, automation, and autonomous operations:

1. **CLI** - Direct commands (bun, wrangler, git)
2. **Forest** - Project-level automation & monitoring
3. **Floor** - System-level health, validation & autonomous operations

## Three-Tier Architecture

```
┌─────────────────────────────────────────────────────┐
│  🤖 FLOOR - Autonomous Operations Layer             │
│  (Self-documenting, self-healing, self-deploying)   │
│  • floor:health - Complete health validation        │
│  • floor:test - 60-second smoke test                │
│  • floor:deploy - Health check + deployment         │
│  • floor:mcp - MCP server with 6 tools              │
├─────────────────────────────────────────────────────┤
│  🌲 FOREST - Project Automation Layer               │
│  (Grove health monitoring & release automation)     │
│  • forest - Full status dashboard                   │
│  • forest:health - Service health checks            │
│  • forest:release - Release readiness               │
│  • forest:mcp - MCP integration status              │
├─────────────────────────────────────────────────────┤
│  ⚙️  CLI - Direct Command Layer                     │
│  (Low-level tools & utilities)                      │
│  • bun run dev - Start development server           │
│  • bun test - Run test suite                        │
│  • wrangler deploy - Deploy to Cloudflare           │
│  • git push - Push to repository                    │
└─────────────────────────────────────────────────────┘
```

---

## 🤖 Floor Commands (Autonomous Operations)

**Purpose:** System-level health, validation, and autonomous operations with AI integration.

### Health & Validation

```bash
# Complete health check (lint, types, tests, coverage, security)
bun run floor:health

# 60-second end-to-end smoke test
bun run floor:test

# Quick smoke test (10 seconds)
bun run floor:test:quick

# Apply automatic fixes
bun run floor:fix
```

### MCP Integration

```bash
# Start MCP server (JSON-RPC 2.0 over stdio)
bun run floor:mcp

# List available MCP tools
bun run floor:voice

# Output: forest-status, deploy-dashboards, release,
#         live-odds, live-scores, push-sports-data
```

### Deployment

```bash
# Health check + deploy to production
bun run floor:deploy

# Get live system status (JSON)
bun run floor:status
```

### When to Use Floor Commands

- ✅ Before committing (floor:health)
- ✅ Before deploying (floor:deploy)
- ✅ Validating system end-to-end (floor:test)
- ✅ AI assistant integration (floor:mcp)
- ✅ Live monitoring (floor:status)

---

## 🌲 Forest Commands (Project Automation)

**Purpose:** Project-level automation, grove health monitoring, and release management.

### Dashboard

```bash
# Full status dashboard (default)
bun run forest
bun run forest dashboard

# Output:
# ╔═══════════════════════════════════════╗
# ║  🌲 Forest Grove Status Dashboard    ║
# ╚═══════════════════════════════════════╝
#
# 🏥 Health:        ✅ All services healthy
# 🔄 Dependencies:  ✅ Up to date
# 📦 Release:       ✅ Ready
# 📊 Analytics:     ✅ Tests passing
# 🔌 MCP:           ✅ 6 tools operational
```

### Individual Checks

```bash
# Health check all services
bun run forest health
bun run forest:health
bun run forest h

# Dependency freshness
bun run forest fresh
bun run forest:fresh
bun run forest f

# Release readiness
bun run forest release
bun run forest:release
bun run forest r

# Analytics testing status
bun run forest analytics
bun run forest:analytics
bun run forest a

# MCP server status
bun run forest mcp
bun run forest:mcp
bun run forest m
```

### Environment Variables

```bash
# Configure Forest CLI
export WORKER_URL=https://betting-brain-v3.workers.dev
export PAGES_URL=https://dashboards.pages.dev
export GRAFANA_URL=https://grafana.example.com

# Run with custom config
WORKER_URL=http://localhost:8787 bun run forest
```

### When to Use Forest Commands

- ✅ Daily status checks (forest)
- ✅ Pre-release validation (forest:release)
- ✅ Dependency updates (forest:fresh)
- ✅ Monitoring grove health (forest:health)
- ✅ MCP integration verification (forest:mcp)

---

## ⚙️ CLI Commands (Direct Tools)

**Purpose:** Low-level development, testing, deployment, and git operations.

### Development

```bash
# Start development server with hot reload
bun run dev

# Start without hot reload
bun run start

# Local Cloudflare Workers environment
wrangler dev --local
```

### Testing

```bash
# Run all tests
bun test

# Run with coverage
bun run test:coverage

# Run specific test file
bun test tests/unit/clv.test.ts

# Watch mode
bun run test:watch

# CI mode (concurrent, randomized)
bun run test:ci
```

### Code Quality

```bash
# Lint code
bun run lint

# Fix linting issues
bun run lint:fix

# Format code
bun run format

# Type check
bun run type-check

# Security scan (ast-grep)
bun run security
```

### Building

```bash
# Build for production
bun run build

# Build with minification
bun run build:worker
```

### Deployment

```bash
# Deploy to default environment
wrangler deploy

# Deploy to production
wrangler deploy --env production

# Deploy to staging
bun run deploy:staging
```

### Database

```bash
# List migrations
wrangler d1 migrations list betting-analytics --local

# Apply migrations locally
wrangler d1 migrations apply betting-analytics --local

# Apply to production
wrangler d1 migrations apply betting-analytics --remote

# Query database
wrangler d1 execute betting-analytics --local --command "SELECT * FROM bets LIMIT 5"
```

### Monitoring

```bash
# Tail worker logs
wrangler tail --format pretty

# Health check
curl https://betting-brain-v3.workers.dev/health

# View live metrics
bun run monitor:worker
```

### Git Operations

```bash
# Stage all changes
git add -A

# Commit with message
git commit -m "feat: add new feature"

# Push to remote
git push origin main

# View commit history
git log --oneline -10
```

---

## 🔄 Typical Workflows

### 1. Daily Development

```bash
# 1. Check grove health
bun run forest

# 2. Start development
bun run dev

# 3. Make changes...

# 4. Run tests
bun test

# 5. Check health before commit
bun run floor:health

# 6. Commit changes
git add -A && git commit -m "feat: update"

# 7. Push
git push origin main
```

### 2. Pre-Release

```bash
# 1. Check release readiness
bun run forest:release

# 2. Run smoke test
bun run floor:test

# 3. Apply migrations
wrangler d1 migrations apply betting-analytics --remote

# 4. Deploy
bun run floor:deploy

# 5. Verify deployment
bun run floor:status
```

### 3. Debugging

```bash
# 1. Check system health
bun run floor:health

# 2. Check grove status
bun run forest

# 3. Tail worker logs
wrangler tail --format pretty

# 4. Check specific service
bun run forest:health

# 5. Run targeted tests
bun test tests/integration/
```

### 4. MCP Integration

```bash
# 1. Start MCP server
bun run floor:mcp

# 2. In another terminal, test tools
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | bun run floor:mcp

# 3. Check MCP status
bun run forest:mcp

# 4. List available tools
bun run floor:voice
```

---

## 📊 Command Comparison

| Task | CLI | Forest | Floor |
|------|-----|--------|-------|
| **Health Check** | `bun test` | `forest:health` | `floor:health` |
| **Deploy** | `wrangler deploy` | - | `floor:deploy` |
| **Status** | `curl /health` | `forest` | `floor:status` |
| **Tests** | `bun test` | - | `floor:test` |
| **MCP** | - | `forest:mcp` | `floor:mcp` |
| **Release** | - | `forest:release` | - |
| **Dependencies** | `bun update` | `forest:fresh` | - |

---

## 🎯 When to Use Which Tier

### Use **CLI** when:
- Developing locally
- Running specific tests
- Deploying manually
- Debugging issues
- Managing database migrations

### Use **Forest** when:
- Checking grove health
- Preparing for release
- Monitoring dependencies
- Viewing project status
- Validating MCP integration

### Use **Floor** when:
- Validating system health
- Running smoke tests
- Deploying with safety checks
- Integrating with AI assistants
- Monitoring live system status

---

## 🚀 Quick Reference

### Most Common Commands

```bash
# Daily status check
bun run forest

# Before committing
bun run floor:health

# Before deploying
bun run floor:test

# Deploy safely
bun run floor:deploy

# Live monitoring
bun run floor:status

# MCP integration
bun run floor:mcp
```

### Emergency Commands

```bash
# Check what's wrong
bun run forest
bun run floor:health

# View logs
wrangler tail --format pretty

# Rollback deployment
wrangler deployments list --env production
wrangler rollback <version-id> --env production

# Restart services
pkill -f mcp-server
bun run floor:mcp
```

---

## 📚 Documentation References

### Floor System
- [FLOOR_SYSTEM.md](FLOOR_SYSTEM.md) - Complete Floor documentation
- [FLOOR_SMOKE_TEST.md](FLOOR_SMOKE_TEST.md) - 60-second validation guide
- [.cursor/rules/99-floor.mdc](../.cursor/rules/99-floor.mdc) - Floor rules

### Forest CLI
- [scripts/forest.ts](../scripts/forest.ts) - Forest CLI implementation
- [docs/AUTOMATION_GUIDE.md](AUTOMATION_GUIDE.md) - Automation documentation

### CLI Tools
- [QUICKSTART.md](QUICKSTART.md) - Quick setup guide
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment documentation
- [TESTING_STATUS.md](TESTING_STATUS.md) - Testing guide

---

## 🔗 Integration

### CI/CD Integration

```yaml
# .github/workflows/deploy.yml
jobs:
  test:
    - run: bun run floor:test:quick

  deploy:
    - run: bun run floor:deploy
```

### Pre-Commit Hook

```bash
#!/bin/sh
# .git/hooks/pre-commit
bun run floor:health || exit 1
```

### Pre-Push Hook

```bash
#!/bin/sh
# .git/hooks/pre-push
bun run floor:test:quick || exit 1
```

---

**The three-tier command system (CLI → Forest → Floor) provides a complete development, automation, and autonomous operations framework.**

**Status:** Production-Ready ✅
**Version:** 3.3.0
**Last Updated:** 2025-10-08
**Maintainer:** Betting-Brain Team
