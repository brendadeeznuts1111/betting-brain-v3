/**
 * Time-Series CLV Analysis Tool
 * Track CLV trends over time for customer profiling
 */

import { Env } from '../../types/api';
import { MCPToolResult } from '../types';

export async function getTimeSeriesCLV(args: Record<string, any>, env: Env): Promise<MCPToolResult> {
  try {
    const {
      cid,
      lookbackDays = 30,
      granularity = 'daily', // daily, weekly, monthly
    } = args;

    if (!cid) {
      throw new Error('Customer ID (cid) is required');
    }

    if (!env.ANALYTICS) {
      throw new Error('ANALYTICS database not available');
    }

    // Get current CLV metrics
    const currentQuery = `
      SELECT cid, clv, wr, ao, nb
      FROM sharp_indicators
      WHERE cid = ?
      LIMIT 1
    `;

    const currentMetrics = await env.ANALYTICS.prepare(currentQuery).bind(cid).first();

    if (!currentMetrics) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Customer not found',
              cid,
            }, null, 2),
          },
        ],
        isError: true,
      };
    }

    // Calculate time-based grouping
    const lookbackTime = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();

    let timeGrouping: string;
    switch (granularity) {
      case 'hourly':
        timeGrouping = "strftime('%Y-%m-%d %H:00', ts)";
        break;
      case 'weekly':
        timeGrouping = "strftime('%Y-W%W', ts)";
        break;
      case 'monthly':
        timeGrouping = "strftime('%Y-%m', ts)";
        break;
      default: // daily
        timeGrouping = "strftime('%Y-%m-%d', ts)";
    }

    // Get historical bet performance
    const historyQuery = `
      SELECT
        ${timeGrouping} as time_bucket,
        COUNT(*) as bet_count,
        SUM(CASE WHEN result = 'WIN' THEN 1 ELSE 0 END) as wins,
        SUM(CASE WHEN result = 'LOSS' THEN 1 ELSE 0 END) as losses,
        SUM(stake) as total_staked,
        SUM(payout - stake) as net_profit
      FROM bet_history
      WHERE cid = ? AND ts >= ?
      GROUP BY time_bucket
      ORDER BY time_bucket ASC
    `;

    const history = await env.ANALYTICS.prepare(historyQuery).bind(cid, lookbackTime).all();

    // Calculate rolling metrics
    let cumulativeCLV = 0;
    let cumulativeStake = 0;
    const timeSeries = (history.results || []).map((row: any) => {
      const winRate = row.bet_count > 0 ? (row.wins / row.bet_count) * 100 : 0;
      cumulativeCLV += row.net_profit || 0;
      cumulativeStake += row.total_staked || 0;

      return {
        timestamp: row.time_bucket,
        bet_count: row.bet_count,
        wins: row.wins,
        losses: row.losses,
        win_rate: Math.round(winRate * 100) / 100,
        period_clv: row.net_profit || 0,
        cumulative_clv: cumulativeCLV,
        total_staked: row.total_staked || 0,
        roi: cumulativeStake > 0 ? Math.round((cumulativeCLV / cumulativeStake) * 10000) / 100 : 0,
      };
    });

    // Calculate trend indicators
    const recentPeriods = timeSeries.slice(-7); // Last 7 periods
    const recentCLV = recentPeriods.reduce((sum, p) => sum + p.period_clv, 0);
    const recentAvgCLV = recentPeriods.length > 0 ? recentCLV / recentPeriods.length : 0;

    const olderPeriods = timeSeries.slice(0, -7);
    const olderCLV = olderPeriods.reduce((sum, p) => sum + p.period_clv, 0);
    const olderAvgCLV = olderPeriods.length > 0 ? olderCLV / olderPeriods.length : 0;

    const trendDirection = recentAvgCLV > olderAvgCLV ? 'IMPROVING' :
                          recentAvgCLV < olderAvgCLV ? 'DECLINING' : 'STABLE';

    const response = {
      customer_id: cid,
      lookback_days: lookbackDays,
      granularity,
      current_metrics: {
        total_clv: currentMetrics.clv,
        win_rate: currentMetrics.wr,
        action_count: currentMetrics.ao,
        net_balance: currentMetrics.nb,
      },
      trend_analysis: {
        direction: trendDirection,
        recent_avg_clv: Math.round(recentAvgCLV * 100) / 100,
        older_avg_clv: Math.round(olderAvgCLV * 100) / 100,
        trend_strength: Math.abs(recentAvgCLV - olderAvgCLV),
      },
      time_series: timeSeries,
      summary: {
        total_periods: timeSeries.length,
        total_bets: timeSeries.reduce((sum, p) => sum + p.bet_count, 0),
        final_cumulative_clv: cumulativeCLV,
        final_roi: cumulativeStake > 0 ? Math.round((cumulativeCLV / cumulativeStake) * 10000) / 100 : 0,
      },
      metadata: {
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
    console.error('[getTimeSeriesCLV] Error:', error);
    return {
      content: [
        {
          type: 'text',
          text: `Error analyzing CLV time-series: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
}
