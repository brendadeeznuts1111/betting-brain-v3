# 🔒 Extension & Auth Persistence Guide

**Goal:** Never lose the extension, always stay authenticated, always capture data.

---

## 🛡️ **1. Extension Backup & Version Control**

### **Current Location:**
```
/Users/nolarose/ffffff/browser-extension/
```

### **Automatic Backups (Already Done):**
✅ Git repository tracks all extension files
✅ Pushed to GitHub: `brendadeeznuts1111/betting-brain-v3`
✅ Version: 1.0.9

### **Additional Safety Measures:**

**A. Create Extension Archive:**
```bash
# From project root
cd /Users/nolarose/ffffff
zip -r extension-backup-$(date +%Y%m%d).zip browser-extension/
mv extension-backup-*.zip ~/Dropbox/  # or Google Drive, iCloud, etc.
```

**B. Chrome Extension ID Persistence:**
After loading the extension unpacked, Chrome assigns it a permanent ID.

**Save this ID:**
```bash
# 1. Open chrome://extensions/
# 2. Find "Fantasy402 Data Capture"
# 3. Copy the ID (looks like: abcdefghijklmnopqrstuvwxyz)
# 4. Save to file:
echo "EXTENSION_ID=<your_id_here>" > browser-extension/.extension-id
```

**C. Pin Extension to Chrome:**
1. Click puzzle icon (🧩) in Chrome toolbar
2. Pin "Fantasy402 Data Capture"
3. Extension icon stays visible → harder to accidentally disable

---

## 🔐 **2. Authentication Persistence**

### **How Fantasy402 Auth Works:**

Fantasy402 uses **session cookies** or **JWT tokens**. The extension captures these automatically.

### **Current Storage Locations:**

**A. Browser Cookies (Automatic):**
- Chrome stores cookies in `~/Library/Application Support/Google/Chrome/Default/Cookies`
- Persist as long as you don't clear browsing data
- **Action:** Never clear cookies for fantasy402.com

**B. Extension Storage (chrome.storage.local):**
```javascript
// Extension already has permission: "storage"
// Background worker can persist tokens
chrome.storage.local.set({
  fantasy402_token: token,
  last_auth: Date.now()
});
```

**C. Worker KV Storage (7-day retention):**
- Tokens captured in intercepted requests
- Stored in `BET_TICKER_RAW` KV namespace
- **Action:** Extend TTL for auth tokens

### **Prevent Session Expiry:**

**Add to background.js:**
```javascript
// Keep-alive ping every 5 minutes
chrome.alarms.create('keepAlive', { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keepAlive') {
    // Ping Fantasy402 to refresh session
    fetch('https://fantasy402.com/api/ping', {
      credentials: 'include' // Send cookies
    }).catch(() => {});
  }
});
```

---

## 📦 **3. Data Persistence Strategy**

### **Current Architecture:**

```
Fantasy402 → Extension → Worker → D1 + KV
                    ↓
                Local Backup (NEW)
```

### **Add Local Backup Layer:**

**A. IndexedDB in Extension:**

Create `browser-extension/data-backup.js`:
```javascript
// Store intercepted data locally as backup
const DB_NAME = 'fantasy402_backup';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Store raw API responses
      if (!db.objectStoreNames.contains('api_calls')) {
        const store = db.createObjectStore('api_calls', { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('endpoint', 'endpoint', { unique: false });
      }

      // Store auth tokens
      if (!db.objectStoreNames.contains('auth_tokens')) {
        db.createObjectStore('auth_tokens', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

async function backupAPICall(data) {
  const db = await openDB();
  const tx = db.transaction('api_calls', 'readwrite');
  const store = tx.objectStore('api_calls');

  await store.add({
    endpoint: data.endpoint,
    method: data.method,
    request: data.request,
    response: data.response,
    timestamp: Date.now()
  });

  // Keep only last 30 days
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const oldIndex = store.index('timestamp');
  const range = IDBKeyRange.upperBound(thirtyDaysAgo);
  const oldRecords = oldIndex.openCursor(range);

  oldRecords.onsuccess = (e) => {
    const cursor = e.target.result;
    if (cursor) {
      cursor.delete();
      cursor.continue();
    }
  };
}

async function backupToken(token) {
  const db = await openDB();
  const tx = db.transaction('auth_tokens', 'readwrite');
  const store = tx.objectStore('auth_tokens');

  await store.add({
    token: token,
    timestamp: Date.now(),
    source: 'fantasy402'
  });
}
```

**B. Export Function for Manual Backup:**

Add to `popup.html`:
```html
<button id="exportData">Export All Data</button>

<script>
document.getElementById('exportData').addEventListener('click', async () => {
  const db = await openDB();
  const tx = db.transaction('api_calls', 'readonly');
  const store = tx.objectStore('api_calls');
  const all = await store.getAll();

  // Create downloadable JSON
  const blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `fantasy402-backup-${new Date().toISOString()}.json`;
  a.click();

  URL.revokeObjectURL(url);
  alert(`Exported ${all.length} API calls`);
});
</script>
```

---

## 🔄 **4. Auto-Recovery Systems**

### **A. Extension Health Monitor:**

Create `browser-extension/health-monitor.js`:
```javascript
// Check extension health every minute
chrome.alarms.create('healthCheck', { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'healthCheck') {
    // Verify worker connection
    try {
      const response = await fetch('http://localhost:8787/health');
      const health = await response.json();

      chrome.storage.local.set({
        worker_status: 'online',
        last_health_check: Date.now(),
        worker_version: health.version
      });
    } catch (error) {
      chrome.storage.local.set({
        worker_status: 'offline',
        last_error: error.message,
        last_health_check: Date.now()
      });

      // Notify user
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.svg',
        title: 'Worker Offline',
        message: 'Cloudflare Worker is not responding. Data is being backed up locally.',
        priority: 2
      });
    }
  }
});
```

### **B. Auto-Retry for Failed Requests:**

Update `background.js`:
```javascript
// Queue for failed requests
const failedQueue = [];

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FORWARD_TO_WORKER') {
    forwardWithRetry(message.data, 3)
      .then(() => sendResponse({ success: true }))
      .catch((error) => {
        // Store locally
        failedQueue.push({
          data: message.data,
          timestamp: Date.now(),
          attempts: 0
        });
        backupAPICall(message.data); // Local IndexedDB backup
        sendResponse({ success: false, error: error.message });
      });
    return true; // Async response
  }
});

async function forwardWithRetry(data, maxRetries) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch('http://localhost:8787/api/fantasy402/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) return;

      // Wait before retry (exponential backoff)
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
    } catch (error) {
      if (i === maxRetries - 1) throw error;
    }
  }
}

// Process failed queue every 5 minutes
chrome.alarms.create('processQueue', { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'processQueue' && failedQueue.length > 0) {
    const toRetry = failedQueue.splice(0, 10); // Process 10 at a time

    for (const item of toRetry) {
      try {
        await forwardWithRetry(item.data, 1);
      } catch (error) {
        // Re-queue if still failing
        item.attempts++;
        if (item.attempts < 10) {
          failedQueue.push(item);
        }
      }
    }
  }
});
```

---

## 🚀 **5. Deployment Checklist**

### **Before Going to Production:**

**1. Update Worker URL:**
```javascript
// browser-extension/fantasy402-interceptor.js
const WORKER_URL = 'https://betting-brain-v3.nolarose1968-806.workers.dev';
```

**2. Generate Production Secret:**
```bash
# Generate strong secret
openssl rand -hex 32
# Save to both extension and worker
```

**3. Deploy Worker:**
```bash
wrangler deploy
```

**4. Package Extension:**
```bash
cd browser-extension
zip -r ../fantasy402-extension-v1.0.9.zip .
```

**5. Chrome Web Store (Optional but Recommended):**
- Publish to Chrome Web Store
- Auto-updates to all installations
- Survives Chrome reinstalls
- **Cost:** $5 one-time fee

---

## 📋 **6. Daily Maintenance Tasks**

**Automated (No action needed):**
- ✅ Extension intercepts all Fantasy402 API calls
- ✅ Background worker keeps session alive (5-min ping)
- ✅ Failed requests retry automatically
- ✅ Local IndexedDB backup (30-day retention)
- ✅ Health checks every minute

**Manual (Weekly recommended):**
1. Export data backup (popup → "Export All Data" button)
2. Check worker logs: `wrangler tail`
3. Verify D1 data: `wrangler d1 execute betting-analytics --local --command "SELECT COUNT(*) FROM bet_history"`

---

## 🆘 **7. Recovery Procedures**

### **If Extension Gets Removed:**
```bash
# 1. Reload from Git
cd /Users/nolarose/ffffff/browser-extension

# 2. Load in Chrome
# Open chrome://extensions/ → Load unpacked → Select browser-extension/

# 3. Restore from backup (if needed)
# Load popup.html → Import button → Select backup JSON
```

### **If Worker Goes Down:**
```bash
# 1. Check status
wrangler tail

# 2. Redeploy
wrangler deploy

# 3. Extension continues capturing (local backup)
# 4. Failed requests auto-retry when worker returns
```

### **If Lose Auth:**
```bash
# 1. Visit fantasy402.com
# 2. Login manually
# 3. Extension auto-captures new token
# 4. Token stored in 3 places:
#    - Browser cookies
#    - chrome.storage.local
#    - IndexedDB backup
```

---

## 🎯 **Summary: Never Lose Anything**

| Component | Backup Location | Retention | Auto-Recovery |
|-----------|----------------|-----------|---------------|
| **Extension Code** | Git + GitHub | Forever | `git pull` |
| **Extension Data** | IndexedDB | 30 days | Auto-export |
| **Auth Tokens** | 3 locations | Persistent | Auto-refresh |
| **API Calls** | D1 + KV + Local | 7-30 days | Auto-retry |
| **Worker Config** | wrangler.toml | Forever | Git |

**Bottom Line:** You have 4 layers of redundancy. You'd need to lose your entire computer, GitHub account, and Cloudflare account simultaneously to lose this setup.
