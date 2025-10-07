import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.spec.ts',
        'scripts/',
        'deploy/',
        'docs/',
        'grafana/',
        'migrations/',
        'tests/'
      ],
      include: [
        'src/**/*.ts'
      ]
    },
    testTimeout: 15000,
    setupFiles: ['tests/setup/staging.ts'],
    env: {
      NODE_ENV: 'staging',
      DEBUG: 'false',
      LOG_LEVEL: 'info'
    }
  }
});
