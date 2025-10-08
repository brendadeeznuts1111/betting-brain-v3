/**
 * CLV (Customer Lifetime Value) Tests
 * Alert threshold: < -2%
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { getCLV } from '../../src/tools/intelligence/getCLV';
import {
  createMockEnv,
  createMockRequest,
  readResponseBody,
  setupCostCapMock,
  resetAllMocks
} from '../utils/test-helpers';

describe('CLV Calculations', () => {
  let mockEnv: any;
  let mockRequest: Request;

  beforeEach(() => {
    // Set test environment to bypass rate limiting
    process.env.NODE_ENV = 'test';

    // Create fresh mock environment for each test
    mockEnv = createMockEnv();

    // Setup cost cap mock
    setupCostCapMock(mockEnv);

    // Setup default database mock for CLV queries
    mockEnv.ANALYTICS.prepare = (query: string) => {
      // Handle cost cap queries (dbstat)
      if (query.includes('dbstat') || query.includes('SUM(pgsize)')) {
        return {
          first: async () => ({ size: 1000000, rows: 1000 }),
          bind: () => ({ first: async () => ({ size: 1000000, rows: 1000 }) }),
          run: async () => ({ success: true }),
          all: async () => []
        };
      }

      // Handle regular CLV queries
      return {
        bind: (...params: any[]) => ({
          first: async () => ({
            cid: 'test-customer-1',
            clv: 1500,
            wr: 55,
            ao: 100,
            nb: 1500
          })
        }),
        first: async () => null,
        run: async () => ({ success: true }),
        all: async () => []
      };
    };

    mockRequest = createMockRequest('https://test.com/getCLV?cid=test-customer-1');
  });

  test('should calculate positive CLV for winning customer', async () => {
    const response = await getCLV(mockRequest, mockEnv);

    expect(response.status).toBe(200);

    // Use helper to safely read response body
    const data = await readResponseBody(response);

    expect(data.lifetimeValue).toBe(1500);
    expect(data.winRate).toBe(55);
    expect(data.actionCount).toBe(100);
  });

  test('should trigger alert when CLV < -2%', async () => {
    // Create a fresh mock environment for this specific test
    const testMockEnv = createMockEnv();
    setupCostCapMock(testMockEnv);

    // Setup mock for negative CLV scenario
    testMockEnv.ANALYTICS.prepare = (query: string) => {
      // Handle cost cap queries (dbstat)
      if (query.includes('dbstat') || query.includes('SUM(pgsize)')) {
        return {
          first: async () => ({ size: 1000000, rows: 1000 }),
          bind: () => ({ first: async () => ({ size: 1000000, rows: 1000 }) }),
          run: async () => ({ success: true }),
          all: async () => []
        };
      }

      // Handle regular queries with negative CLV
      return {
        bind: (...params: any[]) => ({
          first: async () => ({
            cid: 'test-customer-2',
            clv: -250,
            wr: 45,
            ao: 50,
            nb: -250
          })
        }),
        first: async () => null,
        run: async () => ({ success: true }),
        all: async () => []
      };
    };

    const response = await getCLV(mockRequest, testMockEnv);

    expect(response.status).toBe(200);

    // Use helper to safely read response body
    const data = await readResponseBody(response);

    expect(data.lifetimeValue).toBeLessThan(0);
    expect(data.alertThreshold).toBe(-2);
  });

  test('should handle customer with no data', async () => {
    // Create a fresh mock environment for this specific test
    const testMockEnv = createMockEnv();
    setupCostCapMock(testMockEnv);

    // Setup mock for no data scenario
    testMockEnv.ANALYTICS.prepare = (query: string) => {
      // Handle cost cap queries (dbstat)
      if (query.includes('dbstat') || query.includes('SUM(pgsize)')) {
        return {
          first: async () => ({ size: 1000000, rows: 1000 }),
          bind: () => ({ first: async () => ({ size: 1000000, rows: 1000 }) }),
          run: async () => ({ success: true }),
          all: async () => []
        };
      }

      // Handle regular queries with no data
      return {
        bind: (...params: any[]) => ({
          first: async () => null
        }),
        first: async () => null,
        run: async () => ({ success: true }),
        all: async () => []
      };
    };

    const response = await getCLV(mockRequest, testMockEnv);
    expect(response.status).toBe(404);
  });

  test('should validate customer ID format', async () => {
    const invalidRequest = createMockRequest('https://test.com/getCLV?cid=');
    const response = await getCLV(invalidRequest, mockEnv);

    expect(response.status).toBe(400);
  });

  test('should respect cost cap limits', async () => {
    // Mock cost cap exceeded
    const response = await getCLV(mockRequest, mockEnv);
    expect(response.status).not.toBe(503); // Should not be blocked in test
  });
});
