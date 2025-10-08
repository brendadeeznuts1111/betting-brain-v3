#!/usr/bin/env bun
/**
 * Automated Release Script
 *
 * This script automates the release process:
 * 1. Detects version from git tag (if present)
 * 2. Updates package.json, CHANGELOG.md, wrangler.toml
 * 3. Creates git tag (if not already tagged)
 * 4. Prepares for GitHub release
 *
 * Usage:
 *   bun run scripts/release.ts              # Auto-detect from tag or current version
 *   bun run scripts/release.ts patch        # Bump patch version
 *   bun run scripts/release.ts minor        # Bump minor version
 *   bun run scripts/release.ts major        # Bump major version
 *   bun run scripts/release.ts --dry-run    # Dry run without changes
 *
 * Environment:
 *   GITHUB_TOKEN - GitHub token for creating releases
 *   CI - Set to 'true' in CI environment
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { $ } from 'bun';

interface ReleaseConfig {
  currentVersion: string;
  nextVersion: string;
  bumpType?: 'patch' | 'minor' | 'major';
  tagExists: boolean;
  dryRun: boolean;
  ci: boolean;
}

/**
 * Parse semantic version string
 */
function parseVersion(version: string): { major: number; minor: number; patch: number } {
  const cleaned = version.replace(/^v/, ''); // Remove 'v' prefix
  const [major, minor, patch] = cleaned.split('.').map(Number);
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
 * Detect version from git tag
 */
async function detectVersionFromTag(): Promise<string | null> {
  try {
    const result = await $`git describe --tags --exact-match HEAD 2>/dev/null`.text();
    const tag = result.trim();
    if (tag && tag.startsWith('v')) {
      return tag.replace(/^v/, '');
    }
  } catch {
    // No tag on current commit
  }
  return null;
}

/**
 * Check if git tag exists
 */
async function checkTagExists(version: string): Promise<boolean> {
  try {
    await $`git rev-parse v${version}`.quiet();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get current version from package.json
 */
function getCurrentVersion(): string {
  const packagePath = join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
  return packageJson.version;
}

/**
 * Update package.json version
 */
function updatePackageJson(version: string, dryRun: boolean): void {
  const packagePath = join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));

  console.log(`📦 package.json: ${packageJson.version} → ${version}`);

  if (!dryRun) {
    packageJson.version = version;
    writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log(`   ✓ Updated package.json`);
  } else {
    console.log(`   ⏭️  Skipped (dry run)`);
  }
}

/**
 * Update CHANGELOG.md with new version
 */
function updateChangelog(version: string, dryRun: boolean): void {
  const changelogPath = join(process.cwd(), 'CHANGELOG.md');

  if (!existsSync(changelogPath)) {
    console.log(`📝 CHANGELOG.md: Not found, skipping`);
    return;
  }

  const changelog = readFileSync(changelogPath, 'utf-8');
  const today = new Date().toISOString().split('T')[0];

  // Check if version already exists in changelog
  if (changelog.includes(`## [${version}]`)) {
    console.log(`📝 CHANGELOG.md: Version ${version} already exists`);
    return;
  }

  const newEntry = `## [${version}] - ${today}\n\n### Changed\n- Release v${version}\n\n`;

  console.log(`📝 CHANGELOG.md: Adding version ${version}`);

  if (!dryRun) {
    // Insert after the first heading (# Changelog)
    const lines = changelog.split('\n');
    const insertIndex = lines.findIndex((line) => line.startsWith('## [')) || 2;
    lines.splice(insertIndex, 0, newEntry);
    const updatedChangelog = lines.join('\n');
    writeFileSync(changelogPath, updatedChangelog);
    console.log(`   ✓ Updated CHANGELOG.md`);
  } else {
    console.log(`   ⏭️  Skipped (dry run)`);
  }
}

/**
 * Update wrangler.toml version (if it has a version field)
 */
function updateWranglerToml(version: string, dryRun: boolean): void {
  const wranglerPath = join(process.cwd(), 'wrangler.toml');

  if (!existsSync(wranglerPath)) {
    console.log(`⚙️  wrangler.toml: Not found, skipping`);
    return;
  }

  const wranglerContent = readFileSync(wranglerPath, 'utf-8');

  // Only update if version field exists
  if (!wranglerContent.match(/^version = /m)) {
    console.log(`⚙️  wrangler.toml: No version field, skipping`);
    return;
  }

  console.log(`⚙️  wrangler.toml: Updating to ${version}`);

  if (!dryRun) {
    const updatedContent = wranglerContent.replace(
      /^version = ".*"$/m,
      `version = "${version}"`
    );
    writeFileSync(wranglerPath, updatedContent);
    console.log(`   ✓ Updated wrangler.toml`);
  } else {
    console.log(`   ⏭️  Skipped (dry run)`);
  }
}

/**
 * Create git tag
 */
async function createGitTag(version: string, dryRun: boolean): Promise<void> {
  console.log(`🏷️  Git tag: v${version}`);

  if (!dryRun) {
    try {
      await $`git tag -a v${version} -m "Release v${version}"`;
      console.log(`   ✓ Created tag v${version}`);
    } catch (error) {
      console.error(`   ❌ Failed to create tag:`, error);
      throw error;
    }
  } else {
    console.log(`   ⏭️  Skipped (dry run)`);
  }
}

/**
 * Main release workflow
 */
async function release(config: ReleaseConfig): Promise<void> {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                                                               ║');
  console.log('║     🚀 AUTOMATED RELEASE 🚀                                   ║');
  console.log('║                                                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');

  const { currentVersion, nextVersion, bumpType, tagExists, dryRun, ci } = config;

  console.log(`Current version: v${currentVersion}`);
  console.log(`Next version:    v${nextVersion}`);
  if (bumpType) {
    console.log(`Bump type:       ${bumpType}`);
  }
  console.log(`Tag exists:      ${tagExists ? 'Yes' : 'No'}`);
  console.log(`Dry run:         ${dryRun ? 'Yes' : 'No'}`);
  console.log(`CI mode:         ${ci ? 'Yes' : 'No'}`);
  console.log('');

  // Update files
  updatePackageJson(nextVersion, dryRun);
  updateChangelog(nextVersion, dryRun);
  updateWranglerToml(nextVersion, dryRun);

  // Create tag if not exists
  if (!tagExists && !dryRun) {
    await createGitTag(nextVersion, dryRun);
  } else if (tagExists) {
    console.log(`🏷️  Git tag: v${nextVersion} already exists`);
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ RELEASE PREPARATION COMPLETE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  if (dryRun) {
    console.log('🏁 Dry run complete - no changes made');
  } else if (!ci) {
    console.log('📝 Next steps:');
    console.log(`  1. Review changes: git diff`);
    console.log(`  2. Commit: git add . && git commit -m "chore: release v${nextVersion}"`);
    if (!tagExists) {
      console.log(`  3. Push tag: git push origin v${nextVersion}`);
    }
    console.log(`  4. Dashboard automation will run automatically on tag push`);
  } else {
    console.log('✅ Release files updated (running in CI)');
  }
  console.log('');
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const ci = process.env.CI === 'true';

  // Get current version
  const currentVersion = getCurrentVersion();

  // Detect version from tag or bump type
  let nextVersion: string;
  let bumpType: 'patch' | 'minor' | 'major' | undefined;

  const tagVersion = await detectVersionFromTag();
  if (tagVersion) {
    // Tag exists on current commit, use it
    nextVersion = tagVersion;
    console.log(`Detected version from git tag: v${nextVersion}`);
  } else if (args.length > 0 && !args[0].startsWith('--')) {
    // Bump type specified
    bumpType = args[0] as 'patch' | 'minor' | 'major';
    if (!['patch', 'minor', 'major'].includes(bumpType)) {
      console.error('❌ Invalid bump type. Use: patch, minor, or major');
      console.log('\nUsage:');
      console.log('  bun run scripts/release.ts              # Auto-detect from tag');
      console.log('  bun run scripts/release.ts patch        # Bump patch version');
      console.log('  bun run scripts/release.ts minor        # Bump minor version');
      console.log('  bun run scripts/release.ts major        # Bump major version');
      console.log('  bun run scripts/release.ts --dry-run    # Dry run without changes');
      process.exit(1);
    }
    nextVersion = calculateNextVersion(currentVersion, bumpType);
  } else {
    // No tag, no bump type - use current version
    nextVersion = currentVersion;
  }

  // Check if tag exists
  const tagExists = await checkTagExists(nextVersion);

  // Run release
  const config: ReleaseConfig = {
    currentVersion,
    nextVersion,
    bumpType,
    tagExists,
    dryRun,
    ci,
  };

  await release(config);
}

// Run if executed directly
if (import.meta.main) {
  main().catch((error) => {
    console.error('');
    console.error('❌ Release failed:', error);
    console.error('');
    process.exit(1);
  });
}

export { release, calculateNextVersion, detectVersionFromTag };
