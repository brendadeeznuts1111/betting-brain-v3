# 📁 Betting-Brain v3 - Project Structure

**Last Updated:** October 7, 2025

---

## 📊 Root Directory Organization

```
betting-brain-v3/
├── .github/              # CI/CD workflows and GitHub configuration
├── docs/                 # 📚 All documentation (NEW - organized here!)
├── grafana/              # Grafana dashboard configuration
├── migrations/           # D1 database migrations
├── scripts/              # Build and deployment automation
├── src/                  # 💻 Source code
├── tests/                # 🧪 Unit tests
├── .env.example          # Environment variable template
├── .gitignore           # Git ignore patterns
├── CHANGELOG.md         # Version history and release notes
├── CONTRIBUTING.md      # Contribution guidelines
├── LICENSE              # MIT License
├── README.md            # Main project documentation
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
├── vitest.config.ts     # Test configuration
└── wrangler.toml        # Cloudflare Workers configuration
```

---

## 📚 Documentation Structure (docs/)

All comprehensive documentation has been moved to the `docs/` directory for better organization:

```
docs/
├── BUILD_REPORT.md              # Build statistics and checklist
├── FIXES_APPLIED.md             # Recent bug fixes and improvements
├── IMPLEMENTATION_SUMMARY.md    # Technical overview and architecture
├── PROJECT_STRUCTURE.md         # This file - project organization
├── QUICKSTART.md                # 15-second setup guide
└── REVIEW_AND_GAPS.md           # Quality assessment and gap analysis
```

### Document Purposes:

| Document | Purpose | Audience |
|----------|---------|----------|
| **QUICKSTART.md** | Fast setup and deployment | Developers (getting started) |
| **IMPLEMENTATION_SUMMARY.md** | Technical architecture | Architects, senior developers |
| **BUILD_REPORT.md** | Statistics and metrics | Project managers, stakeholders |
| **REVIEW_AND_GAPS.md** | Quality assessment | QA, technical leads |
| **FIXES_APPLIED.md** | Recent improvements | All team members |
| **PROJECT_STRUCTURE.md** | This file | New contributors |

---

## 💻 Source Code Structure (src/)

```
src/
├── guards/                    # Security and resource management
│   ├── costCap.ts            # Cost guardrails (D1, Queue, Analytics)
│   └── rateLimit.ts          # Rate limiting (10 req/s per IP)
│
├── queues/                    # Queue consumers
│   ├── lineIngress.ts        # Line movement ingestion (batch: 10)
│   └── steamWebhook.ts       # Steam move detection (3σ algorithm)
│
├── schedules/                 # Cron jobs
│   ├── exposureCalc.ts       # 30-second exposure calculation
│   └── sharpCalc.ts          # Hourly sharp score calculation
│
├── tools/                     # MCP intelligence APIs
│   └── intelligence/
│       ├── getBettingExposure.ts
│       ├── getCLV.ts
│       ├── getHoldPercentage.ts
│       └── getSharpScore.ts
│
├── triggers/                  # D1 database triggers
│   └── onLineMove.ts         # Automatic line movement processing
│
├── types/                     # TypeScript definitions
│   ├── api.ts                # API request/response types
│   ├── database.ts           # D1 schema types
│   └── metrics.ts            # Core metrics types
│
├── utils/                     # Shared utilities
│   ├── database.ts           # D1 helpers with retry logic
│   ├── formatting.ts         # Data formatting utilities
│   └── validation.ts         # Zod validation schemas
│
└── index.ts                   # Main entry point (Worker handler)
```

---

## 🧪 Test Structure (tests/)

```
tests/
├── clv.test.ts               # CLV calculations (< -2% alert)
├── exposure.test.ts          # Exposure tracking ($50k / 60%)
├── hold.test.ts              # Hold percentage (4%-8% range)
├── sharp.test.ts             # Sharp score algorithm (>60 alert)
└── steam.test.ts             # Steam detection (3σ in 60s)
```

**Test Coverage:** 25 tests, 100% TypeScript typed

---

## 🗄️ Database Migrations (migrations/)

```
migrations/
├── 0001_initial_schema.sql   # Initial tables with indexes
└── 0002_add_ttl.sql          # Auto-TTL triggers
```

**Database Tables:**
- `line_movements` - Line changes with 7-day TTL
- `sharp_indicators` - Customer sharp scores (30-day retention)
- `exposure_tracking` - Real-time exposure (24-hour retention)
- `steam_dedupe` - Deduplication (5-minute TTL)

---

## 🔧 Scripts (scripts/)

```
scripts/
├── bootstrap.ts              # Zero-config setup (creates D1, queues)
├── codegen.ts                # MCP tools generator (OpenAPI + Redoc)
└── deploy.ts                 # Blue-green deployment with rollback
```

---

## 📊 Configuration Files

| File | Purpose | Notes |
|------|---------|-------|
| **package.json** | Dependencies and scripts | NPM configuration |
| **tsconfig.json** | TypeScript compiler config | Strict mode enabled |
| **vitest.config.ts** | Test runner configuration | Miniflare environment |
| **wrangler.toml** | Cloudflare Workers config | D1, queues, cron jobs |
| **.env.example** | Environment variable template | Copy to .env |
| **.gitignore** | Git ignore patterns | Node, build, logs |

---

## 🎯 Key Directories Explained

### `/src` - Source Code
- All production TypeScript code
- Organized by architectural layer
- No configuration files here

### `/tests` - Unit Tests
- One test file per core metric
- Mocked Cloudflare environment
- Vitest + Miniflare

### `/docs` - Documentation
- **NEW!** Centralized documentation
- Markdown files for different audiences
- Referenced from main README.md

### `/migrations` - Database Schema
- Versioned SQL migrations
- Auto-applied during deployment
- D1-specific optimizations

### `/scripts` - Automation
- Bootstrap, codegen, deploy
- Uses Bun native APIs (not Node.js)
- Idempotent and safe

### `/grafana` - Monitoring
- Dashboard JSON configuration
- 12 pre-configured panels
- Auto-provisioned on deploy

### `/.github` - CI/CD
- GitHub Actions workflows
- Automated testing and deployment
- Staging and production pipelines

---

## 📝 File Naming Conventions

### Source Files
- **TypeScript:** `kebab-case.ts`
- **Tests:** `feature.test.ts`
- **Migrations:** `NNNN_description.sql`
- **Scripts:** `action.ts`

### Directories
- **All lowercase:** `kebab-case/`
- **No spaces or special characters**
- **Descriptive names**

### Functions & Variables
- **Functions:** `camelCase()`
- **Classes:** `PascalCase`
- **Constants:** `UPPER_SNAKE_CASE`
- **Interfaces:** `PascalCase`

---

## 🚀 Quick Navigation

### For Developers:
1. Start here: [README.md](../README.md)
2. Quick setup: [docs/QUICKSTART.md](QUICKSTART.md)
3. Contribute: [CONTRIBUTING.md](../CONTRIBUTING.md)

### For Architects:
1. Technical overview: [docs/IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)
2. Quality review: [docs/REVIEW_AND_GAPS.md](REVIEW_AND_GAPS.md)

### For Project Managers:
1. Build report: [docs/BUILD_REPORT.md](archive/BUILD_REPORT.md)
2. Change log: [CHANGELOG.md](../CHANGELOG.md)

---

## 📊 Statistics

| Category | Count |
|----------|-------|
| **Total Directories** | 16 |
| **Source Files** | 17 |
| **Test Files** | 5 |
| **Documentation Files** | 6 |
| **Configuration Files** | 6 |
| **Migration Files** | 2 |
| **Script Files** | 3 |
| **Total Lines of Code** | ~4,780 |

---

## ✨ Organization Improvements (v3.1.0)

### What Changed:
- ✅ Created `docs/` directory for all documentation
- ✅ Moved 5 markdown files to `docs/`
- ✅ Added `.gitignore` for clean repository
- ✅ Added `LICENSE` (MIT)
- ✅ Added `CONTRIBUTING.md` for contributors
- ✅ Added `CHANGELOG.md` for version tracking
- ✅ Updated README.md with documentation links
- ✅ Created this structure guide

### Benefits:
- 📁 **Cleaner root directory** (8 files vs 13)
- 📚 **Centralized documentation** (easy to find)
- 🔍 **Better discoverability** (clear structure)
- 👥 **Easier onboarding** (clear contribution path)
- 📊 **Professional appearance** (organized codebase)

---

**Last Updated:** October 7, 2025  
**Version:** 3.1.0  
**Status:** ✅ Production Ready
