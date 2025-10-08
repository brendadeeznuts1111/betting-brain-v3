#!/usr/bin/env bun
/**
 * Enhance Code Searchability
 * 
 * Adds ast-grep patterns and search commands to all .cursor/rules/*.mdc files
 * to improve code discoverability and pattern matching
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

interface SearchabilityPattern {
    rule: string;
    patterns: string[];
    commands: string[];
    examples: string[];
}

class CodeSearchabilityEnhancer {
    private rulesDir = '.cursor/rules';

    // Searchability patterns for each rule type
    private searchabilityPatterns: Record<string, SearchabilityPattern> = {
        'api-patterns': {
            rule: 'api-patterns',
            patterns: [
                'async function $NAME(request: Request, env: Env, requestId: string)',
                'return createJSONResponse($$$)',
                'return createErrorResponse($$$)',
                'generateRequestId()',
                'createLogger($$$)'
            ],
            commands: [
                'sg search "async function" src/api/',
                'sg search "createJSONResponse" src/',
                'sg search "generateRequestId" src/',
                'sg search "createLogger" src/'
            ],
            examples: [
                'Find all API endpoint handlers',
                'Find JSON response patterns',
                'Find request ID generation',
                'Find logging patterns'
            ]
        },
        'database-patterns': {
            rule: 'database-patterns',
            patterns: [
                'env.$DB.prepare($QUERY)',
                'await stmt.bind($$$).all()',
                'await stmt.bind($$$).first()',
                'normalizeD1Result<$$$>($$$)'
            ],
            commands: [
                'sg search "env.ANALYTICS.prepare" src/',
                'sg search "normalizeD1Result" src/',
                'sg search ".bind(" src/',
                'sg search ".all()" src/'
            ],
            examples: [
                'Find all database queries',
                'Find D1 result normalization',
                'Find parameterized queries',
                'Find query execution patterns'
            ]
        },
        'security-patterns': {
            rule: 'security-patterns',
            patterns: [
                'parseFloat($$$)',
                'env.$DB.prepare(`SELECT $QUERY`)',
                'new Date()',
                'WASM.*exports'
            ],
            commands: [
                'sg search "parseFloat" src/',
                'sg search "SELECT" src/',
                'sg search "new Date()" src/',
                'sg search "WASM" src/'
            ],
            examples: [
                'Find parseFloat usage (security risk)',
                'Find SQL injection risks',
                'Find timezone issues',
                'Find WASM memory leaks'
            ]
        },
        'mcp-integration': {
            rule: 'mcp-integration',
            patterns: [
                'export async function $NAME(params: $PARAMS, env: Env)',
                'MCPToolResult',
                'registerTool($$$)',
                'JSON-RPC'
            ],
            commands: [
                'sg search "MCPToolResult" src/',
                'sg search "registerTool" src/',
                'sg search "JSON-RPC" src/',
                'sg search "export async function" src/mcp/'
            ],
            examples: [
                'Find MCP tool handlers',
                'Find tool registration',
                'Find JSON-RPC usage',
                'Find MCP result types'
            ]
        },
        'cloudflare-workers': {
            rule: 'cloudflare-workers',
            patterns: [
                'export default { fetch($$$) }',
                'env.$BINDING',
                'ctx.waitUntil($$$)',
                'new Response($$$)'
            ],
            commands: [
                'sg search "export default" src/',
                'sg search "env." src/',
                'sg search "ctx.waitUntil" src/',
                'sg search "new Response" src/'
            ],
            examples: [
                'Find worker entry points',
                'Find environment bindings',
                'Find background tasks',
                'Find response creation'
            ]
        }
    };

    public async enhanceAllRules(): Promise<void> {
        console.log('🔍 Enhancing Code Searchability...\n');

        const files = readdirSync(this.rulesDir)
            .filter(file => file.endsWith('.mdc'))
            .sort();

        for (const file of files) {
            await this.enhanceRule(file);
        }

        console.log('\n✅ Code searchability enhancement complete!');
    }

    private async enhanceRule(file: string): Promise<void> {
        const filePath = join(this.rulesDir, file);

        try {
            const content = readFileSync(filePath, 'utf-8');

            // Check if already has searchability patterns
            if (content.includes('## 🔍 Code Searchability Patterns')) {
                console.log(`⏭️  Already enhanced: ${file}`);
                return;
            }

            const ruleType = this.getRuleType(file);
            const pattern = this.searchabilityPatterns[ruleType];

            if (!pattern) {
                console.log(`⏭️  No patterns for: ${file}`);
                return;
            }

            const enhancedContent = this.addSearchabilityPatterns(content, pattern);

            if (enhancedContent !== content) {
                writeFileSync(filePath, enhancedContent);
                console.log(`✅ Enhanced: ${file}`);
            } else {
                console.log(`⏭️  No changes needed: ${file}`);
            }
        } catch (error) {
            console.error(`❌ Error enhancing ${file}:`, error);
        }
    }

    private getRuleType(file: string): string {
        const baseName = file.replace('.mdc', '');

        // Map file names to rule types
        const typeMap: Record<string, string> = {
            'api-patterns': 'api-patterns',
            'database-patterns': 'database-patterns',
            'security-patterns': 'security-patterns',
            'production-security': 'security-patterns',
            'mcp-integration': 'mcp-integration',
            'cloudflare-workers': 'cloudflare-workers',
            'endpoint-routing': 'api-patterns',
            'bun-runtime': 'api-patterns', // Has its own patterns already
            'testing-patterns': 'api-patterns', // Has its own patterns already
            'quality-standards': 'api-patterns' // Has its own patterns already
        };

        return typeMap[baseName] || 'default';
    }

    private addSearchabilityPatterns(content: string, pattern: SearchabilityPattern): string {
        const searchabilitySection = this.buildSearchabilitySection(pattern);

        // Find the first ## heading and insert before it
        const firstHeadingMatch = content.match(/^## /m);
        if (firstHeadingMatch) {
            const insertIndex = firstHeadingMatch.index!;
            return content.slice(0, insertIndex) + searchabilitySection + '\n' + content.slice(insertIndex);
        }

        // If no ## heading found, insert after the first heading
        const firstHeading = content.match(/^# .*/m);
        if (firstHeading) {
            const insertIndex = firstHeading.index! + firstHeading[0].length;
            return content.slice(0, insertIndex) + '\n\n' + searchabilitySection + content.slice(insertIndex);
        }

        return content;
    }

    private buildSearchabilitySection(pattern: SearchabilityPattern): string {
        return `## 🔍 Code Searchability Patterns

### Find ${pattern.rule} Issues with ast-grep

\`\`\`bash
${pattern.patterns.map(p => `# Find ${p}`).join('\n')}
${pattern.patterns.map(p => `ast-grep --pattern '${p}' src/`).join('\n')}
${pattern.patterns.map(p => `sg -p '${p.split(' ')[0]}' src/`).join('\n')}
\`\`\`

### ${pattern.rule} Discovery Commands

\`\`\`bash
${pattern.commands.join('\n')}
\`\`\`

### Search Examples

\`\`\`bash
${pattern.examples.map((example, i) => `# ${example}\nsg search '${pattern.patterns[i]?.split(' ')[0] || 'pattern'}' src/`).join('\n')}
\`\`\``;
    }

    public generateSearchabilityReport(): void {
        console.log('\n📊 Code Searchability Enhancement Report\n');

        const files = readdirSync(this.rulesDir)
            .filter(file => file.endsWith('.mdc'))
            .sort();

        let enhancedCount = 0;
        let totalPatterns = 0;

        for (const file of files) {
            const content = readFileSync(join(this.rulesDir, file), 'utf-8');

            if (content.includes('## 🔍 Code Searchability Patterns')) {
                enhancedCount++;

                // Count patterns in this file
                const patternMatches = content.match(/ast-grep --pattern/g) || [];
                totalPatterns += patternMatches.length;
            }
        }

        console.log('📈 Enhancement Statistics:');
        console.log(`  Total Rules: ${files.length}`);
        console.log(`  Enhanced Rules: ${enhancedCount}/${files.length} (${Math.round(enhancedCount / files.length * 100)}%)`);
        console.log(`  Total Patterns: ${totalPatterns}`);
        console.log(`  Average Patterns per Rule: ${Math.round(totalPatterns / enhancedCount)}`);

        console.log('\n🎯 Searchability Benefits:');
        console.log('  - Instant pattern discovery with ast-grep');
        console.log('  - Code quality issue detection');
        console.log('  - Anti-pattern identification');
        console.log('  - Automated code analysis');
        console.log('  - Enhanced developer productivity');
    }
}

// Run the enhancement
const enhancer = new CodeSearchabilityEnhancer();
enhancer.enhanceAllRules()
    .then(() => enhancer.generateSearchabilityReport())
    .catch(console.error);
