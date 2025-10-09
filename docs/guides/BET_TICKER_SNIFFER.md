# 🎯 BetTicker Sniffer - API Interception & Archiving

**Transparent proxy that intercepts and archives `getBetTicker` API responses with zero client impact.**

## 📋 Overview

The BetTicker Sniffer is a transparent API interceptor that:
- Intercepts all calls to `fantasy402.com/cloud/api/Manager/getBetTicker`
- Stores raw JSON responses in Cloudflare KV
- Returns original response to client (completely transparent)
- Enables historical analysis and debugging
- Zero performance impact with async storage

## 🏗️ Architecture

```
Client → Worker (Sniffer) → Origin API
         ↓ (async)
         KV Storage
```

### Flow

1. **Request arrives** at `/cloud/api/Manager/getBetTicker`
2. **Forward to origin** (`fantasy402.com`)
3. **Clone response** (allows reading + returning)
4. **Store asynchronously** in KV (non-blocking via `ctx.waitUntil()`)
5. **Return original** response to client

## 🚀 Quick Start

### 1. Create KV Namespace

```bash
# Create production namespace
wrangler kv:namespace create BET_TICKER_RAW

# Create preview namespace
wrangler kv:namespace create BET_TICKER_RAW --preview
```

### 2. Update Configuration

Update `wrangler.toml` with your KV namespace IDs:

```toml
[[kv_namespaces]]
binding = "BET_TICKER_RAW"
id = "your-kv-namespace-id"
preview_id = "your-preview-kv-id"
```

### 3. Set Route

Add a route in Cloudflare Dashboard or via wrangler:

```toml
routes = [
  { pattern = "fantasy402.com/cloud/api/Manager/getBetTicker", zone_name = "fantasy402.com" }
]
```

Or use a custom domain:

```toml
routes = [
  { pattern = "brain.mybook.com/cloud/api/Manager/getBetTicker" }
]
```

### 4. Deploy

```bash
# Deploy to staging
bun run deploy:staging

# Deploy to production
bun run deploy:prod
```

## 📊 Usage

### Intercepted Endpoint

**POST** `/cloud/api/Manager/getBetTicker`

This endpoint is automatically intercepted. No client changes required!

### Analysis Endpoints

#### Get History

**GET** `/interceptor/history`

Query parameters:
- `limit` (optional): Number of records to return (default: 100)
- `startTime` (optional): Unix timestamp (ms) - filter start
- `endTime` (optional): Unix timestamp (ms) - filter end

```bash
# Get last 100 responses
curl https://brain.mybook.com/interceptor/history

# Get last 10 responses
curl https://brain.mybook.com/interceptor/history?limit=10

# Get responses in time range
curl "https://brain.mybook.com/interceptor/history?startTime=1696300000000&endTime=1696400000000"
```

Response:
```json
[
  {
    "key": "raw:getBetTicker:1728300000000",
    "metadata": {
      "userAgent": "Mozilla/5.0...",
      "ip": "192.168.1.1",
      "status": 200,
      "timestamp": "2025-10-07T12:00:00.000Z",
      "contentType": "application/json",
      "contentLength": 1234
    }
  }
]
```

#### Get Specific Response

**GET** `/interceptor/response?key={key}`

```bash
# Retrieve specific response
curl "https://brain.mybook.com/interceptor/response?key=raw:getBetTicker:1728300000000"
```

Response:
```json
{
  "body": "{\"success\":true,\"data\":{...}}",
  "metadata": {
    "userAgent": "Mozilla/5.0...",
    "ip": "192.168.1.1",
    "status": 200,
    "timestamp": "2025-10-07T12:00:00.000Z",
    "contentType": "application/json",
    "contentLength": 1234
  }
}
```

### Programmatic Access

```typescript
import { getBetTickerHistory, getBetTickerResponse } from './interceptors/bet-ticker-sniffer';

// Get recent history
const history = await getBetTickerHistory(env, {
  limit: 50,
  startTime: Date.now() - 86400000, // Last 24 hours
});

// Retrieve specific response
const response = await getBetTickerResponse(env, 'raw:getBetTicker:1728300000000');
console.log(response?.body); // Raw JSON
console.log(response?.metadata); // Request metadata
```

## 🗄️ KV Storage Schema

### Key Format

```
raw:getBetTicker:{unix-timestamp-ms}
```

Example: `raw:getBetTicker:1728300000000`

### Value

Raw JSON response body as string.

### Metadata

```typescript
{
  userAgent: string;      // User-Agent header
  ip: string;             // CF-Connecting-IP
  status: number;         // HTTP status code
  timestamp: string;      // ISO 8601 timestamp
  contentType?: string;   // Content-Type header
  contentLength?: number; // Body size in bytes
}
```

### TTL

Default: **7 days** (configurable via `RAW_TTL_DAYS`)

After 7 days, entries are automatically purged by Cloudflare KV.

## 🔧 Configuration

### Environment Variables

Add to `.env` or `wrangler.toml`:

```bash
BET_TICKER_ENABLED=true
BET_TICKER_RAW_TTL_DAYS=7
BET_TICKER_ORIGIN=https://fantasy402.com
BET_TICKER_PATH=/cloud/api/Manager/getBetTicker
BET_TICKER_KV_NAMESPACE_ID=your-kv-namespace-id
BET_TICKER_KV_PREVIEW_ID=your-preview-kv-id
```

### Code Configuration

Edit `src/interceptors/bet-ticker-sniffer.ts`:

```typescript
const RAW_TTL_DAYS = 7; // Retention period
const TARGET_ORIGIN = 'https://fantasy402.com';
const TARGET_PATH = '/cloud/api/Manager/getBetTicker';
```

## 🧪 Testing

### Run Unit Tests

```bash
bun test tests/unit/bet-ticker-sniffer.test.ts
```

### Manual Testing

```bash
# 1. Start local dev server
bun run dev

# 2. Send test request
curl -X POST http://localhost:8787/cloud/api/Manager/getBetTicker \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# 3. Check history
curl http://localhost:8787/interceptor/history

# 4. Retrieve stored response
curl "http://localhost:8787/interceptor/response?key=raw:getBetTicker:1728300000000"
```

### Verify KV Storage

```bash
# List all stored responses
wrangler kv:key list --binding BET_TICKER_RAW

# Get specific response
wrangler kv:key get "raw:getBetTicker:1728300000000" --binding BET_TICKER_RAW

# Delete old responses
wrangler kv:key delete "raw:getBetTicker:1728300000000" --binding BET_TICKER_RAW
```

## 📈 Performance

### Latency Impact

- **Zero client impact**: Response returned immediately
- **Async storage**: KV write happens in background via `ctx.waitUntil()`
- **Typical overhead**: < 5ms (for cloning response)

### Storage Costs

- **KV Storage**: Free tier includes 1 GB
- **Typical response size**: 1-10 KB
- **7-day retention**: ~100K responses = 1 GB
- **Estimated cost**: $0-5/month for most workloads

### Resource Usage

```
CPU: 1-2ms per request
Memory: < 1 MB
KV Writes: 1 per intercepted request
KV Reads: 0 (client requests only)
```

## 🔐 Security

### Access Control

Add authentication to analysis endpoints:

```typescript
// src/index.ts
async function handleInterceptorAPI(request: Request, env: Env) {
  // Add auth check
  const authHeader = request.headers.get('Authorization');
  if (!isAuthorized(authHeader)) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // ... existing code
}
```

### Data Privacy

- **IP addresses**: Stored in metadata
- **User agents**: Stored in metadata
- **Request bodies**: Not stored (only responses)
- **PII**: Ensure responses don't contain sensitive data

### Rate Limiting

Add rate limiting for analysis endpoints:

```typescript
import { rateLimitByIP } from './guards/rateLimit';

async function handleInterceptorAPI(request: Request, env: Env) {
  await rateLimitByIP(request, env, { max: 100, window: 60 });
  // ... existing code
}
```

## 🚨 Monitoring

### Key Metrics

- **Interception success rate**: Should be 100%
- **KV write failures**: Monitor console errors
- **Storage size**: Check KV namespace usage
- **Response times**: Monitor edge logs

### Logging

All operations log to console:

```
[BetTicker] Stored response: raw:getBetTicker:1728300000000 (1234 bytes)
[BetTicker] Storage error: <error details>
[BetTicker] Invalid metadata for <key>: <error details>
[BetTicker] Retrieval error for <key>: <error details>
```

### Alerts

Monitor these conditions:

1. **KV write failures** > 1%
2. **Storage size** > 80% of limit
3. **Response time** > 100ms (p99)
4. **Error rate** > 0.1%

## 🔄 Migration to R2 (Long-term Storage)

For longer retention or lower costs, migrate to R2:

### Update Code

```typescript
// Replace KV with R2
const key = `${timestamp}.json`;
await env.BET_TICKER_BUCKET.put(key, rawBody, {
  httpMetadata: {
    contentType: 'application/json',
  },
  customMetadata: metadata,
});
```

### Cost Comparison

| Storage | Cost (1M requests) | Retention | Best For |
|---------|-------------------|-----------|----------|
| **KV** | ~$5 | 7-30 days | Hot data, fast access |
| **R2** | ~$0.015 | Unlimited | Cold data, archival |

## 🐛 Troubleshooting

### Interception Not Working

1. **Check route configuration**
   ```bash
   wrangler routes list
   ```

2. **Verify KV binding**
   ```bash
   wrangler kv:namespace list
   ```

3. **Check worker logs**
   ```bash
   wrangler tail --env production
   ```

### Storage Failures

1. **Check KV quota**
   - Dashboard → Workers & Pages → KV → Usage

2. **Verify namespace ID**
   - Ensure `wrangler.toml` has correct ID

3. **Check permissions**
   - API token needs KV write permissions

### Missing Responses

1. **Check TTL**
   - Responses auto-expire after 7 days

2. **Verify key format**
   - Must match: `raw:getBetTicker:{timestamp}`

3. **Check timestamp range**
   - Use `/interceptor/history` to list available keys

## 📚 Related Documentation

- [Cloudflare KV Documentation](https://developers.cloudflare.com/kv/)
- [Workers KV API](https://developers.cloudflare.com/kv/api/)
- [Workers Context](https://developers.cloudflare.com/workers/runtime-apis/execution-context/)
- [Testing Guide](guides/TESTING_GUIDE.md)

## 🎯 Use Cases

### 1. Debugging Production Issues

```bash
# Find responses during incident
curl "https://brain.mybook.com/interceptor/history?startTime=1728300000000&endTime=1728310000000"
```

### 2. Data Analysis

```typescript
// Analyze response patterns
const history = await getBetTickerHistory(env, { limit: 1000 });
const sizes = history.map(h => h.metadata.contentLength);
const avgSize = sizes.reduce((a, b) => a + b, 0) / sizes.length;
console.log(`Average response size: ${avgSize} bytes`);
```

### 3. API Monitoring

```typescript
// Monitor success rates
const history = await getBetTickerHistory(env, { limit: 100 });
const successRate = history.filter(h => h.metadata.status === 200).length / history.length;
console.log(`Success rate: ${successRate * 100}%`);
```

### 4. Regression Testing

```bash
# Capture production responses
curl https://brain.mybook.com/interceptor/history > responses.json

# Use as test fixtures
cat responses.json | jq '.[0].key' | xargs -I {} \
  curl "https://brain.mybook.com/interceptor/response?key={}"
```

## 🤝 Contributing

When modifying the sniffer:

1. Update tests in `tests/unit/bet-ticker-sniffer.test.ts`
2. Update this documentation
3. Verify zero client impact
4. Test in staging first
5. Monitor production after deploy

## 📄 License

MIT License - see [LICENSE](../LICENSE) file for details

---

**Built with ❤️ on Cloudflare Edge**

