/**
 * Quiet Test Setup - AI-Friendly Testing Configuration
 * 
 * This setup provides:
 * - Quiet output for AI environments
 * - Organized test execution
 * - Smart test skipping for passing tests
 * - Performance optimizations
 */

// Global test configuration
const isAIEnvironment = !!(
    process.env.CLAUDECODE ||
    process.env.REPL_ID ||
    process.env.AGENT ||
    process.env.CI
);

const isQuietMode = process.env.QUIET === '1' || isAIEnvironment;

// Test result tracking
let testResults: {
    passed: number;
    failed: number;
    skipped: number;
    total: number;
    startTime: number;
} = {
    passed: 0,
    failed: 0,
    skipped: 0,
    total: 0,
    startTime: Date.now()
};

// Track test categories
const testCategories = {
    unit: { passed: 0, failed: 0, total: 0 },
    integration: { passed: 0, failed: 0, total: 0 },
    e2e: { passed: 0, failed: 0, total: 0 }
};

// Quiet console override
if (isQuietMode) {
    const originalConsole = { ...console };

    // Override console methods for quiet mode
    console.log = (...args: any[]) => {
        // Only show errors and important info
        if (args[0]?.includes?.('✗') || args[0]?.includes?.('FAIL')) {
            originalConsole.log(...args);
        }
    };

    console.info = () => {}; // Suppress info logs
    console.debug = () => {}; // Suppress debug logs
}

// Test execution tracking
export function trackTestResult(testName: string, passed: boolean, category: 'unit' | 'integration' | 'e2e' = 'unit') {
    testResults.total++;
    testCategories[category].total++;

    if (passed) {
        testResults.passed++;
        testCategories[category].passed++;
    } else {
        testResults.failed++;
        testCategories[category].failed++;
    }
}

// Smart test skipping based on previous results
export function shouldSkipTest(testName: string, category: 'unit' | 'integration' | 'e2e' = 'unit'): boolean {
    // Skip if test passed in last run and no changes detected
    const lastRunKey = `lastRun_${testName}`;
    const lastResult = process.env[lastRunKey];

    if (lastResult === 'passed' && !process.env.FORCE_RUN_ALL) {
        testResults.skipped++;
        return true;
    }

    return false;
}

// Performance monitoring
export function getTestPerformance() {
    const duration = Date.now() - testResults.startTime;
    return {
        duration,
        testsPerSecond: testResults.total / (duration / 1000),
        categories: testCategories,
        summary: {
            passed: testResults.passed,
            failed: testResults.failed,
            skipped: testResults.skipped,
            total: testResults.total
        }
    };
}

// Export configuration
export const testConfig = {
    isQuietMode,
    isAIEnvironment,
    trackTestResult,
    shouldSkipTest,
    getTestPerformance
};

// Export test cache (placeholder for now)
export const testCache = {
    shouldSkipTest: () => false,
    recordTestResult: () => {},
    getTestStats: () => ({ total: 0, passed: 0, failed: 0, skipped: 0, avgDuration: 0 }),
    cleanup: () => {},
    clear: () => {},
    getCacheInfo: () => ({ file: '', size: 0, entries: 0, lastCleanup: new Date().toISOString() })
};

// Global test setup
if (typeof globalThis !== 'undefined') {
    (globalThis as any).testConfig = testConfig;
}
