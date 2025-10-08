#!/usr/bin/env bun
/**
 * Automated Version Bumping Script
 * 
 * This script automatically bumps version numbers in package.json
 * and updates related files with semantic versioning.
 * 
 * Usage:
 *   bun run scripts/bump-version.ts patch   # 1.0.0 -> 1.0.1
 *   bun run scripts/bump-version.ts minor  # 1.0.0 -> 1.1.0
 *   bun run scripts/bump-version.ts major  # 1.0.0 -> 2.0.0
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface VersionBump {
    type: 'patch' | 'minor' | 'major';
    current: string;
    next: string;
}

/**
 * Parse semantic version string
 */
function parseVersion(version: string): { major: number; minor: number; patch: number } {
    const [major, minor, patch] = version.split('.').map(Number);
    return { major, minor, patch };
}

/**
 * Format version string
 */
function formatVersion(major: number, minor: number, patch: number): string {
    return `${major}.${minor}.${patch}`;
}

/**
 * Calculate next version based on bump type
 */
function calculateNextVersion(current: string, type: 'patch' | 'minor' | 'major'): string {
    const { major, minor, patch } = parseVersion(current);

    switch (type) {
        case 'patch':
            return formatVersion(major, minor, patch + 1);
        case 'minor':
            return formatVersion(major, minor + 1, 0);
        case 'major':
            return formatVersion(major + 1, 0, 0);
        default:
            throw new Error(`Invalid bump type: ${type}`);
    }
}

/**
 * Update package.json version
 */
function updatePackageJson(version: string): void {
    const packagePath = join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));

    packageJson.version = version;

    writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log(`✅ Updated package.json to version ${version}`);
}

/**
 * Update CHANGELOG.md with new version
 */
function updateChangelog(version: string, type: string): void {
    const changelogPath = join(process.cwd(), 'CHANGELOG.md');
    const changelog = readFileSync(changelogPath, 'utf-8');

    const today = new Date().toISOString().split('T')[0];
    const newEntry = `## [${version}] - ${today}\n\n### ${type.charAt(0).toUpperCase() + type.slice(1)}\n- Automated version bump\n\n`;

    const updatedChangelog = changelog.replace(/^## \[/, newEntry + '## [');
    writeFileSync(changelogPath, updatedChangelog);
    console.log(`✅ Updated CHANGELOG.md with version ${version}`);
}

/**
 * Update wrangler.toml version
 */
function updateWranglerToml(version: string): void {
    const wranglerPath = join(process.cwd(), 'wrangler.toml');
    const wranglerContent = readFileSync(wranglerPath, 'utf-8');

    const updatedContent = wranglerContent.replace(
        /^version = ".*"$/m,
        `version = "${version}"`
    );

    writeFileSync(wranglerPath, updatedContent);
    console.log(`✅ Updated wrangler.toml to version ${version}`);
}

/**
 * Main version bump function
 */
function bumpVersion(type: 'patch' | 'minor' | 'major'): void {
    try {
        // Read current version
        const packagePath = join(process.cwd(), 'package.json');
        const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
        const currentVersion = packageJson.version;

        // Calculate next version
        const nextVersion = calculateNextVersion(currentVersion, type);

        console.log(`🚀 Bumping version: ${currentVersion} -> ${nextVersion}`);

        // Update files
        updatePackageJson(nextVersion);
        updateChangelog(nextVersion, type);
        updateWranglerToml(nextVersion);

        console.log(`\n🎉 Version bump complete!`);
        console.log(`📦 New version: ${nextVersion}`);
        console.log(`📝 Type: ${type}`);
        console.log(`\nNext steps:`);
        console.log(`1. Review changes: git diff`);
        console.log(`2. Commit: git add . && git commit -m "chore: bump version to ${nextVersion}"`);
        console.log(`3. Tag: git tag v${nextVersion}`);
        console.log(`4. Push: git push origin main --tags`);

    } catch (error) {
        console.error('❌ Version bump failed:', error);
        process.exit(1);
    }
}

/**
 * CLI interface
 */
function main(): void {
    const args = process.argv.slice(2);
    const type = args[0] as 'patch' | 'minor' | 'major';

    if (!type || !['patch', 'minor', 'major'].includes(type)) {
        console.error('❌ Invalid bump type. Use: patch, minor, or major');
        console.log('\nUsage:');
        console.log('  bun run scripts/bump-version.ts patch   # 1.0.0 -> 1.0.1');
        console.log('  bun run scripts/bump-version.ts minor   # 1.0.0 -> 1.1.0');
        console.log('  bun run scripts/bump-version.ts major   # 1.0.0 -> 2.0.0');
        process.exit(1);
    }

    bumpVersion(type);
}

// Run if called directly
if (import.meta.main) {
    main();
}
