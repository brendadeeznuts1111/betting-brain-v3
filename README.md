# 🧠 Betting-Brain v3

[![CI](https://github.com/mybook/betting-brain-v3/actions/workflows/deploy.yml/badge.svg)](https://github.com/mybook/betting-brain-v3/actions/workflows/deploy.yml)
[![Link Check](https://github.com/mybook/betting-brain-v3/actions/workflows/deploy.yml/badge.svg?job=linkcheck)](https://github.com/mybook/betting-brain-v3/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](tsconfig.json)

**Zero-downtime, zero-config, zero-cost** betting intelligence layer running entirely on Cloudflare Edge.

[📚 Documentation Index](docs/INDEX.md) | [🚀 Quick Start](docs/QUICKSTART.md) | [🏗️ Architecture](docs/IMPLEMENTATION_SUMMARY.md) | [📊 Dashboard](grafana/dashboard.json)

## 🎯 What Changed in v3

- **Edge-Native**: Runs entirely on Cloudflare Edge (D1, Workers, Queues, Analytics Engine)
- **Typed**: Full TypeScript with Zod validation for all inputs/outputs
- **Auto-Scaling**: Queues scale to zero when empty
- **Cost-Cap**: Hard-wired cost controls with graceful degradation
- **1-Command Roll-out**: Single command deployment with instant rollback

## 🚀 Quick Start (30 seconds)

### 0. Pre-flight
```bash
npm create cloudflare@latest betting-brain -- --template betting-brain-v3
cd betting-brain-v3
npm i
wrangler login   # once per machine
```

### 1. Deploy
```bash
npm run deploy:prod
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

All queues **auto-scale to zero** when empty.

## 🛠️ MCP Tools

Auto-generated, typed intelligence APIs with:
- **Zod** input/output validation
- **10 req/s** per IP (Cloudflare Rate-Limit rule)
- **$0** until 100k requests/day (free tier)

Generate tools:
```bash
npm run codegen  # creates src/tools/intelligence/*.ts + types
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
npm run deploy:prod
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
npm run rollback v3.0.0-<sha>
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
├── src/
│   ├── index.ts                 # Main entry point
│   ├── types/                   # TypeScript definitions
│   ├── guards/                  # Cost-cap and rate limiting
│   ├── queues/                  # Queue consumers
│   ├── triggers/                # D1 triggers
│   ├── schedules/               # Cron jobs
│   ├── tools/                   # MCP tools (auto-generated)
│   └── utils/                   # Shared utilities
├── migrations/                  # D1 database migrations
├── tests/                       # Unit tests
├── scripts/                     # Build and deployment scripts
├── grafana/                     # Dashboard configuration
└── .github/                     # CI/CD workflows
```

## 🧪 Testing

```bash
npm run test         # Run all tests
npm run test:watch   # Run tests in watch mode
```

## 📚 Additional Documentation

- **[Quick Start Guide](docs/QUICKSTART.md)** - 15-second setup
- **[Implementation Summary](docs/IMPLEMENTATION_SUMMARY.md)** - Technical overview
- **[Build Report](docs/BUILD_REPORT.md)** - Statistics and checklist
- **[Review & Gaps](docs/REVIEW_AND_GAPS.md)** - Quality assessment
- **[Fixes Applied](docs/FIXES_APPLIED.md)** - Recent improvements

## 📞 Support

- **Documentation**: [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- **Issues**: GitHub Issues
- **Discord**: [Cloudflare Discord](https://discord.cloudflare.com/)

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

---

**Built with ❤️ on Cloudflare Edge**
