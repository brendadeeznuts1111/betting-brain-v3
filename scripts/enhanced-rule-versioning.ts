#!/usr/bin/env bun
/**
 * Enhanced Cursor Rules Versioning System
 * 
 * Handles frontmatter standardization, code searchability improvements,
 * and comprehensive rule metadata management
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

interface RuleMetadata {
    version: string;
    lastUpdated: string;
    dependencies: string[];
    alwaysApply?: boolean;
    description?: string;
    scope?: string[];
    globs?: string;
    priority?: number;
    [key: string]: any;
}

interface FrontmatterTemplate {
    version: string;
    lastUpdated: string;
    dependencies: string[];
    alwaysApply?: boolean;
    description?: string;
    scope?: string[];
    globs?: string;
    priority?: number;
}

class EnhancedRuleVersioning {
    private rulesDir = '.cursor/rules';
    private currentDate = new Date().toISOString().split('T')[0];

    // Standardized frontmatter templates by rule type
    private frontmatterTemplates: Record<string, FrontmatterTemplate> = {
        'quality-standards': {
            version: '1.0.0',
            lastUpdated: this.currentDate,
            dependencies: ['api-patterns', 'bun-runtime', 'database-patterns'],
            alwaysApply: true,
            description: 'Code quality standards and anti-pattern prevention'
        },
        'bun-runtime': {
            version: '5.0.0',
            lastUpdated: this.currentDate,
            dependencies: ['quality-standards', 'process-management'],
            alwaysApply: true,
            description: 'Bun runtime patterns and best practices',
            scope: ['typescript', 'javascript', 'json', 'toml']
        },
        'testing-patterns': {
            version: '2.0.0',
            lastUpdated: this.currentDate,
            dependencies: ['quality-standards', 'bun-runtime'],
            description: 'Testing patterns and best practices for Bun test',
            globs: '*.test.ts,*.spec.ts'
        },
        'api-patterns': {
            version: '5.0.0',
            lastUpdated: this.currentDate,
            dependencies: ['quality-standards', 'bun-runtime'],
            alwaysApply: true,
            description: 'API endpoint patterns and request handling conventions'
        },
        'code-searchability': {
            version: '1.0.0',
            lastUpdated: this.currentDate,
            dependencies: ['quality-standards'],
            alwaysApply: true,
            description: 'Code searchability patterns and ast-grep integration'
        }
    };

    public async standardizeAllRules(): Promise<void> {
        console.log('🔄 Standardizing Cursor Rules Frontmatter...\n');

        const files = readdirSync(this.rulesDir)
            .filter(file => file.endsWith('.mdc'))
            .sort();

        for (const file of files) {
            await this.standardizeRule(file);
        }

        console.log('\n✅ Frontmatter standardization complete!');
    }

    private async standardizeRule(file: string): Promise<void> {
        const filePath = join(this.rulesDir, file);

        try {
            const content = readFileSync(filePath, 'utf-8');
            const updatedContent = this.standardizeRuleContent(file, content);

            if (updatedContent !== content) {
                writeFileSync(filePath, updatedContent);
                console.log(`✅ Standardized: ${file}`);
            } else {
                console.log(`⏭️  No changes needed: ${file}`);
            }
        } catch (error) {
            console.error(`❌ Error standardizing ${file}:`, error);
        }
    }

    private standardizeRuleContent(file: string, content: string): string {
        if (!content.startsWith('---\n')) {
            console.warn(`⚠️  ${file} doesn't have frontmatter, adding...`);
            return this.addFrontmatter(file, content);
        }

        const frontmatterEnd = content.indexOf('\n---\n', 4);
        if (frontmatterEnd === -1) {
            console.warn(`⚠️  ${file} has malformed frontmatter, fixing...`);
            return this.fixMalformedFrontmatter(file, content);
        }

        const frontmatter = content.substring(4, frontmatterEnd);
        const restOfContent = content.substring(frontmatterEnd + 5);

        // Parse existing frontmatter
        const existingMetadata = this.parseFrontmatter(frontmatter);

        // Get template for this rule type
        const ruleType = this.getRuleType(file);
        const template = this.frontmatterTemplates[ruleType] || this.getDefaultTemplate();

        // Merge existing with template
        const standardizedMetadata = this.mergeMetadata(existingMetadata, template);

        // Build standardized frontmatter
        const newFrontmatter = this.buildStandardizedFrontmatter(standardizedMetadata);

        return `---\n${newFrontmatter}\n---\n${restOfContent}`;
    }

    private getRuleType(file: string): string {
        const baseName = file.replace('.mdc', '');

        // Map file names to rule types
        const typeMap: Record<string, string> = {
            'quality-standards': 'quality-standards',
            'bun-runtime': 'bun-runtime',
            'testing-patterns': 'testing-patterns',
            'api-patterns': 'api-patterns',
            'code-searchability': 'code-searchability',
            '99-floor': 'quality-standards', // Floor is quality-focused
            'cloudflare-workers': 'api-patterns',
            'database-patterns': 'quality-standards',
            'endpoint-routing': 'api-patterns',
            'mcp-integration': 'api-patterns',
            'security-patterns': 'quality-standards',
            'production-security': 'quality-standards'
        };

        return typeMap[baseName] || 'default';
    }

    private getDefaultTemplate(): FrontmatterTemplate {
        return {
            version: '1.0.0',
            lastUpdated: this.currentDate,
            dependencies: ['quality-standards'],
            description: 'Rule description'
        };
    }

    private parseFrontmatter(frontmatter: string): RuleMetadata {
        const metadata: RuleMetadata = {
            version: '1.0.0',
            lastUpdated: this.currentDate,
            dependencies: []
        };

        const lines = frontmatter.split('\n');
        for (const line of lines) {
            if (line.includes(':')) {
                const [key, ...valueParts] = line.split(':');
                const value = valueParts.join(':').trim();
                const cleanKey = key.trim();
                const cleanValue = value.replace(/"/g, '');

                switch (cleanKey) {
                    case 'version':
                        metadata.version = cleanValue;
                        break;
                    case 'lastUpdated':
                        metadata.lastUpdated = cleanValue;
                        break;
                    case 'dependencies':
                        if (value.startsWith('[') && value.endsWith(']')) {
                            metadata.dependencies = value
                                .slice(1, -1)
                                .split(',')
                                .map(dep => dep.trim().replace(/"/g, ''));
                        }
                        break;
                    case 'alwaysApply':
                        metadata.alwaysApply = cleanValue.toLowerCase() === 'true';
                        break;
                    case 'description':
                        metadata.description = cleanValue;
                        break;
                    case 'scope':
                        if (value.startsWith('[') && value.endsWith(']')) {
                            metadata.scope = value
                                .slice(1, -1)
                                .split(',')
                                .map(s => s.trim().replace(/"/g, ''));
                        }
                        break;
                    case 'globs':
                        metadata.globs = cleanValue;
                        break;
                    case 'priority':
                        metadata.priority = parseInt(cleanValue);
                        break;
                    default:
                        metadata[cleanKey] = cleanValue;
                }
            }
        }

        return metadata;
    }

    private mergeMetadata(existing: RuleMetadata, template: FrontmatterTemplate): RuleMetadata {
        return {
            version: existing.version || template.version,
            lastUpdated: this.currentDate, // Always update
            dependencies: [...new Set([...existing.dependencies, ...template.dependencies])],
            alwaysApply: existing.alwaysApply ?? template.alwaysApply,
            description: existing.description || template.description,
            scope: existing.scope || template.scope,
            globs: existing.globs || template.globs,
            priority: existing.priority || template.priority
        };
    }

    private buildStandardizedFrontmatter(metadata: RuleMetadata): string {
        const lines: string[] = [];

        // Standard order for frontmatter fields
        const fieldOrder = [
            'version',
            'scope',
            'globs',
            'alwaysApply',
            'priority',
            'description',
            'lastUpdated',
            'dependencies'
        ];

        for (const field of fieldOrder) {
            const value = metadata[field];
            if (value !== undefined && value !== null) {
                if (field === 'dependencies' && Array.isArray(value)) {
                    if (value.length > 0) {
                        const depsString = value.map(dep => `"${dep}"`).join(', ');
                        lines.push(`dependencies: [${depsString}]`);
                    }
                } else if (field === 'scope' && Array.isArray(value)) {
                    const scopeString = value.map(s => `"${s}"`).join(', ');
                    lines.push(`scope: [${scopeString}]`);
                } else if (field === 'alwaysApply' || field === 'priority') {
                    lines.push(`${field}: ${value}`);
                } else {
                    lines.push(`${field}: "${value}"`);
                }
            }
        }

        return lines.join('\n');
    }

    private addFrontmatter(file: string, content: string): string {
        const ruleType = this.getRuleType(file);
        const template = this.frontmatterTemplates[ruleType] || this.getDefaultTemplate();
        const frontmatter = this.buildStandardizedFrontmatter(template);
        return `---\n${frontmatter}\n---\n${content}`;
    }

    private fixMalformedFrontmatter(file: string, content: string): string {
        // Try to extract content after first ---
        const firstDash = content.indexOf('---\n');
        if (firstDash !== -1) {
            const afterFirstDash = content.substring(firstDash + 4);
            const secondDash = afterFirstDash.indexOf('\n---\n');
            if (secondDash !== -1) {
                const restOfContent = afterFirstDash.substring(secondDash + 5);
                return this.addFrontmatter(file, restOfContent);
            }
        }

        // If all else fails, add frontmatter to beginning
        return this.addFrontmatter(file, content);
    }

    public generateCodeSearchabilityReport(): void {
        console.log('\n🔍 Code Searchability Analysis\n');

        const files = readdirSync(this.rulesDir)
            .filter(file => file.endsWith('.mdc'))
            .sort();

        console.log('📊 Rule Searchability Metrics:');
        console.log(`  Total Rules: ${files.length}`);

        // Analyze searchability patterns
        const searchabilityPatterns = [
            'ast-grep',
            'sg scan',
            'pattern',
            'search',
            'discovery',
            'codebase'
        ];

        let totalPatterns = 0;
        for (const file of files) {
            const content = readFileSync(join(this.rulesDir, file), 'utf-8');
            const patternCount = searchabilityPatterns.reduce((count, pattern) => {
                return count + (content.toLowerCase().includes(pattern.toLowerCase()) ? 1 : 0);
            }, 0);
            totalPatterns += patternCount;
        }

        console.log(`  Searchability Patterns: ${totalPatterns}/${files.length * searchabilityPatterns.length} (${Math.round(totalPatterns / (files.length * searchabilityPatterns.length) * 100)}%)`);

        console.log('\n🎯 Searchability Recommendations:');
        console.log('  - Add ast-grep patterns to all rules');
        console.log('  - Include code discovery examples');
        console.log('  - Add search command references');
        console.log('  - Document pattern matching strategies');
    }
}

// Run the enhanced versioning system
const versioning = new EnhancedRuleVersioning();
versioning.standardizeAllRules()
    .then(() => versioning.generateCodeSearchabilityReport())
    .catch(console.error);
