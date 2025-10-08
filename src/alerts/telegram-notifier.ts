/**
 * telegram-notifier.ts
 *
 * Telegram Bot API integration for trading alerts.
 * Sends formatted messages via Telegram for real-time notifications.
 */

import type { HedgeSignal } from '../signals/hedge-generator';

export interface TelegramMessage {
  text: string;
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  disable_web_page_preview?: boolean;
}

export class TelegramNotifier {
  private readonly apiBase: string;

  constructor(
    private botToken: string,
    private chatId: string
  ) {
    if (!botToken) {
      throw new Error('Telegram bot token is required');
    }
    if (!chatId) {
      throw new Error('Telegram chat ID is required');
    }

    this.apiBase = `https://api.telegram.org/bot${botToken}`;
  }

  /**
   * Send hedge signal alert to Telegram
   */
  async sendHedgeSignal(signal: HedgeSignal): Promise<boolean> {
    const emoji = this.getSeverityEmoji(signal.severity);

    const text = `
${emoji} <b>${signal.severity} HEDGE SIGNAL</b>

📊 <b>Prediction:</b>
• Hold: ${signal.predicted_hold.toFixed(2)}%
• Risk: ${signal.risk_level.toFixed(0)}/100
• Uncertainty: ${(signal.uncertainty_score * 100).toFixed(0)}%

💰 <b>Hedge Details:</b>
• Amount: $${signal.hedge_amount.toFixed(2)}
• Odds: ${signal.hedge_odds.toFixed(2)}
• Market: ${signal.hedge_market}
• Side: ${signal.hedge_side.toUpperCase()}

🎯 <b>Action:</b> ${signal.recommended_action.replace(/_/g, ' ').toUpperCase()}

💭 ${signal.reasoning}

📈 <b>Expected P&L:</b> $${signal.expected_pnl.toFixed(2)}
🕒 ${signal.timestamp}
    `.trim();

    return this.send({ text, parse_mode: 'HTML' });
  }

  /**
   * Send circuit breaker alert
   */
  async sendCircuitBreakerAlert(reason: string, metrics: Record<string, any>): Promise<boolean> {
    const metricsText = Object.entries(metrics)
      .map(([key, value]) => `• ${key}: ${value}`)
      .join('\n');

    const text = `
🚨 <b>CIRCUIT BREAKER TRIGGERED</b>

⚠️ <b>Reason:</b> ${reason}

📊 <b>Metrics:</b>
${metricsText}

🛑 <b>Trading has been halted. Manual intervention required.</b>
    `.trim();

    return this.send({ text, parse_mode: 'HTML' });
  }

  /**
   * Send model training update
   */
  async sendModelUpdate(
    r_squared: number,
    std_error: number,
    samples: number
  ): Promise<boolean> {
    const quality =
      r_squared >= 0.85 ? '✅ Excellent' : r_squared >= 0.70 ? '⚠️ Good' : '❌ Poor';

    const text = `
🤖 <b>MODEL TRAINING COMPLETE</b>

📊 <b>Metrics:</b>
• R² (Fit): ${r_squared.toFixed(4)}
• Std Error: ${std_error.toFixed(4)}
• Samples: ${samples}
• Quality: ${quality}
    `.trim();

    return this.send({ text, parse_mode: 'HTML' });
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
    const text = `
✅ <b>HEDGE BET PLACED</b>

🎫 <b>Bet ID:</b> <code>${bet_id}</code>

💰 <b>Details:</b>
• Amount: $${amount.toFixed(2)}
• Odds: ${odds.toFixed(2)}
• Market: ${market}
• Side: ${side.toUpperCase()}

🕒 ${new Date().toISOString()}
    `.trim();

    return this.send({ text, parse_mode: 'HTML' });
  }

  /**
   * Send generic alert message
   */
  async sendAlert(
    title: string,
    message: string,
    severity: 'info' | 'warning' | 'error' = 'info'
  ): Promise<boolean> {
    const emoji = severity === 'error' ? '🚨' : severity === 'warning' ? '⚠️' : 'ℹ️';

    const text = `
${emoji} <b>${title}</b>

${message}
    `.trim();

    return this.send({ text, parse_mode: 'HTML' });
  }

  /**
   * Send test message to verify bot configuration
   */
  async sendTestMessage(): Promise<boolean> {
    const text = '✅ Telegram bot is configured correctly!';
    return this.send({ text });
  }

  /**
   * Send message to Telegram
   */
  private async send(message: TelegramMessage): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBase}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.chatId,
          ...message,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('[TelegramNotifier] Failed to send message:', error);
        return false;
      }

      console.log('[TelegramNotifier] Message sent successfully');
      return true;
    } catch (error) {
      console.error('[TelegramNotifier] Error sending message:', error);
      return false;
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

  /**
   * Get bot info (for verification)
   */
  async getBotInfo(): Promise<any> {
    try {
      const response = await fetch(`${this.apiBase}/getMe`);
      if (!response.ok) return null;
      const data = await response.json();
      return data.result;
    } catch (error) {
      console.error('[TelegramNotifier] Error getting bot info:', error);
      return null;
    }
  }
}

/**
 * Factory function to create Telegram notifier
 */
export function createTelegramNotifier(
  botToken: string,
  chatId: string
): TelegramNotifier {
  return new TelegramNotifier(botToken, chatId);
}
