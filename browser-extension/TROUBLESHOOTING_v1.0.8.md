# Fantasy402 Browser Extension - Troubleshooting v1.0.8

## 🎯 Issues Fixed in v1.0.8

### 1. Service Worker Registration Failed (Status Code 15)
**Cause:** Missing Chrome API permissions in manifest.json
**Fix:** Added `alarms` and `notifications` permissions

### 2. TypeError: Cannot read properties of undefined (reading 'onAlarm')
**Cause:** Code tried to use `chrome.alarms` before checking if API exists
**Fix:** Added defensive checks before using Chrome APIs

### 3. Failed to forward: TypeError: Failed to fetch
**Cause:** Worker not running or network connectivity issues
**Fix:** Added better error messages with troubleshooting hints

---

## 🔧 How to Apply the Fix

### Step 1: Reload the Extension

**Option A: Via Chrome Extensions Page**
1. Open `chrome://extensions/`
2. Find "Fantasy402 Data Capture"
3. Click the **Reload** button (🔄 icon)

**Option B: Remove and Reinstall**
1. Open `chrome://extensions/`
2. Click **Remove** on the extension
3. Click **Load unpacked**
4. Select the `browser-extension/` folder

### Step 2: Verify Permissions

After reloading, check the console:
1. Right-click extension icon → **Inspect**
2. Look for these messages:
   ```
   🎯 BetTicker Interceptor installed!
   ✅ Health monitoring alarm created
   ```

If you see warnings instead:
```
⚠️ chrome.alarms API not available
⚠️ Alarm listener not registered
```

Then **reinstall** the extension (Chrome sometimes caches old permissions).

---

## 🚀 Testing the Extension

### 1. Start the Worker (Required!)

The extension needs the Cloudflare Worker running to forward data:

```bash
# In project root
bun run dev
```

Expected output:
```
⎔ Starting local server...
[wrangler:inf] Ready on http://localhost:8787
```

### 2. Test Worker Health

Open browser console and check:
```javascript
fetch('http://localhost:8787/health')
  .then(r => r.json())
  .then(console.log)
```

Expected response:
```json
{
  "status": "healthy",
  "version": "3.3.0",
  "timestamp": "2025-10-08T...",
  "duration": 5
}
```

### 3. Test Extension

1. Navigate to `https://fantasy402.com/`
2. Open **Console** (F12)
3. Look for initialization messages:
   ```
   [Fantasy402] 🚀 Interceptor initialized
   [Fantasy402] 📡 Worker URL: http://localhost:8787
   [Fantasy402] 🎯 Monitoring endpoints: ["/cloud/api/"]
   ```

4. Make an API call on Fantasy402
5. Check for successful forward:
   ```
   [Fantasy402] 🔍 Intercepting: /cloud/api/Manager/getBetTicker
   [Fantasy402] ✅ Forwarded to worker: /cloud/api/Manager/getBetTicker (202)
   ```

---

## 🐛 Common Issues

### Issue: "Worker responded with: 500 Internal Server Error"

**Diagnosis:**
```javascript
// Check what endpoint failed
// Console will show: [Fantasy402] ⚠️ Worker responded with: 500
```

**Fix:**
1. Check worker logs:
   ```bash
   # In worker terminal
   # Look for error messages
   ```
2. Verify worker has all bindings:
   ```bash
   bun run dev
   # Check for warnings about missing KV/D1
   ```

### Issue: "Failed to fetch" (Network Error)

**Diagnosis:**
```
[Fantasy402] ❌ Failed to forward: TypeError: Failed to fetch
[Fantasy402] 🔍 Worker URL: http://localhost:8787
[Fantasy402] 💡 Make sure the worker is running: bun run dev
```

**Possible Causes:**
1. **Worker not running** → Start with `bun run dev`
2. **Wrong port** → Worker uses 8787 by default
3. **CORS blocked** → Worker should handle CORS automatically
4. **Network firewall** → Check localhost access

**Fix:**
```bash
# 1. Verify worker is running
curl http://localhost:8787/health

# 2. Check logs in worker terminal
# Should show request received

# 3. Test ingestion endpoint directly
curl -X POST http://localhost:8787/api/fantasy402/ingest \
  -H "Content-Type: application/json" \
  -d '{"timestamp":"2025-01-01T00:00:00Z","endpoint":"/test","operation":"test","method":"POST","url":"http://test","request":{},"response":{"status":200},"metadata":{"duration":100}}'
```

### Issue: Circuit Breaker Opened

If you see:
```
🚨 Circuit breaker OPENED - requests paused for 60s
```

**Meaning:** The extension detected 5+ consecutive failures and paused forwarding

**Fix:**
1. Check worker is running
2. Wait 60 seconds for automatic retry
3. Or reload extension to reset circuit breaker

---

## 📊 Monitoring Extension Health

### Check Extension Stats

Click the extension icon to see:
- **Enabled/Disabled** status
- **Intercept count**
- **Success rate**
- **Last intercept time**
- **Error details** (if any)

### View Raw Data

Check worker storage:
```bash
# List recent intercepts
curl http://localhost:8787/interceptor/history?limit=10

# Check specific response
curl http://localhost:8787/interceptor/response?key=raw:getBetTicker:1234567890
```

---

## 🔍 Debug Mode

The interceptor runs in debug mode by default (DEBUG = true).

To disable noisy logs:
```javascript
// In fantasy402-interceptor.js
const DEBUG = false;  // Change to false
```

Then reload the extension.

---

## 🆘 Still Having Issues?

### 1. Check Chrome Version
Minimum required: **Chrome 88+** (for Manifest v3 support)

### 2. Check Extension Console
- Right-click extension icon → **Inspect**
- Look for errors in Console tab

### 3. Check Worker Logs
```bash
# In worker terminal, look for:
# ✅ Fantasy402 data: /cloud/api/... getBetTicker
# ✅ Queued for processing
```

### 4. Verify Files Changed
```bash
# Verify manifest version
cat browser-extension/manifest.json | grep version
# Should show: "version": "1.0.8"

# Verify permissions
cat browser-extension/manifest.json | grep -A 3 permissions
# Should include: "alarms", "notifications"
```

---

## 📝 File Changes Summary

### `manifest.json` v1.0.8
- ✅ Added `"alarms"` permission
- ✅ Added `"notifications"` permission

### `background.js`
- ✅ Added defensive checks for `chrome.alarms`
- ✅ Added defensive checks for `chrome.notifications`
- ✅ Added graceful degradation when APIs unavailable
- ✅ Better error logging

### `fantasy402-interceptor.js`
- ✅ Improved error messages with troubleshooting hints
- ✅ Added response status logging
- ✅ Better worker connectivity diagnostics

---

## 🎉 Success Checklist

- [ ] Extension reloaded in Chrome
- [ ] No errors in extension console
- [ ] Worker running on `http://localhost:8787`
- [ ] Worker `/health` endpoint responds
- [ ] Fantasy402 page loads without errors
- [ ] Interceptor initialization messages appear
- [ ] API calls get forwarded successfully
- [ ] Extension popup shows stats

---

**Version:** 1.0.8  
**Date:** 2025-10-08  
**Status:** ✅ Ready for testing

