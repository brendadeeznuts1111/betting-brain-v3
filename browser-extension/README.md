# 🎯 BetTicker Interceptor Browser Extension

Automatically proxies `getBetTicker` API requests through your Cloudflare Worker for real-time analytics.

## 🚀 Installation

### Chrome/Edge/Brave

1. Open browser and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select the `browser-extension` folder
5. The extension icon 🎯 will appear in your toolbar!

### Firefox

1. Go to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `manifest.json` from the `browser-extension` folder
4. Extension will be active until browser restart

## 📊 Usage

1. **Click the extension icon** to open the popup
2. **Status shows** if interceptor is active
3. **Intercepts counter** tracks how many requests were captured
4. **Toggle button** enables/disables interception
5. **Open Dashboard** button launches analytics

## 🎯 Features

- ✅ **Automatic Proxy**: All `getBetTicker` requests automatically route through worker
- ✅ **Zero Configuration**: Works immediately after installation
- ✅ **Toggle On/Off**: Disable when not needed
- ✅ **Live Counter**: See intercepts in real-time
- ✅ **One-Click Dashboard**: Quick access to analytics

## 🔍 How It Works

The extension uses Chrome's `declarativeNetRequest` API to redirect requests:

```
fantasy402.com/cloud/api/Manager/getBetTicker
  ↓ (automatically redirected to)
betting-brain-v3.nolarose1968-806.workers.dev/cloud/api/Manager/getBetTicker
```

Your worker then:
1. Forwards request to fantasy402.com
2. Stores response in KV
3. Returns original response (zero impact!)

## 🛠️ Permissions

- `declarativeNetRequest`: Redirect API requests
- `storage`: Save intercept counter
- `fantasy402.com`: Source domain
- `betting-brain-v3.nolarose1968-806.workers.dev`: Worker domain

## 📝 Notes

- Extension only intercepts `getBetTicker` endpoint
- All other fantasy402.com traffic is unaffected
- Dashboard must be accessed via localhost (http://localhost:8888)
- Worker logs available via `wrangler tail`

## 🎨 Icons

Place these icon files in the `browser-extension` folder:
- `icon16.png` (16x16px)
- `icon48.png` (48x48px)
- `icon128.png` (128x128px)

Or use any emoji-to-PNG converter with 🎯 emoji.

## 🔧 Troubleshooting

**Extension not intercepting?**
1. Check extension is enabled in `chrome://extensions/`
2. Click extension icon and ensure status shows "Active"
3. Refresh fantasy402.com page
4. Check browser console for redirect errors

**Counter not updating?**
1. Popup auto-refreshes every 2 seconds
2. Close and reopen popup to force refresh
3. Check worker logs: `wrangler tail --env-file=/dev/null`

**Need to disable temporarily?**
- Click extension icon → "Disable Interceptor"
- Or disable extension in `chrome://extensions/`

## 📊 Analytics

View captured data at:
- **Dashboard**: http://localhost:8888/dashboard-enhanced.html
- **Raw Data**: https://betting-brain-v3.nolarose1968-806.workers.dev/interceptor/history

## 🎉 Pro Tips

- Keep extension enabled during betting sessions for continuous capture
- Check dashboard periodically for insights
- Export data regularly (CSV/JSON) for offline analysis
- Configure alerts for high-roller activity
- Use hourly patterns to identify peak betting times

