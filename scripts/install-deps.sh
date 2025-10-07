#!/bin/bash
# Betting-Brain v3 - Dependency Installation Helper
# Works around private registry configuration issues

set -e

echo "🔧 Installing dependencies for Betting-Brain v3..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}⚠️  Note: Unsetting BUN_REGISTRY and npm_config_registry to use public npm...${NC}"
echo ""

# Install main dependencies
echo "📦 Installing packages..."
env -u BUN_REGISTRY -u npm_config_registry bun install

# Install Bun types if not present
if [ ! -d "node_modules/@types/bun" ]; then
  echo ""
  echo "📦 Installing @types/bun..."
  env -u BUN_REGISTRY -u npm_config_registry bun add -d @types/bun
fi

echo ""
echo -e "${GREEN}✅ Dependencies installed successfully!${NC}"
echo ""
echo "📊 Installed packages:"
echo "  - @cloudflare/workers-types ✅"
echo "  - @cloudflare/vitest-pool-workers ✅"
echo "  - @types/node ✅"
echo "  - @types/bun ✅"
echo "  - vitest ✅"
echo "  - typescript ✅"
echo "  - wrangler ✅"
echo "  - zod ✅"
echo ""
echo "🚀 Next steps:"
echo "  1. Run 'bun run lint' to check for TypeScript errors"
echo "  2. Run 'bun run test' to run tests"
echo "  3. Run 'bun run dev' to start development server"
echo ""

