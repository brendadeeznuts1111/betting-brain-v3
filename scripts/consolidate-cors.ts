#!/usr/bin/env bun

/**
 * CORS Consolidation Script
 *
 * Replaces duplicate corsHeaders definitions with imports from utils/request.ts
 * across all route files.
 */

import { readFile, writeFile } from 'fs/promises';
import { glob } from 'glob';

interface FixResult {
  file: string;
  fixed: boolean;
  replacements: number;
}

const results: FixResult[] = [];

const files = await glob('src/routes/**/*.ts');

for (const file of files) {
  const content = await readFile(file, 'utf-8');
  let modified = content;
  let replacements = 0;

  // Check if file already imports CORS_HEADERS
  const hasImport = content.includes("from '../utils/request'") ||
                    content.includes("from '../../utils/request'");

  // Pattern 1: const corsHeaders = { 'Access-Control-Allow-Origin': '*', ... }
  const pattern = /const corsHeaders = \{[^}]*'Access-Control-Allow-Origin'[^}]*\};?/g;

  if (pattern.test(content)) {
    // Add import if not present
    if (!hasImport) {
      const depth = (file.match(/\//g) || []).length - 2; // Calculate relative path depth
      const importPath = depth === 2 ? '../utils/request' : '../../utils/request';

      // Find the last import statement
      const lastImportIndex = content.lastIndexOf('import ');
      const nextNewlineIndex = content.indexOf('\n', lastImportIndex);

      modified = content.slice(0, nextNewlineIndex + 1) +
                `import { CORS_HEADERS } from '${importPath}';\n` +
                content.slice(nextNewlineIndex + 1);
    }

    // Replace all corsHeaders definitions with CORS_HEADERS
    modified = modified.replace(pattern, '');

    // Replace usage of corsHeaders with CORS_HEADERS
    modified = modified.replace(/\bcorsHeaders\b/g, 'CORS_HEADERS');

    replacements++;
  }

  if (modified !== content) {
    await writeFile(file, modified, 'utf-8');
    results.push({ file, fixed: true, replacements });
    console.log(`✅ Fixed: ${file} (${replacements} replacements)`);
  } else {
    results.push({ file, fixed: false, replacements: 0 });
  }
}

console.log('\n📊 Summary:');
console.log(`Total files processed: ${results.length}`);
console.log(`Files fixed: ${results.filter(r => r.fixed).length}`);
console.log(`Total replacements: ${results.reduce((sum, r) => sum + r.replacements, 0)}`);
