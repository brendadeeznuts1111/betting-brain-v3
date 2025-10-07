#!/bin/bash
# 🎯 Setup script for BetTicker Sniffer KV namespaces

set -e

echo "🎯 Setting up BetTicker Sniffer KV namespaces..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}📦 Creating KV namespaces...${NC}"

# Create production namespace
echo -e "${YELLOW}Creating production namespace...${NC}"
PROD_ID=$(wrangler kv:namespace create BET_TICKER_RAW --env production 2>&1 | grep -o 'id = "[^"]*"' | cut -d'"' -f2)
echo -e "${GREEN}✓ Production namespace created: $PROD_ID${NC}"

# Create production preview namespace
echo -e "${YELLOW}Creating production preview namespace...${NC}"
PROD_PREVIEW_ID=$(wrangler kv:namespace create BET_TICKER_RAW --env production --preview 2>&1 | grep -o 'id = "[^"]*"' | cut -d'"' -f2)
echo -e "${GREEN}✓ Production preview namespace created: $PROD_PREVIEW_ID${NC}"

# Create staging namespace
echo -e "${YELLOW}Creating staging namespace...${NC}"
STAGING_ID=$(wrangler kv:namespace create BET_TICKER_RAW --env staging 2>&1 | grep -o 'id = "[^"]*"' | cut -d'"' -f2)
echo -e "${GREEN}✓ Staging namespace created: $STAGING_ID${NC}"

# Create staging preview namespace
echo -e "${YELLOW}Creating staging preview namespace...${NC}"
STAGING_PREVIEW_ID=$(wrangler kv:namespace create BET_TICKER_RAW --env staging --preview 2>&1 | grep -o 'id = "[^"]*"' | cut -d'"' -f2)
echo -e "${GREEN}✓ Staging preview namespace created: $STAGING_PREVIEW_ID${NC}"

# Create base/dev namespace
echo -e "${YELLOW}Creating dev/base namespace...${NC}"
BASE_ID=$(wrangler kv:namespace create BET_TICKER_RAW 2>&1 | grep -o 'id = "[^"]*"' | cut -d'"' -f2)
echo -e "${GREEN}✓ Dev namespace created: $BASE_ID${NC}"

# Create base preview namespace
echo -e "${YELLOW}Creating dev/base preview namespace...${NC}"
BASE_PREVIEW_ID=$(wrangler kv:namespace create BET_TICKER_RAW --preview 2>&1 | grep -o 'id = "[^"]*"' | cut -d'"' -f2)
echo -e "${GREEN}✓ Dev preview namespace created: $BASE_PREVIEW_ID${NC}"

echo ""
echo -e "${GREEN}✅ All KV namespaces created successfully!${NC}"
echo ""
echo -e "${BLUE}📝 Next steps:${NC}"
echo ""
echo "1. Update wrangler.toml with base namespace:"
echo "   [[kv_namespaces]]"
echo "   binding = \"BET_TICKER_RAW\""
echo "   id = \"$BASE_ID\""
echo "   preview_id = \"$BASE_PREVIEW_ID\""
echo ""
echo "2. Update wrangler.production.toml:"
echo "   [[env.production.kv_namespaces]]"
echo "   binding = \"BET_TICKER_RAW\""
echo "   id = \"$PROD_ID\""
echo "   preview_id = \"$PROD_PREVIEW_ID\""
echo ""
echo "3. Update wrangler.staging.toml:"
echo "   [[env.staging.kv_namespaces]]"
echo "   binding = \"BET_TICKER_RAW\""
echo "   id = \"$STAGING_ID\""
echo "   preview_id = \"$STAGING_PREVIEW_ID\""
echo ""
echo -e "${BLUE}🚀 Ready to deploy!${NC}"
echo "   bun run deploy:staging"
echo "   bun run deploy:prod"

