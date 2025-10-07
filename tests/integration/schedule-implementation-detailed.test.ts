/**
 * Detailed Tests for Schedule Implementations
 * Tests the actual implementation of sharpCalc and exposureCalc schedules
 */

import { describe, test, expect, vi, beforeEach } from "bun:test";
import type { Env } from '../../src/types/api';

// Mock the cost cap guard
vi.mock('../../src/guards/costCap', () => ({
  costCapGuard: {
    checkRequest: vi.fn()
  }
}));

describe.concurrent('Schedule Implementation Detailed Tests', () => {
  let mockEnv: Env;
  let mockCtx: ExecutionContext;

  beforeEach(() => {
    vi.clearAllMocks();
    
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
        exec: vi.fn().mockResolvedValue({ success: true })
      } as any,
      QUEUE_PRODUCER: {
        send: vi.fn().mockResolvedValue({ success: true })
      } as any,
      ANALYTICS_ENGINE: {
        writeDataPoint: vi.fn().mockResolvedValue(undefined)
      } as any
    };

    mockCtx = {
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn()
    } as any;
  });

  describe.concurrent('Sharp Calculation Schedule Detailed Tests', () => {
    test('should process customers with valid betting history', async () => {
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
        all: vi.fn().mockResolvedValue(mockCustomers.map(id => ({ cid: id }))),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ count: 0 }),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue([])
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

    test('should calculate sharp scores correctly for different customer types', async () => {
      // Mock cost cap to allow processing
      const { costCapGuard } = await import('../../src/guards/costCap');
      (costCapGuard.checkRequest as any).mockResolvedValue({
        allowed: true,
        reason: 'OK'
      });

      // Mock different customer types
      const mockCustomers = ['sharp_customer', 'regular_customer', 'low_activity_customer'];
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        first: vi.fn().mockResolvedValue({ count: 3 }),
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockResolvedValue(mockCustomers.map(id => ({ cid: id }))),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ count: 0 }),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue([])
        })
      } as any);

      const { handleSharpCalculation } = await import('../../src/schedules/sharpCalc');
      
      await handleSharpCalculation(mockEnv, mockCtx);
      
      // Verify all customers were processed
      expect(mockEnv.ANALYTICS_ENGINE.writeDataPoint).toHaveBeenCalledTimes(3);
    });

    test('should handle customers with no betting history', async () => {
      // Mock cost cap to allow processing
      const { costCapGuard } = await import('../../src/guards/costCap');
      (costCapGuard.checkRequest as any).mockResolvedValue({
        allowed: true,
        reason: 'OK'
      });

      // Mock customer with no history
      const mockCustomers = ['new_customer'];
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        first: vi.fn().mockResolvedValue({ count: 1 }),
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockResolvedValue(mockCustomers.map(id => ({ cid: id }))),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ count: 0 }),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue([])
        })
      } as any);

      const { handleSharpCalculation } = await import('../../src/schedules/sharpCalc');
      
      await handleSharpCalculation(mockEnv, mockCtx);
      
      // Should still process the customer with zero scores
      expect(mockEnv.ANALYTICS_ENGINE.writeDataPoint).toHaveBeenCalled();
    });

    test('should process customers in batches correctly', async () => {
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
        all: vi.fn().mockResolvedValue(mockCustomers.map(id => ({ cid: id }))),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ count: 0 }),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue([])
        })
      } as any);

      const { handleSharpCalculation } = await import('../../src/schedules/sharpCalc');
      
      await handleSharpCalculation(mockEnv, mockCtx);
      
      // Verify all customers were processed in batches
      expect(mockEnv.ANALYTICS_ENGINE.writeDataPoint).toHaveBeenCalledTimes(250);
    });

    test('should clean up old sharp data', async () => {
      // Mock cost cap to allow processing
      const { costCapGuard } = await import('../../src/guards/costCap');
      (costCapGuard.checkRequest as any).mockResolvedValue({
        allowed: true,
        reason: 'OK'
      });

      // Mock empty customer list
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        first: vi.fn().mockResolvedValue({ count: 0 }),
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockResolvedValue([]),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ count: 0 }),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue([])
        })
      } as any);

      const { handleSharpCalculation } = await import('../../src/schedules/sharpCalc');
      
      await handleSharpCalculation(mockEnv, mockCtx);
      
      // Verify cleanup was called
      expect(mockEnv.ANALYTICS.prepare).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM sharp_indicators')
      );
    });

    test('should handle database errors during customer processing', async () => {
      // Mock cost cap to allow processing
      const { costCapGuard } = await import('../../src/guards/costCap');
      (costCapGuard.checkRequest as any).mockResolvedValue({
        allowed: true,
        reason: 'OK'
      });

      // Mock database error during customer processing
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        first: vi.fn().mockResolvedValue({ count: 1 }),
        run: vi.fn().mockRejectedValue(new Error('Database error')),
        all: vi.fn().mockResolvedValue([{ cid: 'cust_1' }]),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ count: 0 }),
          run: vi.fn().mockRejectedValue(new Error('Database error')),
          all: vi.fn().mockResolvedValue([])
        })
      } as any);

      const { handleSharpCalculation } = await import('../../src/schedules/sharpCalc');
      
      // Should not throw - errors should be handled gracefully
      await expect(handleSharpCalculation(mockEnv, mockCtx)).resolves.not.toThrow();
    });

    test('should respect cost cap limits and exit early', async () => {
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
  });

  describe.concurrent('Exposure Calculation Schedule Detailed Tests', () => {
    test('should process active events with exposure data', async () => {
      // Mock cost cap to allow processing
      const { costCapGuard } = await import('../../src/guards/costCap');
      (costCapGuard.checkRequest as any).mockResolvedValue({
        allowed: true,
        reason: 'OK'
      });

      // Mock active events
      const mockEvents = ['nba_123', 'nba_456', 'nba_789'];
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        first: vi.fn().mockResolvedValue({ count: 3 }),
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockResolvedValue(mockEvents.map(eid => ({ eid }))),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ count: 0 }),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue([
            { side: 'HOME', risk: 30000, net: -15000 },
            { side: 'AWAY', risk: 25000, net: 15000 }
          ])
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

      // Mock 75 events to test constraint
      const mockEvents = Array.from({ length: 75 }, (_, i) => `nba_${i}`);
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        first: vi.fn().mockResolvedValue({ count: 75 }),
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockResolvedValue(mockEvents.map(eid => ({ eid }))),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ count: 0 }),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue([
            { side: 'HOME', risk: 1000, net: 500 }
          ])
        })
      } as any);

      const { handleExposureCalculation } = await import('../../src/schedules/exposureCalc');
      
      await handleExposureCalculation(mockEnv, mockCtx);
      
      // Verify only 50 events are processed
      expect(mockEnv.ANALYTICS_ENGINE.writeDataPoint).toHaveBeenCalledTimes(50);
    });

    test('should calculate exposure metrics correctly', async () => {
      // Mock cost cap to allow processing
      const { costCapGuard } = await import('../../src/guards/costCap');
      (costCapGuard.checkRequest as any).mockResolvedValue({
        allowed: true,
        reason: 'OK'
      });

      // Mock exposure data
      const mockEvents = ['nba_123'];
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        first: vi.fn().mockResolvedValue({ count: 1 }),
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockResolvedValue(mockEvents.map(eid => ({ eid }))),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ count: 0 }),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue([
            { side: 'HOME', risk: 30000, net: -15000 },
            { side: 'AWAY', risk: 25000, net: 15000 }
          ])
        })
      } as any);

      const { handleExposureCalculation } = await import('../../src/schedules/exposureCalc');
      
      await handleExposureCalculation(mockEnv, mockCtx);
      
      // Verify data points are written with correct totals
      expect(mockEnv.ANALYTICS_ENGINE.writeDataPoint).toHaveBeenCalledWith(
        expect.objectContaining({
          blobs: ['nba_123', 'exposure_update'],
          doubles: [55000, 15000],
          indexes: ['exposure_calculation']
        })
      );
    });

    test('should trigger exposure alerts when thresholds are exceeded', async () => {
      // Mock cost cap to allow processing
      const { costCapGuard } = await import('../../src/guards/costCap');
      (costCapGuard.checkRequest as any).mockResolvedValue({
        allowed: true,
        reason: 'OK'
      });

      // Mock high exposure data
      const mockEvents = ['nba_123'];
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        first: vi.fn().mockResolvedValue({ count: 1 }),
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockResolvedValue(mockEvents.map(eid => ({ eid }))),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ count: 0 }),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue([
            { side: 'HOME', risk: 60000, net: -55000 }, // Exceeds $50k threshold
            { side: 'AWAY', risk: 45000, net: 55000 }
          ])
        })
      } as any);

      const { handleExposureCalculation } = await import('../../src/schedules/exposureCalc');
      
      await handleExposureCalculation(mockEnv, mockCtx);
      
      // Verify alert was triggered
      expect(mockEnv.ANALYTICS_ENGINE.writeDataPoint).toHaveBeenCalledWith(
        expect.objectContaining({
          blobs: ['nba_123', 'MAX_AMOUNT'],
          doubles: expect.arrayContaining([expect.any(Number)]),
          indexes: ['exposure_alert']
        })
      );
    });

    test('should handle events with no exposure data', async () => {
      // Mock cost cap to allow processing
      const { costCapGuard } = await import('../../src/guards/costCap');
      (costCapGuard.checkRequest as any).mockResolvedValue({
        allowed: true,
        reason: 'OK'
      });

      // Mock event with no exposure data
      const mockEvents = ['nba_123'];
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        first: vi.fn().mockResolvedValue({ count: 1 }),
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockResolvedValue(mockEvents.map(eid => ({ eid }))),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ count: 0 }),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue([]) // No exposure data
        })
      } as any);

      const { handleExposureCalculation } = await import('../../src/schedules/exposureCalc');
      
      await handleExposureCalculation(mockEnv, mockCtx);
      
      // Should complete without errors but still write data point with zero values
      expect(mockEnv.ANALYTICS_ENGINE.writeDataPoint).toHaveBeenCalledWith(
        expect.objectContaining({
          blobs: ['nba_123', 'exposure_update'],
          doubles: [0, 0],
          indexes: ['exposure_calculation']
        })
      );
    });

    test('should handle database errors during exposure calculation', async () => {
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
        all: vi.fn().mockResolvedValue([]),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockRejectedValue(new Error('Database error')),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue([])
        })
      } as any);

      const { handleExposureCalculation } = await import('../../src/schedules/exposureCalc');
      
      // Should not throw - errors should be handled gracefully
      await expect(handleExposureCalculation(mockEnv, mockCtx)).resolves.not.toThrow();
    });

    test('should respect cost cap limits and exit early', async () => {
      // Mock cost cap to block processing
      const { costCapGuard } = await import('../../src/guards/costCap');
      (costCapGuard.checkRequest as any).mockResolvedValue({
        allowed: false,
        reason: 'Cost limit exceeded'
      });

      const { handleExposureCalculation } = await import('../../src/schedules/exposureCalc');
      
      await handleExposureCalculation(mockEnv, mockCtx);
      
      // Verify cost cap check was called
      expect(costCapGuard.checkRequest).toHaveBeenCalled();
      
      // Verify no database operations occurred
      expect(mockEnv.ANALYTICS.prepare).not.toHaveBeenCalled();
      expect(mockEnv.ANALYTICS_ENGINE.writeDataPoint).not.toHaveBeenCalled();
    });
  });

  describe.concurrent('Schedule Performance and Edge Cases', () => {
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
        all: vi.fn().mockResolvedValue([{ cid: 'cust_1' }]),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ count: 0 }),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue([])
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

    test('should handle concurrent schedule execution', async () => {
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
        all: vi.fn().mockResolvedValue([{ cid: 'cust_1' }]),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ count: 0 }),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue([])
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

    test('should handle schedule execution with analytics engine errors', async () => {
      // Mock cost cap to allow processing
      const { costCapGuard } = await import('../../src/guards/costCap');
      (costCapGuard.checkRequest as any).mockResolvedValue({
        allowed: true,
        reason: 'OK'
      });

      // Mock analytics engine error
      (mockEnv.ANALYTICS_ENGINE.writeDataPoint as any).mockRejectedValue(new Error('Analytics error'));

      // Mock customer data
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        first: vi.fn().mockResolvedValue({ count: 1 }),
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockResolvedValue([{ cid: 'cust_1' }]),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ count: 0 }),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue([])
        })
      } as any);

      const { handleSharpCalculation } = await import('../../src/schedules/sharpCalc');
      
      // Should not throw - errors should be handled gracefully
      await expect(handleSharpCalculation(mockEnv, mockCtx)).resolves.not.toThrow();
    });

    test('should handle schedule execution with queue producer errors', async () => {
      // Mock cost cap to allow processing
      const { costCapGuard } = await import('../../src/guards/costCap');
      (costCapGuard.checkRequest as any).mockResolvedValue({
        allowed: true,
        reason: 'OK'
      });

      // Mock queue producer error
      (mockEnv.QUEUE_PRODUCER.send as any).mockRejectedValue(new Error('Queue error'));

      // Mock customer data
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        first: vi.fn().mockResolvedValue({ count: 1 }),
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockResolvedValue([{ cid: 'cust_1' }]),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ count: 0 }),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue([])
        })
      } as any);

      const { handleSharpCalculation } = await import('../../src/schedules/sharpCalc');
      
      // Should not throw - errors should be handled gracefully
      await expect(handleSharpCalculation(mockEnv, mockCtx)).resolves.not.toThrow();
    });
  });
});
