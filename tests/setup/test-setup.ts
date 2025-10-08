/**
 * Global test setup and configuration
 * Runs before all tests to configure the testing environment
 */

import { vi, beforeAll, beforeEach, afterEach, expect } from 'bun:test';
import { createAnalyticsEngineStub } from '../utils/analytics-engine-stub';

// Global analytics stub instance
let globalAnalyticsStub: ReturnType<typeof createAnalyticsEngineStub> | null = null;
let currentTestName: string = '';

export function getGlobalAnalyticsStub() {
  return globalAnalyticsStub;
}

export function setCurrentTestName(name: string) {
  currentTestName = name;
}

// Global test configuration
beforeAll(() => {
  // Set up global test environment
  process.env.NODE_ENV = 'test';

  // Note: Bun test doesn't need vi.setConfig
  // Test timeouts are configured in bunfig.toml
});

beforeEach(() => {
  // Reset all mocks before each test (clears implementations AND call history)
  vi.resetAllMocks();

  // Reset console methods to avoid test pollution
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});

  // Create fresh analytics stub for each test
  globalAnalyticsStub = createAnalyticsEngineStub();
});

afterEach(function () {
  if (currentTestName.toLowerCase().includes('analytics') && globalAnalyticsStub) {
    globalAnalyticsStub.flush();
  }
  vi.restoreAllMocks();
});

// Global error handling for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Global error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
