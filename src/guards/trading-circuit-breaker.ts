/**
 * trading-circuit-breaker.ts
 *
 * Circuit breaker for autonomous trading system.
 * Halts trading when risk thresholds are exceeded.
 *
 * Trigger Conditions:
 * - Model uncertainty > 15%
 * - API failures > 3 consecutive
 * - Daily loss > $10,000
 * - Balance delta < -10%
 * - Manual trigger via admin endpoint
 *
 * Requires manual reset after trip.
 */

import type { Env } from '../types/api';

export type CircuitBreakerState = 'closed' | 'open' | 'half_open';
export type TripReason =
  | 'model_uncertainty'
  | 'api_failures'
  | 'daily_loss_limit'
  | 'balance_delta'
  | 'manual_trigger'
  | 'system_error';

export interface CircuitBreakerStatus {
  state: CircuitBreakerState;
  trip_reason?: TripReason;
  trip_timestamp?: string;
  trip_count: number;
  last_check_timestamp: string;
  metrics: {
    model_uncertainty?: number;
    api_failures?: number;
    daily_loss?: number;
    balance_delta?: number;
  };
  auto_reset_allowed: boolean;
}

export interface CircuitBreakerConfig {
  maxModelUncertainty: number; // 0.15 = 15%
  maxConsecutiveFailures: number; // 3
  maxDailyLoss: number; // $10,000
  minBalanceDelta: number; // -0.10 = -10%
  autoResetAfterSeconds?: number; // Optional auto-reset (default: manual only)
}

export class TradingCircuitBreaker {
  private state: CircuitBreakerState = 'closed';
  private tripReason: TripReason | null = null;
  private tripTimestamp: number | null = null;
  private tripCount = 0;
  private consecutiveFailures = 0;

  private readonly config: CircuitBreakerConfig = {
    maxModelUncertainty: 0.15, // 15%
    maxConsecutiveFailures: 3,
    maxDailyLoss: 10000, // $10k
    minBalanceDelta: -0.10, // -10%
    autoResetAfterSeconds: undefined, // Manual reset only by default
  };

  constructor(
    config: Partial<CircuitBreakerConfig>,
    private env: Env
  ) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Check if trading is allowed (circuit is closed)
   */
  isAllowed(): boolean {
    // Check for auto-reset
    if (this.state === 'open' && this.config.autoResetAfterSeconds) {
      const elapsed = Date.now() - (this.tripTimestamp || 0);
      if (elapsed > this.config.autoResetAfterSeconds * 1000) {
        console.log('[CircuitBreaker] Auto-reset triggered');
        this.state = 'half_open';
      }
    }

    return this.state === 'closed' || this.state === 'half_open';
  }

  /**
   * Check model uncertainty and trip if needed
   */
  async checkModelUncertainty(uncertainty: number): Promise<void> {
    if (uncertainty > this.config.maxModelUncertainty) {
      await this.trip('model_uncertainty', {
        model_uncertainty: uncertainty,
      });
    }
  }

  /**
   * Record API failure and trip if threshold exceeded
   */
  async recordAPIFailure(): Promise<void> {
    this.consecutiveFailures++;

    if (this.consecutiveFailures >= this.config.maxConsecutiveFailures) {
      await this.trip('api_failures', {
        api_failures: this.consecutiveFailures,
      });
    }
  }

  /**
   * Reset consecutive failure count (call after successful API call)
   */
  resetAPIFailures(): void {
    this.consecutiveFailures = 0;
  }

  /**
   * Check daily loss and trip if exceeded
   */
  async checkDailyLoss(dailyLoss: number): Promise<void> {
    if (dailyLoss > this.config.maxDailyLoss) {
      await this.trip('daily_loss_limit', {
        daily_loss: dailyLoss,
      });
    }
  }

  /**
   * Check balance delta and trip if below threshold
   */
  async checkBalanceDelta(delta: number): Promise<void> {
    if (delta < this.config.minBalanceDelta) {
      await this.trip('balance_delta', {
        balance_delta: delta,
      });
    }
  }

  /**
   * Manual trip (admin override)
   */
  async manualTrip(reason: string = 'Manual admin override'): Promise<void> {
    await this.trip('manual_trigger', { manual_reason: reason });
  }

  /**
   * Trip the circuit breaker
   */
  private async trip(
    reason: TripReason,
    metrics: Record<string, any> = {}
  ): Promise<void> {
    if (this.state === 'open') {
      // Already tripped
      return;
    }

    console.error(`[CircuitBreaker] 🚨 TRIPPED - Reason: ${reason}`, metrics);

    this.state = 'open';
    this.tripReason = reason;
    this.tripTimestamp = Date.now();
    this.tripCount++;

    // Store state in KV
    await this.persistState();

    // Log to audit trail
    this.env.ANALYTICS_ENGINE.writeDataPoint({
      blobs: [
        'circuit_breaker',
        'tripped',
        reason,
        JSON.stringify(metrics),
      ],
      doubles: [this.tripCount],
      indexes: [Date.now()],
    });
  }

  /**
   * Reset circuit breaker (manual intervention)
   */
  async reset(): Promise<void> {
    console.log('[CircuitBreaker] Manual reset initiated');

    this.state = 'closed';
    this.tripReason = null;
    this.tripTimestamp = null;
    this.consecutiveFailures = 0;

    // Store state in KV
    await this.persistState();

    // Log to audit trail
    this.env.ANALYTICS_ENGINE.writeDataPoint({
      blobs: ['circuit_breaker', 'reset', 'manual'],
      doubles: [this.tripCount],
      indexes: [Date.now()],
    });
  }

  /**
   * Get current status
   */
  getStatus(): CircuitBreakerStatus {
    return {
      state: this.state,
      trip_reason: this.tripReason || undefined,
      trip_timestamp: this.tripTimestamp
        ? new Date(this.tripTimestamp).toISOString()
        : undefined,
      trip_count: this.tripCount,
      last_check_timestamp: new Date().toISOString(),
      metrics: {
        model_uncertainty: undefined,
        api_failures: this.consecutiveFailures,
        daily_loss: undefined,
        balance_delta: undefined,
      },
      auto_reset_allowed: !!this.config.autoResetAfterSeconds,
    };
  }

  /**
   * Persist state to KV
   */
  private async persistState(): Promise<void> {
    const state = {
      state: this.state,
      tripReason: this.tripReason,
      tripTimestamp: this.tripTimestamp,
      tripCount: this.tripCount,
      consecutiveFailures: this.consecutiveFailures,
    };

    // Store in SESSION_STORE KV
    await this.env.SESSION_STORE?.put(
      'circuit_breaker_state',
      this.state,
      { expirationTtl: 86400 } // 24 hours
    );

    await this.env.SESSION_STORE?.put(
      'circuit_breaker_details',
      JSON.stringify(state),
      { expirationTtl: 86400 }
    );
  }

  /**
   * Load state from KV
   */
  async loadState(): Promise<void> {
    try {
      const detailsJson = await this.env.SESSION_STORE?.get('circuit_breaker_details');
      if (detailsJson) {
        const details = JSON.parse(detailsJson);
        this.state = details.state || 'closed';
        this.tripReason = details.tripReason || null;
        this.tripTimestamp = details.tripTimestamp || null;
        this.tripCount = details.tripCount || 0;
        this.consecutiveFailures = details.consecutiveFailures || 0;

        console.log('[CircuitBreaker] Loaded state from KV:', {
          state: this.state,
          tripCount: this.tripCount,
        });
      }
    } catch (error) {
      console.error('[CircuitBreaker] Error loading state:', error);
    }
  }
}

/**
 * Factory function to create circuit breaker
 */
export function createTradingCircuitBreaker(
  env: Env,
  config: Partial<CircuitBreakerConfig> = {}
): TradingCircuitBreaker {
  return new TradingCircuitBreaker(config, env);
}
