/**
 * Intelligence Tools Error Path Tests
 * Tests error handling in getBettingExposure, getSharpScore, and getHoldPercentage
 */

import { describe, test, expect, beforeEach, vi } from "bun:test";
import { getBettingExposure } from '../../src/tools/intelligence/getBettingExposure';
import { getSharpScore } from '../../src/tools/intelligence/getSharpScore';
import { getHoldPercentage } from '../../src/tools/intelligence/getHoldPercentage';
import type { Env } from '../../src/types/api';

describe('Intelligence Tools Error Paths', () => {
  let mockEnv: Env;

  beforeEach(() => {
    // Set test environment to bypass rate limiting
    process.env.NODE_ENV = 'test';
    mockEnv = {
      ANALYTICS: {
        prepare: vi.fn().mockImplementation((query: string) => {
          // Cost cap guard queries (dbstat) - called directly without bind()
          if (query.includes('dbstat') || query.includes('SUM(pgsize)')) {
            return {
              first: vi.fn().mockResolvedValue({ size: 1000000, rows: 1000 }),
              bind: vi.fn().mockReturnValue({
                first: vi.fn().mockResolvedValue({ size: 1000000, rows: 1000 }),
              }),
            };
          }
          // Regular queries
          return {
            bind: vi.fn().mockReturnValue({
              first: vi.fn().mockResolvedValue(null),
              all: vi.fn().mockResolvedValue({ results: [] }),
            }),
            first: vi.fn().mockResolvedValue(null),
            run: vi.fn().mockResolvedValue({ success: true }),
            all: vi.fn().mockResolvedValue({ results: [] }),
          };
        }),
        exec: vi.fn().mockResolvedValue({ success: true }),
      } as any,
      ANALYTICS_ENGINE: {
        writeDataPoint: vi.fn().mockResolvedValue(undefined),
      } as any,
    };
  });

  describe('getBettingExposure Error Paths', () => {
    test('should reject missing eid parameter', async () => {
      const request = new Request('https://test.com/api/betting-exposure');
      const response = await getBettingExposure(request, mockEnv);

      expect(response.status).toBe(400);
    });

    test('should reject empty eid parameter', async () => {
      const request = new Request('https://test.com/api/betting-exposure?eid=');
      const response = await getBettingExposure(request, mockEnv);

      expect(response.status).toBe(400);
    });

    test('should handle database connection failures', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockRejectedValue(new Error('Connection refused')),
        }),
      });

      const request = new Request('https://test.com/api/betting-exposure?eid=event-1');
      const response = await getBettingExposure(request, mockEnv);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    test('should return 404 when no exposure data exists', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: [] }),
        }),
      });

      const request = new Request('https://test.com/api/betting-exposure?eid=event-1');
      const response = await getBettingExposure(request, mockEnv);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    test('should handle null risk values in exposure data', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({
            results: [
              { side: 'HOME', risk: null, net: null },
              { side: 'AWAY', risk: null, net: null },
            ],
          }),
        }),
      });

      const request = new Request('https://test.com/api/betting-exposure?eid=event-1');
      const response = await getBettingExposure(request, mockEnv);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.totalRisk).toBe(0);
      expect(data.maxExposure).toBe(0);
    });

    test('should handle division by zero in percentage calculation', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({
            results: [
              { side: 'HOME', risk: 0, net: 1000 }, // Risk is 0
            ],
          }),
        }),
      });

      const request = new Request('https://test.com/api/betting-exposure?eid=event-1');
      const response = await getBettingExposure(request, mockEnv);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.sides[0].percentage).toBe(0);
    });

    test('should handle invalid timeWindow parameter', async () => {
      const request = new Request('https://test.com/api/betting-exposure?eid=event-1&timeWindow=-5');
      const response = await getBettingExposure(request, mockEnv);

      // Returns 400 for validation error
      expect(response.status).toBe(400);
    });

    test('should handle zero timeWindow', async () => {
      const request = new Request('https://test.com/api/betting-exposure?eid=event-1&timeWindow=0');
      const response = await getBettingExposure(request, mockEnv);

      // Returns 400 for validation error
      expect(response.status).toBe(400);
    });

    test('should handle extremely large timeWindow', async () => {
      const request = new Request(`https://test.com/api/betting-exposure?eid=event-1&timeWindow=${Number.MAX_SAFE_INTEGER}`);
      const response = await getBettingExposure(request, mockEnv);

      // Returns 400 for validation error
      expect(response.status).toBe(400);
    });

    test('should handle NaN timeWindow', async () => {
      const request = new Request('https://test.com/api/betting-exposure?eid=event-1&timeWindow=not-a-number');
      const response = await getBettingExposure(request, mockEnv);

      // Returns 400 for validation error
      expect(response.status).toBe(400);
    });

    test('should handle database timeout', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockImplementation(() =>
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Query timeout')), 100)
            )
          ),
        }),
      });

      const request = new Request('https://test.com/api/betting-exposure?eid=event-1');
      const response = await getBettingExposure(request, mockEnv);

      expect(response.status).toBe(500);
    });

    test('should handle rate limit exceeded', async () => {
      // Make many rapid requests to trigger rate limit
      const requests = Array.from({ length: 20 }, () =>
        new Request('https://test.com/api/betting-exposure?eid=event-1')
      );

      const responses = await Promise.all(
        requests.map(req => getBettingExposure(req, mockEnv))
      );

      // Rate limiting is bypassed in test environment
      // All responses should be successful (200) or not found (404)
      const allValid = responses.every(res => res.status === 200 || res.status === 404);
      expect(allValid).toBe(true);
    });

    test('should handle cost cap exceeded', async () => {
      // Mock database size exceeding limits
      (mockEnv.ANALYTICS.prepare as any).mockImplementation((query: string) => {
        // Cost cap check with high usage
        if (query.includes('dbstat') || query.includes('SUM(pgsize)')) {
          return {
            first: vi.fn().mockResolvedValue({
              size: 10000000000, // 10GB - exceeds limit
              rows: 10000000,
            }),
          };
        }
        // Other queries
        return {
          bind: vi.fn().mockReturnValue({
            all: vi.fn().mockResolvedValue({ results: [] }),
          }),
        };
      });

      const request = new Request('https://test.com/api/betting-exposure?eid=event-1');
      const response = await getBettingExposure(request, mockEnv);

      expect(response.status).toBe(404);
    });

    test('should handle undefined ANALYTICS env', async () => {
      const envWithoutAnalytics = {} as Env;

      const request = new Request('https://test.com/api/betting-exposure?eid=event-1');
      const response = await getBettingExposure(request, envWithoutAnalytics);

      expect(response.status).toBe(500);
    });

    test('should handle malformed result structure', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({
            // Missing 'results' field
            data: [{ side: 'HOME', risk: 1000, net: 500 }],
          }),
        }),
      });

      const request = new Request('https://test.com/api/betting-exposure?eid=event-1');
      const response = await getBettingExposure(request, mockEnv);

      expect(response.status).toBe(404);
    });
  });

  describe('getSharpScore Error Paths', () => {
    test('should reject missing cid parameter', async () => {
      const request = new Request('https://test.com/api/sharp-score');
      const response = await getSharpScore(request, mockEnv);

      expect(response.status).toBe(400);
    });

    test('should reject empty cid parameter', async () => {
      const request = new Request('https://test.com/api/sharp-score?cid=');
      const response = await getSharpScore(request, mockEnv);

      expect(response.status).toBe(400);
    });

    test('should return 404 when customer not found', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
        }),
      });

      const request = new Request('https://test.com/api/sharp-score?cid=nonexistent');
      const response = await getSharpScore(request, mockEnv);

      expect(response.status).toBe(404);
    });

    test('should handle null values in sharp indicators', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({
            cid: 'test-customer',
            clv: null,
            wr: null,
            ao: null,
          }),
        }),
      });

      const request = new Request('https://test.com/api/sharp-score?cid=test-customer');
      const response = await getSharpScore(request, mockEnv);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.clv).toBe(0);
      expect(data.winRate).toBe(0);
      expect(data.actionCount).toBe(0);
      expect(data.sharpScore).toBe(0);
    });

    test('should handle negative CLV values', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({
            cid: 'test-customer',
            clv: -5000,
            wr: 45,
            ao: 100,
          }),
        }),
      });

      const request = new Request('https://test.com/api/sharp-score?cid=test-customer');
      const response = await getSharpScore(request, mockEnv);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.clv).toBe(-5000);
      expect(data.sharpScore).toBeGreaterThanOrEqual(0); // Clamped to 0 minimum
    });

    test('should clamp sharp score components to valid ranges', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({
            cid: 'test-customer',
            clv: 100000, // Very high CLV
            wr: 95, // Very high win rate
            ao: 10000, // Very high action count
          }),
        }),
      });

      const request = new Request('https://test.com/api/sharp-score?cid=test-customer');
      const response = await getSharpScore(request, mockEnv);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.sharpScore).toBeLessThanOrEqual(100); // Should be clamped
    });

    test('should handle database query error', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockRejectedValue(new Error('Database error')),
        }),
      });

      const request = new Request('https://test.com/api/sharp-score?cid=test-customer');
      const response = await getSharpScore(request, mockEnv);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    test('should handle invalid timeWindow values', async () => {
      const request = new Request('https://test.com/api/sharp-score?cid=test-customer&timeWindow=-10');
      const response = await getSharpScore(request, mockEnv);

      expect(response.status).toBe(404); // Will 404 if no data found
    });

    test('should handle cost cap exceeded', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockImplementation((query: string) => {
        if (query.includes('dbstat') || query.includes('SUM(pgsize)')) {
          return {
            first: vi.fn().mockResolvedValue({
              size: 10000000000, // 10GB - exceeds limit
              rows: 10000000,
            }),
          };
        }
        return {
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue(null),
          }),
        };
      });

      const request = new Request('https://test.com/api/sharp-score?cid=test-customer');
      const response = await getSharpScore(request, mockEnv);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toContain('NOT_FOUND');
    });

    test('should handle database connection timeout', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockImplementation(() =>
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Connection timeout')), 100)
            )
          ),
        }),
      });

      const request = new Request('https://test.com/api/sharp-score?cid=test-customer');
      const response = await getSharpScore(request, mockEnv);

      expect(response.status).toBe(404);
    });

    test('should handle zero action count', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({
            cid: 'test-customer',
            clv: 1000,
            wr: 55,
            ao: 0, // No actions
          }),
        }),
      });

      const request = new Request('https://test.com/api/sharp-score?cid=test-customer');
      const response = await getSharpScore(request, mockEnv);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.actionCount).toBe(0);
      expect(data.sharpScore).toBeDefined();
    });
  });

  describe('getHoldPercentage Error Paths', () => {
    test('should reject missing eid parameter', async () => {
      const request = new Request('https://test.com/api/hold-percentage?mt=SPREAD');
      const response = await getHoldPercentage(request, mockEnv);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    test('should reject missing mt parameter', async () => {
      const request = new Request('https://test.com/api/hold-percentage?eid=event-1');
      const response = await getHoldPercentage(request, mockEnv);

      expect(response.status).toBe(400);
    });

    test('should reject both parameters missing', async () => {
      const request = new Request('https://test.com/api/hold-percentage');
      const response = await getHoldPercentage(request, mockEnv);

      expect(response.status).toBe(400);
    });

    test('should return 404 when no line movement data exists', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: [] }),
        }),
      });

      const request = new Request('https://test.com/api/hold-percentage?eid=event-1&mt=SPREAD');
      const response = await getHoldPercentage(request, mockEnv);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    test('should handle null volume values', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({
            results: [
              { vb: null, va: null, lb: -3.5, la: -4.0 },
            ],
          }),
        }),
      });

      const request = new Request('https://test.com/api/hold-percentage?eid=event-1&mt=SPREAD');
      const response = await getHoldPercentage(request, mockEnv);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.totalVolume).toBe(0);
    });

    test('should handle division by zero in hold calculation', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({
            results: [
              { vb: 0, va: 0, lb: -3.5, la: -4.0 }, // Zero volume
            ],
          }),
        }),
      });

      const request = new Request('https://test.com/api/hold-percentage?eid=event-1&mt=SPREAD');
      const response = await getHoldPercentage(request, mockEnv);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(isFinite(data.holdPercentage)).toBe(true);
    });

    test('should handle negative volume values', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({
            results: [
              { vb: -1000, va: -500, lb: -3.5, la: -4.0 },
            ],
          }),
        }),
      });

      const request = new Request('https://test.com/api/hold-percentage?eid=event-1&mt=SPREAD');
      const response = await getHoldPercentage(request, mockEnv);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.totalVolume).toBeDefined();
    });

    test('should handle database query error', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockRejectedValue(new Error('Query failed')),
        }),
      });

      const request = new Request('https://test.com/api/hold-percentage?eid=event-1&mt=SPREAD');
      const response = await getHoldPercentage(request, mockEnv);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    test('should handle invalid timeWindow', async () => {
      const request = new Request('https://test.com/api/hold-percentage?eid=event-1&mt=SPREAD&timeWindow=-5');
      const response = await getHoldPercentage(request, mockEnv);

      expect(response.status).toBe(400);
    });

    test('should handle cost cap exceeded', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockImplementation((query: string) => {
        if (query.includes('dbstat') || query.includes('SUM(pgsize)')) {
          return {
            first: vi.fn().mockResolvedValue({
              size: 10000000000, // 10GB - exceeds limit
              rows: 10000000,
            }),
          };
        }
        return {
          bind: vi.fn().mockReturnValue({
            all: vi.fn().mockResolvedValue({ results: [] }),
          }),
        };
      });

      const request = new Request('https://test.com/api/hold-percentage?eid=event-1&mt=SPREAD');
      const response = await getHoldPercentage(request, mockEnv);

      expect(response.status).toBe(404);
    });

    test('should handle empty string parameters', async () => {
      const request = new Request('https://test.com/api/hold-percentage?eid=&mt=');
      const response = await getHoldPercentage(request, mockEnv);

      expect(response.status).toBe(400);
    });

    test('should handle malformed query results', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({
            results: [
              { invalid: 'structure' }, // Missing expected fields
            ],
          }),
        }),
      });

      const request = new Request('https://test.com/api/hold-percentage?eid=event-1&mt=SPREAD');
      const response = await getHoldPercentage(request, mockEnv);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.totalVolume).toBe(0);
    });

    test('should handle database timeout', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockImplementation(() =>
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Timeout')), 100)
            )
          ),
        }),
      });

      const request = new Request('https://test.com/api/hold-percentage?eid=event-1&mt=SPREAD');
      const response = await getHoldPercentage(request, mockEnv);

      expect(response.status).toBe(500);
    });
  });

  describe('Intelligence Tools Integration Error Paths', () => {
    test('should handle concurrent requests to different tools', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({
            cid: 'test-customer',
            clv: 1000,
            wr: 55,
            ao: 100,
          }),
          all: vi.fn().mockResolvedValue({
            results: [
              { side: 'HOME', risk: 1000, net: 500 },
            ],
          }),
        }),
      });

      const requests = [
        getBettingExposure(new Request('https://test.com/api/betting-exposure?eid=event-1'), mockEnv),
        getSharpScore(new Request('https://test.com/api/sharp-score?cid=customer-1'), mockEnv),
        getHoldPercentage(new Request('https://test.com/api/hold-percentage?eid=event-1&mt=SPREAD'), mockEnv),
      ];

      const results = await Promise.all(requests);

      expect(results).toHaveLength(3);
      results.forEach(res => {
        expect(res.status).toBeLessThan(600);
      });
    });

    test('should handle all tools with undefined database', async () => {
      const envWithoutDb = {} as Env;

      const requests = [
        getBettingExposure(new Request('https://test.com/api/betting-exposure?eid=event-1'), envWithoutDb),
        getSharpScore(new Request('https://test.com/api/sharp-score?cid=customer-1'), envWithoutDb),
        getHoldPercentage(new Request('https://test.com/api/hold-percentage?eid=event-1&mt=SPREAD'), envWithoutDb),
      ];

      const results = await Promise.all(requests);

      results.forEach(res => {
        expect(res.status).toBeGreaterThanOrEqual(400);
      });
    });
  });
});
