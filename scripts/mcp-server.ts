#!/usr/bin/env bun
/**
 * MCP Server for Forest Grove - Production Edition
 * 
 * Exposes forest automation + sports data as MCP tools
 * Uses official @modelcontextprotocol/sdk
 * 
 * MCP Protocol: JSON-RPC 2.0 over stdio
 * 
 * Usage:
 *   bun run scripts/mcp-server.ts
 * 
 * Configuration:
 *   Add to .cursor/mcp.json
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// Import sports utilities  
import { aggregateOdds, fetchLiveScores, rotateSecret } from '../src/utils/sports-api.js';
import type { Sport, Market, IngestDataPoint } from '../src/types/api.js';

/**
 * Get worker URL
 */
function getWorkerUrl(): string {
  return process.env.WORKER_URL || 'https://betting-brain-v3.nolarose1968-806.workers.dev';
}

/**
 * Push data to analytics via /ingest
 */
async function pushToAnalytics(records: IngestDataPoint[]): Promise<any> {
  const workerUrl = getWorkerUrl();
  try {
    const response = await fetch(`${workerUrl}/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(records),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    return { error: 'Push failed', details: String(error) };
  }
}

// MCP Server Setup
const server = new Server(
  { name: 'forest-grove', version: '3.3.0' },
  { capabilities: { tools: {} } }
);

// Tool Definitions
const TOOLS: Tool[] = [
  {
    name: 'forest-status',
    description: 'Get complete grove health, release status, and analytics',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'deploy-dashboards',
    description: 'Build and deploy dashboards to Cloudflare Pages',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'release',
    description: 'Create a new release (patch/minor/major)',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['patch', 'minor', 'major'] },
        dryRun: { type: 'boolean', default: false },
      },
    },
  },
  {
    name: 'live-odds',
    description: 'Get live aggregated odds from Pinnacle & Bet365',
    inputSchema: {
      type: 'object',
      properties: {
        sport: { type: 'string', enum: ['nba', 'nfl', 'mlb', 'nhl'] },
        market: { type: 'string', enum: ['moneyline', 'spread', 'total'] },
      },
      required: ['sport', 'market'],
    },
  },
  {
    name: 'live-scores',
    description: 'Get live scores from SportsData.io',
    inputSchema: {
      type: 'object',
      properties: {
        sport: { type: 'string', enum: ['nba', 'nfl', 'mlb', 'nhl'] },
      },
      required: ['sport'],
    },
  },
  {
    name: 'push-sports-data',
    description: 'Send aggregated odds/scores to analytics engine',
    inputSchema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              eventId: { type: 'string' },
              timestamp: { type: 'string' },
              odds: { type: 'number' },
              market: { type: 'string' },
              volume: { type: 'number' },
            },
            required: ['eventId', 'timestamp', 'odds'],
          },
        },
      },
      required: ['data'],
    },
  },
];

// List Tools Handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Call Tool Handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'forest-status': {
        const workerUrl = getWorkerUrl();
        const [healthRes, localRes] = await Promise.all([
          fetch(`${workerUrl}/health`).then(r => r.json()).catch(() => ({ status: 'down' })),
          Bun.$`bun run scripts/forest.ts --json`.text().catch(() => '{}'),
        ]);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              worker: healthRes,
              local: JSON.parse(localRes || '{}'),
              timestamp: new Date().toISOString(),
            }, null, 2),
          }],
        };
      }

      case 'deploy-dashboards': {
        await Bun.$`bun run scripts/deploy-dashboards.ts`;
        return { content: [{ type: 'text', text: '✅ Dashboards deployed' }] };
      }

      case 'release': {
        const { type, dryRun } = args as { type?: string; dryRun?: boolean };
        const cmdArgs = ['bun', 'run', 'scripts/release.ts'];
        if (type) cmdArgs.push(type);
        if (dryRun) cmdArgs.push('--dry-run');
        const output = await Bun.$`${cmdArgs}`.text();
        return { content: [{ type: 'text', text: output }] };
      }

      case 'live-odds': {
        const { sport, market } = args as { sport: Sport; market: Market };
        const odds = await aggregateOdds(sport, market);
        return { content: [{ type: 'text', text: JSON.stringify(odds, null, 2) }] };
      }

      case 'live-scores': {
        const { sport } = args as { sport: Sport };
        const scores = await fetchLiveScores(sport);
        return { content: [{ type: 'text', text: JSON.stringify(scores, null, 2) }] };
      }

      case 'push-sports-data': {
        const { data } = args as { data: IngestDataPoint[] };
        const result = await pushToAnalytics(data);
        if (result.error) {
          return { content: [{ type: 'text', text: `❌ ${result.error}: ${result.details}` }], isError: true };
        }
        return { content: [{ type: 'text', text: `📊 Pushed ${data.length} records` }] };
      }

      default:
        return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
});

// Server Startup
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('🔌 Forest Grove MCP Server starting...');
  console.error(`📊 Registered ${TOOLS.length} tools`);
  console.error('🌲 Ready\\n');
}

if (import.meta.main) {
  main().catch((error) => {
    console.error('MCP Server error:', error);
    process.exit(1);
  });
}

export { server };
