/**
 * Extension Health Monitor
 * Ensures extension stays alive and worker connection is healthy
 */

const HEALTH_CHECK_INTERVAL = 1; // minutes
const WORKER_PING_INTERVAL = 5; // minutes
const WORKER_URL = 'http://localhost:8787'; // Update for production

// Create alarms on extension install/update
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Health Monitor] Extension installed/updated - setting up health checks');

  // Health check every minute
  chrome.alarms.create('healthCheck', { periodInMinutes: HEALTH_CHECK_INTERVAL });

  // Keep worker connection alive every 5 minutes
  chrome.alarms.create('workerPing', { periodInMinutes: WORKER_PING_INTERVAL });

  // Save install timestamp
  chrome.storage.local.set({
    extension_installed_at: Date.now(),
    extension_version: chrome.runtime.getManifest().version,
    last_startup: Date.now()
  });
});

// Handle alarms
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'healthCheck') {
    await performHealthCheck();
  } else if (alarm.name === 'workerPing') {
    await pingWorker();
  }
});

/**
 * Perform comprehensive health check
 */
async function performHealthCheck() {
  const health = {
    timestamp: Date.now(),
    extension_active: true,
    worker_status: 'unknown',
    storage_available: true,
    last_capture: null
  };

  try {
    // Check worker connectivity
    const workerResponse = await fetch(`${WORKER_URL}/health`, {
      signal: AbortSignal.timeout(5000) // 5s timeout
    });

    if (workerResponse.ok) {
      const workerHealth = await workerResponse.json();
      health.worker_status = 'online';
      health.worker_version = workerHealth.version;
      health.worker_uptime = workerHealth.uptime;
    } else {
      health.worker_status = 'error';
      health.worker_error = `HTTP ${workerResponse.status}`;
    }
  } catch (error) {
    health.worker_status = 'offline';
    health.worker_error = error.message;
  }

  // Check storage availability
  try {
    await chrome.storage.local.get(['last_capture']);
    const { last_capture } = await chrome.storage.local.get(['last_capture']);
    health.last_capture = last_capture;
  } catch (error) {
    health.storage_available = false;
    health.storage_error = error.message;
  }

  // Save health status
  await chrome.storage.local.set({
    health_status: health,
    last_health_check: Date.now()
  });

  // Notify if worker is down
  if (health.worker_status === 'offline' || health.worker_status === 'error') {
    console.warn('[Health Monitor] Worker is down:', health.worker_error);

    // Show notification (throttled - once per hour)
    const { last_notification } = await chrome.storage.local.get(['last_notification']);
    const oneHourAgo = Date.now() - (60 * 60 * 1000);

    if (!last_notification || last_notification < oneHourAgo) {
      chrome.notifications.create('worker-down', {
        type: 'basic',
        iconUrl: 'icon.svg',
        title: 'Fantasy402 Capture - Worker Offline',
        message: 'Cloudflare Worker is not responding. Data is being backed up locally.',
        priority: 1,
        requireInteraction: false
      });

      await chrome.storage.local.set({ last_notification: Date.now() });
    }
  }

  return health;
}

/**
 * Ping worker to keep connection alive
 */
async function pingWorker() {
  try {
    const response = await fetch(`${WORKER_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });

    if (response.ok) {
      console.log('[Health Monitor] Worker ping successful');

      await chrome.storage.local.set({
        last_worker_ping: Date.now(),
        worker_alive: true
      });
    }
  } catch (error) {
    console.error('[Health Monitor] Worker ping failed:', error.message);

    await chrome.storage.local.set({
      last_worker_ping: Date.now(),
      worker_alive: false,
      last_ping_error: error.message
    });
  }
}

/**
 * Get current health status
 */
async function getHealthStatus() {
  const {
    health_status,
    last_health_check,
    extension_installed_at,
    extension_version
  } = await chrome.storage.local.get([
    'health_status',
    'last_health_check',
    'extension_installed_at',
    'extension_version'
  ]);

  return {
    ...health_status,
    last_health_check,
    extension_installed_at,
    extension_version,
    uptime: Date.now() - (extension_installed_at || Date.now())
  };
}

// Export for popup
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getHealthStatus, performHealthCheck };
}
