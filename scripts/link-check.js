#!/usr/bin/env node
/**
 * Dead-Link Checker
 * Validates all internal markdown links in the repository
 */

import { glob } from 'glob';
import { readFileSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const __root = resolve(__dirname, '..');

console.log('🔍 Checking all markdown links...\n');

async function main() {
  const mdFiles = await glob('**/*.md', { 
    cwd: __root,
    ignore: ['node_modules/**', 'dist/**', '.wrangler/**']
  });

  console.log(`📄 Found ${mdFiles.length} markdown files\n`);

  const errors = [];
  const checked = new Set();
  let totalLinks = 0;

  for (const file of mdFiles) {
    const fullPath = join(__root, file);
    const content = readFileSync(fullPath, 'utf8');
    const fileDir = dirname(fullPath);

    // Extract all markdown links: [text](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
      const linkText = match[1];
      const linkUrl = match[2];

      // Skip external URLs, anchors, and mailto links
      if (linkUrl.startsWith('http') || 
          linkUrl.startsWith('#') || 
          linkUrl.startsWith('mailto:')) {
        continue;
      }

      totalLinks++;

      // Resolve relative path
      const targetPath = resolve(fileDir, linkUrl);
      const linkKey = `${file} → ${linkUrl}`;

      if (checked.has(linkKey)) {
        continue;
      }
      checked.add(linkKey);

      // Check if target exists
      if (!existsSync(targetPath)) {
        errors.push({
          file,
          link: linkUrl,
          text: linkText,
          resolved: targetPath
        });
      }
    }
  }

  // Report results
  console.log(`✅ Checked ${totalLinks} internal links\n`);

  if (errors.length === 0) {
    console.log('✅ All internal links are valid!\n');
    console.log('📊 Summary:');
    console.log(`  - Files scanned: ${mdFiles.length}`);
    console.log(`  - Links checked: ${totalLinks}`);
    console.log(`  - Broken links: 0`);
    console.log(`  - Status: PASS ✅\n`);
    process.exit(0);
  }

  // Report errors
  console.error('❌ Dead links found:\n');
  
  for (const error of errors) {
    console.error(`  ${error.file}`);
    console.error(`    → [${error.text}](${error.link})`);
    console.error(`    Resolved to: ${error.resolved}`);
    console.error(`    Status: MISSING ❌\n`);
  }

  console.error(`\n📊 Summary:`);
  console.error(`  - Files scanned: ${mdFiles.length}`);
  console.error(`  - Links checked: ${totalLinks}`);
  console.error(`  - Broken links: ${errors.length}`);
  console.error(`  - Status: FAIL ❌\n`);

  process.exit(1);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
