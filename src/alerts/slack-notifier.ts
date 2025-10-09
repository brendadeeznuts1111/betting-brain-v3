/**
 * slack-notifier.ts
 *
 * Slack webhook integration for trading alerts.
 * Sends formatted notifications for hedge signals, circuit breaker trips, and model updates.
 */

import type { HedgeSignal } from '../signals/hedge-generator';

export interface SlackMessage {
  text: string;
  blocks?: any[];
  attachments?: any[];
}

export class SlackNotifier {
  constructor(private webhookUrl: string) {
    if (!webhookUrl) {
      throw new Error('Slack webhook URL is required');
    }
  }

  /**
   * Send hedge signal alert to Slack
   */
  async sendHedgeSignal(signal: HedgeSignal): Promise<boolean> {
    const color = this.getSeverityColor(signal.severity);
    const emoji = this.getSeverityEmoji(signal.severity);

    const message: SlackMessage = {
      text: `${emoji} ${signal.severity} Hedge Signal`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${emoji} ${signal.severity} Hedge Signal`,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Predicted Hold:*\n${signal.predicted_hold.toFixed(2)}%`,
            },
            {
              type: 'mrkdwn',
              text: `*Risk Level:*\n${signal.risk_level.toFixed(0)}/100`,
            },
            {
              type: 'mrkdwn',
              text: `*Recommended Action:*\n${signal.recommended_action.replace(/_/g, ' ').toUpperCase()}`,
            },
            {
              type: 'mrkdwn',
              text: `*Uncertainty:*\n${(signal.uncertainty_score * 100).toFixed(0)}%`,
            },
          ],
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Hedge Amount:*\n$${signal.hedge_amount.toFixed(2)}`,
            },
            {
              type: 'mrkdwn',
              text: `*Hedge Odds:*\n${signal.hedge_odds.toFixed(2)}`,
            },
            {
              type: 'mrkdwn',
              text: `*Market:*\n${signal.hedge_market}`,
            },
            {
              type: 'mrkdwn',
              text: `*Side:*\n${signal.hedge_side.toUpperCase()}`,
            },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Reasoning:*\n${signal.reasoning}`,
          },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Expected P&L: $${signal.expected_pnl.toFixed(2)} | Confidence Interval: [${signal.confidence_interval[0].toFixed(2)}%, ${signal.confidence_interval[1].toFixed(2)}%] | ${new Date(Date.now()).toISOString()}`,
            },
          ],
        },
      ],
    };

    return this.send(message);
  }

  /**
   * Send circuit breaker alert
   */
  async sendCircuitBreakerAlert(reason: string, metrics: Record<string, any>): Promise<boolean> {
    const message: SlackMessage = {
      text: '🚨 CIRCUIT BREAKER TRIGGERED',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🚨 CIRCUIT BREAKER TRIGGERED',
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Reason:* ${reason}`,
          },
        },
        {
          type: 'section',
          fields: Object.entries(metrics).map(([key, value]) => ({
            type: 'mrkdwn',
            text: `*${key}:*\n${value}`,
          })),
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '⚠️ *Trading has been halted. Manual intervention required.*',
          },
        },
      ],
    };

    return this.send(message);
  }

  /**
   * Send model training update
   */
  async sendModelUpdate(
    r_squared: number,
    std_error: number,
    samples: number
  ): Promise<boolean> {
    const quality = r_squared >= 0.85 ? '✅ Excellent' : r_squared >= 0.70 ? '⚠️ Good' : '❌ Poor';

    const message: SlackMessage = {
      text: '🤖 Model Training Complete',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🤖 Model Training Complete',
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*R² (Fit):*\n${r_squared.toFixed(4)}`,
            },
            {
              type: 'mrkdwn',
              text: `*Std Error:*\n${std_error.toFixed(4)}`,
            },
            {
              type: 'mrkdwn',
              text: `*Samples:*\n${samples}`,
            },
            {
              type: 'mrkdwn',
              text: `*Quality:*\n${quality}`,
            },
          ],
        },
      ],
    };

    return this.send(message);
  }

  /**
   * Send bet execution confirmation
   */
  async sendBetConfirmation(
    bet_id: string,
    amount: number,
    odds: number,
    market: string,
    side: string
  ): Promise<boolean> {
    const message: SlackMessage = {
      text: '✅ Hedge Bet Placed',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '✅ Hedge Bet Placed',
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Bet ID:*\n\`${bet_id}\``,
            },
            {
              type: 'mrkdwn',
              text: `*Amount:*\n$${amount.toFixed(2)}`,
            },
            {
              type: 'mrkdwn',
              text: `*Odds:*\n${odds.toFixed(2)}`,
            },
            {
              type: 'mrkdwn',
              text: `*Market:*\n${market} (${side.toUpperCase()})`,
            },
          ],
        },
      ],
    };

    return this.send(message);
  }

  /**
   * Send generic alert message
   */
  async sendAlert(title: string, message: string, severity: 'info' | 'warning' | 'error' = 'info'): Promise<boolean> {
    const emoji = severity === 'error' ? '🚨' : severity === 'warning' ? '⚠️' : 'ℹ️';

    const slackMessage: SlackMessage = {
      text: `${emoji} ${title}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${emoji} ${title}`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: message,
          },
        },
      ],
    };

    return this.send(slackMessage);
  }

  /**
   * Send message to Slack webhook
   */
  private async send(message: SlackMessage): Promise<boolean> {
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        console.error('[SlackNotifier] Failed to send message:', response.status, response.statusText);
        return false;
      }

      console.log('[SlackNotifier] Message sent successfully');
      return true;
    } catch (error) {
      console.error('[SlackNotifier] Error sending message:', error);
      return false;
    }
  }

  /**
   * Get color for severity level
   */
  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'CRITICAL':
        return '#FF0000'; // Red
      case 'HIGH':
        return '#FF6600'; // Orange
      case 'MEDIUM':
        return '#FFCC00'; // Yellow
      default:
        return '#00CC00'; // Green
    }
  }

  /**
   * Get emoji for severity level
   */
  private getSeverityEmoji(severity: string): string {
    switch (severity) {
      case 'CRITICAL':
        return '🚨';
      case 'HIGH':
        return '⚠️';
      case 'MEDIUM':
        return '⚡';
      default:
        return 'ℹ️';
    }
  }
}

/**
 * Factory function to create Slack notifier
 */
export function createSlackNotifier(webhookUrl: string): SlackNotifier {
  return new SlackNotifier(webhookUrl);
}
