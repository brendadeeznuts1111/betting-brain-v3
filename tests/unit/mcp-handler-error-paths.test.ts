/**
 * MCP Handler Error Path Tests
 * Tests error handling in individual MCP tool handlers
 */

import { describe, test, expect, beforeEach, vi } from "bun:test";
import { getSteamMoves } from '../../src/mcp/handlers/steamMoves';
import { getRiskConcentration } from '../../src/mcp/handlers/riskConcentration';
import { getSharpActivity } from '../../src/mcp/handlers/sharpActivity';
import type { Env } from '../../src/types/api';

describe('MCP Handler Error Paths', () => {
  let mockEnv: Env;

  beforeEach(() => {
    mockEnv = {
      ANALYTICS: {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue(null),
            all: vi.fn().mockResolvedValue({ results: [] }),
          }),
          first: vi.fn().mockResolvedValue(null),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue({ results: [] }),
        }),
        exec: vi.fn().mockResolvedValue({ success: true }),
      } as any,
      ANALYTICS_ENGINE: {
        writeDataPoint: vi.fn().mockResolvedValue(undefined),
      } as any,
    };
  });

  describe('getSteamMoves Error Paths', () => {
    test('should handle missing ANALYTICS database', async () => {
      const envWithoutAnalytics = {} as Env;

      const result = await getSteamMoves(
        { agentID: 'test', lookbackMinutes: 60 },
        envWithoutAnalytics
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('ANALYTICS database not available');
    });

    test('should handle database query errors', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockRejectedValue(new Error('Database error')),
        }),
      });

      const result = await getSteamMoves(
        { agentID: 'test', lookbackMinutes: 60 },
        mockEnv
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error detecting steam moves');
      expect(result.content[0].text).toContain('Database error');
    });

    test('should handle invalid lookbackMinutes parameter', async () => {
      const result = await getSteamMoves(
        { agentID: 'test', lookbackMinutes: -100 },
        mockEnv
      );

      // Should not error, but may return strange results
      expect(result.isError).toBe(false);
    });

    test('should handle missing parameters with defaults', async () => {
      const result = await getSteamMoves({}, mockEnv);

      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      expect(data.agentID).toBe('DEMO');
      expect(data.summary.lookback_minutes).toBe(60);
    });

    test('should handle null database results', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: null }),
        }),
      });

      const result = await getSteamMoves(
        { agentID: 'test', lookbackMinutes: 60 },
        mockEnv
      );

      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      expect(data.summary.total_moves).toBe(0);
    });

    test('should handle undefined database results', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({}),
        }),
      });

      const result = await getSteamMoves(
        { agentID: 'test', lookbackMinutes: 60 },
        mockEnv
      );

      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      expect(data.summary.total_moves).toBe(0);
    });

    test('should handle malformed query results', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({
            results: [
              { event_id: null, market_type: null, line_change: 'invalid' }
            ]
          }),
        }),
      });

      const result = await getSteamMoves(
        { agentID: 'test', lookbackMinutes: 60 },
        mockEnv
      );

      // Should handle gracefully without crashing
      expect(result.isError).toBe(false);
    });

    test('should handle extremely large lookbackMinutes', async () => {
      const result = await getSteamMoves(
        { agentID: 'test', lookbackMinutes: 999999999 },
        mockEnv
      );

      expect(result.isError).toBe(false);
    });

    test('should handle zero threshold', async () => {
      const result = await getSteamMoves(
        { agentID: 'test', lookbackMinutes: 60, threshold: 0 },
        mockEnv
      );

      expect(result.isError).toBe(false);
    });

    test('should handle negative threshold', async () => {
      const result = await getSteamMoves(
        { agentID: 'test', lookbackMinutes: 60, threshold: -3.0 },
        mockEnv
      );

      expect(result.isError).toBe(false);
    });

    test('should handle division by zero in averages', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: [] }),
        }),
      });

      const result = await getSteamMoves(
        { agentID: 'test', lookbackMinutes: 60 },
        mockEnv
      );

      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      // Should handle 0/0 gracefully
      expect(isFinite(data.summary.avg_line_change)).toBe(true);
    });
  });

  describe('getRiskConcentration Error Paths', () => {
    test('should handle missing ANALYTICS database', async () => {
      const envWithoutAnalytics = {} as Env;

      const result = await getRiskConcentration(
        { agentID: 'test' },
        envWithoutAnalytics
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('ANALYTICS database not available');
    });

    test('should handle database query errors', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockRejectedValue(new Error('Query timeout')),
        }),
      });

      const result = await getRiskConcentration(
        { agentID: 'test', minExposure: 1000 },
        mockEnv
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error analyzing risk concentration');
    });

    test('should handle empty results', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: [] }),
        }),
      });

      const result = await getRiskConcentration(
        { agentID: 'test' },
        mockEnv
      );

      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      expect(data.summary.total_clusters).toBe(0);
    });

    test('should handle negative minExposure', async () => {
      const result = await getRiskConcentration(
        { agentID: 'test', minExposure: -5000 },
        mockEnv
      );

      expect(result.isError).toBe(false);
    });

    test('should handle zero minExposure', async () => {
      const result = await getRiskConcentration(
        { agentID: 'test', minExposure: 0 },
        mockEnv
      );

      expect(result.isError).toBe(false);
    });

    test('should handle extremely large minExposure', async () => {
      const result = await getRiskConcentration(
        { agentID: 'test', minExposure: Number.MAX_SAFE_INTEGER },
        mockEnv
      );

      expect(result.isError).toBe(false);
    });

    test('should handle NaN in exposure calculations', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({
            results: [
              { event_id: 'event1', total_exposure: null, bet_count: 0 }
            ]
          }),
        }),
      });

      const result = await getRiskConcentration(
        { agentID: 'test' },
        mockEnv
      );

      expect(result.isError).toBe(false);
    });

    test('should handle malformed database results', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({
            results: [
              { event_id: undefined, total_exposure: 'not-a-number' }
            ]
          }),
        }),
      });

      const result = await getRiskConcentration(
        { agentID: 'test' },
        mockEnv
      );

      expect(result.isError).toBe(false);
    });

    test('should handle missing optional parameters', async () => {
      const result = await getRiskConcentration({}, mockEnv);

      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      expect(data.agentID).toBe('DEMO');
    });
  });

  describe('getSharpActivity Error Paths', () => {
    test('should handle missing ANALYTICS database', async () => {
      const envWithoutAnalytics = {} as Env;

      const result = await getSharpActivity(
        { agentID: 'test' },
        envWithoutAnalytics
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('ANALYTICS database not available');
    });

    test('should handle database query errors', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockRejectedValue(new Error('Connection lost')),
        }),
      });

      const result = await getSharpActivity(
        { agentID: 'test', lookbackHours: 24 },
        mockEnv
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error tracking sharp activity');
    });

    test('should handle invalid lookbackHours parameter', async () => {
      const result = await getSharpActivity(
        { agentID: 'test', lookbackHours: -24 },
        mockEnv
      );

      expect(result.isError).toBe(false);
    });

    test('should handle zero lookbackHours', async () => {
      const result = await getSharpActivity(
        { agentID: 'test', lookbackHours: 0 },
        mockEnv
      );

      expect(result.isError).toBe(false);
    });

    test('should handle extremely large lookbackHours', async () => {
      const result = await getSharpActivity(
        { agentID: 'test', lookbackHours: 999999 },
        mockEnv
      );

      expect(result.isError).toBe(false);
    });

    test('should handle empty sharp customer results', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({ results: [] }),
        }),
      });

      const result = await getSharpActivity(
        { agentID: 'test' },
        mockEnv
      );

      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      expect(data.summary.total_sharp_customers).toBe(0);
    });

    test('should handle null values in sharp scores', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({
            results: [
              { cid: 'customer1', sharp_score: null, bet_count: 0 }
            ]
          }),
        }),
      });

      const result = await getSharpActivity(
        { agentID: 'test' },
        mockEnv
      );

      expect(result.isError).toBe(false);
    });

    test('should handle negative sharp scores', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({
            results: [
              { cid: 'customer1', sharp_score: -50, bet_count: 10 }
            ]
          }),
        }),
      });

      const result = await getSharpActivity(
        { agentID: 'test' },
        mockEnv
      );

      expect(result.isError).toBe(false);
    });

    test('should handle sharp scores exceeding 100', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockResolvedValue({
            results: [
              { cid: 'customer1', sharp_score: 150, bet_count: 10 }
            ]
          }),
        }),
      });

      const result = await getSharpActivity(
        { agentID: 'test' },
        mockEnv
      );

      expect(result.isError).toBe(false);
    });

    test('should handle missing optional parameters with defaults', async () => {
      const result = await getSharpActivity({}, mockEnv);

      expect(result.isError).toBe(false);
      const data = JSON.parse(result.content[0].text);
      expect(data.agentID).toBe('DEMO');
    });

    test('should handle invalid minSharpScore threshold', async () => {
      const result = await getSharpActivity(
        { agentID: 'test', minSharpScore: -999 },
        mockEnv
      );

      expect(result.isError).toBe(false);
    });

    test('should handle database timeout', async () => {
      (mockEnv.ANALYTICS.prepare as any).mockReturnValue({
        bind: vi.fn().mockReturnValue({
          all: vi.fn().mockImplementation(() =>
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Timeout')), 100)
            )
          ),
        }),
      });

      const result = await getSharpActivity(
        { agentID: 'test' },
        mockEnv
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Timeout');
    });
  });

  describe('General Handler Error Patterns', () => {
    test('should handle concurrent handler calls', async () => {
      const promises = [
        getSteamMoves({ agentID: 'test1' }, mockEnv),
        getRiskConcentration({ agentID: 'test2' }, mockEnv),
        getSharpActivity({ agentID: 'test3' }, mockEnv),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.content).toBeDefined();
        expect(result.isError).toBeDefined();
      });
    });

    test('should handle handler calls with undefined env properties', async () => {
      const partialEnv = {
        ANALYTICS: undefined,
      } as any;

      const result = await getSteamMoves(
        { agentID: 'test' },
        partialEnv
      );

      expect(result.isError).toBe(true);
    });

    test('should handle handler calls with null arguments', async () => {
      const result = await getSteamMoves(
        { agentID: null, lookbackMinutes: null } as any,
        mockEnv
      );

      expect(result.isError).toBe(false);
    });

    test('should handle handler calls with string numbers', async () => {
      const result = await getSteamMoves(
        { agentID: 'test', lookbackMinutes: '60' as any },
        mockEnv
      );

      expect(result.isError).toBe(false);
    });

    test('should handle handler calls with boolean parameters', async () => {
      const result = await getSteamMoves(
        { agentID: 'test', lookbackMinutes: true as any },
        mockEnv
      );

      expect(result.isError).toBe(false);
    });

    test('should preserve error messages in result', async () => {
      const envWithoutAnalytics = {} as Env;

      const result = await getSteamMoves(
        { agentID: 'test' },
        envWithoutAnalytics
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toBeTruthy();
      expect(result.content[0].text.length).toBeGreaterThan(0);
    });
  });
});
