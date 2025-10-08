# Project Style Guide

Welcome to the project's official style guide! This document explains the "why" behind our coding standards and provides clear examples for each rule.

Our rules are enforced automatically and are defined in the [`.cursorrules`](./.cursorrules) file. For a history of changes to these rules, please see the [CHANGELOG.md](./CHANGELOG.md).

---

## Table of Contents
1. [Core Development Rules](#core-development-rules)
2. [API Patterns](#api-patterns)
3. [Security Patterns](#security-patterns)
4. [Testing Patterns](#testing-patterns)
5. [Database Patterns](#database-patterns)
6. [File Organization](#file-organization)
7. [Process Management](#process-management)
8. [Cloudflare Workers](#cloudflare-workers)
9. [MCP Integration](#mcp-integration)
10. [Browser Extension](#browser-extension)

---

## Core Development Rules

### Bun Runtime (CRITICAL)

#### `use-bun-runtime`
* **Description**: Use Bun runtime exclusively for all development tasks.
* **Rationale**: Bun provides superior performance, built-in TypeScript support, and native APIs that eliminate the need for external packages. This ensures consistency across the development environment and reduces dependency bloat.

* ❌ **Incorrect Code**
    ```typescript
    import { spawn } from 'child_process';  // Node.js
    import fs from 'fs';  // Node.js
    import { describe, test } from 'vitest';  // Vitest
    ```

* ✅ **Correct Code**
    ```typescript
    import processManager from './tests/utils/process-cleanup';  // Bun process management
    const file = Bun.file('path/to/file.txt');  // Bun file API
    import { describe, test } from 'bun:test';  // Bun Test
    ```

#### `use-bun-commands`
* **Description**: Always use `bun` commands instead of npm/yarn/node.
* **Rationale**: Bun commands are faster, more reliable, and provide better error messages. This ensures consistent behavior across all environments.

* ❌ **Incorrect Commands**
    ```bash
    npm install
    yarn install
    node script.js
    ```

* ✅ **Correct Commands**
    ```bash
    bun install
    bun run dev
    bun test
    bun run script.ts
    ```

---

## API Patterns

### Request ID Tracking

#### `always-track-request-id`
* **Description**: Generate and use a request ID for all API requests.
* **Rationale**: Request IDs enable distributed tracing, make debugging easier, and provide clear audit trails for production issues.

* ❌ **Incorrect Code**
    ```typescript
    async function handleRequest(request: Request, env: Env): Promise<Response> {
      console.log('Processing request');  // No request ID
      // ... handle request
    }
    ```

* ✅ **Correct Code**
    ```typescript
    async function handleRequest(request: Request, env: Env, requestId: string): Promise<Response> {
      console.log(`[${requestId}] Processing request`);
      // ... handle request
      return new Response(JSON.stringify({ requestId, data }));
    }
    ```

### Error Handling

#### `use-standardized-errors`
* **Description**: Use standardized error classes for consistent error responses.
* **Rationale**: Standardized errors provide predictable API behavior, make debugging easier, and ensure proper HTTP status codes.

* ❌ **Incorrect Code**
    ```typescript
    if (!isValid) {
      return new Response('Invalid input', { status: 400 });
    }
    ```

* ✅ **Correct Code**
    ```typescript
    if (!isValid) {
      throw Errors.validationError(['Field is required']);
    }
    // Automatically handled by createErrorResponse()
    ```

### CORS Headers

#### `always-include-cors`
* **Description**: Include CORS headers in all API responses.
* **Rationale**: CORS headers enable cross-origin requests from dashboards and browser extensions, ensuring proper functionality across all client applications.

* ❌ **Incorrect Code**
    ```typescript
    return new Response(JSON.stringify(data));
    ```

* ✅ **Correct Code**
    ```typescript
    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
    ```

---

## Security Patterns

### Input Validation

#### `validate-all-inputs`
* **Description**: Validate all user inputs before processing.
* **Rationale**: Input validation prevents security vulnerabilities, data corruption, and ensures data integrity throughout the application.

* ❌ **Incorrect Code**
    ```typescript
    function processUserInput(input: unknown) {
      return input.toString();  // No validation
    }
    ```

* ✅ **Correct Code**
    ```typescript
    function processUserInput(input: unknown): string {
      if (typeof input !== 'string') {
        throw Errors.validationError(['Input must be a string']);
      }
      if (input.length === 0) {
        throw Errors.validationError(['Input cannot be empty']);
      }
      return input;
    }
    ```

### SQL Injection Prevention

#### `use-parameterized-queries`
* **Description**: Always use parameterized queries for database operations.
* **Rationale**: Parameterized queries prevent SQL injection attacks, which are a critical security vulnerability that can lead to data breaches.

* ❌ **Incorrect Code**
    ```typescript
    const result = await env.ANALYTICS.prepare(`
      SELECT * FROM users WHERE id = '${userId}'
    `).all();
    ```

* ✅ **Correct Code**
    ```typescript
    const result = await env.ANALYTICS.prepare(`
      SELECT * FROM users WHERE id = ?
    `).bind(userId).all();
    ```

### Stake Validation

#### `no-parsefloat-on-stakes`
* **Description**: Never use `parseFloat()` on betting stakes.
* **Rationale**: `parseFloat("100abc")` returns `100`, accepting garbage input. For betting stakes, this is catastrophic and can lead to financial losses.

* ❌ **Incorrect Code**
    ```typescript
    const stake = parseFloat(userInput);  // Accepts "100abc" → 100
    ```

* ✅ **Correct Code**
    ```typescript
    const stake = Number(userInput);
    if (isNaN(stake) || stake <= 0) {
      throw Errors.validationError(['Invalid stake amount']);
    }
    ```

---

## Testing Patterns

### Process Cleanup

#### `always-cleanup-processes`
* **Description**: Always cleanup spawned processes in tests.
* **Rationale**: Zombie processes can cause test failures, resource leaks, and unpredictable behavior. Proper cleanup ensures reliable test execution.

* ❌ **Incorrect Code**
    ```typescript
    test('should spawn process', async () => {
      const proc = Bun.spawn(['command']);
      await proc.exited;
      // Process not cleaned up
    });
    ```

* ✅ **Correct Code**
    ```typescript
    import processManager from '../utils/process-cleanup';
    
    test('should spawn process', async () => {
      const proc = processManager.spawn(['command']);
      await proc.exited;
    });
    
    afterEach(async () => {
      await processManager.killAll(3000);
    });
    ```

### Mock Environment

#### `use-proper-d1-mocks`
* **Description**: Use correct D1 database mock structure.
* **Rationale**: D1 database `all()` method returns `{ results: [...] }`, not plain arrays. Incorrect mocks cause test failures.

* ❌ **Incorrect Code**
    ```typescript
    all: vi.fn().mockResolvedValue(mockData)  // Wrong structure
    ```

* ✅ **Correct Code**
    ```typescript
    all: vi.fn().mockResolvedValue({ results: mockData })  // Correct structure
    ```

---

## Database Patterns

### Type Safety

#### `cast-d1-results`
* **Description**: Always cast D1 results with `as unknown as` for type safety.
* **Rationale**: D1Result type requires explicit casting to work with TypeScript. This ensures type safety while working with D1's specific return format.

* ❌ **Incorrect Code**
    ```typescript
    const result = await env.ANALYTICS.prepare(query).all();
    const data = result.results;  // Type error
    ```

* ✅ **Correct Code**
    ```typescript
    const result = await env.ANALYTICS.prepare(query).all();
    const data = result.results as unknown as Array<{
      id: string;
      name: string;
    }>;
    ```

### Performance Optimization

#### `use-indexes-for-queries`
* **Description**: Always use indexes for database queries.
* **Rationale**: Indexes dramatically improve query performance, especially for large datasets. This is critical for production scalability.

* ❌ **Incorrect Code**
    ```typescript
    // Query without index
    const result = await env.ANALYTICS.prepare(`
      SELECT * FROM line_movements WHERE eid = ?
    `).bind(eventID).all();
    ```

* ✅ **Correct Code**
    ```typescript
    // Query with index
    const result = await env.ANALYTICS.prepare(`
      SELECT * FROM line_movements 
      WHERE eid = ? AND ts > ?
      ORDER BY ts DESC
      LIMIT ?
    `).bind(eventID, timestamp, limit).all();
    ```

---

## File Organization

### Root Directory Policy

#### `keep-root-clean`
* **Description**: Keep the root directory clean and minimal.
* **Rationale**: A clean root directory improves project navigation, reduces clutter, and follows industry best practices for project organization.

* ❌ **Incorrect Structure**
    ```
    /
    ├── README.md
    ├── TESTING_STATUS.md          # Should be in docs/
    ├── MCP_INTEGRATION_STATUS.md  # Should be in docs/
    ├── CLEANUP_SUMMARY.md         # Should be in docs/
    └── setup-guide.md             # Should be in docs/guides/
    ```

* ✅ **Correct Structure**
    ```
    /
    ├── README.md
    ├── LICENSE
    ├── CLAUDE.md
    ├── package.json
    ├── tsconfig.json
    ├── wrangler.toml
    └── docs/
        ├── TESTING_STATUS.md
        ├── MCP_INTEGRATION_STATUS.md
        └── guides/
            └── setup-guide.md
    ```

### File Naming

#### `use-kebab-case`
* **Description**: Use lowercase kebab-case for all files and directories.
* **Rationale**: Kebab-case is universally supported, avoids case-sensitivity issues, and provides consistent naming across all platforms.

* ❌ **Incorrect Names**
    ```
    BettingAnalytics.ts
    MCP_Integration.md
    testHelpers.ts
    ```

* ✅ **Correct Names**
    ```
    betting-analytics.ts
    mcp-integration.md
    test-helpers.ts
    ```

---

## Process Management

### Zombie Process Prevention

#### `use-process-manager`
* **Description**: Always use the process cleanup utility for spawning child processes.
* **Rationale**: Zombie processes can cause resource leaks, test failures, and unpredictable behavior. The process manager ensures proper cleanup.

* ❌ **Incorrect Code**
    ```typescript
    const proc = Bun.spawn(['command']);  // Can create zombie processes
    ```

* ✅ **Correct Code**
    ```typescript
    import processManager from './tests/utils/process-cleanup';
    const proc = processManager.spawn(['command']);
    ```

---

## Cloudflare Workers

### Environment Bindings

#### `validate-env-bindings`
* **Description**: Always validate environment bindings before use.
* **Rationale**: Missing environment bindings cause runtime errors. Validation ensures proper configuration and provides clear error messages.

* ❌ **Incorrect Code**
    ```typescript
    const result = await env.ANALYTICS.prepare(query).all();  // No validation
    ```

* ✅ **Correct Code**
    ```typescript
    validateEnv(env, ['ANALYTICS']);
    const result = await env.ANALYTICS.prepare(query).all();
    ```

### Async Operations

#### `use-waituntil-for-async`
* **Description**: Use `ctx.waitUntil()` for non-blocking operations.
* **Rationale**: Cloudflare Workers have execution time limits. `waitUntil()` allows background operations without blocking the response.

* ❌ **Incorrect Code**
    ```typescript
    async function handleRequest(request: Request, env: Env, ctx: ExecutionContext) {
      await env.KV.put(key, value);  // Blocks response
      return new Response('OK');
    }
    ```

* ✅ **Correct Code**
    ```typescript
    async function handleRequest(request: Request, env: Env, ctx: ExecutionContext) {
      ctx.waitUntil(env.KV.put(key, value));  // Non-blocking
      return new Response('OK');
    }
    ```

---

## MCP Integration

### Tool Development

#### `validate-mcp-args`
* **Description**: Always validate MCP tool arguments before processing.
* **Rationale**: Invalid arguments can cause tool failures and poor user experience. Validation ensures robust tool behavior.

* ❌ **Incorrect Code**
    ```typescript
    export async function getMyTool(args: any, env: MCPEnv): Promise<MCPToolResult> {
      const result = await env.ANALYTICS.prepare(query).all();  // No validation
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
    ```

* ✅ **Correct Code**
    ```typescript
    export async function getMyTool(args: any, env: MCPEnv): Promise<MCPToolResult> {
      if (!args.param1) {
        return {
          content: [{ type: 'text', text: 'Error: param1 required' }],
          isError: true
        };
      }
      const result = await env.ANALYTICS.prepare(query).all();
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
    ```

---

## Browser Extension

### Manifest V3

#### `use-service-worker-lifecycle`
* **Description**: Use event-driven service workers for Manifest V3.
* **Rationale**: Manifest V3 requires service workers instead of persistent background pages. Event-driven architecture is more efficient and follows modern web standards.

* ❌ **Incorrect Code**
    ```javascript
    // Manifest V2 pattern (deprecated)
    chrome.runtime.onInstalled.addListener(() => {
      // Long-running background page
    });
    ```

* ✅ **Correct Code**
    ```javascript
    // Manifest V3 pattern
    chrome.runtime.onInstalled.addListener(() => {
      console.log('Extension installed');
    });
    
    chrome.action.onClicked.addListener((tab) => {
      chrome.scripting.executeScript({
        target: { tabId: tab.id! },
        files: ['content.js']
      });
    });
    ```

---

## Quick Reference

### Essential Commands
```bash
# Version bump script
./scripts/bump-version.sh <major|minor|patch> "Your commit message"

# Local CI checks
bun run ci

# Security scan
sg scan src/

# Run tests
bun test
```

### Key Files
- **[.cursorrules](.cursorrules)** - Automated rule enforcement
- **[CHANGELOG.md](CHANGELOG.md)** - Version history
- **[CONTRIBUTING.md](docs/CONTRIBUTING.md)** - Team workflow
- **[Automation Guide](docs/CURSOR_RULES_AUTOMATION.md)** - Automated versioning

---

**Status:** ✅ **ACTIVE**  
**Version:** 4.1.0  
**Last Updated:** 2025-10-07  
**Enforcement:** Automated via `.cursorrules`  
**Team Alignment:** ✅ Complete
