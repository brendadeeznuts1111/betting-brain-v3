# Floor Smoke Test - 60-Second Validation

## Overview

The Floor Smoke Test is a comprehensive 60-second validation script that proves the entire Forest Floor system is wired end-to-end and operational.

## Quick Start

```bash
# Run full smoke test
bun run floor:test

# Run quick mode (skip optional checks)
bun run floor:test:quick

# Or directly
./scripts/floor-smoke-test.sh
./scripts/floor-smoke-test.sh --quick
```

## What It Tests

### 1. Prerequisites (4 checks)
- ✅ Bun installed (>= 1.1.0)
- ✅ Git repository exists
- ✅ Package.json present
- ✅ Environment file (.env or .env.local)

### 2. Floor Health Check (3 checks)
- ✅ Floor health script exists
- ✅ Floor rules exist (99-floor.mdc)
- ✅ Floor status endpoint exists
- 🔄 Full health check (optional, not in quick mode)

### 3. MCP Server (3 checks)
- ✅ MCP server script exists
- ✅ MCP tools defined
- ✅ MCP tool registry exists
- 🚀 Start MCP server in background
- 📡 Test `tools/list` method
- 🎯 Verify 6 tools available

### 4. Worker Endpoints (3+ checks)
- 🌐 Worker availability check
- ✅ GET /health endpoint
- ✅ GET /floor/status endpoint (v3.3.0)
- ✅ GET /api/live-odds (optional, not in quick mode)

### 5. MCP Configuration (3 checks)
- ✅ .cursor/mcp.json exists
- ✅ forest-grove server configured
- ✅ 6 tools registered

### 6. Documentation (4 checks)
- ✅ Floor system docs exist
- ✅ MCP config update docs
- ✅ Sports API deployment docs
- ✅ Documentation index updated

### 7. Cursor Rules (5 checks)
- ✅ Floor rules (99-floor.mdc)
- ✅ MCP integration rules
- ✅ API patterns rules
- ✅ Floor rules have MCP patterns
- ✅ Floor rules have test fixes

### 8. Package Scripts (5 checks)
- ✅ floor:health script
- ✅ floor:mcp script
- ✅ floor:voice script
- ✅ floor:deploy script
- ✅ floor:status script

### 9. Git Status
- 📊 Untracked files count
- 📊 Modified files count
- 📊 Staged files count
- ⚠️ Warn if uncommitted changes

### 10. Advanced Checks (optional, not in quick mode)
- 🔐 JWT generation test
- 📨 POST /ingest with JWT authentication

## Example Output

### Successful Run

```
╔══════════════════════════════════════════════════════╗
║  🌲 Forest Floor - 60-Second Smoke Test             ║
║  Version: 3.3.0                                      ║
╚══════════════════════════════════════════════════════╝

━━━ Prerequisites ━━━
[1] Testing: Bun installed... ✅
[2] Testing: Git repository... ✅
[3] Testing: Package.json exists... ✅
[4] Testing: Environment file... ✅

━━━ Floor Health Check ━━━
[5] Testing: Floor health script exists... ✅
[6] Testing: Floor rules exist... ✅
[7] Testing: Floor status endpoint exists... ✅
[Running] Full health check... ✅ PASS

━━━ MCP Server ━━━
[8] Testing: MCP server script exists... ✅
[9] Testing: MCP tools defined... ✅
[10] Testing: MCP tool registry exists... ✅
[Starting] MCP server... ✅ Running (PID: 12345)
[Testing] MCP tools/list... ✅ 6 tools available

━━━ Worker Endpoints ━━━
[Checking] Worker availability... ✅ Worker is UP
[11] Testing: GET /health... ✅
[Testing] GET /floor/status... ✅ v3.3.0
[12] Testing: GET /api/live-odds... ✅

━━━ MCP Configuration ━━━
[13] Testing: .cursor/mcp.json exists... ✅
[14] Testing: MCP config has forest-grove... ✅
[15] Testing: MCP config has 6 tools... ✅

━━━ Documentation ━━━
[16] Testing: Floor system docs exist... ✅
[17] Testing: MCP config update docs... ✅
[18] Testing: Sports API deployment docs... ✅
[19] Testing: Documentation index updated... ✅

━━━ Cursor Rules ━━━
[20] Testing: Floor rules (99-floor.mdc)... ✅
[21] Testing: MCP integration rules... ✅
[22] Testing: API patterns rules... ✅
[23] Testing: Floor rules have MCP patterns... ✅
[24] Testing: Floor rules have test fixes... ✅

━━━ Package Scripts ━━━
[25] Testing: floor:health script... ✅
[26] Testing: floor:mcp script... ✅
[27] Testing: floor:voice script... ✅
[28] Testing: floor:deploy script... ✅
[29] Testing: floor:status script... ✅

━━━ Git Status ━━━
Untracked files: 0
Modified files: 0
Staged files: 0

━━━ Advanced Checks ━━━
[Testing] JWT generation... ✅ JWT generated
[Testing] POST /ingest with JWT... ✅ Authenticated

╔══════════════════════════════════════════════════════╗
║  📊 Test Summary                                     ║
╚══════════════════════════════════════════════════════╝

Total Tests:  31
Passed:       31
Failed:       0

🟢 Forest Floor is LIVE - All systems operational!

Next steps:
  - Wire /floor/status in src/index.ts
  - Deploy: bun run floor:deploy
  - Monitor: bun run floor:status
```

### Degraded Run (Worker Not Running)

```
━━━ Worker Endpoints ━━━
[Checking] Worker availability... ⚠️  Worker is DOWN (start with: wrangler dev --local)

╔══════════════════════════════════════════════════════╗
║  📊 Test Summary                                     ║
╚══════════════════════════════════════════════════════╝

Total Tests:  28
Passed:       25
Failed:       3

⚠️  Some checks failed (89% pass rate)

Common issues:
  - Worker not running: wrangler dev --local
  - Missing .env file: cp .env.example .env
  - MCP server port conflict: kill existing process

Run with --quick to skip optional checks
```

## Modes

### Full Mode (Default)
```bash
bun run floor:test
```

Tests everything including:
- Full health check
- Sports API endpoints
- JWT authentication
- Advanced integration tests

**Duration:** ~60 seconds

### Quick Mode
```bash
bun run floor:test:quick
```

Skips optional checks:
- Full health check (uses fast existence checks only)
- Sports API endpoint tests
- JWT authentication tests

**Duration:** ~10 seconds

## Exit Codes

- **0:** All tests passed - System is fully operational
- **1:** Some tests failed - System may be degraded

## Requirements

### Minimum
- Bun >= 1.1.0
- Git repository
- package.json
- .env or .env.local file

### For Full Testing
- Local worker running (`wrangler dev --local`)
- Environment variables configured:
  - `WORKER_URL` (default: http://localhost:8787)
  - `JWT_SECRET` (for authentication tests)
- MCP server dependencies installed

## Troubleshooting

### "Worker is DOWN"
Start the local worker:
```bash
wrangler dev --local
```

Or set `WORKER_URL` to point to production:
```bash
export WORKER_URL=https://betting-brain-v3-prod.workers.dev
bun run floor:test
```

### "MCP server failed to start"
Check for port conflicts:
```bash
# Kill existing MCP server processes
pkill -f mcp-server.ts

# Try again
bun run floor:test
```

### "Environment file not found"
Create from template:
```bash
cp .env.example .env
# Edit .env with your configuration
```

### "JWT generation failed"
Install dependencies:
```bash
bun install
```

Verify JWT_SECRET is set:
```bash
grep JWT_SECRET .env
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Floor Smoke Test

on:
  push:
    branches: [main]
  pull_request:
  workflow_dispatch:

jobs:
  smoke-test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Run smoke test (quick mode)
        run: bun run floor:test:quick

      - name: Upload logs
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: smoke-test-logs
          path: /tmp/mcp-server.log
```

### Pre-Push Hook

Add to `.git/hooks/pre-push`:

```bash
#!/bin/sh
echo "Running Floor smoke test..."
bun run floor:test:quick

if [ $? -ne 0 ]; then
  echo "❌ Smoke test failed - aborting push"
  exit 1
fi

echo "✅ Smoke test passed"
```

## What You Just Witnessed

When you run the smoke test, you prove that:

1. **MCP Server** boots and speaks JSON-RPC over stdio
2. **Cursor** (or any MCP client) can call all 6 tools
3. **Worker Endpoints** respond with correct data
4. **Floor System** is configured and operational
5. **Documentation** is complete and up-to-date
6. **Cursor Rules** are in place for AI assistants
7. **Package Scripts** are wired correctly

The entire Forest Floor is an **AI-native, fully-documented, self-healing system** ready for autonomous operations.

## References

- [Floor System Documentation](FLOOR_SYSTEM.md)
- [MCP Integration Status](MCP_INTEGRATION_STATUS.md)
- [Sports API Deployment](SPORTS_API_DEPLOYMENT.md)
- [Floor Health Check](../scripts/floor-health.ts)
- [Floor Smoke Test](../scripts/floor-smoke-test.sh)

---

**Status:** Production-Ready ✅
**Version:** 3.3.0
**Last Updated:** 2025-10-08
**Maintainer:** Betting-Brain Team
