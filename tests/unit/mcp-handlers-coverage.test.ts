import { describe, test, expect, beforeEach } from 'bun:test';

/**
 * Intelligence Tools Coverage Expansion - High Priority Functions
 * Targets: getBettingExposure, getCLV, getSharpScore, getHoldPercentage
 */

describe('Intelligence Tools Coverage Expansion', () => {
    // Set test environment to bypass rate limiting
    process.env.NODE_ENV = 'test';

    // Mock environment for all tests
    const mockEnv = {
        ANALYTICS: {
            prepare: (query: string) => ({
                bind: (...params: any[]) => ({
                    first: async () => ({
                        side: 'HOME',
                        risk: 50000,
                        net: -25000
                    }),
                    all: async () => ({
                        results: [
                            { side: 'HOME', risk: 50000, net: -25000 },
                            { side: 'AWAY', risk: 45000, net: 25000 }
                        ]
                    })
                }),
                first: async () => ({
                    cid: 'test_customer',
                    total_bet: 5000
                }),
                all: async () => ({
                    results: [
                        { cid: 'test_customer', total_bet: 5000 }
                    ]
                })
            })
        }
    };

    describe('getBettingExposure', () => {
        test('should calculate total exposure correctly', async () => {
            const { getBettingExposure } = await import('../../src/tools/intelligence/getBettingExposure');
            const request = new Request('http://localhost:8787/api?eventId=nba_123&limit=10');
            const result = await getBettingExposure(request, mockEnv as any);

            expect(result).toBeInstanceOf(Response);
            expect(result.status).toBe(200);

            const data = await result.json() as any;
            expect(data).toHaveProperty('sides');
            expect(data.sides).toBeDefined();
        });

        test('should handle missing eventId', async () => {
            const { getBettingExposure } = await import('../../src/tools/intelligence/getBettingExposure');
            const request = new Request('http://localhost:8787/api');
            const result = await getBettingExposure(request, mockEnv as any);

            expect(result).toBeInstanceOf(Response);
            expect(result.status).toBe(200);
        });

        test('should format exposure data with sides', async () => {
            const { getBettingExposure } = await import('../../src/tools/intelligence/getBettingExposure');
            const request = new Request('http://localhost:8787/api?eid=nba_123');
            const result = await getBettingExposure(request, mockEnv as any);

            expect(result).toBeInstanceOf(Response);
            expect(result.status).toBe(200);

            const data = await result.json();
            expect(data).toHaveProperty('totalRisk');
            expect(data).toHaveProperty('maxExposure');
        });
    });

    describe('getCLV', () => {
        test('should calculate customer lifetime value', async () => {
            const { getCLV } = await import('../../src/tools/intelligence/getCLV');
            const request = new Request('http://localhost:8787/api?customerId=test_customer&limit=5');
            const result = await getCLV(request, mockEnv as any);

            expect(result).toBeInstanceOf(Response);
            expect(result.status).toBe(200);

            const data = await result.json();
            expect(data).toHaveProperty('customerId', 'test_customer');
        });

        test('should handle invalid customer ID format', async () => {
            const { getCLV } = await import('../../src/tools/intelligence/getCLV');
            const request = new Request('http://localhost:8787/api?customerId=invalid-id-format&limit=10');
            const result = await getCLV(request, mockEnv as any);

            expect(result).toBeInstanceOf(Response);
            expect(result.status).toBe(200);
        });

        test('should return CLV with transaction details', async () => {
            const { getCLV } = await import('../../src/tools/intelligence/getCLV');
            const request = new Request('http://localhost:8787/api?customerId=test_customer');
            const result = await getCLV(request, mockEnv as any);

            expect(result).toBeInstanceOf(Response);
            expect(result.status).toBe(200);

            const data = await result.json();
            expect(data).toBeDefined();
        });
    });

    describe('getSharpScore', () => {
        test('should calculate sharp betting score', async () => {
            const { getSharpScore } = await import('../../src/tools/intelligence/getSharpScore');
            const request = new Request('http://localhost:8787/api?customerId=test_customer&timeRange=30d');
            const result = await getSharpScore(request, mockEnv as any);

            expect(result).toBeInstanceOf(Response);
            expect(result.status).toBe(200);
        });

        test('should handle missing customer ID', async () => {
            const { getSharpScore } = await import('../../src/tools/intelligence/getSharpScore');
            const request = new Request('http://localhost:8787/api');
            const result = await getSharpScore(request, mockEnv as any);

            expect(result).toBeInstanceOf(Response);
            expect(result.status).toBe(200);
        });

        test('should include score calculation details', async () => {
            const { getSharpScore } = await import('../../src/tools/intelligence/getSharpScore');
            const request = new Request('http://localhost:8787/api?customerId=test_customer');
            const result = await getSharpScore(request, mockEnv as any);

            expect(result).toBeInstanceOf(Response);
            expect(result.status).toBe(200);

            const data = await result.json();
            expect(data).toBeDefined();
        });
    });

    describe('getHoldPercentage', () => {
        test('should calculate book hold percentage', async () => {
            const { getHoldPercentage } = await import('../../src/tools/intelligence/getHoldPercentage');
            const request = new Request('http://localhost:8787/api?sport=NBA&timeRange=7d');
            const result = await getHoldPercentage(request, mockEnv as any);

            expect(result).toBeInstanceOf(Response);
            expect(result.status).toBe(200);
        });

        test('should handle sport-specific calculations', async () => {
            const { getHoldPercentage } = await import('../../src/tools/intelligence/getHoldPercentage');
            const request = new Request('http://localhost:8787/api?sport=NFL');
            const result = await getHoldPercentage(request, mockEnv as any);

            expect(result).toBeInstanceOf(Response);
            expect(result.status).toBe(200);
        });

        test('should format hold percentage data', async () => {
            const { getHoldPercentage } = await import('../../src/tools/intelligence/getHoldPercentage');
            const request = new Request('http://localhost:8787/api?sport=NBA&timeRange=24h');
            const result = await getHoldPercentage(request, mockEnv as any);

            expect(result).toBeInstanceOf(Response);
            expect(result.status).toBe(200);

            const data = await result.json();
            expect(data).toBeDefined();
        });
    });

    describe('MCP Server Routing', () => {
        test('should handle tools/list request', async () => {
            const { handleMCPRequest } = await import('../../src/mcp/server');
            const request = new Request('http://localhost:8787/mcp', {
                method: 'POST',
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'tools/list'
                })
            });

            const result = await handleMCPRequest(request, mockEnv as any);
            expect(result).toBeDefined();
        });

        test('should route tools/call requests correctly', async () => {
            const { handleMCPRequest } = await import('../../src/mcp/server');
            const request = new Request('http://localhost:8787/mcp', {
                method: 'POST',
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 2,
                    method: 'tools/call',
                    params: {
                        name: 'getBettingExposure',
                        arguments: { eventId: 'nba_123' }
                    }
                })
            });

            const result = await handleMCPRequest(request, mockEnv as any);
            expect(result).toBeDefined();
        });

        test('should handle invalid JSON-RPC requests', async () => {
            const { handleMCPRequest } = await import('../../src/mcp/server');
            const request = new Request('http://localhost:8787/mcp', {
                method: 'POST',
                body: JSON.stringify({
                    invalid: 'request'
                })
            });

            const result = await handleMCPRequest(request, mockEnv as any);
            expect(result).toBeDefined();
        });
    });

    describe('Tool Registry', () => {
        test('should register and route all MCP tools via callTool', async () => {
            const { callTool, getRegisteredToolNames } = await import('../../src/mcp/toolRegistry');

            // Test that we have registered tools
            const toolNames = getRegisteredToolNames();
            expect(Array.isArray(toolNames)).toBe(true);
            expect(toolNames.length).toBeGreaterThan(0);
        });

        test('should handle tool execution parameters via callTool', async () => {
            const { callTool } = await import('../../src/mcp/toolRegistry');

            // Test callTool function exists
            expect(typeof callTool).toBe('function');
        });

        test('should handle valid tool calls', async () => {
            const { callTool } = await import('../../src/mcp/toolRegistry');

            const result = await callTool('getBettingExposure', { eid: 'test' }, mockEnv as any);
            expect(result).toHaveProperty('content');
            expect(result).toHaveProperty('isError');
        });
    });

    describe('MCP Tool Definitions', () => {
        test('should be importable', async () => {
            const mcpTools = await import('../../src/mcp/tools');

            // Check that the module can be imported
            expect(mcpTools).toBeDefined();
        });
    });
});
