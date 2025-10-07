import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'miniflare',
    environmentOptions: {
      bindings: {
        ANALYTICS: 'test-d1-database'
      },
      kvNamespaces: ['TEST_NAMESPACE'],
      d1Databases: ['ANALYTICS']
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.spec.ts'
      ]
    },
    testTimeout: 10000
  }
});
