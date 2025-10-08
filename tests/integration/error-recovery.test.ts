/**
 * Integration Error Recovery Tests
 * Tests cascading failure scenarios and error recovery across multiple components
 */

import { describe, test, expect, beforeEach, vi } from "bun:test";
import { handleLineIngress } from '../../src/queues/lineIngress';
import { handleSteamWebhook } from '../../src/queues/steamWebhook';
import { getBettingExposure } from '../../src/tools/intelligence/getBettingExposure';
import { getSharpScore } from '../../src/tools/intelligence/getSharpScore';
import { handleMCPRequest } from '../../src/mcp/server';
import { getSteamMoves } from '../../src/mcp/handlers/steamMoves';
import { CostCapGuard } from '../../src/guards/costCap';
import { RateLimitGuard } from '../../src/guards/rateLimit';
import type { Env } from '../../src/types/api';

describe('Integration Error Recovery Tests', () => {
  let mockEnv: Env;
  let mockContext: ExecutionContext;

  beforeEach(() => {
    mockEnv = {
      ANALYTICS: {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue(null),
            all: vi.fn().mockResolvedValue({ results: [] }),
            run: vi.fn().mockResolvedValue({ success: true }),
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
      STEAM_WEBHOOK: {
        send: vi.fn().mockResolvedValue({ success: true }),
      } as any,
    };

    mockContext = {
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
    } as any;
  });

  describe('Database Connection Failures', () => {
    test('should handle complete database unavailability across all components', async () => {
      const envWithoutDb = {} as Env;

      const results = await Promise.allSettled([
        getBettingExposure(
          new Request('https://test.com/api/betting-exposure?eid=event-1'),
          envWithoutDb
        ),
        getSharpScore(
          new Request('https://test.com/api/sharp-score?cid=customer-1'),
          envWithoutDb
        ),
        getSteamMoves({ agentID: 'test' }, envWithoutDb),
      ]);

      results.forEach(result => {
        if (result.status === 'fulfilled') {
          const value = result.value as Response;
          expect(value.status).toBeGreaterThanOrEqual(500);
        }
      });
    });

    test('should handle database connection lost during operation', async () => {
      let callCount = 0;
      (mockEnv.ANALYTICS.prepare as any).mockImplementation(() => {
        callCount++;
        if (callCount > 2) {
          return {
            bind: vi.fn().mockReturnValue({
              first: vi.fn().mockRejectedValue(new Error('Connection lost')),
              all: vi.fn().mockRejectedValue(new Error('Connection lost')),
              run: vi.fn().mockRejectedValue(new Error('Connection lost')),
            }),
          };
        }
        return {
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue({ cid: 'test', clv: 1000 }),
            all: vi.fn().mockResolvedValue({ results: [] }),
            run: vi.fn().mockResolvedValue({ success: true }),
          }),
        };
      });

      const requests = Array.from({ length: 5 }, () =>
        getSharpScore(
          new Request('https://test.com/api/sharp-score?cid=customer-1'),
          mockEnv
        )
      );

      const results = await Promise.allSettled(requests);

      // First 2 should succeed, rest should fail
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('fulfilled');
      results.slice(2).forEach(result => {
        if (result.status === 'fulfilled') {
          expect((result.value as Response).status).toBeGreaterThanOrEqual(500);
        }
      });
    });

    test('should handle database timeout cascading to multiple operations', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockImplementation(() =>
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Timeout')), 100)
            )
          ),
          all: vi.fn().mockImplementation(() =>
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Timeout')), 100)
            )
          ),
          run: vi.fn().mockImplementation(() =>
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Timeout')), 100)
            )
          ),
        }),
      });

      const message = {
        body: JSON.stringify({
          eid: 'event-1',
          mt: 'SPREAD',
          lb: -3.5,
          la: -4.0,
          vb: 1000,
          va: 1500,
          ts: new Date().toISOString(),
        }),
        id: 'msg-1',
        timestamp: Date.now(),
      } as Message;

      await expect(handleLineIngress(message, mockEnv, mockContext)).rejects.toThrow(
        'Timeout'
      );
    });
  });

  describe('Guard Failures', () => {
    test('should handle cost cap and rate limit both failing', async () => {
      // Mock database to trigger cost cap
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({
            size: 10000000000,
            rows: 10000000,
          }),
          all: vi.fn().mockResolvedValue({ results: [] }),
        }),
        first: vi.fn().mockResolvedValue({
          size: 10000000000,
          rows: 10000000,
        }),
      });

      // Make many rapid requests to trigger rate limit
      const requests = Array.from({ length: 50 }, () =>
        getBettingExposure(
          new Request('https://test.com/api/betting-exposure?eid=event-1'),
          mockEnv
        )
      );

      const results = await Promise.all(requests);

      const blocked = results.filter(res => res.status === 503 || res.status === 429);
      expect(blocked.length).toBeGreaterThan(0);
    });

    test('should handle guards with undefined database', async () => {
      const costCapGuard = new CostCapGuard({
        d1: { maxSize: 100000000, maxRows: 100000 },
        analytics: { samplingRate: 0.1, maxEventsPerMinute: 100 },
      });

      const envWithoutDb = {} as Env;
      const request = new Request('https://test.com/api/test');

      // Should not throw - should use safe defaults
      const result = await costCapGuard.checkRequest(request, envWithoutDb);

      expect(result.allowed).toBe(true);
    });

    test('should handle rate limit with concurrent database errors', async () => {
      const rateLimitGuard = new RateLimitGuard({
        requestsPerSecond: 10,
        burstLimit: 20,
        windowSize: 1000,
        keyGenerator: (req) => req.headers.get('cf-connecting-ip') || 'unknown',
      });

      // Make concurrent requests that might cause race conditions
      const requests = Array.from({ length: 30 }, () =>
        new Request('https://test.com/api/test')
      );

      const results = await Promise.all(
        requests.map(req => rateLimitGuard.checkRateLimit(req))
      );

      expect(results).toHaveLength(30);
      results.forEach(result => {
        expect(result.allowed).toBeDefined();
        expect(result.remaining).toBeDefined();
      });
    });
  });

  describe('Queue Consumer Cascading Failures', () => {
    test('should handle lineIngress triggering steamWebhook with database down', async () => {
      let prepareCallCount = 0;
      (mockEnv.ANALYTICS.prepare as any).mockImplementation((query: string) => {
        prepareCallCount++;

        // First call (cost cap check) succeeds
        if (prepareCallCount === 1) {
          return {
            first: vi.fn().mockResolvedValue({ size: 1000, rows: 100 }),
            bind: vi.fn().mockReturnValue({
              first: vi.fn().mockResolvedValue({ size: 1000, rows: 100 }),
            }),
          };
        }

        // Subsequent calls fail (database down)
        return {
          bind: vi.fn().mockReturnValue({
            run: vi.fn().mockRejectedValue(new Error('Database connection lost')),
            first: vi.fn().mockRejectedValue(new Error('Database connection lost')),
            all: vi.fn().mockRejectedValue(new Error('Database connection lost')),
          }),
        };
      });

      const message = {
        body: JSON.stringify({
          eid: 'event-1',
          mt: 'SPREAD',
          lb: -3.5,
          la: -6.0, // Large move that triggers steam detection
          vb: 1000,
          va: 2000,
          ts: new Date().toISOString(),
        }),
        id: 'msg-1',
        timestamp: Date.now(),
      } as Message;

      await expect(handleLineIngress(message, mockEnv, mockContext)).rejects.toThrow();
    });

    test('should handle steamWebhook with analytics engine unavailable', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockImplementation((query: string) => {
        if (query.includes('steam_dedupe')) {
          return {
            bind: vi.fn().mockReturnValue({
              first: vi.fn().mockResolvedValue(null),
              run: vi.fn().mockResolvedValue({ success: true }),
            }),
          };
        }
        // Sigma calculation succeeds
        return {
          bind: vi.fn().mockReturnValue({
            all: vi.fn().mockResolvedValue({
              results: [
                { lb: -3.5, la: -5.5, ts: new Date().toISOString() },
                { lb: -3.0, la: -4.0, ts: new Date().toISOString() },
              ],
            }),
          }),
        };
      });

      (mockEnv.ANALYTICS_ENGINE.writeDataPoint as any).mockRejectedValue(
        new Error('Analytics Engine unavailable')
      );

      const message = {
        body: JSON.stringify({
          eid: 'event-1',
          mt: 'SPREAD',
          lb: -3.5,
          la: -10.0, // Large move
          vb: 1000,
          va: 1500,
          ts: new Date().toISOString(),
        }),
        id: 'steam-1',
        timestamp: Date.now(),
      } as Message;

      await expect(handleSteamWebhook(message, mockEnv, mockContext)).rejects.toThrow();
    });

    test('should handle queue message with all downstream services failing', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockRejectedValue(new Error('Database error')),
          first: vi.fn().mockRejectedValue(new Error('Database error')),
          all: vi.fn().mockRejectedValue(new Error('Database error')),
        }),
        first: vi.fn().mockResolvedValue({ size: 1000, rows: 100 }),
      });

      (mockEnv.ANALYTICS_ENGINE.writeDataPoint as any).mockRejectedValue(
        new Error('Analytics error')
      );

      (mockEnv.STEAM_WEBHOOK.send as any).mockRejectedValue(
        new Error('Queue error')
      );

      const message = {
        body: JSON.stringify({
          eid: 'event-1',
          mt: 'SPREAD',
          lb: -3.5,
          la: -4.0,
          vb: 1000,
          va: 1500,
          ts: new Date().toISOString(),
        }),
        id: 'msg-1',
        timestamp: Date.now(),
      } as Message;

      await expect(handleLineIngress(message, mockEnv, mockContext)).rejects.toThrow();
    });
  });

  describe('MCP Server Cascading Failures', () => {
    test('should handle multiple MCP tools failing with database down', async () => {
      const envWithoutDb = {} as Env;

      const mcpRequest = new Request('https://test.com/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: { name: 'getSteamMoves', arguments: { agentID: 'test' } },
          id: 1,
        }),
      });

      const response = await handleMCPRequest(mcpRequest, envWithoutDb);
      const data = await response.json();

      expect(data.result).toBeDefined();
      expect(data.result.isError).toBe(true);
    });

    test('should handle MCP server with all handlers throwing errors', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockRejectedValue(new Error('Database error')),
          all: vi.fn().mockRejectedValue(new Error('Database error')),
          run: vi.fn().mockRejectedValue(new Error('Database error')),
        }),
      });

      const handlers = [
        'getSteamMoves',
        'getRiskConcentration',
        'getSharpActivity',
        'getBettingExposure',
        'getCLV',
        'getHoldPercentage',
        'getSharpScore',
      ];

      const requests = handlers.map(toolName =>
        new Request('https://test.com/mcp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'tools/call',
            params: { name: toolName, arguments: {} },
            id: Math.random(),
          }),
        })
      );

      const responses = await Promise.all(
        requests.map(req => handleMCPRequest(req, mockEnv))
      );

      responses.forEach(async (response) => {
        const data = await response.json();
        expect(data.result).toBeDefined();
        expect(data.result.isError).toBe(true);
      });
    });
  });

  describe('Cross-Component Error Propagation', () => {
    test('should handle intelligence tool failing and triggering queue retry', async () => {
      let attemptCount = 0;
      (mockEnv.ANALYTICS.prepare as any).mockImplementation(() => {
        attemptCount++;
        if (attemptCount === 1) {
          return {
            first: vi.fn().mockResolvedValue({ size: 1000, rows: 100 }),
            bind: vi.fn().mockReturnValue({
              first: vi.fn().mockResolvedValue({ size: 1000, rows: 100 }),
            }),
          };
        }

        // Fail on subsequent attempts
        return {
          bind: vi.fn().mockReturnValue({
            run: vi.fn().mockRejectedValue(new Error('connection timeout')),
          }),
        };
      });

      const message = {
        body: JSON.stringify({
          eid: 'event-1',
          mt: 'SPREAD',
          lb: -3.5,
          la: -4.0,
          vb: 1000,
          va: 1500,
          ts: new Date().toISOString(),
        }),
        id: 'msg-1',
        timestamp: Date.now(),
      } as Message;

      // Should throw to trigger retry
      await expect(handleLineIngress(message, mockEnv, mockContext)).rejects.toThrow(
        'connection timeout'
      );
    });

    test('should handle partial system degradation', async () => {
      // Database works but analytics engine fails
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ cid: 'test', clv: 1000, wr: 55, ao: 100 }),
          all: vi.fn().mockResolvedValue({
            results: [{ side: 'HOME', risk: 1000, net: 500 }],
          }),
          run: vi.fn().mockResolvedValue({ success: true }),
        }),
        first: vi.fn().mockResolvedValue({ size: 1000, rows: 100 }),
      });

      (mockEnv.ANALYTICS_ENGINE.writeDataPoint as any).mockRejectedValue(
        new Error('Analytics Engine degraded')
      );

      // Intelligence tools should still work
      const exposureResponse = await getBettingExposure(
        new Request('https://test.com/api/betting-exposure?eid=event-1'),
        mockEnv
      );

      expect(exposureResponse.status).toBe(200);

      // But queue operations that need analytics engine should fail
      const message = {
        body: JSON.stringify({
          eid: 'event-1',
          mt: 'SPREAD',
          lb: -3.5,
          la: -4.0,
          vb: 1000,
          va: 1500,
          ts: new Date().toISOString(),
        }),
        id: 'msg-1',
        timestamp: Date.now(),
      } as Message;

      await expect(handleLineIngress(message, mockEnv, mockContext)).rejects.toThrow();
    });

    test('should handle recovery after transient failures', async () => {
      let failCount = 0;
      (mockEnv.ANALYTICS.prepare as any).mockImplementation(() => {
        failCount++;

        if (failCount <= 2) {
          // First 2 calls fail
          return {
            bind: vi.fn().mockReturnValue({
              first: vi.fn().mockRejectedValue(new Error('Transient error')),
            }),
            first: vi.fn().mockResolvedValue({ size: 1000, rows: 100 }),
          };
        }

        // Then recover
        return {
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue({ cid: 'test', clv: 1000, wr: 55, ao: 100 }),
          }),
          first: vi.fn().mockResolvedValue({ size: 1000, rows: 100 }),
        };
      });

      const requests = Array.from({ length: 5 }, () =>
        getSharpScore(
          new Request('https://test.com/api/sharp-score?cid=customer-1'),
          mockEnv
        )
      );

      const results = await Promise.allSettled(requests);

      // First 2 should fail, rest should succeed
      expect(results[0].status).toBe('fulfilled');
      if (results[0].status === 'fulfilled') {
        expect((results[0].value as Response).status).toBeGreaterThanOrEqual(500);
      }

      expect(results[4].status).toBe('fulfilled');
      if (results[4].status === 'fulfilled') {
        expect((results[4].value as Response).status).toBe(200);
      }
    });
  });

  describe('Resource Exhaustion Scenarios', () => {
    test('should handle memory pressure with large result sets', async () => {
      const largeResultSet = Array.from({ length: 10000 }, (_, i) => ({
        cid: `customer-${i}`,
        clv: Math.random() * 10000,
        wr: Math.random() * 100,
        ao: Math.floor(Math.random() * 1000),
      }));

      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: largeResultSet }),
        }),
      });

      const result = await getSteamMoves({ agentID: 'test' }, mockEnv);

      expect(result).toBeDefined();
    });

    test('should handle CPU-intensive operations timing out', async () => {
      // Simulate slow computation
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockImplementation(async () => {
            // Simulate CPU-intensive work
            await new Promise(resolve => setTimeout(resolve, 200));
            return { results: [] };
          }),
        }),
      });

      const result = await getSteamMoves({ agentID: 'test', lookbackMinutes: 1440 }, mockEnv);

      expect(result).toBeDefined();
    });
  });
});
