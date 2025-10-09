/**
 * Fantasy402 Parser Utilities
 * Common helper functions for data parsing and normalization
 */

/**
 * Clean and trim string values
 */
export function cleanString(str: string | undefined | null): string {
  if (!str) return '';
  return String(str).trim();
}

/**
 * Safely parse float values with fallback
 */
export function safeParseFloat(value: string | number | undefined | null): number {
  if (value === undefined || value === null || value === '') {
    return 0;
  }

  if (typeof value === 'number') {
    return isNaN(value) ? 0 : value;
  }

  const parsed = Number(value);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Recursively normalize object keys and values
 * Trims strings and handles undefined/null values
 */
export function normalizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => normalizeObject(item));
  }

  if (typeof obj === 'object') {
    const normalized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        normalized[key] = value.trim();
      } else if (typeof value === 'object') {
        normalized[key] = normalizeObject(value);
      } else {
        normalized[key] = value;
      }
    }
    return normalized;
  }

  return obj;
}
