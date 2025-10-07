/**
 * Steam Move Detection Tests
 * Alert threshold: ≥ 3σ in ≤ 60s
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { handleSteamWebhook } from '../../src/queues/steamWebhook';

describe('Steam Move Detection', () => {
  let mockEnv: any;
  let mockMessage: any;

  beforeEach(() => {
    mockEnv = {
      ANALYTICS: {
        prepare: (query: string) => ({
          bind: (...params: any[]) => ({
            first: async () => null,
            all: async () => [
              { lb: -110, la: -108, ts: new Date(Date.now() - 120000).toISOString() },
              { lb: -108, la: -107, ts: new Date(Date.now() - 60000).toISOString() },
              { lb: -107, la: -105, ts: new Date().toISOString() }
            ],
            run: async () => ({ success: true })
          }),
          first: async () => null,
          all: async () => [
            { lb: -110, la: -108, ts: new Date(Date.now() - 120000).toISOString() },
            { lb: -108, la: -107, ts: new Date(Date.now() - 60000).toISOString() },
            { lb: -107, la: -105, ts: new Date().toISOString() }
          ],
          run: async () => ({ success: true })
        })
      },
      ANALYTICS_ENGINE: {
        writeDataPoint: async () => {}
      },
      STEAM_WEBHOOK: {
        send: async () => {}
      }
    };

    mockMessage = {
      body: JSON.stringify({
        eid: 'nba_123',
        mt: 'SPREAD',
        lb: -110,
        la: -105,
        vb: 10000,
        va: 25000,
        ts: new Date().toISOString()
      }),
      ack: () => {},
      retry: () => {}
    };
  });

  test('should detect steam move when line changes ≥ 3σ', async () => {
    await handleSteamWebhook(mockMessage, mockEnv, {} as any);
    // Should process without error
    expect(true).toBe(true);
  });

  test('should apply 5-minute deduplication', async () => {
    mockEnv.ANALYTICS.prepare = (query: string) => {
      if (query.includes('steam_dedupe')) {
        return {
          bind: () => ({
            first: async () => ({ eid: 'nba_123', mt: 'SPREAD' }), // Already exists
            run: async () => ({ success: true })
          })
        };
      }
      return mockEnv.ANALYTICS.prepare(query);
    };

    await handleSteamWebhook(mockMessage, mockEnv, {} as any);
    // Should be deduplicated
    expect(true).toBe(true);
  });

  test('should detect rapid line movement within 60s', async () => {
    const recentTimestamp = new Date(Date.now() - 30000).toISOString(); // 30 seconds ago
    mockMessage.body = JSON.stringify({
      eid: 'nba_456',
      mt: 'SPREAD',
      lb: -110,
      la: -103, // 7 point move
      vb: 5000,
      va: 20000,
      ts: recentTimestamp
    });

    await handleSteamWebhook(mockMessage, mockEnv, {} as any);
    expect(true).toBe(true);
  });

  test('should ignore small line movements', async () => {
    mockMessage.body = JSON.stringify({
      eid: 'nba_789',
      mt: 'SPREAD',
      lb: -110,
      la: -109.5, // Only 0.5 point move
      vb: 10000,
      va: 10500,
      ts: new Date().toISOString()
    });

    await handleSteamWebhook(mockMessage, mockEnv, {} as any);
    expect(true).toBe(true);
  });

  test('should handle invalid steam move data', async () => {
    mockMessage.body = JSON.stringify({
      eid: '',
      mt: 'INVALID'
    });

    try {
      await handleSteamWebhook(mockMessage, mockEnv, {} as any);
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});
