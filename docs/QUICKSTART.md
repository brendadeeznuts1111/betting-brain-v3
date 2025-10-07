# 🚀 Betting-Brain v3.1 - Quick Start Guide

## Zero-Config Boot (15 seconds) ⚡

### 1. Clone & Install
```bash
git clone https://github.com/mybook/betting-brain-v3.git
cd betting-brain-v3
npm install
```

### 2. Bootstrap (Creates D1, Queues, Applies Migrations)
```bash
npm run bootstrap
```

### 3. Configure Cloudflare
Update `wrangler.toml` with your database ID from the bootstrap output:
```toml
[[d1_databases]]
binding = "ANALYTICS"
database_name = "betting-analytics"
database_id = "your-database-id-from-bootstrap"  # ← Update this
```

### 4. Start Development Server
```bash
npm run dev
```

Your API is now live at `http://localhost:8787` 🎉

## Test the API

### Get Betting Exposure
```bash
curl "http://localhost:8787/tools/getBettingExposure?eid=nba_123"
```

### Get Sharp Score
```bash
curl "http://localhost:8787/tools/getSharpScore?cid=customer_456"
```

### Get Hold Percentage
```bash
curl "http://localhost:8787/tools/getHoldPercentage?eid=nba_123&mt=SPREAD"
```

### Get CLV
```bash
curl "http://localhost:8787/tools/getCLV?cid=customer_456"
```

## Deploy to Production 🚀

### One-Command Deploy
```bash
npm run deploy:prod
```

This will:
1. ✅ Run all tests
2. ✅ Build TypeScript
3. ✅ Apply migrations to production
4. ✅ Deploy to Cloudflare Edge
5. ✅ Create rollback tag (v3.1.0-abc123)
6. ✅ Output Grafana dashboard URL

### Rollback (If Needed)
```bash
npm run rollback v3.1.0-abc123
```

## Project Structure 📁

```
betting-brain-v3/
├── src/
│   ├── index.ts                      # Main entry point
│   ├── types/                        # TypeScript definitions
│   │   ├── database.ts              # D1 schema types
│   │   ├── metrics.ts               # Core metrics types
│   │   └── api.ts                   # API request/response types
│   ├── guards/                       # Cost-cap and rate limiting
│   │   ├── costCap.ts               # Cost guardrails
│   │   └── rateLimit.ts             # Rate limiting (10 req/s)
│   ├── queues/                       # Queue consumers
│   │   ├── lineIngress.ts           # Line movement ingestion
│   │   └── steamWebhook.ts          # Steam move notifications
│   ├── triggers/                     # D1 triggers
│   │   └── onLineMove.ts            # Line movement processing
│   ├── schedules/                    # Cron jobs
│   │   ├── sharpCalc.ts             # Hourly sharp calculation
│   │   └── exposureCalc.ts          # 30s exposure calculation
│   ├── tools/intelligence/           # MCP tools (auto-generated)
│   │   ├── getBettingExposure.ts
│   │   ├── getSharpScore.ts
│   │   ├── getHoldPercentage.ts
│   │   └── getCLV.ts
│   └── utils/                        # Shared utilities
│       ├── database.ts              # D1 helpers
│       ├── validation.ts            # Zod schemas
│       └── formatting.ts            # Data formatting
├── migrations/                       # D1 database migrations
│   ├── 0001_initial_schema.sql
│   └── 0002_add_ttl.sql
├── tests/                            # Unit tests (100% typed)
│   ├── clv.test.ts
│   ├── hold.test.ts
│   ├── exposure.test.ts
│   ├── sharp.test.ts
│   └── steam.test.ts
├── scripts/                          # Build and deployment
│   ├── codegen.ts                   # MCP tools generator
│   ├── deploy.ts                    # Deployment automation
│   └── bootstrap.ts                 # Zero-config setup
├── grafana/                          # Dashboard configuration
│   └── dashboard.json
└── .github/workflows/                # CI/CD
    └── deploy.yml
```

## Core Metrics & Alerts 📊

| Metric | Alert Threshold | Cost Cap | Unit Test |
|--------|----------------|----------|-----------|
| **CLV** | < -2% | 1k customers/hour | `clv.test.ts` |
| **Hold %** | < 4% or > 8% | 300s cache | `hold.test.ts` |
| **Exposure** | > $50k or > 60% | 50 rows/event | `exposure.test.ts` |
| **Sharp Score** | > 60 | top-100 only | `sharp.test.ts` |
| **Steam Move** | ≥ 3σ in ≤ 60s | 5min dedupe | `steam.test.ts` |

## Cost-Cap Guardrails 💰

| Tier | Free Limit | Hit Action |
|------|-----------|------------|
| **Requests** | 100k/day | 429 + alert |
| **D1 rows** | 50M | TTL auto-purge |
| **Queue ops** | 1M/month | Pause ingestion |
| **Analytics** | 25M pts/month | 10% sample |

All enforced in `src/guards/costCap.ts` with Grafana monitoring.

## Run Tests 🧪

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# With coverage
npm run test:ci
```

## Generate MCP Tools 🔧

```bash
npm run codegen
```

This regenerates:
- `dist/openapi.json` - OpenAPI 3.0 spec
- `dist/redoc.html` - Interactive API documentation

View docs: `open dist/redoc.html`

## Environment Variables 🔐

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Key variables:
- `CLOUDFLARE_API_TOKEN` - Your Cloudflare API token
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID
- `D1_DATABASE_ID` - Your D1 database ID

## Monitoring 📈

### Grafana Dashboard
After deployment, you'll get a Grafana sidecar URL:
```
✔ Grafana sidecar: https://grafana-abc123.pages.dev
```

The dashboard auto-imports and shows:
- Cost Cap Remaining (alerts at 80%)
- CLV, Hold, Exposure, Sharp, Steam alerts
- Real-time request rates
- D1 database size
- Queue operations

### Cloudflare Dashboard
Monitor your deployment at:
https://dash.cloudflare.com

## Troubleshooting 🔧

### Database ID Not Found
If you see "Database not found" after bootstrap:
1. Check the bootstrap output for your database ID
2. Update `wrangler.toml` with the correct `database_id`
3. Run `npm run db:apply` to apply migrations

### Rate Limit Errors
Default rate limit is 10 req/s per IP. To adjust:
1. Edit `src/guards/rateLimit.ts`
2. Update `defaultRateLimitConfig.requestsPerSecond`

### Cost Cap Triggered
If you hit cost caps:
1. Check Grafana dashboard "Cost Remaining" panel
2. Review `.env` to adjust limits
3. Consider upgrading Cloudflare plan

## Support 📞

- **Documentation**: [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- **Issues**: [GitHub Issues](https://github.com/mybook/betting-brain-v3/issues)
- **Discord**: [Cloudflare Discord](https://discord.cloudflare.com/)

---

**Built with ❤️ on Cloudflare Edge**
