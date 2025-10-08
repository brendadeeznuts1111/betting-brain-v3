/**
 * hedge-generator.ts
 *
 * Generates auto-hedge signals when predicted hold percentage is negative.
 * Calculates optimal hedge amounts, odds, and risk levels.
 *
 * Signal Tiers:
 * - CRITICAL: predicted_hold < -5%
 * - HIGH: -5% ≤ predicted_hold < -2%
 * - MEDIUM: -2% ≤ predicted_hold < 0%
 * - NONE: predicted_hold ≥ 0%
 */

import type { Env } from '../types/api';
import type { HoldPrediction } from '../models/hold-predictor';

export type SignalSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'NONE';

export interface HedgeSignal {
  severity: SignalSeverity;
  predicted_hold: number;
  confidence_interval: [number, number];
  uncertainty_score: number;
  recommended_action: 'hedge_immediately' | 'hedge_soon' | 'monitor' | 'no_action';
  hedge_amount: number; // dollars
  hedge_odds: number; // suggested odds
  hedge_market: string; // market to hedge on
  hedge_side: 'home' | 'away';
  expected_pnl: number; // expected profit/loss after hedge
  risk_level: number; // 0-100
  timestamp: string;
  reasoning: string;
}

export interface HedgeContext {
  event_id: string;
  current_exposure: number; // current liability
  current_volume: number; // total handle
  market: string;
  home_odds: number;
  away_odds: number;
}

export class HedgeSignalGenerator {
  constructor(private env: Env) {}

  /**
   * Generate hedge signal from prediction and context
   */
  async generate(
    prediction: HoldPrediction,
    context: HedgeContext
  ): Promise<HedgeSignal> {
    const predicted_hold = prediction.predicted_hold;
    const severity = this.classifySeverity(predicted_hold);

    // Calculate hedge parameters
    const hedge_amount = this.calculateHedgeAmount(
      predicted_hold,
      context.current_exposure,
      context.current_volume
    );

    const hedge_side = this.determineHedgeSide(context);
    const hedge_odds = hedge_side === 'home' ? context.home_odds : context.away_odds;

    const expected_pnl = this.calculateExpectedPnL(
      predicted_hold,
      context.current_volume,
      hedge_amount
    );

    const risk_level = this.calculateRiskLevel(
      predicted_hold,
      prediction.uncertainty_score,
      context.current_exposure
    );

    const recommended_action = this.determineAction(severity, prediction.uncertainty_score);
    const reasoning = this.generateReasoning(
      severity,
      predicted_hold,
      prediction.uncertainty_score,
      risk_level
    );

    const signal: HedgeSignal = {
      severity,
      predicted_hold,
      confidence_interval: prediction.confidence_interval_95,
      uncertainty_score: prediction.uncertainty_score,
      recommended_action,
      hedge_amount,
      hedge_odds,
      hedge_market: context.market,
      hedge_side,
      expected_pnl,
      risk_level,
      timestamp: new Date().toISOString(),
      reasoning,
    };

    // Log signal to audit trail
    this.env.ANALYTICS_ENGINE.writeDataPoint({
      blobs: [
        'hedge_signal',
        'generated',
        severity,
        context.event_id,
        JSON.stringify(signal),
      ],
      doubles: [predicted_hold, hedge_amount, risk_level],
      indexes: [Date.now()],
    });

    console.log(`[HedgeGenerator] Signal generated:`, {
      severity,
      predicted_hold: predicted_hold.toFixed(2),
      hedge_amount: hedge_amount.toFixed(2),
      action: recommended_action,
    });

    return signal;
  }

  /**
   * Classify signal severity based on predicted hold
   */
  private classifySeverity(predicted_hold: number): SignalSeverity {
    if (predicted_hold < -5) return 'CRITICAL';
    if (predicted_hold < -2) return 'HIGH';
    if (predicted_hold < 0) return 'MEDIUM';
    return 'NONE';
  }

  /**
   * Calculate recommended hedge amount
   */
  private calculateHedgeAmount(
    predicted_hold: number,
    current_exposure: number,
    current_volume: number
  ): number {
    if (predicted_hold >= 0) return 0;

    // Base hedge on predicted loss
    const predicted_loss = (Math.abs(predicted_hold) / 100) * current_volume;

    // Hedge multiplier based on severity
    let multiplier = 1.0;
    if (predicted_hold < -5) {
      multiplier = 1.2; // Hedge 120% for critical
    } else if (predicted_hold < -2) {
      multiplier = 1.0; // Hedge 100% for high
    } else {
      multiplier = 0.8; // Hedge 80% for medium
    }

    const hedge_amount = predicted_loss * multiplier;

    // Cap at current exposure
    return Math.min(hedge_amount, Math.abs(current_exposure));
  }

  /**
   * Determine which side to hedge on
   */
  private determineHedgeSide(context: HedgeContext): 'home' | 'away' {
    // Hedge on the side with less exposure (lower risk)
    // If exposure is positive (favoring home), hedge on away
    return context.current_exposure > 0 ? 'away' : 'home';
  }

  /**
   * Calculate expected P&L after hedge
   */
  private calculateExpectedPnL(
    predicted_hold: number,
    current_volume: number,
    hedge_amount: number
  ): number {
    const predicted_loss = (predicted_hold / 100) * current_volume;
    const hedge_benefit = hedge_amount * 0.5; // Assume 50% hedge effectiveness
    return predicted_loss + hedge_benefit;
  }

  /**
   * Calculate risk level (0-100)
   */
  private calculateRiskLevel(
    predicted_hold: number,
    uncertainty_score: number,
    current_exposure: number
  ): number {
    // Base risk on predicted hold (more negative = higher risk)
    let risk = Math.abs(predicted_hold) * 10; // Scale to 0-100

    // Increase risk if uncertainty is high
    risk = risk * (1 + uncertainty_score);

    // Increase risk if exposure is large
    const exposure_factor = Math.min(1, Math.abs(current_exposure) / 10000);
    risk = risk * (1 + exposure_factor * 0.5);

    return Math.min(100, Math.max(0, risk));
  }

  /**
   * Determine recommended action
   */
  private determineAction(
    severity: SignalSeverity,
    uncertainty_score: number
  ): 'hedge_immediately' | 'hedge_soon' | 'monitor' | 'no_action' {
    if (uncertainty_score > 0.5) {
      // High uncertainty - be cautious
      return severity === 'CRITICAL' ? 'monitor' : 'no_action';
    }

    switch (severity) {
      case 'CRITICAL':
        return 'hedge_immediately';
      case 'HIGH':
        return 'hedge_soon';
      case 'MEDIUM':
        return 'monitor';
      case 'NONE':
      default:
        return 'no_action';
    }
  }

  /**
   * Generate human-readable reasoning
   */
  private generateReasoning(
    severity: SignalSeverity,
    predicted_hold: number,
    uncertainty_score: number,
    risk_level: number
  ): string {
    const parts: string[] = [];

    // Hold prediction
    parts.push(
      `Predicted hold is ${predicted_hold.toFixed(2)}% (${severity} severity)`
    );

    // Uncertainty
    if (uncertainty_score > 0.5) {
      parts.push(`High model uncertainty (${(uncertainty_score * 100).toFixed(0)}%)`);
    } else if (uncertainty_score > 0.3) {
      parts.push(`Moderate model uncertainty (${(uncertainty_score * 100).toFixed(0)}%)`);
    } else {
      parts.push(`Low model uncertainty (${(uncertainty_score * 100).toFixed(0)}%)`);
    }

    // Risk level
    if (risk_level >= 75) {
      parts.push(`EXTREME risk level (${risk_level.toFixed(0)}/100)`);
    } else if (risk_level >= 50) {
      parts.push(`HIGH risk level (${risk_level.toFixed(0)}/100)`);
    } else if (risk_level >= 25) {
      parts.push(`MODERATE risk level (${risk_level.toFixed(0)}/100)`);
    } else {
      parts.push(`LOW risk level (${risk_level.toFixed(0)}/100)`);
    }

    return parts.join('. ') + '.';
  }

  /**
   * Batch generate signals for multiple events
   */
  async generateBatch(
    predictions: Array<{ prediction: HoldPrediction; context: HedgeContext }>
  ): Promise<HedgeSignal[]> {
    const signals = await Promise.all(
      predictions.map(({ prediction, context }) =>
        this.generate(prediction, context)
      )
    );

    // Sort by severity
    const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, NONE: 3 };
    signals.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return signals;
  }
}

/**
 * Factory function to create generator
 */
export function createHedgeSignalGenerator(env: Env): HedgeSignalGenerator {
  return new HedgeSignalGenerator(env);
}
