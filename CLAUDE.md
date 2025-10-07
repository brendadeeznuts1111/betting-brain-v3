# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

**Note:** This project uses **Bun** as the runtime. Package.json scripts use standard command patterns, but the project is Bun-native.

### Development
```bash
bun run dev                    # Start development server with hot reload
bun run start                  # Run without hot reload
wrangler dev --local           # Start with full Cloudflare Workers environment
bun run build                  # Build for Cloudflare Workers (bun target)
bun run build:worker           # Build with minification
```

### Testing
```bash
bun test                       # Run all tests
bun test:watch                 # Watch mode
bun test:coverage              # Generate coverage report
bun scripts/test-handlers-direct.ts  # Test MCP handlers directly (bypasses server)
```

### Code Quality
```bash
bun run lint                   # Run linter
bun run format                 # Format code
bun run format:check           # Check formatting without changes
bun run type-check             # TypeScript type checking (tsc --noEmit)
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
wrangler d1 execute betting-analytics --local --command "SELECT * FROM sharp_indicators LIMIT 5"
```

### Deployment
```bash
bun run deploy                 # Deploy to default environment
wrangler deploy                # Direct Wrangler deployment
```

### Monitoring & Debugging
```bash
bun run health:check           # Check worker health
curl -s https://YOUR-WORKER.workers.dev/health
curl -s https://YOUR-WORKER.workers.dev/mcp  # MCP endpoint
```

---

## High-Level Architecture

### 🏗️ Edge-Native Cloudflare Worker with MCP Integration

**Betting-Brain v3** is an enterprise-grade betting intelligence platform running on Cloudflare Edge with **MCP (Model Context Protocol)** server integration for AI assistants.

---

## Core Components

### 1. **Main Worker** (`src/index.ts`)
Central fetch handler routing requests to:
- **`/health`** - System health checks
- **`/mcp`** - MCP Protocol endpoint (JSON-RPC 2.0) ✨ **NEW**
- **`/tools/*`** - Intelligence APIs (exposure, sharp scores, CLV, hold %)
- **`/cloud/api/Manager/getBetTicker`** - BetTicker interception
- **`/interceptor/*`** - Historical data analysis
- **`/logs`** - Extension log collection
- **`/diagnostics`** - System diagnostics
- **`/system-status`** - Detailed status

**Queue Consumers:**
- `line-ingress` queue (batch: 10, timeout: 5s)
- `steam-webhook` queue (batch: 5, timeout: 10s)

**Scheduled Tasks:**
- Hourly: Sharp customer calculation
- Every minute: Exposure calculation (30s cron not supported)

---

### 2. **MCP Server** (`src/mcp/`) ✨ **NEW**
JSON-RPC 2.0 server exposing **13 working tools** for AI assistants:

**Files:**
- `server.ts` - MCP request router (initialize, tools/list, tools/call)
- `types.ts` - MCP protocol types (JSONRPCRequest, MCPToolResult)
- `tools.ts` - Tool definitions (schemas, descriptions, parameters)
- `toolRegistry.ts` - Handler registry (maps tool names → functions)

**Intelligence Tools (4):**
1. `getBettingExposure` - Current exposure by event/market
2. `getCLV` - Customer lifetime value
3. `getHoldPercentage` - Hold percentage analysis
4. `getSharpScore` - Basic sharp score calculation

**Live Betting Tools (3):**
5. `getSteamMoves` - 3-sigma steam detection with severity (CRITICAL/HIGH/MEDIUM/LOW)
6. `getRiskConcentration` - Risk clustering by event/customer/market
7. `getSharpActivity` - Sharp customer tracking with composite scoring

**Analytics Tools (6):**
8. `getTimeSeriesCLV` - CLV trend analysis with rolling metrics
9. `getEnhancedSharpScore` - ML-like 7-feature customer profiling (0-100 score)
10. `getHoldForecast` - Predictive hold % with linear regression + 95% CI
11. `getHandleAndHold` - Revenue analytics with trend detection
12. `getCustomerVolume` - Customer segmentation (WHALE/HIGH_ROLLER/REGULAR/CASUAL/OCCASIONAL)
13. `getTimeSeriesAnalytics` - Flexible time-series with anomaly detection (2σ threshold)

**MCP Handlers** (`src/mcp/handlers/`):
- `steamMoves.ts` - 3-sigma line movement detection
- `riskConcentration.ts` - Exposure clustering analysis
- `sharpActivity.ts` - Sharp customer tracking
- `timeSeriesCLV.ts` - Historical CLV trends
- `enhancedSharpScore.ts` - Multi-dimensional profiling (steam correlation, timing, sizing, diversity)
- `holdForecast.ts` - Linear regression forecasting
- `handleAndHold.ts` - Handle and hold tracking
- `customerVolume.ts` - Percentile-based segmentation
- `timeSeriesAnalytics.ts` - General time-series analysis

**Testing:**
```bash
# Test MCP handlers directly (no server needed)
bun scripts/test-handlers-direct.ts

# Test via HTTP (requires server)
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

See **[docs/MCP_TESTING_GUIDE.md](docs/MCP_TESTING_GUIDE.md)** for comprehensive testing guide.

---

### 3. **BetTicker Sniffer** (`src/interceptors/bet-ticker-sniffer.ts`)
Transparent API interceptor:
- Captures `POST /cloud/api/Manager/getBetTicker` requests
- Stores raw responses in KV storage (7-day retention)
- Returns original response (zero client impact)
- Provides history and analysis endpoints
- Zod validation for metadata

---

### 4. **Intelligence Tools** (`src/tools/intelligence/`)
Auto-generated, typed APIs with Zod validation:
- `getBettingExposure.ts` - Real-time exposure tracking
- `getSharpScore.ts` - Sharp customer identification
- `getHoldPercentage.ts` - Hold percentage calculation
- `getCLV.ts` - Customer lifetime value analysis

---

### 5. **Queue Consumers** (`src/queues/`)
- `lineIngress.ts` - Line movement ingestion (batch: 10, timeout: 5s)
- `steamWebhook.ts` - Steam move notifications (batch: 5, timeout: 10s)

---

### 6. **Scheduled Jobs** (`src/schedules/`)
- `sharpCalc.ts` - Hourly sharp customer calculation
- `exposureCalc.ts` - Every minute exposure updates

---

### 7. **Guards** (`src/guards/`)
- `rateLimit.ts` - 10 req/s per IP (in-memory, per-instance)
- `costCap.ts` - Hard cost limits with graceful degradation

---

### 8. **Browser Extension** (`browser-extension/`)
Chrome extension:
- Injects content scripts on target domains
- Forwards logs to worker `/logs` endpoint
- Captures betting data in real-time
- Popup UI for configuration

---

## Data Layer

### D1 Database (SQLite, serverless)
**Tables:**
- `line_movements` - Line changes with volume (7-day TTL)
- `sharp_indicators` - Customer profiling (hourly refresh)
- `exposure_tracking` - Real-time exposure (30s refresh)
- `steam_dedupe` - Deduplication (5-min TTL)
- `bet_history` - Historical bets for analytics ✨ **NEW**
- `hold_tracking` - Hold % history for forecasting ✨ **NEW**

**Migrations:** `migrations/*.sql` (auto-applied via `wrangler.toml`)

See `migrations/` for detailed schema.

### KV Storage
- `BET_TICKER_RAW` - Intercepted API responses (7-day retention)
- `TOKEN_STORE` - MCP authentication tokens
- `USER_STORE` - User data
- `SESSION_STORE` - Session management
- `REFRESH_STORE` - Refresh tokens
- `LIVEBETS_STORE` - Live betting data

### Queues
- `line-ingress` - Batch: 10 messages, Timeout: 5s
- `steam-webhook` - Batch: 5 messages, Timeout: 10s
- `steam-processor` - MCP event processing ✨ **NEW**
- `exposure-calculator` - MCP exposure calc ✨ **NEW**

### Analytics Engine
- `ANALYTICS_ENGINE` - Metrics collection (see `monitoring/grafana/`)

---

## Configuration

**Environment Files:**
- `wrangler.toml` - Base configuration
- `.env.local` - Local environment variables (git-ignored)

**Key Bindings:**
- `[[d1_databases]]` - D1 with migrations
- `[[queues.producers]]` / `[[queues.consumers]]` - Queue config
- `[[kv_namespaces]]` - KV bindings
- `[[analytics_engine_datasets]]` - Analytics
- `[triggers]` - Cron schedules
- `[limits]` - Resource limits (50ms CPU)

---

## Testing Architecture

**Test Runner:** Bun Test (not Jest/Vitest)

**Structure:**
- `tests/unit/*.test.ts` - Core metrics unit tests
- `tests/integration/*.test.ts` - Queue, schedule, trigger tests
- `scripts/test-handlers-direct.ts` - Direct MCP handler testing ✨ **NEW**

**Status:**
- ✅ All unit/integration tests passing
- ✅ All 9 MCP handlers tested and working
- ⚠️ ~89 TypeScript errors in non-critical code (see archived docs)

**Running Tests:**
```bash
bun test                              # All tests
bun test tests/unit/clv.test.ts      # Single file
bun scripts/test-handlers-direct.ts  # MCP handlers (bypasses server)
```

---

## Important Patterns

### 1. **TypeScript with Cloudflare Workers**
- No build step for dev (Bun executes TS directly)
- Production builds target `bun` runtime
- Uses `@cloudflare/workers-types`
- `tsconfig.json` uses `moduleResolution: "bundler"`

### 2. **Zod Validation**
All external inputs validated with Zod:
- API parameters
- BetTicker metadata
- Tool inputs/outputs
- MCP protocol messages

### 3. **CORS Handling**
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
```

### 4. **Request ID Tracking**
```typescript
const requestId = Date.now().toString(36);
console.log(`[${requestId}] ...`);
```

### 5. **Async Storage**
Worker uses `ctx.waitUntil()` to avoid blocking responses

### 6. **Cost Cap Guardrails**
Hard limits enforced with graceful degradation (see `src/guards/costCap.ts`)

---

## Development Workflow

### Quick Start
```bash
bun install                    # Install dependencies
bun run dev                    # Start dev server
```

### Testing Workflow
```bash
# Unit/integration tests
bun test

# MCP handler direct testing (recommended)
bun scripts/test-handlers-direct.ts

# Or test via HTTP (requires server running)
wrangler dev --local
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

### Deployment
```bash
# Apply database migrations first
wrangler d1 migrations apply betting-analytics --remote

# Deploy worker
wrangler deploy

# Verify
curl -s https://YOUR-WORKER.workers.dev/health
curl -X POST https://YOUR-WORKER.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

---

## Important Notes

1. **Bun Runtime**: This is Bun-native. Use `bun` commands, not `npm`.

2. **MCP Integration**: 13 working tools accessible via `/mcp` endpoint. Test with direct handler script for faster iteration.

3. **Database Migrations**: Located in `migrations/`. Auto-applied on deployment. Use `wrangler d1 migrations apply` for manual application.

4. **Rate Limiting**: In-memory per worker instance. For multi-instance, consider Durable Objects.

5. **Cron Limitations**: 30s exposure calc runs every minute (closest possible).

6. **Extension Testing**: Use `tools/testing/extension-injection-tester.html`.

7. **Type Safety**: Always run `bun run type-check` before deploying.

8. **Target Origin**: BetTicker sniffer proxies to `fantasy402.com`.

9. **MCP Testing**: Use direct handler tests (`scripts/test-handlers-direct.ts`) for fastest validation without server.

10. **Database Schema**: Check `migrations/0003_mcp_tables.sql` for MCP-specific tables (bet_history, hold_tracking).

---

## Key Documentation

### Essential Docs (Current)
- **[README.md](README.md)** - Main project documentation
- **[docs/INDEX.md](docs/INDEX.md)** - Documentation map
- **[docs/QUICKSTART.md](docs/QUICKSTART.md)** - Quick setup
- **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** - Deployment guide
- **[docs/AUTOMATION_GUIDE.md](docs/AUTOMATION_GUIDE.md)** - Testing workflows
- **[docs/IMPLEMENTATION_SUMMARY.md](docs/IMPLEMENTATION_SUMMARY.md)** - Technical deep-dive
- **[docs/BET_TICKER_SNIFFER.md](docs/BET_TICKER_SNIFFER.md)** - API interception
- **[docs/MCP_TESTING_GUIDE.md](docs/MCP_TESTING_GUIDE.md)** - MCP testing guide ✨ **NEW**

### MCP Integration Docs (Current) ✨ **NEW**
- **[docs/MCP_INTEGRATION_STATUS.md](docs/MCP_INTEGRATION_STATUS.md)** - Current MCP status
- **[docs/TESTING_STATUS.md](docs/TESTING_STATUS.md)** - Testing status and next steps
- **[docs/MCP_TESTING_GUIDE.md](docs/MCP_TESTING_GUIDE.md)** - Comprehensive testing guide

### Code Organization & Rules ✨ **NEW**
- **[docs/CURSOR_RULES.md](docs/CURSOR_RULES.md)** - AI assistant rules guide (7 rules)
- **[docs/ROOT_STRUCTURE.md](docs/ROOT_STRUCTURE.md)** - Root directory reference
- **[docs/CODEBASE_REVIEW.md](docs/CODEBASE_REVIEW.md)** - Comprehensive codebase review
- **[.cursor/rules/](/.cursor/rules/)** - Active Cursor rules (850 lines):
  - `root-organization.mdc` - Root directory policy (CRITICAL)
  - `bun-runtime.mdc` - Bun usage requirements
  - `documentation.mdc` - Documentation placement
  - `testing.mdc` - Bun Test patterns
  - `mcp-integration.mdc` - MCP server patterns
  - `cloudflare-workers.mdc` - Workers-specific rules
  - `file-naming.mdc` - Naming conventions

### Archived Documentation
- **[docs/archive/](docs/archive/)** - Historical docs, migration reports, obsolete guides

---

## 🔍 Code Searchability & Navigation

### Quick File Finder Patterns

**MCP Integration:**
```bash
# Find MCP handlers
find src/mcp/handlers -name "*.ts"

# Search MCP types
grep -r "MCPToolResult" src/mcp/

# Find tool definitions
cat src/mcp/tools.ts
```

**Testing:**
```bash
# Find all test files
find tests -name "*.test.ts"

# Search for specific test
grep -r "describe.*CLV" tests/

# Find mocks
ls tests/mocks/
```

**Documentation:**
```bash
# Find all markdown docs
find docs -name "*.md"

# Search docs for topic
grep -r "MCP" docs/

# List guides
ls docs/guides/
```

### Key Code Locations

| Feature | Location | Key Files |
|---------|----------|-----------|
| **MCP Server** | `src/mcp/` | server.ts, toolRegistry.ts, tools.ts, types.ts |
| **MCP Handlers** | `src/mcp/handlers/` | 9 handler files (steamMoves.ts, etc.) |
| **Intelligence APIs** | `src/tools/intelligence/` | getBettingExposure.ts, getCLV.ts, etc. |
| **BetTicker Sniffer** | `src/interceptors/` | bet-ticker-sniffer.ts |
| **Queue Consumers** | `src/queues/` | lineIngress.ts, steamWebhook.ts |
| **Scheduled Jobs** | `src/schedules/` | sharpCalc.ts, exposureCalc.ts |
| **Guards** | `src/guards/` | rateLimit.ts, costCap.ts |
| **Types** | `src/types/` | api.ts (all interfaces) |
| **Tests** | `tests/unit/`, `tests/integration/` | *.test.ts files |
| **Cursor Rules** | `.cursor/rules/` | 7 .mdc rule files |

### MCP Endpoint Map

```
POST /mcp → handleMCPRequest() [src/mcp/server.ts]
├── initialize → capabilities
├── tools/list → tool definitions [src/mcp/tools.ts]
└── tools/call → [src/mcp/toolRegistry.ts]
    ├── getBettingExposure → [src/tools/intelligence/getBettingExposure.ts]
    ├── getCLV → [src/tools/intelligence/getCLV.ts]
    ├── getHoldPercentage → [src/tools/intelligence/getHoldPercentage.ts]
    ├── getSharpScore → [src/tools/intelligence/getSharpScore.ts]
    ├── getSteamMoves → [src/mcp/handlers/steamMoves.ts]
    ├── getRiskConcentration → [src/mcp/handlers/riskConcentration.ts]
    ├── getSharpActivity → [src/mcp/handlers/sharpActivity.ts]
    ├── getTimeSeriesCLV → [src/mcp/handlers/timeSeriesCLV.ts]
    ├── getEnhancedSharpScore → [src/mcp/handlers/enhancedSharpScore.ts]
    ├── getHoldForecast → [src/mcp/handlers/holdForecast.ts]
    ├── getHandleAndHold → [src/mcp/handlers/handleAndHold.ts]
    ├── getCustomerVolume → [src/mcp/handlers/customerVolume.ts]
    └── getTimeSeriesAnalytics → [src/mcp/handlers/timeSeriesAnalytics.ts]
```

### Database Schema Reference

```
D1 Database: betting-analytics (ANALYTICS binding)
├── line_movements        # [migrations/0001_initial_schema.sql]
├── sharp_indicators      # [migrations/0001_initial_schema.sql]
├── exposure_tracking     # [migrations/0001_initial_schema.sql]
├── steam_dedupe          # [migrations/0002_add_ttl.sql]
├── bet_history          # [migrations/0003_mcp_tables.sql] ✨ NEW
└── hold_tracking        # [migrations/0003_mcp_tables.sql] ✨ NEW

Test Data: [migrations/0004_test_data.sql]
```

---

## MCP Quick Reference ✨ **NEW**

### Testing MCP Tools
```bash
# Direct handler testing (fastest, no server needed)
bun scripts/test-handlers-direct.ts

# HTTP testing (requires server)
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "getEnhancedSharpScore",
      "arguments": {
        "cid": "test-customer-1",
        "lookbackDays": 30,
        "includeFeatures": true
      }
    }
  }'
```

### MCP Tool Categories

**Intelligence (4 tools):**
- getBettingExposure, getCLV, getHoldPercentage, getSharpScore

**Live Betting (3 tools):**
- getSteamMoves, getRiskConcentration, getSharpActivity

**Analytics (6 tools):**
- getTimeSeriesCLV, getEnhancedSharpScore, getHoldForecast, getHandleAndHold, getCustomerVolume, getTimeSeriesAnalytics

### MCP Algorithms

**3-Sigma Steam Detection:**
```
CRITICAL: Δline ≥ 2.0 AND Δvolume > 1000
HIGH:     Δline ≥ 1.0 AND Δvolume > 500
MEDIUM:   Δline ≥ 0.5 AND Δvolume > 100
```

**Enhanced Sharp Score (0-100):**
```
Core (40pts):     CLV (0-20) + Win Rate (0-15) + Volume (0-5)
Advanced (60pts): Steam Correlation + Timing + Sizing + Diversity (0-15 each)

Classifications:
75-100: PROFESSIONAL_SHARP (CRITICAL risk)
60-74:  ADVANCED_SHARP (HIGH risk)
45-59:  INTERMEDIATE_SHARP (MEDIUM risk)
30-44:  CASUAL_SHARP (LOW-MEDIUM risk)
0-29:   RECREATIONAL (LOW risk)
```

**Hold Forecasting:**
```
Linear Regression: y = mx + b
Confidence Interval: ±1.96σ (95%)
Anomaly Detection: |value - μ| > 2σ
```

---

*Last Updated: 2025-10-07*
*Betting-Brain v3 - Production-Ready Edge-Native Betting Intelligence with MCP Integration*
