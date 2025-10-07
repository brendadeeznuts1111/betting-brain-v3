# ✅ Testing Checklist - Debug Extension

## Pre-Testing Setup
- [x] Log monitor running (PID: 34398)
- [x] Worker healthy at https://betting-brain-v3.nolarose1968-806.workers.dev
- [x] Debug extension files ready
- [x] Files organized and cleaned up
- [x] Documentation consolidated

## Step 1: Load Debug Extension in Chrome

### 1.1 Open Chrome Extensions
- [ ] Open Chrome browser
- [ ] Go to `chrome://extensions/`
- [ ] Enable "Developer mode" (toggle in top right)

### 1.2 Load Extension
- [ ] Click "Load unpacked"
- [ ] Navigate to `/Users/nolarose/ffffff/browser-extension/`
- [ ] Select the folder and click "Select"

### 1.3 Verify Extension Loaded
- [ ] Look for "BetTicker Debug Extension" in the list
- [ ] Extension shows as "Enabled"
- [ ] Note the Extension ID (e.g., `abcdefghijklmnopqrstuvwxyz123456`)

## Step 2: Test Extension on fantasy402.com

### 2.1 Open fantasy402.com
- [ ] Go to `https://fantasy402.com`
- [ ] Log in if required (this is crucial for cookies)
- [ ] Verify you're logged in successfully

### 2.2 Open Developer Tools
- [ ] Press `F12` or right-click → "Inspect"
- [ ] Go to "Console" tab
- [ ] Clear console (Ctrl+L or click clear button)

### 2.3 Look for Debug Messages
- [ ] See `🔍 DEBUG: Log Forwarder initialized`
- [ ] See `🔍 DEBUG: Content script injected successfully`
- [ ] See `🔍 DEBUG: Domain: fantasy402.com`
- [ ] See `🔍 DEBUG: URL: https://fantasy402.com/...`
- [ ] See `🔍 DEBUG: Extension ID: [your-extension-id]`
- [ ] See `🔍 DEBUG: Cookies available: [number] chars`
- [ ] See `🔍 DEBUG: Cookie names: [cookie-names]`
- [ ] See `🔍 DEBUG: Fetch interceptor installed`

## Step 3: Test Extension Functionality

### 3.1 Check Extension Injection
- [ ] Run: `console.log('Extension injected:', !!window.__debugExtension)`
- [ ] See `Extension injected: true`
- [ ] Run: `console.log('Debug info:', window.__debugExtension)`
- [ ] See debug info object with extension details

### 3.2 Test Cookie Access
- [ ] Run: `console.log('Cookies:', document.cookie)`
- [ ] See cookies string (not empty)
- [ ] Run: `console.log('Cookie count:', document.cookie.split(';').length)`
- [ ] See cookie count > 0
- [ ] Run: `console.log('Cookie names:', document.cookie.split(';').map(c => c.trim().split('=')[0]))`
- [ ] See array of cookie names

### 3.3 Test Fetch Interception
- [ ] Run: `fetch('https://fantasy402.com/test')`
- [ ] See `🔍 DEBUG: Fetch intercepted: https://fantasy402.com/test`
- [ ] See response status in console

### 3.4 Test BetTicker Request
- [ ] Run BetTicker fetch request
- [ ] See `🔍 DEBUG: Fetch intercepted: https://fantasy402.com/cloud/api/Manager/getBetTicker`
- [ ] Check response status (200 = success, 401 = auth issue)

## Step 4: Monitor Logs in Real-time

### 4.1 Terminal Monitor
- [ ] Watch terminal for worker health updates
- [ ] See `✅ Worker healthy (0ms) - Logs: [number]`
- [ ] Look for extension log entries

### 4.2 Browser Log Viewer
- [ ] Open `file:///Users/nolarose/ffffff/tools/logging/log-viewer.html`
- [ ] Click "Start Monitoring"
- [ ] See real-time log updates

### 4.3 Worker Logs
- [ ] Check worker logs at `/logs` endpoint
- [ ] Look for extension log entries
- [ ] Verify log forwarding is working

## Step 5: Authentication Testing

### 5.1 Check Cookie Forwarding
- [ ] Verify cookies are being captured by extension
- [ ] Check worker logs for cookie forwarding
- [ ] Verify worker receives cookies

### 5.2 Test Worker Authentication
- [ ] Check worker logs for cookie processing
- [ ] Look for 401 vs 200 responses
- [ ] Verify authentication flow

### 5.3 Debug Authentication Issues
- [ ] If 401 errors persist, check cookie availability
- [ ] Verify worker cookie processing
- [ ] Test with valid session

## Step 6: Expected Results

### ✅ Working Extension
```
🔍 DEBUG: Log Forwarder initialized
🔍 DEBUG: Content script injected successfully
🔍 DEBUG: Domain: fantasy402.com
🔍 DEBUG: Cookies available: 245 chars
🔍 DEBUG: Fetch interceptor installed
```

### ❌ Broken Extension
```
❌ No debug messages in console
❌ window.__debugExtension is undefined
❌ Extension not detected
```

## Step 7: Troubleshooting

### Issue 1: Extension Not Loading
- [ ] Check manifest.json syntax
- [ ] Ensure all files exist
- [ ] Verify file permissions

### Issue 2: Extension Loads But No Injection
- [ ] Check content script matches
- [ ] Verify permissions
- [ ] Check domain restrictions

### Issue 3: Extension Injects But No Cookies
- [ ] Check if logged into fantasy402.com
- [ ] Verify cookie permissions
- [ ] Check session validity

### Issue 4: Extension Works But No Log Forwarding
- [ ] Check worker endpoint
- [ ] Verify network connectivity
- [ ] Check log forwarder configuration

## Step 8: File Organization Status

### 8.1 Documentation Organized
- [x] Debug docs moved to `docs/debug/`
- [x] Implementation docs moved to `docs/implementation/`
- [x] Guides moved to `docs/guides/`
- [x] Quick access files moved to `docs/`

### 8.2 Tools Organized
- [x] Logging tools moved to `tools/logging/`
- [x] Testing tools moved to `tools/testing/`
- [x] Root directory cleaned up

### 8.3 Directory Structure
- [x] Proper directory structure created
- [x] Files moved to appropriate locations
- [x] Documentation consolidated

## Next Steps

1. **Load the debug extension** ✅ Ready
2. **Test on fantasy402.com** ⏳ Pending
3. **Check console for debug messages** ⏳ Pending
4. **Monitor logs in real-time** ✅ Ready
5. **Fix any authentication issues** ⏳ Pending
6. **Verify cookie forwarding** ⏳ Pending

## Files to Check

- `browser-extension/manifest.json` - Extension configuration
- `browser-extension/debug-content.js` - Debug content script
- `browser-extension/log-forwarder.js` - Log forwarding script
- `tools/logging/log-monitor.js` - Terminal log monitor (running)
- `tools/logging/log-viewer.html` - Browser log viewer

## Real-time Monitoring

The log monitor is running and will show:
- Worker health status
- Extension log entries
- Error messages
- Debug information

Watch the terminal for real-time updates as you test the extension.
