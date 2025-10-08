#!/usr/bin/env bun

/**
 * 🔥 Analytics Binding Smoke Test
 * 
 * Tests real analytics engine binding in staging/production environment
 * Validates that analytics calls work with actual Cloudflare Analytics Engine
 */

import { $ } from 'bun';

interface BindingTestResult {
    success: boolean;
    duration: number;
    message: string;
    error?: string;
}

class AnalyticsBindingTest {
    private timeout: number;

    constructor(timeout: number = 30000) {
        this.timeout = timeout;
    }

    async run(): Promise<boolean> {
        console.log('🔥 Testing Analytics Engine Binding...');

        const results: BindingTestResult[] = [];

        // Test 1: Environment validation
        results.push(await this.testEnvironment());

        // Test 2: Analytics engine availability
        results.push(await this.testAnalyticsEngine());

        // Test 3: Data point writing
        results.push(await this.testDataPointWriting());

        // Test 4: Error handling
        results.push(await this.testErrorHandling());

        // Summary
        const successCount = results.filter(r => r.success).length;
        const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

        console.log('');
        console.log('📊 Binding Test Summary:');
        console.log(`   Tests Run: ${results.length}`);
        console.log(`   Passed: ${successCount}`);
        console.log(`   Failed: ${results.length - successCount}`);
        console.log(`   Total Duration: ${totalDuration}ms`);

        // Print failed tests
        const failedTests = results.filter(r => !r.success);
        if (failedTests.length > 0) {
            console.log('');
            console.log('❌ Failed Tests:');
            failedTests.forEach((test, index) => {
                console.log(`   ${index + 1}. ${test.message}`);
                if (test.error) {
                    console.log(`      Error: ${test.error}`);
                }
            });
        }

        return successCount === results.length;
    }

    private async testEnvironment(): Promise<BindingTestResult> {
        const startTime = Date.now();

        try {
            // Check if we're in a Cloudflare Workers environment
            const hasAnalyticsEngine = typeof globalThis.ANALYTICS_ENGINE !== 'undefined';

            if (!hasAnalyticsEngine) {
                return {
                    success: false,
                    duration: Date.now() - startTime,
                    message: 'Environment validation',
                    error: 'ANALYTICS_ENGINE not available in global scope'
                };
            }

            return {
                success: true,
                duration: Date.now() - startTime,
                message: 'Environment validation - ANALYTICS_ENGINE available'
            };
        } catch (error) {
            return {
                success: false,
                duration: Date.now() - startTime,
                message: 'Environment validation',
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    private async testAnalyticsEngine(): Promise<BindingTestResult> {
        const startTime = Date.now();

        try {
            // Test if analytics engine is callable
            if (typeof globalThis.ANALYTICS_ENGINE?.writeDataPoint !== 'function') {
                return {
                    success: false,
                    duration: Date.now() - startTime,
                    message: 'Analytics engine availability',
                    error: 'writeDataPoint method not available'
                };
            }

            return {
                success: true,
                duration: Date.now() - startTime,
                message: 'Analytics engine availability - writeDataPoint method available'
            };
        } catch (error) {
            return {
                success: false,
                duration: Date.now() - startTime,
                message: 'Analytics engine availability',
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    private async testDataPointWriting(): Promise<BindingTestResult> {
        const startTime = Date.now();

        try {
            // Test writing a data point
            const testData = {
                blobs: ['smoke_test', 'binding_test'],
                doubles: [Date.now(), 1.0],
                tags: { test: 'true', timestamp: new Date().toISOString() }
            };

            await globalThis.ANALYTICS_ENGINE.writeDataPoint(testData);

            return {
                success: true,
                duration: Date.now() - startTime,
                message: 'Data point writing - Successfully wrote test data point'
            };
        } catch (error) {
            return {
                success: false,
                duration: Date.now() - startTime,
                message: 'Data point writing',
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    private async testErrorHandling(): Promise<BindingTestResult> {
        const startTime = Date.now();

        try {
            // Test error handling with invalid data
            try {
                await globalThis.ANALYTICS_ENGINE.writeDataPoint({
                    blobs: [], // Invalid: empty blobs array
                    doubles: []
                });

                // If we get here, the analytics engine accepted invalid data
                return {
                    success: false,
                    duration: Date.now() - startTime,
                    message: 'Error handling',
                    error: 'Analytics engine accepted invalid data without error'
                };
            } catch (validationError) {
                // This is expected - analytics engine should reject invalid data
                return {
                    success: true,
                    duration: Date.now() - startTime,
                    message: 'Error handling - Correctly rejected invalid data'
                };
            }
        } catch (error) {
            return {
                success: false,
                duration: Date.now() - startTime,
                message: 'Error handling',
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    let timeout = 30000;

    // Parse arguments
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        switch (arg) {
            case '--timeout':
                timeout = parseInt(args[++i]) || 30000;
                break;
            case '--help':
                console.log(`
🔥 Analytics Binding Smoke Test

Usage: bun run scripts/test-analytics-binding.ts [options]

Options:
  --timeout <ms>      Set timeout in milliseconds (default: 30000)
  --help              Show this help message

This script tests the real analytics engine binding in a Cloudflare Workers environment.
It should be run in staging or production where ANALYTICS_ENGINE is available.

Examples:
  bun run scripts/test-analytics-binding.ts
  bun run scripts/test-analytics-binding.ts --timeout 60000
        `);
                process.exit(0);
                break;
        }
    }

    const tester = new AnalyticsBindingTest(timeout);
    const success = await tester.run();

    process.exit(success ? 0 : 1);
}

// Run if called directly
if (import.meta.main) {
    main().catch(error => {
        console.error('❌ Analytics binding test failed:', error);
        process.exit(1);
    });
}

export { AnalyticsBindingTest };
