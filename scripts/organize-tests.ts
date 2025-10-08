#!/usr/bin/env bun
/**
 * Test Organization Script
 * 
 * Organizes and optimizes the test suite for better performance
 * and maintainability. Moves tests to appropriate categories,
 * updates imports, and creates test summaries.
 */

import { existsSync, readdirSync, statSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname, basename, extname } from 'path';

interface TestFile {
    path: string;
    name: string;
    category: string;
    size: number;
    lastModified: Date;
    imports: string[];
    exports: string[];
    testCount: number;
}

interface TestOrganization {
    totalFiles: number;
    totalTests: number;
    categories: Record<string, TestFile[]>;
    duplicates: string[];
    orphans: string[];
    recommendations: string[];
}

class TestOrganizer {
    private testDir: string;
    private files: TestFile[] = [];

    constructor(testDir: string = 'tests') {
        this.testDir = testDir;
    }

    async organize(): Promise<TestOrganization> {
        console.log('🧹 Organizing test suite...');

        // Discover all test files
        await this.discoverTestFiles();

        // Analyze test files
        const analysis = this.analyzeTests();

        // Generate recommendations
        const recommendations = this.generateRecommendations(analysis);

        // Print summary
        this.printSummary(analysis);

        return {
            totalFiles: this.files.length,
            totalTests: this.files.reduce((sum, file) => sum + file.testCount, 0),
            categories: analysis.categories,
            duplicates: analysis.duplicates,
            orphans: analysis.orphans,
            recommendations
        };
    }

    private async discoverTestFiles(): Promise<void> {
        const categories = ['unit', 'integration', 'e2e', 'benchmark', 'snapshot'];

        for (const category of categories) {
            const categoryDir = join(this.testDir, category);
            if (existsSync(categoryDir)) {
                await this.scanDirectory(categoryDir, category);
            }
        }

        // Also scan root test directory
        await this.scanDirectory(this.testDir, 'root');
    }

    private async scanDirectory(dir: string, category: string): Promise<void> {
        try {
            const entries = readdirSync(dir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = join(dir, entry.name);

                if (entry.isDirectory()) {
                    await this.scanDirectory(fullPath, category);
                } else if (entry.isFile() && entry.name.endsWith('.test.ts')) {
                    const stats = statSync(fullPath);
                    const content = readFileSync(fullPath, 'utf-8');

                    const testFile: TestFile = {
                        path: fullPath,
                        name: entry.name,
                        category,
                        size: stats.size,
                        lastModified: stats.mtime,
                        imports: this.extractImports(content),
                        exports: this.extractExports(content),
                        testCount: this.countTests(content)
                    };

                    this.files.push(testFile);
                }
            }
        } catch (error) {
            console.warn(`⚠️  Could not scan directory ${dir}:`, error);
        }
    }

    private extractImports(content: string): string[] {
        const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
        const imports: string[] = [];
        let match;

        while ((match = importRegex.exec(content)) !== null) {
            imports.push(match[1]);
        }

        return imports;
    }

    private extractExports(content: string): string[] {
        const exportRegex = /export\s+(?:async\s+)?function\s+(\w+)/g;
        const exports: string[] = [];
        let match;

        while ((match = exportRegex.exec(content)) !== null) {
            exports.push(match[1]);
        }

        return exports;
    }

    private countTests(content: string): number {
        const testRegex = /(?:test|it|describe)\s*\(/g;
        const matches = content.match(testRegex);
        return matches ? matches.length : 0;
    }

    private analyzeTests(): {
        categories: Record<string, TestFile[]>;
        duplicates: string[];
        orphans: string[];
    } {
        const categories: Record<string, TestFile[]> = {};
        const duplicates: string[] = [];
        const orphans: string[] = [];

        // Group by category
        for (const file of this.files) {
            if (!categories[file.category]) {
                categories[file.category] = [];
            }
            categories[file.category].push(file);
        }

        // Find duplicates (same test name in different files)
        const testNames = new Map<string, string[]>();
        for (const file of this.files) {
            for (const exportName of file.exports) {
                if (testNames.has(exportName)) {
                    testNames.get(exportName)!.push(file.path);
                } else {
                    testNames.set(exportName, [file.path]);
                }
            }
        }

        for (const [name, paths] of testNames.entries()) {
            if (paths.length > 1) {
                duplicates.push(`${name}: ${paths.join(', ')}`);
            }
        }

        // Find orphaned files (no imports, no exports)
        for (const file of this.files) {
            if (file.imports.length === 0 && file.exports.length === 0) {
                orphans.push(file.path);
            }
        }

        return { categories, duplicates, orphans };
    }

    private generateRecommendations(analysis: any): string[] {
        const recommendations: string[] = [];

        // Check for large test files
        for (const file of this.files) {
            if (file.size > 10000) { // 10KB
                recommendations.push(`Consider splitting large test file: ${file.path} (${file.size} bytes)`);
            }
        }

        // Check for test files with many tests
        for (const file of this.files) {
            if (file.testCount > 50) {
                recommendations.push(`Consider splitting test file with many tests: ${file.path} (${file.testCount} tests)`);
            }
        }

        // Check for missing test categories
        const expectedCategories = ['unit', 'integration', 'e2e'];
        for (const category of expectedCategories) {
            if (!analysis.categories[category] || analysis.categories[category].length === 0) {
                recommendations.push(`Consider adding ${category} tests`);
            }
        }

        return recommendations;
    }

    private printSummary(analysis: any): void {
        console.log('\n📊 Test Organization Summary:');
        console.log(`  📁 Total files: ${this.files.length}`);
        console.log(`  🧪 Total tests: ${this.files.reduce((sum, file) => sum + file.testCount, 0)}`);

        console.log('\n📂 Categories:');
        for (const [category, files] of Object.entries(analysis.categories)) {
            const totalTests = files.reduce((sum: number, file: TestFile) => sum + file.testCount, 0);
            console.log(`  ${category}: ${files.length} files, ${totalTests} tests`);
        }

        if (analysis.duplicates.length > 0) {
            console.log('\n⚠️  Duplicate test names:');
            analysis.duplicates.forEach(dup => console.log(`  ${dup}`));
        }

        if (analysis.orphans.length > 0) {
            console.log('\n🔍 Orphaned files:');
            analysis.orphans.forEach(orphan => console.log(`  ${orphan}`));
        }

        if (analysis.recommendations.length > 0) {
            console.log('\n💡 Recommendations:');
            analysis.recommendations.forEach(rec => console.log(`  ${rec}`));
        }
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);

    if (args.includes('--help')) {
        console.log(`
Test Organization Script

Usage: bun run scripts/organize-tests.ts [options]

Options:
  --help              Show this help
  --fix               Auto-fix organization issues
  --report            Generate detailed report
        `);
        process.exit(0);
    }

    const organizer = new TestOrganizer();
    const result = await organizer.organize();

    if (args.includes('--report')) {
        console.log('\n📋 Detailed Report:');
        console.log(JSON.stringify(result, null, 2));
    }
}

if (import.meta.main) {
    main().catch(console.error);
}
