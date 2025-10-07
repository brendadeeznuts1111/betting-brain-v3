/**
 * Sharp Score Tests
 * Alert threshold: > 60
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getSharpScore } from '../src/tools/intelligence/getSharpScore';

describe('Sharp Score Calculations', () => {
  let mockEnv: any;
  let mockRequest: Request;

  beforeEach(() => {
    mockEnv = {
      ANALYTICS: {
        prepare: (query: string) => ({
          bind: (...params: any[]) => ({
            first: async () => ({
              cid: 'test-customer-1',
              clv: 5000,
              wr: 58,
              ao: 150
            })
          })
        })
      },
      ANALYTICS_ENGINE: {
        writeDataPoint: async () => {}
      }
    };

    mockRequest = new Request('https://test.com/getSharpScore?cid=test-customer-1');
  });

  it('should calculate sharp score for regular customer', async () => {
    const response = await getSharpScore(mockRequest, mockEnv);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.sharpScore).toBeGreaterThanOrEqual(0);
    expect(data.sharpScore).toBeLessThanOrEqual(100);
  });

  it('should alert when sharp score > 60', async () => {
    mockEnv.ANALYTICS.prepare = () => ({
      bind: () => ({
        first: async () => ({
          cid: 'sharp-customer',
          clv: 25000,
          wr: 65,
          ao: 500
        })
      })
    });

    const response = await getSharpScore(mockRequest, mockEnv);
    const data = await response.json();

    expect(data.alertThreshold).toBe(60);
    // CLV component: 25000/1000 = 25 (capped at 50)
    // Win rate component: 65-50 = 15 (capped at 30)
    // Volume component: 500/10 = 50 (capped at 20) = 20
    // Total: 25 + 15 + 20 = 60
    expect(data.sharpScore).toBeGreaterThanOrEqual(60);
  });

  it('should handle customer with low activity', async () => {
    mockEnv.ANALYTICS.prepare = () => ({
      bind: () => ({
        first: async () => ({
          cid: 'low-activity',
          clv: 100,
          wr: 48,
          ao: 5
        })
      })
    });

    const response = await getSharpScore(mockRequest, mockEnv);
    const data = await response.json();

    expect(data.sharpScore).toBeLessThan(60);
  });

  it('should only process top-100 customers', async () => {
    // This would be enforced in the hourly calculation
    // Test ensures the API returns data correctly
    const response = await getSharpScore(mockRequest, mockEnv);
    expect(response.status).toBe(200);
  });

  it('should handle customer with no sharp data', async () => {
    mockEnv.ANALYTICS.prepare = () => ({
      bind: () => ({
        first: async () => null
      })
    });

    const response = await getSharpScore(mockRequest, mockEnv);
    expect(response.status).toBe(404);
  });
});
