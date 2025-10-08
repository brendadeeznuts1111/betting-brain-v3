#!/usr/bin/env bun
/**
 * Repository Health Check Script
 * 
 * This script monitors repository health and reports on
 * anti-patterns, version conflicts, and maintenance issues.
 * 
 * Usage:
 *   bun run scripts/health-check.ts
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

interface HealthReport {
    score: number;
    issues: string[];
    warnings: string[];
    recommendations: string[];
}

/**
 * Check for duplicate files
 */
function checkDuplicates(): string[] {
    const issues: string[] = [];

    if (existsSync('bunfig.toml') && existsSync('config/bunfig.toml')) {
        issues.push('Duplicate bunfig.toml files');
    }

    if (existsSync('tsconfig.json') && existsSync('config/tsconfig.json')) {
        issues.push('Duplicate tsconfig.json files');
    }

    if (existsSync('README.md') && existsSync('docs/README.md')) {
        issues.push('Duplicate README.md files');
    }

    if (existsSync('CHANGELOG.md') && existsSync('docs/CHANGELOG.md')) {
        issues.push('Duplicate CHANGELOG.md files');
    }

    return issues;
}

/**
 * Check for hardcoded URLs
 */
function checkHardcodedUrls(): string[] {
    const issues: string[] = [];

    try {
        // Check for hardcoded URLs in source files only (not documentation)
        const result = execSync('grep -r "https://betting-brain-v3" . --include="*.js" --include="*.html" --include="*.ts" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=coverage --exclude-dir=dist --exclude-dir=docs | wc -l', { encoding: 'utf-8' });
        const count = parseInt(result.trim());

        if (count > 5) { // Only flag if more than 5 hardcoded URLs in source files
            issues.push(`${count} hardcoded URLs found (recommend centralization)`);
        }
    } catch (error) {
        // Ignore errors
    }

    return issues;
}

/**
 * Check for version conflicts
 */
function checkVersionConflicts(): string[] {
    const issues: string[] = [];

    try {
        const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
        const packageLock = JSON.parse(readFileSync('package-lock.json', 'utf-8'));

        if (packageJson.version !== packageLock.version) {
            issues.push(`Version mismatch: package.json (${packageJson.version}) vs package-lock.json (${packageLock.version})`);
        }
    } catch (error) {
        // Ignore errors
    }

    return issues;
}

/**
 * Check for root directory violations
 */
function checkRootViolations(): string[] {
    const issues: string[] = [];

    const allowedRootFiles = [
        'README.md', 'LICENSE', 'CLAUDE.md', 'package.json', 'package-lock.json',
        'bun.lock', 'tsconfig.json', 'wrangler.toml', 'wrangler.staging.toml',
        'wrangler.production.toml', 'bunfig.toml', '.gitignore', '.cursorrules',
        'sgconfig.yml', '.ast-grep.yml', '.npmrc', 'CHANGELOG.md'
    ];

    try {
        const files = execSync('ls -la', { encoding: 'utf-8' });
        const lines = files.split('\n').filter(line => line.includes('.md'));

        for (const line of lines) {
            const filename = line.split(' ').pop();
            if (filename && !allowedRootFiles.includes(filename)) {
                issues.push(`Root violation: ${filename} should be in docs/`);
            }
        }
    } catch (error) {
        // Ignore errors
    }

    return issues;
}

/**
 * Check for missing documentation
 */
function checkMissingDocs(): string[] {
    const warnings: string[] = [];

    const requiredDocs = [
        'README.md',
        'CHANGELOG.md',
        'LICENSE',
        'docs/INDEX.md',
        'docs/QUICKSTART.md'
    ];

    for (const doc of requiredDocs) {
        if (!existsSync(doc)) {
            warnings.push(`Missing documentation: ${doc}`);
        }
    }

    return warnings;
}

/**
 * Check for outdated dependencies
 */
function checkOutdatedDeps(): string[] {
    const warnings: string[] = [];

    try {
        const result = execSync('bun outdated', { encoding: 'utf-8' });
        if (result.includes('outdated')) {
            warnings.push('Outdated dependencies found');
        }
    } catch (error) {
        // Ignore errors
    }

    return warnings;
}

/**
 * Generate health report
 */
function generateHealthReport(): HealthReport {
    const issues = [
        ...checkDuplicates(),
        ...checkHardcodedUrls(),
        ...checkVersionConflicts(),
        ...checkRootViolations()
    ];

    const warnings = [
        ...checkMissingDocs(),
        ...checkOutdatedDeps()
    ];

    const recommendations = [
        'Centralize hardcoded URLs in src/shared/config.ts',
        'Move root documentation to docs/ directory',
        'Implement automated version bumping',
        'Add CI/CD checks for anti-patterns',
        'Create maintenance documentation'
    ];

    // Calculate health score (0-100)
    const totalIssues = issues.length + warnings.length;
    const score = Math.max(0, 100 - (totalIssues * 10));

    return {
        score,
        issues,
        warnings,
        recommendations
    };
}

/**
 * Main health check function
 */
function main(): void {
    console.log('🏥 Repository Health Check\n');

    const report = generateHealthReport();

    console.log(`📊 Health Score: ${report.score}/100`);
    console.log('==================\n');

    if (report.issues.length > 0) {
        console.log('🚨 Critical Issues:');
        report.issues.forEach(issue => console.log(`  - ${issue}`));
        console.log();
    }

    if (report.warnings.length > 0) {
        console.log('⚠️  Warnings:');
        report.warnings.forEach(warning => console.log(`  - ${warning}`));
        console.log();
    }

    if (report.recommendations.length > 0) {
        console.log('💡 Recommendations:');
        report.recommendations.forEach(rec => console.log(`  - ${rec}`));
        console.log();
    }

    // Health status
    if (report.score >= 90) {
        console.log('🎉 Repository is healthy!');
    } else if (report.score >= 70) {
        console.log('⚠️  Repository needs attention');
    } else {
        console.log('🚨 Repository requires immediate attention');
    }

    console.log(`\n📈 Total issues: ${report.issues.length + report.warnings.length}`);
    console.log(`🔧 Run 'bun run scripts/cleanup-repo.ts' to fix some issues automatically`);
}

// Run if called directly
if (import.meta.main) {
    main();
}
