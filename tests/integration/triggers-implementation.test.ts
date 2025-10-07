/**
 * Tests for Trigger Implementations
 * Tests the actual implementation of database triggers
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Env } from '../../src/types/api';
import type { LineMovement } from '../../src/types/database';

// Mock the database and analytics engine
const mockEnv: Env = {
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
  STEAM_WEBHOOK: {
    send: vi.fn().mockResolvedValue({ success: true })
  } as any,
  ANALYTICS_ENGINE: {
    writeDataPoint: vi.fn().mockResolvedValue(undefined)
  } as any
};

describe('Trigger Implementation Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Line Movement Trigger Implementation', () => {
    it('should process line movement events successfully', async () => {
      const mockLineMovement: LineMovement = {
        eid: 'nba_123',
        mt: 'SPREAD',
        lb: 5.5,
        la: 6.0,
        vb: 10000,
        va: 15000,
        ts: new Date().toISOString(),
        ing: new Date().toISOString()
      };

      const { onLineMove } = await import('../../src/triggers/onLineMove');
      
      await onLineMove(mockEnv, mockLineMovement);
      
      // Verify steam webhook was called
      expect(mockEnv.STEAM_WEBHOOK.send).toHaveBeenCalledWith(
        expect.objectContaining({
          eid: 'nba_123',
          mt: 'SPREAD',
          lb: 5.5,
          la: 6.0,
          vb: 10000,
          va: 15000
        })
      );
    });

    it('should detect significant line movements', async () => {
      const significantMovement: LineMovement = {
        eid: 'nba_123',
        mt: 'SPREAD',
        lb: 5.5,
        la: 7.5, // Significant 2-point change
        vb: 10000,
        va: 15000,
        ts: new Date().toISOString(),
        ing: new Date().toISOString()
      };

      const { onLineMove } = await import('../../src/triggers/onLineMove');
      
      await onLineMove(mockEnv, significantMovement);
      
      // Verify additional processing was triggered
      expect(mockEnv.STEAM_WEBHOOK.send).toHaveBeenCalledWith(
        expect.objectContaining({
          trigger: 'line_movement_trigger',
          metrics: expect.objectContaining({
            lineChange: 2,
            volumeChange: 5000,
            changePercentage: expect.any(Number)
          })
        })
      );
    });

    it('should detect significant percentage changes', async () => {
      const percentageChange: LineMovement = {
        eid: 'nba_123',
        mt: 'SPREAD',
        lb: 10.0,
        la: 11.5, // 15% change
        vb: 10000,
        va: 15000,
        ts: new Date().toISOString(),
        ing: new Date().toISOString()
      };

      const { onLineMove } = await import('../../src/triggers/onLineMove');
      
      await onLineMove(mockEnv, percentageChange);
      
      // Verify additional processing was triggered
      expect(mockEnv.STEAM_WEBHOOK.send).toHaveBeenCalledWith(
        expect.objectContaining({
          trigger: 'line_movement_trigger',
          metrics: expect.objectContaining({
            lineChange: 1.5,
            changePercentage: 15
          })
        })
      );
    });

    it('should detect significant volume changes', async () => {
      const volumeChange: LineMovement = {
        eid: 'nba_123',
        mt: 'SPREAD',
        lb: 5.5,
        la: 6.0,
        vb: 10000,
        va: 25000, // 150% volume increase
        ts: new Date().toISOString(),
        ing: new Date().toISOString()
      };

      const { onLineMove } = await import('../../src/triggers/onLineMove');
      
      await onLineMove(mockEnv, volumeChange);
      
      // Verify additional processing was triggered
      expect(mockEnv.STEAM_WEBHOOK.send).toHaveBeenCalledWith(
        expect.objectContaining({
          trigger: 'line_movement_trigger',
          metrics: expect.objectContaining({
            volumeChange: 15000
          })
        })
      );
    });

    it('should handle non-significant movements', async () => {
      const nonSignificant: LineMovement = {
        eid: 'nba_123',
        mt: 'SPREAD',
        lb: 5.5,
        la: 5.7, // Small change
        vb: 10000,
        va: 10500, // Small volume change
        ts: new Date().toISOString(),
        ing: new Date().toISOString()
      };

      const { onLineMove } = await import('../../src/triggers/onLineMove');
      
      await onLineMove(mockEnv, nonSignificant);
      
      // Verify steam webhook was not called for non-significant movement
      expect(mockEnv.STEAM_WEBHOOK.send).not.toHaveBeenCalled();
    });

    it('should handle null values gracefully', async () => {
      const nullValues: LineMovement = {
        eid: 'nba_123',
        mt: 'SPREAD',
        lb: null,
        la: null,
        vb: null,
        va: null,
        ts: new Date().toISOString(),
        ing: new Date().toISOString()
      };

      const { onLineMove } = await import('../../src/triggers/onLineMove');
      
      // Should not throw
      await expect(onLineMove(mockEnv, nullValues)).resolves.toBeUndefined();
      
      // Verify steam webhook was not called with null values (not significant)
      expect(mockEnv.STEAM_WEBHOOK.send).not.toHaveBeenCalled();
    });

    it('should handle zero line values', async () => {
      const zeroValues: LineMovement = {
        eid: 'nba_123',
        mt: 'SPREAD',
        lb: 0,
        la: 0.5,
        vb: 10000,
        va: 15000,
        ts: new Date().toISOString(),
        ing: new Date().toISOString()
      };

      const { onLineMove } = await import('../../src/triggers/onLineMove');
      
      await onLineMove(mockEnv, zeroValues);
      
      // Verify steam webhook was called
      expect(mockEnv.STEAM_WEBHOOK.send).toHaveBeenCalledWith(
        expect.objectContaining({
          lb: 0,
          la: 0.5
        })
      );
    });

    it('should handle rapid line movements', async () => {
      const rapidMovement: LineMovement = {
        eid: 'nba_123',
        mt: 'SPREAD',
        lb: 5.5,
        la: 8.0, // Large change
        vb: 10000,
        va: 25000,
        ts: new Date().toISOString(),
        ing: new Date().toISOString()
      };

      const { onLineMove } = await import('../../src/triggers/onLineMove');
      
      await onLineMove(mockEnv, rapidMovement);
      
      // Verify additional processing was triggered
      expect(mockEnv.STEAM_WEBHOOK.send).toHaveBeenCalledWith(
        expect.objectContaining({
          trigger: 'line_movement_trigger',
          metrics: expect.objectContaining({
            lineChange: 2.5,
            volumeChange: 15000
          })
        })
      );
    });

    it('should handle errors gracefully', async () => {
      const mockLineMovement: LineMovement = {
        eid: 'nba_123',
        mt: 'SPREAD',
        lb: 5.5,
        la: 6.0,
        vb: 10000,
        va: 15000,
        ts: new Date().toISOString(),
        ing: new Date().toISOString()
      };

      // Mock steam webhook to throw error
      (mockEnv.STEAM_WEBHOOK.send as any).mockRejectedValue(new Error('Queue error'));

      const { onLineMove } = await import('../../src/triggers/onLineMove');
      
      // Should not throw - errors should be handled gracefully
      await expect(onLineMove(mockEnv, mockLineMovement)).resolves.toBeUndefined();
    });

    it('should update real-time metrics', async () => {
      const mockLineMovement: LineMovement = {
        eid: 'nba_123',
        mt: 'SPREAD',
        lb: 5.5,
        la: 6.0,
        vb: 10000,
        va: 15000,
        ts: new Date().toISOString(),
        ing: new Date().toISOString()
      };

      const { onLineMove } = await import('../../src/triggers/onLineMove');
      
      await onLineMove(mockEnv, mockLineMovement);
      
      // Verify steam webhook was called for real-time updates
      expect(mockEnv.STEAM_WEBHOOK.send).toHaveBeenCalled();
    });
  });

  describe('Trigger Performance', () => {
    it('should complete within reasonable time limits', async () => {
      // Set NODE_ENV to production to avoid test delay
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const mockLineMovement: LineMovement = {
        eid: 'nba_123',
        mt: 'SPREAD',
        lb: 5.5,
        la: 6.0,
        vb: 10000,
        va: 15000,
        ts: new Date().toISOString(),
        ing: new Date().toISOString()
      };

      const startTime = Date.now();
      
      const { onLineMove } = await import('../../src/triggers/onLineMove');
      await onLineMove(mockEnv, mockLineMovement);
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      // Restore original environment
      process.env.NODE_ENV = originalEnv;
      
      // Should complete within 1 second (without test delay)
      expect(executionTime).toBeLessThan(1000);
    });

    it('should handle high-frequency trigger events', async () => {
      const highFrequencyMovements = Array.from({ length: 100 }, (_, i) => ({
        eid: `nba_${i}`,
        mt: 'SPREAD',
        lb: 5.5,
        la: 5.5 + (i * 0.1),
        vb: 10000,
        va: 15000,
        ts: new Date().toISOString()
      }));

      const { onLineMove } = await import('../../src/triggers/onLineMove');
      
      // Process all movements
      const promises = highFrequencyMovements.map(movement => 
        onLineMove(mockEnv, movement)
      );
      
      await Promise.all(promises);
      
      // All should be processed successfully
      expect(mockEnv.STEAM_WEBHOOK.send).toHaveBeenCalledTimes(100);
    });
  });

  describe('Trigger Integration', () => {
    it('should integrate with steam webhook queue', async () => {
      const mockLineMovement: LineMovement = {
        eid: 'nba_123',
        mt: 'SPREAD',
        lb: 5.5,
        la: 6.0,
        vb: 10000,
        va: 15000,
        ts: new Date().toISOString(),
        ing: new Date().toISOString()
      };

      const { onLineMove } = await import('../../src/triggers/onLineMove');
      
      await onLineMove(mockEnv, mockLineMovement);
      
      // Verify queue integration
      expect(mockEnv.STEAM_WEBHOOK.send).toHaveBeenCalledWith(
        expect.objectContaining({
          eid: 'nba_123',
          mt: 'SPREAD',
          trigger: 'line_movement_trigger'
        })
      );
    });

    it('should include metrics in queue message', async () => {
      const mockLineMovement: LineMovement = {
        eid: 'nba_123',
        mt: 'SPREAD',
        lb: 5.5,
        la: 7.0,
        vb: 10000,
        va: 20000,
        ts: new Date().toISOString(),
        ing: new Date().toISOString()
      };

      const { onLineMove } = await import('../../src/triggers/onLineMove');
      
      await onLineMove(mockEnv, mockLineMovement);
      
      // Verify metrics are included
      expect(mockEnv.STEAM_WEBHOOK.send).toHaveBeenCalledWith(
        expect.objectContaining({
          metrics: expect.objectContaining({
            lineChange: 1.5,
            volumeChange: 10000,
            changePercentage: expect.any(Number)
          })
        })
      );
    });
  });
});
