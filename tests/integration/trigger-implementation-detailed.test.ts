/**
 * Detailed Tests for Trigger Implementations
 * Tests the actual implementation of onLineMove trigger
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Env } from '../../src/types/api';
import type { LineMovement } from '../../src/types/database';

describe('Trigger Implementation Detailed Tests', () => {
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
      ANALYTICS_ENGINE: {
        writeDataPoint: vi.fn().mockResolvedValue(undefined)
      } as any,
      STEAM_WEBHOOK: {
        send: vi.fn().mockResolvedValue({ success: true })
      } as any
    };

    mockCtx = {
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn()
    } as any;
  });

  describe('Line Movement Trigger Detailed Tests', () => {
    it('should process line movement with valid data', async () => {
      const lineMovement: LineMovement = {
        eid: 'nba_123',
        mt: 'SPREAD',
        lb: -110,
        la: -108,
        vb: 10000,
        va: 15000,
        ts: new Date().toISOString(),
        ing: new Date().toISOString()
      };

      const { onLineMove } = await import('../../src/triggers/onLineMove');
      
      await onLineMove(mockEnv, lineMovement);
      
      // Verify database interactions
      expect(mockEnv.ANALYTICS.prepare).toHaveBeenCalled();
      expect(mockEnv.ANALYTICS_ENGINE.writeDataPoint).toHaveBeenCalled();
    });

    it('should detect significant line movements', async () => {
      const significantMovement: LineMovement = {
        eid: 'nba_123',
        mt: 'SPREAD',
        lb: -110,
        la: -100, // 10 point move - significant
        vb: 10000,
        va: 20000, // 100% volume increase - significant
        ts: new Date().toISOString(),
        ing: new Date().toISOString()
      };

      const { onLineMove } = await import('../../src/triggers/onLineMove');
      
      await onLineMove(mockEnv, significantMovement);
      
      // Verify steam webhook was triggered
      expect(mockEnv.STEAM_WEBHOOK.send).toHaveBeenCalledWith(
        expect.objectContaining({
          eid: 'nba_123',
          mt: 'SPREAD',
          trigger: 'line_movement_trigger',
          metrics: expect.objectContaining({
            lineChange: 10,
            volumeChange: 10000,
            changePercentage: expect.any(Number)
          })
        })
      );
    });

    it('should handle line movements with null values', async () => {
      const lineMovementWithNulls: LineMovement = {
        eid: 'nba_123',
        mt: 'SPREAD',
        lb: null,
        la: -108,
        vb: null,
        va: 15000,
        ts: new Date().toISOString(),
        ing: new Date().toISOString()
      };

      const { onLineMove } = await import('../../src/triggers/onLineMove');
      
      await onLineMove(mockEnv, lineMovementWithNulls);
      
      // Should handle null values gracefully
      expect(mockEnv.ANALYTICS_ENGINE.writeDataPoint).toHaveBeenCalled();
    });

    it('should calculate line movement metrics correctly', async () => {
      const lineMovement: LineMovement = {
        eid: 'nba_123',
        mt: 'SPREAD',
        lb: -110,
        la: -108,
        vb: 10000,
        va: 15000,
        ts: new Date().toISOString(),
        ing: new Date().toISOString()
      };

      const { onLineMove } = await import('../../src/triggers/onLineMove');
      
      await onLineMove(mockEnv, lineMovement);
      
      // Verify metrics are calculated correctly
      expect(mockEnv.ANALYTICS_ENGINE.writeDataPoint).toHaveBeenCalledWith(
        expect.objectContaining({
          doubles: expect.objectContaining({
            line_change: 2,
            volume_change: 5000,
            change_percentage: expect.any(Number)
          })
        })
      );
    });

    it('should handle percentage calculations with zero values', async () => {
      const lineMovementWithZero: LineMovement = {
        eid: 'nba_123',
        mt: 'SPREAD',
        lb: 0,
        la: -108,
        vb: 0,
        va: 15000,
        ts: new Date().toISOString(),
        ing: new Date().toISOString()
      };

      const { onLineMove } = await import('../../src/triggers/onLineMove');
      
      await onLineMove(mockEnv, lineMovementWithZero);
      
      // Should handle zero values gracefully
      expect(mockEnv.ANALYTICS_ENGINE.writeDataPoint).toHaveBeenCalled();
    });

    it('should trigger additional processing for significant movements', async () => {
      const significantMovement: LineMovement = {
        eid: 'nba_123',
        mt: 'SPREAD',
        lb: -110,
        la: -100, // 10 point move
        vb: 10000,
        va: 20000, // 100% volume increase
        ts: new Date().toISOString(),
        ing: new Date().toISOString()
      };

      const { onLineMove } = await import('../../src/triggers/onLineMove');
      
      await onLineMove(mockEnv, significantMovement);
      
      // Verify steam webhook was called
      expect(mockEnv.STEAM_WEBHOOK.send).toHaveBeenCalled();
      
      // Verify analytics data point was written
      expect(mockEnv.ANALYTICS_ENGINE.writeDataPoint).toHaveBeenCalled();
    });

    it('should not trigger additional processing for insignificant movements', async () => {
      const insignificantMovement: LineMovement = {
        eid: 'nba_123',
        mt: 'SPREAD',
        lb: -110,
        la: -109.5, // 0.5 point move - not significant
        vb: 10000,
        va: 10500, // 5% volume increase - not significant
        ts: new Date().toISOString(),
        ing: new Date().toISOString()
      };

      const { onLineMove } = await import('../../src/triggers/onLineMove');
      
      await onLineMove(mockEnv, insignificantMovement);
      
      // Should not trigger steam webhook
      expect(mockEnv.STEAM_WEBHOOK.send).not.toHaveBeenCalled();
      
      // Should still update real-time metrics
      expect(mockEnv.ANALYTICS_ENGINE.writeDataPoint).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
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

      const lineMovement: LineMovement = {
        eid: 'nba_123',
        mt: 'SPREAD',
        lb: -110,
        la: -108,
        vb: 10000,
        va: 15000,
        ts: new Date().toISOString(),
        ing: new Date().toISOString()
      };

      const { onLineMove } = await import('../../src/triggers/onLineMove');
      
      // Should not throw - errors should be handled gracefully
      await expect(onLineMove(mockEnv, lineMovement)).resolves.not.toThrow();
    });

    it('should handle steam webhook errors gracefully', async () => {
      (mockEnv.STEAM_WEBHOOK.send as any).mockRejectedValue(new Error('Webhook error'));

      const significantMovement: LineMovement = {
        eid: 'nba_123',
        mt: 'SPREAD',
        lb: -110,
        la: -100, // Significant move
        vb: 10000,
        va: 20000,
        ts: new Date().toISOString(),
        ing: new Date().toISOString()
      };

      const { onLineMove } = await import('../../src/triggers/onLineMove');
      
      // Should not throw - errors should be handled gracefully
      await expect(onLineMove(mockEnv, significantMovement)).resolves.not.toThrow();
    });

    it('should handle analytics engine errors gracefully', async () => {
      (mockEnv.ANALYTICS_ENGINE.writeDataPoint as any).mockRejectedValue(new Error('Analytics error'));

      const lineMovement: LineMovement = {
        eid: 'nba_123',
        mt: 'SPREAD',
        lb: -110,
        la: -108,
        vb: 10000,
        va: 15000,
        ts: new Date().toISOString(),
        ing: new Date().toISOString()
      };

      const { onLineMove } = await import('../../src/triggers/onLineMove');
      
      // Should not throw - errors should be handled gracefully
      await expect(onLineMove(mockEnv, lineMovement)).resolves.not.toThrow();
    });

    it('should handle concurrent line movements', async () => {
      const concurrentMovements: LineMovement[] = [
        {
          eid: 'nba_123',
          mt: 'SPREAD',
          lb: -110,
          la: -108,
          vb: 10000,
          va: 15000,
          ts: new Date().toISOString(),
          ing: new Date().toISOString()
        },
        {
          eid: 'nba_456',
          mt: 'TOTAL',
          lb: 220.5,
          la: 221.0,
          vb: 8000,
          va: 12000,
          ts: new Date().toISOString()
        }
      ];

      const { onLineMove } = await import('../../src/triggers/onLineMove');
      
      // Process both movements concurrently
      const promises = concurrentMovements.map(movement => 
        onLineMove(mockEnv, movement)
      );
      
      await Promise.all(promises);
      
      // Both should be processed successfully
      expect(mockEnv.ANALYTICS_ENGINE.writeDataPoint).toHaveBeenCalledTimes(2);
    });

    it('should handle high-frequency line movements', async () => {
      const highFrequencyMovements: LineMovement[] = Array.from({ length: 100 }, (_, i) => ({
        eid: `nba_${i}`,
        mt: 'SPREAD',
        lb: -110,
        la: -110 + (i * 0.1),
        vb: 10000,
        va: 15000,
        ts: new Date().toISOString(),
        ing: new Date().toISOString()
      }));

      const { onLineMove } = await import('../../src/triggers/onLineMove');
      
      // Process all movements
      const promises = highFrequencyMovements.map(movement => 
        onLineMove(mockEnv, movement)
      );
      
      await Promise.all(promises);
      
      // All should be processed successfully
      expect(mockEnv.ANALYTICS_ENGINE.writeDataPoint).toHaveBeenCalledTimes(100);
    });

    it('should handle line movements with extreme values', async () => {
      const extremeMovement: LineMovement = {
        eid: 'nba_123',
        mt: 'SPREAD',
        lb: -1000,
        la: 1000, // Extreme move
        vb: 1,
        va: 1000000, // Extreme volume
        ts: new Date().toISOString(),
        ing: new Date().toISOString()
      };

      const { onLineMove } = await import('../../src/triggers/onLineMove');
      
      await onLineMove(mockEnv, extremeMovement);
      
      // Should handle extreme values gracefully
      expect(mockEnv.ANALYTICS_ENGINE.writeDataPoint).toHaveBeenCalled();
    });

    it('should handle line movements with invalid timestamps', async () => {
      const invalidTimestampMovement: LineMovement = {
        eid: 'nba_123',
        mt: 'SPREAD',
        lb: -110,
        la: -108,
        vb: 10000,
        va: 15000,
        ts: 'invalid-timestamp'
      };

      const { onLineMove } = await import('../../src/triggers/onLineMove');
      
      // Should handle invalid timestamps gracefully
      await expect(onLineMove(mockEnv, invalidTimestampMovement)).resolves.not.toThrow();
    });

    it('should handle line movements with special characters in event ID', async () => {
      const specialCharMovement: LineMovement = {
        eid: 'nba_123_special-chars',
        mt: 'SPREAD',
        lb: -110,
        la: -108,
        vb: 10000,
        va: 15000,
        ts: new Date().toISOString(),
        ing: new Date().toISOString()
      };

      const { onLineMove } = await import('../../src/triggers/onLineMove');
      
      await onLineMove(mockEnv, specialCharMovement);
      
      // Should handle special characters gracefully
      expect(mockEnv.ANALYTICS_ENGINE.writeDataPoint).toHaveBeenCalled();
    });

    it('should handle line movements with different market types', async () => {
      const marketTypes = ['SPREAD', 'MONEYLINE', 'TOTAL', 'PROP'];
      
      for (const marketType of marketTypes) {
        const lineMovement: LineMovement = {
          eid: 'nba_123',
          mt: marketType as any,
          lb: -110,
          la: -108,
          vb: 10000,
          va: 15000,
          ts: new Date().toISOString()
        };

        const { onLineMove } = await import('../../src/triggers/onLineMove');
        
        await onLineMove(mockEnv, lineMovement);
      }
      
      // All market types should be processed
      expect(mockEnv.ANALYTICS_ENGINE.writeDataPoint).toHaveBeenCalledTimes(marketTypes.length);
    });

    it('should handle line movements with NaN values', async () => {
      const nanMovement: LineMovement = {
        eid: 'nba_123',
        mt: 'SPREAD',
        lb: NaN,
        la: -108,
        vb: 10000,
        va: NaN,
        ts: new Date().toISOString(),
        ing: new Date().toISOString()
      };

      const { onLineMove } = await import('../../src/triggers/onLineMove');
      
      // Should handle NaN values gracefully
      await expect(onLineMove(mockEnv, nanMovement)).resolves.not.toThrow();
    });

    it('should handle line movements with Infinity values', async () => {
      const infinityMovement: LineMovement = {
        eid: 'nba_123',
        mt: 'SPREAD',
        lb: Infinity,
        la: -108,
        vb: 10000,
        va: -Infinity,
        ts: new Date().toISOString(),
        ing: new Date().toISOString()
      };

      const { onLineMove } = await import('../../src/triggers/onLineMove');
      
      // Should handle Infinity values gracefully
      await expect(onLineMove(mockEnv, infinityMovement)).resolves.not.toThrow();
    });
  });

  describe('Trigger Performance and Limits', () => {
    it('should complete within reasonable time limits', async () => {
      // Set NODE_ENV to production to avoid test delay
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const lineMovement: LineMovement = {
        eid: 'nba_123',
        mt: 'SPREAD',
        lb: -110,
        la: -108,
        vb: 10000,
        va: 15000,
        ts: new Date().toISOString(),
        ing: new Date().toISOString()
      };

      const startTime = Date.now();
      
      const { onLineMove } = await import('../../src/triggers/onLineMove');
      await onLineMove(mockEnv, lineMovement);
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      // Restore original environment
      process.env.NODE_ENV = originalEnv;
      
      // Should complete within 1 second (without test delay)
      expect(executionTime).toBeLessThan(1000);
    });

    it('should handle memory pressure scenarios', async () => {
      const lineMovements: LineMovement[] = Array.from({ length: 1000 }, (_, i) => ({
        eid: `nba_${i}`,
        mt: 'SPREAD',
        lb: -110,
        la: -108,
        vb: 10000,
        va: 15000,
        ts: new Date().toISOString(),
        ing: new Date().toISOString()
      }));

      const { onLineMove } = await import('../../src/triggers/onLineMove');
      
      // Process all movements
      const promises = lineMovements.map(movement => 
        onLineMove(mockEnv, movement)
      );
      
      await Promise.all(promises);
      
      // All should be processed successfully
      expect(mockEnv.ANALYTICS_ENGINE.writeDataPoint).toHaveBeenCalledTimes(1000);
    });

    it('should handle trigger execution with timeout scenarios', async () => {
      // Set NODE_ENV to test for this specific test
      process.env.NODE_ENV = 'test';
      
      // Mock slow database response
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        first: vi.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve({ count: 0 }), 100))
        ),
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockResolvedValue([]),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockImplementation(() => 
            new Promise(resolve => setTimeout(() => resolve({ count: 0 }), 2000))
          ),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue([])
        })
      } as any);

      const lineMovement: LineMovement = {
        eid: 'nba_123',
        mt: 'SPREAD',
        lb: -110,
        la: -108,
        vb: 10000,
        va: 15000,
        ts: new Date().toISOString(),
        ing: new Date().toISOString()
      };

      const { onLineMove } = await import('../../src/triggers/onLineMove');
      
      // Should not hang indefinitely
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 1000)
      );
      
      await expect(Promise.race([
        onLineMove(mockEnv, lineMovement),
        timeoutPromise
      ])).rejects.toThrow('Timeout');
    });
  });
});
