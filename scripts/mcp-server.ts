#!/usr/bin/env bun
/**
 * MCP Server for Forest Grove
 *
 * Exposes forest automation and sports data as MCP tools for AI assistants
 * (Cursor, Claude Desktop, Windsurf, etc.)
 *
 * MCP Protocol: JSON-RPC 2.0 over stdio
 *
 * Usage:
 *   bun run scripts/mcp-server.ts
 *
 * Configuration:
 *   Add to .cursor/mcp.json or Claude Desktop config
 *
 * Environment:
 *   WORKER_URL - Worker endpoint (default: from wrangler.toml)
 *   GRAFANA_URL - Grafana instance URL
 *   GRAFANA_KEY - Grafana API key
 */

import { z } from 'zod';

// MCP Protocol Types
interface JSONRPCRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: any;
}

interface JSONRPCResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
  handler: (params: any) => Promise<any>;
}

// Tool Registry
const tools: MCPTool[] = [];

/**
 * Register an MCP tool
 */
function registerTool(
  name: string,
  description: string,
  inputSchema: any,
  handler: (params: any) => Promise<any>
): void {
  tools.push({ name, description, inputSchema, handler });
}

/**
 * Get worker URL from environment or default
 */
function getWorkerUrl(): string {
  return (
    process.env.WORKER_URL ||
    'https://betting-brain-v3.nolarose1968-806.workers.dev'
  );
}

// ============================================================================
// Forest Tools
// ============================================================================

registerTool(
  'forest-status',
  'Get complete grove health, release status, and analytics',
  {
    type: 'object',
    properties: {},
  },
  async () => {
    const workerUrl = getWorkerUrl();

    try {
      const [healthRes, analyticsRes] = await Promise.all([
        fetch(`${workerUrl}/health`).then((r) => r.json()),
        // Use forest CLI for local status
        Bun.$`bun run scripts/forest.ts --json`.text(),
      ]);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                worker: healthRes,
                local: JSON.parse(analyticsRes || '{}'),
                timestamp: new Date().toISOString(),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error fetching status: ${error}`,
          },
        ],
        isError: true,
      };
    }
  }
);

registerTool(
  'deploy-dashboards',
  'Build and deploy dashboards to Cloudflare Pages',
  {
    type: 'object',
    properties: {},
  },
  async () => {
    try {
      await Bun.$`bun run scripts/deploy-dashboards.ts`;
      return {
        content: [
          {
            type: 'text',
            text: '✅ Dashboards deployed successfully',
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Deployment failed: ${error}`,
          },
        ],
        isError: true,
      };
    }
  }
);

registerTool(
  'release',
  'Create a new release (bump version, update changelog, create tag)',
  {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        enum: ['patch', 'minor', 'major'],
        description: 'Version bump type',
      },
      dryRun: {
        type: 'boolean',
        description: 'Dry run without making changes',
        default: false,
      },
    },
  },
  async ({ type, dryRun }) => {
    try {
      const args = ['bun', 'run', 'scripts/release.ts'];
      if (type) args.push(type);
      if (dryRun) args.push('--dry-run');

      const output = await Bun.$`${args}`.text();
      return {
        content: [
          {
            type: 'text',
            text: output,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Release failed: ${error}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ============================================================================
// Sports API Tools
// ============================================================================

registerTool(
  'ingest-betting-data',
  'Send betting intelligence data to analytics engine',
  {
    type: 'object',
    properties: {
      data: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            eventId: { type: 'string' },
            timestamp: { type: 'string' },
            metric: { type: 'string' },
            value: { type: 'number' },
            metadata: { type: 'object' },
          },
          required: ['eventId', 'timestamp', 'metric', 'value'],
        },
      },
    },
    required: ['data'],
  },
  async ({ data }) => {
    const workerUrl = getWorkerUrl();

    try {
      const response = await fetch(`${workerUrl}/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const result = await response.json();
      return {
        content: [
          {
            type: 'text',
            text: `📊 Ingested ${result.received || data.length} records`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Ingestion failed: ${error}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// ============================================================================
// MCP Protocol Handler
// ============================================================================

/**
 * Handle MCP requests
 */
async function handleRequest(request: JSONRPCRequest): Promise<JSONRPCResponse> {
  const { method, params, id } = request;

  try {
    switch (method) {
      case 'initialize': {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: 'forest-grove',
              version: '3.3.0',
            },
          },
        };
      }

      case 'tools/list': {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            tools: tools.map((t) => ({
              name: t.name,
              description: t.description,
              inputSchema: t.inputSchema,
            })),
          },
        };
      }

      case 'tools/call': {
        const { name, arguments: args } = params;
        const tool = tools.find((t) => t.name === name);

        if (!tool) {
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32602,
              message: `Tool not found: ${name}`,
            },
          };
        }

        const result = await tool.handler(args || {});
        return {
          jsonrpc: '2.0',
          id,
          result,
        };
      }

      default: {
        return {
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: `Method not found: ${method}`,
          },
        };
      }
    }
  } catch (error) {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32603,
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

/**
 * Main server loop
 */
async function main() {
  console.error('🔌 Forest Grove MCP Server starting...');
  console.error(`📊 Registered ${tools.length} tools`);
  console.error('🌲 Ready for requests\n');

  // Read from stdin, write to stdout (MCP protocol)
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  for await (const chunk of Bun.stdin.stream()) {
    const text = decoder.decode(chunk);
    const lines = text.split('\n').filter((line) => line.trim());

    for (const line of lines) {
      try {
        const request: JSONRPCRequest = JSON.parse(line);
        const response = await handleRequest(request);
        const responseText = JSON.stringify(response) + '\n';
        await Bun.write(Bun.stdout, encoder.encode(responseText));
      } catch (error) {
        console.error('Error processing request:', error);
      }
    }
  }
}

// Run if executed directly
if (import.meta.main) {
  main().catch((error) => {
    console.error('MCP Server error:', error);
    process.exit(1);
  });
}

export { registerTool, tools, handleRequest };
