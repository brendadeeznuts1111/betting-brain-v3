// Minimal debug content script to test injection
console.log('🔍 DEBUG: Content script injected successfully');
console.log('🔍 DEBUG: Domain:', window.location.hostname);
console.log('🔍 DEBUG: URL:', window.location.href);
console.log('🔍 DEBUG: Extension ID:', chrome.runtime.id);

// Test if we can access cookies
try {
  const cookies = document.cookie;
  console.log('🔍 DEBUG: Cookies available:', cookies ? cookies.length + ' chars' : 'none');
  if (cookies) {
    const cookieNames = cookies.split(';').map(c => c.trim().split('=')[0]).join(', ');
    console.log('🔍 DEBUG: Cookie names:', cookieNames);
  }
} catch (error) {
  console.error('🔍 DEBUG: Cookie access error:', error);
}

// Test basic fetch interception
const originalFetch = window.fetch;
window.fetch = function(...args) {
  console.log('🔍 DEBUG: Fetch intercepted:', args[0]);
  return originalFetch.apply(this, args);
};

console.log('🔍 DEBUG: Fetch interceptor installed');

// Expose debug info
window.__debugExtension = {
  injected: true,
  domain: window.location.hostname,
  url: window.location.href,
  extensionId: chrome.runtime.id,
  cookies: document.cookie,
  timestamp: new Date().toISOString()
};
