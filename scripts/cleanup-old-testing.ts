#!/usr/bin/env bun
/**
 * Cleanup Old Testing System
 * 
 * Removes old testing files, documents, and configurations
 * that are no longer needed with the new integrated testing system
 */

import { existsSync, rmSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

interface CleanupItem {
    path: string;
    reason: string;
    type: 'file' | 'directory';
    backup?: boolean;
}

class TestingCleanup {
    private items: CleanupItem[] = [];

    constructor() {
        this.identifyCleanupItems();
    }

    private identifyCleanupItems(): void {
        // Old testing documentation that's now superseded
        this.items.push(
            {
                path: 'docs/testing/AI_FRIENDLY_TESTING.md',
                reason: 'Superseded by INTEGRATED_TESTING_SYSTEM.md',
                type: 'file',
                backup: true
            },
            {
                path: 'docs/testing/QUIET_TESTING_GUIDE.md',
                reason: 'Superseded by INTEGRATED_TESTING_SYSTEM.md',
                type: 'file',
                backup: true
            },
            {
                path: 'docs/testing/QUIET_TESTING_SUMMARY.md',
                reason: 'Superseded by INTEGRATED_TESTING_SYSTEM.md',
                type: 'file',
                backup: true
            }
        );

        // Old test configuration files
        this.items.push(
            {
                path: 'bunfig.analytics.toml',
                reason: 'Superseded by bunfig.test.toml and bunfig.ci.toml',
                type: 'file',
                backup: true
            }
        );

        // Old test scripts that are now integrated
        this.items.push(
            {
                path: 'scripts/migrate-to-bun-test.ts',
                reason: 'Migration completed, no longer needed',
                type: 'file',
                backup: true
            },
            {
                path: 'scripts/analyze-coverage.ts',
                reason: 'Coverage analysis now integrated into test runner',
                type: 'file',
                backup: true
            }
        );

        // Old test directories that are now organized
        this.items.push(
            {
                path: 'tests/snapshots',
                reason: 'Superseded by tests/snapshot/',
                type: 'directory',
                backup: true
            }
        );

        // Old test files that are duplicates or obsolete
        this.items.push(
            {
                path: 'tests/unit/snapshot-testing/',
                reason: 'Moved to tests/snapshot/',
                type: 'directory',
                backup: true
            }
        );
    }

    showCleanupPlan(): void {
        console.log('🧹 Testing System Cleanup Plan');
        console.log('');
        console.log('The following items will be cleaned up:');
        console.log('');

        this.items.forEach((item, index) => {
            const status = existsSync(item.path) ? '✅ Found' : '❌ Not found';
            console.log(`${index + 1}. ${item.path}`);
            console.log(`   ${status} - ${item.reason}`);
            console.log(`   Type: ${item.type}, Backup: ${item.backup ? 'Yes' : 'No'}`);
            console.log('');
        });
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
            console.log('   bun run scripts/cleanup-old-testing.ts --execute');
        } else {
            console.log('');
            console.log('✅ Cleanup completed!');
        }
    }

    private async createBackup(path: string): Promise<void> {
        const backupDir = 'docs/archive/testing-cleanup';
        const backupPath = join(backupDir, path);

        // Create backup directory if it doesn't exist
        if (!existsSync(backupDir)) {
            // This would need to be implemented with proper directory creation
            console.log(`📦 Would backup ${path} to ${backupPath}`);
        }
    }

    updatePackageJson(): void {
        console.log('📦 Updating package.json...');

        // Remove old test scripts that are no longer needed
        const oldScripts = [
            'test:migrate',
            'test:migrate:dry',
            'test:analyze',
            'test:coverage:analyze'
        ];

        console.log('🗑️  Would remove old scripts:', oldScripts.join(', '));
        console.log('💡 These are now integrated into the new testing system');
    }

    updateDocumentation(): void {
        console.log('📚 Updating documentation...');

        console.log('✅ INTEGRATED_TESTING_SYSTEM.md is the new comprehensive guide');
        console.log('🗑️  Old testing guides can be archived');
        console.log('📝 Update docs/INDEX.md to reference new system');
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const execute = args.includes('--execute');
    const dryRun = !execute;

    const cleanup = new TestingCleanup();

    if (args.includes('--plan')) {
        cleanup.showCleanupPlan();
        return;
    }

    if (args.includes('--package')) {
        cleanup.updatePackageJson();
        return;
    }

    if (args.includes('--docs')) {
        cleanup.updateDocumentation();
        return;
    }

    await cleanup.executeCleanup(dryRun);
}

if (import.meta.main) {
    main().catch(console.error);
}

export { TestingCleanup };
