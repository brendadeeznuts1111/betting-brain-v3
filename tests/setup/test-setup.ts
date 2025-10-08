/**
 * Global test setup and configuration
 * Runs before all tests to configure the testing environment
 * 
 * Features:
 * - Quiet testing support for AI environments
 * - Test caching and smart skipping
 * - Analytics engine stub management
 * - Performance monitoring
 */

import { vi, beforeAll, beforeEach, afterEach, expect } from 'bun:test';
import { createAnalyticsEngineStub } from '../utils/analytics-engine-stub';
import { testConfig } from './quiet-test-setup';
import { testCache } from './test-cache';

// Global analytics stub instance
let globalAnalyticsStub: ReturnType<typeof createAnalyticsEngineStub> | null = null;
let currentTestName: string = '';
let testStartTime: number = 0;

// Quiet mode detection
const isQuietMode = testConfig.isQuietMode;

export function getGlobalAnalyticsStub() {
  return globalAnalyticsStub;
}

export function setCurrentTestName(name: string) {
  currentTestName = name;
}

// Test result tracking for cache
export function setTestResult(passed: boolean) {
  if (typeof globalThis !== 'undefined') {
    (globalThis as any).lastTestResult = passed;
  }
}

// Global test configuration
beforeAll(() => {
  // Set up global test environment
  process.env.NODE_ENV = 'test';

  // Initialize quiet mode if needed
  if (isQuietMode) {
    // Override console methods for quiet mode
    const originalConsole = { ...console };

    console.log = (...args: any[]) => {
      // Only show errors and important info
      if (args[0]?.includes?.('✗') || args[0]?.includes?.('FAIL')) {
        originalConsole.log(...args);
      }
    };

    console.info = () => {}; // Suppress info logs
    console.debug = () => {}; // Suppress debug logs
  }

  // Note: Bun test doesn't need vi.setConfig
  // Test timeouts are configured in bunfig.toml
});

beforeEach(() => {
  // Track test start time
  testStartTime = Date.now();

  // Reset all mocks before each test (clears implementations AND call history)
  vi.resetAllMocks();

  // Reset console methods to avoid test pollution (unless in quiet mode)
  if (!isQuietMode) {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  }

  // Create fresh analytics stub for each test
  globalAnalyticsStub = createAnalyticsEngineStub();
});

afterEach(function () {
  // Record test result in cache
  if (currentTestName && testCache) {
    const duration = Date.now() - testStartTime;
    const testResult = (globalThis as any).lastTestResult;

    if (testResult !== undefined) {
      testCache.recordTestResult(
        currentTestName,
        (globalThis as any).currentTestFile || '',
        testResult,
        duration,
        (globalThis as any).currentTestCategory || 'unit'
      );
    }
  }

  if (currentTestName.toLowerCase().includes('analytics') && globalAnalyticsStub) {
    globalAnalyticsStub.flush();
  }

  if (!isQuietMode) {
    vi.restoreAllMocks();
  }
});

// Global error handling for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Global error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
