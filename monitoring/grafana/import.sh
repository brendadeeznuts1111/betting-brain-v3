#!/bin/bash
#
# Grafana Dashboard Import Script
# Uploads dashboard.json to Grafana instance via API
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DASHBOARD_FILE="${SCRIPT_DIR}/dashboard.json"

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                               ║${NC}"
echo -e "${BLUE}║     📊 GRAFANA DASHBOARD IMPORT SCRIPT 📊                     ║${NC}"
echo -e "${BLUE}║                                                               ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if dashboard file exists
if [ ! -f "$DASHBOARD_FILE" ]; then
    echo -e "${RED}❌ Error: dashboard.json not found at $DASHBOARD_FILE${NC}"
    exit 1
fi

# Get Grafana URL
if [ -z "${GRAFANA_URL:-}" ]; then
    echo -e "${YELLOW}Enter your Grafana URL (e.g., https://grafana.example.com):${NC}"
    read -r GRAFANA_URL
fi

# Get Grafana API Key
if [ -z "${GRAFANA_API_KEY:-}" ]; then
    echo -e "${YELLOW}Enter your Grafana API Key:${NC}"
    read -rs GRAFANA_API_KEY
    echo ""
fi

# Get Folder ID (optional)
if [ -z "${GRAFANA_FOLDER_ID:-}" ]; then
    echo -e "${YELLOW}Enter Grafana Folder ID (press Enter for General):${NC}"
    read -r GRAFANA_FOLDER_ID
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📤 UPLOADING DASHBOARD${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Prepare payload
PAYLOAD=$(cat "$DASHBOARD_FILE" | jq "{
  dashboard: .dashboard,
  folderId: ${GRAFANA_FOLDER_ID:-0},
  overwrite: true
}")

# Import dashboard
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  -H "Authorization: Bearer ${GRAFANA_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  "${GRAFANA_URL}/api/dashboards/db")

# Parse response
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo ""
if [ "$HTTP_CODE" -eq 200 ]; then
    DASHBOARD_ID=$(echo "$BODY" | jq -r '.id')
    DASHBOARD_SLUG=$(echo "$BODY" | jq -r '.slug')
    DASHBOARD_URL="${GRAFANA_URL}/d/${DASHBOARD_SLUG}"
    
    echo -e "${GREEN}✅ SUCCESS! Dashboard imported successfully${NC}"
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}📊 DASHBOARD DETAILS${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${GREEN}ID:${NC}   $DASHBOARD_ID"
    echo -e "${GREEN}Slug:${NC} $DASHBOARD_SLUG"
    echo -e "${GREEN}URL:${NC}  $DASHBOARD_URL"
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${GREEN}🚀 Your dashboard is live! Open it in your browser:${NC}"
    echo -e "${BLUE}$DASHBOARD_URL${NC}"
    echo ""
    
    # Try to open in browser (macOS/Linux)
    if command -v open &> /dev/null; then
        echo -e "${YELLOW}Opening dashboard in browser...${NC}"
        open "$DASHBOARD_URL"
    elif command -v xdg-open &> /dev/null; then
        echo -e "${YELLOW}Opening dashboard in browser...${NC}"
        xdg-open "$DASHBOARD_URL"
    fi
else
    echo -e "${RED}❌ ERROR: Failed to import dashboard (HTTP $HTTP_CODE)${NC}"
    echo ""
    echo -e "${RED}Response:${NC}"
    echo "$BODY" | jq '.'
    echo ""
    exit 1
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ NEXT STEPS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "1. Configure data sources in Grafana:"
echo "   → Cloudflare Analytics Engine"
echo "   → Prometheus (Cloudflare Workers)"
echo ""
echo "2. Map template variables in dashboard:"
echo "   → \${DS_ANALYTICS_ENGINE}"
echo "   → \${DS_PROMETHEUS}"
echo ""
echo "3. Verify panels are showing data"
echo ""
echo "4. Set up alerting (optional)"
echo ""
echo -e "${GREEN}📖 Full documentation: grafana/README.md${NC}"
echo ""

