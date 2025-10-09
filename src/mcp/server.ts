/**
 * MCP Server - JSON-RPC 2.0 Handler
 * Implements Model Context Protocol for betting intelligence tools
 * See .cursor/rules/mcp-integration.mdc for MCP patterns
 */

import { MCPEnv } from '../types/api';
import { CORS_HEADERS, createJSONResponse, createOPTIONSResponse } from '../utils/request';
import {
  JSONRPCRequest,
  JSONRPCResponse,
  MCPErrorCode,
  MCPInitializeResult,
  MCPMethod,
} from './types';
import { getMCPTools } from './tools';
import { callTool } from './toolRegistry';

/**
 * Main MCP request handler
 * Processes JSON-RPC 2.0 requests and routes to appropriate handlers
 */
export async function handleMCPRequest(
  request: Request,
  env: MCPEnv
): Promise<Response> {
  // Remove manual corsHeaders object as CORS_HEADERS is imported and used by createJSONResponse/createOPTIONSResponse

  if (request.method === 'OPTIONS') {
    return createOPTIONSResponse();
  }

  if (request.method !== 'POST') {
    return createErrorResponse(null, MCPErrorCode.InvalidRequest, 'Method must be POST', CORS_HEADERS);
  }

  try {
    const body = await request.json() as JSONRPCRequest;
    const { jsonrpc, id, method, params } = body;

    // Validate JSON-RPC 2.0 format
    if (jsonrpc !== '2.0') {
      return createErrorResponse(id, MCPErrorCode.InvalidRequest, 'Invalid jsonrpc version', CORS_HEADERS);
    }

    console.log(`[MCP] ${method} call`, {
      id,
      params: params ? Object.keys(params) : [],
      timestamp: new Date().toISOString(),
    });

    // Route to appropriate handler
    let result: any;

    switch (method as MCPMethod) {
      case 'initialize':
        result = await handleInitialize();
        break;

      case 'tools/list':
        result = await handleToolsList(env);
        break;

      case 'tools/call':
        if (!params?.name) {
          return createErrorResponse(
            id,
            MCPErrorCode.InvalidParams,
            'Missing required parameter: name',
            CORS_HEADERS
          );
        }
        result = await handleToolCall(params.name, params.arguments || {}, env);
        break;

      default:
        return createErrorResponse(
          id,
          MCPErrorCode.MethodNotFound,
          `Method not found: ${method}`,
          CORS_HEADERS
        );
    }

    // Return successful response
    const response: JSONRPCResponse = {
      jsonrpc: '2.0',
      id,
      result,
    };

    return createJSONResponse(response);
  } catch (error) {
    console.error('[MCP] Request error:', error);

    return createErrorResponse(
      null,
      MCPErrorCode.ParseError,
      error instanceof Error ? error.message : 'Parse error',
      CORS_HEADERS
    );
  }
}

/**
 * Handle initialize method
 * Returns protocol version and server capabilities
 */
async function handleInitialize(): Promise<MCPInitializeResult> {
  return {
    protocolVersion: '2024-11-05',
    capabilities: {
      tools: {},
    },
    serverInfo: {
      name: 'betting-brain-v3-mcp',
      version: '3.0.0',
    },
  };
}

/**
 * Handle tools/list method
 * Returns all available MCP tools
 */
async function handleToolsList(env: MCPEnv): Promise<{ tools: any[] }> {
  const tools = await getMCPTools(env);
  return { tools };
}

/**
 * Handle tools/call method
 * Executes a specific tool and returns results
 */
async function handleToolCall(
  toolName: string,
  args: Record<string, any>,
  env: MCPEnv
): Promise<any> {
  try {
    const result = await callTool(toolName, args, env);
    return result;
  } catch (error) {
    console.error(`[MCP] Tool call error (${toolName}):`, error);

    return {
      content: [
        {
          type: 'text',
          text: `Error executing tool: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Create JSON-RPC error response
 */
function createErrorResponse(
  id: string | number | null,
  code: MCPErrorCode,
  message: string,
  headers: Record<string, string>
): Response {
  const response: JSONRPCResponse = {
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message,
    },
  };

  const status = code === MCPErrorCode.ParseError ? 400 : 200;

  return createJSONResponse(response, status, headers);
}
