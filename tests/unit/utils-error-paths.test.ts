/**
 * Error Path Tests for Utilities
 * Tests error handling and edge cases in validation and database utilities
 */

import { describe, test, expect, vi, beforeEach } from "bun:test";
import { 
  validateRequest,
  EventIdSchema,
  CustomerIdSchema,
  MarketTypeSchema,
  GetBettingExposureRequestSchema,
  GetSharpScoreRequestSchema,
  GetHoldPercentageRequestSchema,
  GetCLVRequestSchema,
  BettingExposureResponseSchema,
  SharpScoreResponseSchema,
  HoldPercentageResponseSchema,
  CLVResponseSchema,
  ErrorResponseSchema
} from '../../src/utils/validation';
import { 
  createErrorResponse, 
  createSuccessResponse
} from '../../src/utils/error-handler';
import { DatabaseHelper, createDatabaseHelper } from '../../src/utils/database';
import type { Env } from '../../src/types/api';

describe('Utilities Error Path Tests', () => {
  let mockEnv: Env;

  beforeEach(() => {
    mockEnv = {
      ANALYTICS: {
        prepare: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ count: 0 }),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue({ results: [] }),
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue({ count: 0 }),
            run: vi.fn().mockResolvedValue({ success: true }),
            all: vi.fn().mockResolvedValue({ results: [] })
          })
        }),
        exec: vi.fn().mockResolvedValue({ success: true }),
        batch: vi.fn().mockResolvedValue([{ success: true, meta: { changes: 1 } }])
      } as any,
      QUEUE_PRODUCER: {
        send: vi.fn().mockResolvedValue({ success: true })
      } as any,
      ANALYTICS_ENGINE: {
        writeDataPoint: vi.fn().mockResolvedValue(undefined)
      } as any
    };
  });

  describe('Validation Utility Error Paths', () => {
    test('should handle invalid event ID formats', () => {
      const invalidIds = ['', 'invalid@id', 'id with spaces', 'id/with/slashes', 'id\\with\\backslashes'];
      
      invalidIds.forEach(invalidId => {
        const result = validateRequest(EventIdSchema, invalidId);
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/required|invalid characters/);
      });
    });

    test('should handle invalid customer ID formats', () => {
      const invalidIds = ['', 'invalid@id', 'id with spaces', 'id/with/slashes'];
      
      invalidIds.forEach(invalidId => {
        const result = validateRequest(CustomerIdSchema, invalidId);
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/required|invalid characters/);
      });
    });

    test('should handle invalid market types', () => {
      const invalidMarkets = ['INVALID', 'SPREADS', 'MONEY', 'TOTALS', ''];
      
      invalidMarkets.forEach(invalidMarket => {
        const result = validateRequest(MarketTypeSchema, invalidMarket);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid enum value');
      });
    });

    test('should handle malformed request data', () => {
      const malformedRequests = [
        { eid: '' }, // Missing required fields
        { eid: 'valid', includeHistory: 'not-boolean' }, // Wrong type
        { eid: 'valid', timeWindow: -1 }, // Invalid range
        { eid: 'valid', timeWindow: 25 }, // Exceeds max
        null,
        undefined,
        'not-an-object'
      ];
      
      malformedRequests.forEach(request => {
        const result = validateRequest(GetBettingExposureRequestSchema, request);
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    test('should handle malformed response data', () => {
      const malformedResponses = [
        { eid: '', sides: [] }, // Invalid event ID
        { eid: 'valid', sides: 'not-array' }, // Wrong type
        { eid: 'valid', sides: [{ side: 'INVALID' }] }, // Invalid side
        { eid: 'valid', sides: [{ side: 'HOME', risk: 'not-number' }] }, // Wrong type
        { eid: 'valid', totalRisk: -1 }, // Negative risk
        null,
        undefined
      ];
      
      malformedResponses.forEach(response => {
        const result = validateRequest(BettingExposureResponseSchema, response);
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    test('should handle createErrorResponse with missing parameters', async () => {
      const error1 = createErrorResponse('Test error');
      const error2 = createErrorResponse('Test error', 'TEST_CODE');
      const error3 = createErrorResponse('Test error', 'TEST_CODE', { detail: 'test' });
      
      const body1 = await error1.text();
      expect(JSON.parse(body1)).toEqual({
        code: 'INTERNAL_ERROR',
        error: 'INTERNAL_ERROR',
        message: 'An internal error occurred',
        timestamp: expect.any(String)
      });
      
      const body2 = await error2.text();
      expect(JSON.parse(body2)).toEqual({
        code: 'INTERNAL_ERROR',
        error: 'INTERNAL_ERROR',
        message: 'An internal error occurred',
        requestId: 'TEST_CODE',
        timestamp: expect.any(String)
      });
      
      const body3 = await error3.text();
      expect(JSON.parse(body3)).toEqual({
        code: 'INTERNAL_ERROR',
        error: 'INTERNAL_ERROR',
        message: 'An internal error occurred',
        path: { detail: 'test' },
        requestId: 'TEST_CODE',
        timestamp: expect.any(String)
      });
    });

    test('should handle createSuccessResponse with invalid data', () => {
      const invalidData = { eid: '', sides: [] };
      
      expect(() => createSuccessResponse(invalidData, BettingExposureResponseSchema))
        .toThrow();
    });

    test('should handle validation with circular references', () => {
      const circularData: any = { eid: 'valid' };
      circularData.self = circularData;
      
      const result = validateRequest(GetBettingExposureRequestSchema, circularData);
      expect(result.success).toBe(false);
    });

    test('should handle validation with very large objects', () => {
      const largeData = {
        eid: 'x'.repeat(1000000), // 1MB string in valid field
        includeHistory: true,
        timeWindow: 1
      };
      
      const result = validateRequest(GetBettingExposureRequestSchema, largeData);
      expect(result.success).toBe(false);
    });

    test('should handle validation with special characters', () => {
      const specialChars = ['\x00', '\x01', '\x02', '\x03', '\x04', '\x05'];
      
      specialChars.forEach(char => {
        const result = validateRequest(EventIdSchema, `valid${char}id`);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Database Helper Error Paths', () => {
    let dbHelper: DatabaseHelper;

    beforeEach(() => {
      dbHelper = createDatabaseHelper(mockEnv);
    });

    test('should handle database connection errors', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        first: vi.fn().mockRejectedValue(new Error('Connection failed')),
        run: vi.fn().mockRejectedValue(new Error('Connection failed')),
        all: vi.fn().mockRejectedValue(new Error('Connection failed')),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockRejectedValue(new Error('Connection failed')),
          run: vi.fn().mockRejectedValue(new Error('Connection failed')),
          all: vi.fn().mockRejectedValue(new Error('Connection failed'))
        })
      } as any);

      await expect(dbHelper.executeQuery('SELECT 1')).rejects.toThrow('Connection failed');
      await expect(dbHelper.executeQueryFirst('SELECT 1')).resolves.toBeNull();
      await expect(dbHelper.executeWrite('INSERT INTO test VALUES (1)')).resolves.toEqual({
        success: false,
        rowsAffected: 0
      });
    });

    test('should handle SQL syntax errors', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        first: vi.fn().mockRejectedValue(new Error('SQL syntax error')),
        run: vi.fn().mockRejectedValue(new Error('SQL syntax error')),
        all: vi.fn().mockRejectedValue(new Error('SQL syntax error')),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockRejectedValue(new Error('SQL syntax error')),
          run: vi.fn().mockRejectedValue(new Error('SQL syntax error')),
          all: vi.fn().mockRejectedValue(new Error('SQL syntax error'))
        })
      } as any);

      await expect(dbHelper.executeQuery('INVALID SQL')).rejects.toThrow('SQL syntax error');
    });

    test('should handle timeout scenarios', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        first: vi.fn().mockImplementation(() => 
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 100)
          )
        ),
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockImplementation(() => 
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 100)
          )
        ),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockImplementation(() => 
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 100)
            )
          ),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockImplementation(() => 
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 100)
            )
          )
        })
      } as any);

      // Should timeout and retry
      await expect(dbHelper.executeQuery('SELECT 1', [], { timeout: 1000 })).rejects.toThrow('Timeout');
    });

    test('should handle batch operation errors', async () => {
      (mockEnv.ANALYTICS.batch as any).mockRejectedValue(new Error('Batch failed'));

      const operations = [
        { query: 'INSERT INTO test VALUES (1)', params: [] },
        { query: 'INSERT INTO test VALUES (2)', params: [] }
      ];

      const result = await dbHelper.executeBatch(operations);
      expect(result.success).toBe(false);
      expect(result.rowsAffected).toBe(0);
    });

    test('should handle table existence check errors', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        first: vi.fn().mockRejectedValue(new Error('Table check failed')),
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockResolvedValue({ results: [] }),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockRejectedValue(new Error('Table check failed')),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue({ results: [] })
        })
      } as any);

      const exists = await dbHelper.tableExists('test_table');
      expect(exists).toBe(false);
    });

    test('should handle row count errors', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        first: vi.fn().mockRejectedValue(new Error('Count failed')),
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockResolvedValue({ results: [] }),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockRejectedValue(new Error('Count failed')),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue({ results: [] })
        })
      } as any);

      const count = await dbHelper.getRowCount('test_table');
      expect(count).toBe(0);
    });

    test('should handle database size errors', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        first: vi.fn().mockRejectedValue(new Error('Size check failed')),
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockResolvedValue({ results: [] }),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockRejectedValue(new Error('Size check failed')),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue({ results: [] })
        })
      } as any);

      const size = await dbHelper.getDatabaseSize();
      expect(size).toEqual({ size: 0, pages: 0 });
    });

    test('should handle vacuum errors', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        first: vi.fn().mockResolvedValue({ count: 0 }),
        run: vi.fn().mockRejectedValue(new Error('Vacuum failed')),
        all: vi.fn().mockResolvedValue({ results: [] }),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ count: 0 }),
          run: vi.fn().mockRejectedValue(new Error('Vacuum failed')),
          all: vi.fn().mockResolvedValue({ results: [] })
        })
      } as any);

      await expect(dbHelper.vacuum()).rejects.toThrow('Vacuum failed');
    });

    test('should handle analyze errors', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        first: vi.fn().mockResolvedValue({ count: 0 }),
        run: vi.fn().mockRejectedValue(new Error('Analyze failed')),
        all: vi.fn().mockResolvedValue({ results: [] }),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ count: 0 }),
          run: vi.fn().mockRejectedValue(new Error('Analyze failed')),
          all: vi.fn().mockResolvedValue({ results: [] })
        })
      } as any);

      await expect(dbHelper.analyze()).rejects.toThrow('Analyze failed');
    });

    test('should handle retry logic with exponential backoff', async () => {
      let attemptCount = 0;
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        first: vi.fn().mockImplementation(() => {
          attemptCount++;
          if (attemptCount < 3) {
            return Promise.reject(new Error('Temporary failure'));
          }
          return Promise.resolve({ count: 1 });
        }),
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockResolvedValue({ results: [] }),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockImplementation(() => {
            attemptCount++;
            if (attemptCount < 3) {
              return Promise.reject(new Error('Temporary failure'));
            }
            return Promise.resolve({ count: 1 });
          }),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue({ results: [] })
        })
      } as any);

      const result = await dbHelper.executeQueryFirst('SELECT COUNT(*) as count FROM test');
      expect(result).toEqual({ count: 1 });
      expect(attemptCount).toBe(3);
    });

    test('should handle maximum retry attempts exceeded', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        first: vi.fn().mockRejectedValue(new Error('Persistent failure')),
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockRejectedValue(new Error('Persistent failure')),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockRejectedValue(new Error('Persistent failure')),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockRejectedValue(new Error('Persistent failure'))
        })
      } as any);

      await expect(dbHelper.executeQuery('SELECT 1', [], { retry: 2 })).rejects.toThrow('Persistent failure');
    });

    test('should handle null and undefined parameters', async () => {
      const result1 = await dbHelper.executeQuery('SELECT 1', null as any);
      const result2 = await dbHelper.executeQuery('SELECT 1', undefined as any);
      
      // D1 mock returns { results: [] }
      expect(result1).toEqual({ results: [] });
      expect(result2).toEqual({ results: [] });
    });

    test('should handle empty operations array in batch', async () => {
      const result = await dbHelper.executeBatch([]);
      expect(result.success).toBe(true);
      expect(result.rowsAffected).toBe(0);
    });

    test('should handle invalid table names', async () => {
      const invalidNames = ['', 'table with spaces', 'table; DROP TABLE users;', 'table"with"quotes'];
      
      for (const name of invalidNames) {
        const exists = await dbHelper.tableExists(name);
        expect(exists).toBe(false);
      }
    });
  });

  describe('Utility Integration Error Paths', () => {
    test('should handle validation and database errors together', async () => {
      const dbHelper = createDatabaseHelper(mockEnv);
      
      // Mock database error
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        first: vi.fn().mockRejectedValue(new Error('Database error')),
        run: vi.fn().mockRejectedValue(new Error('Database error')),
        all: vi.fn().mockRejectedValue(new Error('Database error')),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockRejectedValue(new Error('Database error')),
          run: vi.fn().mockRejectedValue(new Error('Database error')),
          all: vi.fn().mockRejectedValue(new Error('Database error'))
        })
      } as any);

      // Test validation first
      const validationResult = validateRequest(EventIdSchema, '');
      expect(validationResult.success).toBe(false);

      // Test database error
      await expect(dbHelper.executeQuery('SELECT 1')).rejects.toThrow('Database error');
    });

    test('should handle memory pressure scenarios', async () => {
      const dbHelper = createDatabaseHelper(mockEnv);
      
      // Simulate memory pressure with large result sets
      const largeResult = Array.from({ length: 100000 }, (_, i) => ({ id: i, data: 'x'.repeat(1000) }));
      
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        first: vi.fn().mockResolvedValue({ count: 100000 }),
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockResolvedValue(largeResult),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ count: 100000 }),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue(largeResult)
        })
      } as any);

      const result = await dbHelper.executeQuery('SELECT * FROM large_table');
      expect(result).toHaveLength(100000);
    });
  });
});
