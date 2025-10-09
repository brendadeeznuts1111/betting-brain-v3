# Code Quality Standards - Betting-Brain v3

**Version:** 1.0.0
**Last Updated:** 2025-10-08
**Status:** ✅ Actively Enforced

---

## 📋 Table of Contents

- [Overview](#overview)
- [Type Safety Standards](#type-safety-standards)
- [Constants & Configuration](#constants--configuration)
- [Logging Standards](#logging-standards)
- [Error Handling Standards](#error-handling-standards)
- [Code Duplication](#code-duplication)
- [Database Patterns](#database-patterns)
- [Enforcement & CI](#enforcement--ci)
- [Migration Guide](#migration-guide)

---

## Overview

These standards raise the bar for code quality across the codebase. All new code MUST follow these standards, and existing code should be gradually migrated.

**Key Principles:**
1. **Type Safety First** - No `as any`, proper TypeScript typing
2. **Centralized Configuration** - All magic numbers in constants
3. **Structured Logging** - Use `StructuredLogger`, not `console.log`
4. **DRY (Don't Repeat Yourself)** - Use utilities, eliminate duplication
5. **Explicit Error Handling** - Every error handled, never swallowed
6. **Testability** - All code must be testable

---

## Type Safety Standards

### ❌ Anti-Pattern: Type Assertions

```typescript
// ❌ BAD: Using 'as any' to bypass type checking
const result = (await query.all()) as any;
const data = result.results || [];

// ❌ BAD: Unsafe type casting
const metrics = { ...testData } as CostCapMetrics;

// ❌ BAD: Non-null assertion without guard
const value = data!.field;
```

### ✅ Best Practice: Proper Typing

```typescript
// ✅ GOOD: Use type guards
function isValidResult(result: unknown): result is QueryResult {
  return typeof result === 'object' && result !== null && 'results' in result;
}

const result = await query.all();
const data = isValidResult(result) ? result.results : [];

// ✅ GOOD: Use utility functions
import { normalizeD1Result } from '../utils/request';
const data = normalizeD1Result<MyType>(await query.all());

// ✅ GOOD: Proper type definition
const metrics: CostCapMetrics = {
  requests: { current: 0, limit: TEST_LIMITS.REQUESTS, percentage: 0 },
  // ... all fields properly typed
};

// ✅ GOOD: Nullability check
const value = data?.field ?? defaultValue;
```

### Rule: No 'as any'

- **NEVER** use `as any` in production code
- Use type guards, utility functions, or proper interfaces
- If TypeScript complains, fix the types, don't silence the error
- Exception: Test mocks only (use `vi.fn() as any` sparingly)

---

## Constants & Configuration

### ❌ Anti-Pattern: Magic Numbers

```typescript
// ❌ BAD: Magic numbers scattered in code
if (percentage > 90) { ... }
if (size > 5000000000) { ... }
const requestId = Date.now().toString(36);
```

### ✅ Best Practice: Centralized Constants

```typescript
// ✅ GOOD: Use constants from centralized file
import { COST_CAP_THRESHOLDS, REQUEST_ID } from '../shared/constants';

if (percentage > COST_CAP_THRESHOLDS.WARNING_PERCENTAGE) { ... }
if (size > COST_CAP_THRESHOLDS.D1_SIZE_LIMIT) { ... }
const requestId = Date.now().toString(REQUEST_ID.TIMESTAMP_RADIX);

// ✅ EVEN BETTER: Use utility functions
import { generateRequestId } from '../utils/request';
const requestId = generateRequestId();
```

### Rule: All Configuration in Constants File

- **Location:** `src/shared/constants.ts`
- **Categories:** Test limits, thresholds, timeouts, retry config, TTL, etc.
- **Naming:** Use SCREAMING_SNAKE_CASE for constants
- **Documentation:** Add JSDoc comments explaining purpose
- **Types:** Export types for all constant objects

**Example:**

```typescript
// src/shared/constants.ts
export const COST_CAP_THRESHOLDS = {
  /** Warning threshold percentage (90% = trigger warning) */
  WARNING_PERCENTAGE: 90,

  /** Critical threshold percentage (95% = block requests) */
  CRITICAL_PERCENTAGE: 95,
} as const;

export type CostCapThresholds = typeof COST_CAP_THRESHOLDS;
```

---

## Logging Standards

### ❌ Anti-Pattern: Console Logging

```typescript
// ❌ BAD: Using console.log/error
console.log(`[${requestId}] Processing request...`);
console.error('Error:', error);
console.log('DEBUG:', someVariable);
```

### ✅ Best Practice: Structured Logging

```typescript
// ✅ GOOD: Use StructuredLogger
import { createLogger } from '../utils/logger';

const logger = createLogger(request);
logger.info('request_processing_started', {
  requestId,
  path: request.url,
  method: request.method
});

logger.error('processing_failed', {
  requestId,
  errorCode: error.code
}, error);

logger.debug('variable_state', {
  someVariable,
  otherData
});
```

### Rule: Structured Logging Only

- **NEVER** use `console.log` or `console.error` in production code
- **ALWAYS** use `StructuredLogger` from `src/utils/logger.ts`
- **Benefits:**
  - Searchable in log aggregators
  - Automatic trace ID tracking
  - JSON format for LogExplorer
  - Performance metrics built-in

**Creating Loggers:**

```typescript
// From request
const logger = createLogger(request);

// With additional context
const logger = createLogger(request, { operation: 'processOrder' });

// Add context later
const orderLogger = logger.withContext({ orderId: '123' });

// Performance timing
const timer = performanceTimer(logger, 'db_query');
const result = await db.query(...);
timer.end({ rows: result.length });
```

---

## Error Handling Standards

### ❌ Anti-Pattern: Swallowed Errors

```typescript
// ❌ BAD: Empty catch block
try {
  await riskyOperation();
} catch (error) {
  // Silent failure - NO!
}

// ❌ BAD: Generic error handling
try {
  await operation();
} catch (error) {
  console.error('Error:', error);
  return null;
}
```

### ✅ Best Practice: Explicit Error Handling

```typescript
// ✅ GOOD: Proper error handling
import { createErrorResponse, APIError, ErrorCode } from '../utils/error-handler';

try {
  await riskyOperation();
} catch (error) {
  logger.error('risky_operation_failed', { operation: 'processData' }, error as Error);

  return createErrorResponse(
    error as Error,
    requestId,
    request.url
  );
}

// ✅ GOOD: Specific error types
if (!params.eid) {
  throw new APIError(
    ErrorCode.VALIDATION_ERROR,
    'Event ID is required',
    400,
    { field: 'eid' }
  );
}

// ✅ GOOD: Retryable vs non-retryable
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    // Don't retry validation errors
    if (error.name === 'ZodError' || error.message.includes('validation')) {
      return false;
    }
    // Retry network errors
    if (error.message.includes('timeout') || error.message.includes('network')) {
      return true;
    }
  }
  return true; // Default to retryable
}
```

### Rule: Error Handling Requirements

1. **Never swallow errors** - Always log or propagate
2. **Use typed errors** - Use `APIError` class for known errors
3. **Provide context** - Include operation name, parameters in logs
4. **Classify errors** - Retryable vs non-retryable
5. **User-friendly messages** - Don't expose internal details

---

## Code Duplication

### ❌ Anti-Pattern: Repeated Code

```typescript
// ❌ BAD: Request ID generation repeated 26 times
const requestId = Date.now().toString(36);

// ❌ BAD: D1 result normalization repeated 5+ times
const data = Array.isArray(result) ? result : result?.results || [];

// ❌ BAD: CORS headers repeated 10+ times
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  // ...
};
```

### ✅ Best Practice: Centralized Utilities

```typescript
// ✅ GOOD: Use utilities from src/utils/request.ts

import {
  generateRequestId,
  normalizeD1Result,
  CORS_HEADERS,
  createJSONResponse,
  createOPTIONSResponse
} from '../utils/request';

// Request ID
const requestId = generateRequestId();

// D1 normalization
const data = normalizeD1Result<MyType>(result);

// CORS response
if (request.method === 'OPTIONS') {
  return createOPTIONSResponse();
}

// JSON response with CORS
return createJSONResponse({ success: true, data });
```

### Rule: DRY (Don't Repeat Yourself)

- **Threshold:** If code appears 3+ times, create a utility
- **Location:** `src/utils/` for general utilities
- **Documentation:** Add JSDoc with examples
- **Testing:** All utilities must have unit tests

---

## Database Patterns

### ❌ Anti-Pattern: Unsafe Database Queries

```typescript
// ❌ BAD: No error handling
const result = await env.ANALYTICS.prepare(query).all();
const data = result.results;

// ❌ BAD: No timeout
const result = await stmt.bind(...params).first();

// ❌ BAD: SQL injection risk
const query = `SELECT * FROM users WHERE id = ${userId}`;
```

### ✅ Best Practice: Safe Database Operations

```typescript
// ✅ GOOD: Use DatabaseHelper
import { createDatabaseHelper } from '../utils/database';

const db = createDatabaseHelper(env);
const data = await db.executeQuery<MyType>(
  'SELECT * FROM table WHERE id = ?',
  [userId],
  { retry: 3, timeout: 5000 }
);

// ✅ GOOD: Normalize results
import { normalizeD1Result, normalizeD1First } from '../utils/request';

const rows = normalizeD1Result<MyType>(await stmt.all());
const row = normalizeD1First<MyType>(await stmt.first());

// ✅ GOOD: Batch operations
const db = createDatabaseHelper(env);
const result = await db.executeBatch([
  { query: 'INSERT INTO table VALUES (?, ?)', params: [1, 'a'] },
  { query: 'INSERT INTO table VALUES (?, ?)', params: [2, 'b'] },
]);
```

### Rule: Database Best Practices

1. **Always use parameterized queries** - Never string concatenation
2. **Always handle errors** - Wrap in try/catch
3. **Always set timeouts** - Default 5s for queries
4. **Always normalize results** - Use `normalizeD1Result()`
5. **Use DatabaseHelper** - For retry logic and error handling

---

## Enforcement & CI

### Automated Checks

1. **TypeScript Strict Mode**
   ```bash
   bun run type-check  # Must pass with 0 errors
   ```

2. **ESLint Rules** (`.eslintrc.json`)
   - `no-explicit-any`: error
   - `no-console`: warn (except test files)
   - `@typescript-eslint/no-unsafe-assignment`: error
   - `@typescript-eslint/no-unsafe-member-access`: error

3. **ast-grep Security Scan**
   ```bash
   sg scan src/  # Must have 0 blocking violations
   ```

4. **Test Coverage**
   ```bash
   bun test:coverage  # Must maintain ≥80% line coverage
   ```

### Pre-Commit Hooks

Located in `.husky/pre-commit`:
```bash
#!/bin/sh
bun run type-check
bun run lint
sg scan src/ --error
bun test
```

### CI/CD Pipeline

Located in `.github/workflows/deploy.yml`:
```yaml
- name: Quality Checks
  run: |
    bun run type-check
    bun run lint
    sg scan src/
    bun test --coverage
```

---

## Migration Guide

### For Existing Code

**Priority Order:**

1. **High Priority** (Fix Immediately)
   - Remove all `as any` assertions
   - Fix unsafe type casts
   - Add error handling to all try/catch blocks

2. **Medium Priority** (Fix in Next PR)
   - Replace console.log with StructuredLogger
   - Extract magic numbers to constants
   - Use utility functions (requestId, D1 normalization)

3. **Low Priority** (Gradual Migration)
   - Add JSDoc comments
   - Improve test coverage to ≥80%
   - Refactor large functions

### Migration Checklist

- [ ] Replace `as any` with proper types
- [ ] Replace `console.log` with `StructuredLogger`
- [ ] Extract magic numbers to `constants.ts`
- [ ] Use `generateRequestId()` instead of `Date.now().toString(36)`
- [ ] Use `normalizeD1Result()` for D1 queries
- [ ] Use `CORS_HEADERS` instead of defining inline
- [ ] Add error handling with `createErrorResponse()`
- [ ] Add JSDoc comments for public functions
- [ ] Add unit tests (≥80% coverage)
- [ ] Run `bun run type-check` - must pass
- [ ] Run `bun test` - must pass

### Example Migration

**Before:**
```typescript
export async function handler(request: Request, env: any) {
  const requestId = Date.now().toString(36);
  console.log(`[${requestId}] Processing...`);

  try {
    const result = await env.ANALYTICS.prepare('SELECT * FROM table').all();
    const data = (result as any).results || [];

    if (data.length > 90) {
      return new Response(JSON.stringify({ error: 'Too many results' }), {
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        }
      });
    }

    return new Response(JSON.stringify(data), {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 });
  }
}
```

**After:**
```typescript
import { Env } from '../types/api';
import { createLogger } from '../utils/logger';
import {
  generateRequestId,
  normalizeD1Result,
  createJSONResponse,
  createErrorResponse
} from '../utils/request';
import { PAGINATION } from '../shared/constants';

export async function handler(request: Request, env: Env): Promise<Response> {
  const requestId = generateRequestId();
  const logger = createLogger(request, { operation: 'handler' });

  logger.info('processing_started', { requestId });

  try {
    const result = await env.ANALYTICS.prepare('SELECT * FROM table').all();
    const data = normalizeD1Result<TableRow>(result);

    if (data.length > PAGINATION.MAX_LIMIT) {
      logger.warn('result_limit_exceeded', {
        count: data.length,
        limit: PAGINATION.MAX_LIMIT
      });

      return createErrorResponse(
        'Too many results',
        400,
        'PAGINATION_EXCEEDED',
        requestId
      );
    }

    logger.info('processing_completed', {
      requestId,
      rowCount: data.length
    });

    return createJSONResponse({ success: true, data }, 200);
  } catch (error) {
    logger.error('processing_failed', { requestId }, error as Error);
    return createErrorResponse(error as Error, requestId, request.url);
  }
}
```

---

## Additional Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [ESLint Rules](https://eslint.org/docs/rules/)
- [Cloudflare Workers Best Practices](https://developers.cloudflare.com/workers/platform/best-practices)
- [Error Handling Patterns](.cursor/rules/api-patterns.mdc)
- [Testing Guide](./guides/TESTING_GUIDE.md)
- [Cursor Rules](./CURSOR_RULES.md)

---

**Status:** These standards are actively enforced in CI/CD. All new code must comply.
**Violations:** Will block PR merges
**Questions:** See [CURSOR_RULES.md](./CURSOR_RULES.md) or create an issue
