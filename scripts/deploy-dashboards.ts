#!/usr/bin/env bun
/**
 * Deploy Dashboards to Cloudflare Pages
 *
 * This script automates dashboard deployment:
 * 1. Builds dashboard artifacts (stamp version, minify)
 * 2. Deploys to Cloudflare Pages
 * 3. Outputs live URL
 *
 * Usage:
 *   bun run scripts/deploy-dashboards.ts
 *
 * Environment:
 *   CLOUDFLARE_ACCOUNT_ID - Your Cloudflare account ID
 *   CLOUDFLARE_API_TOKEN - API token with Pages write permissions
 */

import { $ } from 'bun';
import { mkdir, readdir } from 'fs/promises';
import { join } from 'path';

const DASHBOARD_PROJECT = 'betting-brain-dashboards'; // Cloudflare Pages project name
const SOURCE_DIR = 'dashboards';
const BUILD_DIR = 'dist/dashboards';

/**
 * Read package.json for version
 */
async function getVersion(): Promise<string> {
  const pkg = await Bun.file('package.json').json();
  return pkg.version;
}

/**
 * Build dashboard artifacts
 */
async function buildDashboards(version: string): Promise<void> {
  console.log(`📦 Building dashboards (v${version})...`);

  // Create build directory
  await mkdir(BUILD_DIR, { recursive: true });

  // Get all HTML files
  const files = await readdir(SOURCE_DIR);
  const htmlFiles = files.filter(f => f.endsWith('.html'));

  console.log(`   Found ${htmlFiles.length} dashboard files`);

  // Process each HTML file
  for (const file of htmlFiles) {
    const sourcePath = join(SOURCE_DIR, file);
    const destPath = join(BUILD_DIR, file);

    let html = await Bun.file(sourcePath).text();

    // Stamp version
    html = html.replace(/{{VERSION}}/g, version);
    html = html.replace(/\bv\d+\.\d+\.\d+\b/g, `v${version}`);

    // Minify (strip comments, collapse whitespace)
    html = html
      .replace(/<!--[\s\S]*?-->/g, '') // Remove HTML comments
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove CSS/JS block comments
      .replace(/\/\/.*/g, '')           // Remove JS line comments
      .replace(/\s+/g, ' ')             // Collapse whitespace
      .replace(/>\s+</g, '><')          // Remove space between tags
      .trim();

    await Bun.write(destPath, html);
    console.log(`   ✓ Built ${file}`);
  }

  // Copy shared assets if they exist
  const sharedDir = join(SOURCE_DIR, 'shared');
  try {
    await $`cp -r ${sharedDir} ${BUILD_DIR}/shared`;
    console.log(`   ✓ Copied shared assets`);
  } catch {
    // Shared directory doesn't exist, skip
  }

  console.log(`✅ Dashboard build complete`);
}

/**
 * Deploy to Cloudflare Pages
 */
async function deployToPages(): Promise<string> {
  console.log(`🚀 Deploying to Cloudflare Pages...`);

  try {
    // Deploy using wrangler
    const result = await $`wrangler pages deploy ${BUILD_DIR} --project-name=${DASHBOARD_PROJECT}`.text();

    // Extract URL from output
    const urlMatch = result.match(/https:\/\/[^\s]+/);
    const liveUrl = urlMatch ? urlMatch[0] : `https://${DASHBOARD_PROJECT}.pages.dev`;

    console.log(`✅ Dashboards deployed successfully!`);
    console.log(`   Live at: ${liveUrl}`);

    return liveUrl;
  } catch (error) {
    console.error(`❌ Deployment failed:`, error);
    throw error;
  }
}

/**
 * Main deployment workflow
 */
async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                                                               ║');
  console.log('║     📊 DASHBOARD DEPLOYMENT AUTOMATION 📊                     ║');
  console.log('║                                                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    // Get version
    const version = await getVersion();
    console.log(`Version: v${version}`);
    console.log('');

    // Build dashboards
    await buildDashboards(version);
    console.log('');

    // Deploy to Cloudflare Pages
    const liveUrl = await deployToPages();
    console.log('');

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ DEPLOYMENT COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log(`📊 Dashboards: ${liveUrl}`);
    console.log(`📝 Version: v${version}`);
    console.log('');
    console.log('Next steps:');
    console.log('  1. Verify dashboards are working');
    console.log('  2. Update README.md with live URL (run update-readme.ts)');
    console.log('  3. Import Grafana dashboard (run push-grafana.ts)');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('❌ Deployment failed:', error);
    console.error('');
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  main();
}

export { buildDashboards, deployToPages, getVersion };
