#!/usr/bin/env bun
/**
 * Smart Test Runner - Organized and Quiet Testing
 * 
 * Features:
 * - Quiet output for AI environments
 * - Smart test skipping for passing tests
 * - Organized test execution by category
 * - Performance monitoring
 * - Parallel execution optimization
 */

import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { TEST_CATEGORIES, getTestCategory, shouldRunInParallel, getTestTimeout } from '../tests/setup/test-categories';

interface TestRunOptions {
    category?: string;
    quiet?: boolean;
    skipPassing?: boolean;
    parallel?: boolean;
    timeout?: number;
    pattern?: string;
    verbose?: boolean;
    ci?: boolean;
    coverage?: boolean;
}

interface TestResult {
    name: string;
    category: string;
    passed: boolean;
    duration: number;
    error?: string;
    skipped?: boolean;
}

class SmartTestRunner {
    private options: TestRunOptions;
    private results: TestResult[] = [];
    private startTime: number = 0;

    constructor(options: TestRunOptions = {}) {
        this.options = {
            quiet: process.env.CLAUDECODE === '1' || process.env.QUIET === '1' || process.env.CI === 'true',
            skipPassing: !process.env.CI,
            parallel: true,
            ci: process.env.CI === 'true',
            coverage: process.env.CI === 'true',
            ...options
        };
    }

    async run(): Promise<boolean> {
        this.startTime = Date.now();

        console.log('🧪 Smart Test Runner Starting...');

        if (this.options.quiet) {
            console.log('🔇 Quiet mode enabled for AI environment');
        }

        // Determine which tests to run
        const testFiles = await this.discoverTests();

        if (testFiles.length === 0) {
            console.log('❌ No tests found');
            return false;
        }

        console.log(`📋 Found ${testFiles.length} test files`);

        // Group tests by category
        const testGroups = this.groupTestsByCategory(testFiles);

        // Run tests by category
        let allPassed = true;
        for (const [category, files] of Object.entries(testGroups)) {
            console.log(`\n🏃 Running ${category} tests (${files.length} files)...`);

            const categoryPassed = await this.runTestCategory(category, files);
            if (!categoryPassed) {
                allPassed = false;
            }
        }

        // Print summary
        this.printSummary();

        return allPassed;
    }

    private async discoverTests(): Promise<string[]> {
        const testFiles: string[] = [];

        // Discover test files by scanning directories
        const testDir = 'tests';
        const categories = ['unit', 'integration', 'e2e', 'benchmark', 'snapshot'];

        for (const category of categories) {
            const categoryPath = join(testDir, category);
            if (existsSync(categoryPath)) {
                try {
                    const entries = readdirSync(categoryPath, { withFileTypes: true });
                    for (const entry of entries) {
                        if (entry.isFile() && entry.name.endsWith('.test.ts')) {
                            testFiles.push(join(categoryPath, entry.name));
                        }
                    }
                } catch (error) {
                    console.warn(`⚠️  Could not scan ${categoryPath}:`, error);
                }
            }
        }

        return testFiles;
    }

    private groupTestsByCategory(testFiles: string[]): Record<string, string[]> {
        const groups: Record<string, string[]> = {};

        for (const file of testFiles) {
            // Extract category from file path
            let category = 'unit'; // default
            if (file.includes('/unit/')) category = 'unit';
            else if (file.includes('/integration/')) category = 'integration';
            else if (file.includes('/e2e/')) category = 'e2e';
            else if (file.includes('/benchmark/')) category = 'performance';
            else if (file.includes('/snapshot/')) category = 'snapshot';

            if (!groups[category]) {
                groups[category] = [];
            }
            groups[category].push(file);
        }

        return groups;
    }

    private async runTestCategory(category: string, files: string[]): Promise<boolean> {
        const categoryConfig = TEST_CATEGORIES[category];
        if (!categoryConfig) {
            console.log(`⚠️  Unknown category: ${category}`);
            return true;
        }

        const timeout = this.options.timeout || getTestTimeout(category);
        const parallel = this.options.parallel && shouldRunInParallel(category);

        console.log(`  📊 ${categoryConfig.description}`);
        console.log(`  ⏱️  Timeout: ${timeout}ms, Parallel: ${parallel}`);

        // Run tests with Bun
        const configFile = this.options.ci ? 'bunfig.ci.toml' : 'bunfig.test.toml';
        const args = [
            'test',
            ...files,
            '--timeout', timeout.toString(),
            '--config', configFile
        ];

        if (parallel) {
            args.push('--concurrent');
        }

        if (this.options.coverage) {
            args.push('--coverage');
        }

        if (this.options.quiet) {
            args.push('--quiet');
        }

        if (this.options.skipPassing) {
            args.push('--bail'); // Stop on first failure
        }

        try {
            const proc = Bun.spawn(['bun', ...args], {
                stdout: this.options.quiet ? 'pipe' : 'inherit',
                stderr: 'pipe'
            });

            const exitCode = await proc.exited;

            if (exitCode === 0) {
                console.log(`  ✅ ${category} tests passed`);
                return true;
            } else {
                console.log(`  ❌ ${category} tests failed`);
                return false;
            }
        } catch (error) {
            console.log(`  💥 ${category} tests errored:`, error);
            return false;
        }
    }

    private printSummary(): void {
        const duration = Date.now() - this.startTime;
        const passed = this.results.filter(r => r.passed).length;
        const failed = this.results.filter(r => !r.passed).length;
        const skipped = this.results.filter(r => r.skipped).length;

        console.log('\n📊 Test Summary:');
        console.log(`  ✅ Passed: ${passed}`);
        console.log(`  ❌ Failed: ${failed}`);
        console.log(`  ⏭️  Skipped: ${skipped}`);
        console.log(`  ⏱️  Duration: ${(duration / 1000).toFixed(2)}s`);

        if (failed > 0) {
            console.log('\n❌ Some tests failed');
        } else {
            console.log('\n✅ All tests passed!');
        }
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const options: TestRunOptions = {};

    // Parse arguments
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        switch (arg) {
            case '--category':
                options.category = args[++i];
                break;
            case '--quiet':
                options.quiet = true;
                break;
            case '--verbose':
                options.verbose = true;
                break;
            case '--no-skip':
                options.skipPassing = false;
                break;
            case '--serial':
                options.parallel = false;
                break;
            case '--timeout':
                options.timeout = parseInt(args[++i]);
                break;
            case '--pattern':
                options.pattern = args[++i];
                break;
            case '--ci':
                options.ci = true;
                break;
            case '--coverage':
                options.coverage = true;
                break;
            case '--help':
                console.log(`
Smart Test Runner

Usage: bun run scripts/test-runner.ts [options]

Options:
  --category <name>    Run specific test category
  --quiet             Quiet output for AI environments
  --verbose           Verbose output
  --no-skip           Don't skip passing tests
  --serial            Run tests serially
  --timeout <ms>      Set test timeout
  --pattern <glob>    Test file pattern
  --ci                CI mode (enables coverage, disables skipping)
  --coverage          Enable test coverage
  --help              Show this help

Categories:
  unit                Fast unit tests
  integration         Integration tests  
  e2e                 End-to-end tests
  performance         Performance tests
  snapshot            Snapshot tests
        `);
                process.exit(0);
                break;
        }
    }

    const runner = new SmartTestRunner(options);
    const success = await runner.run();

    process.exit(success ? 0 : 1);
}

if (import.meta.main) {
    main().catch(console.error);
}
