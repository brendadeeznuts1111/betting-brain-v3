# 🚀 Cloudflare Wrangler Setup & Deployment Guide

**Last Updated:** 2025-10-08  
**Status:** Complete Setup Guide  
**Audience:** Developers, DevOps

---

## 📊 **Current Status**

✅ **What's Already Done:**
- Wrangler configuration complete (`wrangler.toml`)
- MCP integration implemented (13/15 tools operational)
- All tests passing (272/272)
- Fantasy402 integration complete
- Account ID configured: `80693377f3abb78e00820aa69a415ce4`

⚠️ **What You Need To Do:**
- Authenticate with Cloudflare
- Deploy the worker
- Test MCP endpoints

---

## 🔐 **Step 1: Cloudflare Authentication**

### **Option A: OAuth Login (Recommended for Development)**

```bash
# Login via browser (opens browser window)
wrangler login

# Verify authentication
wrangler whoami
```

**Expected Output:**
```
 ⛅️ wrangler 4.30.0
─────────────────────
Getting User settings...
👋 You are logged in with an OAuth Token, associated with the email 'your-email@example.com'!
┌──────────────────┬──────────────────────────────────┐
│ Account Name     │ Account ID                       │
├──────────────────┼──────────────────────────────────┤
│ Your Account     │ 80693377f3abb78e00820aa69a415ce4 │
└──────────────────┴──────────────────────────────────┘
```

---

### **Option B: API Token (Recommended for CI/CD)**

1. **Create API Token:**
   ```
   1. Go to: https://dash.cloudflare.com/profile/api-tokens
   2. Click "Create Token"
   3. Use "Edit Cloudflare Workers" template
   4. Permissions needed:
      - Account > Workers Scripts > Edit
      - Account > Workers KV Storage > Edit
      - Account > Workers D1 > Edit
      - Account > Workers Queues > Edit
   5. Copy the token (only shown once!)
   ```

2. **Set Environment Variable:**
   ```bash
   # Add to your shell profile (~/.zshrc or ~/.bash_profile)
   export CLOUDFLARE_API_TOKEN="your-token-here"
   
   # Or set for current session
   export CLOUDFLARE_API_TOKEN="your-token-here"
   
   # Verify
   wrangler whoami
   ```

3. **Verify Authentication:**
   ```bash
   wrangler whoami
   ```

---

## 🚀 **Step 2: Deploy to Cloudflare**

### **Deploy to Development (Default Environment)**

```bash
# Deploy to default environment
wrangler deploy

# Expected output:
# ⛅️ wrangler 4.30.0
# ─────────────────────
# Your worker has been deployed!
# URL: https://betting-brain-v3.nolarose1968-806.workers.dev
```

### **Deploy to Production**

```bash
# Deploy to production environment
wrangler deploy --env production

# Expected output:
# Your worker has been deployed!
# URL: https://betting-brain-v3-prod.nolarose1968-806.workers.dev
```

### **Verify Deployment**

```bash
# Check deployment status
wrangler deployments list

# Test health endpoint
curl https://betting-brain-v3.nolarose1968-806.workers.dev/health
```

---

## 🧪 **Step 3: Test MCP Integration**

### **Test 1: Health Check**

```bash
curl https://betting-brain-v3.nolarose1968-806.workers.dev/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "version": "3.0.0",
  "timestamp": "2025-10-08T...",
  "requestId": "abc123",
  "duration": "5ms"
}
```

---

### **Test 2: MCP Initialize**

```bash
curl -X POST https://betting-brain-v3.nolarose1968-806.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "0.1.0",
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      }
    }
  }'
```

**Expected Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "0.1.0",
    "capabilities": {
      "tools": {}
    },
    "serverInfo": {
      "name": "betting-brain-mcp",
      "version": "3.0.0"
    }
  }
}
```

---

### **Test 3: List MCP Tools**

```bash
curl -X POST https://betting-brain-v3.nolarose1968-806.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }'
```

**Expected Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "tools": [
      {
        "name": "getBettingExposure",
        "description": "Get current betting exposure for an agent",
        "inputSchema": { ... }
      },
      // ... 12 more tools
    ]
  }
}
```

---

### **Test 4: Call a Tool**

```bash
curl -X POST https://betting-brain-v3.nolarose1968-806.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "getBettingExposure",
      "arguments": {
        "agentID": "agent_123",
        "sport": "NFL"
      }
    }
  }'
```

---

## 🗄️ **Step 4: Setup Databases (If First Deployment)**

### **Apply D1 Migrations**

```bash
# Apply migrations to production database
wrangler d1 migrations apply betting-analytics --remote

# Verify migrations
wrangler d1 migrations list betting-analytics

# Check database info
wrangler d1 info betting-analytics
```

### **Create KV Namespaces (If Not Exist)**

```bash
# Check existing KV namespaces
wrangler kv namespace list

# If needed, create new namespaces:
wrangler kv namespace create BET_TICKER_RAW
wrangler kv namespace create TOKEN_STORE
wrangler kv namespace create USER_STORE
wrangler kv namespace create SESSION_STORE
wrangler kv namespace create REFRESH_STORE
wrangler kv namespace create LIVEBETS_STORE
```

---

## 📊 **Step 5: Verify All Integrations**

### **Check Worker Status**

```bash
# View worker details
wrangler tail betting-brain-v3

# In another terminal, make requests:
curl https://betting-brain-v3.nolarose1968-806.workers.dev/health
curl https://betting-brain-v3.nolarose1968-806.workers.dev/system-status
```

### **Check D1 Database**

```bash
# Query database
wrangler d1 execute betting-analytics --remote --command "SELECT COUNT(*) FROM line_movements"
```

### **Check KV Storage**

```bash
# List KV keys
wrangler kv key list --binding BET_TICKER_RAW

# Get specific value
wrangler kv key get --binding BET_TICKER_RAW "raw:getBetTicker:1234567890"
```

### **Check Queues**

```bash
# List queues
wrangler queues list

# View queue details
wrangler queues describe line-ingress
```

---

## 🔧 **Troubleshooting**

### **Issue 1: Authentication Error**

**Error:**
```
✘ [ERROR] Unable to authenticate request [code: 10001]
```

**Solution:**
1. Check if logged in: `wrangler whoami`
2. If not, login: `wrangler login`
3. If using API token, verify: `echo $CLOUDFLARE_API_TOKEN`

---

### **Issue 2: Account ID Mismatch**

**Error:**
```
✘ [ERROR] Account ID mismatch
```

**Solution:**
1. Check your account ID: `wrangler whoami`
2. Update `wrangler.toml`:
   ```toml
   account_id = "your-actual-account-id"
   ```

---

### **Issue 3: Database Not Found**

**Error:**
```
✘ [ERROR] Database not found
```

**Solution:**
```bash
# List D1 databases
wrangler d1 list

# Create if needed
wrangler d1 create betting-analytics

# Update database_id in wrangler.toml
```

---

### **Issue 4: KV Namespace Not Found**

**Error:**
```
✘ [ERROR] KV namespace not found
```

**Solution:**
```bash
# List KV namespaces
wrangler kv namespace list

# Create if needed
wrangler kv namespace create BET_TICKER_RAW

# Update id in wrangler.toml
```

---

## 📚 **Useful Commands Reference**

### **Deployment**
```bash
wrangler deploy                    # Deploy to default
wrangler deploy --env production   # Deploy to production
wrangler deploy --dry-run         # Test deployment without publishing
wrangler rollback                  # Rollback to previous deployment
```

### **Development**
```bash
wrangler dev                      # Start local development server
wrangler dev --remote             # Start with remote bindings
wrangler tail                     # View live logs
```

### **Database**
```bash
wrangler d1 list                                    # List databases
wrangler d1 execute DB --remote --command "SQL"    # Execute query
wrangler d1 migrations list DB                     # List migrations
wrangler d1 migrations apply DB --remote           # Apply migrations
```

### **KV**
```bash
wrangler kv namespace list                         # List namespaces
wrangler kv key list --binding BINDING_NAME       # List keys
wrangler kv key get --binding BINDING_NAME KEY    # Get value
wrangler kv key put --binding BINDING_NAME KEY VALUE  # Set value
```

### **Queues**
```bash
wrangler queues list                    # List queues
wrangler queues describe QUEUE_NAME     # View queue details
wrangler queues consumer add ...        # Add consumer
```

---

## 🎯 **Quick Setup Checklist**

- [ ] **Authentication**
  - [ ] Run `wrangler login` or set `CLOUDFLARE_API_TOKEN`
  - [ ] Verify with `wrangler whoami`
  - [ ] Confirm account ID matches wrangler.toml

- [ ] **First Deployment**
  - [ ] Run `wrangler deploy`
  - [ ] Verify deployment at returned URL
  - [ ] Test `/health` endpoint

- [ ] **Database Setup**
  - [ ] Apply migrations: `wrangler d1 migrations apply betting-analytics --remote`
  - [ ] Verify tables created

- [ ] **MCP Testing**
  - [ ] Test `/mcp` endpoint with initialize
  - [ ] Test `tools/list` method
  - [ ] Test `tools/call` with getBettingExposure

- [ ] **Integration Verification**
  - [ ] Fantasy402 browser extension installed
  - [ ] BetTicker data being captured
  - [ ] Queues processing messages
  - [ ] Cron triggers executing

---

## 🚀 **Next Steps After Setup**

1. **Configure Claude Desktop for MCP:**
   - See [docs/MCP_ENDPOINTS.md](../MCP_ENDPOINTS.md)
   - Add worker URL to Claude config

2. **Install Browser Extension:**
   - See [browser-extension/README.md](../../README.md)
   - Load extension in Chrome
   - Visit fantasy402.com

3. **Monitor Production:**
   - Use `wrangler tail` for live logs
   - Check Cloudflare dashboard for metrics
   - Review KV storage usage

4. **Set Up Monitoring:**
   - Configure Grafana dashboards (see [monitoring/](../../monitoring/))
   - Set up alerts for errors
   - Track performance metrics

---

## 📖 **Related Documentation**

- **[MCP_INTEGRATION_STATUS.md](../MCP_INTEGRATION_STATUS.md)** - MCP implementation details
- **[FANTASY402_INTEGRATION.md](../FANTASY402_INTEGRATION.md)** - Fantasy402 setup
- **[DEPLOYMENT.md](../deployment/)** - Advanced deployment guides
- **[TROUBLESHOOTING.md](../TROUBLESHOOTING.md)** - Common issues

---

**Status:** Complete setup guide  
**Last Updated:** 2025-10-08  
**Maintainer:** Betting-Brain Team

