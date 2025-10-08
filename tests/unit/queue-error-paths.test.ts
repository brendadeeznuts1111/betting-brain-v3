/**
 * Queue Consumer Error Path Tests
 * Tests error handling in lineIngress and steamWebhook queue consumers
 */

import { describe, test, expect, beforeEach, vi } from "bun:test";
import { handleLineIngress } from '../../src/queues/lineIngress';
import { handleSteamWebhook } from '../../src/queues/steamWebhook';
import type { Env } from '../../src/types/api';

describe('Queue Consumer Error Paths', () => {
  let mockEnv: Env;
  let mockContext: ExecutionContext;

  beforeEach(() => {
    // Set test environment to bypass rate limiting
    process.env.NODE_ENV = 'test';
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

  describe('handleLineIngress Error Paths', () => {
    test('should handle malformed JSON gracefully', async () => {
      const message = {
        body: '{invalid json',
        id: 'msg-1',
        timestamp: Date.now(),
      } as Message;

      // Should not throw - non-retryable errors are acknowledged
      await expect(handleLineIngress(message, mockEnv, mockContext)).resolves.toBeUndefined();
    });

    test('should handle empty JSON string', async () => {
      const message = {
        body: '',
        id: 'msg-2',
        timestamp: Date.now(),
      } as Message;

      await expect(handleLineIngress(message, mockEnv, mockContext)).resolves.toBeUndefined();
    });

    test('should handle null JSON value', async () => {
      const message = {
        body: 'null',
        id: 'msg-3',
        timestamp: Date.now(),
      } as Message;

      await expect(handleLineIngress(message, mockEnv, mockContext)).resolves.toBeUndefined();
    });

    test('should handle undefined body', async () => {
      const message = {
        body: undefined as any,
        id: 'msg-4',
        timestamp: Date.now(),
      } as Message;

      await expect(handleLineIngress(message, mockEnv, mockContext)).resolves.toBeUndefined();
    });

    test('should reject missing required fields (Zod validation)', async () => {
      const message = {
        body: JSON.stringify({
          eid: '', // Empty string should fail min(1)
          mt: 'SPREAD',
        }),
        id: 'msg-5',
        timestamp: Date.now(),
      } as Message;

      // Zod errors are non-retryable
      await expect(handleLineIngress(message, mockEnv, mockContext)).resolves.toBeUndefined();
    });

    test('should reject invalid field types', async () => {
      const message = {
        body: JSON.stringify({
          eid: 123, // Should be string
          mt: 'SPREAD',
          lb: 'invalid', // Should be number
          la: -3.5,
          ts: new Date().toISOString(),
        }),
        id: 'msg-6',
        timestamp: Date.now(),
      } as Message;

      await expect(handleLineIngress(message, mockEnv, mockContext)).resolves.toBeUndefined();
    });

    test('should handle invalid datetime format', async () => {
      const message = {
        body: JSON.stringify({
          eid: 'event-1',
          mt: 'SPREAD',
          lb: -3.5,
          la: -4.0,
          ts: 'not-a-datetime',
        }),
        id: 'msg-7',
        timestamp: Date.now(),
      } as Message;

      await expect(handleLineIngress(message, mockEnv, mockContext)).resolves.toBeUndefined();
    });

    test('should handle database UNIQUE constraint violations', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockRejectedValue(new Error('UNIQUE constraint failed')),
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
        id: 'msg-8',
        timestamp: Date.now(),
      } as Message;

      // Non-retryable error - should not throw
      await expect(handleLineIngress(message, mockEnv, mockContext)).resolves.toBeUndefined();
    });

    test('should retry on network timeout errors', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockRejectedValue(new Error('network timeout')),
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
        id: 'msg-9',
        timestamp: Date.now(),
      } as Message;

      // Retryable error - should throw to trigger retry
      await expect(handleLineIngress(message, mockEnv, mockContext)).rejects.toThrow('network timeout');
    });

    test('should retry on connection errors', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockRejectedValue(new Error('connection failed')),
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
        id: 'msg-10',
        timestamp: Date.now(),
      } as Message;

      await expect(handleLineIngress(message, mockEnv, mockContext)).rejects.toThrow('connection failed');
    });

    test('should handle cost cap blocking', async () => {
      // Mock cost cap exceeded by setting up large database size
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({
            size: 10000000000, // 10GB - exceeds default limit
            rows: 10000000
          }),
          run: vi.fn().mockResolvedValue({ success: true }),
        }),
        first: vi.fn().mockResolvedValue({ size: 10000000000, rows: 10000000 }),
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
        id: 'msg-11',
        timestamp: Date.now(),
      } as Message;

      // Should acknowledge message without processing
      await expect(handleLineIngress(message, mockEnv, mockContext)).resolves.toBeUndefined();
    });

    test('should handle division by zero in volume change calculation', async () => {
      const message = {
        body: JSON.stringify({
          eid: 'event-1',
          mt: 'SPREAD',
          lb: -3.5,
          la: -4.0,
          vb: 0, // Zero volume before
          va: 1500,
          ts: new Date().toISOString(),
        }),
        id: 'msg-12',
        timestamp: Date.now(),
      } as Message;

      await expect(handleLineIngress(message, mockEnv, mockContext)).resolves.toBeUndefined();
    });

    test('should handle null volume values', async () => {
      const message = {
        body: JSON.stringify({
          eid: 'event-1',
          mt: 'SPREAD',
          lb: -3.5,
          la: -4.0,
          vb: null,
          va: null,
          ts: new Date().toISOString(),
        }),
        id: 'msg-13',
        timestamp: Date.now(),
      } as Message;

      await expect(handleLineIngress(message, mockEnv, mockContext)).resolves.toBeUndefined();
    });

    test('should handle negative volume changes', async () => {
      const message = {
        body: JSON.stringify({
          eid: 'event-1',
          mt: 'SPREAD',
          lb: -3.5,
          la: -4.0,
          vb: 2000,
          va: 500, // Volume decreased
          ts: new Date().toISOString(),
        }),
        id: 'msg-14',
        timestamp: Date.now(),
      } as Message;

      await expect(handleLineIngress(message, mockEnv, mockContext)).resolves.toBeUndefined();
    });

    test('should handle STEAM_WEBHOOK send failures', async () => {
      (mockEnv.STEAM_WEBHOOK.send as any).mockRejectedValue(new Error('Queue send failed'));

      const message = {
        body: JSON.stringify({
          eid: 'event-1',
          mt: 'SPREAD',
          lb: -3.5,
          la: -6.0, // Large line movement (triggers steam detection)
          vb: 1000,
          va: 2000,
          ts: new Date().toISOString(),
        }),
        id: 'msg-15',
        timestamp: Date.now(),
      } as Message;

      await expect(handleLineIngress(message, mockEnv, mockContext)).rejects.toThrow();
    });

    test('should handle ANALYTICS_ENGINE write failures', async () => {
      (mockEnv.ANALYTICS_ENGINE.writeDataPoint as any).mockRejectedValue(
        new Error('Analytics write failed')
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
        id: 'msg-16',
        timestamp: Date.now(),
      } as Message;

      await expect(handleLineIngress(message, mockEnv, mockContext)).rejects.toThrow();
    });
  });

  describe('handleSteamWebhook Error Paths', () => {
    test('should handle malformed JSON', async () => {
      const message = {
        body: 'not valid json{',
        id: 'steam-1',
        timestamp: Date.now(),
      } as Message;

      await expect(handleSteamWebhook(message, mockEnv, mockContext)).resolves.toBeUndefined();
    });

    test('should reject missing required fields', async () => {
      const message = {
        body: JSON.stringify({
          eid: 'event-1',
          // Missing mt field
          lb: -3.5,
          la: -4.0,
        }),
        id: 'steam-2',
        timestamp: Date.now(),
      } as Message;

      await expect(handleSteamWebhook(message, mockEnv, mockContext)).resolves.toBeUndefined();
    });

    test('should handle cost cap exceeded', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ size: 10000000000, rows: 10000000 }),
          run: vi.fn().mockResolvedValue({ success: true }),
        }),
        first: vi.fn().mockResolvedValue({ size: 10000000000, rows: 10000000 }),
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
        id: 'steam-3',
        timestamp: Date.now(),
      } as Message;

      await expect(handleSteamWebhook(message, mockEnv, mockContext)).resolves.toBeUndefined();
    });

    test('should handle duplicate steam moves', async () => {
      // Mock existing deduplication record
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ exists: 1 }), // Duplicate found
          run: vi.fn().mockResolvedValue({ success: true }),
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
        id: 'steam-4',
        timestamp: Date.now(),
      } as Message;

      await expect(handleSteamWebhook(message, mockEnv, mockContext)).resolves.toBeUndefined();
    });

    test('should handle deduplication insert race condition', async () => {
      let callCount = 0;
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 1) return Promise.resolve(null); // First check: not duplicate
            return Promise.resolve({ exists: 1 }); // Second check: duplicate
          }),
          run: vi.fn().mockRejectedValue(new Error('UNIQUE constraint failed')),
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
        id: 'steam-5',
        timestamp: Date.now(),
      } as Message;

      // Should handle constraint error gracefully (non-retryable)
      await expect(handleSteamWebhook(message, mockEnv, mockContext)).resolves.toBeUndefined();
    });

    test('should handle sigma calculation with insufficient data', async () => {
      // Mock less than 2 recent movements
      (mockEnv.ANALYTICS.prepare as any).mockImplementation((query: string) => {
        if (query.includes('steam_dedupe')) {
          return {
            bind: vi.fn().mockReturnValue({
              first: vi.fn().mockResolvedValue(null),
              run: vi.fn().mockResolvedValue({ success: true }),
            }),
          };
        }
        // Sigma calculation query
        return {
          bind: vi.fn().mockReturnValue({
            all: vi.fn().mockResolvedValue({ results: [] }), // No data
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
        id: 'steam-6',
        timestamp: Date.now(),
      } as Message;

      await expect(handleSteamWebhook(message, mockEnv, mockContext)).resolves.toBeUndefined();
    });

    test('should handle sigma calculation with null values', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockImplementation((query: string) => {
        if (query.includes('steam_dedupe')) {
          return {
            bind: vi.fn().mockReturnValue({
              first: vi.fn().mockResolvedValue(null),
              run: vi.fn().mockResolvedValue({ success: true }),
            }),
          };
        }
        return {
          bind: vi.fn().mockReturnValue({
            all: vi.fn().mockResolvedValue({
              results: [
                { lb: null, la: null, ts: new Date().toISOString() },
                { lb: -3.5, la: null, ts: new Date().toISOString() },
                { lb: null, la: -4.0, ts: new Date().toISOString() },
              ],
            }),
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
        id: 'steam-7',
        timestamp: Date.now(),
      } as Message;

      await expect(handleSteamWebhook(message, mockEnv, mockContext)).resolves.toBeUndefined();
    });

    test('should handle division by zero in variance calculation', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockImplementation((query: string) => {
        if (query.includes('steam_dedupe')) {
          return {
            bind: vi.fn().mockReturnValue({
              first: vi.fn().mockResolvedValue(null),
              run: vi.fn().mockResolvedValue({ success: true }),
            }),
          };
        }
        return {
          bind: vi.fn().mockReturnValue({
            all: vi.fn().mockResolvedValue({
              results: [
                { lb: -3.5, la: -3.5, ts: new Date().toISOString() }, // No change
                { lb: -3.5, la: -3.5, ts: new Date().toISOString() }, // No change
              ],
            }),
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
        id: 'steam-8',
        timestamp: Date.now(),
      } as Message;

      await expect(handleSteamWebhook(message, mockEnv, mockContext)).resolves.toBeUndefined();
    });

    test('should handle NaN in sigma calculations', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockImplementation((query: string) => {
        if (query.includes('steam_dedupe')) {
          return {
            bind: vi.fn().mockReturnValue({
              first: vi.fn().mockResolvedValue(null),
              run: vi.fn().mockResolvedValue({ success: true }),
            }),
          };
        }
        return {
          bind: vi.fn().mockReturnValue({
            all: vi.fn().mockResolvedValue({
              results: [
                { lb: Infinity, la: -Infinity, ts: new Date().toISOString() },
              ],
            }),
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
        id: 'steam-9',
        timestamp: Date.now(),
      } as Message;

      await expect(handleSteamWebhook(message, mockEnv, mockContext)).resolves.toBeUndefined();
    });

    test('should handle analytics engine write failure', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockImplementation((query: string) => {
        if (query.includes('steam_dedupe')) {
          return {
            bind: vi.fn().mockReturnValue({
              first: vi.fn().mockResolvedValue(null),
              run: vi.fn().mockResolvedValue({ success: true }),
            }),
          };
        }
        return {
          bind: vi.fn().mockReturnValue({
            all: vi.fn().mockResolvedValue({
              results: [
                { lb: -3.5, la: -5.5, ts: new Date().toISOString() },
                { lb: -3.0, la: -4.0, ts: new Date().toISOString() },
                { lb: -4.0, la: -3.5, ts: new Date().toISOString() },
              ],
            }),
          }),
        };
      });

      (mockEnv.ANALYTICS_ENGINE.writeDataPoint as any).mockRejectedValue(
        new Error('Analytics write failed')
      );

      const message = {
        body: JSON.stringify({
          eid: 'event-1',
          mt: 'SPREAD',
          lb: -3.5,
          la: -10.0, // Large move - should trigger steam alert
          vb: 1000,
          va: 1500,
          ts: new Date().toISOString(),
        }),
        id: 'steam-10',
        timestamp: Date.now(),
      } as Message;

      await expect(handleSteamWebhook(message, mockEnv, mockContext)).rejects.toThrow();
    });

    test('should handle sigma query timeout', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockImplementation((query: string) => {
        if (query.includes('steam_dedupe')) {
          return {
            bind: vi.fn().mockReturnValue({
              first: vi.fn().mockResolvedValue(null),
              run: vi.fn().mockResolvedValue({ success: true }),
            }),
          };
        }
        return {
          bind: vi.fn().mockReturnValue({
            all: vi.fn().mockRejectedValue(new Error('Query timeout')),
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
        id: 'steam-11',
        timestamp: Date.now(),
      } as Message;

      // Timeout is retryable
      await expect(handleSteamWebhook(message, mockEnv, mockContext)).rejects.toThrow('Query timeout');
    });

    test('should handle concurrent steam move processing', async () => {
      const messages = Array.from({ length: 5 }, (_, i) => ({
        body: JSON.stringify({
          eid: `event-${i}`,
          mt: 'SPREAD',
          lb: -3.5,
          la: -4.0,
          vb: 1000,
          va: 1500,
          ts: new Date().toISOString(),
        }),
        id: `steam-concurrent-${i}`,
        timestamp: Date.now(),
      })) as Message[];

      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue({ results: [] }),
        }),
      });

      const results = await Promise.allSettled(
        messages.map(msg => handleSteamWebhook(msg, mockEnv, mockContext))
      );

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.status).toBe('fulfilled');
      });
    });
  });

  describe('Batch Processing Error Paths', () => {
    test('should handle partial batch failures in lineIngress', async () => {
      let callCount = 0;
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 2) {
              return Promise.reject(new Error('Database error'));
            }
            return Promise.resolve({ success: true });
          }),
          first: vi.fn().mockResolvedValue(null),
        }),
        first: vi.fn().mockResolvedValue({ size: 1000, rows: 100 }),
      });

      const messages = Array.from({ length: 3 }, (_, i) => ({
        body: JSON.stringify({
          eid: `event-${i}`,
          mt: 'SPREAD',
          lb: -3.5,
          la: -4.0,
          vb: 1000,
          va: 1500,
          ts: new Date().toISOString(),
        }),
        id: `batch-${i}`,
        timestamp: Date.now(),
      })) as Message[];

      const results = await Promise.allSettled(
        messages.map(msg => handleLineIngress(msg, mockEnv, mockContext))
      );

      // Second message should fail, others succeed
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('fulfilled');
    });
  });
});
