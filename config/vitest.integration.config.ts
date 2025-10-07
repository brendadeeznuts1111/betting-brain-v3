import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/integration/**/*.test.ts', 'tests/queue-integration.test.ts'],
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
    testTimeout: 30000, // Longer timeout for integration tests
    setupFiles: ['tests/setup/integration.ts']
  }
});
