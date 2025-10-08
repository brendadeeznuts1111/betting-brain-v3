#!/usr/bin/env bun
/**
 * 🧬 Automated Migration Script: Vitest → Bun Test
 * 
 * This script automates the migration from Vitest to native Bun test runner
 * with concurrent testing support.
 * 
 * Usage:
 *   bun run scripts/migrate-to-bun-test.ts [--dry-run] [--verbose]
 * 
 * Features:
 *   - Updates import statements
 *   - Converts vi → mock
 *   - Converts it() → test()
 *   - Marks integration tests as concurrent
 *   - Creates backup of original files
 */

import { readdirSync, statSync, readFileSync } from "fs";
import { join, relative } from "path";

interface MigrationOptions {
  dryRun: boolean;
  verbose: boolean;
  backup: boolean;
}

interface MigrationStats {
  filesScanned: number;
  filesModified: number;
  importsUpdated: number;
  testsMarkedConcurrent: number;
  errors: string[];
}

const stats: MigrationStats = {
  filesScanned: 0,
  filesModified: 0,
  importsUpdated: 0,
  testsMarkedConcurrent: 0,
  errors: [],
};

const args = process.argv.slice(2);
const options: MigrationOptions = {
  dryRun: args.includes("--dry-run"),
  verbose: args.includes("--verbose") || args.includes("-v"),
  backup: !args.includes("--no-backup"),
};

console.log("🧬 Vitest → Bun Test Migration Tool");
console.log("=====================================\n");

if (options.dryRun) {
  console.log("🔍 DRY RUN MODE - No files will be modified\n");
}

/**
 * Find all test files in a directory recursively
 */
function findTestFiles(dir: string, files: string[] = []): string[] {
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      // Skip node_modules and other irrelevant directories
      if (!["node_modules", "dist", "coverage", ".git"].includes(entry)) {
        findTestFiles(fullPath, files);
      }
    } else if (
      entry.endsWith(".test.ts") ||
      entry.endsWith(".test.tsx") ||
      entry.endsWith(".spec.ts") ||
      entry.endsWith(".spec.tsx")
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Migrate a single test file
 */
function migrateTestFile(filePath: string): boolean {
  stats.filesScanned++;

  try {
    let content = readFileSync(filePath, "utf8");
    const originalContent = content;
    let modified = false;

    // 1. Update imports: vitest → bun:test
    if (content.includes("from 'vitest'") || content.includes('from "vitest"')) {
      content = content.replace(/from ['"]vitest['"]/g, 'from "bun:test"');
      stats.importsUpdated++;
      modified = true;

      if (options.verbose) {
        console.log(`  ✓ Updated imports in ${relative(process.cwd(), filePath)}`);
      }
    }

    // 2. Update vi.fn() → mock() or keep as vi if importing as 'mock as vi'
    // Add mock import if using vi
    if (content.includes("vi.fn(") || content.includes("vi.mock(")) {
      // Check if already importing vi/mock
      const hasViImport = /import\s*{[^}]*\bvi\b[^}]*}\s*from\s*["']bun:test["']/.test(
        content
      );
      const hasMockImport = /import\s*{[^}]*\bmock\b[^}]*}\s*from\s*["']bun:test["']/.test(
        content
      );

      if (!hasViImport && !hasMockImport) {
        // Add mock import
        content = content.replace(
          /import\s*{([^}]+)}\s*from\s*["']bun:test["']/,
          'import { $1, mock } from "bun:test"'
        );
        modified = true;
      }

      // Replace vi with mock (but keep variable name vi for compatibility)
      if (!hasViImport) {
        // Find the import line and add 'mock as vi'
        content = content.replace(
          /import\s*{([^}]+)}\s*from\s*["']bun:test["']/,
          (match, imports) => {
            if (!imports.includes("mock")) {
              return `import { ${imports}, mock as vi } from "bun:test"`;
            }
            return match;
          }
        );
        modified = true;
      }
    }

    // 3. Convert it() → test()
    if (content.includes("it(")) {
      // Only replace if it's a test function call, not part of a word
      content = content.replace(/\bit\(/g, "test(");
      modified = true;

      if (options.verbose) {
        console.log(`  ✓ Converted it() → test() in ${relative(process.cwd(), filePath)}`);
      }
    }

    // 4. Mark integration tests as concurrent
    const isIntegrationTest = filePath.includes("/integration/");
    const isQueueTest = filePath.includes("queue-integration");

    if (isIntegrationTest || isQueueTest) {
      // Check if describe blocks should be concurrent
      // Look for async tests inside describe blocks
      const hasAsyncTests = /test\([^)]+async\s*\(/g.test(content);

      if (hasAsyncTests && !content.includes("describe.concurrent")) {
        // Replace describe( with describe.concurrent(
        content = content.replace(/\bdescribe\(/g, "describe.concurrent(");
        stats.testsMarkedConcurrent++;
        modified = true;

        if (options.verbose) {
          console.log(
            `  ✓ Marked concurrent in ${relative(process.cwd(), filePath)}`
          );
        }
      }
    }

    // 5. Write back if modified
    if (modified) {
      if (!options.dryRun) {
        // Create backup if requested
        if (options.backup) {
          const backupPath = `${filePath}.backup`;
          Bun.write(backupPath, originalContent);
        }

        // Write modified content
        Bun.write(filePath, content);
      }

      stats.filesModified++;
      console.log(`✅ Migrated: ${relative(process.cwd(), filePath)}`);
      return true;
    }

    return false;
  } catch (error) {
    const errorMsg = `Failed to migrate ${filePath}: ${error}`;
    stats.errors.push(errorMsg);
    console.error(`❌ ${errorMsg}`);
    return false;
  }
}

/**
 * Main migration process
 */
async function migrate() {
  console.log("🔍 Scanning for test files...\n");

  const testFiles = findTestFiles("tests");

  console.log(`Found ${testFiles.length} test files\n`);
  console.log("🔄 Starting migration...\n");

  for (const file of testFiles) {
    migrateTestFile(file);
  }

  console.log("\n=====================================");
  console.log("📊 Migration Summary");
  console.log("=====================================\n");
  console.log(`Files scanned:         ${stats.filesScanned}`);
  console.log(`Files modified:        ${stats.filesModified}`);
  console.log(`Imports updated:       ${stats.importsUpdated}`);
  console.log(`Tests marked concurrent: ${stats.testsMarkedConcurrent}`);

  if (stats.errors.length > 0) {
    console.log(`\n❌ Errors encountered: ${stats.errors.length}`);
    stats.errors.forEach((error) => console.log(`  - ${error}`));
  }

  if (options.dryRun) {
    console.log("\n🔍 DRY RUN - No files were actually modified");
    console.log("Run without --dry-run to apply changes");
  } else {
    console.log("\n✅ Migration complete!");
    
    if (options.backup) {
      console.log("\n💾 Backups created with .backup extension");
      console.log("Remove with: find tests -name '*.backup' -delete");
    }

    console.log("\n📝 Next steps:");
    console.log("  1. Update package.json scripts");
    console.log("  2. Update config/bunfig.toml");
    console.log("  3. Run: bun test");
    console.log("  4. Run: bun test --concurrent");
    console.log("  5. Run: bun test --randomize");
  }

  // Exit with error code if there were errors
  if (stats.errors.length > 0) {
    process.exit(1);
  }
}

// Run migration
migrate().catch((error) => {
  console.error("💥 Migration failed:", error);
  process.exit(1);
});

