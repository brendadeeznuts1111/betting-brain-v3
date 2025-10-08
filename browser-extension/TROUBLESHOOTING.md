# 🔧 Fantasy402 Extension Troubleshooting

## ✅ Quick Fix: Extension Won't Load

### Problem
```
Failed to load extension
Error: Required value 'version' is missing or invalid.
```

### Solution
**Fixed!** The manifest.json has been updated with a valid version format (`1.0.2` instead of `1.0.1-debug`).

**Steps to reload:**
1. Go to `chrome://extensions/`
2. Click "Remove" on the old extension
3. Click "Load unpacked"
4. Select: `/Users/nolarose/ffffff/browser-extension/`
5. ✅ Extension should load successfully!

---

## 🎯 What the Extension Does

The Fantasy402 extension **intercepts and forwards** API calls. It does **NOT proxy** them.

### Correct Flow
```
Fantasy402.com → API Call → Extension Intercepts
    ↓
Extension forwards data to: /api/fantasy402/ingest
    ↓
Original API call completes → Returns response to page
```

### Incorrect Flow (Don't do this!)
```
❌ Fantasy402.com → Try to call Worker directly
   → https://betting-brain-v3.nolarose1968-806.workers.dev/cloud/api/Manager/getBetTicker
   → 401 Unauthorized + CORS errors
```

---

## 🚨 Console Errors Explained

If you see these errors:
```
Access to fetch at 'https://betting-brain-v3.nolarose1968-806.workers.dev/cloud/api/Manager/getBetTicker'
from origin 'https://fantasy402.com' has been blocked by CORS policy
```

**This means:**
- You're running test code in the console (VM scripts)
- The test code is trying to proxy through the worker
- This is NOT how the extension works

**Solution:**
- Don't run test code that tries to call the worker URL
- Let the extension intercept naturally
- Just use fantasy402.com normally

---

## ✅ How to Verify It's Working

### Step 1: Load the Extension
```bash
# Open Chrome
chrome://extensions/

# Enable Developer Mode (top right)
# Click "Load unpacked"
# Select: /Users/nolarose/ffffff/browser-extension/
```

### Step 2: Open Console (F12)
You should see:
```
[Fantasy402] 🚀 Interceptor initialized
[Fantasy402] 📡 Worker URL: https://betting-brain-v3.nolarose1968-806.workers.dev
[Fantasy402] 🎯 Monitoring endpoints: ['/cloud/api/System/authenticateCustomer', ...]
```

### Step 3: Visit Fantasy402.com
```
https://fantasy402.com/manager.html
```

### Step 4: Login
```
Username: BILLY666
(your password)
```

### Step 5: Watch Console
When you navigate, you should see:
```
[Fantasy402] 🔍 Intercepting: /cloud/api/Manager/getAgentPerformance
[Fantasy402] ✅ Forwarded to worker: getAgentPerformance
```

### Step 6: Check Worker Logs
```bash
wrangler tail --env=""
```

You should see:
```
[xxxxx] 📥 Fantasy402 data: /cloud/api/Manager/getAgentPerformance, getAgentPerformance
[xxxxx] 📊 Processing agent performance for: BILLY666
[xxxxx] ✅ Stored performance in D1
```

---

## 🧪 Test Page

Open the test page:
```
file:///Users/nolarose/ffffff/browser-extension/test-fantasy402.html
```

Click "Check Extension" to verify it's loaded.

**Note:** For real testing, you MUST be on fantasy402.com.

---

## 🐛 Common Issues

### Issue 1: No console messages
**Cause:** Extension not loaded  
**Fix:** Reload extension at chrome://extensions/

### Issue 2: CORS errors to worker URL
**Cause:** Running test code that proxies through worker  
**Fix:** Don't run test code. Let extension work naturally.

### Issue 3: 401 errors
**Cause:** Not logged in to fantasy402.com  
**Fix:** Login first, then navigate

### Issue 4: No data captured
**Cause:** Haven't triggered any API calls  
**Fix:** Navigate around fantasy402.com to trigger API calls

### Issue 5: "VM170" scripts in console
**Cause:** Injected test scripts  
**Fix:** Reload the page without running test scripts

---

## 📊 Monitor Data Flow

### 1. Browser Console (F12)
```javascript
// Check interceptor status
console.log('[Fantasy402] Interceptor active:', 
    window.fetch.toString().includes('fantasy402'));
```

### 2. Worker Logs
```bash
# Real-time logs
wrangler tail --env=""
```

### 3. Database Queries
```bash
# Check captured data
wrangler d1 execute fantasy42-raw-feed --remote --command="
SELECT COUNT(*) as count, operation 
FROM fantasy402_raw_feed 
GROUP BY operation 
ORDER BY count DESC
LIMIT 10
"
```

### 4. KV Storage
```bash
# List captured packets
wrangler kv key list --namespace-id=e8ea80789b5246e58ea95798f04d0047 --prefix="fantasy402:"
```

---

## 🎯 Expected Behavior

### When Working Correctly

1. **Extension loads** without errors
2. **Console shows** initialization messages
3. **API calls are intercepted** transparently
4. **Data is forwarded** to worker (background)
5. **Original API works** normally
6. **Worker logs show** incoming data
7. **Database stores** captured data

### When NOT Working

1. ❌ Extension fails to load (version error)
2. ❌ No console messages
3. ❌ CORS errors to worker URL
4. ❌ 401 errors
5. ❌ API calls fail

---

## 🔍 Debug Checklist

- [ ] Extension loaded at chrome://extensions/
- [ ] No errors in extension console
- [ ] On fantasy402.com domain
- [ ] Logged in to fantasy402.com
- [ ] Console shows "[Fantasy402] 🚀 Interceptor initialized"
- [ ] API calls are being made (navigate around)
- [ ] Console shows "[Fantasy402] 🔍 Intercepting: ..."
- [ ] Console shows "[Fantasy402] ✅ Forwarded to worker"
- [ ] Worker logs show incoming data
- [ ] Database has captured data

---

## 🚀 Success!

If you see this, it's working:

### Browser Console
```
[Fantasy402] 🚀 Interceptor initialized
[Fantasy402] 📡 Worker URL: https://betting-brain-v3.nolarose1968-806.workers.dev
[Fantasy402] 🔍 Intercepting: /cloud/api/Manager/getAgentPerformance
[Fantasy402] ✅ Forwarded to worker: getAgentPerformance
```

### Worker Logs
```
[mghjwcvn] 📥 Fantasy402 data: /cloud/api/Manager/getAgentPerformance, getAgentPerformance
[mghjwcvn] 📊 Processing agent performance for: BILLY666 (NOLAWOLF)
[mghjwcvn] 💰 Risk: $1,234,567, Win: $987,654, Net: $-246,913
[mghjwcvn] ✅ Stored performance in D1
[mghjwcvn] ✅ Stored 2 sport breakdown records
```

### Database Query
```bash
wrangler d1 execute fantasy42-raw-feed --remote --command="
SELECT * FROM fantasy402_agent_performance ORDER BY captured_at DESC LIMIT 1
"
```

Should return your captured data! 🎉

---

## 📞 Still Having Issues?

1. **Reload the extension:** chrome://extensions/ → Click reload icon
2. **Hard refresh the page:** Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
3. **Clear console and try again:** Cmd+K (Mac) or Ctrl+L (Windows)
4. **Check worker is deployed:** `curl https://betting-brain-v3.nolarose1968-806.workers.dev/health`
5. **Check worker logs:** `wrangler tail --env=""`

---

**Last Updated:** 2025-10-08  
**Extension Version:** 1.0.2

