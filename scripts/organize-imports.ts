#!/usr/bin/env bun
// Organize Imports - Groups and sorts imports
// external → internal → relative, alphabetically

import { globSync } from 'glob';
import { readFileSync, writeFileSync } from 'fs';

interface Import {
  type: 'external' | 'internal' | 'relative';
  line: string;
  module: string;
}

// Detect import type
function detectImportType(line: string): Import['type'] {
  const moduleMatch = line.match(/from ['"](.+)['"]/);
  if (!moduleMatch) return 'external';

  const module = moduleMatch[1];

  if (module.startsWith('.')) return 'relative';
  if (module.startsWith('@/') || module.startsWith('~/')) return 'internal';
  if (module.startsWith('../types/') || module.startsWith('./')) return 'internal';

  return 'external';
}

// Parse imports from file
function parseImports(content: string): { imports: Import[]; rest: string } {
  const lines = content.split('\n');
  const imports: Import[] = [];
  let firstNonImportIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('import ') && !line.includes('import type')) {
      const module = line.match(/from ['"](.+)['"]/)?.[1] || '';
      imports.push({
        type: detectImportType(line),
        line: lines[i], // Keep original formatting
        module
      });
      firstNonImportIndex = i + 1;
    } else if (line && !line.startsWith('//') && !line.startsWith('/*')) {
      break;
    }
  }

  const rest = lines.slice(firstNonImportIndex).join('\n');
  return { imports, rest };
}

// Sort imports
function sortImports(imports: Import[]): string[] {
  const groups = {
    external: [] as Import[],
    internal: [] as Import[],
    relative: [] as Import[]
  };

  imports.forEach(imp => {
    groups[imp.type].push(imp);
  });

  // Sort each group alphabetically by module
  Object.keys(groups).forEach(key => {
    groups[key as keyof typeof groups].sort((a, b) =>
      a.module.localeCompare(b.module)
    );
  });

  // Combine groups with blank lines between
  const sorted: string[] = [];

  if (groups.external.length > 0) {
    sorted.push(...groups.external.map(i => i.line));
    sorted.push('');
  }

  if (groups.internal.length > 0) {
    sorted.push(...groups.internal.map(i => i.line));
    sorted.push('');
  }

  if (groups.relative.length > 0) {
    sorted.push(...groups.relative.map(i => i.line));
    sorted.push('');
  }

  return sorted;
}

// Process single file
function processFile(filePath: string): boolean {
  const content = readFileSync(filePath, 'utf-8');
  const { imports, rest } = parseImports(content);

  if (imports.length === 0) return false;

  const sortedImports = sortImports(imports);
  const newContent = sortedImports.join('\n') + rest;

  if (newContent !== content) {
    writeFileSync(filePath, newContent);
    return true;
  }

  return false;
}

// Main
console.log('📦 Organizing imports...');

const files = globSync('src/**/*.ts', { ignore: ['node_modules/**', 'dist/**'] });
let modified = 0;

files.forEach(file => {
  if (processFile(file)) {
    modified++;
    console.log(`  ✓ ${file}`);
  }
});

console.log(`✅ Organized ${modified}/${files.length} files`);
