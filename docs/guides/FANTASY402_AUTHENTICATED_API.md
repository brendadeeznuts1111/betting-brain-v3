# 🔐 Fantasy402 Authenticated API Client

**Status:** ✅ IMPLEMENTED  
**Version:** 1.0.0  
**Date:** 2025-10-08

---

## 🎯 Overview

This document describes the **server-side authenticated API client** for making direct API calls to fantasy402.com from your Cloudflare Workers or scripts.

### When to Use This

- ✅ **Scheduled Jobs** - Fetch data on a cron schedule
- ✅ **Webhooks** - Pull data in response to events
- ✅ **Background Tasks** - Fetch data for analysis
- ✅ **Testing** - Verify API responses
- ✅ **Data Migration** - Bulk fetch historical data

### When NOT to Use This

- ❌ **Real-time capture** - Use browser extension instead
- ❌ **User-initiated requests** - Use browser extension
- ❌ **High-frequency polling** - Use WebSockets (future)

---

## 🏗️ Architecture

### Browser Extension vs API Client

```
┌──────────────────────────────────────────────────────┐
│  Browser-Side (Extension)                             │
│  ✅ Captures ALL user activity                        │
│  ✅ Real-time interception                            │
│  ✅ No authentication needed (uses user's session)    │
│  ✅ Zero configuration                                │
└──────────────────────────────────────────────────────┘
                         VS
┌──────────────────────────────────────────────────────┐
│  Server-Side (API Client)                             │
│  ✅ Scheduled fetching                                │
│  ✅ Background processing                             │
│  ✅ Bulk operations                                   │
│  ⚠️  Requires JWT token                               │
│  ⚠️  Must mimic browser headers                       │
└──────────────────────────────────────────────────────┘
```

---

## 🔑 Authentication

### Step 1: Get JWT Token

**Option A: From Browser Extension** (Recommended)

The browser extension captures JWT tokens automatically. Check KV storage:

```bash
wrangler kv key list --namespace-id=... --prefix="fantasy402:user:"
wrangler kv key get --namespace-id=... "fantasy402:user:BILLY666"
```

**Option B: Authenticate Programmatically**

```typescript
import { Fantasy402Client } from './src/utils/fantasy402-client';

// Authenticate and get token
const token = await Fantasy402Client.authenticate({
    username: 'BILLY666',
    password: 'your-password'
});

console.log('JWT Token:', token);
// Save this token to environment variable
```

### Step 2: Store Token Securely

**For Cloudflare Workers:**
```bash
wrangler secret put FANTASY402_JWT_TOKEN
# Paste your token when prompted
```

**For Local Development:**
```bash
# .env
FANTASY402_JWT_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🚀 Quick Start

### Basic Usage

```typescript
import { Fantasy402Client } from './src/utils/fantasy402-client';

// Create client with JWT token
const client = new Fantasy402Client({
    jwtToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
});

// Fetch bet ticker data
const bets = await client.getBetTicker({
    agent: 'BILLY666',
    daterange: '01/01/2025 - 12/31/2025',
    limit: '200'
});

console.log('Found', bets.length, 'bets');
```

### With Environment Variable

```typescript
import { createFantasy402Client } from './src/utils/fantasy402-client';

// Create client from environment
const client = createFantasy402Client(env);

// Use client
const data = await client.getAgentPerformance({
    agentID: 'BILLY666',
    start: '01/01/2025',
    end: '12/31/2025'
});
```

---

## 📚 API Reference

### Fantasy402Client

#### Constructor

```typescript
new Fantasy402Client(options: {
    jwtToken: string;
    userAgent?: string;
    referer?: string;
})
```

**Parameters:**
- `jwtToken` - JWT Bearer token (required)
- `userAgent` - Browser user agent (optional, defaults to Chrome Mobile)
- `referer` - Referer header (optional, defaults to fantasy402.com)

---

### Methods

#### getBetTicker()

Fetch bet ticker data (recent bets).

```typescript
await client.getBetTicker({
    agent?: string;        // Agent ID filter
    level?: string;        // Level filter
    ticket?: string;       // Ticket number filter
    customer?: string;     // Customer ID filter
    daterange?: string;    // Date range 'MM/DD/YYYY - MM/DD/YYYY'
    show?: string;         // Show filter
    limit?: string;        // Max results (default: '200')
    offset?: string;       // Pagination offset (default: '0')
})
```

**Example:**
```typescript
const bets = await client.getBetTicker({
    agent: 'BILLY666',
    daterange: '01/01/2025 - 12/31/2025',
    limit: '100'
});
```

---

#### getAgentPerformance()

Fetch agent performance metrics.

```typescript
await client.getAgentPerformance({
    agentID: string;       // Agent ID (required)
    start: string;         // Start date MM/DD/YYYY (required)
    end: string;           // End date MM/DD/YYYY (required)
    type?: string;         // Period type (default: 'CP' = Custom Period)
    period?: string;       // Period number (default: '-1')
})
```

**Example:**
```typescript
const performance = await client.getAgentPerformance({
    agentID: 'BILLY666',
    start: '01/01/2025',
    end: '12/31/2025',
    type: 'CP'
});

console.log('Total Risk:', performance.TotalRisk);
console.log('Net Income:', performance.NetIncome);
```

---

#### getTransactionHistory()

Fetch transaction history.

```typescript
await client.getTransactionHistory({
    agentID: string;       // Agent ID (required)
    customerID?: string;   // Customer ID filter (optional)
    start: string;         // Start date MM/DD/YYYY (required)
    end: string;           // End date MM/DD/YYYY (required)
    limit?: string;        // Max results (default: '100')
    offset?: string;       // Pagination offset (default: '0')
})
```

**Example:**
```typescript
const transactions = await client.getTransactionHistory({
    agentID: 'BILLY666',
    start: '01/01/2025',
    end: '12/31/2025',
    limit: '50'
});
```

---

#### getAccountInfoOwner()

Fetch account information for an agent.

```typescript
await client.getAccountInfoOwner(agentID: string)
```

**Example:**
```typescript
const accountInfo = await client.getAccountInfoOwner('BILLY666');

console.log('Agent:', accountInfo.AgentID);
console.log('Owner:', accountInfo.AgentOwner);
```

---

### Static Methods

#### authenticate()

Authenticate and get JWT token.

```typescript
const token = await Fantasy402Client.authenticate({
    username: string;
    password: string;
})
```

**Example:**
```typescript
const token = await Fantasy402Client.authenticate({
    username: 'BILLY666',
    password: 'secure-password'
});

console.log('Token:', token);
```

---

### Utility Functions

#### cacheBustURL()

Add cache-busting parameter to URL.

```typescript
cacheBustURL(url: string): string
```

**Example:**
```typescript
const url = cacheBustURL('https://fantasy402.com/manager.html');
// Returns: https://fantasy402.com/manager.html?v=1759902256518
```

#### getCacheBustVersion()

Extract cache-bust version from URL.

```typescript
getCacheBustVersion(url: string): number | null
```

**Example:**
```typescript
const version = getCacheBustVersion('https://fantasy402.com/manager.html?v=1759902256518');
// Returns: 1759902256518
```

---

## 💡 Use Cases

### 1. Scheduled Data Fetching

**Fetch agent performance every hour:**

```typescript
// In scheduled trigger (src/index.ts)
export default {
    async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
        if (event.cron === '0 * * * *') {
            const client = createFantasy402Client(env);
            
            const performance = await client.getAgentPerformance({
                agentID: 'BILLY666',
                start: getStartOfDay(),
                end: getEndOfDay()
            });
            
            // Store in D1
            await env.RAW_FEED_DB.prepare(`
                INSERT INTO daily_performance (...)
                VALUES (...)
            `).bind(...).run();
        }
    }
}
```

---

### 2. Webhook Handler

**Fetch data in response to webhook:**

```typescript
// In webhook endpoint
export async function handleWebhook(request: Request, env: Env): Promise<Response> {
    const { agentID, date } = await request.json();
    
    const client = createFantasy402Client(env);
    
    const data = await client.getBetTicker({
        agent: agentID,
        daterange: `${date} - ${date}`,
        limit: '1000'
    });
    
    // Process data
    await processAndStore(data, env);
    
    return new Response(JSON.stringify({
        success: true,
        recordsProcessed: data.length
    }));
}
```

---

### 3. Bulk Historical Fetch

**Fetch historical data for analysis:**

```typescript
// scripts/fetch-historical-data.ts
import { Fantasy402Client } from '../src/utils/fantasy402-client';

async function fetchHistoricalData() {
    const client = new Fantasy402Client({
        jwtToken: process.env.FANTASY402_JWT_TOKEN!
    });
    
    const startDate = new Date('2025-01-01');
    const endDate = new Date('2025-12-31');
    
    // Fetch by month
    for (let month = 0; month < 12; month++) {
        const monthStart = new Date(2025, month, 1);
        const monthEnd = new Date(2025, month + 1, 0);
        
        console.log(`Fetching ${monthStart.toLocaleDateString()}...`);
        
        const data = await client.getAgentPerformance({
            agentID: 'BILLY666',
            start: formatDate(monthStart),
            end: formatDate(monthEnd)
        });
        
        await saveToDatabase(data);
    }
}
```

---

### 4. Testing Endpoint

**Verify API responses:**

```typescript
// tests/integration/fantasy402-api.test.ts
import { describe, test, expect } from 'bun:test';
import { Fantasy402Client } from '../../src/utils/fantasy402-client';

describe('Fantasy402 API', () => {
    test('should fetch bet ticker', async () => {
        const client = new Fantasy402Client({
            jwtToken: process.env.FANTASY402_JWT_TOKEN!
        });
        
        const bets = await client.getBetTicker({
            limit: '10'
        });
        
        expect(Array.isArray(bets)).toBe(true);
        expect(bets.length).toBeLessThanOrEqual(10);
    });
});
```

---

## 🔍 Headers Explained

### Why These Headers Matter

Fantasy402's API checks for specific headers to verify requests come from legitimate browsers:

#### User-Agent
```
Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36
```

**Purpose:** Identifies the client as a Chrome mobile browser  
**Why:** Server may reject requests without valid user agent

#### Referer
```
https://fantasy402.com/
```

**Purpose:** Shows the request originated from fantasy402.com  
**Why:** CSRF protection - server verifies requests come from their own site

#### Authorization
```
Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Purpose:** Authenticates the user  
**Why:** Required for accessing protected endpoints

#### Content-Type
```
application/x-www-form-urlencoded
```

**Purpose:** Tells server how to parse the request body  
**Why:** Fantasy402 expects form-encoded data, not JSON

---

## 🧪 Testing

### Run Test Script

```bash
# Set JWT token
export FANTASY402_JWT_TOKEN="your-token-here"

# Run test
bun run scripts/test-fantasy402-client.ts
```

**Expected Output:**
```
🧪 Testing Fantasy402 API Client

📡 Creating Fantasy402 client...
✅ Client created

📊 Test 1: Get Bet Ticker
   Fetching recent bets...
✅ Response received in 245ms
   Found 10 bets

📊 Test 2: Get Agent Performance
   Fetching performance data...
✅ Response received in 198ms
   Agent: BILLY666
   Total Risk: $1,234,567
   Total Win: $987,654
   Net Income: $-246,913

✅ All tests completed successfully!
```

---

## ⚠️ Important Notes

### JWT Token Expiration

JWT tokens typically expire after some time (often 1-24 hours). Monitor for `401 Unauthorized` errors and refresh tokens when needed.

```typescript
async function makeRequestWithRetry() {
    try {
        return await client.getBetTicker();
    } catch (error) {
        if (error.message.includes('401')) {
            // Token expired, re-authenticate
            const newToken = await Fantasy402Client.authenticate({
                username: env.FANTASY402_USERNAME,
                password: env.FANTASY402_PASSWORD
            });
            
            // Update client with new token
            client = new Fantasy402Client({ jwtToken: newToken });
            
            // Retry request
            return await client.getBetTicker();
        }
        throw error;
    }
}
```

### Rate Limiting

Be respectful of fantasy402.com's servers:
- ⏱️ Don't poll faster than every 30 seconds
- 📦 Batch requests when possible
- 💤 Add delays between bulk operations

### Security

- 🔒 **Never commit JWT tokens** to version control
- 🔐 Store tokens in environment variables
- 🔑 Rotate tokens regularly
- ⚠️ Use read-only tokens when possible

---

## 📚 Related Documentation

- [Fantasy402 Integration Complete](FANTASY402_INTEGRATION_COMPLETE.md)
- [Queue-Based Logging](QUEUE_BASED_LOGGING.md)
- [Browser Extension Guide](../browser-extension/TROUBLESHOOTING.md)

---

**Status:** Production-ready ✅  
**Use Cases:** Scheduled jobs, webhooks, bulk operations, testing  
**Authentication:** JWT Bearer Token required

