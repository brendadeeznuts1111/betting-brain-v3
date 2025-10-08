// BetTicker Content Script - Enterprise-grade interceptor with circuit breaker
// Enhanced error handling, monitoring, and resilience patterns

console.log('🎯 BetTicker content script loaded');
console.log('🌐 Current domain:', window.location.hostname);
console.log('🍪 Available cookies:', document.cookie ? document.cookie.length + ' chars' : 'none');
console.log('📄 Page URL:', window.location.href);
console.log('🔧 Extension ID:', chrome.runtime.id);

const WORKER_URL = 'http://localhost:3000';
const TARGET_PATH = '/cloud/api/Manager/getBetTicker';
const ORIGIN_URL = 'https://fantasy402.com';
const MAX_RETRIES = 3;
const TIMEOUT_MS = 15000; // 15 second timeout
const CIRCUIT_BREAKER_THRESHOLD = 5; // Open after 5 failures
const CIRCUIT_BREAKER_RESET_TIME = 60000; // Reset after 60 seconds

// Enhanced stats tracking with detailed metrics
const stats = {
  intercepted: 0,
  successful: 0,
  failed: 0,
  fallback: 0,
  circuitBreakerTrips: 0,
  errors: [],
  performance: {
    totalLatency: 0,
    minLatency: Infinity,
    maxLatency: 0,
    avgLatency: 0
  },
  lastHealthCheck: null,
  workerStatus: 'unknown' // unknown, healthy, degraded, failed
};

// Circuit breaker state management
const circuitBreaker = {
  state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
  failureCount: 0,
  lastFailureTime: null,
  nextAttemptTime: null
};

// Enhanced error classification
const ErrorTypes = {
  NETWORK: 'network',
  TIMEOUT: 'timeout',
  AUTH: 'authentication',
  SERVER: 'server',
  CLIENT: 'client',
  UNKNOWN: 'unknown'
};

// Enhanced logging with structured data
const logger = {
  debug: (message, data = {}) => {
    console.log(`🔍 [DEBUG] ${message}`, data);
  },
  info: (message, data = {}) => {
    console.log(`ℹ️ [INFO] ${message}`, data);
  },
  warn: (message, data = {}) => {
    console.warn(`⚠️ [WARN] ${message}`, data);
  },
  error: (message, data = {}) => {
    console.error(`❌ [ERROR] ${message}`, data);
  },
  success: (message, data = {}) => {
    console.log(`✅ [SUCCESS] ${message}`, data);
  }
};

// Store original fetch
const originalFetch = window.fetch;

// Test interception immediately
logger.debug('Testing fetch interception', {
  originalFetch: typeof originalFetch,
  targetPath: TARGET_PATH,
  workerUrl: WORKER_URL
});

// Enhanced timeout wrapper with better error handling
function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return Promise.race([
    originalFetch(url, { ...options, signal: controller.signal }),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs)
    )
  ]).finally(() => clearTimeout(timeoutId));
}

// Circuit breaker logic
function checkCircuitBreaker() {
  const now = Date.now();

  switch (circuitBreaker.state) {
    case 'CLOSED':
      return true; // Allow requests

    case 'OPEN':
      if (now >= circuitBreaker.nextAttemptTime) {
        circuitBreaker.state = 'HALF_OPEN';
        logger.info('Circuit breaker entering HALF_OPEN state');
        return true; // Allow one test request
      }
      return false; // Block requests

    case 'HALF_OPEN':
      return true; // Allow test request

    default:
      return true;
  }
}

function recordCircuitBreakerSuccess() {
  if (circuitBreaker.state === 'HALF_OPEN') {
    circuitBreaker.state = 'CLOSED';
    circuitBreaker.failureCount = 0;
    logger.success('Circuit breaker reset to CLOSED state');
  }
}

function recordCircuitBreakerFailure(error) {
  circuitBreaker.failureCount++;
  circuitBreaker.lastFailureTime = Date.now();

  if (circuitBreaker.failureCount >= CIRCUIT_BREAKER_THRESHOLD) {
    circuitBreaker.state = 'OPEN';
    circuitBreaker.nextAttemptTime = Date.now() + CIRCUIT_BREAKER_RESET_TIME;
    stats.circuitBreakerTrips++;

    logger.error('Circuit breaker OPENED', {
      failureCount: circuitBreaker.failureCount,
      threshold: CIRCUIT_BREAKER_THRESHOLD,
      nextAttemptTime: new Date(circuitBreaker.nextAttemptTime).toISOString(),
      error: error.message
    });

    // Notify background script of circuit breaker trip
    chrome.runtime.sendMessage({
      action: 'circuitBreakerOpened',
      error: error.message,
      failureCount: circuitBreaker.failureCount
    }).catch(() => { });
  }
}

// Enhanced error classification
function classifyError(error, response) {
  if (error.name === 'AbortError' || error.message.includes('timeout')) {
    return ErrorTypes.TIMEOUT;
  }

  if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
    return ErrorTypes.NETWORK;
  }

  if (response && response.status === 401) {
    return ErrorTypes.AUTH;
  }

  if (response && response.status >= 500) {
    return ErrorTypes.SERVER;
  }

  if (response && response.status >= 400 && response.status < 500) {
    return ErrorTypes.CLIENT;
  }

  return ErrorTypes.UNKNOWN;
}

// Performance tracking
function updatePerformanceMetrics(latency) {
  stats.performance.totalLatency += latency;
  stats.performance.minLatency = Math.min(stats.performance.minLatency, latency);
  stats.performance.maxLatency = Math.max(stats.performance.maxLatency, latency);
  stats.performance.avgLatency = stats.performance.totalLatency / stats.successful;
}

// Health check function
async function performHealthCheck() {
  try {
    const startTime = Date.now();
    const response = await fetchWithTimeout(`${WORKER_URL}/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    }, 5000);

    const latency = Date.now() - startTime;

    if (response.ok) {
      const data = await response.json();
      stats.lastHealthCheck = {
        timestamp: new Date().toISOString(),
        status: 'healthy',
        latency,
        version: data.version
      };
      stats.workerStatus = 'healthy';
      logger.success('Health check passed', { latency, version: data.version });
      return true;
    } else {
      stats.workerStatus = 'degraded';
      logger.warn('Health check failed', { status: response.status, latency });
      return false;
    }
  } catch (error) {
    stats.workerStatus = 'failed';
    stats.lastHealthCheck = {
      timestamp: new Date().toISOString(),
      status: 'failed',
      error: error.message
    };
    logger.error('Health check error', { error: error.message });
    return false;
  }
}

// Enhanced fetch interceptor with circuit breaker and comprehensive error handling
window.fetch = async function (...args) {
  const [resource, config] = args;
  const url = typeof resource === 'string' ? resource : resource.url;

  // Only intercept getBetTicker requests
  if (!url.includes(TARGET_PATH)) {
    return originalFetch(...args);
  }

  stats.intercepted++;
  const interceptId = `${stats.intercepted}-${Date.now()}`;
  const startTime = Date.now();

  logger.info('Intercepting getBetTicker request', {
    interceptId,
    url,
    attempt: 1
  });

  try {
    // Check if extension is enabled
    const enabled = await chrome.storage.local.get(['enabled']).then(r => r.enabled !== false);
    if (!enabled) {
      logger.info('Extension disabled, passing through', { interceptId });
      return originalFetch(...args);
    }

    // Check circuit breaker state
    if (!checkCircuitBreaker()) {
      logger.warn('Circuit breaker OPEN, falling back to origin', {
        interceptId,
        state: circuitBreaker.state,
        nextAttemptTime: new Date(circuitBreaker.nextAttemptTime).toISOString()
      });
      stats.fallback++;
      return originalFetch(...args);
    }

    // Get cookies and validate
    const cookies = document.cookie;
    if (!cookies) {
      logger.warn('No cookies found - request may fail auth', { interceptId });
    } else {
      const cookieNames = cookies.split(';').map(c => c.trim().split('=')[0]).join(', ');
      logger.info('Cookies available', {
        interceptId,
        cookieCount: cookies.length,
        cookieNames,
        domain: window.location.hostname,
        url: window.location.href
      });

      // Debug: Show first few cookie values (without sensitive data)
      const cookiePreview = cookies.substring(0, 200) + (cookies.length > 200 ? '...' : '');
      logger.debug('Cookie preview', { interceptId, cookiePreview });
    }

    // Build worker URL and config
    const queryParams = url.includes('?') ? '?' + url.split('?')[1] : '';
    const workerUrl = WORKER_URL + TARGET_PATH + queryParams;

    const modifiedConfig = {
      ...config,
      headers: {
        ...config?.headers,
        'X-Original-Cookies': cookies || '',
        'X-Original-Host': 'fantasy402.com',
        'X-Interceptor-Version': '1.0.1',
        'X-Intercept-ID': interceptId,
        'X-Circuit-Breaker-State': circuitBreaker.state
      },
      credentials: 'include',
    };

    logger.debug('Redirecting to worker', { interceptId, workerUrl });

    // Attempt request with retries and circuit breaker integration
    let lastError, lastResponse;
    let success = false;

    for (let attempt = 1; attempt <= MAX_RETRIES && !success; attempt++) {
      try {
        const attemptStartTime = Date.now();
        const response = await fetchWithTimeout(workerUrl, modifiedConfig, TIMEOUT_MS);
        const attemptLatency = Date.now() - attemptStartTime;

        lastResponse = response;

        // Validate response
        const contentType = response.headers.get('content-type');
        if (!contentType?.includes('application/json')) {
          throw new Error(`Invalid content type: ${contentType}`);
        }

        if (!response.ok) {
          const errorType = classifyError(null, response);
          throw new Error(`${errorType} error: ${response.status} ${response.statusText}`);
        }

        // Success!
        const totalLatency = Date.now() - startTime;
        stats.successful++;
        updatePerformanceMetrics(totalLatency);
        recordCircuitBreakerSuccess();

        logger.success('Request successful', {
          interceptId,
          attempt,
          latency: totalLatency,
          status: response.status
        });

        // Notify background script
        chrome.runtime.sendMessage({
          action: 'interceptSuccess',
          interceptId,
          url: workerUrl,
          attempt,
          latency: totalLatency
        }).catch(() => { });

        success = true;
        return response;

      } catch (error) {
        lastError = error;
        const errorType = classifyError(error, lastResponse);

        logger.warn('Request attempt failed', {
          interceptId,
          attempt,
          errorType,
          error: error.message
        });

        // Record circuit breaker failure
        recordCircuitBreakerFailure(error);

        // Don't retry certain error types
        if (errorType === ErrorTypes.CLIENT || errorType === ErrorTypes.AUTH) {
          logger.info('Non-retryable error, stopping attempts', { interceptId, errorType });
          break;
        }

        // Exponential backoff for retries
        if (attempt < MAX_RETRIES) {
          const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          logger.debug('Waiting before retry', { interceptId, attempt, backoffDelay });
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }
      }
    }

    // All attempts failed - fall back to origin
    const totalLatency = Date.now() - startTime;
    stats.failed++;
    stats.fallback++;

    const errorRecord = {
      time: new Date().toISOString(),
      interceptId,
      error: lastError.message,
      errorType: classifyError(lastError, lastResponse),
      url: workerUrl,
      attempts: MAX_RETRIES,
      latency: totalLatency,
      circuitBreakerState: circuitBreaker.state
    };

    stats.errors.push(errorRecord);

    logger.error('All attempts failed, falling back to origin', errorRecord);

    // Notify background script
    chrome.runtime.sendMessage({
      action: 'interceptFailed',
      interceptId,
      error: lastError.message,
      errorType: errorRecord.errorType,
      fallback: true,
      attempts: MAX_RETRIES
    }).catch(() => { });

    // Fallback to origin
    return originalFetch(...args);

  } catch (error) {
    // Catastrophic error - fall back gracefully
    const totalLatency = Date.now() - startTime;
    stats.failed++;
    stats.fallback++;

    const errorRecord = {
      time: new Date().toISOString(),
      interceptId,
      error: error.message,
      errorType: ErrorTypes.UNKNOWN,
      stack: error.stack,
      latency: totalLatency
    };

    stats.errors.push(errorRecord);

    logger.error('Catastrophic interceptor error', errorRecord);

    // Always fall back to origin on error
    return originalFetch(...args);
  }
};

// Debug helper to test cookie forwarding
async function testCookieForwarding() {
  const cookies = document.cookie;
  logger.info('Testing cookie forwarding', {
    domain: window.location.hostname,
    cookieCount: cookies ? cookies.length : 0,
    hasCookies: !!cookies
  });

  if (!cookies) {
    logger.warn('No cookies available for testing');
    return false;
  }

  try {
    const testUrl = WORKER_URL + '/health';
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'X-Original-Cookies': cookies,
        'X-Original-Host': 'fantasy402.com',
        'X-Test-Request': 'true'
      }
    });

    logger.info('Cookie forwarding test result', {
      status: response.status,
      ok: response.ok,
      url: testUrl
    });

    return response.ok;
  } catch (error) {
    logger.error('Cookie forwarding test failed', { error: error.message });
    return false;
  }
}

// Expose enhanced stats and circuit breaker for debugging
window.__betTickerStats = {
  ...stats,
  circuitBreaker,
  ErrorTypes,
  logger,
  performHealthCheck,
  testCookieForwarding
};

// Enhanced periodic monitoring
setInterval(async () => {
  if (stats.intercepted > 0) {
    const successRate = ((stats.successful / stats.intercepted) * 100).toFixed(1);
    const avgLatency = stats.performance.avgLatency.toFixed(1);

    logger.info('Periodic stats report', {
      intercepted: stats.intercepted,
      successful: stats.successful,
      failed: stats.failed,
      fallback: stats.fallback,
      successRate: `${successRate}%`,
      avgLatency: `${avgLatency}ms`,
      circuitBreakerTrips: stats.circuitBreakerTrips,
      workerStatus: stats.workerStatus,
      circuitBreakerState: circuitBreaker.state
    });
  }

  // Perform health check every 5 minutes
  if (!stats.lastHealthCheck || Date.now() - new Date(stats.lastHealthCheck.timestamp).getTime() > 300000) {
    await performHealthCheck();
  }
}, 30000); // Every 30 seconds

// Initial health check
setTimeout(async () => {
  logger.info('Performing initial health check');
  await performHealthCheck();
}, 5000);

// Cleanup old errors to prevent memory leaks
setInterval(() => {
  if (stats.errors.length > 100) {
    stats.errors = stats.errors.slice(-50); // Keep only last 50 errors
    logger.debug('Cleaned up old error records', { remaining: stats.errors.length });
  }
}, 60000); // Every minute

logger.success('Enhanced BetTicker interceptor active', {
  version: '1.0.1',
  features: ['circuit-breaker', 'health-monitoring', 'performance-tracking', 'enhanced-logging'],
  circuitBreakerThreshold: CIRCUIT_BREAKER_THRESHOLD,
  maxRetries: MAX_RETRIES,
  timeout: TIMEOUT_MS
});

/* ========== MISSION CONTROL MENU HIJACK ========== */
// wait for DOM, then hijack Bet-Ticker menu click
const hijack = () => {
  const a = document.querySelector('a[data-action="get-bet-ticker"]');
  if (!a) return setTimeout(hijack, 500);      // SPA hasn't rendered it yet
  a.onclick = e => {
    e.preventDefault();                        // stop old ticker
    window.location.hash = '#mission-control'; // open unified pane
  };
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hijack);
else hijack();

/* ======  Enterprise Circuit Breaker Guard  ====== */
(async () => {
  const STORAGE_KEY = 'cb-state';
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // Wait for breaker to close or half-open
  async function waitIfOpen() {
    try {
      let st = await chrome.storage.session.get(STORAGE_KEY);
      const cb = st[STORAGE_KEY] || { state: 'closed' };

      if (cb.state === 'open') {
        const left = Math.max(0, (cb.lastOpen || 0) + 60_000 - Date.now());
        if (left > 0) {
          logger.warn('Circuit breaker OPEN, waiting', {
            waitTime: `${left}ms`,
            nextAttemptTime: new Date(cb.lastOpen + 60_000).toISOString()
          });
          await sleep(left);
        }
      }
    } catch (error) {
      logger.error('Circuit breaker wait error', { error: error.message });
    }
  }

  // Enhanced fetch wrapper with circuit breaker integration
  const _origFetch = window.fetch;
  window.fetch = async function (...args) {
    await waitIfOpen();

    try {
      const res = await _origFetch.apply(this, args);

      // Check for server errors
      if (!res.ok && res.status >= 500) {
        throw new Error(`Server error: ${res.status}`);
      }

      // Success → reset consecutive fails
      chrome.runtime.sendMessage({ type: 'fetch-success' }).catch(() => { });
      return res;

    } catch (error) {
      // Report failure to circuit breaker
      chrome.runtime.sendMessage({ type: 'fetch-fail' }).catch(() => { });
      throw error; // Let original caller handle
    }
  };

  logger.info('Circuit breaker guard wrapper installed');
})();

