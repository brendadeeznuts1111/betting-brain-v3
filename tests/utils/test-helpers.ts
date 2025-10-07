/**
 * Test utility functions for common testing patterns
 */

import { vi } from 'vitest';
import type { Env } from '../../src/types/api';

/**
 * Creates a mock D1 database with realistic behavior
 */
export function createMockD1Database() {
  return {
    prepare: vi.fn().mockReturnValue({
      first: vi.fn().mockResolvedValue({ count: 0 }),
      run: vi.fn().mockResolvedValue({ success: true }),
      all: vi.fn().mockResolvedValue([]),
      bind: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue({ count: 0 }),
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockResolvedValue([])
      })
    }),
    exec: vi.fn().mockResolvedValue({ success: true })
  };
}

/**
 * Creates a mock Analytics Engine
 */
export function createMockAnalyticsEngine() {
  return {
    writeDataPoint: vi.fn().mockResolvedValue(undefined)
  };
}

/**
 * Creates a mock Queue
 */
export function createMockQueue() {
  return {
    send: vi.fn().mockResolvedValue({ success: true })
  };
}

/**
 * Creates a complete mock environment
 */
export function createMockEnvironment(): Env {
  return {
    ANALYTICS: createMockD1Database() as any,
    LINE_INGRESS: createMockQueue() as any,
    STEAM_WEBHOOK: createMockQueue() as any,
    ANALYTICS_ENGINE: createMockAnalyticsEngine() as any
  };
}

/**
 * Waits for a specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Creates a mock request with query parameters
 */
export function createMockRequest(url: string, method: string = 'GET'): Request {
  return new Request(url, { method });
}

/**
 * Asserts that a function throws an error with a specific message
 */
export async function expectToThrow(
  fn: () => Promise<any>,
  expectedMessage?: string
): Promise<void> {
  try {
    await fn();
    throw new Error('Expected function to throw');
  } catch (error) {
    if (expectedMessage && !error.message.includes(expectedMessage)) {
      throw new Error(`Expected error message to contain "${expectedMessage}", but got "${error.message}"`);
    }
  }
}

/**
 * Asserts that a function does not throw
 */
export async function expectNotToThrow(fn: () => Promise<any>): Promise<void> {
  try {
    await fn();
  } catch (error) {
    throw new Error(`Expected function not to throw, but it threw: ${error.message}`);
  }
}

/**
 * Creates a mock execution context
 */
export function createMockExecutionContext(): ExecutionContext {
  return {
    waitUntil: vi.fn(),
    passThroughOnException: vi.fn()
  } as any;
}

/**
 * Validates that an object has the expected structure
 */
export function validateObjectStructure(obj: any, expectedKeys: string[]): void {
  const actualKeys = Object.keys(obj);
  const missingKeys = expectedKeys.filter(key => !actualKeys.includes(key));
  const extraKeys = actualKeys.filter(key => !expectedKeys.includes(key));
  
  if (missingKeys.length > 0) {
    throw new Error(`Missing keys: ${missingKeys.join(', ')}`);
  }
  
  if (extraKeys.length > 0) {
    throw new Error(`Unexpected keys: ${extraKeys.join(', ')}`);
  }
}

/**
 * Creates a test timeout that can be cleared
 */
export function createTestTimeout(ms: number): { promise: Promise<never>; clear: () => void } {
  let timeoutId: NodeJS.Timeout;
  
  const promise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Test timeout after ${ms}ms`));
    }, ms);
  });
  
  return {
    promise,
    clear: () => clearTimeout(timeoutId)
  };
}
