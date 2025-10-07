/**
 * Hold Percentage Forecasting Tool
 * Predictive analytics for expected hold percentage based on historical trends
 */

import { Env } from '../../types/api';
import { MCPToolResult } from '../types';

export async function getHoldForecast(args: Record<string, any>, env: Env): Promise<MCPToolResult> {
  try {
    const {
      eventID,
      marketType,
      lookbackDays = 30,
      forecastHours = 24,
    } = args;

    if (!env.ANALYTICS) {
      throw new Error('ANALYTICS database not available');
    }

    const lookbackTime = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();

    // Get historical hold percentage data
    const historyQuery = `
      SELECT
        strftime('%Y-%m-%d %H:00', ts) as time_bucket,
        mt,
        AVG(hold_pct) as avg_hold,
        MIN(hold_pct) as min_hold,
        MAX(hold_pct) as max_hold,
        COUNT(*) as sample_count,
        SUM(volume) as total_volume
      FROM hold_tracking
      WHERE ts >= ?
        ${marketType ? 'AND mt = ?' : ''}
      GROUP BY time_bucket, mt
      ORDER BY time_bucket ASC
    `;

    const binds = marketType ? [lookbackTime, marketType] : [lookbackTime];
    const history = await env.ANALYTICS.prepare(historyQuery).bind(...binds).all();

    if (!history.results || history.results.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              message: 'No historical hold data found',
              lookbackDays,
              marketType: marketType || 'ALL',
            }, null, 2),
          },
        ],
        isError: false,
      };
    }

    // Simple linear regression for trend forecasting
    const dataPoints = history.results.map((row: any, index: number) => ({
      x: index,
      y: row.avg_hold || 0,
      volume: row.total_volume || 0,
    }));

    const forecast = calculateLinearForecast(dataPoints, forecastHours);

    // Calculate volatility (standard deviation of hold %)
    const avgHold = dataPoints.reduce((sum, p) => sum + p.y, 0) / dataPoints.length;
    const variance = dataPoints.reduce((sum, p) => sum + Math.pow(p.y - avgHold, 2), 0) / dataPoints.length;
    const volatility = Math.sqrt(variance);

    // Get current hold if eventID provided
    let currentHold = null;
    if (eventID) {
      const currentQuery = `
        SELECT hold_pct, volume, ts
        FROM hold_tracking
        WHERE eid = ?
        ORDER BY ts DESC
        LIMIT 1
      `;

      currentHold = await env.ANALYTICS.prepare(currentQuery).bind(eventID).first();
    }

    // Risk assessment
    const expectedHold = forecast.prediction;
    const confidenceInterval = volatility * 1.96; // 95% confidence
    const lowerBound = expectedHold - confidenceInterval;
    const upperBound = expectedHold + confidenceInterval;

    const riskLevel =
      volatility > 5.0 ? 'HIGH' :
      volatility > 2.0 ? 'MEDIUM' :
      'LOW';

    const response = {
      forecast: {
        expected_hold_pct: Math.round(expectedHold * 100) / 100,
        confidence_interval_95: {
          lower: Math.round(lowerBound * 100) / 100,
          upper: Math.round(upperBound * 100) / 100,
        },
        forecast_hours: forecastHours,
        trend: forecast.slope > 0.1 ? 'INCREASING' :
               forecast.slope < -0.1 ? 'DECREASING' : 'STABLE',
        volatility: Math.round(volatility * 100) / 100,
        risk_level: riskLevel,
      },
      current_state: currentHold ? {
        event_id: eventID,
        current_hold_pct: Number(currentHold.hold_pct),
        volume: Number(currentHold.volume),
        timestamp: String(currentHold.ts),
        deviation_from_forecast: Math.abs(Number(currentHold.hold_pct) - expectedHold),
      } : null,
      historical_summary: {
        lookback_days: lookbackDays,
        total_samples: dataPoints.length,
        avg_hold_pct: Math.round(avgHold * 100) / 100,
        min_hold_pct: Math.round(Math.min(...dataPoints.map(p => p.y)) * 100) / 100,
        max_hold_pct: Math.round(Math.max(...dataPoints.map(p => p.y)) * 100) / 100,
        total_volume: dataPoints.reduce((sum, p) => sum + p.volume, 0),
      },
      time_series: history.results.map((row: any) => ({
        timestamp: row.time_bucket,
        market_type: row.mt,
        avg_hold: Math.round(row.avg_hold * 100) / 100,
        sample_count: row.sample_count,
        volume: row.total_volume,
      })),
      recommendations: generateHoldRecommendations(expectedHold, volatility, riskLevel, currentHold),
      metadata: {
        market_type: marketType || 'ALL',
        timestamp: new Date().toISOString(),
      },
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
      isError: false,
    };
  } catch (error) {
    console.error('[getHoldForecast] Error:', error);
    return {
      content: [
        {
          type: 'text',
          text: `Error forecasting hold percentage: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Simple linear regression forecast
 */
function calculateLinearForecast(
  dataPoints: Array<{ x: number; y: number; volume: number }>,
  forecastSteps: number
): { prediction: number; slope: number; intercept: number } {
  const n = dataPoints.length;

  // Calculate means
  const meanX = dataPoints.reduce((sum, p) => sum + p.x, 0) / n;
  const meanY = dataPoints.reduce((sum, p) => sum + p.y, 0) / n;

  // Calculate slope and intercept
  let numerator = 0;
  let denominator = 0;

  for (const point of dataPoints) {
    numerator += (point.x - meanX) * (point.y - meanY);
    denominator += Math.pow(point.x - meanX, 2);
  }

  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = meanY - slope * meanX;

  // Forecast for next period
  const nextX = n; // Next time step
  const prediction = slope * nextX + intercept;

  return {
    prediction,
    slope,
    intercept,
  };
}

/**
 * Generate actionable recommendations
 */
function generateHoldRecommendations(
  expectedHold: number,
  volatility: number,
  riskLevel: string,
  currentHold: any
): string[] {
  const recommendations: string[] = [];

  // Target hold percentage (industry standard: 4-6%)
  const targetHold = 5.0;

  if (expectedHold < 2.0) {
    recommendations.push('ALERT: Expected hold significantly below target (< 2%)');
    recommendations.push('Review pricing strategy and odds competitiveness');
    recommendations.push('Check for sharp customer concentration');
  } else if (expectedHold < 4.0) {
    recommendations.push('Expected hold below optimal range');
    recommendations.push('Consider tightening lines or reducing limits');
  } else if (expectedHold > 8.0) {
    recommendations.push('Expected hold above optimal range');
    recommendations.push('Lines may be too wide - risk losing recreational volume');
  } else {
    recommendations.push('Expected hold within healthy range (4-8%)');
  }

  if (volatility > 5.0) {
    recommendations.push('HIGH VOLATILITY: Implement tighter risk controls');
    recommendations.push('Monitor exposure more frequently');
  } else if (volatility > 2.0) {
    recommendations.push('MODERATE VOLATILITY: Standard monitoring recommended');
  }

  if (currentHold && Math.abs(currentHold.hold_pct - expectedHold) > 3.0) {
    recommendations.push(`Current hold deviating significantly from forecast (${Math.round(Math.abs(currentHold.hold_pct - expectedHold) * 100) / 100}% difference)`);
    recommendations.push('Investigate recent betting patterns or line movements');
  }

  return recommendations;
}
