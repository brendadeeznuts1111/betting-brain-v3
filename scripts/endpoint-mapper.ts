#!/usr/bin/env bun
// Endpoint Mapper - Auto-generates endpoint documentation from src/index.ts
// Usage: bun scripts/endpoint-mapper.ts [--output docs/api/ENDPOINT_MAP.md]

import { readFileSync, writeFileSync } from 'fs';

interface Endpoint {
  method: string;
  path: string;
  handler: string;
  line: number;
  description?: string;
  authRequired?: boolean;
  rateLimit?: string;
}

// Parse endpoints from src/index.ts
function parseEndpoints(): Endpoint[] {
  const content = readFileSync('src/index.ts', 'utf-8');
  const lines = content.split('\n');
  const endpoints: Endpoint[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match: if (url.pathname === '/path' && request.method === 'METHOD')
    const pathAndMethodMatch = line.match(/if\s+\(url\.pathname\s*===\s*['"]([^'"]+)['"]\s*&&\s*request\.method\s*===\s*['"]([^'"]+)['"]\)/);
    if (pathAndMethodMatch) {
      const [, path, method] = pathAndMethodMatch;
      const handler = findHandler(lines, i);
      const description = findDescription(lines, i);

      endpoints.push({
        method,
        path,
        handler,
        line: i + 1,
        description,
        authRequired: checkAuthRequired(lines, i),
        rateLimit: findRateLimit(lines, i)
      });
      continue;
    }

    // Match: if (url.pathname === '/path')
    const pathOnlyMatch = line.match(/if\s+\(url\.pathname\s*===\s*['"]([^'"]+)['"]\)/);
    if (pathOnlyMatch) {
      const [, path] = pathOnlyMatch;
      const method = findMethod(lines, i);
      const handler = findHandler(lines, i);
      const description = findDescription(lines, i);

      endpoints.push({
        method,
        path,
        handler,
        line: i + 1,
        description,
        authRequired: checkAuthRequired(lines, i),
        rateLimit: findRateLimit(lines, i)
      });
      continue;
    }

    // Match: if (url.pathname.startsWith('/prefix'))
    const prefixMatch = line.match(/if\s+\(url\.pathname\.startsWith\(['"]([^'"]+)['"]\)\)/);
    if (prefixMatch) {
      const [, path] = prefixMatch;
      const method = findMethod(lines, i);
      const handler = findHandler(lines, i);
      const description = findDescription(lines, i);

      endpoints.push({
        method,
        path: `${path}*`,
        handler,
        line: i + 1,
        description,
        authRequired: checkAuthRequired(lines, i),
        rateLimit: findRateLimit(lines, i)
      });
    }
  }

  return endpoints;
}

// Find handler function name
function findHandler(lines: string[], startLine: number): string {
  // Look ahead for return statement with handler call
  for (let i = startLine; i < Math.min(startLine + 10, lines.length); i++) {
    const line = lines[i];

    // Match: return handleXXX(...)
    const handlerMatch = line.match(/return\s+(handle[A-Za-z]+)\(/);
    if (handlerMatch) {
      return handlerMatch[1];
    }

    // Match: return someFunction(...)
    const funcMatch = line.match(/return\s+([a-z][A-Za-z]+)\(/);
    if (funcMatch) {
      return funcMatch[1];
    }
  }

  return 'unknown';
}

// Find method from nested check
function findMethod(lines: string[], startLine: number): string {
  // Look ahead for method check
  for (let i = startLine; i < Math.min(startLine + 5, lines.length); i++) {
    const line = lines[i];
    const methodMatch = line.match(/request\.method\s*===\s*['"]([^'"]+)['"]/);
    if (methodMatch) {
      return methodMatch[1];
    }
  }

  return 'ANY';
}

// Find description from comments
function findDescription(lines: string[], startLine: number): string | undefined {
  // Look back for comments
  for (let i = startLine - 1; i >= Math.max(0, startLine - 3); i--) {
    const line = lines[i].trim();
    if (line.startsWith('//')) {
      return line.replace(/^\/\/\s*/, '');
    }
  }

  return undefined;
}

// Check if authentication is required
function checkAuthRequired(lines: string[], startLine: number): boolean {
  // Look ahead for auth checks
  for (let i = startLine; i < Math.min(startLine + 15, lines.length); i++) {
    const line = lines[i];
    if (line.includes('verifyToken') || line.includes('checkAuth') || line.includes('unauthorized')) {
      return true;
    }
  }

  return false;
}

// Find rate limit configuration
function findRateLimit(lines: string[], startLine: number): string | undefined {
  // Look ahead for rate limit calls
  for (let i = startLine; i < Math.min(startLine + 15, lines.length); i++) {
    const line = lines[i];
    if (line.includes('rateLimit') || line.includes('checkRateLimit')) {
      return '10 req/s per IP';
    }
  }

  return undefined;
}

// Generate Markdown table
function generateMarkdown(endpoints: Endpoint[]): string {
  let md = '# API Endpoint Map\n\n';
  md += '*Auto-generated from `src/index.ts`*\n\n';
  md += `**Total Endpoints:** ${endpoints.length}\n\n`;
  md += '---\n\n';

  // Group by prefix
  const grouped = new Map<string, Endpoint[]>();

  endpoints.forEach(endpoint => {
    const prefix = endpoint.path.split('/')[1] || 'root';
    if (!grouped.has(prefix)) {
      grouped.set(prefix, []);
    }
    grouped.get(prefix)!.push(endpoint);
  });

  // Generate table for each group
  grouped.forEach((endpoints, prefix) => {
    md += `## \`/${prefix}\` Endpoints\n\n`;
    md += '| Method | Path | Handler | Auth | Rate Limit | Source |\n';
    md += '|--------|------|---------|------|------------|--------|\n';

    endpoints.forEach(endpoint => {
      const auth = endpoint.authRequired ? '🔒 Yes' : '❌ No';
      const rateLimit = endpoint.rateLimit || '—';
      const source = `[L${endpoint.line}](../src/index.ts#L${endpoint.line})`;

      md += `| \`${endpoint.method}\` | \`${endpoint.path}\` | \`${endpoint.handler}()\` | ${auth} | ${rateLimit} | ${source} |\n`;
    });

    md += '\n';

    // Add descriptions if any
    const withDesc = endpoints.filter(e => e.description);
    if (withDesc.length > 0) {
      md += '**Descriptions:**\n\n';
      withDesc.forEach(endpoint => {
        md += `- \`${endpoint.method} ${endpoint.path}\`: ${endpoint.description}\n`;
      });
      md += '\n';
    }
  });

  // Add statistics
  md += '---\n\n';
  md += '## Statistics\n\n';
  md += `- **Total Endpoints:** ${endpoints.length}\n`;
  md += `- **Authenticated:** ${endpoints.filter(e => e.authRequired).length}\n`;
  md += `- **Rate Limited:** ${endpoints.filter(e => e.rateLimit).length}\n`;
  md += `- **Methods:**\n`;

  const methodCounts = new Map<string, number>();
  endpoints.forEach(e => {
    methodCounts.set(e.method, (methodCounts.get(e.method) || 0) + 1);
  });

  methodCounts.forEach((count, method) => {
    md += `  - \`${method}\`: ${count}\n`;
  });

  md += '\n---\n\n';
  md += `*Last updated: ${new Date().toISOString()}*\n`;

  return md;
}

// Main
const args = process.argv.slice(2);
const outputFile = args.find(arg => arg.startsWith('--output='))?.split('=')[1] || 'docs/api/ENDPOINT_MAP.md';

console.log('🗺️  Mapping API endpoints...\n');

const endpoints = parseEndpoints();

console.log(`✅ Found ${endpoints.length} endpoints\n`);

// Generate markdown
const markdown = generateMarkdown(endpoints);

// Write to file
writeFileSync(outputFile, markdown);

console.log(`📄 Endpoint map written to: ${outputFile}`);
console.log('\n📊 Endpoint Summary:');
console.log(`   Total: ${endpoints.length}`);
console.log(`   Authenticated: ${endpoints.filter(e => e.authRequired).length}`);
console.log(`   Rate Limited: ${endpoints.filter(e => e.rateLimit).length}`);
