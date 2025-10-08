/**
 * BetTicker Sniffer Tests
 * Tests transparent interception, KV storage, and retrieval
 */

import { describe, test, expect, beforeEach, vi } from "bun:test";
import {
  handleBetTickerInterception,
  getBetTickerHistory,
  getBetTickerResponse,
} from '../../src/interceptors/bet-ticker-sniffer';
import type { BetTickerSnifferEnv } from '../../src/types/api';

describe('BetTicker Sniffer', () => {
  let mockEnv: BetTickerSnifferEnv;
  let mockContext: ExecutionContext;
  let kvStore: Map<string, { value: string; metadata: any; ttl: number }>;
  let waitUntilPromises: Promise<any>[];

  beforeEach(() => {
    // Set test environment to bypass rate limiting
    process.env.NODE_ENV = 'test';
    // Mock KV storage
    kvStore = new Map();
    waitUntilPromises = [];

    mockEnv = {
      ANALYTICS: {} as any,
      LINE_INGRESS: {} as any,
      STEAM_WEBHOOK: {} as any,
      ANALYTICS_ENGINE: {} as any,
      BET_TICKER_RAW: {
        get: vi.fn(async (key: string) => {
          return kvStore.get(key)?.value || null;
        }),
        getWithMetadata: vi.fn(async (key: string) => {
          const entry = kvStore.get(key);
          return entry
            ? { value: entry.value, metadata: entry.metadata }
            : { value: null, metadata: null };
        }),
        put: vi.fn(async (key: string, value: string, options?: any) => {
          kvStore.set(key, {
            value,
            metadata: options?.metadata || {},
            ttl: options?.expirationTtl || 0,
          });
        }),
        list: vi.fn(async (options?: any) => {
          const prefix = options?.prefix || '';
          const limit = options?.limit || 1000;
          const keys = Array.from(kvStore.keys())
            .filter((k) => k.startsWith(prefix))
            .slice(0, limit)
            .map((name) => ({
              name,
              metadata: kvStore.get(name)?.metadata || {},
            }));
          return { keys };
        }),
        delete: vi.fn(async (key: string) => {
          kvStore.delete(key);
        }),
      } as any,
    };

    mockContext = {
      waitUntil: vi.fn((promise: Promise<any>) => {
        // Store the promise so tests can await it
        waitUntilPromises.push(promise);
        return promise;
      }),
      passThroughOnException: vi.fn(),
    } as any;
  });

  describe('handleBetTickerInterception', () => {
    test('should intercept POST request to getBetTicker endpoint', async () => {
      const mockResponse = {
        success: true,
        data: { ticker: 'BTC', price: 50000 },
      };

      // Mock fetch to origin
      global.fetch = vi.fn(async () =>
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      ) as any;

      const request = new Request(
        'https://fantasy402.com/cloud/api/Manager/getBetTicker',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'user-agent': 'test-agent',
            'cf-connecting-ip': '127.0.0.1',
          },
          body: JSON.stringify({ test: 'data' }),
        }
      );

      const response = await handleBetTickerInterception(
        request,
        mockEnv,
        mockContext
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual(mockResponse);

      // Verify fetch was called
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('fantasy402.com'),
        expect.any(Object)
      );

      // Wait for all waitUntil promises to complete
      await Promise.all(waitUntilPromises);

      // Verify data was stored in KV
      const kvKeys = Array.from(kvStore.keys());
      expect(kvKeys.length).toBeGreaterThan(0);
      expect(kvKeys[0]).toMatch(/^raw:getBetTicker:\d+$/);
    });

    test('should pass through non-getBetTicker requests', async () => {
      global.fetch = vi.fn(async () =>
        new Response('OK', { status: 200 })
      ) as any;

      const request = new Request('https://fantasy402.com/other/endpoint', {
        method: 'GET',
      });

      const response = await handleBetTickerInterception(
        request,
        mockEnv,
        mockContext
      );

      expect(response.status).toBe(200);
      expect(await response.text()).toBe('OK');

      // Verify no KV storage for pass-through
      expect(kvStore.size).toBe(0);
    });

    test('should pass through non-POST requests', async () => {
      global.fetch = vi.fn(async () =>
        new Response('OK', { status: 200 })
      ) as any;

      const request = new Request(
        'https://fantasy402.com/cloud/api/Manager/getBetTicker',
        { method: 'GET' }
      );

      const response = await handleBetTickerInterception(
        request,
        mockEnv,
        mockContext
      );

      expect(response.status).toBe(200);
      expect(kvStore.size).toBe(0);
    });

    test('should store metadata with response', async () => {
      const mockResponse = { success: true };
      global.fetch = vi.fn(async () =>
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      ) as any;

      const request = new Request(
        'https://fantasy402.com/cloud/api/Manager/getBetTicker',
        {
          method: 'POST',
          headers: {
            'user-agent': 'Mozilla/5.0',
            'cf-connecting-ip': '192.168.1.1',
          },
        }
      );

      await handleBetTickerInterception(request, mockEnv, mockContext);

      // Wait for all waitUntil promises to complete
      await Promise.all(waitUntilPromises);

      const keys = Array.from(kvStore.keys());
      expect(keys.length).toBe(1);

      const entry = kvStore.get(keys[0]);
      expect(entry?.metadata).toMatchObject({
        userAgent: 'Mozilla/5.0',
        ip: '192.168.1.1',
        status: 200,
      });
      expect(entry?.metadata.timestamp).toBeDefined();
      expect(entry?.ttl).toBe(604800); // 7 days in seconds
    });

    test('should handle origin errors gracefully', async () => {
      global.fetch = vi.fn(async () => {
        throw new Error('Network error');
      }) as any;

      const request = new Request(
        'https://fantasy402.com/cloud/api/Manager/getBetTicker',
        { method: 'POST' }
      );

      const response = await handleBetTickerInterception(
        request,
        mockEnv,
        mockContext
      );

      expect(response.status).toBe(502); // Bad Gateway for proxy errors
      const data = await response.json();
      expect(data.error).toBe('Worker interception failed');
      expect(data.message).toContain('Network error');
    });
  });

  describe('getBetTickerHistory', () => {
    beforeEach(async () => {
      // Seed KV with test data
      const now = Date.now();
      for (let i = 0; i < 5; i++) {
        const key = `raw:getBetTicker:${now - i * 1000}`;
        await mockEnv.BET_TICKER_RAW.put(
          key,
          JSON.stringify({ test: `data-${i}` }),
          {
            metadata: {
              userAgent: 'test-agent',
              ip: '127.0.0.1',
              status: 200,
              timestamp: new Date(now - i * 1000).toISOString(),
              contentType: 'application/json',
              contentLength: 20,
            },
          }
        );
      }
    });

    test('should retrieve history with default limit', async () => {
      const history = await getBetTickerHistory(mockEnv);

      expect(history.length).toBe(5);
      expect(history[0].key).toMatch(/^raw:getBetTicker:\d+$/);
      expect(history[0].metadata).toMatchObject({
        userAgent: 'test-agent',
        ip: '127.0.0.1',
        status: 200,
      });
    });

    test('should respect limit parameter', async () => {
      const history = await getBetTickerHistory(mockEnv, { limit: 2 });

      expect(history.length).toBe(2);
    });

    test('should filter by time range', async () => {
      const now = Date.now();
      const startTime = now - 2500;
      const endTime = now - 500;

      const history = await getBetTickerHistory(mockEnv, {
        startTime,
        endTime,
      });

      // Should exclude first and last entries
      expect(history.length).toBeLessThan(5);
      history.forEach((entry) => {
        const keyTime = parseInt(entry.key.split(':')[2]);
        expect(keyTime).toBeGreaterThanOrEqual(startTime);
        expect(keyTime).toBeLessThanOrEqual(endTime);
      });
    });

    test('should return empty array when no matches', async () => {
      const history = await getBetTickerHistory(mockEnv, {
        startTime: Date.now() + 10000,
        endTime: Date.now() + 20000,
      });

      expect(history).toEqual([]);
    });
  });

  describe('getBetTickerResponse', () => {
    test('should retrieve specific response by key', async () => {
      const key = `raw:getBetTicker:${Date.now()}`;
      const testData = { success: true, value: 123 };

      await mockEnv.BET_TICKER_RAW.put(key, JSON.stringify(testData), {
        metadata: {
          userAgent: 'test',
          ip: '127.0.0.1',
          status: 200,
          timestamp: new Date().toISOString(),
          contentType: 'application/json',
          contentLength: 100,
        },
      });

      const response = await getBetTickerResponse(mockEnv, key);

      expect(response).not.toBeNull();
      expect(response?.body).toBe(JSON.stringify(testData));
      expect(response?.metadata).toMatchObject({
        userAgent: 'test',
        ip: '127.0.0.1',
        status: 200,
      });
    });

    test('should return null for non-existent key', async () => {
      const response = await getBetTickerResponse(
        mockEnv,
        'raw:getBetTicker:999999999'
      );

      expect(response).toBeNull();
    });

    test('should handle invalid metadata gracefully', async () => {
      const key = `raw:getBetTicker:${Date.now()}`;
      kvStore.set(key, {
        value: '{"test": "data"}',
        metadata: { invalid: 'metadata' }, // Missing required fields
        ttl: 100,
      });

      const response = await getBetTickerResponse(mockEnv, key);

      expect(response).toBeNull(); // Should return null on validation error
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty response body', async () => {
      global.fetch = vi.fn(async () =>
        new Response('', { status: 204 })
      ) as any;

      const request = new Request(
        'https://fantasy402.com/cloud/api/Manager/getBetTicker',
        { method: 'POST' }
      );

      const response = await handleBetTickerInterception(
        request,
        mockEnv,
        mockContext
      );

      expect(response.status).toBe(204);
    });

    test('should handle missing headers gracefully', async () => {
      global.fetch = vi.fn(async () =>
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      ) as any;

      const request = new Request(
        'https://fantasy402.com/cloud/api/Manager/getBetTicker',
        { method: 'POST' }
      );

      const response = await handleBetTickerInterception(
        request,
        mockEnv,
        mockContext
      );

      expect(response.status).toBe(200);

      // Wait for all waitUntil promises to complete
      await Promise.all(waitUntilPromises);

      const keys = Array.from(kvStore.keys());
      const entry = kvStore.get(keys[0]);
      expect(entry?.metadata.userAgent).toBe('unknown');
      expect(entry?.metadata.ip).toBe('unknown');
    });

    test('should handle large response bodies', async () => {
      const largeData = { data: 'x'.repeat(10000) };
      global.fetch = vi.fn(async () =>
        new Response(JSON.stringify(largeData), { status: 200 })
      ) as any;

      const request = new Request(
        'https://fantasy402.com/cloud/api/Manager/getBetTicker',
        { method: 'POST' }
      );

      const response = await handleBetTickerInterception(
        request,
        mockEnv,
        mockContext
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data).toBe('x'.repeat(10000));
    });
  });
});

