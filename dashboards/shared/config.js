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
export const WORKER_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:8787'
  : 'https://betting-brain-v3-prod.nolarose1968-806.workers.dev'; // Default to prod if not localhost. This needs to be the primary prod URL.

// API Endpoints
export const API_ENDPOINTS = {
  health: '/health',
  interceptorHistory: '/interceptor/history',
  interceptorResponse: '/interceptor/response',
  interceptorStats: '/interceptor/stats',
  analyticsLive: '/api/analytics/live',
  floorStatus: '/floor/status',

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
  apiTimeSeries: '/api/time-series',
  apiLiveOdds: '/api/live-odds',
  apiLiveScores: '/api/live-scores',
  apiDatabaseMetrics: '/api/database-metrics',
  apiInfrastructureStatus: '/api/infrastructure-status',
  apiAnalyticsMetrics: '/api/analytics/metrics',
  apiF402MissionControl: '/api/f402/mission-control',
  apiHealthDns: '/api/health/dns',
  apiF402PlayerInfo: '/api/fantasy402/player-info',
  apiF402PlayerPerformance: '/api/fantasy402/player-performance',
  apiF402TransactionList: '/api/fantasy402/transaction-list',
  apiF402PendingWagers: '/api/fantasy402/pending-wagers',
  apiPlayerAnalysis: '/api/player-analysis',
  apiTransactionHistory: '/api/transaction-history',
  interceptorHistory: '/interceptor/history',
  interceptorResponse: '/interceptor/response',
  apiF402AgentsTree: '/api/f402/agents/tree',
  apiF402AgentsDetail: '/api/f402/agents/',
  apiAnalyticsMicro: '/api/analytics/micro/',
  apiLiveOdds: '/api/live-odds',
};

// Refresh Intervals (milliseconds)
export const REFRESH_INTERVALS = {
  normal: 10000,
  fast: 5000,
  slow: 30000,
  ANALYTICS_LIVE: 5000,
  dashboard: 10000,
  manual: 0,         // No auto-refresh
  analyticsEnhanced: 30000, // New refresh interval for analytics-enhanced dashboard
  agentPerformance: 60000, // New refresh interval for agent-performance dashboard
  hierarchyEnhanced: 60000, // New refresh interval for hierarchy-enhanced dashboard
  sports: 30000 // New refresh interval for sports dashboard
};

// Wager Type Labels
export const WAGER_TYPES = {
  'M': 'Moneyline',
  'S': 'Spread',
  'L': 'Total',
  'P': 'Parlay',
  'T': 'Teaser',
  'C': 'Future'
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
  ONLINE: 'Online',
  OFFLINE: 'Offline',
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
  unknown: 'An unknown error occurred.',
  fetchError: 'Failed to fetch data. Check console for details.'
};

// Extension secret for production requests
export const EXTENSION_SECRET = 'default-dev-secret-change-me';

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
  ERROR_MESSAGES,
  EXTENSION_SECRET,
  WIDGET_CONFIG
};

// Widget Configuration
export const WIDGET_CONFIG = {
  floorHealth: {
    api: API_ENDPOINTS.floorStatus,
    refresh: REFRESH_INTERVALS.normal,
    container: 'floor-health-widget'
  },
  forestGrove: {
    api: API_ENDPOINTS.floorStatus,
    fallbackApi: API_ENDPOINTS.health,
    refresh: REFRESH_INTERVALS.normal,
    container: 'forest-grove-widget'
  },
  mcpTools: {
    api: API_ENDPOINTS.mcp,
    refresh: REFRESH_INTERVALS.normal,
    container: 'mcp-tools-widget'
  },
  liveOdds: {
    api: API_ENDPOINTS.mcp, // Primary via MCP tool
    fallbackApi: API_ENDPOINTS.apiLiveOdds, // Fallback to direct API
    refresh: REFRESH_INTERVALS.normal,
    container: 'live-odds-widget'
  },
  liveScores: {
    api: API_ENDPOINTS.apiLiveScores,
    refresh: REFRESH_INTERVALS.normal,
    container: 'live-scores-widget'
  },
  databaseMetrics: {
    api: API_ENDPOINTS.mcp, // Primary via MCP tool
    fallbackApi: API_ENDPOINTS.apiDatabaseMetrics, // Fallback to direct API
    refresh: REFRESH_INTERVALS.normal,
    container: 'database-metrics-widget'
  },
  infrastructureStatus: {
    api: API_ENDPOINTS.mcp, // Primary via MCP tool
    fallbackApi: API_ENDPOINTS.apiInfrastructureStatus, // Fallback to direct API
    refresh: REFRESH_INTERVALS.normal,
    container: 'infrastructure-status-widget'
  },
  systemPerformance: {
    api: API_ENDPOINTS.apiAnalyticsMetrics,
    refresh: REFRESH_INTERVALS.fast,
    container: 'system-performance-widget'
  },
  recentActivity: {
    api: API_ENDPOINTS.apiAnalyticsMetrics,
    refresh: REFRESH_INTERVALS.normal,
    container: 'recent-activity-widget'
  },
  liveBets: {
    api: API_ENDPOINTS.apiF402MissionControl,
    refresh: REFRESH_INTERVALS.normal,
    container: 'live-bets-widget'
  },
  agentPerformance: {
    api: API_ENDPOINTS.apiF402MissionControl,
    refresh: REFRESH_INTERVALS.normal,
    container: 'agent-performance-widget'
  },
  customerPulse: {
    api: API_ENDPOINTS.apiF402MissionControl,
    refresh: REFRESH_INTERVALS.normal,
    container: 'customer-pulse-widget'
  },
  transactionTicker: {
    api: API_ENDPOINTS.apiF402MissionControl,
    refresh: REFRESH_INTERVALS.normal,
    container: 'transaction-ticker-widget'
  },
  dnsHealth: {
    api: API_ENDPOINTS.apiHealthDns,
    refresh: REFRESH_INTERVALS.slow,
    container: 'dns-health-widget'
  },
  cachePerformance: {
    api: API_ENDPOINTS.apiAnalyticsMetrics,
    refresh: REFRESH_INTERVALS.normal,
    container: 'cache-performance-widget'
  },
  agentHierarchyAnalytics: {
    api: API_ENDPOINTS.apiF402MissionControl,
    refresh: REFRESH_INTERVALS.normal,
    container: 'agent-hierarchy-analytics-widget'
  },
  playerInfo: {
    api: API_ENDPOINTS.apiF402PlayerInfo,
    refresh: REFRESH_INTERVALS.normal,
    container: 'player-info-widget'
  },
  playerPerformance: {
    api: API_ENDPOINTS.apiF402PlayerPerformance,
    refresh: REFRESH_INTERVALS.normal,
    container: 'player-performance-widget'
  },
  transactionList: {
    api: API_ENDPOINTS.apiF402TransactionList,
    refresh: REFRESH_INTERVALS.normal,
    container: 'transaction-list-widget'
  },
  pendingWagers: {
    api: API_ENDPOINTS.apiF402PendingWagers,
    refresh: REFRESH_INTERVALS.normal,
    container: 'pending-wagers-widget'
  },
  playerAnalysis: {
    api: API_ENDPOINTS.apiPlayerAnalysis,
    refresh: REFRESH_INTERVALS.normal,
    container: 'player-analysis-widget'
  },
  transactionHistory: {
    api: API_ENDPOINTS.apiTransactionHistory,
    refresh: REFRESH_INTERVALS.normal,
    container: 'transaction-history-widget'
  }
};

