/**
 * Quiet Testing System Test
 * 
 * Tests the new quiet testing system to ensure it works correctly
 * with AI environments and test caching.
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { testConfig, testCache } from '../setup/quiet-test-setup';
import { setCurrentTestName, setTestResult } from '../setup/test-setup';

describe('Quiet Testing System', () => {
    beforeEach(() => {
        // Set test environment to bypass rate limiting
        process.env.NODE_ENV = 'test';
        setCurrentTestName('quiet-testing-system');
    });

    test('should detect AI environments', () => {
        // Test AI environment detection
        expect(testConfig.isAIEnvironment).toBeDefined();
        expect(typeof testConfig.isAIEnvironment).toBe('boolean');
    });

    test('should support quiet mode', () => {
        // Test quiet mode configuration
        expect(testConfig.isQuietMode).toBeDefined();
        expect(typeof testConfig.isQuietMode).toBe('boolean');
    });

    test('should track test results', () => {
        // Test result tracking
        setTestResult(true);
        expect((globalThis as any).lastTestResult).toBe(true);

        setTestResult(false);
        expect((globalThis as any).lastTestResult).toBe(false);
    });

    test('should manage test cache', () => {
        // Test cache functionality
        expect(testCache).toBeDefined();
        expect(typeof testCache.shouldSkipTest).toBe('function');
        expect(typeof testCache.recordTestResult).toBe('function');
    });

    test('should provide test performance metrics', () => {
        // Test performance tracking
        const performance = testConfig.getTestPerformance();
        expect(performance).toBeDefined();
        expect(typeof performance.duration).toBe('number');
        expect(typeof performance.testsPerSecond).toBe('number');
    });

    test('should support test categories', () => {
        // Test category support
        expect(testConfig.trackTestResult).toBeDefined();
        expect(testConfig.shouldSkipTest).toBeDefined();
    });
});

describe('Test Cache System', () => {
    beforeEach(() => {
        setCurrentTestName('test-cache-system');
    });

    test('should record test results', () => {
        const testName = 'test-cache-recording';
        const filePath = 'tests/unit/quiet-testing.test.ts';

        // Record a test result
        testCache.recordTestResult(testName, filePath, true, 100, 'unit');

        // Check if test should be skipped (it should, since it passed)
        const shouldSkip = testCache.shouldSkipTest(testName, filePath);
        expect(shouldSkip).toBe(true);
    });

    test('should invalidate cache on file changes', () => {
        const testName = 'test-cache-invalidation';
        const filePath = 'tests/unit/quiet-testing.test.ts';

        // Record a test result
        testCache.recordTestResult(testName, filePath, true, 100, 'unit');

        // Simulate file change by using different file path
        const changedFilePath = 'tests/unit/quiet-testing-changed.test.ts';
        const shouldSkip = testCache.shouldSkipTest(testName, changedFilePath);
        expect(shouldSkip).toBe(false);
    });

    test('should provide cache statistics', () => {
        const stats = testCache.getTestStats();
        expect(stats).toBeDefined();
        expect(typeof stats.total).toBe('number');
        expect(typeof stats.passed).toBe('number');
        expect(typeof stats.failed).toBe('number');
        expect(typeof stats.avgDuration).toBe('number');
    });

    test('should clean up old cache entries', () => {
        // Test cache cleanup
        testCache.cleanup();

        const cacheInfo = testCache.getCacheInfo();
        expect(cacheInfo).toBeDefined();
        expect(typeof cacheInfo.entries).toBe('number');
        expect(typeof cacheInfo.size).toBe('number');
    });
});

describe('Test Organization', () => {
    beforeEach(() => {
        setCurrentTestName('test-organization');
    });

    test('should support test categories', () => {
        // Test category functionality
        expect(testConfig.trackTestResult).toBeDefined();
        expect(typeof testConfig.trackTestResult).toBe('function');
    });

    test('should support smart test skipping', () => {
        // Test smart skipping
        expect(testConfig.shouldSkipTest).toBeDefined();
        expect(typeof testConfig.shouldSkipTest).toBe('function');
    });

    test('should track test performance', () => {
        // Test performance tracking
        const performance = testConfig.getTestPerformance();
        expect(performance).toBeDefined();
        expect(performance.duration).toBeGreaterThanOrEqual(0);
        expect(performance.testsPerSecond).toBeGreaterThanOrEqual(0);
    });
});
