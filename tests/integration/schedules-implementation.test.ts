/**
 * Tests for Schedule Implementations
 * Tests the actual implementation of scheduled jobs
 */

import { describe, test, expect, vi, beforeEach } from "bun:test";
import type { Env } from '../../src/types/api';

// Mock the cost cap guard
vi.mock('../../src/guards/costCap', () => ({
  costCapGuard: {
    checkRequest: vi.fn()
  }
}));

// Mock the database and analytics engine
const mockEnv: Env = {
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
    exec: vi.fn().mockResolvedValue({ success: true })
  } as any,
  QUEUE_PRODUCER: {
    send: vi.fn().mockResolvedValue({ success: true })
  } as any,
  ANALYTICS_ENGINE: {
    writeDataPoint: vi.fn().mockResolvedValue(undefined)
  } as any
};

const mockCtx: ExecutionContext = {
  waitUntil: vi.fn(),
  passThroughOnException: vi.fn()
} as any;

describe('Schedule Implementation Tests', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('Sharp Calculation Implementation', () => {
    test('should execute sharp calculation successfully', async () => {
      // Mock cost cap to allow processing
      const { costCapGuard } = await import('../../src/guards/costCap');
      (costCapGuard.checkRequest as any).mockResolvedValue({
        allowed: true,
        reason: 'OK'
      });

      // Mock customer data
      const mockCustomers = ['cust_1', 'cust_2', 'cust_3'];
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        first: vi.fn().mockResolvedValue({ count: 3 }),
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockResolvedValue({ results: mockCustomers.map(id => ({ customer_id: id })) }),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ count: 0 }),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue({ results: [] })
        })
      } as any);

      const { handleSharpCalculation } = await import('../../src/schedules/sharpCalc');

      await handleSharpCalculation(mockEnv, mockCtx);

      // Verify cost cap check was called
      expect(costCapGuard.checkRequest).toHaveBeenCalled();

      // Verify database interactions
      expect(mockEnv.ANALYTICS.prepare).toHaveBeenCalled();
      expect(mockEnv.ANALYTICS_ENGINE.writeDataPoint).toHaveBeenCalled();
    });

    test('should respect cost cap limits', async () => {
      // Mock cost cap to block processing
      const { costCapGuard } = await import('../../src/guards/costCap');
      (costCapGuard.checkRequest as any).mockResolvedValue({
        allowed: false,
        reason: 'Cost limit exceeded'
      });

      const { handleSharpCalculation } = await import('../../src/schedules/sharpCalc');

      await handleSharpCalculation(mockEnv, mockCtx);

      // Verify cost cap check was called
      expect(costCapGuard.checkRequest).toHaveBeenCalled();

      // Verify no database operations occurred
      expect(mockEnv.ANALYTICS.prepare).not.toHaveBeenCalled();
      expect(mockEnv.ANALYTICS_ENGINE.writeDataPoint).not.toHaveBeenCalled();
    });

    test('should handle database errors gracefully', async () => {
      // Mock cost cap to allow processing
      const { costCapGuard } = await import('../../src/guards/costCap');
      (costCapGuard.checkRequest as any).mockResolvedValue({
        allowed: true,
        reason: 'OK'
      });

      // Mock database error
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        first: vi.fn().mockRejectedValue(new Error('Database error')),
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockResolvedValue({ results: [] }),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ count: 0 }),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue({ results: [] })
        })
      } as any);

      const { handleSharpCalculation } = await import('../../src/schedules/sharpCalc');

      // Should not throw - errors should be handled gracefully
      let threwError = false;
      try {
        await handleSharpCalculation(mockEnv, mockCtx);
      } catch (error) {
        threwError = true;
      }
      expect(threwError).toBe(false);
    });

    test('should process customers in batches', async () => {
      // Mock cost cap to allow processing
      const { costCapGuard } = await import('../../src/guards/costCap');
      (costCapGuard.checkRequest as any).mockResolvedValue({
        allowed: true,
        reason: 'OK'
      });

      // Mock 250 customers to test batching
      const mockCustomers = Array.from({ length: 250 }, (_, i) => `cust_${i}`);
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        first: vi.fn().mockResolvedValue({ count: 250 }),
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockResolvedValue({ results: mockCustomers.map(id => ({ customer_id: id })) }),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ count: 0 }),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue({ results: [] })
        })
      } as any);

      const { handleSharpCalculation } = await import('../../src/schedules/sharpCalc');

      await handleSharpCalculation(mockEnv, mockCtx);

      // Verify all customers were processed
      expect(mockEnv.ANALYTICS_ENGINE.writeDataPoint).toHaveBeenCalledTimes(250);
    });
  });

  describe('Exposure Calculation Implementation', () => {
    test('should execute exposure calculation successfully', async () => {
      // Mock cost cap to allow processing
      const { costCapGuard } = await import('../../src/guards/costCap');
      (costCapGuard.checkRequest as any).mockResolvedValue({
        allowed: true,
        reason: 'OK'
      });

      // Mock exposure data
      const mockExposureData = [
        { event_id: 'nba_123', market: 'SPREAD', exposure: 5000 },
        { event_id: 'nba_456', market: 'TOTAL', exposure: 3000 }
      ];

      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        first: vi.fn().mockResolvedValue({ count: 2 }),
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockResolvedValue({ results: mockExposureData }),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ count: 0 }),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue({ results: [] })
        })
      } as any);

      const { handleExposureCalculation } = await import('../../src/schedules/exposureCalc');

      await handleExposureCalculation(mockEnv, mockCtx);

      // Verify cost cap check was called
      expect(costCapGuard.checkRequest).toHaveBeenCalled();

      // Verify database interactions
      expect(mockEnv.ANALYTICS.prepare).toHaveBeenCalled();
      expect(mockEnv.ANALYTICS_ENGINE.writeDataPoint).toHaveBeenCalled();
    });

    test('should respect max 50 rows constraint', async () => {
      // Mock cost cap to allow processing
      const { costCapGuard } = await import('../../src/guards/costCap');
      (costCapGuard.checkRequest as any).mockResolvedValue({
        allowed: true,
        reason: 'OK'
      });

      // Mock 75 exposure records
      const mockExposureData = Array.from({ length: 75 }, (_, i) => ({
        event_id: `nba_${i}`,
        market: 'SPREAD',
        exposure: 1000 + i
      }));

      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        first: vi.fn().mockResolvedValue({ count: 75 }),
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockResolvedValue({ results: mockExposureData }),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ count: 0 }),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue({ results: [] })
        })
      } as any);

      const { handleExposureCalculation } = await import('../../src/schedules/exposureCalc');

      await handleExposureCalculation(mockEnv, mockCtx);

      // Verify only 50 rows are processed
      expect(mockEnv.ANALYTICS_ENGINE.writeDataPoint).toHaveBeenCalledTimes(50);
    });

    test('should handle empty exposure data', async () => {
      // Mock cost cap to allow processing
      const { costCapGuard } = await import('../../src/guards/costCap');
      (costCapGuard.checkRequest as any).mockResolvedValue({
        allowed: true,
        reason: 'OK'
      });

      // Mock empty data
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        first: vi.fn().mockResolvedValue({ count: 0 }),
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockResolvedValue({ results: [] }),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ count: 0 }),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue({ results: [] })
        })
      } as any);

      const { handleExposureCalculation } = await import('../../src/schedules/exposureCalc');

      await handleExposureCalculation(mockEnv, mockCtx);

      // Should complete without errors
      expect(mockEnv.ANALYTICS_ENGINE.writeDataPoint).not.toHaveBeenCalled();
    });
  });

  describe('Schedule Performance', () => {
    test('should complete within reasonable time limits', async () => {
      // Mock cost cap to allow processing
      const { costCapGuard } = await import('../../src/guards/costCap');
      (costCapGuard.checkRequest as any).mockResolvedValue({
        allowed: true,
        reason: 'OK'
      });

      // Mock minimal data
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        first: vi.fn().mockResolvedValue({ count: 1 }),
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockResolvedValue({ results: [{ customer_id: 'cust_1' }] }),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ count: 0 }),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue({ results: [] })
        })
      } as any);

      const startTime = Date.now();

      const { handleSharpCalculation } = await import('../../src/schedules/sharpCalc');
      await handleSharpCalculation(mockEnv, mockCtx);

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Should complete within 5 seconds
      expect(executionTime).toBeLessThan(5000);
    });

    test('should handle concurrent execution', async () => {
      // Mock cost cap to allow processing
      const { costCapGuard } = await import('../../src/guards/costCap');
      (costCapGuard.checkRequest as any).mockResolvedValue({
        allowed: true,
        reason: 'OK'
      });

      // Mock data for both jobs
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        first: vi.fn().mockResolvedValue({ count: 1 }),
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockResolvedValue({ results: [{ customer_id: 'cust_1' }] }),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ count: 0 }),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue({ results: [] })
        })
      } as any);

      const { handleSharpCalculation } = await import('../../src/schedules/sharpCalc');
      const { handleExposureCalculation } = await import('../../src/schedules/exposureCalc');

      // Execute both jobs concurrently
      const promises = [
        handleSharpCalculation(mockEnv, mockCtx),
        handleExposureCalculation(mockEnv, mockCtx)
      ];

      await Promise.all(promises);

      // Both should complete successfully
      expect(mockEnv.ANALYTICS_ENGINE.writeDataPoint).toHaveBeenCalled();
    });
  });
});
