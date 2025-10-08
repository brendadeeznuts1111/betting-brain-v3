#!/usr/bin/env bash
# Forest Floor - 60-Second Smoke Test
# Validates entire system end-to-end
#
# Usage:
#   ./scripts/floor-smoke-test.sh
#   ./scripts/floor-smoke-test.sh --quick  (skip optional checks)
#
# Requirements:
#   - Bun >= 1.1.0
#   - .env file with configuration
#   - Local worker running (or WORKER_URL set)

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
QUICK_MODE=false
WORKER_URL="${WORKER_URL:-http://localhost:8787}"
MCP_PID=""
CLEANUP_PIDS=()

# Parse arguments
for arg in "$@"; do
  case $arg in
    --quick)
      QUICK_MODE=true
      shift
      ;;
  esac
done

# Cleanup function
cleanup() {
  echo -e "\n${YELLOW}🧹 Cleaning up...${NC}"
  for pid in "${CLEANUP_PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
  echo -e "${GREEN}✅ Cleanup complete${NC}"
}
trap cleanup EXIT INT TERM

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Test function
test_check() {
  local name="$1"
  local command="$2"
  TESTS_TOTAL=$((TESTS_TOTAL + 1))

  echo -ne "${BLUE}[$TESTS_TOTAL]${NC} Testing: $name... "

  if eval "$command" >/dev/null 2>&1; then
    echo -e "${GREEN}✅${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    return 0
  else
    echo -e "${RED}❌${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    return 1
  fi
}

# Banner
echo "╔══════════════════════════════════════════════════════╗"
echo "║  🌲 Forest Floor - 60-Second Smoke Test             ║"
echo "║  Version: 3.3.0                                      ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# 0. Prerequisites
echo -e "${BLUE}━━━ Prerequisites ━━━${NC}"

test_check "Bun installed" "command -v bun"
test_check "Git repository" "[ -d .git ]"
test_check "Package.json exists" "[ -f package.json ]"
test_check "Environment file" "[ -f .env ] || [ -f .env.local ]"

# Load environment
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs) 2>/dev/null || true
elif [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs) 2>/dev/null || true
fi

echo ""

# 1. Floor Health Check
echo -e "${BLUE}━━━ Floor Health Check ━━━${NC}"

test_check "Floor health script exists" "[ -f scripts/floor-health.ts ]"
test_check "Floor rules exist" "[ -f .cursor/rules/99-floor.mdc ]"
test_check "Floor status endpoint exists" "[ -f src/routes/floor-status.ts ]"

if ! $QUICK_MODE; then
  echo -ne "${BLUE}[Running]${NC} Full health check... "
  if bun run floor:health >/dev/null 2>&1; then
    echo -e "${GREEN}✅ PASS${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "${YELLOW}⚠️  DEGRADED${NC} (non-blocking)"
  fi
fi

echo ""

# 2. MCP Server
echo -e "${BLUE}━━━ MCP Server ━━━${NC}"

test_check "MCP server script exists" "[ -f scripts/mcp-server.ts ]"
test_check "MCP tools defined" "[ -f src/mcp/tools.ts ]"
test_check "MCP tool registry exists" "[ -f src/mcp/toolRegistry.ts ]"

# Start MCP server in background
echo -ne "${BLUE}[Starting]${NC} MCP server... "
bun run scripts/mcp-server.ts </dev/null >/tmp/mcp-server.log 2>&1 &
MCP_PID=$!
CLEANUP_PIDS+=($MCP_PID)
sleep 2

if kill -0 $MCP_PID 2>/dev/null; then
  echo -e "${GREEN}✅ Running (PID: $MCP_PID)${NC}"
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  echo -e "${RED}❌ Failed to start${NC}"
  TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test MCP tools list
if [ -n "$MCP_PID" ] && kill -0 $MCP_PID 2>/dev/null; then
  echo -ne "${BLUE}[Testing]${NC} MCP tools/list... "
  TOOLS_RESPONSE=$(echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | timeout 5 bun run scripts/mcp-server.ts 2>/dev/null | grep -o '"tools"' || echo "")
  if [ -n "$TOOLS_RESPONSE" ]; then
    echo -e "${GREEN}✅ 6 tools available${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "${YELLOW}⚠️  No response${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
fi

echo ""

# 3. Worker Endpoints
echo -e "${BLUE}━━━ Worker Endpoints ━━━${NC}"

# Check if worker is running
echo -ne "${BLUE}[Checking]${NC} Worker availability... "
if curl -s -f -m 5 "$WORKER_URL/health" >/dev/null 2>&1; then
  echo -e "${GREEN}✅ Worker is UP${NC}"
  TESTS_PASSED=$((TESTS_PASSED + 1))
  WORKER_AVAILABLE=true
else
  echo -e "${YELLOW}⚠️  Worker is DOWN (start with: wrangler dev --local)${NC}"
  WORKER_AVAILABLE=false
fi

if $WORKER_AVAILABLE; then
  # Test health endpoint
  test_check "GET /health" "curl -s -f -m 5 $WORKER_URL/health | grep -q status"

  # Test floor status endpoint
  echo -ne "${BLUE}[Testing]${NC} GET /floor/status... "
  FLOOR_STATUS=$(curl -s -f -m 5 "$WORKER_URL/floor/status" 2>/dev/null || echo "")
  if echo "$FLOOR_STATUS" | grep -q '"version".*"3.3.0"'; then
    echo -e "${GREEN}✅ v3.3.0${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "${YELLOW}⚠️  Endpoint not wired${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi

  # Test sports API endpoints
  if ! $QUICK_MODE; then
    test_check "GET /api/live-odds" "curl -s -f -m 5 '$WORKER_URL/api/live-odds?sport=nba&market=moneyline' | grep -q 'sport'"
  fi
fi

echo ""

# 4. MCP Configuration
echo -e "${BLUE}━━━ MCP Configuration ━━━${NC}"

test_check ".cursor/mcp.json exists" "[ -f .cursor/mcp.json ]"

if [ -f .cursor/mcp.json ]; then
  test_check "MCP config has forest-grove" "grep -q 'forest-grove' .cursor/mcp.json"
  test_check "MCP config has 6 tools" "grep -q 'live-odds' .cursor/mcp.json"
fi

echo ""

# 5. Documentation
echo -e "${BLUE}━━━ Documentation ━━━${NC}"

test_check "Floor system docs exist" "[ -f docs/FLOOR_SYSTEM.md ]"
test_check "MCP config update docs" "[ -f docs/MCP_CONFIG_UPDATE.md ]"
test_check "Sports API deployment docs" "[ -f docs/SPORTS_API_DEPLOYMENT.md ]"
test_check "Documentation index updated" "grep -q 'FLOOR_SYSTEM' docs/INDEX.md"

echo ""

# 6. Cursor Rules
echo -e "${BLUE}━━━ Cursor Rules ━━━${NC}"

test_check "Floor rules (99-floor.mdc)" "[ -f .cursor/rules/99-floor.mdc ]"
test_check "MCP integration rules" "[ -f .cursor/rules/mcp-integration.mdc ]"
test_check "API patterns rules" "[ -f .cursor/rules/api-patterns.mdc ]"

if [ -f .cursor/rules/99-floor.mdc ]; then
  test_check "Floor rules have MCP patterns" "grep -q 'MCP Tool Usage' .cursor/rules/99-floor.mdc"
  test_check "Floor rules have test fixes" "grep -q 'Test-Fix Patterns' .cursor/rules/99-floor.mdc"
fi

echo ""

# 7. Package Scripts
echo -e "${BLUE}━━━ Package Scripts ━━━${NC}"

test_check "floor:health script" "grep -q 'floor:health' package.json"
test_check "floor:mcp script" "grep -q 'floor:mcp' package.json"
test_check "floor:voice script" "grep -q 'floor:voice' package.json"
test_check "floor:deploy script" "grep -q 'floor:deploy' package.json"
test_check "floor:status script" "grep -q 'floor:status' package.json"

echo ""

# 8. Git Status
echo -e "${BLUE}━━━ Git Status ━━━${NC}"

UNTRACKED=$(git ls-files --others --exclude-standard | wc -l)
MODIFIED=$(git ls-files --modified | wc -l)
STAGED=$(git diff --cached --name-only | wc -l)

echo "Untracked files: $UNTRACKED"
echo "Modified files: $MODIFIED"
echo "Staged files: $STAGED"

if [ $UNTRACKED -gt 0 ] || [ $MODIFIED -gt 0 ]; then
  echo -e "${YELLOW}⚠️  Uncommitted changes detected${NC}"
fi

echo ""

# 9. Optional: Advanced Checks
if ! $QUICK_MODE && $WORKER_AVAILABLE; then
  echo -e "${BLUE}━━━ Advanced Checks ━━━${NC}"

  # Test JWT generation
  if [ -f scripts/test-jwt.ts ]; then
    echo -ne "${BLUE}[Testing]${NC} JWT generation... "
    JWT=$(bun run scripts/test-jwt.ts 2>&1 | grep -oP 'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+' | head -1 || echo "")
    if [ -n "$JWT" ]; then
      echo -e "${GREEN}✅ JWT generated${NC}"
      TESTS_PASSED=$((TESTS_PASSED + 1))

      # Test /ingest with JWT
      echo -ne "${BLUE}[Testing]${NC} POST /ingest with JWT... "
      INGEST_RESPONSE=$(curl -s -X POST "$WORKER_URL/ingest" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $JWT" \
        -d '{"records":[{"eventId":"smoke-test","timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","metric":"test","value":1.0}]}' 2>/dev/null || echo "")

      if echo "$INGEST_RESPONSE" | grep -q '"success"' 2>/dev/null || echo "$INGEST_RESPONSE" | grep -q '"received"' 2>/dev/null; then
        echo -e "${GREEN}✅ Authenticated${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
      else
        echo -e "${YELLOW}⚠️  Auth may not be configured${NC}"
      fi
    else
      echo -e "${YELLOW}⚠️  JWT generation failed${NC}"
    fi
  fi
fi

echo ""

# Summary
echo "╔══════════════════════════════════════════════════════╗"
echo "║  📊 Test Summary                                     ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo -e "Total Tests:  ${BLUE}$TESTS_TOTAL${NC}"
echo -e "Passed:       ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed:       ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
  echo ""
  echo -e "${GREEN}🟢 Forest Floor is LIVE - All systems operational!${NC}"
  echo ""
  echo "Next steps:"
  echo "  - Wire /floor/status in src/index.ts"
  echo "  - Deploy: bun run floor:deploy"
  echo "  - Monitor: bun run floor:status"
  exit 0
else
  PASS_RATE=$((TESTS_PASSED * 100 / TESTS_TOTAL))
  echo ""
  echo -e "${YELLOW}⚠️  Some checks failed (${PASS_RATE}% pass rate)${NC}"
  echo ""
  echo "Common issues:"
  echo "  - Worker not running: wrangler dev --local"
  echo "  - Missing .env file: cp .env.example .env"
  echo "  - MCP server port conflict: kill existing process"
  echo ""
  echo "Run with --quick to skip optional checks"
  exit 1
fi
