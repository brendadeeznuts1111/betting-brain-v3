# Analytics Testing Guide

**Status:** ✅ Production Ready  
**Last Updated:** 2025-10-07

## Overview

This guide covers the new analytics testing pattern that makes Analytics Engine calls first-class citizens in Bun tests. No network, no flakes, no waiting.

## Key Features

- ✅ **AnalyticsEngineStub** - First-class call tracking without network dependencies
- ✅ **Auto-flush on failure** - Only spam console on analytics tests
- ✅ **analytics.calls()** - Clean assertions instead of `toHaveBeenCalledWith`
- ✅ **CI integration** - Runs `--coverage --randomize` with stub (fast)
- ✅ **Nightly jobs** - Deploys dry-run + real binding smoke test

## Quick Start

### 1. Basic Analytics Testing

```typescript
import { describe, test, expect, beforeEach } from 'bun:test';
import { createMockEnv, expectAnalyticsCall } from '../utils/test-helpers';

describe('My Analytics Test', () => {
  let mockEnv: any;
  let analytics: any;

  beforeEach(() => {
    const mock = createMockEnv();
    mockEnv = mock.env;
    analytics = mock.analytics;
  });

  test('should track analytics calls', async () => {
    // Your code that calls analytics
    await mockEnv.ANALYTICS_ENGINE.writeDataPoint({
      blobs: ['event_id', 'line_movement'],
      doubles: [1.5, 1000]
    });

    // Use analytics.getCalls() instead of toHaveBeenCalledWith
    expect(analytics.callCount()).toBe(1);
    expectAnalyticsCall(analytics, {
      blobs: ['event_id', 'line_movement'],
      doubles: [1.5, 1000]
    });
  });
});
```

### 2. Advanced Analytics Testing

```typescript
test('should filter calls by event type', async () => {
  // Make multiple calls
  await mockEnv.ANALYTICS_ENGINE.writeDataPoint({
    blobs: ['nba_123', 'line_movement'],
    doubles: [1.5, 1000]
  });

  await mockEnv.ANALYTICS_ENGINE.writeDataPoint({
    blobs: ['nfl_456', 'line_movement'],
    doubles: [2.0, 1500]
  });

  // Filter calls by event ID
  const nbaCalls = analytics.callsWithBlob('nba_123');
  expect(nbaCalls).toHaveLength(1);

  // Filter calls by event type
  const lineMovementCalls = analytics.callsWithBlob('line_movement');
  expect(lineMovementCalls).toHaveLength(2);
});
```

## API Reference

### AnalyticsEngineStub

#### Methods

```typescript
// Write a data point (stubbed)
await analytics.writeDataPoint({
  blobs: string[];
  doubles: number[];
  tags?: Record<string, string>;
});

// Get all calls
const calls = analytics.getCalls();

// Get calls filtered by blob content
const eventCalls = analytics.callsWithBlob('event_id');

// Get calls filtered by tag
const taggedCalls = analytics.callsWithTag('source', 'test');

// Get call count
const count = analytics.callCount();

// Check if specific call was made
const wasCalled = analytics.wasCalledWith({
  blobs: ['event_id'],
  doubles: [1.5]
});

// Get last call
const lastCall = analytics.lastCall();

// Clear all calls
analytics.clear();

// Flush calls (clears array)
await analytics.flush();
```

#### Statistics

```typescript
const stats = analytics.getStats();
// Returns:
// {
//   totalCalls: number;
//   eventTypes: Record<string, number>;
//   averageDoublesPerCall: number;
//   timeRange: { start: number; end: number } | null;
// }
```

### Test Helpers

```typescript
import {
  expectAnalyticsCall,
  expectAnalyticsCallCount,
  expectAnalyticsEventType,
  getAnalyticsCallsForEvent,
  expectAnalyticsDoubles
} from '../utils/test-helpers';

// Assert specific call was made
expectAnalyticsCall(analytics, {
  blobs: ['event_id', 'type'],
  doubles: [1.5, 1000]
});

// Assert call count
expectAnalyticsCallCount(analytics, 3);

// Assert event type was called
expectAnalyticsEventType(analytics, 'line_movement');

// Get calls for specific event
const calls = getAnalyticsCallsForEvent(analytics, 'event_id');

// Assert doubles values with tolerance
expectAnalyticsDoubles(analytics, [1.5, 1000], 0.001);
```

## Migration Guide

### From Old Pattern

**Before:**
```typescript
// Old way - using vi.fn() mocks
const mockEnv = {
  ANALYTICS_ENGINE: {
    writeDataPoint: vi.fn().mockResolvedValue(undefined)
  }
};

// Old assertions
expect(mockEnv.ANALYTICS_ENGINE.writeDataPoint).toHaveBeenCalledWith(
  expect.objectContaining({
    blobs: ['event_id', 'type']
  })
);
```

**After:**
```typescript
// New way - using analytics stub
const { env: mockEnv, analytics } = createMockEnv();

// New assertions
expectAnalyticsCall(analytics, {
  blobs: ['event_id', 'type']
});
```

### Updating Existing Tests

1. **Replace mock creation:**
   ```typescript
   // Old
   const mockEnv = createMockEnvLegacy();
   
   // New
   const { env: mockEnv, analytics } = createMockEnv();
   ```

2. **Replace assertions:**
   ```typescript
   // Old
   expect(mockEnv.ANALYTICS_ENGINE.writeDataPoint).toHaveBeenCalledTimes(2);
   
   // New
   expect(analytics.callCount()).toBe(2);
   ```

3. **Use helper functions:**
   ```typescript
   // Old
   expect(mockEnv.ANALYTICS_ENGINE.writeDataPoint).toHaveBeenCalledWith(
     expect.objectContaining({
       blobs: ['event_id', 'type'],
       doubles: [1.5, 1000]
     })
   );
   
   // New
   expectAnalyticsCall(analytics, {
     blobs: ['event_id', 'type'],
     doubles: [1.5, 1000]
   });
   ```

## CI/CD Integration

### Local Testing

```bash
# Run analytics tests
bun run analytics:test

# Run nightly analytics test
bun run analytics:nightly

# Test real binding (requires Cloudflare Workers environment)
bun run analytics:binding
```

### CI Configuration

The CI now runs tests with:
- `--coverage` - Code coverage reporting
- `--randomize` - Random test order for better reliability
- `--concurrent` - Parallel test execution

### Nightly Jobs

The nightly job runs:
1. **Dry-run tests** with AnalyticsEngineStub (fast, no network)
2. **Real binding smoke test** against actual analytics engine

## Best Practices

### 1. Test Isolation

```typescript
beforeEach(() => {
  const { env: mockEnv, analytics } = createMockEnv();
  // Each test gets a fresh analytics stub
});
```

### 2. Specific Assertions

```typescript
// Good - specific about what you're testing
expectAnalyticsCall(analytics, {
  blobs: ['nba_123', 'line_movement'],
  doubles: [1.5, 1000]
});

// Avoid - too generic
expect(analytics.callCount()).toBeGreaterThan(0);
```

### 3. Event Type Filtering

```typescript
// Good - filter by event type for clarity
const lineMovementCalls = analytics.callsWithBlob('line_movement');
expect(lineMovementCalls).toHaveLength(2);

// Avoid - checking all calls when you only care about specific ones
const allCalls = analytics.calls();
expect(allCalls.length).toBeGreaterThan(0);
```

### 4. Error Testing

```typescript
test('should handle analytics errors gracefully', async () => {
  // Mock analytics to throw error
  const { env: mockEnv, analytics } = createMockEnv();
  
  // Your code should handle the error
  await expect(yourFunction(mockEnv)).resolves.not.toThrow();
  
  // Analytics should still be called (or not, depending on your logic)
  expect(analytics.callCount()).toBe(0); // or whatever your expectation is
});
```

## Troubleshooting

### Common Issues

1. **Analytics calls not being tracked**
   - Ensure you're using `createMockEnv()` not `createMockEnvLegacy()`
   - Check that `analytics` variable is properly destructured

2. **Tests failing after migration**
   - Update assertions to use `analytics.calls()` instead of `toHaveBeenCalledWith`
   - Use helper functions for cleaner assertions

3. **Performance issues**
   - Analytics stub is much faster than real analytics engine
   - If tests are slow, check for other bottlenecks

### Debug Tips

```typescript
// Print all analytics calls for debugging
console.log('Analytics calls:', analytics.getCalls());

// Print call statistics
console.log('Analytics stats:', analytics.getStats());

// Print calls by event type
console.log('Calls by event:', analytics.callsByEventType());
```

## Related Files

- **[AnalyticsEngineStub](tests/utils/analytics-engine-stub.ts)** - Core stub implementation
- **[Test Helpers](tests/utils/test-helpers.ts)** - Helper functions for assertions
- **[Example Test](tests/unit/analytics-testing-example.test.ts)** - Complete example
- **[Nightly Job](scripts/nightly-analytics-test.ts)** - Nightly testing script
- **[Binding Test](scripts/test-analytics-binding.ts)** - Real binding smoke test

## Status Checklist

- [x] AnalyticsEngineStub committed
- [x] ANALYTICS_ENGINE swapped in beforeEach
- [x] Assertions use analytics.calls() instead of toHaveBeenCalledWith
- [x] CI still runs --coverage --randomize with stub (fast)
- [x] Nightly job deploys dry-run + real binding smoke test

**Result:** Analytics Engine calls become first-class citizens in Bun tests – no network, no flakes, no waiting. 🚀
