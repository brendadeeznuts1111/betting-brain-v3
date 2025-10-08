/**
 * BetTicker Sniffer Error Path Tests
 * Tests error handling in API interceptor, KV storage, and origin fetch
 */

import { describe, test, expect, beforeEach, vi } from "bun:test";
import {
  handleBetTickerInterception,
  getBetTickerHistory,
  getBetTickerResponse,
} from '../../src/interceptors/bet-ticker-sniffer';
import type { BetTickerSnifferEnv } from '../../src/types/api';

describe('BetTicker Sniffer Error Paths', () => {
  let mockEnv: BetTickerSnifferEnv;
  let mockContext: ExecutionContext;

  beforeEach(() => {
    // Set test environment to bypass rate limiting
    process.env.NODE_ENV = 'test';
    mockEnv = {
      BET_TICKER_RAW: {
        put: vi.fn().mockResolvedValue(undefined),
        get: vi.fn().mockResolvedValue(null),
        getWithMetadata: vi.fn().mockResolvedValue({ value: null, metadata: null }),
        list: vi.fn().mockResolvedValue({ keys: [] }),
        delete: vi.fn().mockResolvedValue(undefined),
      } as any,
    } as BetTickerSnifferEnv;

    mockContext = {
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
    } as any;

    // Mock global fetch
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  describe('handleBetTickerInterception Error Paths', () => {
    test('should pass through non-target endpoints', async () => {
      const request = new Request('https://test.com/other/endpoint', {
        method: 'POST',
      });

      const response = await handleBetTickerInterception(request, mockEnv, mockContext);

      expect(response).toBeDefined();
      expect(global.fetch).toHaveBeenCalled();
    });

    test('should pass through GET requests', async () => {
      const request = new Request('https://test.com/cloud/api/Manager/getBetTicker', {
        method: 'GET',
      });

      const response = await handleBetTickerInterception(request, mockEnv, mockContext);

      expect(response).toBeDefined();
    });

    test('should handle origin timeout', async () => {
      global.fetch = vi.fn().mockImplementation(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Origin timeout after 30s')), 31000)
        )
      );

      const request = new Request('https://test.com/cloud/api/Manager/getBetTicker', {
        method: 'POST',
        headers: { 'X-Original-Cookies': 'session=abc123' },
      });

      const response = await handleBetTickerInterception(request, mockEnv, mockContext);

      expect(response.status).toBe(502);
      const data = await response.json();
      expect(data.error).toContain('Worker interception failed');
    });

    test('should handle origin returning 4xx error', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        new Response('Unauthorized', { status: 401 })
      );

      const request = new Request('https://test.com/cloud/api/Manager/getBetTicker', {
        method: 'POST',
        headers: { 'X-Original-Cookies': 'session=abc123' },
      });

      const response = await handleBetTickerInterception(request, mockEnv, mockContext);

      expect(response.status).toBe(401);
    });

    test('should handle origin returning 5xx error', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        new Response('Internal Server Error', {
          status: 500,
          headers: { 'Content-Type': 'text/html' },
        })
      );

      const request = new Request('https://test.com/cloud/api/Manager/getBetTicker', {
        method: 'POST',
        headers: { 'X-Original-Cookies': 'session=abc123' },
      });

      const response = await handleBetTickerInterception(request, mockEnv, mockContext);

      expect(response.status).toBe(500);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });

    test('should handle non-JSON response from origin', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        new Response('<html>Error page</html>', {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        })
      );

      const request = new Request('https://test.com/cloud/api/Manager/getBetTicker', {
        method: 'POST',
        headers: { 'X-Original-Cookies': 'session=abc123' },
      });

      const response = await handleBetTickerInterception(request, mockEnv, mockContext);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('text/html');
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });

    test('should handle malformed JSON from origin', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        new Response('{invalid json', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const request = new Request('https://test.com/cloud/api/Manager/getBetTicker', {
        method: 'POST',
        headers: { 'X-Original-Cookies': 'session=abc123' },
      });

      const response = await handleBetTickerInterception(request, mockEnv, mockContext);

      expect(response).toBeDefined();
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });

    test('should handle missing cookies header', async () => {
      const request = new Request('https://test.com/cloud/api/Manager/getBetTicker', {
        method: 'POST',
        // No X-Original-Cookies header
      });

      const response = await handleBetTickerInterception(request, mockEnv, mockContext);

      expect(response).toBeDefined();
      expect(response.status).not.toBe(502);
    });

    test('should handle empty cookies header', async () => {
      const request = new Request('https://test.com/cloud/api/Manager/getBetTicker', {
        method: 'POST',
        headers: { 'X-Original-Cookies': '' },
      });

      const response = await handleBetTickerInterception(request, mockEnv, mockContext);

      expect(response).toBeDefined();
    });

    test('should handle malformed cookies', async () => {
      const request = new Request('https://test.com/cloud/api/Manager/getBetTicker', {
        method: 'POST',
        headers: { 'X-Original-Cookies': ';;;;;;;;invalid' },
      });

      const response = await handleBetTickerInterception(request, mockEnv, mockContext);

      expect(response).toBeDefined();
    });

    test('should handle extremely large cookies', async () => {
      const largeCookies = 'a'.repeat(10000);

      const request = new Request('https://test.com/cloud/api/Manager/getBetTicker', {
        method: 'POST',
        headers: { 'X-Original-Cookies': largeCookies },
      });

      const response = await handleBetTickerInterception(request, mockEnv, mockContext);

      expect(response).toBeDefined();
    });

    test('should handle KV storage failure', async () => {
      (mockEnv.BET_TICKER_RAW.put as any).mockRejectedValue(
        new Error('KV write failed')
      );

      const request = new Request('https://test.com/cloud/api/Manager/getBetTicker', {
        method: 'POST',
        headers: { 'X-Original-Cookies': 'session=abc123' },
      });

      const response = await handleBetTickerInterception(request, mockEnv, mockContext);

      // Should still return response even if storage fails
      expect(response.status).toBe(200);
      expect(mockContext.waitUntil).toHaveBeenCalled();
    });

    test('should handle missing BET_TICKER_RAW binding', async () => {
      const envWithoutKV = {} as BetTickerSnifferEnv;

      const request = new Request('https://test.com/cloud/api/Manager/getBetTicker', {
        method: 'POST',
        headers: { 'X-Original-Cookies': 'session=abc123' },
      });

      const response = await handleBetTickerInterception(request, envWithoutKV, mockContext);

      // Should still return response
      expect(response.status).toBe(200);
    });

    test('should handle metadata validation failure', async () => {
      // Mock response that will cause metadata validation to fail
      global.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );

      const request = new Request('https://test.com/cloud/api/Manager/getBetTicker', {
        method: 'POST',
        headers: {
          'X-Original-Cookies': 'session=abc123',
          // Missing user-agent and cf-connecting-ip
        },
      });

      const response = await handleBetTickerInterception(request, mockEnv, mockContext);

      expect(response.status).toBe(200);
    });

    test('should handle origin connection refused', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

      const request = new Request('https://test.com/cloud/api/Manager/getBetTicker', {
        method: 'POST',
        headers: { 'X-Original-Cookies': 'session=abc123' },
      });

      const response = await handleBetTickerInterception(request, mockEnv, mockContext);

      expect(response.status).toBe(502);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    test('should handle DNS resolution failure', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('DNS lookup failed'));

      const request = new Request('https://test.com/cloud/api/Manager/getBetTicker', {
        method: 'POST',
        headers: { 'X-Original-Cookies': 'session=abc123' },
      });

      const response = await handleBetTickerInterception(request, mockEnv, mockContext);

      expect(response.status).toBe(502);
    });

    test('should handle network timeout', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('network timeout'));

      const request = new Request('https://test.com/cloud/api/Manager/getBetTicker', {
        method: 'POST',
        headers: { 'X-Original-Cookies': 'session=abc123' },
      });

      const response = await handleBetTickerInterception(request, mockEnv, mockContext);

      expect(response.status).toBe(502);
    });

    test('should handle empty response body from origin', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        new Response('', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const request = new Request('https://test.com/cloud/api/Manager/getBetTicker', {
        method: 'POST',
        headers: { 'X-Original-Cookies': 'session=abc123' },
      });

      const response = await handleBetTickerInterception(request, mockEnv, mockContext);

      expect(response.status).toBe(200);
    });

    test('should handle null response body', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        new Response(null, {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const request = new Request('https://test.com/cloud/api/Manager/getBetTicker', {
        method: 'POST',
        headers: { 'X-Original-Cookies': 'session=abc123' },
      });

      const response = await handleBetTickerInterception(request, mockEnv, mockContext);

      expect(response).toBeDefined();
    });

    test('should set CORS headers on all responses', async () => {
      const request = new Request('https://test.com/cloud/api/Manager/getBetTicker', {
        method: 'POST',
        headers: { 'X-Original-Cookies': 'session=abc123' },
      });

      const response = await handleBetTickerInterception(request, mockEnv, mockContext);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('X-Worker-Request-Id')).toBeDefined();
      expect(response.headers.get('X-Worker-Duration')).toBeDefined();
    });

    test('should handle concurrent interceptions', async () => {
      const requests = Array.from({ length: 5 }, () =>
        new Request('https://test.com/cloud/api/Manager/getBetTicker', {
          method: 'POST',
          headers: { 'X-Original-Cookies': 'session=abc123' },
        })
      );

      const responses = await Promise.all(
        requests.map(req => handleBetTickerInterception(req, mockEnv, mockContext))
      );

      expect(responses).toHaveLength(5);
      responses.forEach(res => {
        expect(res.status).toBeLessThan(600);
      });
    });
  });

  describe('getBetTickerHistory Error Paths', () => {
    test('should handle empty KV store', async () => {
      (mockEnv.BET_TICKER_RAW.list as any).mockResolvedValue({ keys: [] });

      const result = await getBetTickerHistory(mockEnv, { limit: 100 });

      expect(result).toHaveLength(0);
    });

    test('should handle KV list error', async () => {
      (mockEnv.BET_TICKER_RAW.list as any).mockRejectedValue(
        new Error('KV list failed')
      );

      await expect(getBetTickerHistory(mockEnv, { limit: 100 })).rejects.toThrow(
        'KV list failed'
      );
    });

    test('should handle invalid metadata in KV keys', async () => {
      (mockEnv.BET_TICKER_RAW.list as any).mockResolvedValue({
        keys: [
          {
            name: 'raw:getBetTicker:123456',
            metadata: { invalid: 'metadata' }, // Missing required fields
          },
        ],
      });

      const result = await getBetTickerHistory(mockEnv, { limit: 100 });

      expect(result).toHaveLength(0);
    });

    test('should handle null metadata', async () => {
      (mockEnv.BET_TICKER_RAW.list as any).mockResolvedValue({
        keys: [
          {
            name: 'raw:getBetTicker:123456',
            metadata: null,
          },
        ],
      });

      const result = await getBetTickerHistory(mockEnv, { limit: 100 });

      expect(result).toHaveLength(0);
    });

    test('should filter by time range', async () => {
      const now = Date.now();
      (mockEnv.BET_TICKER_RAW.list as any).mockResolvedValue({
        keys: [
          {
            name: `raw:getBetTicker:${now - 10000}`,
            metadata: {
              userAgent: 'test',
              ip: '127.0.0.1',
              status: 200,
              timestamp: new Date(now - 10000).toISOString(),
            },
          },
          {
            name: `raw:getBetTicker:${now}`,
            metadata: {
              userAgent: 'test',
              ip: '127.0.0.1',
              status: 200,
              timestamp: new Date(now).toISOString(),
            },
          },
        ],
      });

      const result = await getBetTickerHistory(mockEnv, {
        startTime: now - 5000,
        endTime: now + 5000,
        limit: 100,
      });

      expect(result.length).toBeGreaterThan(0);
    });

    test('should respect limit parameter', async () => {
      (mockEnv.BET_TICKER_RAW.list as any).mockResolvedValue({
        keys: Array.from({ length: 200 }, (_, i) => ({
          name: `raw:getBetTicker:${i}`,
          metadata: {
            userAgent: 'test',
            ip: '127.0.0.1',
            status: 200,
            timestamp: new Date().toISOString(),
          },
        })),
      });

      const result = await getBetTickerHistory(mockEnv, { limit: 50 });

      expect(result.length).toBeLessThanOrEqual(50);
    });

    test('should handle zero limit', async () => {
      const result = await getBetTickerHistory(mockEnv, { limit: 0 });

      expect(result).toHaveLength(0);
    });

    test('should use default limit when not specified', async () => {
      (mockEnv.BET_TICKER_RAW.list as any).mockResolvedValue({ keys: [] });

      const result = await getBetTickerHistory(mockEnv);

      expect(result).toBeDefined();
    });
  });

  describe('getBetTickerResponse Error Paths', () => {
    test('should return null for non-existent key', async () => {
      (mockEnv.BET_TICKER_RAW.getWithMetadata as any).mockResolvedValue({
        value: null,
        metadata: null,
      });

      const result = await getBetTickerResponse(mockEnv, 'nonexistent-key');

      expect(result).toBeNull();
    });

    test('should return null when value is null', async () => {
      (mockEnv.BET_TICKER_RAW.getWithMetadata as any).mockResolvedValue({
        value: null,
        metadata: { userAgent: 'test' },
      });

      const result = await getBetTickerResponse(mockEnv, 'test-key');

      expect(result).toBeNull();
    });

    test('should return null when metadata is null', async () => {
      (mockEnv.BET_TICKER_RAW.getWithMetadata as any).mockResolvedValue({
        value: '{"success": true}',
        metadata: null,
      });

      const result = await getBetTickerResponse(mockEnv, 'test-key');

      expect(result).toBeNull();
    });

    test('should handle invalid metadata structure', async () => {
      (mockEnv.BET_TICKER_RAW.getWithMetadata as any).mockResolvedValue({
        value: '{"success": true}',
        metadata: { invalid: 'structure' },
      });

      const result = await getBetTickerResponse(mockEnv, 'test-key');

      expect(result).toBeNull();
    });

    test('should handle KV get error', async () => {
      (mockEnv.BET_TICKER_RAW.getWithMetadata as any).mockRejectedValue(
        new Error('KV get failed')
      );

      const result = await getBetTickerResponse(mockEnv, 'test-key');

      expect(result).toBeNull();
    });

    test('should successfully retrieve valid response', async () => {
      (mockEnv.BET_TICKER_RAW.getWithMetadata as any).mockResolvedValue({
        value: '{"success": true}',
        metadata: {
          userAgent: 'test-agent',
          ip: '127.0.0.1',
          status: 200,
          timestamp: new Date().toISOString(),
        },
      });

      const result = await getBetTickerResponse(mockEnv, 'test-key');

      expect(result).not.toBeNull();
      expect(result?.body).toBe('{"success": true}');
      expect(result?.metadata.userAgent).toBe('test-agent');
    });
  });

  describe('KV Storage Edge Cases', () => {
    test('should handle KV quota exceeded', async () => {
      (mockEnv.BET_TICKER_RAW.put as any).mockRejectedValue(
        new Error('Quota exceeded')
      );

      const request = new Request('https://test.com/cloud/api/Manager/getBetTicker', {
        method: 'POST',
        headers: { 'X-Original-Cookies': 'session=abc123' },
      });

      const response = await handleBetTickerInterception(request, mockEnv, mockContext);

      // Should still return successful response
      expect(response.status).toBe(200);
    });

    test('should handle KV write timeout', async () => {
      (mockEnv.BET_TICKER_RAW.put as any).mockImplementation(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Write timeout')), 100)
        )
      );

      const request = new Request('https://test.com/cloud/api/Manager/getBetTicker', {
        method: 'POST',
        headers: { 'X-Original-Cookies': 'session=abc123' },
      });

      const response = await handleBetTickerInterception(request, mockEnv, mockContext);

      expect(response.status).toBe(200);
    });

    test('should handle extremely large response body', async () => {
      const largeBody = 'x'.repeat(1000000); // 1MB
      global.fetch = vi.fn().mockResolvedValue(
        new Response(largeBody, {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const request = new Request('https://test.com/cloud/api/Manager/getBetTicker', {
        method: 'POST',
        headers: { 'X-Original-Cookies': 'session=abc123' },
      });

      const response = await handleBetTickerInterception(request, mockEnv, mockContext);

      expect(response).toBeDefined();
    });
  });
});
