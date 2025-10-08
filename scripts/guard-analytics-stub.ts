#!/usr/bin/env bun
/**
 * Analytics Stub Consistency Guard
 *
 * This guard ensures tests use the canonical analytics-engine-stub.ts
 * instead of directly mocking ANALYTICS_ENGINE.
 *
 * Purpose:
 * - Prevent test drift and inconsistent mocking patterns
 * - Enforce use of tests/utils/analytics-engine-stub.ts
 * - Fail CI if direct mocking is detected
 *
 * Usage:
 *   bun run scripts/guard-analytics-stub.ts
 *   bun run guard:analytics
 *
 * Exit codes:
 *   0 - All tests use the stub correctly
 *   1 - Direct mocking detected or scan error
 */

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

interface ViolationFinding {
  file: string;
  line: number;
  content: string;
  pattern: string;
}

/**
 * Patterns that indicate direct mocking of analytics
 */
const FORBIDDEN_PATTERNS = [
  // Direct ANALYTICS_ENGINE mocking
  /ANALYTICS_ENGINE\s*[:=]\s*\{/,
  /ANALYTICS_ENGINE\s*=\s*{/,

  // Mock function assignments to ANALYTICS_ENGINE
  /mock.*ANALYTICS_ENGINE/i,
  /vi\.fn.*ANALYTICS_ENGINE/,

  // Direct property assignment (but allow stub usage)
  /env\.ANALYTICS_ENGINE\s*=\s*\{(?!.*stub)/,
];

/**
 * Patterns that are allowed (using the stub)
 */
const ALLOWED_PATTERNS = [
  /import.*AnalyticsEngineStub.*from.*analytics-engine-stub/,
  /createAnalyticsEngineStub/,
  /mockAnalyticsEngine/,
];

/**
 * Scan a file for forbidden patterns
 */
async function scanFile(filePath: string): Promise<ViolationFinding[]> {
  const content = await readFile(filePath, 'utf-8');
  const lines = content.split('\n');
  const violations: ViolationFinding[] = [];

  // Check if file uses the stub (allowed)
  const usesStub = ALLOWED_PATTERNS.some(pattern => pattern.test(content));

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
      continue;
    }

    // Check for forbidden patterns
    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(line)) {
        // If file uses stub, it's probably okay
        if (usesStub) {
          continue;
        }

        violations.push({
          file: filePath,
          line: lineNumber,
          content: line.trim(),
          pattern: pattern.toString(),
        });
      }
    }
  }

  return violations;
}

/**
 * Get all test files
 */
async function getTestFiles(dir: string): Promise<string[]> {
  const testFiles: string[] = [];

  async function walk(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(directory, entry.name);

      if (entry.isDirectory()) {
        // Recursively walk subdirectories
        await walk(fullPath);
      } else if (entry.isFile() && fullPath.endsWith('.test.ts')) {
        testFiles.push(fullPath);
      }
    }
  }

  await walk(dir);
  return testFiles;
}

/**
 * Main guard function
 */
async function guardAnalyticsStub(): Promise<void> {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                                                               ║');
  console.log('║     🔍 ANALYTICS STUB CONSISTENCY GUARD 🔍                    ║');
  console.log('║                                                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');

  // Check if stub exists
  const stubPath = 'tests/utils/analytics-engine-stub.ts';
  if (!existsSync(stubPath)) {
    console.error(`❌ Analytics stub not found at: ${stubPath}`);
    console.error('');
    console.error('Expected file: tests/utils/analytics-engine-stub.ts');
    console.error('Please ensure the stub file exists before running this guard.');
    process.exit(1);
  }

  console.log(`✓ Analytics stub found: ${stubPath}`);
  console.log('');

  // Get all test files
  console.log('🔍 Scanning test files...');
  const testFiles = await getTestFiles('tests');
  console.log(`   Found ${testFiles.length} test files`);
  console.log('');

  // Scan each file
  const allViolations: ViolationFinding[] = [];
  let scannedCount = 0;

  for (const file of testFiles) {
    const violations = await scanFile(file);
    if (violations.length > 0) {
      allViolations.push(...violations);
    }
    scannedCount++;
  }

  console.log(`✓ Scanned ${scannedCount} test files`);
  console.log('');

  // Report violations
  if (allViolations.length > 0) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ ANALYTICS STUB VIOLATIONS DETECTED');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('');
    console.error(`Found ${allViolations.length} violation(s):`);
    console.error('');

    // Group by file
    const violationsByFile = new Map<string, ViolationFinding[]>();
    for (const violation of allViolations) {
      if (!violationsByFile.has(violation.file)) {
        violationsByFile.set(violation.file, []);
      }
      violationsByFile.get(violation.file)!.push(violation);
    }

    for (const [file, violations] of violationsByFile) {
      console.error(`📄 ${file}`);
      for (const violation of violations) {
        console.error(`   Line ${violation.line}: ${violation.content}`);
      }
      console.error('');
    }

    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('🛠️  HOW TO FIX');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('');
    console.error('Replace direct ANALYTICS_ENGINE mocking with the stub:');
    console.error('');
    console.error('❌ BAD (direct mocking):');
    console.error('   env.ANALYTICS_ENGINE = { writeDataPoint: vi.fn() };');
    console.error('');
    console.error('✅ GOOD (using stub):');
    console.error('   import { mockAnalyticsEngine } from "tests/utils/analytics-engine-stub";');
    console.error('   const analyticsStub = mockAnalyticsEngine(env);');
    console.error('');
    console.error('Benefits of using the stub:');
    console.error('   • Consistent mocking across all tests');
    console.error('   • Built-in call tracking and assertions');
    console.error('   • No test drift or inconsistent patterns');
    console.error('');

    process.exit(1);
  }

  // Success
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ ALL TESTS USE ANALYTICS STUB CORRECTLY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('✓ No direct ANALYTICS_ENGINE mocking detected');
  console.log('✓ All tests use the canonical stub');
  console.log('✓ Test consistency maintained');
  console.log('');

  process.exit(0);
}

/**
 * Main entry point
 */
async function main() {
  try {
    await guardAnalyticsStub();
  } catch (error) {
    console.error('');
    console.error('❌ Guard failed:', error);
    console.error('');
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  main();
}

export { guardAnalyticsStub, scanFile, getTestFiles };
