#!/usr/bin/env bun
// Fuzzy Code Search - < 20ms results from pre-built index
// Usage: bun scripts/search.ts "steam"

import { readFileSync, existsSync } from 'fs';
import Fuse from 'fuse.js';

interface IndexEntry {
  file: string;
  line: number;
  column: number;
  text: string;
  keyword: string;
  symbolType?: 'function' | 'class' | 'interface' | 'const' | 'type';
  context: {
    before: string[];
    after: string[];
  };
}

const INDEX_FILE = '.rgindex.json';

// Symbol type icons
const SYMBOL_ICONS = {
  function: '⚙',
  class: '◆',
  interface: '◇',
  const: '■',
  type: '▲'
};

// Load index
function loadIndex(): IndexEntry[] {
  if (!existsSync(INDEX_FILE)) {
    console.error(`❌ Index not found: ${INDEX_FILE}`);
    console.error('   Run: just search-index');
    process.exit(1);
  }

  return JSON.parse(readFileSync(INDEX_FILE, 'utf-8'));
}

// Perform fuzzy search
function fuzzySearch(query: string, entries: IndexEntry[]): IndexEntry[] {
  const fuse = new Fuse(entries, {
    keys: ['text', 'keyword', 'file'],
    threshold: 0.3, // Typo tolerance
    includeScore: true
  });

  const results = fuse.search(query);
  return results.map(r => r.item);
}

// Format result for terminal
function formatResult(entry: IndexEntry, index: number): string {
  const icon = entry.symbolType ? SYMBOL_ICONS[entry.symbolType] : '•';
  const location = `${entry.file}:${entry.line}:${entry.column}`;

  let output = `\n${index + 1}. ${icon} ${location}\n`;

  // Context before (dimmed)
  entry.context.before.forEach(line => {
    output += `   \x1b[2m${line}\x1b[0m\n`;
  });

  // Matched line (highlighted)
  output += `   \x1b[1;33m${entry.text}\x1b[0m\n`;

  // Context after (dimmed)
  entry.context.after.forEach(line => {
    output += `   \x1b[2m${line}\x1b[0m\n`;
  });

  return output;
}

// Main
const query = process.argv[2];

if (!query) {
  console.log('Usage: bun scripts/search.ts "query"');
  console.log('Example: bun scripts/search.ts "steam"');
  process.exit(1);
}

console.log(`🔍 Searching for: "${query}"\n`);

const startTime = Date.now();
const index = loadIndex();
const results = fuzzySearch(query, index);
const searchTime = Date.now() - startTime;

if (results.length === 0) {
  console.log('❌ No results found');
  console.log('   Try: just search-index --rebuild');
  process.exit(0);
}

console.log(`✅ Found ${results.length} results in ${searchTime}ms\n`);

// Show top 10 results
results.slice(0, 10).forEach((entry, index) => {
  console.log(formatResult(entry, index));
});

if (results.length > 10) {
  console.log(`\n... and ${results.length - 10} more results`);
}

console.log(`\n💡 Tip: Use VS Code link: vscode://file/${process.cwd()}/[file]:[line]:[column]`);
