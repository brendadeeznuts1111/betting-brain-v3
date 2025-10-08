/**
 * trading-logger.ts
 *
 * Comprehensive audit logging for autonomous trading system.
 * Logs all predictions, signals, bets, and circuit breaker events.
 */

import type { Env } from '../types/api';
import type { HoldPrediction } from '../models/hold-predictor';
import type { HedgeSignal } from '../signals/hedge-generator';

export type TradingEvent =
  | 'prediction_made'
  | 'signal_generated'
  | 'signal_validated'
  | 'bet_placed'
  | 'bet_rejected'
  | 'bet_result'
  | 'circuit_breaker_triggered'
  | 'circuit_breaker_reset'
  | 'model_trained'
  | 'alert_sent';

export interface TradingLogEntry {
  event: TradingEvent;
  timestamp: string;
  data: Record<string, any>;
  metadata?: Record<string, any>;
}

export class TradingLogger {
  constructor(private env: Env) {}

  async logPrediction(prediction: HoldPrediction, context: Record<string, any>): Promise<void> {
    await this.log('prediction_made', {
      predicted_hold: prediction.predicted_hold,
      uncertainty: prediction.uncertainty_score,
      r_squared: prediction.model_r_squared,
      confidence_interval: prediction.confidence_interval_95,
      ...context,
    });
  }

  async logSignal(signal: HedgeSignal): Promise<void> {
    await this.log('signal_generated', {
      severity: signal.severity,
      predicted_hold: signal.predicted_hold,
      hedge_amount: signal.hedge_amount,
      recommended_action: signal.recommended_action,
      risk_level: signal.risk_level,
      reasoning: signal.reasoning,
    });
  }

  async logBetPlaced(
    bet_id: string,
    amount: number,
    odds: number,
    market: string,
    side: string,
    signal_id?: string
  ): Promise<void> {
    await this.log('bet_placed', {
      bet_id,
      amount,
      odds,
      market,
      side,
      signal_id,
      estimated_payout: amount * odds,
    });
  }

  async logBetRejected(reason: string, attempted_bet: Record<string, any>): Promise<void> {
    await this.log('bet_rejected', {
      reason,
      attempted_bet,
    });
  }

  async logCircuitBreakerTrip(reason: string, metrics: Record<string, any>): Promise<void> {
    await this.log('circuit_breaker_triggered', {
      reason,
      metrics,
    });
  }

  async logCircuitBreakerReset(): Promise<void> {
    await this.log('circuit_breaker_reset', {});
  }

  async logModelTraining(r_squared: number, std_error: number, samples: number): Promise<void> {
    await this.log('model_trained', {
      r_squared,
      std_error,
      samples,
      quality: r_squared >= 0.85 ? 'excellent' : r_squared >= 0.70 ? 'good' : 'poor',
    });
  }

  private async log(event: TradingEvent, data: Record<string, any>): Promise<void> {
    const entry: TradingLogEntry = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    // Log to Analytics Engine
    this.env.ANALYTICS_ENGINE.writeDataPoint({
      blobs: ['trading_audit', event, JSON.stringify(data)],
      doubles: [Date.now()],
      indexes: [Date.now()],
    });

    // Also log to console
    console.log(`[TradingAudit] ${event}:`, data);
  }
}

export function createTradingLogger(env: Env): TradingLogger {
  return new TradingLogger(env);
}
