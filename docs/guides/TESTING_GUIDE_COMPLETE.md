# 🧪 Complete Testing Guide - Debug Extension

## Current Status
✅ Log monitor running (PID: 34398)  
✅ Worker healthy at https://betting-brain-v3.nolarose1968-806.workers.dev  
✅ Debug extension files ready  
⏳ Ready for testing  

## Step 1: Load Debug Extension in Chrome

### 1.1 Open Chrome Extensions
1. Open Chrome browser
2. Go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)

### 1.2 Load Extension
1. Click "Load unpacked"
2. Navigate to `/Users/nolarose/ffffff/browser-extension/`
3. Select the folder and click "Select"

### 1.3 Verify Extension Loaded
- Look for "BetTicker Debug Extension" in the list
- Extension should show as "Enabled"
- Note the Extension ID (e.g., `abcdefghijklmnopqrstuvwxyz123456`)

## Step 2: Test Extension on fantasy402.com

### 2.1 Open fantasy402.com
1. Go to `https://fantasy402.com`
2. Log in if required (this is crucial for cookies)

### 2.2 Open Developer Tools
1. Press `F12` or right-click → "Inspect"
2. Go to "Console" tab
3. Clear console (Ctrl+L or click clear button)

### 2.3 Look for Debug Messages
You should see messages starting with `🔍 DEBUG:`:
```
🔍 DEBUG: Log Forwarder initialized
🔍 DEBUG: Content script injected successfully
🔍 DEBUG: Domain: fantasy402.com
🔍 DEBUG: URL: https://fantasy402.com/...
🔍 DEBUG: Extension ID: abcdefghijklmnopqrstuvwxyz123456
🔍 DEBUG: Cookies available: 245 chars
🔍 DEBUG: Cookie names: sessionid, csrftoken, auth_token
🔍 DEBUG: Fetch interceptor installed
```

## Step 3: Test Extension Functionality

### 3.1 Check Extension Injection
Run in console on fantasy402.com:
```javascript
// Check if extension injected
console.log('Extension injected:', !!window.__debugExtension);
if (window.__debugExtension) {
  console.log('Debug info:', window.__debugExtension);
}
```

### 3.2 Test Cookie Access
```javascript
// Test cookie access
console.log('Cookies:', document.cookie);
console.log('Cookie count:', document.cookie.split(';').length);
console.log('Cookie names:', document.cookie.split(';').map(c => c.trim().split('=')[0]));
```

### 3.3 Test Fetch Interception
```javascript
// Test if fetch is intercepted
fetch('https://fantasy402.com/test')
  .then(response => console.log('Fetch test response:', response.status))
  .catch(error => console.log('Fetch test error:', error));
```

### 3.4 Test BetTicker Request
```javascript
// Test actual BetTicker request
fetch('https://fantasy402.com/cloud/api/Manager/getBetTicker', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  body: 'agent=&level=0&ticket=&customer=&daterange=01%2F01%2F1970+-+12%2F31%2F2026&show=&limit=200&offset=0'
})
.then(response => console.log('BetTicker response:', response.status))
.catch(error => console.log('BetTicker error:', error));
```

## Step 4: Monitor Logs in Real-time

### 4.1 Terminal Monitor
- Log monitor is already running
- Watch terminal for worker health updates
- Logs will appear when extension sends them

### 4.2 Browser Log Viewer
1. Open `file:///Users/nolarose/ffffff/log-viewer.html`
2. Click "Start Monitoring"
3. Watch for real-time log updates

### 4.3 Worker Logs
- Check worker logs at `https://betting-brain-v3.nolarose1968-806.workers.dev/logs`
- Look for extension log entries

## Step 5: Expected Results

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

## Step 6: Troubleshooting

### Issue 1: Extension Not Loading
- **Symptom**: Extension doesn't appear in chrome://extensions/
- **Fix**: Check manifest.json syntax, ensure all files exist

### Issue 2: Extension Loads But No Injection
- **Symptom**: Extension shows enabled but no console messages
- **Fix**: Check content script matches, permissions, domain restrictions

### Issue 3: Extension Injects But No Cookies
- **Symptom**: Debug messages appear but no cookies detected
- **Fix**: Check if logged into fantasy402.com, cookie permissions

### Issue 4: Extension Works But No Log Forwarding
- **Symptom**: Console messages appear but no logs in monitor
- **Fix**: Check worker endpoint, network connectivity

## Step 7: Authentication Testing

### 7.1 Check Cookie Forwarding
1. Ensure you're logged into fantasy402.com
2. Check console for cookie information
3. Verify cookies are being captured

### 7.2 Test Worker Authentication
1. Check worker logs for cookie forwarding
2. Verify worker receives cookies
3. Check for 401 vs 200 responses

### 7.3 Debug Authentication Issues
If 401 errors persist:
1. Check cookie availability
2. Verify worker cookie processing
3. Test with valid session

## Step 8: File Organization

### 8.1 Move Untracked Files
```bash
# Move debug files to proper locations
mv DEBUG_*.md docs/debug/
mv IMPLEMENTATION_REVIEW.md docs/
mv TESTING_GUIDE_COMPLETE.md docs/
```

### 8.2 Consolidate Documentation
```bash
# Organize documentation
mkdir -p docs/debug
mkdir -p docs/guides
mkdir -p docs/tools
```

### 8.3 Clean Root Directory
```bash
# Remove temporary files
rm -f test-extension.html
rm -f log-monitor.js
rm -f log-viewer.html
```

## Next Steps

1. **Load the debug extension**
2. **Test on fantasy402.com**
3. **Check console for debug messages**
4. **Monitor logs in real-time**
5. **Fix any authentication issues**
6. **Organize files and documentation**

## Files to Check

- `browser-extension/manifest.json` - Extension configuration
- `browser-extension/debug-content.js` - Debug content script
- `browser-extension/log-forwarder.js` - Log forwarding script
- `log-monitor.js` - Terminal log monitor (running)
- `log-viewer.html` - Browser log viewer

## Real-time Monitoring

The log monitor is running and will show:
- Worker health status
- Extension log entries
- Error messages
- Debug information

Watch the terminal for real-time updates as you test the extension.
