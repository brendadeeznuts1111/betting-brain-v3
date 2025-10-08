/**
 * Centralized Application Constants
 *
 * All magic numbers, thresholds, and configuration values should be defined here.
 * This improves maintainability and makes the codebase more searchable.
 *
 * @see docs/CURSOR_RULES.md - Constants usage guidelines
 */

// =============================================================================
// Test Environment Limits
// =============================================================================

export const TEST_LIMITS = {
  /** Maximum requests for test bypass */
  REQUESTS: 9_999_999,

  /** Maximum D1 database size for test bypass (bytes) */
  D1_SIZE: 9_999_999,

  /** Maximum D1 rows for test bypass */
  D1_ROWS: 9_999_999,

  /** Maximum queue operations for test bypass */
  QUEUE_OPS: 9_999_999,

  /** Maximum analytics points for test bypass */
  ANALYTICS_POINTS: 9_999_999,
} as const;

// =============================================================================
// Cost Cap Thresholds
// =============================================================================

export const COST_CAP_THRESHOLDS = {
  /** Warning threshold percentage (90% = trigger warning) */
  WARNING_PERCENTAGE: 90,

  /** Critical threshold percentage (95% = block requests) */
  CRITICAL_PERCENTAGE: 95,

  /** D1 database size limit (5GB) */
  D1_SIZE_LIMIT: 5_000_000_000,

  /** D1 rows limit (50 million) */
  D1_ROWS_LIMIT: 50_000_000,

  /** Queue operations monthly limit (1 million) */
  QUEUE_OPS_LIMIT: 1_000_000,

  /** Analytics points monthly limit (25 million) */
  ANALYTICS_POINTS_LIMIT: 25_000_000,

  /** Requests daily limit (100k) */
  REQUESTS_DAILY_LIMIT: 100_000,
} as const;

// =============================================================================
// Rate Limiting
// =============================================================================

export const RATE_LIMITS = {
  /** Requests per second per IP */
  REQUESTS_PER_SECOND: 10,

  /** Window size for rate limit tracking (ms) */
  WINDOW_SIZE_MS: 1000,

  /** Maximum burst allowed */
  MAX_BURST: 20,
} as const;

// =============================================================================
// Timeouts
// =============================================================================

export const TIMEOUTS = {
  /** Default database query timeout (5 seconds) */
  DATABASE_QUERY: 5000,

  /** HTTP request timeout (30 seconds) */
  HTTP_REQUEST: 30_000,

  /** Queue message processing timeout (5 seconds for line-ingress) */
  QUEUE_LINE_INGRESS: 5000,

  /** Queue message processing timeout (10 seconds for steam-webhook) */
  QUEUE_STEAM_WEBHOOK: 10_000,

  /** Origin fetch timeout for BetTicker (30 seconds) */
  ORIGIN_FETCH: 30_000,

  /** Test timeout default (10 seconds) */
  TEST_DEFAULT: 10_000,
} as const;

// =============================================================================
// Retry Configuration
// =============================================================================

export const RETRY_CONFIG = {
  /** Default max retry attempts */
  MAX_ATTEMPTS: 3,

  /** Initial backoff delay (ms) */
  INITIAL_BACKOFF: 100,

  /** Backoff multiplier (exponential backoff) */
  BACKOFF_MULTIPLIER: 2,

  /** Maximum backoff delay (ms) */
  MAX_BACKOFF: 5000,
} as const;

// =============================================================================
// TTL (Time To Live) Settings
// =============================================================================

export const TTL = {
  /** Line movements TTL (7 days in seconds) */
  LINE_MOVEMENTS: 7 * 24 * 60 * 60,

  /** Steam deduplication TTL (5 minutes in seconds) */
  STEAM_DEDUPE: 5 * 60,

  /** BetTicker raw data TTL (7 days in seconds) */
  BET_TICKER_RAW: 7 * 24 * 60 * 60,

  /** Fantasy402 cache TTL (1 hour in seconds) */
  FANTASY_CACHE: 60 * 60,

  /** Session TTL (24 hours in seconds) */
  SESSION: 24 * 60 * 60,
} as const;

// =============================================================================
// Steam Detection Thresholds
// =============================================================================

export const STEAM_THRESHOLDS = {
  /** Critical: line change ≥ 2.0 AND volume > 1000 */
  CRITICAL: {
    LINE_CHANGE: 2.0,
    VOLUME: 1000,
  },

  /** High: line change ≥ 1.0 AND volume > 500 */
  HIGH: {
    LINE_CHANGE: 1.0,
    VOLUME: 500,
  },

  /** Medium: line change ≥ 0.5 AND volume > 100 */
  MEDIUM: {
    LINE_CHANGE: 0.5,
    VOLUME: 100,
  },

  /** Low: anything below medium */
  LOW: {
    LINE_CHANGE: 0.1,
    VOLUME: 10,
  },

  /** Sigma threshold for 3-sigma detection */
  SIGMA_THRESHOLD: 3,
} as const;

// =============================================================================
// Sharp Scoring Thresholds
// =============================================================================

export const SHARP_SCORE_THRESHOLDS = {
  /** Professional sharp (75-100) */
  PROFESSIONAL: 75,

  /** Advanced sharp (60-74) */
  ADVANCED: 60,

  /** Intermediate sharp (45-59) */
  INTERMEDIATE: 45,

  /** Casual sharp (30-44) */
  CASUAL: 30,

  /** Recreational (0-29) */
  RECREATIONAL: 0,

  /** Maximum score */
  MAX_SCORE: 100,
} as const;

// =============================================================================
// Anomaly Detection
// =============================================================================

export const ANOMALY_DETECTION = {
  /** Standard deviations for anomaly threshold */
  SIGMA_THRESHOLD: 2,

  /** Minimum data points required for detection */
  MIN_DATA_POINTS: 10,

  /** Confidence interval percentage (95%) */
  CONFIDENCE_INTERVAL: 95,

  /** Z-score for 95% confidence */
  Z_SCORE_95: 1.96,
} as const;

// =============================================================================
// Pagination & Limits
// =============================================================================

export const PAGINATION = {
  /** Default page size */
  DEFAULT_PAGE_SIZE: 20,

  /** Maximum page size */
  MAX_PAGE_SIZE: 100,

  /** Default limit for queries */
  DEFAULT_LIMIT: 50,

  /** Maximum limit for queries */
  MAX_LIMIT: 1000,

  /** Maximum top N results */
  MAX_TOP_N: 100,
} as const;

// =============================================================================
// Request ID Generation
// =============================================================================

export const REQUEST_ID = {
  /** Radix for timestamp conversion (base-36) */
  TIMESTAMP_RADIX: 36,

  /** Length of generated ID */
  ID_LENGTH: 8,
} as const;

// =============================================================================
// HTTP Status Codes (for reference)
// =============================================================================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

// =============================================================================
// Type Exports
// =============================================================================

export type TestLimits = typeof TEST_LIMITS;
export type CostCapThresholds = typeof COST_CAP_THRESHOLDS;
export type RateLimits = typeof RATE_LIMITS;
export type Timeouts = typeof TIMEOUTS;
export type RetryConfig = typeof RETRY_CONFIG;
export type TTLSettings = typeof TTL;
export type SteamThresholds = typeof STEAM_THRESHOLDS;
export type SharpScoreThresholds = typeof SHARP_SCORE_THRESHOLDS;
export type AnomalyDetectionConfig = typeof ANOMALY_DETECTION;
export type PaginationConfig = typeof PAGINATION;
export type RequestIdConfig = typeof REQUEST_ID;
export type HttpStatus = typeof HTTP_STATUS;
