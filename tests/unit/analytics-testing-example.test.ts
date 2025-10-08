/**
 * Example Test: Analytics Engine Testing with Stub
 * 
 * Demonstrates the new analytics testing pattern:
 * - AnalyticsEngineStub for first-class call tracking
 * - analytics.calls() instead of toHaveBeenCalledWith
 * - Auto-flush on failure for analytics tests
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { createMockEnv, expectAnalyticsCall, expectAnalyticsCallCount } from '../utils/test-helpers';
import { setCurrentTestName } from '../setup/test-setup';

describe('Analytics Testing Example', () => {
    let mockEnv: any;
    let analytics: any;

    beforeEach(() => {
        const mock = createMockEnv();
        mockEnv = mock.env;
        analytics = mock.analytics;
    });

    test('should track analytics calls with stub', async () => {
        setCurrentTestName('should track analytics calls with stub');
        // Simulate some function that calls analytics
        await mockEnv.ANALYTICS_ENGINE.writeDataPoint({
            blobs: ['test_event', 'line_movement'],
            doubles: [1.5, 1000],
            tags: { source: 'test' }
        });

        // Use analytics.getCalls() instead of toHaveBeenCalledWith
        expect(analytics.callCount()).toBe(1);

        const calls = analytics.getCalls();
        expect(calls).toHaveLength(1);
        expect(calls[0].blobs).toEqual(['test_event', 'line_movement']);
        expect(calls[0].doubles).toEqual([1.5, 1000]);
        expect(calls[0].tags).toEqual({ source: 'test' });
    });

    test('should use analytics testing helpers', async () => {
        setCurrentTestName('should use analytics testing helpers');
        // Make multiple analytics calls
        await mockEnv.ANALYTICS_ENGINE.writeDataPoint({
            blobs: ['event1', 'type1'],
            doubles: [100, 200]
        });

        await mockEnv.ANALYTICS_ENGINE.writeDataPoint({
            blobs: ['event2', 'type2'],
            doubles: [300, 400]
        });

        // Use helper functions for cleaner assertions
        expectAnalyticsCallCount(analytics, 2);

        expectAnalyticsCall(analytics, {
            blobs: ['event1', 'type1'],
            doubles: [100, 200]
        });

        expectAnalyticsCall(analytics, {
            blobs: ['event2', 'type2'],
            doubles: [300, 400]
        });
    });

    test('should filter calls by event type', async () => {
        setCurrentTestName('should filter calls by event type');
        await mockEnv.ANALYTICS_ENGINE.writeDataPoint({
            blobs: ['nba_123', 'line_movement'],
            doubles: [1.5, 1000]
        });

        await mockEnv.ANALYTICS_ENGINE.writeDataPoint({
            blobs: ['nfl_456', 'line_movement'],
            doubles: [2.0, 1500]
        });

        await mockEnv.ANALYTICS_ENGINE.writeDataPoint({
            blobs: ['nba_123', 'exposure_update'],
            doubles: [5000, 3000]
        });

        // Filter calls by event ID
        const nbaCalls = analytics.callsWithBlob('nba_123');
        expect(nbaCalls).toHaveLength(2);

        // Filter calls by event type
        const lineMovementCalls = analytics.callsWithBlob('line_movement');
        expect(lineMovementCalls).toHaveLength(2);

        const exposureCalls = analytics.callsWithBlob('exposure_update');
        expect(exposureCalls).toHaveLength(1);
    });

    test('should get call statistics', async () => {
        setCurrentTestName('should get call statistics');
        await mockEnv.ANALYTICS_ENGINE.writeDataPoint({
            blobs: ['event1', 'type1'],
            doubles: [100, 200]
        });

        await mockEnv.ANALYTICS_ENGINE.writeDataPoint({
            blobs: ['event2', 'type2'],
            doubles: [300, 400, 500]
        });

        const stats = analytics.getStats();
        expect(stats.totalCalls).toBe(2);
        expect(stats.eventTypes).toEqual({
            'event1': 1,
            'event2': 1
        });
        expect(stats.averageDoublesPerCall).toBe(2.5); // (2 + 3) / 2
    });

    test('should clear calls between tests', async () => {
        setCurrentTestName('should clear calls between tests');
        // This test should start with clean analytics
        expect(analytics.callCount()).toBe(0);

        await mockEnv.ANALYTICS_ENGINE.writeDataPoint({
            blobs: ['test_event'],
            doubles: [100]
        });

        expect(analytics.callCount()).toBe(1);
    });

    test('should handle analytics flush', async () => {
        setCurrentTestName('should handle analytics flush');
        await mockEnv.ANALYTICS_ENGINE.writeDataPoint({
            blobs: ['test_event'],
            doubles: [100]
        });

        expect(analytics.callCount()).toBe(1);

        // Flush should clear the calls
        await analytics.flush();
        expect(analytics.callCount()).toBe(0);
    });
});
