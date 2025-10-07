/**
 * Integration test setup
 * Configures environment for integration testing
 */

import { beforeAll, afterAll } from 'vitest';

// Mock Cloudflare environment for integration tests
const mockEnv = {
  ANALYTICS: {
    prepare: (query: string) => ({
      bind: (...params: any[]) => ({
        first: async () => null,
        all: async () => [],
        run: async () => ({ success: true })
      }),
      first: async () => null,
      all: async () => [],
      run: async () => ({ success: true })
    })
  },
  LINE_INGRESS: {
    send: async (messages: any[]) => ({ success: true })
  },
  STEAM_WEBHOOK: {
    send: async (messages: any[]) => ({ success: true })
  },
  ANALYTICS_ENGINE: {
    writeDataPoint: async (data: any) => ({ success: true })
  }
};

beforeAll(async () => {
  // Setup integration test environment
  console.log('Setting up integration test environment...');
  
  // Mock global environment
  (global as any).env = mockEnv;
  
  // Setup test database
  // Add database setup logic here
  
  console.log('Integration test environment ready');
});

afterAll(async () => {
  // Cleanup integration test environment
  console.log('Cleaning up integration test environment...');
  
  // Cleanup test database
  // Add database cleanup logic here
  
  console.log('Integration test environment cleaned up');
});
