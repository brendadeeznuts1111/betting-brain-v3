/**
 * Test Categories and Organization
 * 
 * Organizes tests into logical categories for better execution
 * and reporting. Supports smart test skipping and parallel execution.
 */

export interface TestCategory {
    name: string;
    pattern: string;
    timeout: number;
    parallel: boolean;
    priority: number;
    description: string;
}

export const TEST_CATEGORIES: Record<string, TestCategory> = {
    // Core unit tests - fast, isolated
    unit: {
        name: 'Unit Tests',
        pattern: 'tests/unit/**/*.test.ts',
        timeout: 5000,
        parallel: true,
        priority: 1,
        description: 'Fast, isolated unit tests'
    },

    // Integration tests - moderate speed, some dependencies
    integration: {
        name: 'Integration Tests',
        pattern: 'tests/integration/**/*.test.ts',
        timeout: 15000,
        parallel: true,
        priority: 2,
        description: 'Integration tests with external dependencies'
    },

    // End-to-end tests - slower, full system
    e2e: {
        name: 'E2E Tests',
        pattern: 'tests/e2e/**/*.test.ts',
        timeout: 30000,
        parallel: false,
        priority: 3,
        description: 'Full system end-to-end tests'
    },

    // Performance tests - benchmarks
    performance: {
        name: 'Performance Tests',
        pattern: 'tests/benchmark/**/*.test.ts',
        timeout: 60000,
        parallel: false,
        priority: 4,
        description: 'Performance and benchmark tests'
    },

    // Snapshot tests - visual regression
    snapshot: {
        name: 'Snapshot Tests',
        pattern: 'tests/snapshot/**/*.test.ts',
        timeout: 10000,
        parallel: true,
        priority: 2,
        description: 'Snapshot and visual regression tests'
    }
};

export const TEST_PRIORITIES = {
    CRITICAL: 1,    // Must pass for deployment
    HIGH: 2,        // Should pass for development
    MEDIUM: 3,      // Nice to have
    LOW: 4          // Optional
};

export function getTestCategory(filePath: string): TestCategory | null {
    for (const [key, category] of Object.entries(TEST_CATEGORIES)) {
        if (filePath.includes(category.pattern.replace('**/*.test.ts', ''))) {
            return category;
        }
    }
    return null;
}

export function shouldRunInParallel(category: string): boolean {
    return TEST_CATEGORIES[category]?.parallel ?? true;
}

export function getTestTimeout(category: string): number {
    return TEST_CATEGORIES[category]?.timeout ?? 10000;
}
