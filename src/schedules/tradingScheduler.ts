/**
 * tradingScheduler.ts
 *
 * Scheduled job to run autonomous trading loop.
 * Executes every 30 seconds (via cron: * * * * *).
 *
 * Responsibilities:
 * - Start/maintain auto-trader instance
 * - Check circuit breaker status
 * - Process alert queue
 * - Report health metrics
 */

import type { Env, ExecutionContext } from '../types/api';
import type { MCPEnv } from '../types/api';
import { createAutoTrader, AutoTrader } from '../trading/auto-trader';

// Global auto-trader instance (persists across scheduled runs)
let autoTrader: AutoTrader | null = null;

/**
 * Handle scheduled trading execution
 */
export async function handleTradingSchedule(
  env: Env & MCPEnv,
  ctx: ExecutionContext
): Promise<void> {
  const requestId = `trading_${Date.now()}`;
  console.log(`[${requestId}] Trading scheduler triggered`);

  try {
    // Check if trading is enabled
    const tradingEnabled = env.TRADING_ENABLED === 'true';

    if (!tradingEnabled) {
      console.log('[TradingScheduler] Trading disabled (TRADING_ENABLED=false)');

      // Stop trader if running
      if (autoTrader) {
        autoTrader.stop();
        autoTrader = null;
      }

      return;
    }

    // Initialize auto-trader if not exists
    if (!autoTrader) {
      console.log('[TradingScheduler] Initializing auto-trader');

      autoTrader = createAutoTrader(env, {
        enableTrading: tradingEnabled,
        dryRun: env.TRADING_DRY_RUN === 'true',
        autoTrain: true,
        trainingIntervalHours: 24,
        slackWebhook: env.SLACK_WEBHOOK_URL,
        telegramToken: env.TELEGRAM_BOT_TOKEN,
        telegramChatId: env.TELEGRAM_CHAT_ID,
      });

      await autoTrader.start();
    }

    // Get status
    const status = autoTrader.getStatus();

    console.log(`[${requestId}] Auto-trader status:`, {
      running: status.running,
      circuit_breaker: status.circuit_breaker.state,
      model_trained: status.model_trained,
    });

    // Log health metrics to Analytics Engine
    env.ANALYTICS_ENGINE.writeDataPoint({
      blobs: [
        'trading_scheduler',
        'health_check',
        status.circuit_breaker.state,
        status.model_trained ? 'trained' : 'not_trained',
      ],
      doubles: [status.running ? 1 : 0],
      indexes: [Date.now()],
    });

    // Restart if not running and should be
    if (!status.running && tradingEnabled) {
      console.log('[TradingScheduler] Restarting auto-trader');
      await autoTrader.start();
    }
  } catch (error) {
    console.error(`[${requestId}] Trading scheduler error:`, error);

    // Log error to Analytics Engine
    env.ANALYTICS_ENGINE.writeDataPoint({
      blobs: ['trading_scheduler', 'error', String(error)],
      doubles: [0],
      indexes: [Date.now()],
    });

    // Reset auto-trader on error
    autoTrader = null;
  }
}

/**
 * Get auto-trader instance (for testing/debugging)
 */
export function getAutoTraderInstance(): AutoTrader | null {
  return autoTrader;
}

/**
 * Stop auto-trader (for manual shutdown)
 */
export function stopAutoTrader(): void {
  if (autoTrader) {
    autoTrader.stop();
    autoTrader = null;
    console.log('[TradingScheduler] Auto-trader stopped');
  }
}
