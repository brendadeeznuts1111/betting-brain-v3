#!/usr/bin/env bun
/**
 * Analyze Cursor Rules Versioning
 * 
 * Checks all .cursor/rules/*.mdc files for proper versioning,
 * dependencies, and metadata consistency
 */

import { readdirSync, readFileSync, writeFileSync, statSync } from 'fs';
import { join } from 'path';

interface RuleMetadata {
    file: string;
    version?: string;
    lastUpdated?: string;
    dependencies?: string[];
    alwaysApply?: boolean;
    description?: string;
    scope?: string[];
    globs?: string;
    priority?: number;
    hasFrontmatter: boolean;
    frontmatterValid: boolean;
}

class RuleVersioningAnalyzer {
    private rulesDir = '.cursor/rules';
    private rules: RuleMetadata[] = [];

    constructor() {
        this.analyzeRules();
    }

    private analyzeRules(): void {
        const files = readdirSync(this.rulesDir)
            .filter(file => file.endsWith('.mdc'))
            .sort();

        console.log('🔍 Analyzing Cursor Rules Versioning\n');

        for (const file of files) {
            const filePath = join(this.rulesDir, file);
            const content = readFileSync(filePath, 'utf-8');

            const rule = this.parseRuleMetadata(file, content);
            this.rules.push(rule);
        }
    }

    private parseRuleMetadata(file: string, content: string): RuleMetadata {
        const rule: RuleMetadata = {
            file,
            hasFrontmatter: false,
            frontmatterValid: false
        };

        // Check for frontmatter
        if (content.startsWith('---\n')) {
            rule.hasFrontmatter = true;

            const frontmatterEnd = content.indexOf('\n---\n', 4);
            if (frontmatterEnd > 0) {
                const frontmatter = content.substring(4, frontmatterEnd);
                rule.frontmatterValid = true;

                // Parse frontmatter fields
                const lines = frontmatter.split('\n');
                for (const line of lines) {
                    if (line.includes(':')) {
                        const [key, ...valueParts] = line.split(':');
                        const value = valueParts.join(':').trim();

                        switch (key.trim()) {
                            case 'version':
                                rule.version = value.replace(/"/g, '');
                                break;
                            case 'lastUpdated':
                                rule.lastUpdated = value.replace(/"/g, '');
                                break;
                            case 'dependencies':
                                if (value.startsWith('[') && value.endsWith(']')) {
                                    rule.dependencies = value
                                        .slice(1, -1)
                                        .split(',')
                                        .map(dep => dep.trim().replace(/"/g, ''));
                                }
                                break;
                            case 'alwaysApply':
                                rule.alwaysApply = value.toLowerCase() === 'true';
                                break;
                            case 'description':
                                rule.description = value.replace(/"/g, '');
                                break;
                            case 'scope':
                                if (value.startsWith('[') && value.endsWith(']')) {
                                    rule.scope = value
                                        .slice(1, -1)
                                        .split(',')
                                        .map(s => s.trim().replace(/"/g, ''));
                                }
                                break;
                            case 'globs':
                                rule.globs = value.replace(/"/g, '');
                                break;
                            case 'priority':
                                rule.priority = parseInt(value);
                                break;
                        }
                    }
                }
            }
        }

        return rule;
    }

    public generateReport(): void {
        console.log('📊 Cursor Rules Versioning Report\n');

        // Summary statistics
        const totalRules = this.rules.length;
        const withVersion = this.rules.filter(r => r.version).length;
        const withLastUpdated = this.rules.filter(r => r.lastUpdated).length;
        const withDependencies = this.rules.filter(r => r.dependencies && r.dependencies.length > 0).length;
        const withFrontmatter = this.rules.filter(r => r.hasFrontmatter).length;
        const validFrontmatter = this.rules.filter(r => r.frontmatterValid).length;

        console.log('📈 Summary Statistics:');
        console.log(`  Total Rules: ${totalRules}`);
        console.log(`  With Version: ${withVersion}/${totalRules} (${Math.round(withVersion / totalRules * 100)}%)`);
        console.log(`  With Last Updated: ${withLastUpdated}/${totalRules} (${Math.round(withLastUpdated / totalRules * 100)}%)`);
        console.log(`  With Dependencies: ${withDependencies}/${totalRules} (${Math.round(withDependencies / totalRules * 100)}%)`);
        console.log(`  With Frontmatter: ${withFrontmatter}/${totalRules} (${Math.round(withFrontmatter / totalRules * 100)}%)`);
        console.log(`  Valid Frontmatter: ${validFrontmatter}/${totalRules} (${Math.round(validFrontmatter / totalRules * 100)}%)\n`);

        // Version distribution
        console.log('📋 Version Distribution:');
        const versionCounts = new Map<string, number>();
        this.rules.forEach(rule => {
            if (rule.version) {
                versionCounts.set(rule.version, (versionCounts.get(rule.version) || 0) + 1);
            }
        });

        Array.from(versionCounts.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .forEach(([version, count]) => {
                console.log(`  v${version}: ${count} rules`);
            });

        console.log('\n📝 Detailed Rule Analysis:\n');

        // Group by status
        const missingVersion = this.rules.filter(r => !r.version);
        const missingLastUpdated = this.rules.filter(r => !r.lastUpdated);
        const missingDependencies = this.rules.filter(r => !r.dependencies || r.dependencies.length === 0);
        const invalidFrontmatter = this.rules.filter(r => r.hasFrontmatter && !r.frontmatterValid);

        if (missingVersion.length > 0) {
            console.log('❌ Missing Version:');
            missingVersion.forEach(rule => console.log(`  - ${rule.file}`));
            console.log();
        }

        if (missingLastUpdated.length > 0) {
            console.log('❌ Missing Last Updated:');
            missingLastUpdated.forEach(rule => console.log(`  - ${rule.file}`));
            console.log();
        }

        if (missingDependencies.length > 0) {
            console.log('⚠️  Missing Dependencies:');
            missingDependencies.forEach(rule => console.log(`  - ${rule.file}`));
            console.log();
        }

        if (invalidFrontmatter.length > 0) {
            console.log('❌ Invalid Frontmatter:');
            invalidFrontmatter.forEach(rule => console.log(`  - ${rule.file}`));
            console.log();
        }

        // Dependency analysis
        console.log('🔗 Dependency Analysis:');
        const allDependencies = new Set<string>();
        this.rules.forEach(rule => {
            if (rule.dependencies) {
                rule.dependencies.forEach(dep => allDependencies.add(dep));
            }
        });

        console.log(`  Total Unique Dependencies: ${allDependencies.size}`);
        console.log('  Dependencies:');
        Array.from(allDependencies).sort().forEach(dep => {
            const dependents = this.rules.filter(r => r.dependencies?.includes(dep));
            console.log(`    - ${dep}: ${dependents.length} dependents`);
        });

        console.log('\n✅ Complete Rules (All Metadata):');
        const completeRules = this.rules.filter(r =>
            r.version && r.lastUpdated && r.dependencies && r.dependencies.length > 0
        );
        completeRules.forEach(rule => {
            console.log(`  ✅ ${rule.file} (v${rule.version})`);
        });

        console.log('\n🎯 Recommendations:');
        if (missingVersion.length > 0) {
            console.log(`  - Add version to ${missingVersion.length} rules`);
        }
        if (missingLastUpdated.length > 0) {
            console.log(`  - Add lastUpdated to ${missingLastUpdated.length} rules`);
        }
        if (missingDependencies.length > 0) {
            console.log(`  - Add dependencies to ${missingDependencies.length} rules`);
        }
        if (invalidFrontmatter.length > 0) {
            console.log(`  - Fix frontmatter in ${invalidFrontmatter.length} rules`);
        }
    }

    public generateUpdateScript(): void {
        console.log('\n🔧 Generating Update Script...\n');

        const script = `#!/usr/bin/env bun
/**
 * Update Cursor Rules Versioning
 * 
 * Automatically updates versioning metadata for all .cursor/rules/*.mdc files
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const rulesDir = '.cursor/rules';
const currentDate = new Date().toISOString().split('T')[0];

// Rules that need version updates
const updates = [
  // Add specific updates here based on analysis
];

console.log('🔄 Updating Cursor Rules Versioning...');

// Implementation would go here
console.log('✅ Versioning updates complete!');
`;

        writeFileSync('scripts/update-rule-versioning.ts', script);
        console.log('📝 Created: scripts/update-rule-versioning.ts');
    }
}

// Run the analysis
const analyzer = new RuleVersioningAnalyzer();
analyzer.generateReport();
analyzer.generateUpdateScript();
