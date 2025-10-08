# Sports API Integration - Deployment Guide

This guide covers deploying the Sports API integration (v3.3.0) to production.

## Overview

The Sports API integration adds:
- Multi-bookmaker odds aggregation (Pinnacle + Bet365)
- Live scores from SportsData.io
- JWT-secured data ingestion
- Real-time dashboard with Chart.js
- MCP tools for AI assistant integration

## Prerequisites

- Cloudflare account with Workers enabled
- wrangler CLI installed and authenticated
- API keys from Pinnacle, Bet365, and SportsData.io
- JWT secret (minimum 32 characters)

## Step 1: KV Namespaces

KV namespaces have been created:

### Development
```toml
[[kv_namespaces]]
binding = "RATE_LIMITER"
id = "40765b38805b4cae8fa3e90de40776d3"

[[kv_namespaces]]
binding = "SPORTS_CACHE"
id = "4b0ce52be11041299d35f4c741666afa"
```

### Production
```toml
[[env.production.kv_namespaces]]
binding = "RATE_LIMITER"
id = "126aa83f7b6342d6bd68bde184f431dc"

[[env.production.kv_namespaces]]
binding = "SPORTS_CACHE"
id = "eb56dd8a866041219232c98c88b59e52"
```

## Step 2: Set Production Secrets

### Required Secrets

1. **JWT Secret** (for /ingest authentication)
```bash
wrangler secret put JWT_SECRET --env production
# Enter a secure random string (minimum 32 characters)
```

Generate JWT secret:
```bash
# Option 1: Using openssl
openssl rand -base64 48

# Option 2: Using Node.js/Bun
bun -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

2. **API Keys with Rotation**

For daily rotation, set 3 keys per provider:

```bash
# Pinnacle Sports
wrangler secret put PINNACLE_KEY_1 --env production
wrangler secret put PINNACLE_KEY_2 --env production
wrangler secret put PINNACLE_KEY_3 --env production

# Bet365
wrangler secret put BET365_KEY_1 --env production
wrangler secret put BET365_KEY_2 --env production
wrangler secret put BET365_KEY_3 --env production

# SportsData.io
wrangler secret put SPORTSDATA_KEY_1 --env production
wrangler secret put SPORTSDATA_KEY_2 --env production
wrangler secret put SPORTSDATA_KEY_3 --env production
```

**Key Rotation Logic**: The system automatically cycles through KEY_1 → KEY_2 → KEY_3 based on day of year modulo 3 + 1.

### Optional Secrets

For single-key setups (no rotation):
```bash
wrangler secret put PINNACLE_KEY --env production
wrangler secret put BET365_KEY --env production
wrangler secret put SPORTSDATA_KEY --env production
```

The system falls back to non-suffixed keys if rotation keys are not found.

## Step 3: Local Testing

Before deploying, test locally:

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Add your test API keys
# Edit .env and add:
#   JWT_SECRET=your-test-jwt-secret
#   PINNACLE_KEY_1=your-pinnacle-key
#   BET365_KEY_1=your-bet365-key
#   SPORTSDATA_KEY_1=your-sportsdata-key

# 3. Start local development server
wrangler dev --local

# 4. Test endpoints
curl http://localhost:8787/health
curl http://localhost:8787/api/live-odds?sport=nba&market=moneyline

# 5. Test MCP server
bun run scripts/mcp-server.ts
```

### Testing JWT Authentication

Generate a test JWT:
```typescript
// Test JWT generation (run with: bun run scripts/test-jwt.ts)
import { createJWT } from './src/utils/jwt';

const secret = 'your-jwt-secret-minimum-32-chars';
const payload = { sub: 'test', exp: Math.floor(Date.now() / 1000) + 3600 };
const token = await createJWT(payload, secret);
console.log('JWT:', token);
```

Test /ingest endpoint:
```bash
# Replace YOUR_JWT with the token from above
curl -X POST http://localhost:8787/ingest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT" \
  -d '{
    "records": [
      {
        "eventId": "test-001",
        "timestamp": "2025-10-08T12:00:00Z",
        "metric": "odds",
        "value": 1.95,
        "metadata": {
          "market": "moneyline",
          "source": "pinnacle",
          "volume": 1000
        }
      }
    ]
  }'
```

## Step 4: Deploy to Production

```bash
# 1. Apply database migrations (if needed)
wrangler d1 migrations apply betting-analytics --remote --env production

# 2. Deploy worker
wrangler deploy --env production

# 3. Verify deployment
curl https://betting-brain-v3-prod.nolarose1968-806.workers.dev/health
```

## Step 5: Test Production Endpoints

### Health Check
```bash
curl https://betting-brain-v3-prod.nolarose1968-806.workers.dev/health
```

### Live Odds API
```bash
# NBA moneyline
curl https://betting-brain-v3-prod.nolarose1968-806.workers.dev/api/live-odds?sport=nba&market=moneyline

# NFL spread
curl https://betting-brain-v3-prod.nolarose1968-806.workers.dev/api/live-odds?sport=nfl&market=spread

# Check cache headers
curl -I https://betting-brain-v3-prod.nolarose1968-806.workers.dev/api/live-odds?sport=nba&market=moneyline
```

### Data Ingestion
```bash
curl -X POST https://betting-brain-v3-prod.nolarose1968-806.workers.dev/ingest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_PRODUCTION_JWT" \
  -d '{
    "records": [
      {
        "eventId": "nba-2025-10-08-001",
        "timestamp": "2025-10-08T19:00:00Z",
        "metric": "odds",
        "value": 1.95,
        "metadata": {
          "market": "moneyline",
          "source": "pinnacle",
          "volume": 5000
        }
      }
    ]
  }'
```

## Step 6: MCP Server Configuration

### Claude Desktop Configuration

Add to `~/.config/claude/config.json` (Linux/Mac) or `%APPDATA%\Claude\config.json` (Windows):

```json
{
  "mcpServers": {
    "forest-grove": {
      "command": "bun",
      "args": ["run", "/path/to/ffffff/scripts/mcp-server.ts"],
      "env": {
        "WORKER_URL": "https://betting-brain-v3-prod.nolarose1968-806.workers.dev"
      }
    }
  }
}
```

### Cursor IDE Configuration

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "forest-grove": {
      "command": "bun",
      "args": ["run", "scripts/mcp-server.ts"],
      "env": {
        "WORKER_URL": "https://betting-brain-v3-prod.nolarose1968-806.workers.dev"
      }
    }
  }
}
```

### Testing MCP Tools

```bash
# Start MCP server
bun run scripts/mcp-server.ts

# In another terminal, test via JSON-RPC
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | bun run scripts/mcp-server.ts

# Test live-odds tool
echo '{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "live-odds",
    "arguments": {
      "sport": "nba",
      "market": "moneyline"
    }
  }
}' | bun run scripts/mcp-server.ts
```

## Step 7: Dashboard Access

The real-time sports dashboard is available at:

```
https://betting-brain-v3-prod.nolarose1968-806.workers.dev/dashboards/sports.html
```

Features:
- Auto-refresh every 30 seconds
- Sport selector (NBA, NFL, MLB, NHL)
- Market selector (moneyline, spread, total)
- Line chart showing odds from multiple bookmakers
- Stats cards (sources, cache status)

## Monitoring

### Rate Limiting

Monitor rate limit hits:
```bash
# Check RATE_LIMITER KV namespace
wrangler kv:key list --binding RATE_LIMITER --env production
```

Rate limit: 100 requests per minute per IP on `/ingest`

### Cache Performance

Monitor cache hits:
```bash
# Check SPORTS_CACHE KV namespace
wrangler kv:key list --binding SPORTS_CACHE --env production
```

Cache TTL: 30 seconds

### Analytics

View analytics in Cloudflare dashboard:
- Workers > betting-brain-v3-prod > Analytics
- Analytics Engine > betting-metrics-prod

Key metrics:
- `/api/live-odds` request rate
- `/ingest` request rate and errors
- Cache hit ratio
- API response times

## Troubleshooting

### 401 Unauthorized on /ingest

**Problem**: JWT validation failing
**Solutions**:
1. Verify JWT_SECRET matches between token generation and worker
2. Check JWT expiry (exp claim must be future timestamp)
3. Verify Bearer token format: `Authorization: Bearer <token>`

### 429 Too Many Requests

**Problem**: Rate limit exceeded (100 req/min per IP)
**Solutions**:
1. Implement client-side rate limiting
2. Use exponential backoff
3. Cache responses on client side

### External API errors

**Problem**: Pinnacle/Bet365/SportsData.io API failures
**Solutions**:
1. Check API key rotation is working
2. Verify API keys are valid and have quota
3. Check API provider status pages
4. Review worker logs: `wrangler tail --env production`

### Cache misses

**Problem**: Low cache hit ratio
**Solutions**:
1. Verify SPORTS_CACHE KV namespace is accessible
2. Check 30s TTL is appropriate for use case
3. Monitor cache key patterns
4. Consider increasing TTL if data freshness allows

## Security Checklist

- [ ] All secrets set via `wrangler secret put` (never in wrangler.toml)
- [ ] JWT_SECRET is minimum 32 characters
- [ ] API keys rotated daily (KEY_1, KEY_2, KEY_3 pattern)
- [ ] Rate limiting active (100 req/min per IP)
- [ ] CORS headers configured appropriately
- [ ] Production worker has `cpu_ms = 50` limit
- [ ] Analytics Engine logging sensitive data redacted

## Rollback

If issues occur, rollback to previous deployment:

```bash
# List deployments
wrangler deployments list --env production

# Rollback to previous version
wrangler rollback <version-id> --env production
```

Or rollback to tagged release:
```bash
git checkout v3.2.0
wrangler deploy --env production
```

## Support

For issues or questions:
- GitHub Issues: https://github.com/nolarose1968/ffffff/issues
- Worker Logs: `wrangler tail --env production`
- Cloudflare Support: https://support.cloudflare.com/

---

**Version**: 3.3.0
**Last Updated**: 2025-10-08
**Status**: Production-Ready ✅
