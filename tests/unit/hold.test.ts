/**
 * Hold Percentage Tests
 * Alert threshold: < 4% or > 8%
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { getHoldPercentage } from '../../src/tools/intelligence/getHoldPercentage';

describe('Hold Percentage Calculations', () => {
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
            all: async () => [{
              vb: 5000,
              va: 5500,
              lb: -110,
              la: -115
            }],
            run: async () => ({ success: true })
          }),
          first: async () => null,
          all: async () => [{
            vb: 5000,
            va: 5500,
            lb: -110,
            la: -115
          }],
          run: async () => ({ success: true })
        })
      },
      ANALYTICS_ENGINE: {
        writeDataPoint: async () => {}
      }
    };

    mockRequest = new Request('https://test.com/getHoldPercentage?eid=nba_123&mt=SPREAD');
  });

  test('should calculate hold percentage within normal range', async () => {
    const response = await getHoldPercentage(mockRequest, mockEnv);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.holdPercentage).toBeGreaterThanOrEqual(4);
    expect(data.holdPercentage).toBeLessThanOrEqual(8);
  });

  test('should alert when hold percentage < 4%', async () => {
    mockEnv.ANALYTICS.prepare = () => ({
      bind: () => ({
        first: async () => null,
        all: async () => [{
          vb: 10000,
          va: 10200,
          lb: -105,
          la: -105
        }],
        run: async () => ({ success: true })
      }),
      first: async () => null,
      all: async () => [{
        vb: 10000,
        va: 10200,
        lb: -105,
        la: -105
      }],
      run: async () => ({ success: true })
    });

    const response = await getHoldPercentage(mockRequest, mockEnv);
    const data = await response.json();

    expect(data.alertThreshold.min).toBe(4);
  });

  test('should alert when hold percentage > 8%', async () => {
    mockEnv.ANALYTICS.prepare = () => ({
      bind: () => ({
        first: async () => null,
        all: async () => [{
          vb: 8000,
          va: 9000,
          lb: -120,
          la: -125
        }],
        run: async () => ({ success: true })
      }),
      first: async () => null,
      all: async () => [{
        vb: 8000,
        va: 9000,
        lb: -120,
        la: -125
      }],
      run: async () => ({ success: true })
    });

    const response = await getHoldPercentage(mockRequest, mockEnv);
    const data = await response.json();

    expect(data.alertThreshold.max).toBe(8);
  });

  test('should handle missing event data', async () => {
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

    const response = await getHoldPercentage(mockRequest, mockEnv);
    expect(response.status).toBe(404);
  });

  test('should validate market type', async () => {
    const invalidRequest = new Request('https://test.com/getHoldPercentage?eid=nba_123&mt=INVALID');
    const response = await getHoldPercentage(invalidRequest, mockEnv);

    expect(response.status).toBe(400);
  });
});
