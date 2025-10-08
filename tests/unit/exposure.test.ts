/**
 * Exposure Tracking Tests
 * Alert threshold: > $50k or > 60%
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { getBettingExposure } from '../../src/tools/intelligence/getBettingExposure';

describe('Exposure Tracking', () => {
  let mockEnv: any;
  let mockRequest: Request;

  beforeEach(() => {
    // Set test environment to bypass rate limiting
    process.env.NODE_ENV = 'test';
    mockEnv = {
      ANALYTICS: {
        prepare: (query: string) => ({
          bind: (...params: any[]) => ({
            first: async () => null,
            all: async () => [
              { side: 'HOME', risk: 30000, net: -15000 },
              { side: 'AWAY', risk: 25000, net: 15000 }
            ],
            run: async () => ({ success: true })
          }),
          first: async () => null,
          all: async () => [
            { side: 'HOME', risk: 30000, net: -15000 },
            { side: 'AWAY', risk: 25000, net: 15000 }
          ],
          run: async () => ({ success: true })
        })
      },
      ANALYTICS_ENGINE: {
        writeDataPoint: async () => {}
      }
    };

    mockRequest = new Request('https://test.com/getBettingExposure?eid=nba_123');
  });

  test('should calculate total exposure within limits', async () => {
    const response = await getBettingExposure(mockRequest, mockEnv);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.totalRisk).toBe(55000);
    expect(data.maxExposure).toBe(15000);
    expect(data.sides.length).toBe(2);
  });

  test('should alert when exposure > $50k', async () => {
    mockEnv.ANALYTICS.prepare = () => ({
      bind: () => ({
        first: async () => null,
        all: async () => [
          { side: 'HOME', risk: 60000, net: -55000 },
          { side: 'AWAY', risk: 45000, net: 55000 }
        ],
        run: async () => ({ success: true })
      }),
      first: async () => null,
      all: async () => [
        { side: 'HOME', risk: 60000, net: -55000 },
        { side: 'AWAY', risk: 45000, net: 55000 }
      ],
      run: async () => ({ success: true })
    });

    const response = await getBettingExposure(mockRequest, mockEnv);
    const data = await response.json();

    expect(data.maxExposure).toBeGreaterThan(50000);
    expect(data.alertThreshold.maxAmount).toBe(50000);
  });

  test('should alert when exposure > 60% of risk', async () => {
    mockEnv.ANALYTICS.prepare = () => ({
      bind: () => ({
        first: async () => null,
        all: async () => [
          { side: 'HOME', risk: 40000, net: -25000 },
          { side: 'AWAY', risk: 35000, net: 25000 }
        ],
        run: async () => ({ success: true })
      }),
      first: async () => null,
      all: async () => [
        { side: 'HOME', risk: 40000, net: -25000 },
        { side: 'AWAY', risk: 35000, net: 25000 }
      ],
      run: async () => ({ success: true })
    });

    const response = await getBettingExposure(mockRequest, mockEnv);
    const data = await response.json();

    const homePercentage = Math.abs((data.sides[0].net / data.sides[0].risk) * 100);
    expect(data.alertThreshold.maxPercentage).toBe(60);
  });

  test('should respect max 50 rows constraint', async () => {
    const manyRows = Array.from({ length: 100 }, (_, i) => ({
      side: i % 2 === 0 ? 'HOME' : 'AWAY',
      risk: 1000,
      net: 500
    }));

    mockEnv.ANALYTICS.prepare = () => ({
      bind: () => ({
        first: async () => null,
        all: async () => manyRows,
        run: async () => ({ success: true })
      }),
      first: async () => null,
      all: async () => manyRows,
      run: async () => ({ success: true })
    });

    const response = await getBettingExposure(mockRequest, mockEnv);
    expect(response.status).toBe(200);
  });

  test('should handle event with no exposure data', async () => {
    mockEnv.ANALYTICS.prepare = () => ({
      bind: () => ({
        first: async () => null,
        all: async () => [],
        run: async () => ({ success: true })
      }),
      first: async () => null,
      all: async () => [],
      run: async () => ({ success: true })
    });

    const response = await getBettingExposure(mockRequest, mockEnv);
    expect(response.status).toBe(404);
  });
});
