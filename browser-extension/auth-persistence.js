/**
 * Auth Persistence Module
 * Enterprise-grade session management for Fantasy402
 *
 * Features:
 * - 3-layer storage (local + sync + KV)
 * - Automatic cookie capture from responses
 * - Cookie injection into requests
 * - Expiry tracking and refresh
 * - Keep-alive session management
 */

const AUTH_STORAGE_KEY = 'fantasy402_auth';
const AUTH_SYNC_KEY = 'fantasy402_auth_sync';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days default
const WORKER_URL = 'http://localhost:8787'; // Update for production

/**
 * Parse Set-Cookie header into structured data
 */
function parseCookie(setCookieHeader) {
  if (!setCookieHeader) return null;

  const parts = setCookieHeader.split(';').map(p => p.trim());
  const [nameValue] = parts;
  const [name, value] = nameValue.split('=');

  const cookie = {
    name: name.trim(),
    value: value?.trim() || '',
    expires: null,
    maxAge: null,
    domain: null,
    path: '/',
    secure: false,
    httpOnly: false,
    sameSite: 'Lax',
    captured: Date.now()
  };

  // Parse attributes
  for (let i = 1; i < parts.length; i++) {
    const [attr, attrValue] = parts[i].split('=').map(s => s.trim());
    const attrLower = attr.toLowerCase();

    if (attrLower === 'expires') {
      cookie.expires = new Date(attrValue).getTime();
    } else if (attrLower === 'max-age') {
      cookie.maxAge = parseInt(attrValue) * 1000; // Convert to ms
      cookie.expires = Date.now() + cookie.maxAge;
    } else if (attrLower === 'domain') {
      cookie.domain = attrValue;
    } else if (attrLower === 'path') {
      cookie.path = attrValue;
    } else if (attrLower === 'secure') {
      cookie.secure = true;
    } else if (attrLower === 'httponly') {
      cookie.httpOnly = true;
    } else if (attrLower === 'samesite') {
      cookie.sameSite = attrValue;
    }
  }

  // Set default expiry if none provided
  if (!cookie.expires) {
    cookie.expires = Date.now() + COOKIE_MAX_AGE;
  }

  return cookie;
}

/**
 * Extract all cookies from response headers
 */
function extractCookiesFromResponse(response) {
  const cookies = [];

  // Get all Set-Cookie headers
  const setCookieHeaders = response.headers.getSetCookie?.() || [];

  for (const header of setCookieHeaders) {
    const cookie = parseCookie(header);
    if (cookie) {
      cookies.push(cookie);
    }
  }

  return cookies;
}

/**
 * Extract cookies from document.cookie string
 */
function extractCookiesFromDocument(cookieString) {
  if (!cookieString) return [];

  const cookies = [];
  const pairs = cookieString.split(';');

  for (const pair of pairs) {
    const [name, value] = pair.trim().split('=');
    if (name && value) {
      cookies.push({
        name: name.trim(),
        value: value.trim(),
        expires: Date.now() + COOKIE_MAX_AGE, // Assume 7 days
        captured: Date.now(),
        source: 'document'
      });
    }
  }

  return cookies;
}

/**
 * Extract JWT token from response body or headers
 */
function extractToken(response, responseBody) {
  // Check Authorization header
  const authHeader = response.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check response body for token (common patterns)
  if (responseBody && typeof responseBody === 'object') {
    return responseBody.token ||
           responseBody.access_token ||
           responseBody.Token ||
           responseBody.AccessToken ||
           null;
  }

  return null;
}

/**
 * Store auth data in chrome.storage.local (survives browser restart)
 */
async function storeAuthLocally(authData) {
  try {
    await chrome.storage.local.set({ [AUTH_STORAGE_KEY]: authData });
    console.log('[AuthPersistence] ✅ Stored auth locally:', {
      cookieCount: authData.cookies?.length || 0,
      hasToken: !!authData.token,
      expires: new Date(authData.expiresAt).toISOString()
    });
  } catch (error) {
    console.error('[AuthPersistence] ❌ Failed to store auth locally:', error);
  }
}

/**
 * Store auth data in chrome.storage.sync (survives across devices)
 */
async function storeAuthSync(authData) {
  try {
    // Sync has 8KB limit, so store minimal data
    const minimal = {
      token: authData.token,
      expiresAt: authData.expiresAt,
      lastRefresh: authData.lastRefresh,
      cookieNames: authData.cookies?.map(c => c.name) || []
    };

    await chrome.storage.sync.set({ [AUTH_SYNC_KEY]: minimal });
    console.log('[AuthPersistence] ✅ Stored auth in sync storage');
  } catch (error) {
    console.error('[AuthPersistence] ❌ Failed to store auth in sync:', error);
  }
}

/**
 * Store auth data in worker KV (permanent backup)
 */
async function storeAuthKV(authData) {
  try {
    const response = await fetch(`${WORKER_URL}/api/auth/persist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(authData)
    });

    if (response.ok) {
      console.log('[AuthPersistence] ✅ Stored auth in worker KV');
    } else {
      console.warn('[AuthPersistence] ⚠️ Worker KV storage failed:', response.status);
    }
  } catch (error) {
    console.warn('[AuthPersistence] ⚠️ Worker KV unavailable (offline?):', error.message);
  }
}

/**
 * Main function: Capture and persist auth data
 */
async function captureAndPersistAuth(response, responseBody, requestUrl) {
  // Extract cookies from response
  const responseCookies = extractCookiesFromResponse(response);

  // Also capture browser cookies (backup)
  const documentCookies = typeof document !== 'undefined'
    ? extractCookiesFromDocument(document.cookie)
    : [];

  // Merge cookies (response takes precedence)
  const allCookies = [
...responseCookies,
    ...documentCookies.filter(dc =>
      !responseCookies.some(rc => rc.name === dc.name)
    )
  ];

  // Extract token
  const token = extractToken(response, responseBody);

  // Build auth data object
  const authData = {
    cookies: allCookies,
    token,
    capturedAt: Date.now(),
    lastRefresh: Date.now(),
    expiresAt: Math.min(...allCookies.map(c => c.expires).filter(Boolean)),
    source: requestUrl,
    version: chrome.runtime.getManifest().version
  };

  // Store in all 3 layers (parallel for speed)
  await Promise.all([
    storeAuthLocally(authData),
    storeAuthSync(authData),
    storeAuthKV(authData)
  ]);

  return authData;
}

/**
 * Load auth data (try local first, then sync, then KV)
 */
async function loadAuthData() {
  // Try local storage first (fastest)
  try {
    const { [AUTH_STORAGE_KEY]: authData } = await chrome.storage.local.get(AUTH_STORAGE_KEY);

    if (authData && authData.expiresAt > Date.now()) {
      console.log('[AuthPersistence] ✅ Loaded auth from local storage');
      return authData;
    } else if (authData) {
      console.warn('[AuthPersistence] ⚠️ Auth expired in local storage');
    }
  } catch (error) {
    console.error('[AuthPersistence] ❌ Failed to load from local storage:', error);
  }

  // Try sync storage
  try {
    const { [AUTH_SYNC_KEY]: syncData } = await chrome.storage.sync.get(AUTH_SYNC_KEY);

    if (syncData && syncData.expiresAt > Date.now()) {
      console.log('[AuthPersistence] ✅ Loaded auth from sync storage (degraded mode)');
      return syncData;
    }
  } catch (error) {
    console.error('[AuthPersistence] ❌ Failed to load from sync storage:', error);
  }

  // Try worker KV
  try {
    const response = await fetch(`${WORKER_URL}/api/auth/load`);
    if (response.ok) {
      const kvData = await response.json();
      if (kvData && kvData.expiresAt > Date.now()) {
        console.log('[AuthPersistence] ✅ Loaded auth from worker KV (recovery mode)');
        // Re-sync to local storage
        await storeAuthLocally(kvData);
        return kvData;
      }
    }
  } catch (error) {
    console.warn('[AuthPersistence] ⚠️ Worker KV unavailable:', error.message);
  }

  console.error('[AuthPersistence] ❌ No valid auth found in any storage');
  return null;
}

/**
 * Build Cookie header string from stored auth data
 */
function buildCookieHeader(authData) {
  if (!authData || !authData.cookies) return null;

  // Filter out expired cookies
  const validCookies = authData.cookies.filter(c =>
    !c.expires || c.expires > Date.now()
  );

  if (validCookies.length === 0) return null;

  // Build cookie string: name1=value1; name2=value2
  return validCookies
    .map(c => `${c.name}=${c.value}`)
    .join('; ');
}

/**
 * Check if auth needs refresh (within 1 hour of expiry)
 */
function needsRefresh(authData) {
  if (!authData || !authData.expiresAt) return true;

  const oneHour = 60 * 60 * 1000;
  return (authData.expiresAt - Date.now()) < oneHour;
}

/**
 * Clear all auth data (logout)
 */
async function clearAuth() {
  console.log('[AuthPersistence] 🗑️ Clearing all auth data');

  await Promise.all([
    chrome.storage.local.remove(AUTH_STORAGE_KEY),
    chrome.storage.sync.remove(AUTH_SYNC_KEY),
    fetch(`${WORKER_URL}/api/auth/clear`, { method: 'DELETE' }).catch(() => {})
  ]);
}

// Export functions
if (typeof window !== 'undefined') {
  window.AuthPersistence = {
    captureAndPersistAuth,
    loadAuthData,
    buildCookieHeader,
    needsRefresh,
    clearAuth,
    extractCookiesFromResponse,
    extractCookiesFromDocument
  };
}
