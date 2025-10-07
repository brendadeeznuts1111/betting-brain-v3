// BetTicker Interceptor Proxy - Background Service Worker

const WORKER_URL = 'https://betting-brain-v3.nolarose1968-806.workers.dev';
const TARGET_PATH = '/cloud/api/Manager/getBetTicker';

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('🎯 BetTicker Interceptor installed!');
  
  // Set default state
  chrome.storage.local.set({
    enabled: true,
    interceptCount: 0,
    lastIntercept: null
  });
  
  updateIcon(true);
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggle') {
    chrome.storage.local.get(['enabled'], (result) => {
      const newState = !result.enabled;
      chrome.storage.local.set({ enabled: newState });
      updateIcon(newState);
      updateRules(newState);
      sendResponse({ enabled: newState });
    });
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'getStats') {
    chrome.storage.local.get(['enabled', 'interceptCount', 'lastIntercept'], (result) => {
      sendResponse(result);
    });
    return true;
  }
  
  if (request.action === 'reset') {
    chrome.storage.local.set({ interceptCount: 0, lastIntercept: null });
    sendResponse({ success: true });
    return true;
  }
});

// Update icon based on state
function updateIcon(enabled) {
  const iconPath = enabled ? 'icon48.png' : 'icon48-disabled.png';
  chrome.action.setIcon({ path: iconPath });
  chrome.action.setBadgeText({ text: enabled ? 'ON' : 'OFF' });
  chrome.action.setBadgeBackgroundColor({ color: enabled ? '#10b981' : '#ef4444' });
}

// Update redirect rules
async function updateRules(enabled) {
  if (enabled) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [1],
      addRules: [
        {
          id: 1,
          priority: 1,
          action: {
            type: 'redirect',
            redirect: {
              regexSubstitution: WORKER_URL + TARGET_PATH + '?\\1'
            }
          },
          condition: {
            regexFilter: '^https://fantasy402\\.com/cloud/api/Manager/getBetTicker(.*)',
            resourceTypes: ['xmlhttprequest']
          }
        }
      ]
    });
    console.log('✅ Redirect rule enabled');
  } else {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [1]
    });
    console.log('❌ Redirect rule disabled');
  }
}

// Track intercepts
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    chrome.storage.local.get(['enabled', 'interceptCount'], (result) => {
      if (result.enabled && details.url.includes(WORKER_URL)) {
        const newCount = (result.interceptCount || 0) + 1;
        chrome.storage.local.set({
          interceptCount: newCount,
          lastIntercept: new Date().toISOString()
        });
        console.log(`🎯 Intercept #${newCount}: ${details.url}`);
      }
    });
  },
  { urls: [`${WORKER_URL}/*`] }
);

// Initialize rules on startup
chrome.storage.local.get(['enabled'], (result) => {
  const enabled = result.enabled !== false; // Default to true
  updateRules(enabled);
  updateIcon(enabled);
});

