/**
 * MCP Tool Registry
 * Maps tool names to their handler functions
 */

import { MCPEnv } from '../types/api';
import { MCPToolResult, MCPToolHandler } from './types';

// Import intelligence tool handlers
import { getBettingExposure } from '../tools/intelligence/getBettingExposure';
import { getCLV } from '../tools/intelligence/getCLV';
import { getHoldPercentage } from '../tools/intelligence/getHoldPercentage';
import { getSharpScore } from '../tools/intelligence/getSharpScore';

// Import MCP tool handlers
import { getSteamMoves } from './handlers/steamMoves';
import { getRiskConcentration } from './handlers/riskConcentration';
import { getSharpActivity } from './handlers/sharpActivity';
import { getTimeSeriesCLV } from './handlers/timeSeriesCLV';
import { getEnhancedSharpScore } from './handlers/enhancedSharpScore';
import { getHoldForecast } from './handlers/holdForecast';
import { getHandleAndHold } from './handlers/handleAndHold';
import { getCustomerVolume } from './handlers/customerVolume';
import { getTimeSeriesAnalytics } from './handlers/timeSeriesAnalytics';
import { placeHedgeBet } from './handlers/placeHedgeBet';

/**
 * Tool Registry Map
 * Maps tool name → handler function
 */
const toolRegistry = new Map<string, MCPToolHandler>();

/**
 * Register Intelligence Tools
 */
function registerIntelligenceTools() {
  // getBettingExposure
  toolRegistry.set('getBettingExposure', async (args, env) => {
    try {
      const request = new Request('http://internal/tools/getBettingExposure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
      });

      const response = await getBettingExposure(request, env);
      const data = await response.json();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(data, null, 2),
          },
        ],
        isError: response.status !== 200,
      };
    } catch (error) {
      return createErrorResult(error);
    }
  });

  // getCLV
  toolRegistry.set('getCLV', async (args, env) => {
    try {
      const request = new Request('http://internal/tools/getCLV', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
      });

      const response = await getCLV(request, env);
      const data = await response.json();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(data, null, 2),
          },
        ],
        isError: response.status !== 200,
      };
    } catch (error) {
      return createErrorResult(error);
    }
  });

  // getHoldPercentage
  toolRegistry.set('getHoldPercentage', async (args, env) => {
    try {
      const request = new Request('http://internal/tools/getHoldPercentage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
      });

      const response = await getHoldPercentage(request, env);
      const data = await response.json();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(data, null, 2),
          },
        ],
        isError: response.status !== 200,
      };
    } catch (error) {
      return createErrorResult(error);
    }
  });

  // getSharpScore
  toolRegistry.set('getSharpScore', async (args, env) => {
    try {
      const request = new Request('http://internal/tools/getSharpScore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
      });

      const response = await getSharpScore(request, env);
      const data = await response.json();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(data, null, 2),
          },
        ],
        isError: response.status !== 200,
      };
    } catch (error) {
      return createErrorResult(error);
    }
  });
}

/**
 * Register Live Betting Tools
 */
function registerLiveBettingTools() {
  // getSteamMoves - 3-sigma steam detection
  toolRegistry.set('getSteamMoves', getSteamMoves);

  // getRiskConcentration - Risk clustering analysis
  toolRegistry.set('getRiskConcentration', getRiskConcentration);

  // getSharpActivity - Sharp customer tracking
  toolRegistry.set('getSharpActivity', getSharpActivity);
}

/**
 * Register Analytics Tools
 */
function registerAnalyticsTools() {
  // Enhanced intelligence tools with analytics
  toolRegistry.set('getTimeSeriesCLV', getTimeSeriesCLV);
  toolRegistry.set('getEnhancedSharpScore', getEnhancedSharpScore);
  toolRegistry.set('getHoldForecast', getHoldForecast);

  // Core analytics tools
  toolRegistry.set('getHandleAndHold', getHandleAndHold);
  toolRegistry.set('getCustomerVolume', getCustomerVolume);
  toolRegistry.set('getTimeSeriesAnalytics', getTimeSeriesAnalytics);
}

/**
 * Register Autonomous Trading Tools
 */
function registerTradingTools() {
  // Place hedge bet (autonomous trading)
  toolRegistry.set('placeHedgeBet', placeHedgeBet);
}

// Placeholder functions removed - tools will be added on-demand when implemented
// See src/archive/README.md for migration guide

/**
 * Initialize all tool registrations
 */
function initializeRegistry() {
  if (toolRegistry.size === 0) {
    registerIntelligenceTools();
    registerLiveBettingTools();
    registerAnalyticsTools();
    registerTradingTools();

    console.log(`[MCP] Registered ${toolRegistry.size} tools`);
  }
}

/**
 * Call a tool by name
 * Main entry point for tool execution
 */
export async function callTool(
  toolName: string,
  args: Record<string, any>,
  env: MCPEnv
): Promise<MCPToolResult> {
  // Initialize registry on first call
  initializeRegistry();

  const handler = toolRegistry.get(toolName);

  if (!handler) {
    return {
      content: [
        {
          type: 'text',
          text: `Tool not found: ${toolName}\n\nAvailable tools: ${Array.from(toolRegistry.keys()).join(', ')}`,
        },
      ],
      isError: true,
    };
  }

  try {
    console.log(`[MCP] Executing tool: ${toolName}`, { args });
    const result = await handler(args, env);
    console.log(`[MCP] Tool completed: ${toolName}`, {
      isError: result.isError || false,
    });
    return result;
  } catch (error) {
    console.error(`[MCP] Tool execution failed: ${toolName}`, error);
    return createErrorResult(error);
  }
}

/**
 * Helper: Create error result
 */
function createErrorResult(error: unknown): MCPToolResult {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [
      {
        type: 'text',
        text: `Error: ${message}`,
      },
    ],
    isError: true,
  };
}

/**
 * Helper: Create not implemented result
 */
function createNotImplementedResult(toolName: string): MCPToolResult {
  return {
    content: [
      {
        type: 'text',
        text: `Tool "${toolName}" is registered but not yet implemented. This tool will be ported from fantasy402-mcp in Phase 4.`,
      },
    ],
    isError: false,
  };
}

/**
 * Get list of all registered tool names
 */
export function getRegisteredToolNames(): string[] {
  initializeRegistry();
  return Array.from(toolRegistry.keys());
}

/**
 * Check if a tool is registered
 */
export function isToolRegistered(toolName: string): boolean {
  initializeRegistry();
  return toolRegistry.has(toolName);
}
