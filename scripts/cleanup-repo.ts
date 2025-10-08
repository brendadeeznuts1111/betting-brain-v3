#!/usr/bin/env bun
/**
 * Repository Cleanup Script
 * 
 * This script automatically cleans up common anti-patterns and
 * maintains repository health.
 * 
 * Usage:
 *   bun run scripts/cleanup-repo.ts
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

interface CleanupReport {
    duplicates: string[];
    hardcodedUrls: string[];
    versionConflicts: string[];
    rootViolations: string[];
    cleaned: string[];
}

/**
 * Find duplicate configuration files
 */
function findDuplicateConfigs(): string[] {
    const duplicates: string[] = [];

    // Check for duplicate bunfig.toml
    if (existsSync('bunfig.toml') && existsSync('config/bunfig.toml')) {
        duplicates.push('config/bunfig.toml (duplicate of root)');
    }

    // Check for duplicate tsconfig.json
    if (existsSync('tsconfig.json') && existsSync('config/tsconfig.json')) {
        duplicates.push('config/tsconfig.json (duplicate of root)');
    }

    return duplicates;
}

/**
 * Find hardcoded URLs
 */
function findHardcodedUrls(): string[] {
    const hardcoded: string[] = [];

    try {
        const result = execSync('grep -r "workers.dev" . --include="*.ts" --include="*.js" --include="*.md" | grep -v node_modules | wc -l', { encoding: 'utf-8' });
        const count = parseInt(result.trim());

        if (count > 0) {
            hardcoded.push(`${count} hardcoded URLs found`);
        }
    } catch (error) {
        // Ignore errors
    }

    return hardcoded;
}

/**
 * Find version conflicts
 */
function findVersionConflicts(): string[] {
    const conflicts: string[] = [];

    try {
        const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
        const packageLock = JSON.parse(readFileSync('package-lock.json', 'utf-8'));

        if (packageJson.version !== packageLock.version) {
            conflicts.push(`package.json: ${packageJson.version} vs package-lock.json: ${packageLock.version}`);
        }
    } catch (error) {
        // Ignore errors
    }

    return conflicts;
}

/**
 * Find root directory violations
 */
function findRootViolations(): string[] {
    const violations: string[] = [];

    const allowedRootFiles = [
        'README.md', 'LICENSE', 'CLAUDE.md', 'package.json', 'package-lock.json',
        'bun.lock', 'tsconfig.json', 'wrangler.toml', 'wrangler.staging.toml',
        'wrangler.production.toml', 'bunfig.toml', '.gitignore', '.cursorrules',
        'sgconfig.yml', '.ast-grep.yml', '.npmrc'
    ];

    try {
        const files = execSync('ls -la', { encoding: 'utf-8' });
        const lines = files.split('\n').filter(line => line.includes('.md'));

        for (const line of lines) {
            const filename = line.split(' ').pop();
            if (filename && !allowedRootFiles.includes(filename)) {
                violations.push(filename);
            }
        }
    } catch (error) {
        // Ignore errors
    }

    return violations;
}

/**
 * Clean up duplicate files
 */
function cleanupDuplicates(): string[] {
    const cleaned: string[] = [];

    // Remove duplicate configs
    if (existsSync('config/bunfig.toml')) {
        unlinkSync('config/bunfig.toml');
        cleaned.push('Removed config/bunfig.toml');
    }

    if (existsSync('config/tsconfig.json')) {
        unlinkSync('config/tsconfig.json');
        cleaned.push('Removed config/tsconfig.json');
    }

    return cleaned;
}

/**
 * Generate cleanup report
 */
function generateReport(): CleanupReport {
    return {
        duplicates: findDuplicateConfigs(),
        hardcodedUrls: findHardcodedUrls(),
        versionConflicts: findVersionConflicts(),
        rootViolations: findRootViolations(),
        cleaned: cleanupDuplicates()
    };
}

/**
 * Main cleanup function
 */
function main(): void {
    console.log('🧹 Starting repository cleanup...\n');

    const report = generateReport();

    console.log('📊 Cleanup Report:');
    console.log('==================\n');

    if (report.duplicates.length > 0) {
        console.log('🔄 Duplicate Files:');
        report.duplicates.forEach(dup => console.log(`  - ${dup}`));
        console.log();
    }

    if (report.hardcodedUrls.length > 0) {
        console.log('🔗 Hardcoded URLs:');
        report.hardcodedUrls.forEach(url => console.log(`  - ${url}`));
        console.log();
    }

    if (report.versionConflicts.length > 0) {
        console.log('⚠️  Version Conflicts:');
        report.versionConflicts.forEach(conflict => console.log(`  - ${conflict}`));
        console.log();
    }

    if (report.rootViolations.length > 0) {
        console.log('📁 Root Directory Violations:');
        report.rootViolations.forEach(violation => console.log(`  - ${violation}`));
        console.log();
    }

    if (report.cleaned.length > 0) {
        console.log('✅ Cleaned:');
        report.cleaned.forEach(clean => console.log(`  - ${clean}`));
        console.log();
    }

    // Summary
    const totalIssues = report.duplicates.length + report.hardcodedUrls.length +
        report.versionConflicts.length + report.rootViolations.length;

    if (totalIssues === 0) {
        console.log('🎉 Repository is clean! No issues found.');
    } else {
        console.log(`📈 Found ${totalIssues} issues. ${report.cleaned.length} cleaned automatically.`);
        console.log('\n💡 Manual fixes needed:');
        console.log('  1. Move root documentation to docs/');
        console.log('  2. Centralize hardcoded URLs');
        console.log('  3. Fix version conflicts');
    }
}

// Run if called directly
if (import.meta.main) {
    main();
}
