/**
 * Global test setup and configuration
 * Runs before all tests to configure the testing environment
 */

import { vi, beforeAll, beforeEach, afterEach } from 'bun:test';

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
});

afterEach(() => {
  // Restore console methods after each test
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
