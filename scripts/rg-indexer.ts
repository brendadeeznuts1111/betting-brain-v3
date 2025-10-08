#!/usr/bin/env bun
// Ripgrep Indexer - Builds searchable code index in < 20ms
// Usage: bun scripts/rg-indexer.ts [--rebuild] [--check]

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { $ } from 'bun';

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

interface IndexMetadata {
  version: string;
  generatedAt: number;
  totalEntries: number;
  keywords: string[];
  fileCount: number;
}

const INDEX_FILE = '.rgindex.json';
const META_FILE = '.rgmeta.json';
const KEYWORDS_FILE = '.rgkeywords';

// Load keywords from file
function loadKeywords(): string[] {
  if (!existsSync(KEYWORDS_FILE)) {
    console.error(`❌ Keywords file not found: ${KEYWORDS_FILE}`);
    process.exit(1);
  }

  const content = readFileSync(KEYWORDS_FILE, 'utf-8');
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));
}

// Run ripgrep with JSON output
async function runRipgrep(keywords: string[]): Promise<IndexEntry[]> {
  const entries: IndexEntry[] = [];

  for (const keyword of keywords) {
    try {
      // Run ripgrep with JSON output
      const result = await $`rg --json -i -n -C 2 ${keyword} src/`.quiet();
      const lines = result.stdout.toString().split('\n').filter(Boolean);

      let currentMatch: Partial<IndexEntry> = {};
      let contextBefore: string[] = [];
      let contextAfter: string[] = [];

      for (const line of lines) {
        try {
          const data = JSON.parse(line);

          if (data.type === 'match') {
            const match = data.data;
            currentMatch = {
              file: match.path.text,
              line: match.line_number,
              column: match.submatches[0]?.start || 0,
              text: match.lines.text.trim(),
              keyword,
              symbolType: detectSymbolType(match.lines.text),
              context: {
                before: contextBefore.slice(-2),
                after: []
              }
            };
          } else if (data.type === 'context') {
            const context = data.data;
            if (currentMatch.line && context.line_number < currentMatch.line) {
              contextBefore.push(context.lines.text.trim());
            } else if (currentMatch.line && context.line_number > currentMatch.line) {
              contextAfter.push(context.lines.text.trim());

              // If we have enough context, save the entry
              if (contextAfter.length === 2) {
                currentMatch.context!.after = contextAfter;
                entries.push(currentMatch as IndexEntry);
                currentMatch = {};
                contextBefore = [];
                contextAfter = [];
              }
            }
          }
        } catch (parseError) {
          // Skip malformed JSON lines
        }
      }

      // Save last match if exists
      if (currentMatch.file) {
        currentMatch.context!.after = contextAfter;
        entries.push(currentMatch as IndexEntry);
      }
    } catch (error) {
      // Keyword not found, continue
    }
  }

  return entries;
}

// Detect symbol type from code line
function detectSymbolType(line: string): IndexEntry['symbolType'] {
  if (/^\s*(export\s+)?function\s+/.test(line)) return 'function';
  if (/^\s*(export\s+)?class\s+/.test(line)) return 'class';
  if (/^\s*(export\s+)?interface\s+/.test(line)) return 'interface';
  if (/^\s*(export\s+)?const\s+/.test(line)) return 'const';
  if (/^\s*(export\s+)?type\s+/.test(line)) return 'type';
  return undefined;
}

// Build index
async function buildIndex(): Promise<void> {
  console.log('🔍 Building ripgrep search index...');

  const keywords = loadKeywords();
  console.log(`📋 Loaded ${keywords.length} keywords from ${KEYWORDS_FILE}`);

  const startTime = Date.now();
  const entries = await runRipgrep(keywords);
  const buildTime = Date.now() - startTime;

  // Count unique files
  const uniqueFiles = new Set(entries.map(e => e.file));

  // Generate metadata
  const metadata: IndexMetadata = {
    version: '1.0.0',
    generatedAt: Date.now(),
    totalEntries: entries.length,
    keywords,
    fileCount: uniqueFiles.size
  };

  // Write index and metadata
  writeFileSync(INDEX_FILE, JSON.stringify(entries, null, 2));
  writeFileSync(META_FILE, JSON.stringify(metadata, null, 2));

  console.log(`✅ Index built in ${buildTime}ms`);
  console.log(`   📊 ${entries.length} entries across ${uniqueFiles.size} files`);
  console.log(`   💾 Index size: ${(JSON.stringify(entries).length / 1024).toFixed(2)} KB`);
}

// Check if index is fresh
function checkIndexFreshness(): boolean {
  if (!existsSync(INDEX_FILE) || !existsSync(META_FILE)) {
    console.error('❌ Index files not found. Run with --rebuild.');
    return false;
  }

  const metadata: IndexMetadata = JSON.parse(readFileSync(META_FILE, 'utf-8'));
  const keywords = loadKeywords();

  // Check if keywords changed
  if (metadata.keywords.length !== keywords.length) {
    console.error('❌ Keywords count changed. Run with --rebuild.');
    return false;
  }

  if (!metadata.keywords.every(k => keywords.includes(k))) {
    console.error('❌ Keywords modified. Run with --rebuild.');
    return false;
  }

  console.log('✅ Index is fresh');
  return true;
}

// Main
const args = process.argv.slice(2);
const rebuild = args.includes('--rebuild');
const check = args.includes('--check');

if (check) {
  const isFresh = checkIndexFreshness();
  process.exit(isFresh ? 0 : 1);
} else if (rebuild) {
  await buildIndex();
} else {
  console.log('Usage: bun scripts/rg-indexer.ts [--rebuild] [--check]');
  console.log('  --rebuild: Rebuild the search index');
  console.log('  --check:   Check if index is fresh');
}
