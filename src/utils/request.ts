/**
 * Request Utilities
 *
 * Common utilities for request handling, ID generation, and response formatting.
 * Eliminates code duplication across the codebase.
 *
 * @see docs/CURSOR_RULES.md - Request handling patterns
 */

import { REQUEST_ID, HTTP_STATUS } from '../shared/constants';

// =============================================================================
// Request ID Generation
// =============================================================================

/**
 * Generate unique request ID
 *
 * Uses timestamp converted to base-36 for shorter IDs.
 * Format: `Date.now().toString(36)` → e.g. "l8x9k2"
 *
 * @returns Unique request ID string (8-10 characters)
 *
 * @example
 * ```typescript
 * const requestId = generateRequestId();
 * console.log(`[${requestId}] Processing request...`);
 * // Output: [l8x9k2] Processing request...
 * ```
 */
export function generateRequestId(): string {
  return Date.now().toString(REQUEST_ID.TIMESTAMP_RADIX);
}

/**
 * Extract request ID from request headers or generate new one
 *
 * Checks for trace ID headers in this order:
 * 1. x-request-id
 * 2. x-trace-id
 * 3. cf-ray (Cloudflare Ray ID)
 * 4. Generate new ID
 *
 * @param request - Incoming request
 * @returns Request ID string
 *
 * @example
 * ```typescript
 * const requestId = getRequestId(request);
 * logger.info('request_received', { requestId });
 * ```
 */
export function getRequestId(request: Request): string {
  return (
    request.headers.get('x-request-id') ||
    request.headers.get('x-trace-id') ||
    request.headers.get('cf-ray') ||
    generateRequestId()
  );
}

// =============================================================================
// CORS Headers
// =============================================================================

/**
 * Standard CORS headers for all API responses
 *
 * Allows all origins (*) and common HTTP methods.
 * Use for all public API endpoints.
 *
 * @example
 * ```typescript
 * return new Response(JSON.stringify(data), {
 *   headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
 * });
 * ```
 */
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400', // 24 hours
} as const;

/**
 * Create CORS headers with custom origin
 *
 * @param origin - Allowed origin (default: '*')
 * @returns CORS headers object
 *
 * @example
 * ```typescript
 * const headers = createCORSHeaders('https://app.example.com');
 * ```
 */
export function createCORSHeaders(origin: string = '*'): Record<string, string> {
  return {
    ...CORS_HEADERS,
    'Access-Control-Allow-Origin': origin,
  };
}

/**
 * Create OPTIONS preflight response
 *
 * Standard response for CORS preflight requests.
 *
 * @param customHeaders - Additional headers to include
 * @returns Response with CORS headers
 *
 * @example
 * ```typescript
 * if (request.method === 'OPTIONS') {
 *   return createOPTIONSResponse();
 * }
 * ```
 */
export function createOPTIONSResponse(
  customHeaders: Record<string, string> = {}
): Response {
  return new Response(null, {
    status: HTTP_STATUS.NO_CONTENT,
    headers: { ...CORS_HEADERS, ...customHeaders },
  });
}

// =============================================================================
// D1 Result Normalization
// =============================================================================

/**
 * Normalize D1 query result
 *
 * D1 can return results in different formats:
 * - Array: `[{...}, {...}]`
 * - Object with results: `{ results: [{...}] }`
 * - Null/undefined
 *
 * This function normalizes all formats to a consistent array.
 *
 * @param result - D1 query result (any format)
 * @returns Normalized array of results
 *
 * @example
 * ```typescript
 * const stmt = env.ANALYTICS.prepare('SELECT * FROM table');
 * const rawResult = await stmt.all();
 * const rows = normalizeD1Result<MyType>(rawResult);
 * // rows is always MyType[], never null/undefined
 * ```
 */
export function normalizeD1Result<T = any>(result: any): T[] {
  if (!result) {
    return [];
  }

  if (Array.isArray(result)) {
    return result as T[];
  }

  if (result.results && Array.isArray(result.results)) {
    return result.results as T[];
  }

  return [];
}

/**
 * Normalize D1 first() result
 *
 * D1 first() can return:
 * - Object: `{...}`
 * - Null
 * - Undefined
 *
 * @param result - D1 first() result
 * @returns Normalized result or null
 *
 * @example
 * ```typescript
 * const stmt = env.ANALYTICS.prepare('SELECT * FROM table WHERE id = ?');
 * const rawResult = await stmt.bind(id).first();
 * const row = normalizeD1First<MyType>(rawResult);
 * // row is MyType | null, never undefined
 * ```
 */
export function normalizeD1First<T = any>(result: any): T | null {
  return result || null;
}

// =============================================================================
// Response Helpers
// =============================================================================

/**
 * Create JSON response with CORS headers
 *
 * Standard response format for all API endpoints.
 *
 * @param data - Response data (will be JSON stringified)
 * @param status - HTTP status code (default: 200)
 * @param additionalHeaders - Additional headers to include
 * @returns Response with JSON and CORS headers
 *
 * @example
 * ```typescript
 * return createJSONResponse({ success: true, data: results });
 * ```
 */
export function createJSONResponse(
  data: any,
  status: number = HTTP_STATUS.OK,
  additionalHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
      ...additionalHeaders,
    },
  });
}

/**
 * Create error response with CORS headers
 *
 * Standard error response format.
 *
 * @param message - Error message
 * @param status - HTTP status code (default: 500)
 * @param code - Error code (optional)
 * @param requestId - Request ID (optional)
 * @returns Response with error JSON and CORS headers
 *
 * @example
 * ```typescript
 * return createErrorResponse('Invalid parameters', 400, 'VALIDATION_ERROR', requestId);
 * ```
 */
export function createErrorResponse(
  message: string,
  status: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  code?: string,
  requestId?: string
): Response {
  return createJSONResponse(
    {
      error: code || 'ERROR',
      message,
      requestId,
      timestamp: new Date().toISOString(),
    },
    status
  );
}

// =============================================================================
// URL Parsing Helpers
// =============================================================================

/**
 * Extract path from request URL
 *
 * Removes base path prefix if specified.
 *
 * @param request - Incoming request
 * @param basePath - Base path to remove (e.g., '/api')
 * @returns Cleaned path
 *
 * @example
 * ```typescript
 * const path = extractPath(request, '/api');
 * // https://example.com/api/events → /events
 * ```
 */
export function extractPath(request: Request, basePath: string = ''): string {
  const url = new URL(request.url);
  return basePath ? url.pathname.replace(basePath, '') : url.pathname;
}

/**
 * Parse query parameters from request URL
 *
 * @param request - Incoming request
 * @returns URLSearchParams object
 *
 * @example
 * ```typescript
 * const params = parseQueryParams(request);
 * const limit = params.get('limit') || '20';
 * ```
 */
export function parseQueryParams(request: Request): URLSearchParams {
  const url = new URL(request.url);
  return url.searchParams;
}

/**
 * Get query parameter as string
 *
 * @param request - Incoming request
 * @param key - Parameter key
 * @param defaultValue - Default value if not found
 * @returns Parameter value or default
 *
 * @example
 * ```typescript
 * const limit = getQueryParam(request, 'limit', '20');
 * ```
 */
export function getQueryParam(
  request: Request,
  key: string,
  defaultValue?: string
): string | undefined {
  const params = parseQueryParams(request);
  return params.get(key) || defaultValue;
}

/**
 * Get query parameter as number
 *
 * @param request - Incoming request
 * @param key - Parameter key
 * @param defaultValue - Default value if not found or invalid
 * @returns Parameter value as number or default
 *
 * @example
 * ```typescript
 * const limit = getQueryParamNumber(request, 'limit', 20);
 * ```
 */
export function getQueryParamNumber(
  request: Request,
  key: string,
  defaultValue: number
): number {
  const value = getQueryParam(request, key);
  if (!value) return defaultValue;

  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Get query parameter as boolean
 *
 * Accepts: 'true', '1', 'yes', 'on' as true
 *
 * @param request - Incoming request
 * @param key - Parameter key
 * @param defaultValue - Default value if not found
 * @returns Parameter value as boolean or default
 *
 * @example
 * ```typescript
 * const includeHistory = getQueryParamBoolean(request, 'includeHistory', false);
 * ```
 */
export function getQueryParamBoolean(
  request: Request,
  key: string,
  defaultValue: boolean = false
): boolean {
  const value = getQueryParam(request, key);
  if (!value) return defaultValue;

  return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
}
