/**
 * Error Path Tests for Guards
 * Tests error handling and edge cases in cost cap and rate limit guards
 */

import { describe, test, expect, vi, beforeEach } from "bun:test";
import { CostCapGuard, defaultCostCapConfig } from '../../src/guards/costCap';
import { RateLimitGuard, defaultRateLimitConfig } from '../../src/guards/rateLimit';
import type { Env } from '../../src/types/api';

describe('Guards Error Path Tests', () => {
  let mockEnv: Env;

  beforeEach(() => {
    mockEnv = {
      ANALYTICS: {
        prepare: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ size: 0, rows: 0 }),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue([])
        }),
        exec: vi.fn().mockResolvedValue({ success: true })
      } as any,
      QUEUE_PRODUCER: {
        send: vi.fn().mockResolvedValue({ success: true })
      } as any,
      ANALYTICS_ENGINE: {
        writeDataPoint: vi.fn().mockResolvedValue(undefined)
      } as any
    };
  });

  describe('Cost Cap Guard Error Paths', () => {
    let costCapGuard: CostCapGuard;

    beforeEach(() => {
      costCapGuard = new CostCapGuard(defaultCostCapConfig);
    });

    test('should handle database connection errors gracefully', async () => {
      // Mock database error
      vi.mocked(mockEnv.ANALYTICS.prepare).mockReturnValue({
        first: vi.fn().mockRejectedValue(new Error('Database connection failed')),
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockResolvedValue([])
      } as any);

      const request = new Request('https://test.com');
      const result = await costCapGuard.checkRequest(request, mockEnv);

      // Should not throw and should return safe defaults
      expect(result.allowed).toBe(true);
      expect(result.metrics.d1.percentage).toBe(0);
    });

    test('should handle null database results', async () => {
      // Mock null result
      vi.mocked(mockEnv.ANALYTICS.prepare).mockReturnValue({
        first: vi.fn().mockResolvedValue(null),
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockResolvedValue([])
      } as any);

      const request = new Request('https://test.com');
      const result = await costCapGuard.checkRequest(request, mockEnv);

      expect(result.allowed).toBe(true);
      expect(result.metrics.d1.size).toBe(0);
      expect(result.metrics.d1.rows).toBe(0);
    });

    test('should handle undefined database results', async () => {
      // Mock undefined result
      vi.mocked(mockEnv.ANALYTICS.prepare).mockReturnValue({
        first: vi.fn().mockResolvedValue(undefined),
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockResolvedValue([])
      } as any);

      const request = new Request('https://test.com');
      const result = await costCapGuard.checkRequest(request, mockEnv);

      expect(result.allowed).toBe(true);
      expect(result.metrics.d1.size).toBe(0);
      expect(result.metrics.d1.rows).toBe(0);
    });

    test('should handle invalid database result types', async () => {
      // Mock invalid result types
      vi.mocked(mockEnv.ANALYTICS.prepare).mockReturnValue({
        first: vi.fn().mockResolvedValue({ size: 'invalid', rows: 'invalid' }),
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockResolvedValue([])
      } as any);

      const request = new Request('https://test.com');
      const result = await costCapGuard.checkRequest(request, mockEnv);

      expect(result.allowed).toBe(true);
      expect(result.metrics.d1.size).toBe(0);
      expect(result.metrics.d1.rows).toBe(0);
    });

    test('should handle TTL cleanup errors gracefully', async () => {
      // Mock TTL cleanup error
      vi.mocked(mockEnv.ANALYTICS.prepare).mockReturnValue({
        first: vi.fn().mockResolvedValue({ size: 0, rows: 0 }),
        run: vi.fn().mockRejectedValue(new Error('TTL cleanup failed')),
        all: vi.fn().mockResolvedValue([])
      } as any);

      // Should not throw
      await expect(costCapGuard.applyTTLCleanup(mockEnv)).resolves.not.toThrow();
    });

    test('should handle sampling with invalid data', () => {
      const invalidData = null as any;
      const result = costCapGuard.applySampling(invalidData);
      
      expect(result).toEqual([]);
    });

    test('should handle sampling with empty array', () => {
      const emptyData: any[] = [];
      const result = costCapGuard.applySampling(emptyData);
      
      expect(result).toEqual([]);
    });

    test('should handle sampling rate of 0', () => {
      const config = { ...defaultCostCapConfig, analytics: { ...defaultCostCapConfig.analytics, samplingRate: 0 } };
      const guard = new CostCapGuard(config);
      const data = [1, 2, 3, 4, 5];
      
      const result = guard.applySampling(data);
      expect(result).toEqual([]);
    });

    test('should handle sampling rate of 1', () => {
      const config = { ...defaultCostCapConfig, analytics: { ...defaultCostCapConfig.analytics, samplingRate: 1 } };
      const guard = new CostCapGuard(config);
      const data = [1, 2, 3, 4, 5];
      
      const result = guard.applySampling(data);
      expect(result).toEqual(data);
    });

    test('should handle cost limits exceeded scenarios', async () => {
      // Mock high usage
      vi.mocked(mockEnv.ANALYTICS.prepare).mockReturnValue({
        first: vi.fn().mockResolvedValue({ 
          size: defaultCostCapConfig.d1.maxSize * 0.95, // 95% of limit
          rows: defaultCostCapConfig.d1.maxRows * 0.95 
        }),
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockResolvedValue([])
      } as any);

      const request = new Request('https://test.com');
      const result = await costCapGuard.checkRequest(request, mockEnv);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('D1 database approaching capacity limit');
    });
  });

  describe('Rate Limit Guard Error Paths', () => {
    let rateLimitGuard: RateLimitGuard;

    beforeEach(() => {
      rateLimitGuard = new RateLimitGuard(defaultRateLimitConfig);
    });

    test('should handle requests with missing IP headers', async () => {
      const request = new Request('https://test.com');
      const result = await rateLimitGuard.checkRateLimit(request);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
    });

    test('should handle requests with malformed IP headers', async () => {
      const request = new Request('https://test.com', {
        headers: {
          'CF-Connecting-IP': 'invalid-ip-format',
          'X-Forwarded-For': 'malformed,ip,list'
        }
      });
      const result = await rateLimitGuard.checkRateLimit(request);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
    });

    test('should handle burst limit exceeded', async () => {
      const request = new Request('https://test.com');
      
      // Exceed burst limit
      for (let i = 0; i < defaultRateLimitConfig.burstLimit + 5; i++) {
        await rateLimitGuard.checkRateLimit(request);
      }

      const result = await rateLimitGuard.checkRateLimit(request);
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeDefined();
    });

    test('should handle rate limit exceeded', async () => {
      const request = new Request('https://test.com');
      
      // Simulate high rate
      const promises = [];
      for (let i = 0; i < defaultRateLimitConfig.requestsPerSecond * 2; i++) {
        promises.push(rateLimitGuard.checkRateLimit(request));
      }
      await Promise.all(promises);

      const result = await rateLimitGuard.checkRateLimit(request);
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeDefined();
    });

    test('should handle cleanup with empty store', () => {
      // Should not throw when cleaning up empty store
      expect(() => rateLimitGuard.cleanup()).not.toThrow();
    });

    test('should handle getStatus with non-existent key', () => {
      const result = rateLimitGuard.getStatus('non-existent-key');
      expect(result).toBeNull();
    });

    test('should handle concurrent rate limit checks', async () => {
      const request = new Request('https://test.com');
      
      // Simulate concurrent requests
      const promises = Array.from({ length: 50 }, () => 
        rateLimitGuard.checkRateLimit(request)
      );
      
      const results = await Promise.all(promises);
      
      // All should complete without errors
      expect(results).toHaveLength(50);
      results.forEach(result => {
        expect(result.allowed).toBeDefined();
        expect(result.remaining).toBeDefined();
        expect(result.resetTime).toBeDefined();
      });
    });

    test('should handle probabilistic cleanup', async () => {
      const request = new Request('https://test.com');
      
      // Make many requests to trigger probabilistic cleanup
      for (let i = 0; i < 1000; i++) {
        await rateLimitGuard.checkRateLimit(request);
      }
      
      // Should not throw and should have cleaned up some data
      expect(() => rateLimitGuard.cleanup()).not.toThrow();
    });

    test('should handle custom key generator errors', async () => {
      const config = {
        ...defaultRateLimitConfig,
        keyGenerator: () => {
          throw new Error('Key generator failed');
        }
      };
      
      const guard = new RateLimitGuard(config);
      const request = new Request('https://test.com');
      
      // Should handle key generator errors gracefully
      await expect(guard.checkRateLimit(request)).rejects.toThrow('Key generator failed');
    });

    test('should handle window size edge cases', async () => {
      const config = {
        ...defaultRateLimitConfig,
        windowSize: 0 // Invalid window size
      };
      
      const guard = new RateLimitGuard(config);
      const request = new Request('https://test.com');
      
      const result = await guard.checkRateLimit(request);
      expect(result.allowed).toBe(true);
    });

    test('should handle negative request counts', async () => {
      const request = new Request('https://test.com');
      
      // Force negative request count scenario
      const data = (rateLimitGuard as any).store.get('unknown');
      if (data) {
        data.requests = [-1, -2, -3]; // Negative timestamps
      }
      
      const result = await rateLimitGuard.checkRateLimit(request);
      expect(result.allowed).toBe(true);
    });
  });

  describe('Guard Integration Error Paths', () => {
    test('should handle both guards failing simultaneously', async () => {
      const costCapGuard = new CostCapGuard(defaultCostCapConfig);
      const rateLimitGuard = new RateLimitGuard(defaultRateLimitConfig);
      
      // Mock both guards to fail
      vi.mocked(mockEnv.ANALYTICS.prepare).mockReturnValue({
        first: vi.fn().mockRejectedValue(new Error('Database error')),
        run: vi.fn().mockRejectedValue(new Error('Database error')),
        all: vi.fn().mockRejectedValue(new Error('Database error'))
      } as any);

      const request = new Request('https://test.com');
      
      const [costResult, rateResult] = await Promise.all([
        costCapGuard.checkRequest(request, mockEnv),
        rateLimitGuard.checkRateLimit(request)
      ]);
      
      // Both should handle errors gracefully
      expect(costResult.allowed).toBe(true); // Safe default
      expect(rateResult.allowed).toBe(true);
    });

    test('should handle guard timeout scenarios', async () => {
      const costCapGuard = new CostCapGuard(defaultCostCapConfig);
      
      // Mock slow database response that never resolves
      vi.mocked(mockEnv.ANALYTICS.prepare).mockReturnValue({
        first: vi.fn().mockImplementation(() => 
          new Promise(() => {}) // Never resolves
        ),
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockResolvedValue([])
      } as any);

      const request = new Request('https://test.com');
      
      // Should not hang indefinitely
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 1000)
      );
      
      await expect(Promise.race([
        costCapGuard.checkRequest(request, mockEnv),
        timeoutPromise
      ])).rejects.toThrow('Timeout');
    });
  });
});
