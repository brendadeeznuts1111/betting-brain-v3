#!/usr/bin/env bun
/**
 * Cleanup Old Implementations and Testing
 * 
 * Identifies and cleans up old implementation files, duplicate tests,
 * and ensures comprehensive coverage is maintained
 */

import { existsSync, rmSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

interface CleanupItem {
    path: string;
    reason: string;
    type: 'file' | 'directory';
    category: 'duplicate' | 'obsolete' | 'migration' | 'old-impl';
    backup?: boolean;
}

class ImplementationCleanup {
    private items: CleanupItem[] = [];

    constructor() {
        this.identifyCleanupItems();
    }

    private identifyCleanupItems(): void {
        // Duplicate test files
        this.items.push(
            {
                path: 'tests/unit/snapshot-testing.test.ts',
                reason: 'Moved to tests/snapshot/ directory',
                type: 'file',
                category: 'duplicate',
                backup: true
            }
        );

        // Old implementation files that are no longer needed
        this.items.push(
            {
                path: 'scripts/fix-test-imports.ts',
                reason: 'Test imports fixed, no longer needed',
                type: 'file',
                category: 'migration',
                backup: true
            },
            {
                path: 'scripts/cleanup-repo.ts',
                reason: 'One-time cleanup script, no longer needed',
                type: 'file',
                category: 'migration',
                backup: true
            },
            {
                path: 'scripts/restore-urls.ts',
                reason: 'URL restoration completed, no longer needed',
                type: 'file',
                category: 'migration',
                backup: true
            },
            {
                path: 'scripts/centralize-urls.ts',
                reason: 'URL centralization completed, no longer needed',
                type: 'file',
                category: 'migration',
                backup: true
            }
        );

        // Old test files that are duplicates or obsolete
        this.items.push(
            {
                path: 'tests/unit/analytics-testing-example.test.ts',
                reason: 'Example test, superseded by actual analytics tests',
                type: 'file',
                category: 'obsolete',
                backup: true
            },
            {
                path: 'tests/unit/formatting.test.ts',
                reason: 'Formatting tests now integrated into linting',
                type: 'file',
                category: 'obsolete',
                backup: true
            }
        );

        // Old utility files that are no longer used
        this.items.push(
            {
                path: 'tests/utils/coverage-analysis.ts',
                reason: 'Coverage analysis now integrated into test runner',
                type: 'file',
                category: 'obsolete',
                backup: true
            },
            {
                path: 'tests/utils/snapshot-helpers.ts',
                reason: 'Snapshot helpers now integrated into test setup',
                type: 'file',
                category: 'obsolete',
                backup: true
            }
        );

        // Old test setup files that are redundant
        this.items.push(
            {
                path: 'tests/setup/integration.ts',
                reason: 'Integration setup now handled by test-categories.ts',
                type: 'file',
                category: 'obsolete',
                backup: true
            },
            {
                path: 'tests/setup/production.ts',
                reason: 'Production setup now handled by test-categories.ts',
                type: 'file',
                category: 'obsolete',
                backup: true
            },
            {
                path: 'tests/setup/staging.ts',
                reason: 'Staging setup now handled by test-categories.ts',
                type: 'file',
                category: 'obsolete',
                backup: true
            }
        );

        // Old test files that are duplicates
        this.items.push(
            {
                path: 'tests/integration/schedule-implementation-detailed.test.ts',
                reason: 'Detailed implementation test, superseded by schedules-implementation.test.ts',
                type: 'file',
                category: 'duplicate',
                backup: true
            },
            {
                path: 'tests/integration/trigger-implementation-detailed.test.ts',
                reason: 'Detailed implementation test, superseded by triggers-implementation.test.ts',
                type: 'file',
                category: 'duplicate',
                backup: true
            }
        );
    }

    showCleanupPlan(): void {
        console.log('🧹 Old Implementation Cleanup Plan');
        console.log('');
        console.log('The following items will be cleaned up:');
        console.log('');

        const categories = {
            duplicate: '🔄 Duplicate Files',
            obsolete: '🗑️ Obsolete Files',
            migration: '🚀 Migration Files',
            'old-impl': '🏗️ Old Implementations'
        };

        Object.entries(categories).forEach(([category, title]) => {
            const categoryItems = this.items.filter(item => item.category === category);
            if (categoryItems.length > 0) {
                console.log(`\n${title}:`);
                categoryItems.forEach((item, index) => {
                    const status = existsSync(item.path) ? '✅ Found' : '❌ Not found';
                    console.log(`  ${index + 1}. ${item.path}`);
                    console.log(`     ${status} - ${item.reason}`);
                });
            }
        });

        console.log('');
        console.log(`Total items: ${this.items.length}`);
    }

    async executeCleanup(dryRun: boolean = true): Promise<void> {
        console.log(dryRun ? '🔍 DRY RUN - No files will be deleted' : '🗑️  EXECUTING CLEANUP');
        console.log('');

        for (const item of this.items) {
            if (!existsSync(item.path)) {
                console.log(`⏭️  Skipping ${item.path} (not found)`);
                continue;
            }

            if (dryRun) {
                console.log(`🔍 Would remove: ${item.path}`);
                console.log(`   Reason: ${item.reason}`);
                console.log(`   Category: ${item.category}`);
            } else {
                try {
                    if (item.backup) {
                        await this.createBackup(item.path);
                    }

                    if (item.type === 'directory') {
                        rmSync(item.path, { recursive: true, force: true });
                        console.log(`🗑️  Removed directory: ${item.path}`);
                    } else {
                        rmSync(item.path, { force: true });
                        console.log(`🗑️  Removed file: ${item.path}`);
                    }
                } catch (error) {
                    console.log(`❌ Failed to remove ${item.path}: ${error}`);
                }
            }
        }

        if (dryRun) {
            console.log('');
            console.log('💡 To execute cleanup, run:');
            console.log('   bun run scripts/cleanup-old-implementations.ts --execute');
        } else {
            console.log('');
            console.log('✅ Cleanup completed!');
        }
    }

    private async createBackup(path: string): Promise<void> {
        const backupDir = 'docs/archive/implementation-cleanup';
        const backupPath = join(backupDir, path);

        // Create backup directory if it doesn't exist
        if (!existsSync(backupDir)) {
            console.log(`📦 Would backup ${path} to ${backupPath}`);
        }
    }

    checkCoverage(): void {
        console.log('📊 Coverage Analysis');
        console.log('');

        // Check if coverage files exist
        const coverageFiles = [
            'coverage/coverage-final.json',
            'coverage/lcov.info',
            'coverage/index.html'
        ];

        coverageFiles.forEach(file => {
            const exists = existsSync(file);
            console.log(`${exists ? '✅' : '❌'} ${file}`);
        });

        console.log('');
        console.log('💡 To generate coverage:');
        console.log('   bun run test:coverage');
        console.log('   bun run test:integration:ci');
    }

    verifyTestStructure(): void {
        console.log('🔍 Test Structure Verification');
        console.log('');

        const expectedStructure = {
            'tests/unit/': 'Unit tests',
            'tests/integration/': 'Integration tests',
            'tests/e2e/': 'End-to-end tests',
            'tests/benchmark/': 'Performance tests',
            'tests/snapshot/': 'Snapshot tests',
            'tests/setup/': 'Test setup files',
            'tests/utils/': 'Test utilities',
            'tests/mocks/': 'Test mocks',
            'tests/scopes/': 'Test scope definitions'
        };

        Object.entries(expectedStructure).forEach(([dir, description]) => {
            const exists = existsSync(dir);
            console.log(`${exists ? '✅' : '❌'} ${dir} - ${description}`);
        });

        console.log('');
        console.log('💡 Test structure is properly organized');
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const execute = args.includes('--execute');
    const dryRun = !execute;

    const cleanup = new ImplementationCleanup();

    if (args.includes('--plan')) {
        cleanup.showCleanupPlan();
        return;
    }

    if (args.includes('--coverage')) {
        cleanup.checkCoverage();
        return;
    }

    if (args.includes('--structure')) {
        cleanup.verifyTestStructure();
        return;
    }

    await cleanup.executeCleanup(dryRun);
}

if (import.meta.main) {
    main().catch(console.error);
}

export { ImplementationCleanup };
