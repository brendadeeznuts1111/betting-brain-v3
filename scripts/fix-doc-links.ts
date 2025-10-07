#!/usr/bin/env bun
/**
 * Fix Broken Documentation Links
 *
 * This script automatically fixes broken links across all markdown files.
 * It uses path mappings to correct moved/renamed files.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, relative } from 'path';

// Path mappings: old pattern -> new path
const PATH_MAPPINGS: Record<string, string> = {
  // Root files moved to docs/
  'QUICKSTART.md': 'docs/QUICKSTART.md',
  'API.md': 'docs/API.md',
  'CONTRIBUTING.md': 'docs/CONTRIBUTING.md',
  'CHANGELOG.md': 'docs/CHANGELOG.md',
  'IMPLEMENTATION_SUMMARY.md': 'docs/IMPLEMENTATION_SUMMARY.md',

  // Guides
  'TESTING_GUIDE.md': 'docs/guides/TESTING_GUIDE.md',
  'DEBUGGING_DATA_CAPTURE.md': 'docs/guides/DEBUGGING_DATA_CAPTURE.md',
  'START_HERE.md': 'docs/guides/START_HERE.md',
  'AGENT_RISK_GUIDE.md': 'docs/guides/AGENT_RISK_GUIDE.md',

  // Monitoring files
  'monitoring/grafana/dashboard.json': 'monitoring/grafana/dashboard.json',

  // Index files
  'docs/INDEX.md': 'docs/INDEX.md',

  // Archive files
  'BUILD_REPORT.md': 'docs/archive/BUILD_REPORT.md',
  'URGENT_TEST_FIXES.md': 'docs/archive/URGENT_TEST_FIXES.md',
  'ORGANIZATION_SUMMARY.md': 'docs/archive/ORGANIZATION_SUMMARY.md',
  'FIXES_APPLIED.md': 'docs/archive/FIXES_APPLIED.md',
  'REVIEW_AND_GAPS.md': 'docs/archive/REVIEW_AND_GAPS.md',
  'LINK_VERIFICATION.md': 'docs/archive/LINK_VERIFICATION.md',

  // Dashboard files
  'dashboards/index.html': 'dashboards/index.html',
  'tools/index.html': 'tools/index.html',

  // Root files from subdirs
  'README.md': 'README.md',
  'CLAUDE.md': 'CLAUDE.md',
  'LICENSE': 'LICENSE',
};

function getAllMarkdownFiles(dir: string): string[] {
  const files: string[] = [];

  const items = readdirSync(dir);
  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      // Skip node_modules, .git, etc.
      if (!item.startsWith('.') && item !== 'node_modules' && item !== 'dist' && item !== 'coverage') {
        files.push(...getAllMarkdownFiles(fullPath));
      }
    } else if (item.endsWith('.md')) {
      files.push(fullPath);
    }
  }

  return files;
}

function fixLinksInFile(filePath: string): number {
  const content = readFileSync(filePath, 'utf-8');
  const fileDir = dirname(filePath);
  let fixCount = 0;

  // Match markdown links: [text](path)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

  const newContent = content.replace(linkRegex, (match, text, link) => {
    // Skip external links
    if (link.startsWith('http://') || link.startsWith('https://') || link.startsWith('#')) {
      return match;
    }

    // Check each mapping
    for (const [oldPattern, newPath] of Object.entries(PATH_MAPPINGS)) {
      if (link.includes(oldPattern) || link === oldPattern || link.endsWith(oldPattern)) {
        // Calculate relative path from current file to new location
        const absoluteNewPath = join(process.cwd(), newPath);
        const relativePath = relative(fileDir, absoluteNewPath);

        console.log(`  ✓ Fixed: ${link} → ${relativePath}`);
        fixCount++;

        return `[${text}](${relativePath})`;
      }
    }

    // Additional fix: if link starts with docs/ from within docs/, remove the prefix
    if (filePath.includes('/docs/') && link.startsWith('docs/')) {
      const fixedLink = '../' + link.substring(5);
      console.log(`  ✓ Fixed relative: ${link} → ${fixedLink}`);
      fixCount++;
      return `[${text}](${fixedLink})`;
    }

    return match;
  });

  if (fixCount > 0) {
    writeFileSync(filePath, newContent, 'utf-8');
  }

  return fixCount;
}

async function main() {
  console.log('🔍 Finding all markdown files...\n');

  const mdFiles = getAllMarkdownFiles(process.cwd());
  console.log(`Found ${mdFiles.length} markdown files\n`);

  let totalFixes = 0;
  const fixedFiles: string[] = [];

  for (const file of mdFiles) {
    const relativePath = relative(process.cwd(), file);
    const fixes = fixLinksInFile(file);

    if (fixes > 0) {
      console.log(`📝 ${relativePath}: ${fixes} links fixed`);
      fixedFiles.push(relativePath);
      totalFixes += fixes;
    }
  }

  console.log(`\n✅ Fixed ${totalFixes} links across ${fixedFiles.length} files`);

  if (fixedFiles.length > 0) {
    console.log('\nFiles modified:');
    fixedFiles.forEach(f => console.log(`  - ${f}`));
  }
}

main().catch(console.error);
