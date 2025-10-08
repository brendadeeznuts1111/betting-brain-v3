#!/usr/bin/env bun

/**
 * 🌙 Nightly Analytics Testing Job
 * 
 * Runs dry-run + real binding smoke test for analytics engine
 * Ensures analytics integration works in production-like environment
 */

import { $ } from 'bun';
import { existsSync } from 'fs';
import { join } from 'path';

interface NightlyConfig {
    dryRun: boolean;
    realBinding: boolean;
    timeout: number;
    verbose: boolean;
}

interface TestResult {
    success: boolean;
    duration: number;
    output: string;
    error?: string;
}

class NightlyAnalyticsTest {
    private config: NightlyConfig;
    private startTime: number;

    constructor(config: Partial<NightlyConfig> = {}) {
        this.config = {
            dryRun: true,
            realBinding: true,
            timeout: 60000, // 1 minute
            verbose: false,
            ...config
        };
        this.startTime = Date.now();
    }

    async run(): Promise<boolean> {
        console.log('🌙 Starting Nightly Analytics Test...');
        console.log(`   Dry Run: ${this.config.dryRun ? '✅' : '❌'}`);
        console.log(`   Real Binding: ${this.config.realBinding ? '✅' : '❌'}`);
        console.log('');

        const results: TestResult[] = [];

        // Step 1: Dry Run Tests (with stub)
        if (this.config.dryRun) {
            console.log('🧪 Running dry-run tests with AnalyticsEngineStub...');
            const dryRunResult = await this.runDryRunTests();
            results.push(dryRunResult);

            if (!dryRunResult.success) {
                console.error('❌ Dry run tests failed');
                return false;
            }
            console.log('✅ Dry run tests passed');
        }

        // Step 2: Real Binding Smoke Test
        if (this.config.realBinding) {
            console.log('🔥 Running real binding smoke test...');
            const smokeTestResult = await this.runSmokeTest();
            results.push(smokeTestResult);

            if (!smokeTestResult.success) {
                console.error('❌ Smoke test failed');
                return false;
            }
            console.log('✅ Smoke test passed');
        }

        // Summary
        const totalDuration = Date.now() - this.startTime;
        const successCount = results.filter(r => r.success).length;

        console.log('');
        console.log('📊 Nightly Analytics Test Summary:');
        console.log(`   Tests Run: ${results.length}`);
        console.log(`   Passed: ${successCount}`);
        console.log(`   Failed: ${results.length - successCount}`);
        console.log(`   Duration: ${totalDuration}ms`);

        return successCount === results.length;
    }

    private async runDryRunTests(): Promise<TestResult> {
        const startTime = Date.now();

        try {
            // Run analytics-specific tests with stub (using analytics config)
            const result = await $`bun test tests/unit/analytics-testing-example.test.ts --config bunfig.analytics.toml --randomize`.quiet();

            const success = result.exitCode === 0;
            if (!success) {
                console.log('❌ Test output:', result.stdout.toString());
                console.log('❌ Test error:', result.stderr.toString());
            }

            return {
                success,
                duration: Date.now() - startTime,
                output: result.stdout.toString(),
                error: result.stderr.toString()
            };
        } catch (error) {
            return {
                success: false,
                duration: Date.now() - startTime,
                output: '',
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    private async runSmokeTest(): Promise<TestResult> {
        const startTime = Date.now();

        try {
            // Test real analytics engine binding (if available)
            // This would test against a real analytics engine in staging
            const result = await $`bun run scripts/test-analytics-binding.ts`.quiet();

            return {
                success: result.exitCode === 0,
                duration: Date.now() - startTime,
                output: result.stdout.toString(),
                error: result.stderr.toString()
            };
        } catch (error) {
            return {
                success: false,
                duration: Date.now() - startTime,
                output: '',
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const config: Partial<NightlyConfig> = {};

    // Parse arguments
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        switch (arg) {
            case '--no-dry-run':
                config.dryRun = false;
                break;
            case '--no-real-binding':
                config.realBinding = false;
                break;
            case '--verbose':
                config.verbose = true;
                break;
            case '--timeout':
                config.timeout = parseInt(args[++i]) || 60000;
                break;
            case '--help':
                console.log(`
🌙 Nightly Analytics Testing Job

Usage: bun run scripts/nightly-analytics-test.ts [options]

Options:
  --no-dry-run        Skip dry-run tests with stub
  --no-real-binding   Skip real binding smoke test
  --verbose           Enable verbose output
  --timeout <ms>      Set timeout in milliseconds (default: 60000)
  --help              Show this help message

Examples:
  bun run scripts/nightly-analytics-test.ts
  bun run scripts/nightly-analytics-test.ts --no-dry-run --verbose
  bun run scripts/nightly-analytics-test.ts --timeout 120000
        `);
                process.exit(0);
                break;
        }
    }

    const tester = new NightlyAnalyticsTest(config);
    const success = await tester.run();

    process.exit(success ? 0 : 1);
}

// Run if called directly
if (import.meta.main) {
    main().catch(error => {
        console.error('❌ Nightly analytics test failed:', error);
        process.exit(1);
    });
}

export { NightlyAnalyticsTest };
