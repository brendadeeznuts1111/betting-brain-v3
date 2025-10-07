# 🔍 Debugging Data Capture Issues

**Problem:** Dashboard shows old data but no new data is being captured.

## 🎯 Quick Diagnosis (5 minutes)

### Step 1: Open Diagnostic Suite
```bash
open tools/diagnostic-suite.html
```

This will automatically test:
- ✅ Worker health
- ✅ KV storage access
- ✅ Data freshness
- ✅ Data flow

### Step 2: Check Real-Time Logs
```bash
cd /Users/nolarose/ffffff
wrangler tail --format pretty
```

Leave this running and proceed to Step 3.

### Step 3: Test the Full Flow
1. Open `fantasy402.com` in browser
2. Log in to your account
3. Navigate to betting pages
4. Watch the `wrangler tail` output for incoming requests
5. Check diagnostic suite for new data

---

## 🔬 Detailed Troubleshooting

### Issue 1: No Records in KV Storage

**Symptoms:**
- Diagnostic shows "0 records"
- `workerStatus` is green but `kvStatus` is empty

**Root Causes:**
1. Browser extension not installed
2. Extension installed but disabled
3. Extension not working correctly
4. No one has visited fantasy402.com yet

**Fix:**

```bash
# Check extension status
open tools/extension-checker.html
```

Follow the on-screen instructions to verify:
- Extension is installed
- Extension is enabled
- Extension permissions are correct
- Redirects are working

### Issue 2: Old Data (No Fresh Captures)

**Symptoms:**
- Records exist but are hours/days old
- "Data Freshness" shows RED or YELLOW
- No new records appearing

**Root Causes:**
1. Extension was working but is now disabled
2. No recent traffic to fantasy402.com
3. Extension redirects stopped working
4. Worker is receiving requests but not storing them

**Fix:**

**A. Check Extension Health:**
```bash
open tools/extension-checker.html
```

**B. Verify Extension is Active:**
1. Click extension icon in browser toolbar
2. Should show: `Status: Enabled ✅`
3. Should show: `Intercepts: [number]`
4. Click "Open Dashboard" to see intercepted data

**C. Test Live Capture:**
1. Open `fantasy402.com`
2. Open DevTools (F12)
3. Go to Network tab
4. Filter for: `getBetTicker`
5. Navigate betting pages
6. You should see requests to: `betting-brain-v3.nolarose1968-806.workers.dev`
7. **NOT to:** `fantasy402.com`

**D. Check Worker Logs:**
```bash
wrangler tail --format pretty
```

You should see logs like:
```
[abc123] 🎯 BetTicker intercept request
[abc123] ✅ Target endpoint matched, intercepting...
[abc123] 📡 Calling origin: https://fantasy402.com/cloud/api/Manager/getBetTicker
[abc123] 📥 Origin responded: status 200
[abc123] 💾 Queuing KV storage (async)...
[abc123] ✅ Stored in KV: raw:getBetTicker:1234567890
```

**If you see these logs:** Worker is receiving AND storing data ✅

**If you don't see these logs:** Extension is NOT redirecting requests ❌

### Issue 3: Worker Receiving But Not Storing

**Symptoms:**
- Worker logs show requests coming in
- But KV storage remains empty or stale

**Root Causes:**
1. KV binding not configured
2. KV namespace doesn't exist
3. Worker lacks permissions
4. Storage errors (check logs for errors)

**Fix:**

**A. Verify KV Binding:**
```bash
grep "BET_TICKER_RAW" wrangler.toml
```

Should show:
```toml
[[kv_namespaces]]
binding = "BET_TICKER_RAW"
id = "8b9618cb00c647f18ad83458e0061018"
```

**B. Check KV Namespace Exists:**
```bash
wrangler kv:namespace list
```

Should include a namespace with ID matching wrangler.toml

**C. Test KV Access:**
```bash
wrangler kv:key list --namespace-id=8b9618cb00c647f18ad83458e0061018 --prefix="raw:getBetTicker:"
```

**D. Check Worker Logs for Errors:**
```bash
wrangler tail --format pretty | grep "❌\|ERROR"
```

### Issue 4: Extension Not Installed

**Symptoms:**
- Can't find extension in `chrome://extensions/`
- Extension icon not in toolbar

**Fix:**

**A. Install Extension:**
```bash
cd browser-extension
open . # Opens folder in Finder
```

**B. Load in Chrome:**
1. Open `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `browser-extension/` folder
5. Extension should appear with name "BetTicker Interceptor Proxy"

**C. Verify Installation:**
- Extension icon should appear in toolbar
- Click icon → Should show popup
- Popup should show "Status: Enabled ✅"

### Issue 5: Extension Installed But Not Working

**Symptoms:**
- Extension shows as enabled
- But requests still go to fantasy402.com directly
- No intercepts counter increasing

**Fix:**

**A. Reload Extension:**
1. Go to `chrome://extensions/`
2. Find "BetTicker Interceptor Proxy"
3. Click the reload icon (circular arrow)

**B. Check Permissions:**
Extension needs:
- `declarativeNetRequest`
- `storage`
- Host permissions for `fantasy402.com/*`
- Host permissions for `betting-brain-v3.nolarose1968-806.workers.dev/*`

**C. Check Extension Console:**
1. Go to `chrome://extensions/`
2. Find "BetTicker Interceptor Proxy"
3. Click "Inspect views: service worker"
4. Look for errors in console

**D. Verify Rules are Active:**
In extension console:
```javascript
chrome.declarativeNetRequest.getDynamicRules().then(console.log)
```

Should show a rule redirecting `fantasy402.com/cloud/api/Manager/getBetTicker` to worker URL.

---

## 🧪 Test Scenarios

### Test 1: End-to-End Test

```bash
# Terminal 1: Watch logs
wrangler tail --format pretty

# Terminal 2: Open diagnostics
open tools/diagnostic-suite.html

# Browser: 
# 1. Open fantasy402.com
# 2. Log in
# 3. Navigate to betting pages
# 4. Watch Terminal 1 for logs
# 5. Watch diagnostic suite for new data
```

**Expected Result:**
- Logs show requests coming in
- Diagnostic suite detects new data
- Records table updates with fresh entries

### Test 2: Extension Health

```bash
open tools/extension-checker.html
```

Click "Test Redirection Now" button.

**Expected Result:**
- Worker is accessible ✅
- Instructions show next steps

Then manually verify in browser:
1. Open fantasy402.com + DevTools
2. Network tab shows redirected requests

### Test 3: KV Storage Test

```bash
curl https://betting-brain-v3.nolarose1968-806.workers.dev/interceptor/history?limit=5
```

**Expected Result:**
- JSON array of recent records
- Each record has `key`, `metadata`
- Timestamps are recent (< 1 hour old)

---

## 📊 Understanding the Data Flow

```
Browser (fantasy402.com)
    ↓
    📱 Browser Extension intercepts
    ↓
    🔀 Redirects to: betting-brain-v3.nolarose1968-806.workers.dev
    ↓
    ⚡ Worker receives request
    ↓
    📡 Worker fetches from fantasy402.com
    ↓
    💾 Worker stores response in KV
    ↓
    ✅ Worker returns original response to browser
    ↓
Browser sees normal response (transparent)
```

**Each link must work for data capture to succeed!**

---

## 🔧 Common Fixes

### Fix: Extension Not Redirecting

```bash
# 1. Reload extension
# Go to chrome://extensions/ → Click reload

# 2. Re-enable dynamic rules
# Extension console:
chrome.storage.local.set({ enabled: true })
```

### Fix: Worker Not Storing

```bash
# Check if KV binding exists
wrangler kv:namespace list

# If missing, create it
wrangler kv:namespace create BET_TICKER_RAW

# Update wrangler.toml with the ID shown
```

### Fix: Old Data Stuck

```bash
# Clear old data
wrangler kv:key list --namespace-id=8b9618cb00c647f18ad83458e0061018 --prefix="raw:getBetTicker:"

# Check timestamps - data should auto-expire after 7 days
```

---

## 📞 Still Not Working?

1. **Check Worker Deployment:**
   ```bash
   wrangler whoami
   wrangler deployments list
   ```

2. **Test Worker Health:**
   ```bash
   curl https://betting-brain-v3.nolarose1968-806.workers.dev/health
   ```

3. **Check KV Namespace:**
   ```bash
   wrangler kv:namespace list
   ```

4. **Review Worker Code:**
   - Check `src/interceptors/bet-ticker-sniffer.ts`
   - Verify `handleBetTickerInterception` function
   - Ensure KV storage logic is correct

5. **Enable Debug Mode:**
   Add to `wrangler.toml`:
   ```toml
   [vars]
   DEBUG = "true"
   ```

6. **Contact Support:**
   - Include diagnostic suite screenshot
   - Include worker logs output
   - Include extension console errors

---

## ✅ Success Checklist

- [ ] Worker health check passes
- [ ] KV storage accessible
- [ ] Extension installed and enabled
- [ ] Extension redirects working (check DevTools)
- [ ] Worker logs show incoming requests
- [ ] KV storage has recent data (< 5 min)
- [ ] Diagnostic suite shows green status
- [ ] Dashboard displays fresh data

**If all checkboxes are ✅, data capture is working correctly! 🎉**

