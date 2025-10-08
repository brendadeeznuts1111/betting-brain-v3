/**
 * Agent API Constants
 * Centralized constants for Fantasy402 agent routes
 */

// Cache TTL values (in seconds)
export const CACHE_TTL_7_DAYS = 86400 * 7;  // 604800 seconds
export const CACHE_TTL_1_DAY = 86400;       // 86400 seconds
export const CACHE_TTL_1_HOUR = 3600;       // 3600 seconds

// Query limits
export const DEFAULT_AGENT_QUERY_LIMIT = 100;
export const MAX_AGENT_QUERY_LIMIT = 2000;

// Percentage calculation
export const PERCENTAGE_MULTIPLIER = 100;

// Precision for float calculations
export const PERCENTAGE_PRECISION = 2;

// HTTP Status Codes
export const HTTP_STATUS_OK = 200;
export const HTTP_STATUS_BAD_REQUEST = 400;
export const HTTP_STATUS_NOT_FOUND = 404;
export const HTTP_STATUS_SERVICE_UNAVAILABLE = 503;
export const HTTP_STATUS_SERVER_ERROR = 500;
