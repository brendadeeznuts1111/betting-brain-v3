import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'miniflare',
    environmentOptions: {
      bindings: {
        ANALYTICS: {},
        LINE_INGRESS: {},
        STEAM_WEBHOOK: {},
        ANALYTICS_ENGINE: {}
      }
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        'scripts/',
        'migrations/',
        'docs/',
        'deployment/',
        'monitoring/',
        'config/',
        'coverage/',
        'dist/',
        '*.config.ts',
        '*.config.js'
      ]
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 10000
  }
});