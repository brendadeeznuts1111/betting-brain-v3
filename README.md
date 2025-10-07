# 🧠 Betting-Brain v3

[![CI](https://github.com/brendadeeznuts1111/betting-brain-v3/actions/workflows/deploy.yml/badge.svg)](https://github.com/brendadeeznuts1111/betting-brain-v3/actions/workflows/deploy.yml)
[![Link Check](https://github.com/brendadeeznuts1111/betting-brain-v3/actions/workflows/deploy.yml/badge.svg?job=linkcheck)](https://github.com/brendadeeznuts1111/betting-brain-v3/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](tsconfig.json)

**Zero-downtime, zero-config, zero-cost** betting intelligence layer running entirely on Cloudflare Edge.

[📚 Documentation Index](docs/INDEX.md) | [🚀 Quick Start](docs/QUICKSTART.md) | [🏗️ Architecture](docs/IMPLEMENTATION_SUMMARY.md) | [📊 Dashboard](monitoring/grafana/dashboard.json)

## 🎯 What Changed in v3

- **Edge-Native**: Runs entirely on Cloudflare Edge (D1, Workers, Queues, Analytics Engine)
- **Typed**: Full TypeScript with Zod validation for all inputs/outputs
- **Auto-Scaling**: Queues scale to zero when empty
- **Cost-Cap**: Hard-wired cost controls with graceful degradation
- **1-Command Roll-out**: Single command deployment with instant rollback

## 🚀 Quick Start (30 seconds)

### 0. Pre-flight
```bash
# Clone the repository
git clone https://github.com/brendadeeznuts1111/betting-brain-v3.git
cd betting-brain-v3
bun install
wrangler login   # once per machine
```

### 1. Deploy
```bash
bun run deploy:prod
```

**Live in 60 seconds** with auto-generated Grafana dashboard!

## 📊 Core Metrics

| Metric | Alert Threshold | Cost Cap | Unit Test |
|--------|----------------|----------|-----------|
| **CLV** | < -2% | 1k customers/hour | `clv.test.ts` |
| **Hold %** | < 4% or > 8% | 300s cache | `hold.test.ts` |
| **Exposure** | > $50k or > 60% | 50 rows/event | `exposure.test.ts` |
| **Sharp Score** | > 60 | top-100 only | `sharp.test.ts` |
| **Steam Move** | ≥ 3σ in ≤ 60s | 5min dedupe | `steam.test.ts` |

## 🗄️ Database Schema

### Line Movements (7-day TTL, ROWID+LZ4)
```sql
CREATE TABLE line_movements (
  eid  TEXT NOT NULL,    -- Event ID
  mt   TEXT NOT NULL,    -- Market Type
  lb   SMALLINT,         -- Line Before
  la   SMALLINT,         -- Line After
  vb   INT,              -- Volume Before
  va   INT,              -- Volume After
  ts   DATETIME,         -- Timestamp
  ing  DATETIME DEFAULT CURRENT_TIMESTAMP
) STRICT, ROWID, LZ4;
```

### Sharp Indicators (hourly refresh)
```sql
CREATE TABLE sharp_indicators (
  cid TEXT PRIMARY KEY,  -- Customer ID
  clv REAL,              -- Customer Lifetime Value
  wr  REAL,              -- Win Rate
  ao  SMALLINT,          -- Action Count
  nb  INT,               -- Net Bet
  upd DATETIME DEFAULT CURRENT_TIMESTAMP
) STRICT, ROWID, LZ4;
```

### Exposure Tracking (30s refresh)
```sql
CREATE TABLE exposure_tracking (
  eid  TEXT,             -- Event ID
  side TEXT,             -- Side (HOME/AWAY)
  risk INT,              -- Risk Amount
  net  INT,              -- Net Exposure
  upd  DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (eid, side)
) STRICT, WITHOUT ROWID, LZ4;
```

### Steam Dedupe (5min TTL)
```sql
CREATE TABLE steam_dedupe (
  eid TEXT,              -- Event ID
  mt  TEXT,              -- Market Type
  ts  DATETIME,          -- Timestamp
  PRIMARY KEY (eid, mt)
) STRICT, WITHOUT ROWID;
```

## 🔧 Edge Pipeline

| Component | Type | File | Description |
|-----------|------|------|-------------|
| **Ingest** | Queue consumer | `src/queues/lineIngress.ts` | Line movement ingestion |
| **Diff** | D1 trigger | `src/triggers/onLineMove.ts` | Line movement processing |
| **Steam** | Queue → Webhook | `src/queues/steamWebhook.ts` | Steam move notifications |
| **Sharp** | Scheduled (hourly) | `src/schedules/sharpCalc.ts` | Sharp calculation |
| **Exposure** | Scheduled (30s) | `src/schedules/exposureCalc.ts` | Exposure calculation |
| **BetTicker Sniffer** | Transparent proxy | `src/interceptors/bet-ticker-sniffer.ts` | API interception & archiving |

All queues **auto-scale to zero** when empty.

## 🛠️ MCP Tools

Auto-generated, typed intelligence APIs with:
- **Zod** input/output validation
- **10 req/s** per IP (Cloudflare Rate-Limit rule)
- **$0** until 100k requests/day (free tier)

Generate tools:
```bash
bun run codegen  # creates src/tools/intelligence/*.ts + types
```

Example API call:
```bash
curl https://brain.mybook.com/getBettingExposure?eid=nba_123
→ {"eid":"nba_123","sides":[{"side":"HOME","risk":4200000,"net":-3800000}]}
```

## 💰 Cost-Cap Guardrails

| Tier | Limit | Action |
|------|-------|--------|
| **Free** | 100k req/day | Hard stop → 429 |
| **D1** | 5GB / 50M rows | TTL auto-purge |
| **Queue** | 1M ops/month | Pause ingestion |
| **Analytics Engine** | 25M points/month | Sample 10% |

All enforced in `src/guards/costCap.ts`.

## 🚀 Deployment

### Production Deploy
```bash
bun run deploy:prod
```

Output:
```
✔ Migrations applied (v3)
✔ 6 edge functions deployed (≈ 250 ms cold start)
✔ Queues & triggers live
✔ Grafana sidecar: https://grafana-<hash>.pages.dev
✔ Rollback tag: v3.0.0-<sha> (wrangler rollback v3.0.0-<sha>)
```

### Rollback
```bash
bun run rollback v3.0.0-<sha>
```

## 📈 Monitoring

- **Grafana Dashboard**: Auto-provisioned at deployment
- **Cost Alerts**: Built-in cost cap monitoring
- **Performance Metrics**: Edge function performance tracking
- **Error Tracking**: Comprehensive error logging

## 🔐 Security

- **Rate Limiting**: 10 req/s per IP
  - ⚠️ Note: Uses in-memory storage per worker instance
  - For multi-instance deployments, consider Cloudflare Durable Objects
  - Current implementation is suitable for most single-region deployments
- **Input Validation**: Zod schemas for all inputs
- **Cost Guards**: Hard limits on resource usage
- **Circuit Breakers**: Graceful degradation on failures

## 📁 Project Structure

```
betting-brain-v3/
├── src/                         # Source code
│   ├── index.ts                 # Main entry point
│   ├── types/                   # TypeScript definitions
│   ├── guards/                  # Cost-cap and rate limiting
│   ├── queues/                  # Queue consumers
│   ├── triggers/                # D1 triggers
│   ├── schedules/               # Cron jobs
│   ├── tools/                   # MCP tools (auto-generated)
│   ├── interceptors/            # API interception (BetTicker Sniffer)
│   └── utils/                   # Shared utilities
├── dashboards/                  # Betting intelligence dashboards
│   ├── dashboard.html           # Basic monitoring
│   ├── dashboard-enhanced.html  # Advanced analytics
│   ├── dashboard-pro.html       # AI intelligence hub
│   └── dashboard-positions.html # Position & risk tracker
├── tools/                       # HTML tools and utilities
│   ├── capture-live-data.html   # Data capture tool
│   ├── diagnostic-suite.html    # System diagnostics
│   └── test-*.html             # Testing utilities
├── tests/                       # Comprehensive test suite
│   ├── unit/                    # Unit tests
│   ├── integration/             # Integration tests
│   ├── e2e/                     # End-to-end tests
│   ├── setup/                   # Test setup and configuration
│   ├── mocks/                   # Shared mocks and test data
│   └── utils/                   # Test utilities
├── docs/                        # Documentation
│   ├── guides/                  # User guides
│   ├── dashboards/              # Dashboard documentation
│   ├── testing/                 # Testing documentation
│   └── deployment/              # Deployment documentation
├── browser-extension/           # Browser extension for auto-capture
├── config/                      # Configuration files
├── deployment/                  # Deployment scripts and configs
├── monitoring/                  # Grafana and monitoring
├── migrations/                  # D1 database migrations
├── scripts/                     # Build and automation scripts
└── .github/                     # CI/CD workflows
```

## 🧪 Testing

```bash
bun test            # Run all tests
bun test:unit       # Run unit tests only
bun test:integration # Run integration tests only
bun test:e2e        # Run end-to-end tests
bun test:watch      # Run tests in watch mode
bun test:ci         # Run tests with coverage
```

**Test Health:** ⚠️ **68/100** - Needs Attention  
- ✅ 249/249 tests passing
- 🚨 89 TypeScript errors (see [URGENT_TEST_FIXES.md](docs/URGENT_TEST_FIXES.md))
- ⚠️ Slow integration tests (99s, should be <20s)

**Documentation:**
- **[Test Health Dashboard](docs/testing/TEST_HEALTH_DASHBOARD.md)** - Current status & metrics
- **[Test Failure Analysis](docs/testing/TEST_FAILURE_ANALYSIS.md)** - Detailed error breakdown
- **[Testing Guide](docs/testing/TESTING_GUIDE.md)** - Comprehensive testing documentation

## 🎯 BetTicker Sniffer

**Transparent API interceptor** that archives all `getBetTicker` responses with zero client impact.

### Features
- ✅ Intercepts `POST /cloud/api/Manager/getBetTicker`
- ✅ Stores raw responses in KV (7-day retention)
- ✅ Zero performance impact (async storage)
- ✅ Analysis endpoints for historical data
- ✅ Comprehensive metadata tracking

### Quick Access
```bash
# View recent responses
curl https://brain.mybook.com/interceptor/history?limit=10

# Get specific response
curl "https://brain.mybook.com/interceptor/response?key=raw:getBetTicker:1728300000000"
```

📖 **[Full Documentation](docs/BET_TICKER_SNIFFER.md)**

## 📊 Dashboards & Tools

### **🎯 Quick Start**
- **[📊 Dashboards Hub](dashboards/index.html)** - All betting intelligence dashboards in one place
- **[🛠️ Testing Tools Hub](tools/index.html)** - Complete diagnostic and testing suite

### **Recommended Dashboards**
- **[Enhanced Analytics](dashboards/dashboard-enhanced.html)** ⭐ - Charts, alerts, and deep analytics (RECOMMENDED)
- **[AI Intelligence Hub](dashboards/dashboard-pro.html)** - AI-powered insights with Claude integration
- **[Position & Risk Tracker](dashboards/dashboard-positions.html)** - Real-time risk analysis
- **[Basic Monitoring](dashboards/dashboard.html)** - Simple, clean monitoring interface

### **Essential Tools**
- **[System Health Monitor](tools/system-health-monitor.html)** - Real-time system diagnostics
- **[Extension Test Suite](tools/extension-test-suite.html)** - Automated extension testing
- **[Flow Tester](tools/flow-tester.html)** - End-to-end data flow validation
- **[Troubleshooting Guide](tools/troubleshooting-guide.html)** - Intelligent problem diagnosis

### **Documentation**
- **[Dashboard Collection](docs/dashboards/README.md)** - Complete dashboard overview
- **[Tools & Utilities](tools/README.md)** - HTML tools and utilities  
- **[Testing Guide](docs/testing/TESTING_GUIDE.md)** - Extension testing and deployment
- **[Agent Risk Guide](docs/guides/AGENT_RISK_GUIDE.md)** - Risk analysis guide
- **[Start Here Guide](docs/guides/START_HERE.md)** - Complete setup guide
- **[🔧 Debugging Data Capture](docs/guides/DEBUGGING_DATA_CAPTURE.md)** - Fix data capture issues

## 📚 Additional Documentation

### Core Documentation
- **[Quick Start Guide](docs/QUICKSTART.md)** - 15-second setup
- **[Implementation Summary](docs/IMPLEMENTATION_SUMMARY.md)** - Technical overview
- **[Automation Guide](docs/AUTOMATION_GUIDE.md)** - Testing workflows

### API Documentation ✨ NEW
- **[REST API Reference](docs/REST_API_REFERENCE.md)** - Complete REST API docs (9 endpoints) 🆕
- **[API Enhancement Summary](docs/API_ENHANCEMENT_SUMMARY.md)** - API layer overview & features 🆕
- **[MCP Integration Status](docs/MCP_INTEGRATION_STATUS.md)** - MCP server status & overview
- **[MCP Endpoints Reference](docs/MCP_ENDPOINTS.md)** - Complete API docs for 13 tools
- **[MCP Testing Guide](docs/MCP_TESTING_GUIDE.md)** - Comprehensive testing procedures

### System Integration
- **[Endpoint & Dashboard Integration](docs/ENDPOINT_DASHBOARD_INTEGRATION.md)** - Complete integration guide
- **[System Integration Map](docs/SYSTEM_INTEGRATION_MAP.md)** - Visual architecture diagrams
- **[Database & Cron Verification](docs/DATABASE_CRON_VERIFICATION.md)** - System verification

### Quality & Testing
- **[Test Audit Report](docs/TEST_AUDIT_REPORT.md)** - Quality score: 100/100
- **[Code Quality Audit](docs/CODE_QUALITY_AUDIT.md)** - Comprehensive review
- **[BetTicker Sniffer](docs/BET_TICKER_SNIFFER.md)** - API interception & archiving

### Developer Resources
- **[Cursor Rules](docs/CURSOR_RULES.md)** - AI assistant rules guide (11 rules)
- **[Root Structure](docs/ROOT_STRUCTURE.md)** - Root directory reference
- **[Codebase Review](docs/CODEBASE_REVIEW.md)** - Complete codebase analysis
- **[ast-grep Quick Start](docs/AST_GREP_QUICKSTART.md)** - Code search patterns (WORKING!) 🆕
- **[Dashboard Organization](dashboards/README.md)** - Dashboard architecture
- **[Production Patterns](docs/PRODUCTION_PATTERNS.md)** - Scale & security guide (NEW!)
- **[Production Integration](docs/PRODUCTION_INTEGRATION.md)** - MCP integration guide (NEW!)
- **[Real-Time Modules](docs/REALTIME_MODULES.md)** - WebSocket + Positions + Agents (NEW!)

## 📞 Support

- **Documentation**: [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- **Issues**: GitHub Issues
- **Discord**: [Cloudflare Discord](https://discord.cloudflare.com/)

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

---

**Built with ❤️ on Cloudflare Edge**
