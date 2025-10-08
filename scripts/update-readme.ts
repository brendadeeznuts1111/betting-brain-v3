#!/usr/bin/env bun
/**
 * Auto-Update README.md for Dashboard Automation
 *
 * This script automatically updates README.md with:
 * 1. Current version from package.json
 * 2. Fixed dashboard links (JSON → HTML index + Grafana setup)
 * 3. Auto-deployment notice
 * 4. Updated dashboard references
 *
 * Usage:
 *   bun run scripts/update-readme.ts
 *
 * Modified Files:
 *   - README.md (version refs, dashboard links)
 *   - dashboards/README.md (version update)
 */

/**
 * Get current version from package.json
 */
async function getVersion(): Promise<string> {
  const pkg = await Bun.file('package.json').json();
  return pkg.version;
}

/**
 * Update main README.md
 */
async function updateMainReadme(version: string): Promise<boolean> {
  console.log('📝 Updating README.md...');

  let readme = await Bun.file('README.md').text();
  let changed = false;

  // 1. Update version in header
  const oldHeader = /# 🧠 Betting-Brain v\d+\.\d+\.\d+/;
  if (oldHeader.test(readme)) {
    readme = readme.replace(oldHeader, `# 🧠 Betting-Brain v${version}`);
    console.log(`   ✓ Updated header version to v${version}`);
    changed = true;
  }

  // 2. Fix misleading dashboard link in header nav
  const misleadingLink = /\[📊 Dashboard\]\(monitoring\/grafana\/dashboard\.json\)/;
  if (misleadingLink.test(readme)) {
    readme = readme.replace(
      misleadingLink,
      '[📊 Dashboards](dashboards/index.html) | [⚙️ Grafana Setup](monitoring/grafana/README.md)'
    );
    console.log(`   ✓ Fixed misleading dashboard link`);
    changed = true;
  }

  // 3. Add auto-deployment notice (if not present)
  const autoNotice = `<!-- auto-generated dashboard links -->
> 🚀 **Dashboards deploy automatically on release.**
> Open [HTML dashboards](dashboards/index.html) locally or visit [Grafana setup guide](monitoring/grafana/README.md) to import the JSON.
`;

  if (!readme.includes('auto-generated dashboard links')) {
    // Insert after the header navigation line
    const headerNavPattern = /(\[📚 Documentation Index\].*\n)/;
    if (headerNavPattern.test(readme)) {
      readme = readme.replace(headerNavPattern, `$1\n${autoNotice}\n`);
      console.log(`   ✓ Added auto-deployment notice`);
      changed = true;
    }
  }

  // 4. Update any other v3.X.X references in README
  const versionPattern = /\bv3\.\d+\.\d+\b/g;
  const matches = readme.match(versionPattern);
  if (matches && matches.length > 0) {
    // Only update if version is different
    const uniqueVersions = [...new Set(matches)];
    if (uniqueVersions.some(v => v !== `v${version}`)) {
      readme = readme.replace(versionPattern, `v${version}`);
      console.log(`   ✓ Updated ${uniqueVersions.length} version reference(s)`);
      changed = true;
    }
  }

  // 5. Update dashboard version badges (if any)
  const badgePattern = /dashboards\/README\.md\?v=\d+\.\d+\.\d+/g;
  if (badgePattern.test(readme)) {
    readme = readme.replace(badgePattern, `dashboards/README.md?v=${version}`);
    console.log(`   ✓ Updated dashboard version badges`);
    changed = true;
  }

  if (changed) {
    await Bun.write('README.md', readme);
    console.log('✅ README.md updated');
  } else {
    console.log('ℹ️  README.md already up to date');
  }

  return changed;
}

/**
 * Update dashboards/README.md
 */
async function updateDashboardsReadme(version: string): Promise<boolean> {
  console.log('');
  console.log('📝 Updating dashboards/README.md...');

  const dashboardReadmePath = 'dashboards/README.md';
  let readme = await Bun.file(dashboardReadmePath).text();
  let changed = false;

  // 1. Update version in frontmatter
  const versionPattern = /\*\*Version:\*\* \d+\.\d+\.\d+/;
  if (versionPattern.test(readme)) {
    readme = readme.replace(versionPattern, `**Version:** ${version}`);
    console.log(`   ✓ Updated version to ${version}`);
    changed = true;
  }

  // 2. Update Last Updated date
  const today = new Date().toISOString().split('T')[0];
  const lastUpdatedPattern = /\*\*Last Updated:\*\* \d{4}-\d{2}-\d{2}/;
  if (lastUpdatedPattern.test(readme)) {
    readme = readme.replace(lastUpdatedPattern, `**Last Updated:** ${today}`);
    console.log(`   ✓ Updated last updated date to ${today}`);
    changed = true;
  }

  if (changed) {
    await Bun.write(dashboardReadmePath, readme);
    console.log('✅ dashboards/README.md updated');
  } else {
    console.log('ℹ️  dashboards/README.md already up to date');
  }

  return changed;
}

/**
 * Main update workflow
 */
async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                                                               ║');
  console.log('║     📝 README AUTO-UPDATE 📝                                  ║');
  console.log('║                                                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    // Get current version
    const version = await getVersion();
    console.log(`Current version: v${version}`);
    console.log('');

    // Update files
    const mainChanged = await updateMainReadme(version);
    const dashboardsChanged = await updateDashboardsReadme(version);

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ UPDATE COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    if (mainChanged || dashboardsChanged) {
      console.log('📝 Files modified:');
      if (mainChanged) console.log('   • README.md');
      if (dashboardsChanged) console.log('   • dashboards/README.md');
      console.log('');
      console.log('Next steps:');
      console.log('  1. Review changes: git diff README.md dashboards/README.md');
      console.log('  2. Commit: git add README.md dashboards/README.md');
      console.log('  3. Commit message: chore: auto-update dashboard links [skip ci]');
    } else {
      console.log('ℹ️  No changes needed');
    }
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('❌ Update failed:', error);
    console.error('');
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  main();
}

export { updateMainReadme, updateDashboardsReadme, getVersion };
