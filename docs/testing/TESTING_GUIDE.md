# 🧪 Testing Guide

## Overview

This guide covers the comprehensive testing strategy for Betting-Brain v3, including unit tests, integration tests, and end-to-end tests.

## Test Structure

```
tests/
├── unit/                    # Unit tests for individual components
│   ├── clv.test.ts         # CLV calculation tests
│   ├── hold.test.ts        # Hold percentage tests
│   ├── exposure.test.ts    # Exposure calculation tests
│   ├── sharp.test.ts       # Sharp score tests
│   ├── steam.test.ts       # Steam move detection tests
│   ├── formatting.test.ts  # Data formatting tests
│   ├── guards-error-paths.test.ts  # Guard error handling
│   └── utils-error-paths.test.ts  # Utility error handling
├── integration/            # Integration tests
│   ├── integration.test.ts # Main entry point tests
│   ├── queue-integration.test.ts # Queue processing tests
│   ├── schedule-implementation-detailed.test.ts # Schedule tests
│   ├── schedules-implementation.test.ts # Schedule tests
│   ├── scheduled.test.ts   # Scheduled job tests
│   ├── trigger-implementation-detailed.test.ts # Trigger tests
│   ├── triggers-implementation.test.ts # Trigger tests
│   └── triggers.test.ts    # Database trigger tests
├── e2e/                    # End-to-end tests (future)
├── setup/                  # Test setup and configuration
│   ├── test-setup.ts       # Global test setup
│   ├── integration.ts      # Integration test setup
│   ├── production.ts       # Production test setup
│   └── staging.ts          # Staging test setup
├── mocks/                  # Shared mocks and test data
│   ├── env.ts              # Environment mocks
│   └── data.ts             # Test data
└── utils/                  # Test utilities
    └── test-helpers.ts     # Common test helpers
```

## Running Tests

### All Tests
```bash
bun test
```

### Unit Tests Only
```bash
bun test:unit
```

### Integration Tests Only
```bash
bun test:integration
```

### End-to-End Tests
```bash
bun test:e2e
```

### Watch Mode
```bash
bun test:watch
```

### Coverage Report
```bash
bun test:ci
```

### Environment-Specific Tests
```bash
bun test:staging
bun test:prod
```

### AI-Friendly Test Output 🤖

**NEW:** Tests automatically run in quiet mode when AI environments are detected:

```bash
# Dedicated AI command (explicit)
bun run test:ai

# Or set environment variable
CLAUDECODE=1 bun test

# Auto-detected in Claude Code, Replit, etc.
bun run ci:local  # Automatically enables quiet mode
```

**Benefits:**
- ✅ Shows only test failures (not passing tests)
- ✅ Reduces output verbosity for AI context windows
- ✅ Preserves failure details and summaries
- ✅ Improves readability in AI sessions

**See:** [AI-Friendly Testing Guide](AI_FRIENDLY_TESTING.md) for complete details.

## Test Categories

### 1. Unit Tests (`tests/unit/`)

Test individual components in isolation:

- **CLV Tests**: Customer lifetime value calculations
- **Hold Tests**: Hold percentage calculations
- **Exposure Tests**: Risk exposure calculations
- **Sharp Tests**: Sharp score calculations
- **Steam Tests**: Steam move detection
- **Formatting Tests**: Data formatting utilities
- **Error Path Tests**: Error handling scenarios

### 2. Integration Tests (`tests/integration/`)

Test component interactions:

- **Main Entry Point**: Worker handler integration
- **Queue Processing**: Queue consumer integration
- **Schedule Implementation**: Scheduled job integration
- **Trigger Implementation**: Database trigger integration

### 3. End-to-End Tests (`tests/e2e/`)

Test complete workflows (future implementation):

- **API Endpoints**: Complete request/response cycles
- **Queue Workflows**: End-to-end queue processing
- **Schedule Workflows**: Complete scheduled job execution

## Test Utilities

### Mock Environment (`tests/mocks/env.ts`)

Provides consistent mocking across all tests:

```typescript
import { createMockEnv, createMockExecutionContext } from '../mocks/env';

const mockEnv = createMockEnv();
const mockCtx = createMockExecutionContext();
```

### Test Data (`tests/mocks/data.ts`)

Shared test data for consistent testing:

```typescript
import { mockLineMovement, mockCLVMetrics } from '../mocks/data';
```

### Test Helpers (`tests/utils/test-helpers.ts`)

Common testing patterns and utilities:

```typescript
import { createMockEnvironment, expectToThrow } from '../utils/test-helpers';
```

## Testing Patterns

### 1. Mock Setup Pattern

```typescript
describe('Component Tests', () => {
  let mockEnv: Env;
  let mockCtx: ExecutionContext;

  beforeEach(() => {
    mockEnv = createMockEnv();
    mockCtx = createMockExecutionContext();
  });
});
```

### 2. Error Testing Pattern

```typescript
it('should handle errors gracefully', async () => {
  vi.mocked(mockEnv.ANALYTICS.prepare).mockRejectedValue(new Error('Database error'));
  
  await expect(componentFunction(mockEnv)).rejects.toThrow('Database error');
});
```

### 3. Async Testing Pattern

```typescript
it('should process data asynchronously', async () => {
  const result = await componentFunction(mockEnv);
  
  expect(result).toBeDefined();
  expect(mockEnv.ANALYTICS_ENGINE.writeDataPoint).toHaveBeenCalled();
});
```

## Test Configuration

### Vitest Configuration

The main vitest configuration is in `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'miniflare',
    setupFiles: ['./tests/setup/test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html']
    }
  }
});
```

### Environment-Specific Configurations

- `config/vitest.staging.config.ts` - Staging environment tests
- `config/vitest.production.config.ts` - Production environment tests

## Coverage Requirements

### Minimum Coverage Targets

- **Unit Tests**: 90% line coverage
- **Integration Tests**: 80% line coverage
- **Overall**: 85% line coverage

### Coverage Exclusions

- Configuration files
- Documentation
- Migration scripts
- Test files themselves

## Best Practices

### 1. Test Isolation

- Each test should be independent
- Use `beforeEach` to reset state
- Clear mocks between tests

### 2. Descriptive Test Names

```typescript
// Good
it('should calculate CLV correctly for winning customer')

// Bad
it('should work')
```

### 3. Arrange-Act-Assert Pattern

```typescript
it('should process line movement', async () => {
  // Arrange
  const mockData = mockLineMovement;
  const mockEnv = createMockEnv();
  
  // Act
  const result = await processLineMovement(mockData, mockEnv);
  
  // Assert
  expect(result).toBeDefined();
  expect(mockEnv.ANALYTICS_ENGINE.writeDataPoint).toHaveBeenCalled();
});
```

### 4. Mock Validation

```typescript
it('should call correct methods', async () => {
  await componentFunction(mockEnv);
  
  expect(mockEnv.ANALYTICS.prepare).toHaveBeenCalledWith(
    expect.stringContaining('SELECT')
  );
  expect(mockEnv.ANALYTICS_ENGINE.writeDataPoint).toHaveBeenCalledTimes(1);
});
```

## Debugging Tests

### Running Individual Tests

```bash
bun test tests/unit/clv.test.ts
```

### Verbose Output

```bash
bun test --reporter=verbose
```

### Debug Mode

```bash
bun test --inspect-brk
```

## Continuous Integration

### GitHub Actions

Tests run automatically on:
- Pull requests
- Pushes to main branch
- Scheduled runs

### Pre-commit Hooks

Consider adding pre-commit hooks to run tests before commits:

```bash
npm install --save-dev husky lint-staged
```

## Troubleshooting

### Common Issues

1. **Mock Not Working**: Ensure mocks are set up in `beforeEach`
2. **Async Timeouts**: Increase timeout in test configuration
3. **Environment Issues**: Check miniflare environment setup

### Debug Tips

1. Use `console.log` in tests for debugging
2. Check mock call counts with `toHaveBeenCalledTimes`
3. Verify mock implementations with `toHaveBeenCalledWith`

## Future Improvements

### Planned Enhancements

1. **E2E Tests**: Complete workflow testing
2. **Performance Tests**: Load and stress testing
3. **Visual Tests**: Dashboard and UI testing
4. **Security Tests**: Penetration testing

### Test Automation

1. **Auto-generated Tests**: From OpenAPI specifications
2. **Property-based Testing**: Using fast-check
3. **Mutation Testing**: Using Stryker
4. **Visual Regression**: Using Percy or Chromatic
