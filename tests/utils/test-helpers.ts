/**
 * Test Utilities and Helpers
 * 
 * Provides shared utilities for test isolation, mock management,
 * and common test patterns to prevent test pollution.
 */

import { vi, expect } from "bun:test";
import type { Env } from '../../src/types/api';
import { createAnalyticsEngineStub, type AnalyticsEngineStub } from './analytics-engine-stub';
import { getGlobalAnalyticsStub } from '../setup/test-setup';

/**
 * Creates a clean mock environment for tests
 * Returns both the mock environment and the analytics stub for call tracking
 */
export function createMockEnv(): { env: Env; analytics: AnalyticsEngineStub } {
  const analyticsStub = getGlobalAnalyticsStub() ?? createAnalyticsEngineStub();

  const env: Env = {
    ANALYTICS: {
      prepare: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue({ count: 0 }),
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockResolvedValue({ results: [] }),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ count: 0 }),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue({ results: [] })
        })
      }),
      exec: vi.fn().mockResolvedValue({ success: true })
    } as any,
    STEAM_WEBHOOK: {
      send: vi.fn().mockResolvedValue({ success: true })
    } as any,
    QUEUE_PRODUCER: {
      send: vi.fn().mockResolvedValue({ success: true })
    } as any,
    ANALYTICS_ENGINE: {
      writeDataPoint: analyticsStub.writeDataPoint.bind(analyticsStub)
    } as any,
    BET_TICKER_RAW: {
      put: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue(undefined),
      list: vi.fn().mockResolvedValue({ keys: [] })
    } as any
  };

  return { env, analytics: analyticsStub };
}

/**
 * Creates a clean mock execution context
 */
export function createMockCtx(): ExecutionContext {
  return {
    waitUntil: vi.fn(),
    passUntil: vi.fn(),
    passThroughOnException: vi.fn()
  } as any;
}

/**
 * Resets all mocks to clean state
 */
export function resetAllMocks(mockEnv: Env, mockCtx: ExecutionContext): void {
  vi.resetAllMocks();

  // Reset environment mocks
  (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
    first: vi.fn().mockResolvedValue({ count: 0 }),
    run: vi.fn().mockResolvedValue({ success: true }),
    all: vi.fn().mockResolvedValue({ results: [] }),
    bind: vi.fn().mockReturnValue({
      first: vi.fn().mockResolvedValue({ count: 0 }),
      run: vi.fn().mockResolvedValue({ success: true }),
      all: vi.fn().mockResolvedValue({ results: [] })
    })
  });

  (mockEnv.STEAM_WEBHOOK.send as any).mockResolvedValue({ success: true });
  (mockEnv.QUEUE_PRODUCER.send as any).mockResolvedValue({ success: true });
  (mockEnv.ANALYTICS_ENGINE.writeDataPoint as any).mockResolvedValue(undefined);

  // Reset context mocks
  (mockCtx.waitUntil as any).mockClear();
  (mockCtx.passThroughOnException as any).mockClear();
}

/**
 * Safely reads response body without reuse issues
 */
export async function readResponseBody(response: Response): Promise<any> {
  const clonedResponse = response.clone();
  return await clonedResponse.json();
}

/**
 * Creates a mock request with proper URL parsing
 */
export function createMockRequest(url: string, options?: RequestInit): Request {
  return new Request(url, {
    method: 'GET',
    ...options
  });
}

/**
 * Creates a mock line movement data
 */
export function createMockLineMovement(overrides: Partial<any> = {}): any {
  return {
    eid: 'nba_123',
    mt: 'SPREAD',
    lb: 5.5,
    la: 6.0,
    vb: 10000,
    va: 15000,
    ts: new Date().toISOString(),
    ing: new Date().toISOString(),
    ...overrides
  };
}

/**
 * Creates a mock customer data
 */
export function createMockCustomer(overrides: Partial<any> = {}): any {
  return {
    cid: 'test-customer-1',
    clv: 1500,
    wr: 55,
    ao: 100,
    nb: 1500,
    ...overrides
  };
}

/**
 * Sets up mock for cost cap guard
 */
export async function setupCostCapMock(allowed: boolean = true, reason: string = 'OK'): Promise<void> {
  const { costCapGuard } = await import('../../src/guards/costCap');
  (costCapGuard.checkRequest as any).mockResolvedValue({
    allowed,
    reason
  });
}

/**
 * Sets up mock for database queries with specific results
 */
export function setupDatabaseMock(
  mockEnv: Env,
  queryResults: any[] = [],
  count: number = 0,
  shouldError: boolean = false
): void {
  if (shouldError) {
    (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
      first: vi.fn().mockRejectedValue(new Error('Database error')),
      run: vi.fn().mockRejectedValue(new Error('Database error')),
      all: vi.fn().mockRejectedValue(new Error('Database error')),
      bind: vi.fn().mockReturnValue({
        first: vi.fn().mockRejectedValue(new Error('Database error')),
        run: vi.fn().mockRejectedValue(new Error('Database error')),
        all: vi.fn().mockRejectedValue(new Error('Database error'))
      })
    });
  } else {
    (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
      first: vi.fn().mockResolvedValue({ count }),
      run: vi.fn().mockResolvedValue({ success: true }),
      all: vi.fn().mockResolvedValue({ results: queryResults }),
      bind: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue({ count }),
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockResolvedValue({ results: queryResults })
      })
    });
  }
}

/**
 * Sets up mock for cost cap queries (dbstat)
 */
export function setupCostCapMock(mockEnv: Env, size: number = 1000000, rows: number = 1000): void {
  (mockEnv.ANALYTICS.prepare as any).mockImplementation((query: string) => {
    // Handle cost cap queries (dbstat)
    if (query.includes('dbstat') || query.includes('SUM(pgsize)')) {
      return {
        first: async () => ({ size, rows }),
        bind: () => ({ first: async () => ({ size, rows }) }),
        run: async () => ({ success: true }),
        all: async () => []
      };
    }

    // Default mock for other queries
    return {
      first: async () => null,
      bind: () => ({ first: async () => null }),
      run: async () => ({ success: true }),
      all: async () => []
    };
  });
}

/**
 * Waits for all async operations to complete
 */
export async function waitForAsync(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * Creates a test timeout with cleanup
 */
export function createTestTimeout(ms: number = 5000): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Test timeout after ${ms}ms`)), ms);
  });
}

/**
 * Analytics testing helpers
 */

/**
 * Assert that analytics was called with specific data
 */
export function expectAnalyticsCall(
  analytics: AnalyticsEngineStub,
  expectedCall: {
    blobs?: string[];
    doubles?: number[];
    tags?: Record<string, string>;
  }
): void {
  expect(analytics.wasCalledWith(expectedCall)).toBe(true);
}

/**
 * Assert that analytics was called a specific number of times
 */
export function expectAnalyticsCallCount(analytics: AnalyticsEngineStub, expectedCount: number): void {
  expect(analytics.callCount()).toBe(expectedCount);
}

/**
 * Assert that analytics was called with a specific event type
 */
export function expectAnalyticsEventType(analytics: AnalyticsEngineStub, eventType: string): void {
  const calls = analytics.callsWithBlob(eventType);
  expect(calls.length).toBeGreaterThan(0);
}

/**
 * Get analytics calls for a specific event type
 */
export function getAnalyticsCallsForEvent(analytics: AnalyticsEngineStub, eventType: string) {
  return analytics.callsWithBlob(eventType);
}

/**
 * Assert that analytics was called with specific doubles values
 */
export function expectAnalyticsDoubles(
  analytics: AnalyticsEngineStub,
  expectedDoubles: number[],
  tolerance: number = 0.001
): void {
  const calls = analytics.getCalls();
  const found = calls.some(call =>
    call.doubles.length === expectedDoubles.length &&
    call.doubles.every((val, index) =>
      Math.abs(val - expectedDoubles[index]) < tolerance
    )
  );
  expect(found).toBe(true);
}

/**
 * Create a mock environment with analytics stub (backward compatibility)
 * @deprecated Use createMockEnv() instead for better analytics testing
 */
export function createMockEnvLegacy(): Env {
  const { env } = createMockEnv();
  return env;
}