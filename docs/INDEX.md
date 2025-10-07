# 📚 Documentation Index - Betting-Brain v3

**Complete Navigation Map** | [Quick Start](QUICKSTART.md) | [Architecture](IMPLEMENTATION_SUMMARY.md) | [CI/CD](../.github/workflows/deploy.yml)

---

## 🎯 Quick Navigation

| Area | Entry Point | Description |
|------|-------------|-------------|
| **Overview** | [README.md](../README.md) | Main project documentation |
| **Quick Start** | [QUICKSTART.md](QUICKSTART.md) | 15-second setup guide |
| **Architecture** | [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) | Technical deep-dive |
| **Structure** | [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) | File organization guide |
| **Deployment** | [DEPLOYMENT.md](DEPLOYMENT.md) | Complete deployment guide |
| **API Docs** | _Generated at build time_ | OpenAPI 3.0 specification |
| **Database** | [../migrations/](../migrations/) | D1 schema & migrations |
| **Tests** | [../tests/](../tests/) | Unit test suite |
| **Scripts** | [../scripts/](../scripts/) | Automation & deployment |
| **Deploy Scripts** | [../deployment/deploy/](../deployment/deploy/) | Production deployment tools |
| **Dashboards** | [../monitoring/grafana/dashboard.json](../monitoring/grafana/dashboard.json) | Grafana monitoring |
| **CI/CD** | [../.github/workflows/deploy.yml](../.github/workflows/deploy.yml) | GitHub Actions |
| **Contributing** | [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute |
| **Changelog** | [CHANGELOG.md](CHANGELOG.md) | Version history |
| **License** | [../LICENSE](../LICENSE) | MIT License |

---

## 📖 Documentation Files

### Core Documentation
| Document | Purpose | Audience | Status |
|----------|---------|----------|--------|
| [QUICKSTART.md](QUICKSTART.md) | Fast setup & deployment | Developers | ✅ Complete |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Full deployment guide | DevOps, All Devs | ✅ Complete |
| [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) | Architecture overview | Architects | ✅ Complete |
| [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) | Codebase organization | All Devs | ✅ Complete |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | Common issues & solutions | All Devs | ✅ Complete |
| [CODEBASE_REVIEW.md](CODEBASE_REVIEW.md) | Complete codebase analysis | All Teams | ✅ Complete |
| [ROOT_STRUCTURE.md](ROOT_STRUCTURE.md) | Root directory reference | Maintainers | ✅ Complete |

### API Documentation ✨ NEW
| Document | Purpose | Audience | Status |
|----------|---------|----------|--------|
| [REST_API_REFERENCE.md](REST_API_REFERENCE.md) | Complete REST API docs (9 endpoints) 🆕 | Developers | ✅ Complete |
| [API_ENHANCEMENT_SUMMARY.md](API_ENHANCEMENT_SUMMARY.md) | API layer overview & features 🆕 | All Teams | ✅ Complete |

### MCP Integration ✨ NEW
| Document | Purpose | Audience | Status |
|----------|---------|----------|--------|
| [MCP_INTEGRATION_STATUS.md](MCP_INTEGRATION_STATUS.md) | MCP server status & overview | All Teams | ✅ Complete |
| [MCP_ENDPOINTS.md](MCP_ENDPOINTS.md) | Complete API docs (13 tools) | Developers | ✅ Complete |
| [MCP_TESTING_GUIDE.md](MCP_TESTING_GUIDE.md) | Testing procedures | QA, Developers | ✅ Complete |
| [MCP_VERIFICATION_REPORT.md](MCP_VERIFICATION_REPORT.md) | Complete MCP verification results 🆕 | All Teams | ✅ Complete |

### System Integration ✨ NEW
| Document | Purpose | Audience | Status |
|----------|---------|----------|--------|
| [ENDPOINT_DASHBOARD_INTEGRATION.md](ENDPOINT_DASHBOARD_INTEGRATION.md) | Endpoint & dashboard mapping | All Devs | ✅ Complete |
| [SYSTEM_INTEGRATION_MAP.md](SYSTEM_INTEGRATION_MAP.md) | Visual architecture diagrams | Architects | ✅ Complete |
| [DATABASE_CRON_VERIFICATION.md](DATABASE_CRON_VERIFICATION.md) | Database & cron verification | DevOps | ✅ Complete |

### Quality & Testing ✨ NEW
| Document | Purpose | Audience | Status |
|----------|---------|----------|--------|
| [TEST_AUDIT_REPORT.md](TEST_AUDIT_REPORT.md) | Test quality audit (100/100) | QA, Leads | ✅ Complete |
| [CODE_QUALITY_AUDIT.md](CODE_QUALITY_AUDIT.md) | Code quality review | All Devs | ✅ Complete |
| [TESTING_STATUS.md](TESTING_STATUS.md) | Current testing status | QA | ✅ Complete |
| [BET_TICKER_SNIFFER.md](BET_TICKER_SNIFFER.md) | API interception docs | Developers | ✅ Complete |

### Developer Resources ✨ NEW
| Document | Purpose | Audience | Status |
|----------|---------|----------|--------|
| [CURSOR_RULES.md](CURSOR_RULES.md) | AI assistant rules guide (10 rules) | AI Assistants | ✅ Complete |
| [AUTOMATION_GUIDE.md](AUTOMATION_GUIDE.md) | Testing workflows | Developers | ✅ Complete |
| [SRC_DIRECTORY_REVIEW.md](SRC_DIRECTORY_REVIEW.md) | Complete src/ analysis | All Devs | ✅ Complete |
| [FANTASY402_INTEGRATION.md](FANTASY402_INTEGRATION.md) | fantasy402.com integration guide | All Devs | ✅ Complete |
| [DASHBOARD_REFACTORING_SUMMARY.md](DASHBOARD_REFACTORING_SUMMARY.md) | Dashboard refactoring (60% reduction) 🆕 | All Devs | ✅ Complete |
| [dashboards/README.md](../dashboards/README.md) | Dashboard organization & shared utilities 🆕 | Frontend | ✅ Complete |
| [AST_GREP_QUICKSTART.md](AST_GREP_QUICKSTART.md) | ast-grep code search guide (WORKING!) 🆕 | All Devs | ✅ Complete |
| [sgconfig.yml](../sgconfig.yml) | ast-grep project configuration 🆕 | All Devs | ✅ Complete |

### Archive (Historical)
| Document | Purpose | Status |
|----------|---------|--------|
| [archive/BUILD_REPORT.md](archive/BUILD_REPORT.md) | Historical build stats | 📦 Archived |
| [archive/FINAL_REVIEW.md](archive/FINAL_REVIEW.md) | Previous review | 📦 Archived |
| [archive/FIXES_APPLIED.md](archive/FIXES_APPLIED.md) | Historical fixes | 📦 Archived |
| [archive/LINK_VERIFICATION.md](archive/LINK_VERIFICATION.md) | Previous link audit | 📦 Archived |

### Deployment Scripts
| Script | Purpose | Usage |
|--------|---------|-------|
| [../deploy/setup-production.sh](../deploy/setup-production.sh) | Initial production setup | One-time environment creation |
| [../deploy/production-deploy.sh](../deploy/production-deploy.sh) | Safe production deployment | Deploy with health checks & rollback |
| [../deploy/staging-deploy.sh](../deploy/staging-deploy.sh) | Quick staging deployment | Test changes before production |
| [../deploy/README.md](../deploy/README.md) | Deployment guide | Full deployment documentation |

---

## 🏗️ Infrastructure

### Cloudflare Workers
| Component | Path | Description |
|-----------|------|-------------|
| **Main Worker** | [../src/index.ts](../src/index.ts) | Entry point & routing |
| **Wrangler Config** | [../wrangler.toml](../wrangler.toml) | Worker configuration |
| **Environment** | [../.env.example](../.env.example) | Env variable template |

### Database (D1)
| Component | Path | Description |
|-----------|------|-------------|
| **Initial Schema** | [../migrations/0001_initial_schema.sql](../migrations/0001_initial_schema.sql) | Tables & indexes |
| **TTL Triggers** | [../migrations/0002_add_ttl.sql](../migrations/0002_add_ttl.sql) | Auto-cleanup triggers |
| **Type Definitions** | [../src/types/database.ts](../src/types/database.ts) | TypeScript types |

### Queues
| Queue | Consumer | Purpose |
|-------|----------|---------|
| **line-ingress** | [../src/queues/lineIngress.ts](../src/queues/lineIngress.ts) | Line movement ingestion |
| **steam-webhook** | [../src/queues/steamWebhook.ts](../src/queues/steamWebhook.ts) | Steam detection alerts |

### Scheduled Jobs
| Schedule | Handler | Frequency |
|----------|---------|-----------|
| **Sharp Calc** | [../src/schedules/sharpCalc.ts](../src/schedules/sharpCalc.ts) | Hourly |
| **Exposure Calc** | [../src/schedules/exposureCalc.ts](../src/schedules/exposureCalc.ts) | Every 30s |

---

## 🔧 Development

### Setup & Scripts
| Script | Path | Purpose |
|--------|------|---------|
| **Bootstrap** | [../scripts/bootstrap.ts](../scripts/bootstrap.ts) | Zero-config setup |
| **Codegen** | [../scripts/codegen.ts](../scripts/codegen.ts) | Generate OpenAPI docs |
| **Deploy** | [../scripts/deploy.ts](../scripts/deploy.ts) | Production deployment |

### Testing
| Test Suite | Path | Coverage |
|------------|------|----------|
| **CLV Tests** | [../tests/clv.test.ts](../tests/clv.test.ts) | Customer lifetime value |
| **Hold Tests** | [../tests/hold.test.ts](../tests/hold.test.ts) | Hold percentage |
| **Exposure Tests** | [../tests/exposure.test.ts](../tests/exposure.test.ts) | Risk exposure |
| **Sharp Tests** | [../tests/sharp.test.ts](../tests/sharp.test.ts) | Sharp scores |
| **Steam Tests** | [../tests/steam.test.ts](../tests/steam.test.ts) | Steam detection |
| **Config** | [../vitest.config.ts](../vitest.config.ts) | Test configuration |

---

## 🔌 MCP Intelligence APIs

| API | Handler | Description |
|-----|---------|-------------|
| **GET /tools/getBettingExposure** | [../src/tools/intelligence/getBettingExposure.ts](../src/tools/intelligence/getBettingExposure.ts) | Current exposure by event |
| **GET /tools/getSharpScore** | [../src/tools/intelligence/getSharpScore.ts](../src/tools/intelligence/getSharpScore.ts) | Customer sharp scores |
| **GET /tools/getHoldPercentage** | [../src/tools/intelligence/getHoldPercentage.ts](../src/tools/intelligence/getHoldPercentage.ts) | Hold % and volume |
| **GET /tools/getCLV** | [../src/tools/intelligence/getCLV.ts](../src/tools/intelligence/getCLV.ts) | Customer lifetime value |

---

## 📊 Monitoring & Observability

### Dashboards
| Dashboard | Path | Description |
|-----------|------|-------------|
| **Grafana Config** | [../monitoring/grafana/dashboard.json](../monitoring/grafana/dashboard.json) | 17-panel monitoring |
| **Dashboard Docs** | [../monitoring/grafana/README.md](../monitoring/grafana/README.md) | Installation & setup guide |
| **Import Script** | [../monitoring/grafana/import.sh](../monitoring/grafana/import.sh) | Automated dashboard deployment |
| **Cost Metrics** | _Embedded in dashboard_ | 4 cost cap gauges |
| **Performance** | _Embedded in dashboard_ | Request latency & error tracking |

### Guards & Limits
| Component | Path | Purpose |
|-----------|------|---------|
| **Cost Cap** | [../src/guards/costCap.ts](../src/guards/costCap.ts) | Resource limits |
| **Rate Limit** | [../src/guards/rateLimit.ts](../src/guards/rateLimit.ts) | 10 req/s per IP |

---

## 🔄 CI/CD Pipeline

| Stage | Workflow | Description |
|-------|----------|-------------|
| **Test** | [../.github/workflows/deploy.yml](../.github/workflows/deploy.yml) | Run all tests |
| **Deploy Staging** | _Same workflow_ | PR deployments |
| **Deploy Production** | _Same workflow_ | Main branch auto-deploy |
| **Rollback** | `npm run rollback` | Instant rollback |

---

## 📦 Package Configuration

| File | Purpose |
|------|---------|
| [../package.json](../package.json) | Dependencies & scripts |
| [../tsconfig.json](../tsconfig.json) | TypeScript config |
| [../.gitignore](../.gitignore) | Git exclusions |

---

## 🔗 Auto-Generated Link Registry (CI-Checked)

<!-- LINKMAP_START -->
**Root Documentation:**
- README.md → docs/QUICKSTART.md
- README.md → docs/IMPLEMENTATION_SUMMARY.md
- README.md → docs/BUILD_REPORT.md
- README.md → docs/REVIEW_AND_GAPS.md
- README.md → docs/FIXES_APPLIED.md
- README.md → LICENSE
- CONTRIBUTING.md → docs/QUICKSTART.md
- CONTRIBUTING.md → docs/IMPLEMENTATION_SUMMARY.md
- CHANGELOG.md → docs/QUICKSTART.md
- CHANGELOG.md → docs/FIXES_APPLIED.md

**Documentation Cross-References:**
- docs/INDEX.md → ../README.md
- docs/INDEX.md → QUICKSTART.md
- docs/INDEX.md → IMPLEMENTATION_SUMMARY.md
- docs/INDEX.md → PROJECT_STRUCTURE.md
- docs/INDEX.md → ../migrations/
- docs/INDEX.md → ../tests/
- docs/INDEX.md → ../scripts/
- docs/INDEX.md → ../monitoring/grafana/dashboard.json
- docs/INDEX.md → ../.github/workflows/deploy.yml
- docs/INDEX.md → ../CONTRIBUTING.md
- docs/INDEX.md → ../CHANGELOG.md
- docs/INDEX.md → ../LICENSE

**Source Code References:**
- docs/INDEX.md → ../src/index.ts
- docs/INDEX.md → ../src/types/database.ts
- docs/INDEX.md → ../src/queues/lineIngress.ts
- docs/INDEX.md → ../src/queues/steamWebhook.ts
- docs/INDEX.md → ../src/schedules/sharpCalc.ts
- docs/INDEX.md → ../src/schedules/exposureCalc.ts
- docs/INDEX.md → ../src/tools/intelligence/
- docs/INDEX.md → ../src/guards/costCap.ts
- docs/INDEX.md → ../src/guards/rateLimit.ts

**Total Links:** 35+ verified internal references
<!-- LINKMAP_END -->

---

## ✅ Link Validation Status

This index is automatically validated by CI:
- ✅ All internal links checked on every commit
- ✅ Dead link detection in PR checks
- ✅ Link registry auto-updated
- ✅ Fails build if broken links found

Run locally:
```bash
npm run link-check
```

---

## 🆘 Quick Help

| Need to... | Go to... |
|------------|----------|
| Set up the project | [QUICKSTART.md](QUICKSTART.md) |
| Fix common issues | [TROUBLESHOOTING.md](TROUBLESHOOTING.md) |
| Understand architecture | [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) |
| Find a specific file | [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) |
| Check build stats | [BUILD_REPORT.md](BUILD_REPORT.md) |
| See recent fixes | [FIXES_APPLIED.md](FIXES_APPLIED.md) |
| Review code quality | [REVIEW_AND_GAPS.md](REVIEW_AND_GAPS.md) |
| Contribute code | [../CONTRIBUTING.md](../CONTRIBUTING.md) |
| See all links | [LINK_VERIFICATION.md](LINK_VERIFICATION.md) |

---

**Last Updated:** October 7, 2025  
**Version:** 3.0.0  
**Total Documents:** 26 active + 4 archived  
**Cursor Rules:** 10 rules (~2,200+ lines)  
**Link Check:** ✅ Passing  
**Maintainer:** Betting-Brain Team

---

## 🏷️ Documentation Topics & Tags

### By Topic
- **#mcp** - MCP_INTEGRATION_STATUS.md, MCP_ENDPOINTS.md, MCP_TESTING_GUIDE.md
- **#testing** - TEST_AUDIT_REPORT.md, TESTING_STATUS.md, MCP_TESTING_GUIDE.md, AUTOMATION_GUIDE.md
- **#deployment** - DEPLOYMENT.md, DATABASE_CRON_VERIFICATION.md, QUICKSTART.md
- **#architecture** - IMPLEMENTATION_SUMMARY.md, SYSTEM_INTEGRATION_MAP.md, PROJECT_STRUCTURE.md
- **#quality** - CODE_QUALITY_AUDIT.md, TEST_AUDIT_REPORT.md, CODEBASE_REVIEW.md
- **#integration** - ENDPOINT_DASHBOARD_INTEGRATION.md, SYSTEM_INTEGRATION_MAP.md, DATABASE_CRON_VERIFICATION.md
- **#developer-tools** - CURSOR_RULES.md, ROOT_STRUCTURE.md, AUTOMATION_GUIDE.md
- **#api** - MCP_ENDPOINTS.md, BET_TICKER_SNIFFER.md, ENDPOINT_DASHBOARD_INTEGRATION.md

### By Audience
- **Developers** - QUICKSTART.md, MCP_ENDPOINTS.md, BET_TICKER_SNIFFER.md, CODE_QUALITY_AUDIT.md
- **DevOps** - DEPLOYMENT.md, DATABASE_CRON_VERIFICATION.md, TESTING_STATUS.md
- **Architects** - IMPLEMENTATION_SUMMARY.md, SYSTEM_INTEGRATION_MAP.md
- **QA** - TEST_AUDIT_REPORT.md, TESTING_STATUS.md, MCP_TESTING_GUIDE.md
- **AI Assistants** - CURSOR_RULES.md, ROOT_STRUCTURE.md, CODEBASE_REVIEW.md
- **All Teams** - MCP_INTEGRATION_STATUS.md, CODEBASE_REVIEW.md, TROUBLESHOOTING.md

### By Priority
- **🚀 Start Here** - README.md, QUICKSTART.md, INDEX.md
- **🏗️ Core** - IMPLEMENTATION_SUMMARY.md, PROJECT_STRUCTURE.md, DEPLOYMENT.md
- **✨ New Features** - MCP_INTEGRATION_STATUS.md, MCP_ENDPOINTS.md, ENDPOINT_DASHBOARD_INTEGRATION.md
- **🔧 Operations** - DEPLOYMENT.md, DATABASE_CRON_VERIFICATION.md, TROUBLESHOOTING.md
- **📊 Quality** - TEST_AUDIT_REPORT.md, CODE_QUALITY_AUDIT.md, TESTING_STATUS.md
