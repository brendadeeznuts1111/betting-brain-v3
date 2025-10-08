/**
 * Formatting Utility Tests
 * Tests the formatting utility functions for currency, percentages, and timestamps
 */

import { describe, test, expect } from "bun:test";

// Import the formatting utilities
import {
  formatCurrency,
  formatPercentage,
  formatTimestamp,
  formatDuration,
  formatNumber,
  formatBytes,
  formatRelativeTime,
  formatExposureMetrics,
  formatSharpScoreMetrics,
  formatHoldMetrics,
  formatCLVMetrics,
  formatSteamMoveMetrics,
  formatTable,
  formatJSON
} from '../../src/utils/formatting';

describe('Formatting Utility Tests', () => {
  describe('Currency Formatting', () => {
    test('should format positive currency values', () => {
      expect(formatCurrency(1000)).toBe('$1,000');
      expect(formatCurrency(1234.56)).toBe('$1,235');
      expect(formatCurrency(1000000)).toBe('$1,000,000');
    });

    test('should format negative currency values', () => {
      expect(formatCurrency(-1000)).toBe('-$1,000');
      expect(formatCurrency(-1234.56)).toBe('-$1,235');
    });

    test('should format zero currency values', () => {
      expect(formatCurrency(0)).toBe('$0');
    });

    test('should handle decimal precision', () => {
      expect(formatCurrency(1000.123)).toBe('$1,000');
      expect(formatCurrency(1000.126)).toBe('$1,000');
    });

    test('should handle large numbers', () => {
      expect(formatCurrency(999999999.99)).toBe('$1,000,000,000');
    });
  });

  describe('Percentage Formatting', () => {
    test('should format positive percentages', () => {
      expect(formatPercentage(0.05)).toBe('0.05%');
      expect(formatPercentage(0.1234)).toBe('0.12%');
      expect(formatPercentage(1.0)).toBe('1.00%');
    });

    test('should format negative percentages', () => {
      expect(formatPercentage(-0.05)).toBe('-0.05%');
      expect(formatPercentage(-0.1234)).toBe('-0.12%');
    });

    test('should format zero percentages', () => {
      expect(formatPercentage(0)).toBe('0.00%');
    });

    test('should handle decimal precision', () => {
      expect(formatPercentage(0.12345)).toBe('0.12%');
      expect(formatPercentage(0.12344)).toBe('0.12%');
    });

    test('should handle large percentages', () => {
      expect(formatPercentage(2.5)).toBe('2.50%');
    });
  });

  describe('Timestamp Formatting', () => {
    test('should format ISO timestamps', () => {
      const timestamp = '2025-10-07T10:30:00Z';
      const formatted = formatTimestamp(timestamp);
      expect(formatted).toContain('2025');
      expect(formatted).toContain('Oct');
      expect(formatted).toContain('7');
    });

    test('should format Date objects', () => {
      const date = new Date('2025-10-07T10:30:00Z');
      const formatted = formatTimestamp(date);
      expect(formatted).toContain('2025');
      expect(formatted).toContain('Oct');
      expect(formatted).toContain('7');
    });

    test('should handle invalid timestamps', () => {
      const formatted = formatTimestamp('invalid');
      expect(formatted).toBe('Invalid Date');
    });

    test('should format timestamps without time', () => {
      const timestamp = '2025-10-07T10:30:00Z';
      const formatted = formatTimestamp(timestamp, false);
      expect(formatted).toContain('2025');
      expect(formatted).toContain('Oct');
      expect(formatted).toContain('7');
      expect(formatted).not.toContain('10:30');
    });
  });

  describe('Duration Formatting', () => {
    test('should format milliseconds', () => {
      expect(formatDuration(500)).toBe('500ms');
      expect(formatDuration(999)).toBe('999ms');
    });

    test('should format seconds', () => {
      expect(formatDuration(1000)).toBe('1.00s');
      expect(formatDuration(1500)).toBe('1.50s');
      expect(formatDuration(59999)).toBe('60.00s');
    });

    test('should format minutes', () => {
      expect(formatDuration(60000)).toBe('1.00m');
      expect(formatDuration(90000)).toBe('1.50m');
      expect(formatDuration(3599999)).toBe('60.00m');
    });

    test('should format hours', () => {
      expect(formatDuration(3600000)).toBe('1.00h');
      expect(formatDuration(7200000)).toBe('2.00h');
    });

    test('should handle zero duration', () => {
      expect(formatDuration(0)).toBe('0ms');
    });
  });

  describe('Number Formatting', () => {
    test('should format integers', () => {
      expect(formatNumber(1000)).toBe('1,000.00');
      expect(formatNumber(1234567)).toBe('1,234,567.00');
    });

    test('should format decimals', () => {
      expect(formatNumber(1000.123)).toBe('1,000.12');
      expect(formatNumber(1234.5678)).toBe('1,234.57');
    });

    test('should handle zero', () => {
      expect(formatNumber(0)).toBe('0.00');
    });

    test('should handle negative numbers', () => {
      expect(formatNumber(-1000)).toBe('-1,000.00');
      expect(formatNumber(-1234.567)).toBe('-1,234.57');
    });

    test('should handle custom decimal places', () => {
      expect(formatNumber(1000.123, 0)).toBe('1,000');
      expect(formatNumber(1000.123, 4)).toBe('1,000.1230');
    });
  });

  describe('Bytes Formatting', () => {
    test('should format bytes', () => {
      expect(formatBytes(1024)).toBe('1.00 KB');
      expect(formatBytes(1048576)).toBe('1.00 MB');
      expect(formatBytes(1073741824)).toBe('1.00 GB');
    });

    test('should format bytes with precision', () => {
      expect(formatBytes(1536)).toBe('1.50 KB');
      expect(formatBytes(1572864)).toBe('1.50 MB');
    });

    test('should handle zero bytes', () => {
      expect(formatBytes(0)).toBe('0.00 B');
    });

    test('should handle small bytes', () => {
      expect(formatBytes(512)).toBe('512.00 B');
      expect(formatBytes(999)).toBe('999.00 B');
    });
  });

  describe('Relative Time Formatting', () => {
    test('should format recent times', () => {
      const now = new Date();
      const recent = new Date(now.getTime() - 30000); // 30 seconds ago
      expect(formatRelativeTime(recent)).toBe('30s ago');
    });

    test('should format minutes ago', () => {
      const now = new Date();
      const minutesAgo = new Date(now.getTime() - 300000); // 5 minutes ago
      expect(formatRelativeTime(minutesAgo)).toBe('5m ago');
    });

    test('should format hours ago', () => {
      const now = new Date();
      const hoursAgo = new Date(now.getTime() - 7200000); // 2 hours ago
      expect(formatRelativeTime(hoursAgo)).toBe('2h ago');
    });

    test('should format days ago', () => {
      const now = new Date();
      const daysAgo = new Date(now.getTime() - 172800000); // 2 days ago
      expect(formatRelativeTime(daysAgo)).toBe('2d ago');
    });

    test('should handle just now', () => {
      const now = new Date();
      expect(formatRelativeTime(now)).toBe('just now');
    });
  });

  describe('Exposure Metrics Formatting', () => {
    test('should format exposure metrics', () => {
      const metrics = {
        eventId: 'nba_123',
        totalRisk: 10000,
        maxExposure: 5000,
        lastUpdated: new Date(),
        sides: [
          { side: 'HOME', risk: 6000, net: 1000, percentage: 0.6 },
          { side: 'AWAY', risk: 4000, net: -500, percentage: 0.4 }
        ]
      };

      const formatted = formatExposureMetrics(metrics);
      expect(formatted).toContain('nba_123');
      expect(formatted).toContain('$10,000');
      expect(formatted).toContain('$5,000');
      expect(formatted).toContain('HOME');
      expect(formatted).toContain('AWAY');
    });
  });

  describe('Sharp Score Metrics Formatting', () => {
    test('should format sharp score metrics', () => {
      const metrics = {
        customerId: 'cust_123',
        sharpScore: 65,
        clv: 2500,
        winRate: 0.55,
        actionCount: 100,
        lastUpdated: new Date()
      };

      const formatted = formatSharpScoreMetrics(metrics);
      expect(formatted).toContain('cust_123');
      expect(formatted).toContain('65.0/100');
      expect(formatted).toContain('$2,500');
      expect(formatted).toContain('0.55%');
      expect(formatted).toContain('100');
    });
  });

  describe('Hold Metrics Formatting', () => {
    test('should format hold metrics', () => {
      const metrics = {
        eventId: 'nba_123',
        marketType: 'SPREAD',
        holdPercentage: 0.05,
        totalVolume: 50000,
        totalRisk: 25000,
        alertThreshold: { min: 0.04, max: 0.08 },
        lastUpdated: new Date()
      };

      const formatted = formatHoldMetrics(metrics);
      expect(formatted).toContain('nba_123');
      expect(formatted).toContain('SPREAD');
      expect(formatted).toContain('0.05%');
      expect(formatted).toContain('$50,000');
      expect(formatted).toContain('$25,000');
    });
  });

  describe('CLV Metrics Formatting', () => {
    test('should format CLV metrics', () => {
      const metrics = {
        customerId: 'cust_123',
        lifetimeValue: 5000,
        winRate: 0.52,
        actionCount: 200,
        netBet: 1000,
        alertThreshold: -0.02,
        lastUpdated: new Date()
      };

      const formatted = formatCLVMetrics(metrics);
      expect(formatted).toContain('cust_123');
      expect(formatted).toContain('$5,000');
      expect(formatted).toContain('0.52%');
      expect(formatted).toContain('200');
      expect(formatted).toContain('$1,000');
    });
  });

  describe('Steam Move Metrics Formatting', () => {
    test('should format steam move metrics', () => {
      const metrics = {
        eventId: 'nba_123',
        marketType: 'SPREAD',
        lineChange: 5,
        volumeChange: 15000,
        sigma: 0.47,
        isSteamMove: true,
        timestamp: new Date()
      };

      const formatted = formatSteamMoveMetrics(metrics);
      expect(formatted).toContain('nba_123');
      expect(formatted).toContain('SPREAD');
      expect(formatted).toContain('+5');
      expect(formatted).toContain('+15,000');
      expect(formatted).toContain('0.47σ');
      expect(formatted).toContain('🔥 YES');
    });
  });

  describe('Table Formatting', () => {
    test('should format table data', () => {
      const data = [
        { name: 'John', age: 30, city: 'New York' },
        { name: 'Jane', age: 25, city: 'Los Angeles' }
      ];
      const columns = ['name', 'age', 'city'];

      const formatted = formatTable(data, columns);
      expect(formatted).toContain('name');
      expect(formatted).toContain('age');
      expect(formatted).toContain('city');
      expect(formatted).toContain('John');
      expect(formatted).toContain('Jane');
    });

    test('should handle empty data', () => {
      const data: any[] = [];
      const columns = ['name', 'age'];

      const formatted = formatTable(data, columns);
      expect(formatted).toBe('No data');
    });
  });

  describe('JSON Formatting', () => {
    test('should format JSON with default indent', () => {
      const data = { name: 'John', age: 30 };
      const formatted = formatJSON(data);
      expect(formatted).toContain('"name": "John"');
      expect(formatted).toContain('"age": 30');
    });

    test('should format JSON with custom indent', () => {
      const data = { name: 'John', age: 30 };
      const formatted = formatJSON(data, 4);
      expect(formatted).toContain('    "name": "John"');
      expect(formatted).toContain('    "age": 30');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle null and undefined values', () => {
      expect(formatCurrency(null as any)).toBe('$0');
      expect(formatPercentage(undefined as any)).toBe('NaN%');
      expect(formatNumber(null as any)).toBe('0.00');
    });

    test('should handle NaN values', () => {
      expect(formatCurrency(NaN)).toBe('$NaN');
      expect(formatPercentage(NaN)).toBe('NaN%');
      expect(formatNumber(NaN)).toBe('NaN');
    });

    test('should handle Infinity values', () => {
      expect(formatCurrency(Infinity)).toBe('$∞');
      expect(formatPercentage(Infinity)).toBe('Infinity%');
      expect(formatNumber(Infinity)).toBe('∞');
    });

    test('should handle very small numbers', () => {
      expect(formatCurrency(0.001)).toBe('$0');
      expect(formatPercentage(0.0001)).toBe('0.00%');
    });

    test('should handle very large numbers', () => {
      expect(formatCurrency(1e15)).toBe('$1,000,000,000,000,000');
      expect(formatPercentage(1e10)).toBe('10000000000.00%');
    });
  });
});