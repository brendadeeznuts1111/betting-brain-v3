#!/usr/bin/env bun
/**
 * Forest CLI - At-a-glance status dashboard
 *
 * Shows health, freshness, release status, and analytics at a glance.
 * Zero dependencies, works anywhere Bun runs.
 *
 * Usage:
 *   bun run forest          # Show full dashboard
 *   bun run forest health   # Health check only
 *   bun run forest fresh    # Freshness check only
 *   bun run forest release  # Release status only
 *   bun run forest analytics # Analytics status only
 *
 * Shortcuts:
 *   bun run forest h / f / r / a
 */

import { $ } from 'bun';

// ANSI color codes (no external deps)
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  gray: '\x1b[90m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const c = {
  bold: (str: string) => `${colors.bold}${str}${colors.reset}`,
  gray: (str: string) => `${colors.gray}${str}${colors.reset}`,
  red: (str: string) => `${colors.red}${str}${colors.reset}`,
  green: (str: string) => `${colors.green}${str}${colors.reset}`,
  yellow: (str: string) => `${colors.yellow}${str}${colors.reset}`,
  blue: (str: string) => `${colors.blue}${str}${colors.reset}`,
  cyan: (str: string) => `${colors.cyan}${str}${colors.reset}`,
};

// Configuration
const ENDPOINTS = {
  worker: process.env.WORKER_URL || 'https://betting-brain-v3.nolarose1968-806.workers.dev/health',
  pages: process.env.PAGES_URL || 'https://betting-brain-dashboards.pages.dev',
  grafana: process.env.GRAFANA_URL || 'https://grafana.example.com',
};

/**
 * Health check all services
 */
async function checkHealth(): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};

  for (const [name, url] of Object.entries(ENDPOINTS)) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      results[name] = res.ok;
    } catch {
      results[name] = false;
    }
  }

  return results;
}

/**
 * Check dependency freshness
 */
async function checkFreshness(): Promise<{
  current: string;
  behind: number;
  outdated: string[];
}> {
  try {
    // Get current Bun version
    const current = (await $`bun --version`.text()).trim();

    // Check for outdated packages
    const outdatedOutput = await $`bun outdated 2>&1`.text();
    const outdatedLines = outdatedOutput.split('\n').filter((line) => line.includes('→'));
    const outdated = outdatedLines.map((line) => line.split(/\s+/)[0]).filter(Boolean);

    return {
      current,
      behind: outdated.length,
      outdated,
    };
  } catch {
    return {
      current: 'unknown',
      behind: 0,
      outdated: [],
    };
  }
}

/**
 * Check release status
 */
async function checkRelease(): Promise<{
  current: string;
  ahead: number;
  canRelease: boolean;
}> {
  try {
    // Get current tag
    const currentTag = (await $`git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0"`.text()).trim();

    // Count commits ahead of tag
    const aheadCount = (await $`git rev-list ${currentTag}..HEAD --count 2>/dev/null || echo "0"`.text()).trim();
    const ahead = parseInt(aheadCount, 10);

    return {
      current: currentTag,
      ahead,
      canRelease: ahead > 0,
    };
  } catch {
    return {
      current: 'unknown',
      ahead: 0,
      canRelease: false,
    };
  }
}

/**
 * Check analytics testing status
 */
async function checkAnalytics(): Promise<{
  testFiles: number;
  stubUsage: boolean;
  coveragePercent: number;
}> {
  try {
    // Count test files
    const testFileCount = (await $`find tests -name "*.test.ts" 2>/dev/null | wc -l`.text()).trim();
    const testFiles = parseInt(testFileCount, 10);

    // Check if stub exists
    const stubExists = await Bun.file('tests/utils/analytics-engine-stub.ts').exists();

    // Try to get coverage from last run (if coverage dir exists)
    let coveragePercent = 0;
    try {
      const coverageSummary = await Bun.file('coverage/coverage-summary.json').json();
      if (coverageSummary?.total?.lines?.pct !== undefined) {
        coveragePercent = coverageSummary.total.lines.pct;
      }
    } catch {
      // No coverage data available
      coveragePercent = 0;
    }

    return {
      testFiles,
      stubUsage: stubExists,
      coveragePercent,
    };
  } catch {
    return {
      testFiles: 0,
      stubUsage: false,
      coveragePercent: 0,
    };
  }
}

/**
 * Display health status
 */
async function displayHealth() {
  console.log(c.bold('\n🌲  Forest Health\n'));

  const health = await checkHealth();

  for (const [name, ok] of Object.entries(health)) {
    const status = ok ? c.green('✅') : c.red('❌');
    const statusText = ok ? 'UP' : 'DOWN';
    console.log(`${status}  ${name.padEnd(8)} ${statusText}`);
  }

  console.log('');
}

/**
 * Display freshness status
 */
async function displayFreshness() {
  console.log(c.bold('\n🌿  Freshness\n'));

  const fresh = await checkFreshness();

  console.log(`Current Bun: ${c.yellow(fresh.current)}`);
  console.log(`Outdated packages: ${fresh.behind === 0 ? c.green('0') : c.yellow(String(fresh.behind))}`);

  if (fresh.behind > 0) {
    console.log(`\nOutdated:`);
    fresh.outdated.slice(0, 5).forEach((pkg) => {
      console.log(`  • ${c.gray(pkg)}`);
    });
    if (fresh.outdated.length > 5) {
      console.log(`  ${c.gray(`...and ${fresh.outdated.length - 5} more`)}`);
    }
    console.log(`\nRun ${c.bold('bun run freshness')} to update.`);
  } else {
    console.log(c.green('\n✨ All dependencies fresh'));
  }

  console.log('');
}

/**
 * Display release status
 */
async function displayRelease() {
  console.log(c.bold('\n🏷️  Release Status\n'));

  const release = await checkRelease();

  console.log(`Current tag: ${c.cyan(release.current)}`);
  console.log(`Commits ahead: ${release.ahead === 0 ? c.gray('0') : c.yellow(String(release.ahead))}`);

  if (release.canRelease) {
    console.log(`\nRun ${c.bold('bun run release')} to ship.`);
  } else {
    console.log(c.green('\n✅ Release is up to date'));
  }

  console.log('');
}

/**
 * Display analytics status
 */
async function displayAnalytics() {
  console.log(c.bold('\n📊  Analytics Testing\n'));

  const analytics = await checkAnalytics();

  console.log(`Test files: ${c.blue(String(analytics.testFiles))}`);
  console.log(`Stub available: ${analytics.stubUsage ? c.green('✅') : c.red('❌')}`);
  console.log(`Coverage: ${analytics.coveragePercent > 0 ? c.green(`${analytics.coveragePercent.toFixed(2)}%`) : c.gray('Run tests for coverage')}`);

  if (!analytics.stubUsage) {
    console.log(`\n${c.yellow('⚠️')}  Analytics stub not found at tests/utils/analytics-engine-stub.ts`);
  }

  console.log('');
}

/**
 * Display full dashboard
 */
async function displayDashboard() {
  console.log(c.bold('\n╔═══════════════════════════════════════════════════════════════╗'));
  console.log(c.bold('║                                                               ║'));
  console.log(c.bold('║     🌲 FOREST STATUS DASHBOARD 🌲                            ║'));
  console.log(c.bold('║                                                               ║'));
  console.log(c.bold('╚═══════════════════════════════════════════════════════════════╝'));

  await displayHealth();
  await displayFreshness();
  await displayRelease();
  await displayAnalytics();

  console.log(c.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(c.green('✅ Forest check complete'));
  console.log(c.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log('');
}

/**
 * Display help
 */
function displayHelp() {
  console.log(c.bold('\n🧭  Forest CLI\n'));
  console.log('Usage: bun run forest [command]');
  console.log('');
  console.log('Commands:');
  console.log('  health, h     - Health check all services');
  console.log('  fresh, f      - Dependency freshness');
  console.log('  release, r    - Release readiness');
  console.log('  analytics, a  - Analytics testing status');
  console.log('  dashboard, d  - Full status dashboard (default)');
  console.log('');
  console.log('Shortcuts: bun run forest h / f / r / a / d');
  console.log('');
  console.log('Environment Variables:');
  console.log('  WORKER_URL   - Worker health endpoint');
  console.log('  PAGES_URL    - Cloudflare Pages URL');
  console.log('  GRAFANA_URL  - Grafana instance URL');
  console.log('');
}

/**
 * Main entry point
 */
async function main() {
  const [cmd] = process.argv.slice(2);

  switch (cmd) {
    case 'health':
    case 'h':
      await displayHealth();
      break;

    case 'fresh':
    case 'freshness':
    case 'f':
      await displayFreshness();
      break;

    case 'release':
    case 'r':
      await displayRelease();
      break;

    case 'analytics':
    case 'a':
      await displayAnalytics();
      break;

    case 'dashboard':
    case 'd':
    case undefined:
      await displayDashboard();
      break;

    case 'help':
    case '--help':
    case '-h':
      displayHelp();
      break;

    default:
      console.error(c.red(`\n❌ Unknown command: ${cmd}\n`));
      displayHelp();
      process.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  main().catch((error) => {
    console.error(c.red('\n❌ Forest check failed:'), error);
    console.error('');
    process.exit(1);
  });
}

export { checkHealth, checkFreshness, checkRelease, checkAnalytics };
