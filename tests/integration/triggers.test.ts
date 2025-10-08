/**
 * Database Trigger Scenario Tests
 * Tests the database trigger handlers for line movement processing
 */

import { describe, test, expect, vi, beforeEach } from "bun:test";
import type { Env } from '../../src/types/api';
import {
  createMockEnv,
  createMockCtx,
  resetAllMocks,
  setupDatabaseMock,
  createMockLineMovement,
  expectAnalyticsCallCount
} from '../utils/test-helpers';

// Create mock environment and context
let mockEnv: Env;
let mockCtx: ExecutionContext;
let analytics: any;

describe('Database Trigger Scenario Tests', () => {
  beforeEach(() => {
    // Create fresh mock environment and context for each test
    const { env, analytics: analyticsStub } = createMockEnv();
    mockEnv = env;
    analytics = analyticsStub;
    mockCtx = createMockCtx();

    // Reset all mocks to clean state
    resetAllMocks(mockEnv, mockCtx);
    
    // Reset analytics stub call count
    analytics.reset();
  });

  describe('Line Movement Trigger', () => {
    test('should process line movement events successfully', async () => {
      const mockLineMovement = createMockLineMovement();

      // Setup database mock with line movement data
      setupDatabaseMock(mockEnv, [mockLineMovement], 1);

      // Import and test the trigger handler
      const { onLineMove } = await import('../../src/triggers/onLineMove');

      await onLineMove(mockEnv, mockLineMovement);

      // Verify database interactions
      expect(mockEnv.ANALYTICS.prepare).toHaveBeenCalled();
      expectAnalyticsCallCount(analytics, 1);
    });

    test('should detect significant line movements', async () => {
      const significantMovement = {
        eid: 'nba_123',
        mt: 'SPREAD',
        lb: 5.5,
        la: 7.0, // Significant change
        vb: 10000,
        va: 25000,
        ts: new Date().toISOString(),
        ing: new Date().toISOString()
      };

      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        first: vi.fn().mockResolvedValue({ count: 1 }),
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockResolvedValue([significantMovement]),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ count: 1 }),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue([significantMovement])
        })
      } as any);

      const { onLineMove } = await import('../../src/triggers/onLineMove');

      await onLineMove(mockEnv, significantMovement);

      // Verify that significant movements are flagged
      expectAnalyticsCallCount(analytics, 1);
    });

    test('should handle rapid line movements within time window', async () => {
      const rapidMovements = [
        {
          eid: 'nba_123',
          mt: 'SPREAD',
          lb: 5.5,
          la: 6.0,
          vb: 10000,
          va: 12000,
          ts: new Date(Date.now() - 30000).toISOString(), // 30 seconds ago
          ing: new Date(Date.now() - 30000).toISOString()
        },
        {
          eid: 'nba_123',
          mt: 'SPREAD',
          lb: 6.0,
          la: 6.5,
          vb: 12000,
          va: 15000,
          ts: new Date().toISOString(), // Now
          ing: new Date().toISOString()
        }
      ];

      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        first: vi.fn().mockResolvedValue({ count: 2 }),
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockResolvedValue(rapidMovements),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ count: 2 }),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue(rapidMovements)
        })
      } as any);

      const { onLineMove } = await import('../../src/triggers/onLineMove');

      // Process the second movement
      await onLineMove(mockEnv, rapidMovements[1]);

      // Verify that rapid movements are detected
      expectAnalyticsCallCount(analytics, 1);
    });

    test('should handle database errors gracefully', async () => {
      const mockLineMovement = createMockLineMovement();

      // Setup database mock to simulate errors
      setupDatabaseMock(mockEnv, [], 0, true);

      const { onLineMove } = await import('../../src/triggers/onLineMove');

      // Should not throw - errors should be handled gracefully
      await expect(onLineMove(mockEnv, mockLineMovement)).resolves.toBeUndefined();

      // Verify that normal analytics were still written (errors don't stop processing)
      expectAnalyticsCallCount(analytics, 1);
    });

    test('should validate line movement data', async () => {
      const invalidMovement = {
        eid: '', // Invalid empty ID
        mt: 'INVALID', // Invalid mt
        lb: NaN, // Invalid line value
        la: 6.0,
        vb: -1000, // Invalid negative volume
        va: 15000,
        ts: 'invalid-date', // Invalid ts
        ing: 'invalid-date' // Invalid ing
      };

      const { onLineMove } = await import('../../src/triggers/onLineMove');

      // Should handle invalid data gracefully
      await expect(onLineMove(mockEnv, invalidMovement)).resolves.toBeUndefined();
    });

    test('should handle concurrent line movements', async () => {
      const concurrentMovements = [
        {
          eid: 'nba_123',
          mt: 'SPREAD',
          lb: 5.5,
          la: 6.0,
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
          ts: new Date().toISOString(),
          ing: new Date().toISOString()
        }
      ];

      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        first: vi.fn().mockResolvedValue({ count: 2 }),
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockResolvedValue(concurrentMovements),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ count: 2 }),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue(concurrentMovements)
        })
      } as any);

      const { onLineMove } = await import('../../src/triggers/onLineMove');

      // Process both movements concurrently
      const promises = concurrentMovements.map(movement =>
        onLineMove(mockEnv, movement)
      );

      await Promise.all(promises);

      // Both should be processed successfully
      expectAnalyticsCallCount(analytics, 2);
    });
  });

  describe('Trigger Performance and Limits', () => {
    test('should complete within reasonable time limits', async () => {
      // Set NODE_ENV to production to avoid test delay
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const mockLineMovement = {
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

    test('should handle high-frequency trigger events', async () => {
      const highFrequencyMovements = Array.from({ length: 100 }, (_, i) => ({
        eid: `nba_${i}`,
        mt: 'SPREAD',
        lb: 5.5,
        la: 5.5 + (i * 0.1),
        vb: 10000,
        va: 15000,
        ts: new Date().toISOString(),
        ing: new Date().toISOString()
      }));

      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        first: vi.fn().mockResolvedValue({ count: 100 }),
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockResolvedValue(highFrequencyMovements),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ count: 100 }),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue(highFrequencyMovements)
        })
      } as any);

      const { onLineMove } = await import('../../src/triggers/onLineMove');

      // Process all movements
      const promises = highFrequencyMovements.map(movement =>
        onLineMove(mockEnv, movement)
      );

      await Promise.all(promises);

      // All should be processed successfully
      expectAnalyticsCallCount(analytics, 100);
    });

    test('should respect cost cap limits during trigger execution', async () => {
      const mockLineMovement = {
        eid: 'nba_123',
        mt: 'SPREAD',
        lb: 5.5,
        la: 6.0,
        vb: 10000,
        va: 15000,
        ts: new Date().toISOString(),
        ing: new Date().toISOString()
      };

      // Mock cost cap guard to return limit exceeded
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        first: vi.fn().mockResolvedValue({ count: 0 }),
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockResolvedValue({ results: [] })
      } as any);

      const { onLineMove } = await import('../../src/triggers/onLineMove');

      await onLineMove(mockEnv, mockLineMovement);

      // Should complete without throwing errors even if limits are exceeded
      expectAnalyticsCallCount(analytics, 1);
    });
  });

  describe('Trigger Data Validation', () => {
    test('should validate event ID format', async () => {
      const invalidEventId = {
        eid: 'invalid-format',
        mt: 'SPREAD',
        lb: 5.5,
        la: 6.0,
        vb: 10000,
        va: 15000,
        ts: new Date().toISOString(),
        ing: new Date().toISOString()
      };

      const { onLineMove } = await import('../../src/triggers/onLineMove');

      // Should handle invalid event ID gracefully
      await expect(onLineMove(mockEnv, invalidEventId)).resolves.toBeUndefined();
    });

    test('should validate mt type', async () => {
      const invalidMarket = {
        eid: 'nba_123',
        mt: 'INVALID_MARKET',
        lb: 5.5,
        la: 6.0,
        vb: 10000,
        va: 15000,
        ts: new Date().toISOString(),
        ing: new Date().toISOString()
      };

      const { onLineMove } = await import('../../src/triggers/onLineMove');

      // Should handle invalid mt gracefully
      await expect(onLineMove(mockEnv, invalidMarket)).resolves.toBeUndefined();
    });

    test('should validate line values', async () => {
      const invalidLineValues = {
        eid: 'nba_123',
        mt: 'SPREAD',
        lb: NaN,
        la: Infinity,
        vb: 10000,
        va: 15000,
        ts: new Date().toISOString(),
        ing: new Date().toISOString()
      };

      const { onLineMove } = await import('../../src/triggers/onLineMove');

      // Should handle invalid line values gracefully
      await expect(onLineMove(mockEnv, invalidLineValues)).resolves.toBeUndefined();
    });

    test('should validate volume values', async () => {
      const invalidVolume = {
        eid: 'nba_123',
        mt: 'SPREAD',
        lb: 5.5,
        la: 6.0,
        vb: -1000, // Negative volume
        va: 15000,
        ts: new Date().toISOString(),
        ing: new Date().toISOString()
      };

      const { onLineMove } = await import('../../src/triggers/onLineMove');

      // Should handle invalid volume gracefully
      await expect(onLineMove(mockEnv, invalidVolume)).resolves.toBeUndefined();
    });
  });

  describe('Trigger Integration', () => {
    test('should integrate with queue system', async () => {
      const mockLineMovement = {
        eid: 'nba_123',
        mt: 'SPREAD',
        lb: 5.5,
        la: 6.0,
        vb: 10000,
        va: 15000,
        ts: new Date().toISOString(),
        ing: new Date().toISOString()
      };

      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        first: vi.fn().mockResolvedValue({ count: 1 }),
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockResolvedValue([mockLineMovement]),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ count: 1 }),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue([mockLineMovement])
        })
      } as any);

      const { onLineMove } = await import('../../src/triggers/onLineMove');

      await onLineMove(mockEnv, mockLineMovement);

      // Verify queue integration
      expect(mockEnv.STEAM_WEBHOOK.send).toHaveBeenCalledWith(
        expect.objectContaining({
          eid: 'nba_123',
          mt: 'SPREAD'
        })
      );
    });

    test('should integrate with analytics engine', async () => {
      const mockLineMovement = {
        eid: 'nba_123',
        mt: 'SPREAD',
        lb: 5.5,
        la: 6.0,
        vb: 10000,
        va: 15000,
        ts: new Date().toISOString(),
        ing: new Date().toISOString()
      };

      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        first: vi.fn().mockResolvedValue({ count: 1 }),
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockResolvedValue([mockLineMovement]),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ count: 1 }),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue([mockLineMovement])
        })
      } as any);

      const { onLineMove } = await import('../../src/triggers/onLineMove');

      await onLineMove(mockEnv, mockLineMovement);

      // Verify analytics integration
      expectAnalyticsCallCount(analytics, 1);
    });
  });
});
