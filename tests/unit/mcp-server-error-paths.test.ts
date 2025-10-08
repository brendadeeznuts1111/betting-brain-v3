/**
 * MCP Server Error Path Tests
 * Comprehensive error handling tests for MCP JSON-RPC 2.0 server
 */

import { describe, test, expect, beforeEach, vi } from "bun:test";
import { handleMCPRequest } from '../../src/mcp/server';
import type { MCPEnv } from '../../src/types/api';

describe('MCP Server Error Paths', () => {
  let mockEnv: MCPEnv;

  beforeEach(() => {
    mockEnv = {
      ANALYTICS: {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue(null),
            all: vi.fn().mockResolvedValue({ results: [] }),
          }),
          first: vi.fn().mockResolvedValue(null),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue({ results: [] }),
        }),
        exec: vi.fn().mockResolvedValue({ success: true }),
      } as any,
      ANALYTICS_ENGINE: {
        writeDataPoint: vi.fn().mockResolvedValue(undefined),
      } as any,
    };
  });

  describe('HTTP Method Validation', () => {
    test('should reject GET requests', async () => {
      const request = new Request('https://test.com/mcp', {
        method: 'GET',
      });

      const response = await handleMCPRequest(request, mockEnv);
      expect(response.status).toBe(200); // JSON-RPC errors return 200

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe(-32600); // Invalid Request
      expect(data.error.message).toContain('Method must be POST');
    });

    test('should handle OPTIONS preflight requests', async () => {
      const request = new Request('https://test.com/mcp', {
        method: 'OPTIONS',
      });

      const response = await handleMCPRequest(request, mockEnv);
      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });

    test('should reject PUT requests', async () => {
      const request = new Request('https://test.com/mcp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'initialize', id: 1 }),
      });

      const response = await handleMCPRequest(request, mockEnv);
      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.message).toContain('Method must be POST');
    });

    test('should reject DELETE requests', async () => {
      const request = new Request('https://test.com/mcp', {
        method: 'DELETE',
      });

      const response = await handleMCPRequest(request, mockEnv);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });

  describe('JSON-RPC Protocol Validation', () => {
    test('should reject invalid JSON', async () => {
      const request = new Request('https://test.com/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json {',
      });

      const response = await handleMCPRequest(request, mockEnv);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe(-32700); // Parse Error
    });

    test('should reject missing jsonrpc field', async () => {
      const request = new Request('https://test.com/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'initialize', id: 1 }),
      });

      const response = await handleMCPRequest(request, mockEnv);
      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe(-32600); // Invalid Request
      expect(data.error.message).toContain('Invalid jsonrpc version');
    });

    test('should reject wrong jsonrpc version', async () => {
      const request = new Request('https://test.com/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '1.0', method: 'initialize', id: 1 }),
      });

      const response = await handleMCPRequest(request, mockEnv);
      const data = await response.json();
      expect(data.error.code).toBe(-32600);
      expect(data.error.message).toContain('Invalid jsonrpc version');
    });

    test('should handle null jsonrpc field', async () => {
      const request = new Request('https://test.com/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: null, method: 'initialize', id: 1 }),
      });

      const response = await handleMCPRequest(request, mockEnv);
      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe(-32600);
    });

    test('should handle missing Content-Type header', async () => {
      const request = new Request('https://test.com/mcp', {
        method: 'POST',
        body: JSON.stringify({ jsonrpc: '2.0', method: 'initialize', id: 1 }),
      });

      const response = await handleMCPRequest(request, mockEnv);
      // Should still work - JSON parsing doesn't require Content-Type
      expect(response.status).toBe(200);
    });

    test('should handle empty request body', async () => {
      const request = new Request('https://test.com/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '',
      });

      const response = await handleMCPRequest(request, mockEnv);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error.code).toBe(-32700); // Parse Error
    });

    test('should handle null request body', async () => {
      const request = new Request('https://test.com/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'null',
      });

      const response = await handleMCPRequest(request, mockEnv);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });

  describe('Method Routing Errors', () => {
    test('should reject unknown methods', async () => {
      const request = new Request('https://test.com/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'unknown/method',
          id: 1,
        }),
      });

      const response = await handleMCPRequest(request, mockEnv);
      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe(-32601); // Method Not Found
      expect(data.error.message).toContain('Method not found');
      expect(data.error.message).toContain('unknown/method');
    });

    test('should reject empty method name', async () => {
      const request = new Request('https://test.com/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: '',
          id: 1,
        }),
      });

      const response = await handleMCPRequest(request, mockEnv);
      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe(-32601);
    });

    test('should handle null method name', async () => {
      const request = new Request('https://test.com/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: null,
          id: 1,
        }),
      });

      const response = await handleMCPRequest(request, mockEnv);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    test('should handle missing method field', async () => {
      const request = new Request('https://test.com/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
        }),
      });

      const response = await handleMCPRequest(request, mockEnv);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });

  describe('Tools/Call Parameter Validation', () => {
    test('should reject tools/call without name parameter', async () => {
      const request = new Request('https://test.com/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: { arguments: {} },
          id: 1,
        }),
      });

      const response = await handleMCPRequest(request, mockEnv);
      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe(-32602); // Invalid Params
      expect(data.error.message).toContain('Missing required parameter: name');
    });

    test('should reject tools/call with null name', async () => {
      const request = new Request('https://test.com/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: { name: null },
          id: 1,
        }),
      });

      const response = await handleMCPRequest(request, mockEnv);
      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe(-32602);
    });

    test('should reject tools/call with empty name', async () => {
      const request = new Request('https://test.com/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: { name: '' },
          id: 1,
        }),
      });

      const response = await handleMCPRequest(request, mockEnv);
      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe(-32602);
    });

    test('should handle tools/call with missing params', async () => {
      const request = new Request('https://test.com/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/call',
          id: 1,
        }),
      });

      const response = await handleMCPRequest(request, mockEnv);
      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe(-32602);
    });

    test('should handle tools/call with unknown tool name', async () => {
      const request = new Request('https://test.com/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: { name: 'nonExistentTool', arguments: {} },
          id: 1,
        }),
      });

      const response = await handleMCPRequest(request, mockEnv);
      const data = await response.json();
      // Should return error result, not JSON-RPC error
      expect(data.result).toBeDefined();
      expect(data.result.isError).toBe(true);
      expect(data.result.content[0].text).toContain('Error executing tool');
    });

    test('should provide default empty arguments if not specified', async () => {
      const request = new Request('https://test.com/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: { name: 'getBettingExposure' },
          id: 1,
        }),
      });

      const response = await handleMCPRequest(request, mockEnv);
      const data = await response.json();
      // Should execute with empty arguments
      expect(data.result).toBeDefined();
    });
  });

  describe('Initialize Method', () => {
    test('should successfully initialize', async () => {
      const request = new Request('https://test.com/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'initialize',
          id: 1,
        }),
      });

      const response = await handleMCPRequest(request, mockEnv);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.result).toBeDefined();
      expect(data.result.protocolVersion).toBe('2024-11-05');
      expect(data.result.serverInfo.name).toBe('betting-brain-v3-mcp');
    });

    test('should handle initialize with extra parameters', async () => {
      const request = new Request('https://test.com/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'initialize',
          params: { clientInfo: { name: 'test-client' } },
          id: 1,
        }),
      });

      const response = await handleMCPRequest(request, mockEnv);
      const data = await response.json();
      expect(data.result).toBeDefined();
    });
  });

  describe('Tools/List Method', () => {
    test('should successfully list tools', async () => {
      const request = new Request('https://test.com/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/list',
          id: 1,
        }),
      });

      const response = await handleMCPRequest(request, mockEnv);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.result).toBeDefined();
      expect(data.result.tools).toBeDefined();
      expect(Array.isArray(data.result.tools)).toBe(true);
      expect(data.result.tools.length).toBeGreaterThan(0);
    });

    test('should handle tools/list with missing ANALYTICS env', async () => {
      const envWithoutAnalytics = {} as MCPEnv;

      const request = new Request('https://test.com/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/list',
          id: 1,
        }),
      });

      const response = await handleMCPRequest(request, envWithoutAnalytics);
      const data = await response.json();
      expect(data.result).toBeDefined();
      expect(data.result.tools).toBeDefined();
    });
  });

  describe('ID Field Handling', () => {
    test('should preserve string ID', async () => {
      const request = new Request('https://test.com/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'initialize',
          id: 'test-id-123',
        }),
      });

      const response = await handleMCPRequest(request, mockEnv);
      const data = await response.json();
      expect(data.id).toBe('test-id-123');
    });

    test('should preserve numeric ID', async () => {
      const request = new Request('https://test.com/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'initialize',
          id: 42,
        }),
      });

      const response = await handleMCPRequest(request, mockEnv);
      const data = await response.json();
      expect(data.id).toBe(42);
    });

    test('should handle null ID', async () => {
      const request = new Request('https://test.com/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'initialize',
          id: null,
        }),
      });

      const response = await handleMCPRequest(request, mockEnv);
      const data = await response.json();
      expect(data.id).toBeNull();
    });

    test('should handle missing ID', async () => {
      const request = new Request('https://test.com/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'initialize',
        }),
      });

      const response = await handleMCPRequest(request, mockEnv);
      const data = await response.json();
      expect(data.id).toBeUndefined();
    });
  });

  describe('CORS Headers', () => {
    test('should include CORS headers in successful response', async () => {
      const request = new Request('https://test.com/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'initialize',
          id: 1,
        }),
      });

      const response = await handleMCPRequest(request, mockEnv);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    test('should include CORS headers in error response', async () => {
      const request = new Request('https://test.com/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });

      const response = await handleMCPRequest(request, mockEnv);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });

    test('should handle preflight with custom headers', async () => {
      const request = new Request('https://test.com/mcp', {
        method: 'OPTIONS',
        headers: {
          'Access-Control-Request-Headers': 'Authorization, X-Custom-Header',
        },
      });

      const response = await handleMCPRequest(request, mockEnv);
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type');
    });
  });

  describe('Error Response Structure', () => {
    test('should return proper JSON-RPC error structure for parse errors', async () => {
      const request = new Request('https://test.com/mcp', {
        method: 'POST',
        body: 'not valid json',
      });

      const response = await handleMCPRequest(request, mockEnv);
      const data = await response.json();

      expect(data.jsonrpc).toBe('2.0');
      expect(data.error).toBeDefined();
      expect(data.error.code).toBeDefined();
      expect(data.error.message).toBeDefined();
      expect(typeof data.error.code).toBe('number');
      expect(typeof data.error.message).toBe('string');
    });

    test('should return 400 status for parse errors', async () => {
      const request = new Request('https://test.com/mcp', {
        method: 'POST',
        body: '{invalid',
      });

      const response = await handleMCPRequest(request, mockEnv);
      expect(response.status).toBe(400);
    });

    test('should return 200 status for protocol errors', async () => {
      const request = new Request('https://test.com/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '1.0',
          method: 'initialize',
          id: 1,
        }),
      });

      const response = await handleMCPRequest(request, mockEnv);
      expect(response.status).toBe(200); // JSON-RPC uses 200 for protocol errors
    });
  });

  describe('Concurrent Requests', () => {
    test('should handle multiple concurrent requests', async () => {
      const requests = Array.from({ length: 10 }, (_, i) =>
        new Request('https://test.com/mcp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'initialize',
            id: i,
          }),
        })
      );

      const responses = await Promise.all(
        requests.map(req => handleMCPRequest(req, mockEnv))
      );

      expect(responses).toHaveLength(10);
      responses.forEach((response, i) => {
        expect(response.status).toBe(200);
      });
    });

    test('should handle mixed valid and invalid concurrent requests', async () => {
      const requests = [
        new Request('https://test.com/mcp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', method: 'initialize', id: 1 }),
        }),
        new Request('https://test.com/mcp', {
          method: 'POST',
          body: 'invalid',
        }),
        new Request('https://test.com/mcp', {
          method: 'GET',
        }),
      ];

      const responses = await Promise.all(
        requests.map(req => handleMCPRequest(req, mockEnv))
      );

      expect(responses).toHaveLength(3);
      expect(responses[0].status).toBe(200);
      expect(responses[1].status).toBe(400);
      expect(responses[2].status).toBe(200); // Invalid request returns 200 with error
    });
  });
});
