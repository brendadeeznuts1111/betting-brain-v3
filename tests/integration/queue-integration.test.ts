/**
 * Integration Tests for Queue Handlers
 * Tests the line ingress and steam webhook queue handlers with real-world scenarios
 */

import { describe, test, expect, vi, beforeEach } from "bun:test";
import { handleLineIngress, handleBatchLineIngress } from '../../src/queues/lineIngress';
import { handleSteamWebhook, handleBatchSteamWebhook } from '../../src/queues/steamWebhook';
import type { Env } from '../../src/types/api';
import type { ExecutionContext } from '@cloudflare/workers-types';

describe('Queue Integration Tests', () => {
  let mockEnv: Env;
  let mockCtx: ExecutionContext;

  beforeEach(() => {
    vi.resetAllMocks();
    
    mockEnv = {
      ANALYTICS: {
        prepare: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue({ results: [] }),
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue(null),
            run: vi.fn().mockResolvedValue({ success: true }),
            all: vi.fn().mockResolvedValue({ results: [] })
          })
        }),
        exec: vi.fn().mockResolvedValue({ success: true })
      } as any,
      LINE_INGRESS: {
        send: vi.fn().mockResolvedValue({ success: true })
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

  describe('Line Ingress Queue Integration', () => {
    test('should process valid line movement successfully', async () => {
      const message = {
        body: JSON.stringify({
          eid: 'nba_123',
          mt: 'SPREAD',
          lb: -110,
          la: -108,
          vb: 10000,
          va: 15000,
          ts: new Date().toISOString()
        })
      } as any;

      await handleLineIngress(message, mockEnv, mockCtx);

      expect(mockEnv.ANALYTICS.prepare).toHaveBeenCalled();
      expect(mockEnv.ANALYTICS_ENGINE.writeDataPoint).toHaveBeenCalled();
      // Message is automatically acknowledged on successful completion
    });

    test('should trigger steam move detection for significant movements', async () => {
      const message = {
        body: JSON.stringify({
          eid: 'nba_123',
          mt: 'SPREAD',
          lb: -110,
          la: -105, // 5 point move - significant
          vb: 10000,
          va: 20000, // 100% volume increase - significant
          ts: new Date().toISOString()
        })
      } as any;

      await handleLineIngress(message, mockEnv, mockCtx);

      expect(mockEnv.STEAM_WEBHOOK.send).toHaveBeenCalledWith(
        expect.objectContaining({
          eid: 'nba_123',
          mt: 'SPREAD',
          trigger: 'line_movement'
        })
      );
      expect(mockEnv.ANALYTICS_ENGINE.writeDataPoint).toHaveBeenCalled();
    });

    test('should handle invalid line movement data without retry', async () => {
      const message = {
        body: JSON.stringify({
          eid: '', // Invalid empty ID
          mt: 'INVALID', // Invalid market type
          lb: 'invalid', // Invalid line value
          la: -108,
          vb: -1000, // Invalid negative volume
          va: 15000,
          ts: 'invalid-date' // Invalid timestamp
        })
      } as any;

      // Should not throw for validation errors (non-retryable)
      await handleLineIngress(message, mockEnv, mockCtx);
      
      // Should not call database operations for invalid data
      expect(mockEnv.ANALYTICS.prepare().run).not.toHaveBeenCalled();
      expect(mockEnv.ANALYTICS_ENGINE.writeDataPoint).not.toHaveBeenCalled();
    });

    test('should handle malformed JSON in message body without retry', async () => {
      const message = {
        body: 'invalid-json'
      } as any;

      // Should not throw for parsing errors (non-retryable)
      await handleLineIngress(message, mockEnv, mockCtx);
      
      // Should not call database operations for invalid JSON
      expect(mockEnv.ANALYTICS.prepare).not.toHaveBeenCalled();
      expect(mockEnv.ANALYTICS_ENGINE.writeDataPoint).not.toHaveBeenCalled();
    });

    test('should retry on database connection errors', async () => {
      const message = {
        body: JSON.stringify({
          eid: 'nba_123',
          mt: 'SPREAD',
          lb: -110,
          la: -108,
          vb: 10000,
          va: 15000,
          ts: new Date().toISOString()
        })
      } as any;

      // Mock database error
      mockEnv.ANALYTICS.prepare = vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue(null),
        run: vi.fn().mockRejectedValue(new Error('Database connection timeout')),
        all: vi.fn().mockResolvedValue({ results: [] }),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
          run: vi.fn().mockRejectedValue(new Error('Database connection timeout')),
          all: vi.fn().mockResolvedValue({ results: [] })
        })
      } as any);

      // Should throw for retryable errors
      await expect(handleLineIngress(message, mockEnv, mockCtx)).rejects.toThrow('Database connection timeout');
    });

    test('should handle database errors gracefully', async () => {
      mockEnv.ANALYTICS.prepare = vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue(null),
        run: vi.fn().mockRejectedValue(new Error('Database error')),
        all: vi.fn().mockResolvedValue({ results: [] }),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
          run: vi.fn().mockRejectedValue(new Error('Database error')),
          all: vi.fn().mockResolvedValue({ results: [] })
        })
      } as any);

      const message = {
        body: JSON.stringify({
          eid: 'nba_123',
          mt: 'SPREAD',
          lb: -110,
          la: -108,
          vb: 10000,
          va: 15000,
          ts: new Date().toISOString()
        })
      } as any;

      await expect(handleLineIngress(message, mockEnv, mockCtx)).rejects.toThrow('Database error');
      // Message will be retried due to thrown error
    });

    test('should process batch line ingress messages', async () => {
      const messages = [
        {
          body: JSON.stringify({
            eid: 'nba_123',
            mt: 'SPREAD',
            lb: -110,
            la: -108,
            vb: 10000,
            va: 15000,
            ts: new Date().toISOString()
          }),
          ack: vi.fn(),
          retry: vi.fn()
        },
        {
          body: JSON.stringify({
            eid: 'nba_456',
            mt: 'TOTAL',
            lb: 220.5,
            la: 221.0,
            vb: 8000,
            va: 12000,
            ts: new Date().toISOString()
          }),
          ack: vi.fn(),
          retry: vi.fn()
        }
      ] as any[];

      await handleBatchLineIngress(messages, mockEnv, mockCtx);

      expect(mockEnv.ANALYTICS.prepare).toHaveBeenCalled();
      // Messages are automatically acknowledged on successful completion
    });

    test('should handle mixed valid and invalid messages in batch', async () => {
      const messages = [
        {
          body: JSON.stringify({
            eid: 'nba_123',
            mt: 'SPREAD',
            lb: -110,
            la: -108,
            vb: 10000,
            va: 15000,
            ts: new Date().toISOString()
          }),
          ack: vi.fn(),
          retry: vi.fn()
        },
        {
          body: 'invalid-json',
          ack: vi.fn(),
          retry: vi.fn()
        }
      ] as any[];

      await handleBatchLineIngress(messages, mockEnv, mockCtx);
      
      // Batch processing should handle mixed valid/invalid messages
      // Valid messages are processed, invalid ones are handled gracefully without throwing
    });

    test('should respect cost cap limits', async () => {
      // Mock cost cap to block processing
      mockEnv.ANALYTICS.prepare = vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue({ size: 0, rows: 0 }),
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockResolvedValue({ results: [] }),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ size: 0, rows: 0 }),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue({ results: [] })
        })
      } as any);

      const message = {
        body: JSON.stringify({
          eid: 'nba_123',
          mt: 'SPREAD',
          lb: -110,
          la: -108,
          vb: 10000,
          va: 15000,
          ts: new Date().toISOString()
        })
      } as any;

      await handleLineIngress(message, mockEnv, mockCtx);

      // Should still ack the message even if blocked by cost cap
      // Message is automatically acknowledged on successful completion
    });
  });

  describe('Steam Webhook Queue Integration', () => {
    test('should process valid steam move successfully', async () => {
      const message = {
        body: JSON.stringify({
          eid: 'nba_123',
          mt: 'SPREAD',
          lb: -110,
          la: -105,
          vb: 10000,
          va: 25000,
          ts: new Date().toISOString(),
          trigger: 'line_movement'
        })
      } as any;

      // Mock recent line movements for sigma calculation
      mockEnv.ANALYTICS.prepare = vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue(null),
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockResolvedValue([
          { lb: -110, la: -108, ts: new Date(Date.now() - 300000).toISOString() },
          { lb: -108, la: -107, ts: new Date(Date.now() - 60000).toISOString() },
          { lb: -107, la: -105, ts: new Date().toISOString() }
        ]),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue([
            { lb: -110, la: -108, ts: new Date(Date.now() - 300000).toISOString() },
            { lb: -108, la: -107, ts: new Date(Date.now() - 60000).toISOString() },
            { lb: -107, la: -105, ts: new Date().toISOString() }
          ])
        })
      } as any);

      await handleSteamWebhook(message, mockEnv, mockCtx);

      expect(mockEnv.ANALYTICS.prepare).toHaveBeenCalled();
      expect(mockEnv.ANALYTICS_ENGINE.writeDataPoint).toHaveBeenCalled();
      // Message is automatically acknowledged on successful completion
    });

    test('should detect steam move when line change exceeds 3 sigma', async () => {
      const message = {
        body: JSON.stringify({
          eid: 'nba_123',
          mt: 'SPREAD',
          lb: -110,
          la: -100, // 10 point move
          vb: 10000,
          va: 25000,
          ts: new Date().toISOString()
        })
      } as any;

      // Mock recent line movements with small variance (low sigma)
      mockEnv.ANALYTICS.prepare = vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue(null),
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockResolvedValue([
          { lb: -110, la: -109.5, ts: new Date(Date.now() - 300000).toISOString() },
          { lb: -109.5, la: -109, ts: new Date(Date.now() - 60000).toISOString() },
          { lb: -109, la: -108.5, ts: new Date().toISOString() }
        ]),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue([
            { lb: -110, la: -109.5, ts: new Date(Date.now() - 300000).toISOString() },
            { lb: -109.5, la: -109, ts: new Date(Date.now() - 60000).toISOString() },
            { lb: -109, la: -108.5, ts: new Date().toISOString() }
          ])
        })
      } as any);

      await handleSteamWebhook(message, mockEnv, mockCtx);

      // Should detect steam move and log to analytics
      expect(mockEnv.ANALYTICS_ENGINE.writeDataPoint).toHaveBeenCalledWith(
        expect.objectContaining({
          blobs: ['nba_123', 'SPREAD'],
          doubles: expect.arrayContaining([expect.any(Number)]),
          indexes: ['steam_move']
        })
      );
    });

    test('should apply deduplication correctly', async () => {
      const message = {
        body: JSON.stringify({
          eid: 'nba_123',
          mt: 'SPREAD',
          lb: -110,
          la: -105,
          vb: 10000,
          va: 25000,
          ts: new Date().toISOString()
        })
      } as any;

      // Mock existing dedupe record
      mockEnv.ANALYTICS.prepare = vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue({ eid: 'nba_123', mt: 'SPREAD' }),
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockResolvedValue({ results: [] }),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ eid: 'nba_123', mt: 'SPREAD' }),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue({ results: [] })
        })
      } as any);

      await handleSteamWebhook(message, mockEnv, mockCtx);

      // Should be deduplicated and not process
      expect(mockEnv.ANALYTICS_ENGINE.writeDataPoint).not.toHaveBeenCalled();
    });

    test('should handle steam move with insufficient historical data', async () => {
      const message = {
        body: JSON.stringify({
          eid: 'nba_123',
          mt: 'SPREAD',
          lb: -110,
          la: -105,
          vb: 10000,
          va: 25000,
          ts: new Date().toISOString()
        })
      } as any;

      // Mock insufficient historical data
      mockEnv.ANALYTICS.prepare = vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue(null),
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockResolvedValue({ results: [] }), // No historical data
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue({ results: [] })
        })
      } as any);

      await handleSteamWebhook(message, mockEnv, mockCtx);

      // Should process and write data point even with insufficient historical data
      expect(mockEnv.ANALYTICS_ENGINE.writeDataPoint).toHaveBeenCalled();
    });

    test('should handle batch steam webhook messages', async () => {
      const messages = [
        {
          body: JSON.stringify({
            eid: 'nba_123',
            mt: 'SPREAD',
            lb: -110,
            la: -105,
            vb: 10000,
            va: 25000,
            ts: new Date().toISOString()
          }),
          ack: vi.fn(),
          retry: vi.fn()
        },
        {
          body: JSON.stringify({
            eid: 'nba_456',
            mt: 'TOTAL',
            lb: 220.5,
            la: 221.0,
            vb: 8000,
            va: 12000,
            ts: new Date().toISOString()
          }),
          ack: vi.fn(),
          retry: vi.fn()
        }
      ] as any[];

      await handleBatchSteamWebhook(messages, mockEnv, mockCtx);

      expect(mockEnv.ANALYTICS.prepare).toHaveBeenCalled();
      // Messages are automatically acknowledged on successful completion
    });

    test('should handle steam webhook with database errors', async () => {
      mockEnv.ANALYTICS.prepare = vi.fn().mockReturnValue({
        first: vi.fn().mockRejectedValue(new Error('Database error')),
        run: vi.fn().mockRejectedValue(new Error('Database error')),
        all: vi.fn().mockRejectedValue(new Error('Database error')),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockRejectedValue(new Error('Database error')),
          run: vi.fn().mockRejectedValue(new Error('Database error')),
          all: vi.fn().mockRejectedValue(new Error('Database error'))
        })
      } as any);

      const message = {
        body: JSON.stringify({
          eid: 'nba_123',
          mt: 'SPREAD',
          lb: -110,
          la: -105,
          vb: 10000,
          va: 25000,
          ts: new Date().toISOString()
        })
      } as any;

      await expect(handleSteamWebhook(message, mockEnv, mockCtx)).rejects.toThrow('Database error');
      // Message will be retried due to thrown error
    });

    test('should handle steam webhook with analytics engine errors', async () => {
      mockEnv.ANALYTICS_ENGINE.writeDataPoint = vi.fn().mockRejectedValue(new Error('Analytics error'));

      const message = {
        body: JSON.stringify({
          eid: 'nba_123',
          mt: 'SPREAD',
          lb: -110,
          la: -100, // Large move to trigger steam detection
          vb: 10000,
          va: 25000,
          ts: new Date().toISOString()
        })
      } as any;

      // Mock recent line movements for sigma calculation
      mockEnv.ANALYTICS.prepare = vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue(null),
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockResolvedValue([
          { lb: -110, la: -109.5, ts: new Date(Date.now() - 300000).toISOString() },
          { lb: -109.5, la: -109, ts: new Date(Date.now() - 60000).toISOString() },
          { lb: -109, la: -108.5, ts: new Date().toISOString() }
        ]),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue([
            { lb: -110, la: -109.5, ts: new Date(Date.now() - 300000).toISOString() },
            { lb: -109.5, la: -109, ts: new Date(Date.now() - 60000).toISOString() },
            { lb: -109, la: -108.5, ts: new Date().toISOString() }
          ])
        })
      } as any);

      await expect(handleSteamWebhook(message, mockEnv, mockCtx)).rejects.toThrow('Analytics error');
      // Message will be retried due to thrown error
    });
  });

  describe('Queue Handler Performance', () => {
    test('should process messages within reasonable time limits', async () => {
      const message = {
        body: JSON.stringify({
          eid: 'nba_123',
          mt: 'SPREAD',
          lb: -110,
          la: -108,
          vb: 10000,
          va: 15000,
          ts: new Date().toISOString()
        })
      } as any;

      const startTime = Date.now();
      await handleLineIngress(message, mockEnv, mockCtx);
      const endTime = Date.now();

      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should handle high-frequency message processing', async () => {
      const messages = Array.from({ length: 100 }, (_, i) => ({
        body: JSON.stringify({
          eid: `nba_${i}`,
          mt: 'SPREAD',
          lb: -110,
          la: -108,
          vb: 10000,
          va: 15000,
          ts: new Date().toISOString()
        }),
        ack: vi.fn(),
        retry: vi.fn()
      })) as any[];

      const startTime = Date.now();
      await handleBatchLineIngress(messages, mockEnv, mockCtx);
      const endTime = Date.now();

      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds

      // All messages should be processed (automatically acknowledged)
    });

    test('should handle concurrent queue processing', async () => {
      const message1 = {
        body: JSON.stringify({
          eid: 'nba_123',
          mt: 'SPREAD',
          lb: -110,
          la: -108,
          vb: 10000,
          va: 15000,
          ts: new Date().toISOString()
        })
      } as any;

      const message2 = {
        body: JSON.stringify({
          eid: 'nba_123',
          mt: 'SPREAD',
          lb: -110,
          la: -105,
          vb: 10000,
          va: 25000,
          ts: new Date().toISOString()
        })
      } as any;

      // Process both messages concurrently
      const promises = [
        handleLineIngress(message1, mockEnv, mockCtx),
        handleSteamWebhook(message2, mockEnv, mockCtx)
      ];

      await Promise.all(promises);

      // Both should complete successfully (automatically acknowledged)
    });
  });
});
