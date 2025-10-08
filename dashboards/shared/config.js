/**
 * Shared Configuration for BetTicker Dashboards
 * 
 * Central configuration file for all dashboard constants and settings.
 * Import this file to avoid duplication across dashboards.
 * 
 * @version 1.0.0
 * @date 2025-10-07
 */

// Worker API Configuration
export const WORKER_URL = 'http://localhost:8787';

// API Endpoints
export const API_ENDPOINTS = {
  health: '/health',
  interceptorHistory: '/interceptor/history',
  interceptorResponse: '/interceptor/response',
  interceptorStats: '/interceptor/stats',
  
  // Intelligence Tools
  exposure: '/tools/betting-exposure',
  clv: '/tools/clv',
  hold: '/tools/hold-percentage',
  sharp: '/tools/sharp-score',
  
  // MCP Endpoint
  mcp: '/mcp',
  
  // REST API (new)
  apiEvents: '/api/events',
  apiCustomers: '/api/customers',
  apiMarkets: '/api/markets',
  apiExposure: '/api/exposure',
  apiRisk: '/api/risk-concentration',
  apiAlerts: '/api/alerts',
  apiMetrics: '/api/metrics',
  apiLeaderboard: '/api/leaderboard',
  apiTimeSeries: '/api/time-series'
};

// Refresh Intervals (milliseconds)
export const REFRESH_INTERVALS = {
  fast: 5000,       // 5 seconds
  normal: 10000,    // 10 seconds
  slow: 30000,      // 30 seconds
  manual: 0         // No auto-refresh
};

// Chart Colors
export const CHART_COLORS = {
  primary: '#6366f1',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  purple: '#8b5cf6',
  pink: '#ec4899',
  teal: '#14b8a6',
  orange: '#f97316',
  gray: '#6b7280'
};

// Status Types
export const STATUS = {
  ONLINE: '✅',
  OFFLINE: '❌',
  WARNING: '⚠️',
  LOADING: '⏳',
  ERROR: '❌'
};

// Data Limits
export const DATA_LIMITS = {
  maxRecords: 1000,
  defaultLimit: 100,
  minLimit: 10,
  maxChartPoints: 50
};

// Format Helpers (can be imported individually)
export const FORMATTERS = {
  currency: (value) => `$${value.toFixed(2)}`,
  percentage: (value) => `${(value * 100).toFixed(1)}%`,
  number: (value) => value.toLocaleString(),
  timestamp: (ts) => new Date(ts).toLocaleTimeString(),
  date: (ts) => new Date(ts).toLocaleDateString(),
  datetime: (ts) => new Date(ts).toLocaleString(),
  relativeTime: (ts) => {
    const now = Date.now();
    const diff = now - ts;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
};

// Default Chart Configuration
export const DEFAULT_CHART_CONFIG = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'top',
      labels: {
        color: '#ffffff',
        font: { size: 12 }
      }
    },
    tooltip: {
      mode: 'index',
      intersect: false,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      borderColor: 'rgba(255, 255, 255, 0.2)',
      borderWidth: 1
    }
  },
  scales: {
    x: {
      grid: { color: 'rgba(255, 255, 255, 0.1)' },
      ticks: { color: '#ffffff' }
    },
    y: {
      grid: { color: 'rgba(255, 255, 255, 0.1)' },
      ticks: { color: '#ffffff' }
    }
  }
};

// Error Messages
export const ERROR_MESSAGES = {
  networkError: 'Network error. Please check your connection.',
  serverError: 'Server error. Please try again later.',
  notFound: 'Resource not found.',
  unauthorized: 'Unauthorized access.',
  timeout: 'Request timed out. Please try again.',
  unknown: 'An unknown error occurred.'
};

// Default Export (for ES6 imports)
export default {
  WORKER_URL,
  API_ENDPOINTS,
  REFRESH_INTERVALS,
  CHART_COLORS,
  STATUS,
  DATA_LIMITS,
  FORMATTERS,
  DEFAULT_CHART_CONFIG,
  ERROR_MESSAGES
};

