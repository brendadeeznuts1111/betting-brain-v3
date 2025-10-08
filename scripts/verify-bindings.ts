#!/usr/bin/env bun
// Binding Verifier - Ensures all wrangler.toml bindings are used in code
// Usage: bun scripts/verify-bindings.ts [--strict]

import { readFileSync } from 'fs';
import { $ } from 'bun';

interface Binding {
  name: string;
  type: 'd1' | 'kv' | 'queue_producer' | 'queue_consumer' | 'analytics' | 'var';
  location: string; // Line number in wrangler.toml
}

interface VerificationResult {
  binding: Binding;
  used: boolean;
  occurrences: number;
  files: string[];
}

// Parse wrangler.toml for bindings
async function parseBindings(): Promise<Binding[]> {
  const toml = readFileSync('wrangler.toml', 'utf-8');
  const lines = toml.split('\n');
  const bindings: Binding[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // D1 databases
    if (line.match(/^binding = "([A-Z_]+)"/)) {
      const match = line.match(/binding = "([A-Z_]+)"/);
      if (match && lines[i - 1]?.includes('[[d1_databases]]')) {
        bindings.push({
          name: match[1],
          type: 'd1',
          location: `wrangler.toml:${i + 1}`
        });
      }
    }

    // KV namespaces
    if (line.match(/^binding = "([A-Z_]+)"/)) {
      const match = line.match(/binding = "([A-Z_]+)"/);
      if (match && lines[i - 1]?.includes('[[kv_namespaces]]')) {
        bindings.push({
          name: match[1],
          type: 'kv',
          location: `wrangler.toml:${i + 1}`
        });
      }
    }

    // Queue producers
    if (line.match(/^binding = "([A-Z_]+)"/)) {
      const match = line.match(/binding = "([A-Z_]+)"/);
      if (match && lines[i - 1]?.includes('[[queues.producers]]')) {
        bindings.push({
          name: match[1],
          type: 'queue_producer',
          location: `wrangler.toml:${i + 1}`
        });
      }
    }

    // Analytics Engine
    if (line.match(/^binding = "([A-Z_]+)"/)) {
      const match = line.match(/binding = "([A-Z_]+)"/);
      if (match && lines[i - 1]?.includes('[[analytics_engine_datasets]]')) {
        bindings.push({
          name: match[1],
          type: 'analytics',
          location: `wrangler.toml:${i + 1}`
        });
      }
    }

    // Environment variables
    if (line.match(/^([A-Z_]+) = /)) {
      const match = line.match(/^([A-Z_]+) = /);
      if (match) {
        bindings.push({
          name: match[1],
          type: 'var',
          location: `wrangler.toml:${i + 1}`
        });
      }
    }
  }

  // Remove duplicates (prod env duplicates dev env)
  const uniqueBindings = Array.from(
    new Map(bindings.map(b => [b.name, b])).values()
  );

  return uniqueBindings;
}

// Search for binding usage in code
async function searchBinding(bindingName: string): Promise<{ count: number; files: string[] }> {
  try {
    const result = await $`rg -l "env\\.${bindingName}\\b" src/`.quiet();
    const files = result.stdout.toString().trim().split('\n').filter(Boolean);

    // Count occurrences
    const countResult = await $`rg -c "env\\.${bindingName}\\b" src/`.quiet();
    const counts = countResult.stdout.toString().trim().split('\n');
    const totalCount = counts
      .map(line => parseInt(line.split(':')[1] || '0'))
      .reduce((sum, count) => sum + count, 0);

    return { count: totalCount, files };
  } catch (error) {
    return { count: 0, files: [] };
  }
}

// Verify all bindings
async function verifyBindings(): Promise<VerificationResult[]> {
  const bindings = await parseBindings();
  const results: VerificationResult[] = [];

  console.log(`🔍 Verifying ${bindings.length} bindings...`);

  for (const binding of bindings) {
    const { count, files } = await searchBinding(binding.name);

    results.push({
      binding,
      used: count > 0,
      occurrences: count,
      files
    });
  }

  return results;
}

// Generate report
function generateReport(results: VerificationResult[], strict: boolean): void {
  const used = results.filter(r => r.used);
  const unused = results.filter(r => !r.used);

  console.log('\n📊 Binding Verification Report\n');
  console.log(`✅ Used bindings: ${used.length}`);
  console.log(`❌ Unused bindings: ${unused.length}`);
  console.log(`📈 Coverage: ${((used.length / results.length) * 100).toFixed(1)}%\n`);

  // Show unused bindings
  if (unused.length > 0) {
    console.log('❌ Unused Bindings:\n');
    unused.forEach(result => {
      console.log(`   ${result.binding.type.toUpperCase()}: ${result.binding.name}`);
      console.log(`   Location: ${result.binding.location}`);
      console.log(`   Action: Remove or use this binding\n`);
    });
  }

  // Show most used bindings
  const topUsed = used
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, 10);

  if (topUsed.length > 0) {
    console.log('🔥 Top 10 Used Bindings:\n');
    topUsed.forEach((result, i) => {
      console.log(`   ${i + 1}. ${result.binding.name} (${result.occurrences} uses in ${result.files.length} files)`);
    });
    console.log();
  }

  // Check for missing type definitions
  console.log('🔍 Type Definition Check:\n');
  const typeFile = readFileSync('src/types/api.ts', 'utf-8');

  results.forEach(result => {
    if (!typeFile.includes(result.binding.name)) {
      console.log(`   ⚠️  ${result.binding.name}: Missing in Env interface`);
    }
  });

  // Exit with error if strict mode and unused bindings found
  if (strict && unused.length > 0) {
    console.error('\n❌ Strict mode: Failing due to unused bindings');
    process.exit(1);
  }

  if (unused.length === 0) {
    console.log('\n✅ All bindings are in use!');
  }
}

// Main
const args = process.argv.slice(2);
const strict = args.includes('--strict');

const results = await verifyBindings();
generateReport(results, strict);
