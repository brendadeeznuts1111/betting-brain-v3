/**
 * General Time-Series Analytics Tool
 * Flexible time-series analysis for multiple metrics
 */

import { Env } from '../../types/api';
import { MCPToolResult } from '../types';

export async function getTimeSeriesAnalytics(args: Record<string, any>, env: Env): Promise<MCPToolResult> {
  try {
    const {
      metric = 'volume', // volume, hold, bets, customers, exposure
      lookbackDays = 30,
      granularity = 'daily', // hourly, daily, weekly
      marketType,
      groupBy, // optional: market_type, customer_segment
    } = args;

    if (!env.ANALYTICS) {
      throw new Error('ANALYTICS database not available');
    }

    const lookbackTime = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();

    // Determine time grouping
    let timeGrouping: string;
    switch (granularity) {
      case 'hourly':
        timeGrouping = "strftime('%Y-%m-%d %H:00', ts)";
        break;
      case 'weekly':
        timeGrouping = "strftime('%Y-W%W', ts)";
        break;
      default: // daily
        timeGrouping = "strftime('%Y-%m-%d', ts)";
    }

    // Build query based on metric
    let query: string;
    let metricLabel: string;

    switch (metric) {
      case 'volume':
        metricLabel = 'total_volume';
        query = `
          SELECT
            ${timeGrouping} as time_bucket,
            ${groupBy === 'market_type' ? 'mt as group_key,' : ''}
            SUM(stake) as metric_value,
            COUNT(*) as bet_count,
            COUNT(DISTINCT cid) as unique_customers
          FROM bet_history
          WHERE ts >= ?
            ${marketType ? 'AND mt = ?' : ''}
          GROUP BY time_bucket ${groupBy === 'market_type' ? ', mt' : ''}
          ORDER BY time_bucket ASC
        `;
        break;

      case 'hold':
        metricLabel = 'hold_percentage';
        query = `
          SELECT
            ${timeGrouping} as time_bucket,
            ${groupBy === 'market_type' ? 'mt as group_key,' : ''}
            (SUM(stake) - SUM(payout - stake)) / SUM(stake) * 100 as metric_value,
            SUM(stake) as total_volume,
            COUNT(*) as bet_count
          FROM bet_history
          WHERE ts >= ?
            ${marketType ? 'AND mt = ?' : ''}
          GROUP BY time_bucket ${groupBy === 'market_type' ? ', mt' : ''}
          ORDER BY time_bucket ASC
        `;
        break;

      case 'bets':
        metricLabel = 'bet_count';
        query = `
          SELECT
            ${timeGrouping} as time_bucket,
            ${groupBy === 'market_type' ? 'mt as group_key,' : ''}
            COUNT(*) as metric_value,
            SUM(stake) as total_volume,
            COUNT(DISTINCT cid) as unique_customers
          FROM bet_history
          WHERE ts >= ?
            ${marketType ? 'AND mt = ?' : ''}
          GROUP BY time_bucket ${groupBy === 'market_type' ? ', mt' : ''}
          ORDER BY time_bucket ASC
        `;
        break;

      case 'customers':
        metricLabel = 'unique_customers';
        query = `
          SELECT
            ${timeGrouping} as time_bucket,
            ${groupBy === 'market_type' ? 'mt as group_key,' : ''}
            COUNT(DISTINCT cid) as metric_value,
            COUNT(*) as bet_count,
            SUM(stake) as total_volume
          FROM bet_history
          WHERE ts >= ?
            ${marketType ? 'AND mt = ?' : ''}
          GROUP BY time_bucket ${groupBy === 'market_type' ? ', mt' : ''}
          ORDER BY time_bucket ASC
        `;
        break;

      case 'exposure':
        metricLabel = 'total_exposure';
        query = `
          SELECT
            ${timeGrouping} as time_bucket,
            ${groupBy === 'market_type' ? 'side as group_key,' : ''}
            SUM(risk) as metric_value,
            COUNT(*) as position_count,
            AVG(risk) as avg_exposure
          FROM exposure_tracking
          WHERE ts >= ?
          GROUP BY time_bucket ${groupBy === 'market_type' ? ', side' : ''}
          ORDER BY time_bucket ASC
        `;
        break;

      default:
        throw new Error(`Unknown metric: ${metric}`);
    }

    const binds = marketType ? [lookbackTime, marketType] : [lookbackTime];
    const timeSeriesData = await env.ANALYTICS.prepare(query).bind(...binds).all();

    if (!timeSeriesData.results || timeSeriesData.results.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              message: 'No time-series data found',
              metric,
              lookbackDays,
              granularity,
              marketType: marketType || 'ALL',
            }, null, 2),
          },
        ],
        isError: false,
      };
    }

    // Calculate statistics
    const values = timeSeriesData.results.map((row: any) => row.metric_value || 0);
    const sum = values.reduce((acc: number, val: number) => acc + val, 0);
    const avg = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    // Calculate variance and standard deviation
    const variance = values.reduce((acc: number, val: number) => acc + Math.pow(val - avg, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Calculate trend (simple linear regression)
    const trend = calculateTrend(values);

    // Detect anomalies (values > 2 std deviations from mean)
    const anomalies = timeSeriesData.results
      .map((row: any, index: number) => ({
        timestamp: row.time_bucket,
        value: row.metric_value || 0,
        deviation: Math.abs((row.metric_value || 0) - avg) / stdDev,
        is_anomaly: Math.abs((row.metric_value || 0) - avg) > 2 * stdDev,
      }))
      .filter((a) => a.is_anomaly);

    // Group data if requested
    let groupedData = null;
    if (groupBy === 'market_type' && timeSeriesData.results.some((row: any) => row.group_key)) {
      const groups = new Map<string, any[]>();
      timeSeriesData.results.forEach((row: any) => {
        const key = row.group_key || 'UNKNOWN';
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(row);
      });

      groupedData = Array.from(groups.entries()).map(([key, rows]) => {
        const groupValues = rows.map((r) => r.metric_value || 0);
        return {
          group: key,
          total: groupValues.reduce((sum, val) => sum + val, 0),
          avg: groupValues.reduce((sum, val) => sum + val, 0) / groupValues.length,
          min: Math.min(...groupValues),
          max: Math.max(...groupValues),
          data_points: rows.length,
        };
      });
    }

    const response = {
      metric,
      metric_label: metricLabel,
      lookback_days: lookbackDays,
      granularity,
      market_type: marketType || 'ALL',
      statistics: {
        total: Math.round(sum * 100) / 100,
        average: Math.round(avg * 100) / 100,
        min: Math.round(min * 100) / 100,
        max: Math.round(max * 100) / 100,
        std_dev: Math.round(stdDev * 100) / 100,
        coefficient_of_variation: avg !== 0 ? Math.round((stdDev / avg) * 10000) / 100 : 0,
      },
      trend: {
        direction: trend > 0.1 ? 'INCREASING' : trend < -0.1 ? 'DECREASING' : 'STABLE',
        slope: Math.round(trend * 1000) / 1000,
      },
      anomalies: anomalies.map((a) => ({
        timestamp: a.timestamp,
        value: Math.round(a.value * 100) / 100,
        std_deviations: Math.round(a.deviation * 100) / 100,
      })),
      grouped_data: groupedData,
      time_series: timeSeriesData.results.map((row: any) => ({
        timestamp: row.time_bucket,
        group: row.group_key || null,
        value: Math.round((row.metric_value || 0) * 100) / 100,
        bet_count: row.bet_count || row.position_count || 0,
        volume: row.total_volume ? Math.round(row.total_volume * 100) / 100 : null,
        unique_customers: row.unique_customers || null,
      })),
      metadata: {
        timestamp: new Date().toISOString(),
        total_data_points: timeSeriesData.results.length,
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
    console.error('[getTimeSeriesAnalytics] Error:', error);
    return {
      content: [
        {
          type: 'text',
          text: `Error retrieving time-series analytics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Calculate trend using simple linear regression
 */
function calculateTrend(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;

  const xValues = Array.from({ length: n }, (_, i) => i);
  const yValues = values;

  const sumX = xValues.reduce((sum, x) => sum + x, 0);
  const sumY = yValues.reduce((sum, y) => sum + y, 0);
  const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
  const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  return slope;
}
