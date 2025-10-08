/**
 * alert-manager.ts
 *
 * Unified alert dispatcher managing Slack and Telegram notifications.
 * Handles rate limiting, priority queuing, and delivery tracking.
 */

import type { HedgeSignal } from '../signals/hedge-generator';
import { SlackNotifier, createSlackNotifier } from './slack-notifier';
import { TelegramNotifier, createTelegramNotifier } from './telegram-notifier';
import type { Env } from '../types/api';

export type AlertChannel = 'slack' | 'telegram' | 'both';
export type AlertPriority = 'critical' | 'high' | 'normal' | 'low';

export interface Alert {
  id: string;
  type: 'hedge_signal' | 'circuit_breaker' | 'model_update' | 'bet_confirmation' | 'generic';
  priority: AlertPriority;
  channels: AlertChannel;
  payload: any;
  timestamp: string;
  delivered: {
    slack: boolean;
    telegram: boolean;
  };
  attempts: number;
}

export interface AlertManagerConfig {
  enableSlack: boolean;
  enableTelegram: boolean;
  maxRetries: number;
  rateLimitPerMinute: number;
}

export class AlertManager {
  private slack: SlackNotifier | null = null;
  private telegram: TelegramNotifier | null = null;
  private alertQueue: Alert[] = [];
  private deliveryCount = 0;
  private lastResetTime = Date.now();

  constructor(
    private config: AlertManagerConfig,
    private env: Env,
    slackWebhook?: string,
    telegramBot?: { token: string; chatId: string }
  ) {
    // Initialize Slack
    if (config.enableSlack && slackWebhook) {
      this.slack = createSlackNotifier(slackWebhook);
      console.log('[AlertManager] Slack notifier enabled');
    }

    // Initialize Telegram
    if (config.enableTelegram && telegramBot) {
      this.telegram = createTelegramNotifier(telegramBot.token, telegramBot.chatId);
      console.log('[AlertManager] Telegram notifier enabled');
    }
  }

  /**
   * Send hedge signal alert
   */
  async sendHedgeSignal(signal: HedgeSignal, channels: AlertChannel = 'both'): Promise<boolean> {
    const alert: Alert = {
      id: this.generateAlertId(),
      type: 'hedge_signal',
      priority: this.mapSeverityToPriority(signal.severity),
      channels,
      payload: signal,
      timestamp: new Date().toISOString(),
      delivered: { slack: false, telegram: false },
      attempts: 0,
    };

    return this.dispatch(alert);
  }

  /**
   * Send circuit breaker alert
   */
  async sendCircuitBreakerAlert(
    reason: string,
    metrics: Record<string, any>,
    channels: AlertChannel = 'both'
  ): Promise<boolean> {
    const alert: Alert = {
      id: this.generateAlertId(),
      type: 'circuit_breaker',
      priority: 'critical',
      channels,
      payload: { reason, metrics },
      timestamp: new Date().toISOString(),
      delivered: { slack: false, telegram: false },
      attempts: 0,
    };

    return this.dispatch(alert);
  }

  /**
   * Send model update notification
   */
  async sendModelUpdate(
    r_squared: number,
    std_error: number,
    samples: number,
    channels: AlertChannel = 'both'
  ): Promise<boolean> {
    const alert: Alert = {
      id: this.generateAlertId(),
      type: 'model_update',
      priority: 'normal',
      channels,
      payload: { r_squared, std_error, samples },
      timestamp: new Date().toISOString(),
      delivered: { slack: false, telegram: false },
      attempts: 0,
    };

    return this.dispatch(alert);
  }

  /**
   * Send bet confirmation
   */
  async sendBetConfirmation(
    bet_id: string,
    amount: number,
    odds: number,
    market: string,
    side: string,
    channels: AlertChannel = 'both'
  ): Promise<boolean> {
    const alert: Alert = {
      id: this.generateAlertId(),
      type: 'bet_confirmation',
      priority: 'high',
      channels,
      payload: { bet_id, amount, odds, market, side },
      timestamp: new Date().toISOString(),
      delivered: { slack: false, telegram: false },
      attempts: 0,
    };

    return this.dispatch(alert);
  }

  /**
   * Send generic alert
   */
  async sendAlert(
    title: string,
    message: string,
    severity: 'info' | 'warning' | 'error' = 'info',
    channels: AlertChannel = 'both'
  ): Promise<boolean> {
    const priority = severity === 'error' ? 'critical' : severity === 'warning' ? 'high' : 'normal';

    const alert: Alert = {
      id: this.generateAlertId(),
      type: 'generic',
      priority,
      channels,
      payload: { title, message, severity },
      timestamp: new Date().toISOString(),
      delivered: { slack: false, telegram: false },
      attempts: 0,
    };

    return this.dispatch(alert);
  }

  /**
   * Dispatch alert to configured channels
   */
  private async dispatch(alert: Alert): Promise<boolean> {
    // Check rate limit
    if (!this.checkRateLimit()) {
      console.warn('[AlertManager] Rate limit exceeded, queueing alert');
      this.alertQueue.push(alert);
      return false;
    }

    let success = true;

    // Send to Slack
    if (this.shouldSendToSlack(alert.channels) && this.slack) {
      const slackSuccess = await this.sendToSlack(alert);
      alert.delivered.slack = slackSuccess;
      success = success && slackSuccess;
    }

    // Send to Telegram
    if (this.shouldSendToTelegram(alert.channels) && this.telegram) {
      const telegramSuccess = await this.sendToTelegram(alert);
      alert.delivered.telegram = telegramSuccess;
      success = success && telegramSuccess;
    }

    alert.attempts++;
    this.deliveryCount++;

    // Log to audit trail
    this.env.ANALYTICS_ENGINE.writeDataPoint({
      blobs: [
        'alert_manager',
        'dispatched',
        alert.type,
        alert.priority,
        JSON.stringify(alert.delivered),
      ],
      doubles: [alert.attempts],
      indexes: [Date.now()],
    });

    return success;
  }

  /**
   * Send alert to Slack
   */
  private async sendToSlack(alert: Alert): Promise<boolean> {
    if (!this.slack) return false;

    try {
      switch (alert.type) {
        case 'hedge_signal':
          return await this.slack.sendHedgeSignal(alert.payload);
        case 'circuit_breaker':
          return await this.slack.sendCircuitBreakerAlert(
            alert.payload.reason,
            alert.payload.metrics
          );
        case 'model_update':
          return await this.slack.sendModelUpdate(
            alert.payload.r_squared,
            alert.payload.std_error,
            alert.payload.samples
          );
        case 'bet_confirmation':
          return await this.slack.sendBetConfirmation(
            alert.payload.bet_id,
            alert.payload.amount,
            alert.payload.odds,
            alert.payload.market,
            alert.payload.side
          );
        case 'generic':
          return await this.slack.sendAlert(
            alert.payload.title,
            alert.payload.message,
            alert.payload.severity
          );
        default:
          return false;
      }
    } catch (error) {
      console.error('[AlertManager] Slack delivery failed:', error);
      return false;
    }
  }

  /**
   * Send alert to Telegram
   */
  private async sendToTelegram(alert: Alert): Promise<boolean> {
    if (!this.telegram) return false;

    try {
      switch (alert.type) {
        case 'hedge_signal':
          return await this.telegram.sendHedgeSignal(alert.payload);
        case 'circuit_breaker':
          return await this.telegram.sendCircuitBreakerAlert(
            alert.payload.reason,
            alert.payload.metrics
          );
        case 'model_update':
          return await this.telegram.sendModelUpdate(
            alert.payload.r_squared,
            alert.payload.std_error,
            alert.payload.samples
          );
        case 'bet_confirmation':
          return await this.telegram.sendBetConfirmation(
            alert.payload.bet_id,
            alert.payload.amount,
            alert.payload.odds,
            alert.payload.market,
            alert.payload.side
          );
        case 'generic':
          return await this.telegram.sendAlert(
            alert.payload.title,
            alert.payload.message,
            alert.payload.severity
          );
        default:
          return false;
      }
    } catch (error) {
      console.error('[AlertManager] Telegram delivery failed:', error);
      return false;
    }
  }

  /**
   * Check rate limit
   */
  private checkRateLimit(): boolean {
    const now = Date.now();
    const elapsed = now - this.lastResetTime;

    // Reset counter every minute
    if (elapsed >= 60000) {
      this.deliveryCount = 0;
      this.lastResetTime = now;
      return true;
    }

    return this.deliveryCount < this.config.rateLimitPerMinute;
  }

  /**
   * Process queued alerts
   */
  async processQueue(): Promise<number> {
    let processed = 0;

    while (this.alertQueue.length > 0 && this.checkRateLimit()) {
      const alert = this.alertQueue.shift();
      if (alert) {
        await this.dispatch(alert);
        processed++;
      }
    }

    return processed;
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    queueLength: number;
    deliveryCount: number;
    rateLimitRemaining: number;
  } {
    return {
      queueLength: this.alertQueue.length,
      deliveryCount: this.deliveryCount,
      rateLimitRemaining: Math.max(
        0,
        this.config.rateLimitPerMinute - this.deliveryCount
      ),
    };
  }

  /**
   * Helper methods
   */
  private shouldSendToSlack(channels: AlertChannel): boolean {
    return (channels === 'slack' || channels === 'both') && this.config.enableSlack;
  }

  private shouldSendToTelegram(channels: AlertChannel): boolean {
    return (channels === 'telegram' || channels === 'both') && this.config.enableTelegram;
  }

  private mapSeverityToPriority(severity: string): AlertPriority {
    switch (severity) {
      case 'CRITICAL':
        return 'critical';
      case 'HIGH':
        return 'high';
      case 'MEDIUM':
        return 'normal';
      default:
        return 'low';
    }
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Factory function to create alert manager
 */
export function createAlertManager(
  env: Env,
  options: {
    slackWebhook?: string;
    telegramToken?: string;
    telegramChatId?: string;
  } = {}
): AlertManager {
  const config: AlertManagerConfig = {
    enableSlack: !!options.slackWebhook,
    enableTelegram: !!(options.telegramToken && options.telegramChatId),
    maxRetries: 3,
    rateLimitPerMinute: 30, // 30 alerts per minute max
  };

  return new AlertManager(
    config,
    env,
    options.slackWebhook,
    options.telegramToken && options.telegramChatId
      ? { token: options.telegramToken, chatId: options.telegramChatId }
      : undefined
  );
}
