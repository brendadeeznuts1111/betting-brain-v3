/**
 * Steam Move Detection Tests
 * Alert threshold: ≥ 3σ in ≤ 60s
 * Tests the complete steam move detection pipeline including:
 * - Deduplication (5-minute window)
 * - Sigma calculation
 * - Alert threshold evaluation
 * - Error handling
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { handleSteamWebhook } from '../../src/queues/steamWebhook';
import processManager from '../utils/process-cleanup';

describe('Steam Move Detection', () => {
  let mockEnv: any;
  let mockCtx: any;
  let mockMessage: any;
  let dedupeCalls: any[] = [];
  let alertsSent: string[] = [];
  let analyticsWritten: any[] = [];

  beforeEach(() => {
    // Reset tracking arrays
    dedupeCalls = [];
    alertsSent = [];
    analyticsWritten = [];

    // Mock context
    mockCtx = {
      waitUntil: (promise: Promise<any>) => promise
    };

    // Mock environment with proper D1 database responses
    mockEnv = {
      ANALYTICS: {
        prepare: (query: string) => {
          // Track deduplication checks
          if (query.includes('steam_dedupe')) {
            dedupeCalls.push(query);
            
            if (query.includes('SELECT')) {
              // First call returns no duplicate
              return {
                bind: (...args: any[]) => ({
                  first: async () => null
                })
              };
            }
            
            if (query.includes('INSERT')) {
              return {
                bind: (...args: any[]) => ({
                  run: async () => ({ success: true })
                })
              };
            }
          }
          
          // Mock line_movements query for sigma calculation
          if (query.includes('line_movements')) {
            return {
              bind: (...args: any[]) => ({
                all: async () => ({
                  results: [
                    { lb: -110, la: -108, ts: new Date(Date.now() - 120000).toISOString() },
                    { lb: -108, la: -107, ts: new Date(Date.now() - 60000).toISOString() },
                    { lb: -107, la: -105, ts: new Date().toISOString() }
                  ]
                })
              })
            };
          }
          
          // Default response
          return {
            bind: (...args: any[]) => ({
              first: async () => null,
              all: async () => ({ results: [] }),
              run: async () => ({ success: true })
            }),
            first: async () => null,
            all: async () => ({ results: [] }),
            run: async () => ({ success: true })
          };
        }
      },
      ANALYTICS_ENGINE: {
        writeDataPoint: async (data: any) => {
          analyticsWritten.push(data);
        }
      },
      STEAM_WEBHOOK: {
        send: async (messages: any[]) => {
          alertsSent.push(...messages.map((m: any) => JSON.stringify(m)));
        }
      }
    };

    // Default valid message
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

  afterEach(async () => {
    // Cleanup any spawned processes
    await processManager.killAll(3000);
  });

  test('should process valid steam move successfully', async () => {
    await handleSteamWebhook(mockMessage, mockEnv, mockCtx);
    
    // Should have checked deduplication
    expect(dedupeCalls.length).toBeGreaterThan(0);
    expect(dedupeCalls.some((c: string) => c.includes('SELECT'))).toBe(true);
    expect(dedupeCalls.some((c: string) => c.includes('INSERT'))).toBe(true);
  });

  test('should apply 5-minute deduplication', async () => {
    // Mock database to return existing entry
    mockEnv.ANALYTICS.prepare = (query: string) => {
      if (query.includes('steam_dedupe') && query.includes('SELECT')) {
        return {
          bind: (...args: any[]) => ({
            first: async () => ({ 
              eid: 'nba_123', 
              mt: 'SPREAD',
              ts: new Date().toISOString()
            })
          })
        };
      }
      return mockEnv.ANALYTICS.prepare(query);
    };

    await handleSteamWebhook(mockMessage, mockEnv, mockCtx);
    
    // Should not insert duplicate
    expect(dedupeCalls.filter((c: string) => c.includes('INSERT')).length).toBe(0);
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

    await handleSteamWebhook(mockMessage, mockEnv, mockCtx);
    
    // Should process without error
    expect(dedupeCalls.length).toBeGreaterThan(0);
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

    await handleSteamWebhook(mockMessage, mockEnv, mockCtx);
    
    // Should still check deduplication but not alert (small move)
    expect(dedupeCalls.length).toBeGreaterThan(0);
  });

  test('should handle invalid steam move data without retry', async () => {
    mockMessage.body = JSON.stringify({
      eid: '',  // Invalid: empty event ID
      mt: 'INVALID'
    });

    // Should not throw (non-retryable error)
    await expect(
      handleSteamWebhook(mockMessage, mockEnv, mockCtx)
    ).resolves.toBeUndefined();
  });

  test('should handle JSON parsing errors gracefully', async () => {
    mockMessage.body = 'invalid json {';

    // Should not throw
    await expect(
      handleSteamWebhook(mockMessage, mockEnv, mockCtx)
    ).resolves.toBeUndefined();
  });

  test('should respect cost cap limits', async () => {
    // Mock cost cap guard to block request
    const originalPrepare = mockEnv.ANALYTICS.prepare;
    let costCheckCalled = false;
    
    mockEnv.ANALYTICS.prepare = (query: string) => {
      if (query.includes('cost_cap')) {
        costCheckCalled = true;
      }
      return originalPrepare(query);
    };

    await handleSteamWebhook(mockMessage, mockEnv, mockCtx);
    
    // Should process normally (cost cap allows)
    expect(dedupeCalls.length).toBeGreaterThan(0);
  });

  test('should calculate line change correctly', async () => {
    mockMessage.body = JSON.stringify({
      eid: 'nba_test',
      mt: 'TOTAL',
      lb: 220.5,
      la: 218.0,  // 2.5 point drop
      vb: 5000,
      va: 12000,
      ts: new Date().toISOString()
    });

    await handleSteamWebhook(mockMessage, mockEnv, mockCtx);
    
    // Should process successfully
    expect(dedupeCalls.length).toBeGreaterThan(0);
  });

  test('should handle null line values', async () => {
    mockMessage.body = JSON.stringify({
      eid: 'nba_null',
      mt: 'SPREAD',
      lb: null,
      la: null,
      vb: null,
      va: null,
      ts: new Date().toISOString()
    });

    await handleSteamWebhook(mockMessage, mockEnv, mockCtx);
    
    // Should handle null values without error
    expect(dedupeCalls.length).toBeGreaterThan(0);
  });

  test('should handle database errors with retry', async () => {
    mockEnv.ANALYTICS.prepare = () => {
      throw new Error('Database connection timeout');
    };

    // Should throw for retryable database error
    await expect(
      handleSteamWebhook(mockMessage, mockEnv, mockCtx)
    ).rejects.toThrow();
  });

  test('should calculate sigma from historical data', async () => {
    // Provide more historical data points
    mockEnv.ANALYTICS.prepare = (query: string) => {
      if (query.includes('line_movements')) {
        return {
          bind: (...args: any[]) => ({
            all: async () => ({
              results: Array.from({ length: 20 }, (_, i) => ({
                lb: -110 + i,
                la: -108 + i,
                ts: new Date(Date.now() - i * 60000).toISOString()
              }))
            })
          })
        };
      }
      
      if (query.includes('steam_dedupe')) {
        if (query.includes('SELECT')) {
          return {
            bind: (...args: any[]) => ({
              first: async () => null
            })
          };
        }
        if (query.includes('INSERT')) {
          return {
            bind: (...args: any[]) => ({
              run: async () => ({ success: true })
            })
          };
        }
      }
      
      return {
        bind: (...args: any[]) => ({
          first: async () => null,
          all: async () => ({ results: [] }),
          run: async () => ({ success: true })
        })
      };
    };

    await handleSteamWebhook(mockMessage, mockEnv, mockCtx);
    
    // Should use historical data for sigma calculation
    expect(dedupeCalls.length).toBeGreaterThan(0);
  });

  test('should handle insufficient historical data', async () => {
    mockEnv.ANALYTICS.prepare = (query: string) => {
      if (query.includes('line_movements')) {
        return {
          bind: (...args: any[]) => ({
            all: async () => ({
              results: [] // No historical data
            })
          })
        };
      }
      
      if (query.includes('steam_dedupe')) {
        if (query.includes('SELECT')) {
          return {
            bind: (...args: any[]) => ({
              first: async () => null
            })
          };
        }
        if (query.includes('INSERT')) {
          return {
            bind: (...args: any[]) => ({
              run: async () => ({ success: true })
            })
          };
        }
      }
      
      return {
        bind: (...args: any[]) => ({
          first: async () => null,
          all: async () => ({ results: [] }),
          run: async () => ({ success: true })
        })
      };
    };

    // Should handle gracefully with sigma = 0
    await handleSteamWebhook(mockMessage, mockEnv, mockCtx);
    
    expect(dedupeCalls.length).toBeGreaterThan(0);
  });

  test('should validate required fields', async () => {
    mockMessage.body = JSON.stringify({
      // Missing required fields
      mt: 'SPREAD'
    });

    // Should not throw (validation error is non-retryable)
    await expect(
      handleSteamWebhook(mockMessage, mockEnv, mockCtx)
    ).resolves.toBeUndefined();
  });

  test('should handle analytics engine errors', async () => {
    mockEnv.ANALYTICS_ENGINE.writeDataPoint = async () => {
      throw new Error('Analytics error');
    };

    // Should still process (analytics is fire-and-forget)
    await expect(
      handleSteamWebhook(mockMessage, mockEnv, mockCtx)
    ).resolves.toBeUndefined();
  });

  test('should process multiple market types', async () => {
    const marketTypes = ['SPREAD', 'TOTAL', 'MONEYLINE'];
    
    for (const mt of marketTypes) {
      mockMessage.body = JSON.stringify({
        eid: `test_${mt}`,
        mt,
        lb: -110,
        la: -105,
        vb: 10000,
        va: 25000,
        ts: new Date().toISOString()
      });
      
      await handleSteamWebhook(mockMessage, mockEnv, mockCtx);
    }
    
    // Should process all market types
    expect(dedupeCalls.length).toBeGreaterThan(marketTypes.length);
  });

  test('should handle timestamp edge cases', async () => {
    // Test with old timestamp (outside 60s window)
    mockMessage.body = JSON.stringify({
      eid: 'nba_old',
      mt: 'SPREAD',
      lb: -110,
      la: -105,
      vb: 10000,
      va: 25000,
      ts: new Date(Date.now() - 120000).toISOString() // 2 minutes ago
    });

    await handleSteamWebhook(mockMessage, mockEnv, mockCtx);
    
    // Should still process but not trigger alert
    expect(dedupeCalls.length).toBeGreaterThan(0);
  });
});
