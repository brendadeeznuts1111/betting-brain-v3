/**
 * Shared Utility Functions for BetTicker Dashboards
 * 
 * Common utilities to avoid code duplication across dashboards.
 * Import specific functions or the entire module.
 * 
 * @version 1.0.0
 * @date 2025-10-07
 */

import { WORKER_URL, API_ENDPOINTS, ERROR_MESSAGES, STATUS } from './config.js';

/**
 * Fetch wrapper with error handling and timeout
 * @param {string} url - API endpoint URL
 * @param {object} options - Fetch options
 * @param {number} timeout - Request timeout in ms (default: 10000)
 * @returns {Promise<Response>}
 */
export async function fetchWithTimeout(url, options = {}, timeout = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error(ERROR_MESSAGES.timeout);
    }
    throw error;
  }
}

/**
 * Check system health
 * @returns {Promise<{online: boolean, status: string}>}
 */
export async function checkSystemHealth() {
  try {
    const response = await fetchWithTimeout(`${WORKER_URL}${API_ENDPOINTS.health}`);
    return {
      online: response.ok,
      status: response.ok ? STATUS.ONLINE : STATUS.OFFLINE
    };
  } catch (error) {
    console.error('Health check failed:', error);
    return {
      online: false,
      status: STATUS.ERROR
    };
  }
}

/**
 * Fetch interceptor history
 * @param {number} limit - Max number of records
 * @returns {Promise<Array>}
 */
export async function fetchInterceptorHistory(limit = 100) {
  try {
    const response = await fetchWithTimeout(
      `${WORKER_URL}${API_ENDPOINTS.interceptorHistory}?limit=${limit}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch interceptor history:', error);
    return [];
  }
}

/**
 * Fetch interceptor stats
 * @returns {Promise<object>}
 */
export async function fetchInterceptorStats() {
  try {
    const response = await fetchWithTimeout(
      `${WORKER_URL}${API_ENDPOINTS.interceptorStats}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch interceptor stats:', error);
    return {
      total: 0,
      today: 0,
      lastHour: 0
    };
  }
}

/**
 * Fetch intelligence tool data
 * @param {string} tool - Tool name (exposure, clv, hold, sharp)
 * @param {object} params - Query parameters
 * @returns {Promise<object>}
 */
export async function fetchIntelligenceTool(tool, params = {}) {
  try {
    const endpoint = API_ENDPOINTS[tool];
    if (!endpoint) {
      throw new Error(`Unknown tool: ${tool}`);
    }
    
    const queryString = new URLSearchParams(params).toString();
    const url = `${WORKER_URL}${endpoint}${queryString ? '?' + queryString : ''}`;
    
    const response = await fetchWithTimeout(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch ${tool} data:`, error);
    return null;
  }
}

/**
 * Fetch REST API endpoint
 * @param {string} endpoint - API endpoint name
 * @param {object} params - Query parameters
 * @returns {Promise<object>}
 */
export async function fetchAPI(endpoint, params = {}) {
  try {
    const url = API_ENDPOINTS[endpoint];
    if (!url) {
      throw new Error(`Unknown endpoint: ${endpoint}`);
    }
    
    const queryString = new URLSearchParams(params).toString();
    const fullUrl = `${WORKER_URL}${url}${queryString ? '?' + queryString : ''}`;
    
    const response = await fetchWithTimeout(fullUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`API request failed for ${endpoint}:`, error);
    return null;
  }
}

/**
 * Update element text with animation
 * @param {string} elementId - Element ID
 * @param {string} text - New text content
 */
export function updateElementText(elementId, text) {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  element.style.transition = 'opacity 0.3s';
  element.style.opacity = '0';
  
  setTimeout(() => {
    element.textContent = text;
    element.style.opacity = '1';
  }, 300);
}

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type (success, error, warning, info)
 * @param {number} duration - Duration in ms (default: 3000)
 */
export function showToast(message, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg text-white shadow-lg z-50 transition-all duration-300 ${
    type === 'success' ? 'bg-green-600' :
    type === 'error' ? 'bg-red-600' :
    type === 'warning' ? 'bg-yellow-600' :
    'bg-blue-600'
  }`;
  toast.textContent = message;
  toast.style.opacity = '0';
  
  document.body.appendChild(toast);
  
  setTimeout(() => { toast.style.opacity = '1'; }, 100);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => document.body.removeChild(toast), 300);
  }, duration);
}

/**
 * Format large numbers with K/M/B suffix
 * @param {number} num - Number to format
 * @returns {string}
 */
export function formatLargeNumber(num) {
  if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  return num.toString();
}

/**
 * Debounce function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function}
 */
export function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Auto-refresh setup with pause/resume
 * @param {Function} callback - Function to call on refresh
 * @param {number} interval - Refresh interval in ms
 * @returns {object} - Control object with pause/resume/stop methods
 */
export function setupAutoRefresh(callback, interval) {
  let intervalId = null;
  let isPaused = false;
  
  const start = () => {
    if (intervalId) return;
    callback(); // Initial call
    intervalId = setInterval(() => {
      if (!isPaused) callback();
    }, interval);
  };
  
  const pause = () => { isPaused = true; };
  const resume = () => { isPaused = false; };
  const stop = () => {
    if (intervalId) clearInterval(intervalId);
    intervalId = null;
  };
  
  start();
  
  return { pause, resume, stop };
}

/**
 * Storage helpers (localStorage wrapper)
 */
export const storage = {
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Storage get error:', error);
      return defaultValue;
    }
  },
  
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Storage set error:', error);
      return false;
    }
  },
  
  remove: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Storage remove error:', error);
      return false;
    }
  },
  
  clear: () => {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('Storage clear error:', error);
      return false;
    }
  }
};

// Default export
export default {
  fetchWithTimeout,
  checkSystemHealth,
  fetchInterceptorHistory,
  fetchInterceptorStats,
  fetchIntelligenceTool,
  fetchAPI,
  updateElementText,
  showToast,
  formatLargeNumber,
  debounce,
  setupAutoRefresh,
  storage
};

