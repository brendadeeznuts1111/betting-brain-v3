/**
 * risk-limits.ts
 *
 * Risk limit enforcement for autonomous trading.
 * Hard limits on bet sizes, exposure, and daily volumes.
 */

import type { Env } from '../types/api';

export interface RiskLimits {
  maxBetSize: number; // $1,000
  maxDailyVolume: number; // $10,000
  maxTotalExposure: number; // $50,000
  maxSingleEventExposure: number; // $5,000
  minOdds: number; // 1.01
  maxOdds: number; // 100
}

export interface RiskCheckResult {
  allowed: boolean;
  reason?: string;
  current_daily_volume?: number;
  remaining_daily_limit?: number;
}

export const DEFAULT_RISK_LIMITS: RiskLimits = {
  maxBetSize: 1000,
  maxDailyVolume: 10000,
  maxTotalExposure: 50000,
  maxSingleEventExposure: 5000,
  minOdds: 1.01,
  maxOdds: 100,
};

export class RiskLimitGuard {
  constructor(
    private limits: RiskLimits,
    private env: Env
  ) {}

  async checkBet(
    amount: number,
    odds: number,
    eventId: string
  ): Promise<RiskCheckResult> {
    // Check 1: Bet size
    if (amount > this.limits.maxBetSize) {
      return {
        allowed: false,
        reason: `Bet size $${amount} exceeds max $${this.limits.maxBetSize}`,
      };
    }

    // Check 2: Odds range
    if (odds < this.limits.minOdds || odds > this.limits.maxOdds) {
      return {
        allowed: false,
        reason: `Odds ${odds} outside allowed range [${this.limits.minOdds}, ${this.limits.maxOdds}]`,
      };
    }

    // Check 3: Daily volume
    const dailyVolume = await this.getDailyVolume();
    if (dailyVolume + amount > this.limits.maxDailyVolume) {
      return {
        allowed: false,
        reason: `Daily volume limit exceeded: $${dailyVolume} + $${amount} > $${this.limits.maxDailyVolume}`,
        current_daily_volume: dailyVolume,
        remaining_daily_limit: this.limits.maxDailyVolume - dailyVolume,
      };
    }

    // Check 4: Event exposure
    const eventExposure = await this.getEventExposure(eventId);
    if (eventExposure + amount > this.limits.maxSingleEventExposure) {
      return {
        allowed: false,
        reason: `Event exposure limit exceeded: $${eventExposure} + $${amount} > $${this.limits.maxSingleEventExposure}`,
      };
    }

    // All checks passed
    return {
      allowed: true,
      current_daily_volume: dailyVolume,
      remaining_daily_limit: this.limits.maxDailyVolume - dailyVolume - amount,
    };
  }

  private async getDailyVolume(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const key = `daily_volume_${today}`;
    const value = await this.env.SESSION_STORE?.get(key);
    let parsedValue = Number(value || '0');
    if (isNaN(parsedValue)) {
      console.warn(`[RiskLimitGuard] Invalid daily volume for key: ${key}. Defaulting to 0.`);
      parsedValue = 0;
    }
    return parsedValue;
  }

  private async getEventExposure(eventId: string): Promise<number> {
    const key = `event_exposure_${eventId}`;
    const value = await this.env.SESSION_STORE?.get(key);
    let parsedValue = Number(value || '0');
    if (isNaN(parsedValue)) {
      console.warn(`[RiskLimitGuard] Invalid event exposure for key: ${key}. Defaulting to 0.`);
      parsedValue = 0;
    }
    return parsedValue;
  }

  async recordBet(amount: number, eventId: string): Promise<void> {
    // Update daily volume
    const today = new Date().toISOString().split('T')[0];
    const dailyKey = `daily_volume_${today}`;
    const current = await this.getDailyVolume();
    await this.env.SESSION_STORE?.put(dailyKey, String(current + amount), {
      expirationTtl: 86400,
    });

    // Update event exposure
    const eventKey = `event_exposure_${eventId}`;
    const eventCurrent = await this.getEventExposure(eventId);
    await this.env.SESSION_STORE?.put(eventKey, String(eventCurrent + amount), {
      expirationTtl: 86400,
    });
  }
}

export function createRiskLimitGuard(
  env: Env,
  limits: Partial<RiskLimits> = {}
): RiskLimitGuard {
  return new RiskLimitGuard({ ...DEFAULT_RISK_LIMITS, ...limits }, env);
}
