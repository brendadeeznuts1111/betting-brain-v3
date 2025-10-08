/**
 * Cost Cap Guardrails
 * Hard-wired cost controls with graceful degradation
 */

import { CostCapConfig } from '../types/api';
import { CostCapMetrics } from '../types/metrics';
import { Env } from '../types/api';

export class CostCapGuard {
  private config: CostCapConfig;

  constructor(config: CostCapConfig) {
    this.config = config;
  }

  /**
   * Check if request is within cost limits
   */
  async checkRequest(request: Request, env: Env): Promise<{
    allowed: boolean;
    reason?: string;
    metrics: CostCapMetrics;
  }> {
    const metrics = await this.getCurrentMetrics(env);
    
    // Check D1 limits
    if (metrics.d1.percentage > 90) {
      return {
        allowed: false,
        reason: 'D1 database approaching capacity limit',
        metrics
      };
    }

    // Check queue limits
    if (metrics.queue.percentage > 90) {
      return {
        allowed: false,
        reason: 'Queue operations approaching monthly limit',
        metrics
      };
    }

    // Check analytics limits
    if (metrics.analytics.percentage > 90) {
      return {
        allowed: false,
        reason: 'Analytics Engine approaching monthly limit',
        metrics
      };
    }

    // Check request limits
    if (metrics.requests.percentage > 90) {
      return {
        allowed: false,
        reason: 'Request rate approaching daily limit',
        metrics
      };
    }

    return { allowed: true, metrics };
  }

  /**
   * Get current cost metrics
   */
  private async getCurrentMetrics(env: Env): Promise<CostCapMetrics> {
    const [d1Metrics, queueMetrics, analyticsMetrics, requestMetrics] = await Promise.all([
      this.getD1Metrics(env),
      this.getQueueMetrics(env),
      this.getAnalyticsMetrics(env),
      this.getRequestMetrics(env)
    ]);

    return {
      requests: requestMetrics,
      d1: d1Metrics,
      queue: queueMetrics,
      analytics: analyticsMetrics
    };
  }

  /**
   * Get D1 database metrics
   */
  private async getD1Metrics(env: Env): Promise<CostCapMetrics['d1']> {
    try {
      // Get database size and row count
      const sizeResult = await env.ANALYTICS.prepare(`
        SELECT 
          SUM(pgsize) as size,
          COUNT(*) as rows
        FROM dbstat
        WHERE name NOT LIKE 'sqlite_%'
      `).first() as { size: number; rows: number } | null;

      const size = typeof sizeResult?.size === 'number' ? sizeResult.size : 0;
      const rows = typeof sizeResult?.rows === 'number' ? sizeResult.rows : 0;

      return {
        size,
        rows,
        limit: {
          size: this.config.d1.maxSize,
          rows: this.config.d1.maxRows
        },
        percentage: Math.min(
          (size / this.config.d1.maxSize) * 100,
          (rows / this.config.d1.maxRows) * 100
        )
      };
    } catch (error) {
      console.error('Error getting D1 metrics:', error);
      return {
        size: 0,
        rows: 0,
        limit: {
          size: this.config.d1.maxSize,
          rows: this.config.d1.maxRows
        },
        percentage: 0
      };
    }
  }

  /**
   * Get queue metrics
   */
  private async getQueueMetrics(env: Env): Promise<CostCapMetrics['queue']> {
    // In a real implementation, you'd track queue operations
    // For now, return estimated values
    const operations = 0; // This would be tracked in a counter
    
    return {
      operations,
      limit: this.config.queue.maxOperationsPerMonth,
      percentage: (operations / this.config.queue.maxOperationsPerMonth) * 100
    };
  }

  /**
   * Get analytics engine metrics
   */
  private async getAnalyticsMetrics(env: Env): Promise<CostCapMetrics['analytics']> {
    // In a real implementation, you'd query analytics engine
    // For now, return estimated values
    const points = 0; // This would be tracked in a counter
    
    return {
      points,
      limit: this.config.analytics.maxPointsPerMonth,
      percentage: (points / this.config.analytics.maxPointsPerMonth) * 100
    };
  }

  /**
   * Get request metrics
   */
  private async getRequestMetrics(env: Env): Promise<CostCapMetrics['requests']> {
    // In a real implementation, you'd track requests per day
    // For now, return estimated values
    const current = 0; // This would be tracked in a counter
    
    return {
      current,
      limit: this.config.requests.maxPerDay,
      percentage: (current / this.config.requests.maxPerDay) * 100
    };
  }

  /**
   * Apply TTL cleanup to D1 database
   */
  async applyTTLCleanup(env: Env): Promise<void> {
    try {
      // Clean up old line movements (7-day TTL)
      const stmt1 = env.ANALYTICS.prepare(`
        DELETE FROM line_movements 
        WHERE ing < datetime('now', '-7 days')
      `);
      await stmt1.run();

      // Clean up old steam dedupe (5-minute TTL)
      const stmt2 = env.ANALYTICS.prepare(`
        DELETE FROM steam_dedupe 
        WHERE ts < datetime('now', '-5 minutes')
      `);
      await stmt2.run();

      console.log('TTL cleanup completed');
    } catch (error) {
      console.error('Error during TTL cleanup:', error);
    }
  }

  /**
   * Apply sampling to analytics data
   */
  applySampling(data: any[]): any[] {
    if (!data || !Array.isArray(data) || this.config.analytics.samplingRate >= 1.0) {
      return data || [];
    }

    const sampleSize = Math.floor(data.length * this.config.analytics.samplingRate);
    return data.slice(0, sampleSize);
  }
}

// Default configuration
export const defaultCostCapConfig: CostCapConfig = {
  d1: {
    maxSize: 5 * 1024 * 1024 * 1024, // 5GB
    maxRows: 50_000_000, // 50M rows
    ttlDays: 7
  },
  queue: {
    maxOperationsPerMonth: 1_000_000, // 1M ops
    maxBatchSize: 10
  },
  analytics: {
    maxPointsPerMonth: 25_000_000, // 25M points
    samplingRate: 0.1 // 10% sampling when approaching limit
  },
  requests: {
    maxPerDay: 100_000, // 100k requests/day
    hardStop: true
  }
};

// Global instance
export const costCapGuard = new CostCapGuard(defaultCostCapConfig);
