/**
 * Error Path Tests for Utilities
 * Tests error handling and edge cases in validation and database utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  validateRequest, 
  createErrorResponse, 
  createSuccessResponse,
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
          all: vi.fn().mockResolvedValue([]),
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue({ count: 0 }),
            run: vi.fn().mockResolvedValue({ success: true }),
            all: vi.fn().mockResolvedValue([])
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
    it('should handle invalid event ID formats', () => {
      const invalidIds = ['', 'invalid@id', 'id with spaces', 'id/with/slashes', 'id\\with\\backslashes'];
      
      invalidIds.forEach(invalidId => {
        const result = validateRequest(EventIdSchema, invalidId);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid');
      });
    });

    it('should handle invalid customer ID formats', () => {
      const invalidIds = ['', 'invalid@id', 'id with spaces', 'id/with/slashes'];
      
      invalidIds.forEach(invalidId => {
        const result = validateRequest(CustomerIdSchema, invalidId);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid');
      });
    });

    it('should handle invalid market types', () => {
      const invalidMarkets = ['INVALID', 'SPREADS', 'MONEY', 'TOTALS', ''];
      
      invalidMarkets.forEach(invalidMarket => {
        const result = validateRequest(MarketTypeSchema, invalidMarket);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid enum value');
      });
    });

    it('should handle malformed request data', () => {
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

    it('should handle malformed response data', () => {
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

    it('should handle createErrorResponse with missing parameters', () => {
      const error1 = createErrorResponse('Test error');
      const error2 = createErrorResponse('Test error', 'TEST_CODE');
      const error3 = createErrorResponse('Test error', 'TEST_CODE', { detail: 'test' });
      
      expect(JSON.parse(error1)).toEqual({
        error: 'Test error',
        timestamp: expect.any(String)
      });
      
      expect(JSON.parse(error2)).toEqual({
        error: 'Test error',
        code: 'TEST_CODE',
        timestamp: expect.any(String)
      });
      
      expect(JSON.parse(error3)).toEqual({
        error: 'Test error',
        code: 'TEST_CODE',
        details: { detail: 'test' },
        timestamp: expect.any(String)
      });
    });

    it('should handle createSuccessResponse with invalid data', () => {
      const invalidData = { eid: '', sides: [] };
      
      expect(() => createSuccessResponse(invalidData, BettingExposureResponseSchema))
        .toThrow();
    });

    it('should handle validation with circular references', () => {
      const circularData: any = { eid: 'valid' };
      circularData.self = circularData;
      
      const result = validateRequest(GetBettingExposureRequestSchema, circularData);
      expect(result.success).toBe(false);
    });

    it('should handle validation with very large objects', () => {
      const largeData = {
        eid: 'x'.repeat(1000000), // 1MB string in valid field
        includeHistory: true,
        timeWindow: 1
      };
      
      const result = validateRequest(GetBettingExposureRequestSchema, largeData);
      expect(result.success).toBe(false);
    });

    it('should handle validation with special characters', () => {
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

    it('should handle database connection errors', async () => {
      vi.mocked(mockEnv.ANALYTICS.prepare).mockReturnValue({
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

    it('should handle SQL syntax errors', async () => {
      vi.mocked(mockEnv.ANALYTICS.prepare).mockReturnValue({
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

    it('should handle timeout scenarios', async () => {
      vi.mocked(mockEnv.ANALYTICS.prepare).mockReturnValue({
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

    it('should handle batch operation errors', async () => {
      vi.mocked(mockEnv.ANALYTICS.batch).mockRejectedValue(new Error('Batch failed'));

      const operations = [
        { query: 'INSERT INTO test VALUES (1)', params: [] },
        { query: 'INSERT INTO test VALUES (2)', params: [] }
      ];

      const result = await dbHelper.executeBatch(operations);
      expect(result.success).toBe(false);
      expect(result.rowsAffected).toBe(0);
    });

    it('should handle table existence check errors', async () => {
      vi.mocked(mockEnv.ANALYTICS.prepare).mockReturnValue({
        first: vi.fn().mockRejectedValue(new Error('Table check failed')),
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockResolvedValue([]),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockRejectedValue(new Error('Table check failed')),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue([])
        })
      } as any);

      const exists = await dbHelper.tableExists('test_table');
      expect(exists).toBe(false);
    });

    it('should handle row count errors', async () => {
      vi.mocked(mockEnv.ANALYTICS.prepare).mockReturnValue({
        first: vi.fn().mockRejectedValue(new Error('Count failed')),
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockResolvedValue([]),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockRejectedValue(new Error('Count failed')),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue([])
        })
      } as any);

      const count = await dbHelper.getRowCount('test_table');
      expect(count).toBe(0);
    });

    it('should handle database size errors', async () => {
      vi.mocked(mockEnv.ANALYTICS.prepare).mockReturnValue({
        first: vi.fn().mockRejectedValue(new Error('Size check failed')),
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockResolvedValue([]),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockRejectedValue(new Error('Size check failed')),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue([])
        })
      } as any);

      const size = await dbHelper.getDatabaseSize();
      expect(size).toEqual({ size: 0, pages: 0 });
    });

    it('should handle vacuum errors', async () => {
      vi.mocked(mockEnv.ANALYTICS.prepare).mockReturnValue({
        first: vi.fn().mockResolvedValue({ count: 0 }),
        run: vi.fn().mockRejectedValue(new Error('Vacuum failed')),
        all: vi.fn().mockResolvedValue([]),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ count: 0 }),
          run: vi.fn().mockRejectedValue(new Error('Vacuum failed')),
          all: vi.fn().mockResolvedValue([])
        })
      } as any);

      await expect(dbHelper.vacuum()).rejects.toThrow('Vacuum failed');
    });

    it('should handle analyze errors', async () => {
      vi.mocked(mockEnv.ANALYTICS.prepare).mockReturnValue({
        first: vi.fn().mockResolvedValue({ count: 0 }),
        run: vi.fn().mockRejectedValue(new Error('Analyze failed')),
        all: vi.fn().mockResolvedValue([]),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ count: 0 }),
          run: vi.fn().mockRejectedValue(new Error('Analyze failed')),
          all: vi.fn().mockResolvedValue([])
        })
      } as any);

      await expect(dbHelper.analyze()).rejects.toThrow('Analyze failed');
    });

    it('should handle retry logic with exponential backoff', async () => {
      let attemptCount = 0;
      vi.mocked(mockEnv.ANALYTICS.prepare).mockReturnValue({
        first: vi.fn().mockImplementation(() => {
          attemptCount++;
          if (attemptCount < 3) {
            return Promise.reject(new Error('Temporary failure'));
          }
          return Promise.resolve({ count: 1 });
        }),
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockResolvedValue([]),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockImplementation(() => {
            attemptCount++;
            if (attemptCount < 3) {
              return Promise.reject(new Error('Temporary failure'));
            }
            return Promise.resolve({ count: 1 });
          }),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue([])
        })
      } as any);

      const result = await dbHelper.executeQueryFirst('SELECT COUNT(*) as count FROM test');
      expect(result).toEqual({ count: 1 });
      expect(attemptCount).toBe(3);
    });

    it('should handle maximum retry attempts exceeded', async () => {
      vi.mocked(mockEnv.ANALYTICS.prepare).mockReturnValue({
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

    it('should handle null and undefined parameters', async () => {
      const result1 = await dbHelper.executeQuery('SELECT 1', null as any);
      const result2 = await dbHelper.executeQuery('SELECT 1', undefined as any);
      
      expect(result1).toEqual([]);
      expect(result2).toEqual([]);
    });

    it('should handle empty operations array in batch', async () => {
      const result = await dbHelper.executeBatch([]);
      expect(result.success).toBe(true);
      expect(result.rowsAffected).toBe(0);
    });

    it('should handle invalid table names', async () => {
      const invalidNames = ['', 'table with spaces', 'table; DROP TABLE users;', 'table"with"quotes'];
      
      for (const name of invalidNames) {
        const exists = await dbHelper.tableExists(name);
        expect(exists).toBe(false);
      }
    });
  });

  describe('Utility Integration Error Paths', () => {
    it('should handle validation and database errors together', async () => {
      const dbHelper = createDatabaseHelper(mockEnv);
      
      // Mock database error
      vi.mocked(mockEnv.ANALYTICS.prepare).mockReturnValue({
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

    it('should handle memory pressure scenarios', async () => {
      const dbHelper = createDatabaseHelper(mockEnv);
      
      // Simulate memory pressure with large result sets
      const largeResult = Array.from({ length: 100000 }, (_, i) => ({ id: i, data: 'x'.repeat(1000) }));
      
      vi.mocked(mockEnv.ANALYTICS.prepare).mockReturnValue({
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
