// BetTicker Interceptor Proxy - Background Service Worker

const WORKER_URL = 'http://localhost:8787';
const TARGET_PATH = '/cloud/api/Manager/getBetTicker';

/* ======  Enterprise Circuit Breaker & Health Monitoring  ====== */
const ALARM_HEALTH = 'health-ping';
const STORAGE_KEY = 'cb-state';        // chrome.storage.session
const FAILURE_LIMIT = 5;               // open breaker after 5 fails
const RESET_AFTER_MS = 60_000;         // auto-try again after 1 min

// Initialize extension (combined listener)
chrome.runtime.onInstalled.addListener(() => {
  console.log('🎯 BetTicker Interceptor installed!');

  // Set default state
  chrome.storage.local.set({
    enabled: true,
    interceptCount: 0,
    lastIntercept: null
  });

  updateIcon(true);

  // Initialize health monitoring alarm (check if API exists)
  if (chrome.alarms) {
    chrome.alarms.create(ALARM_HEALTH, { delayInMinutes: 0.5, periodInMinutes: 0.5 });
    console.log('✅ Health monitoring alarm created');
  } else {
    console.warn('⚠️ chrome.alarms API not available');
  }
});

// Consolidated message handler for all extension communication

// Update icon based on state
function updateIcon(enabled) {
  // Use badge to show status (SVG icons don't support dynamic variants easily)
  chrome.action.setBadgeText({ text: enabled ? '✓' : '✗' });
  chrome.action.setBadgeBackgroundColor({ color: enabled ? '#10b981' : '#ef4444' });
}

// No declarativeNetRequest rules needed - content script handles interception
async function updateRules(enabled) {
  // Content script handles fetch interception, so we don't need DNR rules
  console.log(enabled ? '✅ Content script interception enabled' : '❌ Content script interception disabled');
  // State is stored, but actual interception happens in content.js
}

// Note: Intercept tracking now handled entirely by content.js via runtime messages
// This removes the need for webRequest permission (MV3 compliance)

// Initialize rules on startup
chrome.storage.local.get(['enabled'], (result) => {
  const enabled = result.enabled !== false; // Default to true
  updateRules(enabled);
  updateIcon(enabled);
});

/* Alarm handler: every 30s send health ping + try half-open */
// Guard against missing alarms API
if (chrome.alarms && chrome.alarms.onAlarm) {
  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name !== ALARM_HEALTH) return;

    try {
      const st = await chrome.storage.session.get(STORAGE_KEY);
      const cb = st[STORAGE_KEY] || { state: 'closed', fails: 0 };

      // Try to reset circuit breaker if it's been open long enough
      if (cb.state === 'open' && Date.now() - cb.lastOpen > RESET_AFTER_MS) {
        cb.state = 'half-open';               // allow next request through
        await chrome.storage.session.set({ [STORAGE_KEY]: cb });
        console.log('🔄 Circuit breaker entering HALF_OPEN state');
      }

      // Lightweight health call (HEAD to root)
      fetch(`${WORKER_URL}/health`)
        .then(response => {
          if (response.ok && cb.state === 'half-open') {
            closeBreaker();
          }
        })
        .catch(() => { });                      // fail silently, will count on real requests

    } catch (error) {
      console.error('❌ Health monitoring error:', error);
    }
  });
} else {
  console.warn('⚠️ Alarm listener not registered - chrome.alarms API unavailable');
}

/* Helper: close breaker & notify */
async function closeBreaker() {
  await chrome.storage.session.set({ [STORAGE_KEY]: { state: 'closed', fails: 0 } });
  console.log('✅ Circuit breaker CLOSED - requests allowed');
}

/* Helper: open breaker & notify once */
async function openBreaker() {
  const st = await chrome.storage.session.get(STORAGE_KEY);
  const cb = st[STORAGE_KEY] || { state: 'closed', fails: 0 };

  if (cb.state !== 'open') {
    cb.state = 'open';
    cb.lastOpen = Date.now();
    await chrome.storage.session.set({ [STORAGE_KEY]: cb });

    console.log('🚨 Circuit breaker OPENED - requests paused for 60s');

    // Show OS notification (if available)
    if (chrome.notifications) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.svg',
        title: 'BetTicker Proxy',
        message: 'Circuit-breaker is OPEN – requests paused 60 s'
      });
    } else {
      console.log('🚨 Circuit breaker OPENED (notifications unavailable)');
    }
  }
}

/* Enhanced message handler for circuit breaker integration */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle existing messages
  if (request.action === 'toggle') {
    chrome.storage.local.get(['enabled'], (result) => {
      const newState = !result.enabled;
      chrome.storage.local.set({ enabled: newState });
      updateIcon(newState);
      updateRules(newState);
      sendResponse({ enabled: newState });
    });
    return true;
  }

  if (request.action === 'getStats') {
    chrome.storage.local.get([
      'enabled',
      'interceptCount',
      'successCount',
      'failureCount',
      'fallbackCount',
      'lastIntercept',
      'lastError'
    ], (result) => {
      const successRate = result.interceptCount > 0
        ? ((result.successCount || 0) / result.interceptCount * 100).toFixed(1)
        : 0;
      sendResponse({
        ...result,
        successRate
      });
    });
    return true;
  }

  if (request.action === 'reset') {
    chrome.storage.local.set({
      interceptCount: 0,
      successCount: 0,
      failureCount: 0,
      fallbackCount: 0,
      lastIntercept: null,
      lastError: null
    });
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'interceptSuccess') {
    chrome.storage.local.get(['successCount', 'interceptCount'], (result) => {
      const newCount = (result.interceptCount || 0) + 1;
      chrome.storage.local.set({
        interceptCount: newCount,
        successCount: (result.successCount || 0) + 1,
        lastIntercept: new Date().toISOString()
      });
      console.log(`✅ Intercept #${newCount} succeeded`);
    });
    sendResponse({ received: true });
    return true;
  }

  if (request.action === 'interceptFailed') {
    chrome.storage.local.get(['failureCount', 'fallbackCount', 'interceptCount'], (result) => {
      const newCount = (result.interceptCount || 0) + 1;
      chrome.storage.local.set({
        interceptCount: newCount,
        failureCount: (result.failureCount || 0) + 1,
        fallbackCount: request.fallback ? (result.fallbackCount || 0) + 1 : result.fallbackCount,
        lastError: {
          time: new Date().toISOString(),
          error: request.error
        }
      });
      console.error(`❌ Intercept #${newCount} failed:`, request.error);
    });
    sendResponse({ received: true });
    return true;
  }

  // Handle circuit breaker messages
  if (request.type === 'fetch-fail') {
    (async () => {
      try {
        const st = await chrome.storage.session.get(STORAGE_KEY);
        const cb = st[STORAGE_KEY] || { state: 'closed', fails: 0 };
        cb.fails = (cb.fails || 0) + 1;

        if (cb.fails >= FAILURE_LIMIT && cb.state === 'closed') {
          await openBreaker();
        } else {
          await chrome.storage.session.set({ [STORAGE_KEY]: cb });
        }
        sendResponse({ ok: true });
      } catch (error) {
        console.error('❌ Circuit breaker error:', error);
        sendResponse({ ok: false, error: error.message });
      }
    })();
    return true;
  }

  if (request.type === 'fetch-success') {
    (async () => {
      try {
        const st = await chrome.storage.session.get(STORAGE_KEY);
        const cb = st[STORAGE_KEY] || { state: 'closed', fails: 0 };

        if (cb.state === 'half-open') {
          await closeBreaker();
        } else if (cb.fails > 0) {
          cb.fails = Math.max(0, cb.fails - 1); // Gradually reduce failure count
          await chrome.storage.session.set({ [STORAGE_KEY]: cb });
        }

        sendResponse({ ok: true });
      } catch (error) {
        console.error('❌ Circuit breaker success handler error:', error);
        sendResponse({ ok: false, error: error.message });
      }
    })();
    return true;
  }

  if (request.action === 'circuitBreakerOpened') {
    console.log('🚨 Circuit breaker opened from content script:', request.error);
    sendResponse({ received: true });
    return true;
  }

  // Handle data forwarding to worker (bypasses CORS from content script)
  if (request.action === 'forwardToWorker') {
    (async () => {
      try {
        const { data, workerUrl } = request;

        // POST to worker from background context (has network privileges)
        const response = await fetch(`${workerUrl}/api/fantasy402/ingest`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (response.ok) {
          sendResponse({
            success: true,
            status: response.status
          });
        } else {
          const errorText = await response.text();
          sendResponse({
            success: false,
            status: response.status,
            error: errorText || response.statusText
          });
        }
      } catch (error) {
        console.error('❌ Failed to forward to worker:', error);
        sendResponse({
          success: false,
          error: error.message
        });
      }
    })();
    return true; // Required for async sendResponse
  }
});

