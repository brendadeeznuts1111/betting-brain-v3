#!/usr/bin/env bun
/**
 * Enhanced Code Search Script for Betting-Brain v3
 * 
 * Demonstrates the enhanced ast-grep and ripgrep patterns
 * for comprehensive code searchability.
 * 
 * Usage:
 *   bun run scripts/enhanced-code-search.ts [pattern] [type]
 * 
 * Examples:
 *   bun run scripts/enhanced-code-search.ts endpoint-handlers
 *   bun run scripts/enhanced-code-search.ts fantasy402
 *   bun run scripts/enhanced-code-search.ts analytics
 *   bun run scripts/enhanced-code-search.ts security
 */

import { spawn } from 'bun';
import { existsSync } from 'fs';

interface SearchPattern {
    name: string;
    description: string;
    astGrepPattern: string;
    ripgrepPattern: string;
    examples: string[];
}

const SEARCH_PATTERNS: Record<string, SearchPattern> = {
    // API Endpoints
    'endpoint-handlers': {
        name: 'API Endpoint Handlers',
        description: 'Find all API endpoint handler functions',
        astGrepPattern: 'endpoint-handlers',
        ripgrepPattern: 'async function.*Request.*Env.*requestId.*Response',
        examples: [
            'sg search endpoint-handlers',
            'rg "async function.*Request.*Env.*requestId.*Response" --type ts'
        ]
    },

    'api-routes': {
        name: 'API Routes',
        description: 'Find all API route definitions',
        astGrepPattern: 'api-routes',
        ripgrepPattern: "case '/",
        examples: [
            'sg search api-routes',
            'rg "case \'/" --type ts'
        ]
    },

    // MCP Integration
    'mcp-handlers': {
        name: 'MCP Tool Handlers',
        description: 'Find all MCP tool handler functions',
        astGrepPattern: 'mcp-handlers',
        ripgrepPattern: 'export async function.*MCPToolResult',
        examples: [
            'sg search mcp-handlers',
            'rg "export async function.*MCPToolResult" --type ts'
        ]
    },

    'mcp-tool-calls': {
        name: 'MCP Tool Calls',
        description: 'Find all MCP tool invocations',
        astGrepPattern: 'mcp-tool-calls',
        ripgrepPattern: 'callTool\\(',
        examples: [
            'sg search mcp-tool-calls',
            'rg "callTool\\(" --type ts'
        ]
    },

    // Database Patterns
    'database-queries': {
        name: 'Database Queries',
        description: 'Find all database query operations',
        astGrepPattern: 'database-queries',
        ripgrepPattern: '\\.prepare\\(|\\.bind\\(|\\.all\\(|\\.first\\(|\\.run\\(',
        examples: [
            'sg search database-queries',
            'rg "\\.prepare\\(|\\.bind\\(|\\.all\\(|\\.first\\(|\\.run\\(" --type ts'
        ]
    },

    'sql-select': {
        name: 'SQL SELECT Queries',
        description: 'Find all SELECT statements',
        astGrepPattern: 'sql-select',
        ripgrepPattern: 'SELECT.*FROM.*WHERE',
        examples: [
            'sg search sql-select',
            'rg "SELECT.*FROM.*WHERE" --type ts'
        ]
    },

    // Fantasy402 Integration
    'fantasy402-endpoints': {
        name: 'Fantasy402 Endpoints',
        description: 'Find all Fantasy402 API endpoints',
        astGrepPattern: 'fantasy402-endpoints',
        ripgrepPattern: '/api/fantasy402/',
        examples: [
            'sg search fantasy402-endpoints',
            'rg "/api/fantasy402/" --type ts'
        ]
    },

    'fantasy402-operations': {
        name: 'Fantasy402 Operations',
        description: 'Find Fantasy402 operation calls',
        astGrepPattern: 'fantasy402-operations',
        ripgrepPattern: 'getInfoPlayer|getPerformancePlayer|getTransactionList|getPending|getReportPlayerAnalysis',
        examples: [
            'sg search fantasy402-operations',
            'rg "getInfoPlayer|getPerformancePlayer|getTransactionList|getPending|getReportPlayerAnalysis" --type ts'
        ]
    },

    // Analytics Engine
    'analytics-writes': {
        name: 'Analytics Engine Writes',
        description: 'Find all Analytics Engine write operations',
        astGrepPattern: 'analytics-writes',
        ripgrepPattern: 'ANALYTICS_ENGINE\\.writeDataPoint',
        examples: [
            'sg search analytics-writes',
            'rg "ANALYTICS_ENGINE\\.writeDataPoint" --type ts'
        ]
    },

    'analytics-blobs': {
        name: 'Analytics Blobs',
        description: 'Find Analytics Engine blob data',
        astGrepPattern: 'analytics-blobs',
        ripgrepPattern: 'blobs:\\s*\\[',
        examples: [
            'sg search analytics-blobs',
            'rg "blobs:\\s*\\[" --type ts'
        ]
    },

    // KV Cache
    'kv-get': {
        name: 'KV Cache Gets',
        description: 'Find all KV cache get operations',
        astGrepPattern: 'kv-get',
        ripgrepPattern: '\\.get\\(',
        examples: [
            'sg search kv-get',
            'rg "\\.get\\(" --type ts'
        ]
    },

    'kv-put': {
        name: 'KV Cache Puts',
        description: 'Find all KV cache put operations',
        astGrepPattern: 'kv-put',
        ripgrepPattern: '\\.put\\(',
        examples: [
            'sg search kv-put',
            'rg "\\.put\\(" --type ts'
        ]
    },

    // Queue Patterns
    'queue-send': {
        name: 'Queue Sends',
        description: 'Find all queue send operations',
        astGrepPattern: 'queue-send',
        ripgrepPattern: '\\.send\\(',
        examples: [
            'sg search queue-send',
            'rg "\\.send\\(" --type ts'
        ]
    },

    'queue-consumer': {
        name: 'Queue Consumers',
        description: 'Find queue consumer functions',
        astGrepPattern: 'queue-consumer',
        ripgrepPattern: 'async queue\\(batch: MessageBatch',
        examples: [
            'sg search queue-consumer',
            'rg "async queue\\(batch: MessageBatch" --type ts'
        ]
    },

    // Security Patterns
    'jwt-patterns': {
        name: 'JWT Patterns',
        description: 'Find JWT-related code',
        astGrepPattern: 'jwt-patterns',
        ripgrepPattern: 'Bun\\.jwt\\.|jwt|JWT',
        examples: [
            'sg search jwt-patterns',
            'rg "Bun\\.jwt\\.|jwt|JWT" --type ts'
        ]
    },

    'auth-headers': {
        name: 'Authentication Headers',
        description: 'Find authentication header usage',
        astGrepPattern: 'auth-headers',
        ripgrepPattern: 'X-Extension-Secret|Authorization',
        examples: [
            'sg search auth-headers',
            'rg "X-Extension-Secret|Authorization" --type ts'
        ]
    },

    // Testing Patterns
    'test-functions': {
        name: 'Test Functions',
        description: 'Find all test functions',
        astGrepPattern: 'test-functions',
        ripgrepPattern: "test\\('|describe\\('|it\\('",
        examples: [
            'sg search test-functions',
            'rg "test\\(\'|describe\\(\'|it\\(\'" --type ts'
        ]
    },

    'mock-patterns': {
        name: 'Mock Patterns',
        description: 'Find mock and stub usage',
        astGrepPattern: 'mock-patterns',
        ripgrepPattern: 'vi\\.fn\\(\\)|mock|stub',
        examples: [
            'sg search mock-patterns',
            'rg "vi\\.fn\\(\\)|mock|stub" --type ts'
        ]
    },

    // Performance Patterns
    'performance-timing': {
        name: 'Performance Timing',
        description: 'Find performance timing code',
        astGrepPattern: 'performance-timing',
        ripgrepPattern: 'Date\\.now\\(\\)|performance\\.now\\(\\)',
        examples: [
            'sg search performance-timing',
            'rg "Date\\.now\\(\\)|performance\\.now\\(\\)" --type ts'
        ]
    },

    // Monitoring Patterns
    'logger-patterns': {
        name: 'Logger Patterns',
        description: 'Find logging code',
        astGrepPattern: 'logger-patterns',
        ripgrepPattern: 'createLogger|logger\\.|log\\.',
        examples: [
            'sg search logger-patterns',
            'rg "createLogger|logger\\.|log\\." --type ts'
        ]
    },

    // Utility Patterns
    'request-id': {
        name: 'Request ID Generation',
        description: 'Find request ID generation',
        astGrepPattern: 'request-id',
        ripgrepPattern: 'generateRequestId|requestId',
        examples: [
            'sg search request-id',
            'rg "generateRequestId|requestId" --type ts'
        ]
    },

    'formatters': {
        name: 'Formatter Functions',
        description: 'Find formatter function usage',
        astGrepPattern: 'formatters',
        ripgrepPattern: 'fmt\\(|fmtNum\\(',
        examples: [
            'sg search formatters',
            'rg "fmt\\(|fmtNum\\(" --type ts'
        ]
    }
};

async function runCommand(command: string, args: string[]): Promise<string> {
    try {
        const proc = spawn(command, args);
        const output = await new Response(proc.stdout).text();
        return output.trim();
    } catch (error) {
        return `Error running ${command}: ${error}`;
    }
}

async function searchWithAstGrep(pattern: string): Promise<string> {
    return await runCommand('sg', ['search', pattern]);
}

async function searchWithRipgrep(pattern: string, ripgrepPattern: string): Promise<string> {
    return await runCommand('rg', [ripgrepPattern, '--type', 'ts', '--color', 'never']);
}

function printUsage() {
    console.log('🔍 Enhanced Code Search for Betting-Brain v3\n');
    console.log('Usage: bun run scripts/enhanced-code-search.ts [pattern] [type]\n');
    console.log('Available patterns:');

    Object.entries(SEARCH_PATTERNS).forEach(([key, pattern]) => {
        console.log(`  ${key.padEnd(20)} - ${pattern.description}`);
    });

    console.log('\nTypes:');
    console.log('  ast-grep    - Use ast-grep (semantic search)');
    console.log('  ripgrep     - Use ripgrep (text search)');
    console.log('  both        - Use both tools (default)');

    console.log('\nExamples:');
    console.log('  bun run scripts/enhanced-code-search.ts endpoint-handlers');
    console.log('  bun run scripts/enhanced-code-search.ts fantasy402 ripgrep');
    console.log('  bun run scripts/enhanced-code-search.ts analytics ast-grep');
}

async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
        printUsage();
        return;
    }

    const patternKey = args[0];
    const searchType = args[1] || 'both';

    if (!SEARCH_PATTERNS[patternKey]) {
        console.error(`❌ Unknown pattern: ${patternKey}`);
        console.log('\nAvailable patterns:');
        Object.keys(SEARCH_PATTERNS).forEach(key => {
            console.log(`  ${key}`);
        });
        process.exit(1);
    }

    const pattern = SEARCH_PATTERNS[patternKey];

    console.log(`🔍 Searching for: ${pattern.name}`);
    console.log(`📝 Description: ${pattern.description}\n`);

    if (searchType === 'ast-grep' || searchType === 'both') {
        console.log('🌳 ast-grep Results:');
        console.log('─'.repeat(50));
        const astGrepResults = await searchWithAstGrep(pattern.astGrepPattern);
        if (astGrepResults) {
            console.log(astGrepResults);
        } else {
            console.log('No results found');
        }
        console.log();
    }

    if (searchType === 'ripgrep' || searchType === 'both') {
        console.log('🔍 ripgrep Results:');
        console.log('─'.repeat(50));
        const ripgrepResults = await searchWithRipgrep(pattern.astGrepPattern, pattern.ripgrepPattern);
        if (ripgrepResults) {
            console.log(ripgrepResults);
        } else {
            console.log('No results found');
        }
        console.log();
    }

    console.log('💡 Example commands:');
    pattern.examples.forEach(example => {
        console.log(`  ${example}`);
    });
}

if (import.meta.main) {
    await main();
}
