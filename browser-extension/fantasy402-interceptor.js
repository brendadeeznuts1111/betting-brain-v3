// Fantasy402.com Data Interceptor
// Intercepts API calls and forwards to Cloudflare Worker

const WORKER_URL = 'http://localhost:3000';
const DEBUG = true;

// Store original fetch
const originalFetch = window.fetch;

// API endpoints we want to intercept
// Monitoring ALL /cloud/api/ calls for comprehensive capture
const INTERCEPT_PATTERNS = [
  '/cloud/api/' // Captures everything under /cloud/api/*
];

// Should we intercept this URL?
function shouldIntercept(url) {
  return INTERCEPT_PATTERNS.some(pattern => url.includes(pattern));
}

// Extract JWT token from response or headers
function extractToken(response, requestHeaders) {
  // Check Authorization header from request
  const authHeader = requestHeaders.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

// Parse form-urlencoded body
function parseFormBody(body) {
  if (!body) return {};
  const params = new URLSearchParams(body);
  const result = {};
  for (const [key, value] of params) {
    result[key] = value;
  }
  return result;
}

// Forward intercepted data to worker via background script (bypasses CORS)
async function forwardToWorker(data) {
  try {
    // Check if Chrome runtime API is available (world: MAIN might not have it)
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      // Route through background service worker (has network privileges)
      chrome.runtime.sendMessage(
        {
          action: 'forwardToWorker',
          data: data,
          workerUrl: WORKER_URL
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('[Fantasy402] ❌ Background script error:', chrome.runtime.lastError.message);
            return;
          }

          if (DEBUG && response) {
            if (response.success) {
              console.log('[Fantasy402] ✅ Forwarded to worker:', data.endpoint, `(${response.status})`);
            } else {
              console.warn('[Fantasy402] ⚠️ Worker responded with:', response.status, response.error);
            }
          }
        }
      );
    } else {
      // Fallback: Direct fetch (will fail with CORS but at least we try)
      console.warn('[Fantasy402] ⚠️ Chrome API unavailable, trying direct fetch (may fail with CORS)');
      const response = await originalFetch(`${WORKER_URL}/api/fantasy402/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        keepalive: true
      });

      if (DEBUG) {
        if (response.ok) {
          console.log('[Fantasy402] ✅ Forwarded to worker:', data.endpoint, `(${response.status})`);
        } else {
          console.warn('[Fantasy402] ⚠️ Worker responded with:', response.status, response.statusText);
        }
      }
    }
  } catch (error) {
    console.error('[Fantasy402] ❌ Failed to forward:', error);
    console.error('[Fantasy402] 🔍 Worker URL:', WORKER_URL);
    console.error('[Fantasy402] 💡 Make sure the worker is running: bun run dev');
  }
}

// Override fetch
window.fetch = async function (...args) {
  const [resource, init] = args;
  const url = typeof resource === 'string' ? resource : resource.url;

  // Only intercept fantasy402.com API calls
  if (!url.includes('fantasy402.com') || !shouldIntercept(url)) {
    return originalFetch.apply(this, args);
  }

  if (DEBUG) {
    console.log('[Fantasy402] 🔍 Intercepting:', url);
  }

  // Parse request details
  const method = init?.method || 'GET';
  const headers = new Headers(init?.headers || {});
  const body = init?.body || null;
  const bodyParsed = body ? parseFormBody(body) : null;

  // Capture start time
  const startTime = Date.now();

  // Make the actual request
  const response = await originalFetch.apply(this, args);

  // Calculate duration
  const duration = Date.now() - startTime;

  // Clone response to read it without consuming
  const clonedResponse = response.clone();

  try {
    // Read response
    const responseText = await clonedResponse.text();
    let responseJson = null;

    try {
      responseJson = JSON.parse(responseText);
    } catch (e) {
      // Not JSON, that's okay
    }

    // Extract JWT token if present
    const token = extractToken(response, headers);

    // Parse endpoint from URL
    const urlObj = new URL(url);
    const endpoint = urlObj.pathname;

    // Build data packet
    const dataPacket = {
      timestamp: new Date().toISOString(),
      endpoint,
      operation: bodyParsed?.operation || 'unknown',
      method,
      url,
      request: {
        headers: Object.fromEntries(headers.entries()),
        body: bodyParsed,
        rawBody: body
      },
      response: {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseJson || responseText,
        size: responseText.length
      },
      metadata: {
        duration,
        agentID: bodyParsed?.agentID,
        agentOwner: bodyParsed?.agentOwner,
        customerID: bodyParsed?.customerID,
        token: token ? `${token.substring(0, 20)}...` : null, // Truncated for safety
        userAgent: navigator.userAgent,
        pageUrl: window.location.href
      }
    };

    // Forward to worker (non-blocking)
    forwardToWorker(dataPacket).catch(console.error);

  } catch (error) {
    console.error('[Fantasy402] ❌ Error processing response:', error);
  }

  // Return original response
  return response;
};

// Also intercept XMLHttpRequest for older code
const originalXHROpen = XMLHttpRequest.prototype.open;
const originalXHRSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function (method, url, ...rest) {
  this._interceptUrl = url;
  this._interceptMethod = method;
  this._interceptStartTime = Date.now();
  return originalXHROpen.apply(this, [method, url, ...rest]);
};

XMLHttpRequest.prototype.send = function (body) {
  const url = this._interceptUrl;

  // DEBUG: Log every send call
  if (DEBUG && url && url.includes('/cloud/api/')) {
    console.log('[Fantasy402] 🔎 XHR send detected:', url);
    console.log('[Fantasy402] 🔎 Pattern match:', shouldIntercept(url));
  }

  // Convert relative URLs to absolute
  const absoluteUrl = url && url.startsWith('http') ? url : (url && window.location.origin + url);

  // Check if we should intercept (relative URLs are always on current domain)
  const isFantasy402 = !url || url.startsWith('/') || url.includes('fantasy402.com');

  if (url && isFantasy402 && shouldIntercept(url)) {
    if (DEBUG) {
      console.log('[Fantasy402] 🔍 Intercepting XHR:', url);
    }

    this.addEventListener('load', function () {
      try {
        const duration = Date.now() - this._interceptStartTime;
        let responseJson = null;

        try {
          responseJson = JSON.parse(this.responseText);
        } catch (e) {
          // Not JSON
        }

        const urlObj = new URL(absoluteUrl || url, window.location.origin);
        const bodyParsed = body ? parseFormBody(body) : null;

        const dataPacket = {
          timestamp: new Date().toISOString(),
          endpoint: urlObj.pathname,
          operation: bodyParsed?.operation || 'unknown',
          method: this._interceptMethod,
          url: absoluteUrl || url,
          request: {
            body: bodyParsed,
            rawBody: body
          },
          response: {
            status: this.status,
            statusText: this.statusText,
            body: responseJson || this.responseText,
            size: this.responseText.length
          },
          metadata: {
            duration,
            agentID: bodyParsed?.agentID,
            customerID: bodyParsed?.customerID,
            pageUrl: window.location.href
          }
        };

        forwardToWorker(dataPacket).catch(console.error);

      } catch (error) {
        console.error('[Fantasy402] ❌ Error processing XHR:', error);
      }
    });
  }

  return originalXHRSend.apply(this, [body]);
};

// Log initialization
console.log('[Fantasy402] 🚀 Interceptor initialized');
console.log('[Fantasy402] 📡 Worker URL:', WORKER_URL);
console.log('[Fantasy402] 🎯 Monitoring endpoints:', INTERCEPT_PATTERNS);

