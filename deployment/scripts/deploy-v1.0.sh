#!/bin/bash
# Betting-Brain v1.0 Deployment Script
# Deploys cache-optimized worker with interactive dashboard
# Cloudflare Integrations: 50 total (46 bindings + 4 cron triggers)

set -e  # Exit on error

echo "🚀 Betting-Brain v1.0 Deployment Starting..."
echo "================================================"
echo "📦 Cloudflare Services: 50 total (46 bindings + 4 crons)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
WORKER_NAME="betting-brain-v3"
TAG="v1.0-cache-optimization"

# Functions
info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

check_command() {
    if ! command -v $1 &> /dev/null; then
        error "$1 is not installed. Please install it first."
    fi
}

# Pre-flight checks
info "Running pre-flight checks..."

check_command "wrangler"
check_command "git"
check_command "bun"
check_command "curl"
check_command "jq"

# Verify we're on the right tag
CURRENT_TAG=$(git describe --tags --exact-match 2>/dev/null || echo "none")
if [ "$CURRENT_TAG" != "$TAG" ]; then
    warn "Current tag: $CURRENT_TAG, expected: $TAG"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        error "Deployment cancelled"
    fi
fi

# Check if uncommitted changes exist
if [[ -n $(git status -s) ]]; then
    warn "Uncommitted changes detected:"
    git status -s
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        error "Deployment cancelled"
    fi
fi

# Verify environment secret is set
info "Checking EXTENSION_SECRET..."
if ! wrangler secret list 2>/dev/null | grep -q "EXTENSION_SECRET"; then
    warn "EXTENSION_SECRET not found in Wrangler secrets"
    read -p "Set it now? (Y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        info "Setting EXTENSION_SECRET..."
        wrangler secret put EXTENSION_SECRET
    else
        error "EXTENSION_SECRET is required for deployment"
    fi
fi

# Verify bindings before deployment
info "Verifying Cloudflare service bindings..."
info "Expected: 23 bindings per environment (46 total + 4 crons)"

# Count D1 databases
D1_COUNT=$(grep -c "^\[\[d1_databases\]\]" wrangler.toml || echo "0")
info "D1 Databases: $D1_COUNT (expected: 4)"

# Count KV namespaces
KV_COUNT=$(grep -c "^\[\[kv_namespaces\]\]" wrangler.toml || echo "0")
info "KV Namespaces: $KV_COUNT (expected: 20)"

# Count queue producers
QUEUE_PROD_COUNT=$(grep -c "^\[\[queues.producers\]\]" wrangler.toml || echo "0")
info "Queue Producers: $QUEUE_PROD_COUNT (expected: 10)"

# Count queue consumers
QUEUE_CONS_COUNT=$(grep -c "^\[\[queues.consumers\]\]" wrangler.toml || echo "0")
info "Queue Consumers: $QUEUE_CONS_COUNT (expected: 10)"

# Count analytics datasets
ANALYTICS_COUNT=$(grep -c "^\[\[.*analytics_engine_datasets\]\]" wrangler.toml || echo "0")
info "Analytics Datasets: $ANALYTICS_COUNT (expected: 2)"

TOTAL_BINDINGS=$((D1_COUNT + KV_COUNT + QUEUE_PROD_COUNT + QUEUE_CONS_COUNT + ANALYTICS_COUNT))
info "Total Bindings: $TOTAL_BINDINGS (expected: 46)"

if [ "$TOTAL_BINDINGS" -ne 46 ]; then
    warn "Binding count mismatch! Expected 46, got $TOTAL_BINDINGS"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        error "Deployment cancelled due to binding verification failure"
    fi
else
    info "✅ All bindings verified"
fi

# Deploy worker
info "Deploying worker to Cloudflare..."
wrangler deploy

if [ $? -ne 0 ]; then
    error "Worker deployment failed"
fi

info "✅ Worker deployed successfully"

# Get worker URL
WORKER_URL=$(wrangler deployments list --json 2>/dev/null | jq -r '.[0].url' 2>/dev/null || echo "")
if [ -z "$WORKER_URL" ]; then
    WORKER_URL="https://betting-brain-v3.workers.dev"
    warn "Could not auto-detect worker URL, using default: $WORKER_URL"
fi

info "Worker URL: $WORKER_URL"

# Health check
info "Running health check..."
HEALTH_CHECK=$(curl -s "$WORKER_URL/health" || echo "")

if echo "$HEALTH_CHECK" | jq -e '.status == "healthy"' > /dev/null 2>&1; then
    info "✅ Health check passed"
else
    error "Health check failed: $HEALTH_CHECK"
fi

# Cache metrics check (should be empty initially)
info "Checking cache metrics..."
CACHE_METRICS=$(curl -s "$WORKER_URL/api/f402/cache/metrics" || echo "")

if echo "$CACHE_METRICS" | jq -e '.summary' > /dev/null 2>&1; then
    TOTAL_REQUESTS=$(echo "$CACHE_METRICS" | jq -r '.summary.totalRequests')
    info "✅ Cache metrics endpoint working (requests: $TOTAL_REQUESTS)"
else
    warn "Cache metrics endpoint returned unexpected response"
fi

# Warm cache
info "Warming cache..."
WARM_RESULT=$(curl -s -X POST "$WORKER_URL/api/f402/cache/warm" || echo "")

if echo "$WARM_RESULT" | jq -e '.success == true' > /dev/null 2>&1; then
    AGENTS_WARMED=$(echo "$WARM_RESULT" | jq -r '.warmed.agents')
    DURATION=$(echo "$WARM_RESULT" | jq -r '.duration')
    info "✅ Cache warmed: $AGENTS_WARMED agents in ${DURATION}ms"
else
    warn "Cache warming may have failed or returned unexpected response"
    echo "$WARM_RESULT" | jq '.'
fi

# Final verification
info "Running final verification..."
sleep 2  # Wait for cache to settle

FINAL_METRICS=$(curl -s "$WORKER_URL/api/f402/cache/metrics" || echo "")
if echo "$FINAL_METRICS" | jq -e '.summary' > /dev/null 2>&1; then
    HIT_RATE=$(echo "$FINAL_METRICS" | jq -r '.summary.cacheHitRate')
    D1_REDUCTION=$(echo "$FINAL_METRICS" | jq -r '.summary.d1WriteReduction')

    info "Cache Hit Rate: $HIT_RATE%"
    info "D1 Write Reduction: $D1_REDUCTION%"
fi

echo ""
echo "================================================"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo "================================================"
echo ""
echo "Worker URL: $WORKER_URL"
echo "Health: $WORKER_URL/health"
echo "Cache Metrics: $WORKER_URL/api/f402/cache/metrics"
echo "Agent Tree: $WORKER_URL/api/f402/agents/tree?owner=BILLY666"
echo ""
echo "📊 Dashboard URLs (update with your domain):"
echo "- Floor Control: http://localhost:8080/floor-control.html"
echo "- Configure worker URL in dashboard header"
echo ""
echo "🔐 Next Steps:"
echo "1. Update browser extension with EXTENSION_SECRET"
echo "2. Test unauthorized requests return 401"
echo "3. Trigger login flow on Fantasy402"
echo "4. Verify cache hit rate reaches 90%+"
echo "5. Test D3 agent tree visualization"
echo "6. Export metrics (JSON/CSV)"
echo ""
echo "📈 Monitoring:"
echo "- Watch cache hit rate in dashboard"
echo "- Monitor D1 write reduction"
echo "- Check agent tree updates"
echo ""
echo "☕ Grab a coffee - you've earned it!"
