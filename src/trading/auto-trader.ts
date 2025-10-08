/**
 * auto-trader.ts
 *
 * Main autonomous trading orchestrator.
 * Coordinates: streaming → prediction → signal generation → bet placement.
 *
 * Safety features:
 * - Circuit breaker integration
 * - Risk limit enforcement
 * - Signal validation
 * - Comprehensive audit logging
 * - Alert notifications
 */

import type { Env } from '../types/api';
import { createStreamManager, StreamManager } from '../streams/stream-manager';
import { createHoldPredictor, HoldPredictor } from '../models/hold-predictor';
import { createTrainingDataFetcher } from '../models/training-data';
import { createHedgeSignalGenerator, HedgeSignalGenerator, HedgeContext } from '../signals/hedge-generator';
import { createSignalValidator, SignalValidator } from '../signals/signal-validator';
import { createAlertManager, AlertManager } from '../alerts/alert-manager';
import { createTradingCircuitBreaker, TradingCircuitBreaker } from '../guards/trading-circuit-breaker';
import { createRiskLimitGuard, RiskLimitGuard } from '../guards/risk-limits';
import { createTradingLogger, TradingLogger } from '../audit/trading-logger';
import type { Fantasy402Event } from '../streams/fantasy402-adapter';
import { callTool } from '../mcp/toolRegistry';
import type { MCPEnv } from '../types/api';

export interface AutoTraderConfig {
  enableTrading: boolean;
  dryRun: boolean;
  autoTrain: boolean;
  trainingIntervalHours: number; // Re-train model every N hours
  slackWebhook?: string;
  telegramToken?: string;
  telegramChatId?: string;
}

export class AutoTrader {
  private streamManager: StreamManager;
  private predictor: HoldPredictor;
  private signalGenerator: HedgeSignalGenerator;
  private signalValidator: SignalValidator;
  private alertManager: AlertManager;
  private circuitBreaker: TradingCircuitBreaker;
  private riskLimitGuard: RiskLimitGuard;
  private logger: TradingLogger;

  private isRunning = false;
  private lastTrainingTime = 0;

  constructor(
    private config: AutoTraderConfig,
    private env: Env & MCPEnv
  ) {
    // Initialize all components
    this.streamManager = createStreamManager(env);
    this.predictor = createHoldPredictor(env);
    this.signalGenerator = createHedgeSignalGenerator(env);
    this.signalValidator = createSignalValidator();
    this.alertManager = createAlertManager(env, {
      slackWebhook: config.slackWebhook,
      telegramToken: config.telegramToken,
      telegramChatId: config.telegramChatId,
    });
    this.circuitBreaker = createTradingCircuitBreaker(env);
    this.riskLimitGuard = createRiskLimitGuard(env);
    this.logger = createTradingLogger(env);

    console.log('[AutoTrader] Initialized', {
      enableTrading: config.enableTrading,
      dryRun: config.dryRun,
      autoTrain: config.autoTrain,
    });
  }

  /**
   * Start autonomous trading
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('[AutoTrader] Already running');
      return;
    }

    console.log('[AutoTrader] Starting autonomous trading...');

    // Load circuit breaker state
    await this.circuitBreaker.loadState();

    // Train model if enabled
    if (this.config.autoTrain) {
      await this.trainModel();
    }

    // Start stream manager
    await this.streamManager.start();

    // Register event handlers
    this.streamManager.onEvent((event, source) => {
      this.handleStreamEvent(event, source);
    });

    this.isRunning = true;

    // Send startup alert
    await this.alertManager.sendAlert(
      'Auto-Trader Started',
      `Trading: ${this.config.enableTrading ? 'ENABLED' : 'DISABLED'}\nDry Run: ${this.config.dryRun ? 'YES' : 'NO'}`,
      'info'
    );

    console.log('[AutoTrader] ✅ Started successfully');
  }

  /**
   * Stop autonomous trading
   */
  stop(): void {
    if (!this.isRunning) {
      console.warn('[AutoTrader] Not running');
      return;
    }

    console.log('[AutoTrader] Stopping...');

    this.streamManager.stop();
    this.isRunning = false;

    console.log('[AutoTrader] Stopped');
  }

  /**
   * Handle incoming stream event
   */
  private async handleStreamEvent(event: Fantasy402Event, source: string): Promise<void> {
    try {
      // Only process hold_calculated events for predictions
      if (event.type !== 'hold_calculated') {
        return;
      }

      // Check circuit breaker
      if (!this.circuitBreaker.isAllowed()) {
        console.log('[AutoTrader] Circuit breaker open - skipping event');
        return;
      }

      // Check if model is trained
      if (!this.predictor.isTrained()) {
        console.log('[AutoTrader] Model not trained - attempting training');
        await this.trainModel();
        if (!this.predictor.isTrained()) {
          console.warn('[AutoTrader] Model training failed - skipping event');
          return;
        }
      }

      // Check if auto-training is needed
      if (this.config.autoTrain) {
        const hoursSinceTraining = (Date.now() - this.lastTrainingTime) / (60 * 60 * 1000);
        if (hoursSinceTraining > this.config.trainingIntervalHours) {
          console.log('[AutoTrader] Auto-training triggered');
          await this.trainModel();
        }
      }

      // Extract data for prediction
      const currentData = {
        timestamp: new Date(event.timestamp).getTime(),
        betting_volume: event.data.exposure || 0,
        sharp_score: 50, // Would fetch from database
        time_of_day: new Date(event.timestamp).getHours(),
        day_of_week: new Date(event.timestamp).getDay(),
        event_count: 1,
        exposure_delta: event.data.exposure || 0,
      };

      // Make prediction
      const prediction = await this.predictor.predict(currentData);
      await this.logger.logPrediction(prediction, { event_id: event.eventId });

      // Check model uncertainty
      await this.circuitBreaker.checkModelUncertainty(prediction.uncertainty_score);

      // Only proceed if predicted hold is negative
      if (prediction.predicted_hold >= 0) {
        console.log('[AutoTrader] Predicted hold positive - no hedge needed');
        return;
      }

      // Build hedge context
      const context: HedgeContext = {
        event_id: event.eventId,
        current_exposure: event.data.exposure || 0,
        current_volume: event.data.exposure || 1000, // Would calculate from database
        market: event.data.market || 'moneyline',
        home_odds: 2.0, // Would fetch from odds API
        away_odds: 1.9,
      };

      // Generate hedge signal
      const signal = await this.signalGenerator.generate(prediction, context);
      await this.logger.logSignal(signal);

      // Validate signal
      const validation = this.signalValidator.validate(signal);

      if (!validation.valid) {
        console.log('[AutoTrader] Signal validation failed:', validation.errors);
        await this.logger.logBetRejected('Validation failed', {
          signal,
          errors: validation.errors,
        });
        return;
      }

      // Check risk limits
      const riskCheck = await this.riskLimitGuard.checkBet(
        signal.hedge_amount,
        signal.hedge_odds,
        event.eventId
      );

      if (!riskCheck.allowed) {
        console.log('[AutoTrader] Risk limit check failed:', riskCheck.reason);
        await this.logger.logBetRejected('Risk limits exceeded', {
          signal,
          reason: riskCheck.reason,
        });
        return;
      }

      // Send alert for HIGH/CRITICAL signals
      if (signal.severity === 'HIGH' || signal.severity === 'CRITICAL') {
        await this.alertManager.sendHedgeSignal(signal);
      }

      // Place hedge bet (or dry run)
      if (this.config.enableTrading) {
        await this.placeBet(signal);
      } else {
        console.log('[AutoTrader] Trading disabled - would place bet:', signal);
      }
    } catch (error) {
      console.error('[AutoTrader] Error handling event:', error);
      await this.circuitBreaker.manualTrip(`System error: ${error}`);
    }
  }

  /**
   * Train the prediction model
   */
  private async trainModel(): Promise<void> {
    try {
      console.log('[AutoTrader] Training model...');

      const fetcher = createTrainingDataFetcher(this.env);
      const trainingData = await fetcher.fetchTrainingData({ lookbackDays: 7 });

      if (trainingData.length < 10) {
        console.warn('[AutoTrader] Insufficient training data:', trainingData.length);
        return;
      }

      await this.predictor.train(trainingData);
      this.lastTrainingTime = Date.now();

      const modelInfo = this.predictor.getModelInfo();
      if (modelInfo) {
        await this.logger.logModelTraining(
          modelInfo.r_squared,
          modelInfo.std_error,
          modelInfo.training_samples
        );

        await this.alertManager.sendModelUpdate(
          modelInfo.r_squared,
          modelInfo.std_error,
          modelInfo.training_samples
        );
      }

      console.log('[AutoTrader] Model training complete');
    } catch (error) {
      console.error('[AutoTrader] Model training failed:', error);
    }
  }

  /**
   * Place hedge bet via MCP tool
   */
  private async placeBet(signal: any): Promise<void> {
    try {
      const result = await callTool(
        'placeHedgeBet',
        {
          event_id: signal.hedge_market, // Would use proper event ID
          market: signal.hedge_market,
          amount: signal.hedge_amount,
          odds: signal.hedge_odds,
          side: signal.hedge_side,
          hedge_signal_id: signal.timestamp,
          dry_run: this.config.dryRun,
        },
        this.env
      );

      if (result.isError) {
        console.error('[AutoTrader] Bet placement failed:', result);
        await this.circuitBreaker.recordAPIFailure();
        await this.logger.logBetRejected('MCP tool error', { signal, result });
      } else {
        console.log('[AutoTrader] Bet placed successfully:', result);
        this.circuitBreaker.resetAPIFailures();

        // Parse result
        const betResult = JSON.parse(result.content[0].text);
        await this.logger.logBetPlaced(
          betResult.bet_id,
          betResult.amount,
          betResult.odds,
          betResult.market,
          betResult.side,
          signal.timestamp
        );

        // Record bet in risk limits
        await this.riskLimitGuard.recordBet(betResult.amount, betResult.event_id);

        // Send confirmation alert
        await this.alertManager.sendBetConfirmation(
          betResult.bet_id,
          betResult.amount,
          betResult.odds,
          betResult.market,
          betResult.side
        );
      }
    } catch (error) {
      console.error('[AutoTrader] Error placing bet:', error);
      await this.circuitBreaker.recordAPIFailure();
    }
  }

  /**
   * Get status
   */
  getStatus(): {
    running: boolean;
    circuit_breaker: any;
    stream_manager: any;
    model_trained: boolean;
  } {
    return {
      running: this.isRunning,
      circuit_breaker: this.circuitBreaker.getStatus(),
      stream_manager: this.streamManager.getStatus(),
      model_trained: this.predictor.isTrained(),
    };
  }
}

/**
 * Factory function to create auto-trader
 */
export function createAutoTrader(
  env: Env & MCPEnv,
  config: Partial<AutoTraderConfig> = {}
): AutoTrader {
  const fullConfig: AutoTraderConfig = {
    enableTrading: env.TRADING_ENABLED === 'true',
    dryRun: false,
    autoTrain: true,
    trainingIntervalHours: 24,
    ...config,
  };

  return new AutoTrader(fullConfig, env);
}
