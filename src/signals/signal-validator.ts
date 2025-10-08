/**
 * signal-validator.ts
 *
 * Validates hedge signals before execution.
 * Applies risk checks, business rules, and safety constraints.
 */

import type { HedgeSignal } from './hedge-generator';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ValidationRules {
  maxHedgeAmount: number; // Maximum single hedge ($)
  maxDailyHedgeVolume: number; // Maximum daily hedge volume ($)
  minModelConfidence: number; // Minimum R² (0-1)
  maxUncertaintyScore: number; // Maximum uncertainty (0-1)
  minRiskLevel: number; // Only hedge if risk above threshold
  allowedMarkets: string[]; // Whitelisted markets
}

export class SignalValidator {
  private readonly defaultRules: ValidationRules = {
    maxHedgeAmount: 1000, // $1,000 max per hedge
    maxDailyHedgeVolume: 10000, // $10,000 max daily
    minModelConfidence: 0.70, // 70% R² minimum
    maxUncertaintyScore: 0.30, // 30% uncertainty maximum
    minRiskLevel: 25, // Only hedge if risk ≥ 25/100
    allowedMarkets: ['moneyline', 'spread', 'total'],
  };

  constructor(
    private rules: ValidationRules = {} as ValidationRules,
    private dailyHedgeVolume: number = 0 // Track daily volume
  ) {
    // Merge with defaults
    this.rules = { ...this.defaultRules, ...rules };
  }

  /**
   * Validate a hedge signal
   */
  validate(signal: HedgeSignal): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Rule 1: Check hedge amount
    if (signal.hedge_amount > this.rules.maxHedgeAmount) {
      errors.push(
        `Hedge amount $${signal.hedge_amount.toFixed(2)} exceeds max $${this.rules.maxHedgeAmount}`
      );
    }

    // Rule 2: Check daily volume limit
    if (this.dailyHedgeVolume + signal.hedge_amount > this.rules.maxDailyHedgeVolume) {
      errors.push(
        `Daily hedge volume limit reached: $${this.dailyHedgeVolume.toFixed(2)} + $${signal.hedge_amount.toFixed(2)} > $${this.rules.maxDailyHedgeVolume}`
      );
    }

    // Rule 3: Check uncertainty score
    if (signal.uncertainty_score > this.rules.maxUncertaintyScore) {
      errors.push(
        `Model uncertainty ${(signal.uncertainty_score * 100).toFixed(0)}% exceeds max ${(this.rules.maxUncertaintyScore * 100).toFixed(0)}%`
      );
    }

    // Rule 4: Check risk level threshold
    if (signal.risk_level < this.rules.minRiskLevel) {
      warnings.push(
        `Risk level ${signal.risk_level.toFixed(0)}/100 below threshold ${this.rules.minRiskLevel} - hedge may not be necessary`
      );
    }

    // Rule 5: Check market whitelist
    if (!this.rules.allowedMarkets.includes(signal.hedge_market)) {
      errors.push(
        `Market "${signal.hedge_market}" not in whitelist: [${this.rules.allowedMarkets.join(', ')}]`
      );
    }

    // Rule 6: Check odds validity
    if (signal.hedge_odds <= 1.0 || signal.hedge_odds > 100) {
      errors.push(
        `Invalid hedge odds: ${signal.hedge_odds} (must be between 1.0 and 100)`
      );
    }

    // Rule 7: Check severity vs action consistency
    if (signal.severity === 'NONE' && signal.recommended_action !== 'no_action') {
      warnings.push(
        `Inconsistent signal: severity NONE but action is "${signal.recommended_action}"`
      );
    }

    // Rule 8: Check confidence interval sanity
    const [lower, upper] = signal.confidence_interval;
    if (lower > upper) {
      errors.push(`Invalid confidence interval: [${lower}, ${upper}]`);
    }

    // Rule 9: Warn on critical severity
    if (signal.severity === 'CRITICAL') {
      warnings.push(
        `CRITICAL severity signal - manual review recommended before execution`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Batch validate multiple signals
   */
  validateBatch(signals: HedgeSignal[]): Map<HedgeSignal, ValidationResult> {
    const results = new Map<HedgeSignal, ValidationResult>();

    for (const signal of signals) {
      const result = this.validate(signal);
      results.set(signal, result);
    }

    return results;
  }

  /**
   * Update daily hedge volume (call after successful hedge)
   */
  addToDailyHedgeVolume(amount: number): void {
    this.dailyHedgeVolume += amount;
  }

  /**
   * Reset daily hedge volume (call at start of new day)
   */
  resetDailyHedgeVolume(): void {
    this.dailyHedgeVolume = 0;
  }

  /**
   * Get current daily hedge volume
   */
  getDailyHedgeVolume(): number {
    return this.dailyHedgeVolume;
  }

  /**
   * Get validation rules
   */
  getRules(): ValidationRules {
    return { ...this.rules };
  }

  /**
   * Update validation rules
   */
  updateRules(newRules: Partial<ValidationRules>): void {
    this.rules = { ...this.rules, ...newRules };
  }

  /**
   * Check if signal passes all critical checks (no errors)
   */
  isValid(signal: HedgeSignal): boolean {
    return this.validate(signal).valid;
  }

  /**
   * Get only valid signals from batch
   */
  filterValid(signals: HedgeSignal[]): HedgeSignal[] {
    return signals.filter((signal) => this.isValid(signal));
  }

  /**
   * Get validation summary for batch
   */
  getSummary(signals: HedgeSignal[]): {
    total: number;
    valid: number;
    invalid: number;
    with_warnings: number;
  } {
    const results = this.validateBatch(signals);
    let valid = 0;
    let invalid = 0;
    let with_warnings = 0;

    for (const result of results.values()) {
      if (result.valid) {
        valid++;
        if (result.warnings.length > 0) {
          with_warnings++;
        }
      } else {
        invalid++;
      }
    }

    return {
      total: signals.length,
      valid,
      invalid,
      with_warnings,
    };
  }
}

/**
 * Factory function to create validator with default rules
 */
export function createSignalValidator(
  customRules?: Partial<ValidationRules>
): SignalValidator {
  return new SignalValidator(customRules as ValidationRules);
}
