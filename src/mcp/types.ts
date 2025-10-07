/**
 * MCP (Model Context Protocol) Type Definitions
 * JSON-RPC 2.0 compliant types for MCP server
 */

// JSON-RPC 2.0 Base Types
export interface JSONRPCRequest {
  jsonrpc: '2.0';
  id: string | number | null;
  method: string;
  params?: Record<string, any>;
}

export interface JSONRPCResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: any;
  error?: JSONRPCError;
}

export interface JSONRPCError {
  code: number;
  message: string;
  data?: any;
}

// MCP Protocol Types
export interface MCPInitializeResult {
  protocolVersion: string;
  capabilities: {
    tools?: Record<string, any>;
    resources?: Record<string, any>;
    prompts?: Record<string, any>;
  };
  serverInfo: {
    name: string;
    version: string;
  };
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface MCPToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface MCPToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

// MCP Method Names
export type MCPMethod =
  | 'initialize'
  | 'tools/list'
  | 'tools/call'
  | 'resources/list'
  | 'resources/read'
  | 'prompts/list'
  | 'prompts/get';

// MCP Error Codes (JSON-RPC 2.0 Standard)
export enum MCPErrorCode {
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603,
}

// MCP Tool Categories
export enum MCPToolCategory {
  Intelligence = 'intelligence',
  Analytics = 'analytics',
  Management = 'management',
  LiveBetting = 'live_betting',
  RawData = 'raw_data',
  Admin = 'admin',
}

// Export types for tool implementations
export interface MCPToolHandler {
  (args: Record<string, any>, env: any): Promise<MCPToolResult>;
}

export interface MCPToolDefinition {
  tool: MCPTool;
  handler: MCPToolHandler;
  category: MCPToolCategory;
}
