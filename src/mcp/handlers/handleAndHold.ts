/**
 * Handle and Hold Analytics Tool
 * Track total betting handle (volume) and hold percentage over time
 */

import { Env } from '../../types/api';
import { MCPToolResult } from '../types';

export async function getHandleAndHold(args: Record<string, any>, env: Env): Promise<MCPToolResult> {
  try {
    const {
      agentID = 'DEMO',
      lookbackDays = 7,
      granularity = 'daily', // hourly, daily, weekly
      marketType,
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

    // Query handle and hold data
    const handleQuery = `
      SELECT
        ${timeGrouping} as time_bucket,
        ${marketType ? 'market_type,' : ''}
        COUNT(*) as bet_count,
        SUM(stake) as total_handle,
        SUM(payout - stake) as gross_profit,
        SUM(stake) - SUM(payout - stake) as net_revenue,
        (SUM(stake) - SUM(payout - stake)) / SUM(stake) * 100 as hold_pct,
        AVG(stake) as avg_bet_size,
        MAX(stake) as max_bet_size
      FROM bet_history
      WHERE ts >= ?
        ${marketType ? 'AND market_type = ?' : ''}
      GROUP BY time_bucket ${marketType ? ', market_type' : ''}
      ORDER BY time_bucket ASC
    `;

    const binds = marketType ? [lookbackTime, marketType] : [lookbackTime];
    const handleData = await env.ANALYTICS.prepare(handleQuery).bind(...binds).all();

    if (!handleData.results || handleData.results.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              message: 'No handle data found',
              lookbackDays,
              marketType: marketType || 'ALL',
              agentID,
            }, null, 2),
          },
        ],
        isError: false,
      };
    }

    // Calculate summary statistics
    const totalHandle = handleData.results.reduce((sum: number, row: any) => sum + (row.total_handle || 0), 0);
    const totalNetRevenue = handleData.results.reduce((sum: number, row: any) => sum + (row.net_revenue || 0), 0);
    const totalBets = handleData.results.reduce((sum: number, row: any) => sum + (row.bet_count || 0), 0);
    const overallHoldPct = totalHandle > 0 ? (totalNetRevenue / totalHandle) * 100 : 0;

    // Calculate trends
    const recentPeriods = handleData.results.slice(-3);
    const olderPeriods = handleData.results.slice(0, -3);

    const recentAvgHandle = recentPeriods.reduce((sum: number, row: any) => sum + (row.total_handle || 0), 0) / recentPeriods.length;
    const olderAvgHandle = olderPeriods.length > 0
      ? olderPeriods.reduce((sum: number, row: any) => sum + (row.total_handle || 0), 0) / olderPeriods.length
      : recentAvgHandle;

    const handleTrend = recentAvgHandle > olderAvgHandle * 1.1 ? 'INCREASING' :
                        recentAvgHandle < olderAvgHandle * 0.9 ? 'DECREASING' : 'STABLE';

    const recentAvgHold = recentPeriods.reduce((sum: number, row: any) => sum + (row.hold_pct || 0), 0) / recentPeriods.length;
    const olderAvgHold = olderPeriods.length > 0
      ? olderPeriods.reduce((sum: number, row: any) => sum + (row.hold_pct || 0), 0) / olderPeriods.length
      : recentAvgHold;

    const holdTrend = recentAvgHold > olderAvgHold + 0.5 ? 'INCREASING' :
                      recentAvgHold < olderAvgHold - 0.5 ? 'DECREASING' : 'STABLE';

    // Market breakdown if no specific market
    let marketBreakdown = null;
    if (!marketType) {
      const marketQuery = `
        SELECT
          market_type,
          COUNT(*) as bet_count,
          SUM(stake) as total_handle,
          SUM(stake) - SUM(payout - stake) as net_revenue,
          (SUM(stake) - SUM(payout - stake)) / SUM(stake) * 100 as hold_pct
        FROM bet_history
        WHERE ts >= ?
        GROUP BY market_type
        ORDER BY total_handle DESC
        LIMIT 10
      `;

      const marketData = await env.ANALYTICS.prepare(marketQuery).bind(lookbackTime).all();
      marketBreakdown = (marketData.results || []).map((row: any) => ({
        market_type: row.market_type,
        bet_count: row.bet_count,
        total_handle: Math.round(row.total_handle * 100) / 100,
        net_revenue: Math.round(row.net_revenue * 100) / 100,
        hold_pct: Math.round((row.hold_pct || 0) * 100) / 100,
        handle_percentage: totalHandle > 0 ? Math.round((row.total_handle / totalHandle) * 10000) / 100 : 0,
      }));
    }

    const response = {
      agent_id: agentID,
      lookback_days: lookbackDays,
      granularity,
      market_type: marketType || 'ALL',
      summary: {
        total_handle: Math.round(totalHandle * 100) / 100,
        total_net_revenue: Math.round(totalNetRevenue * 100) / 100,
        overall_hold_pct: Math.round(overallHoldPct * 100) / 100,
        total_bets: totalBets,
        avg_bet_size: totalBets > 0 ? Math.round((totalHandle / totalBets) * 100) / 100 : 0,
      },
      trends: {
        handle_trend: handleTrend,
        hold_trend: holdTrend,
        recent_avg_handle: Math.round(recentAvgHandle * 100) / 100,
        recent_avg_hold_pct: Math.round(recentAvgHold * 100) / 100,
      },
      market_breakdown: marketBreakdown,
      time_series: handleData.results.map((row: any) => ({
        timestamp: row.time_bucket,
        market_type: row.market_type || 'ALL',
        bet_count: row.bet_count,
        total_handle: Math.round(row.total_handle * 100) / 100,
        net_revenue: Math.round(row.net_revenue * 100) / 100,
        hold_pct: Math.round((row.hold_pct || 0) * 100) / 100,
        avg_bet_size: Math.round(row.avg_bet_size * 100) / 100,
        max_bet_size: Math.round(row.max_bet_size * 100) / 100,
      })),
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
    console.error('[getHandleAndHold] Error:', error);
    return {
      content: [
        {
          type: 'text',
          text: `Error retrieving handle and hold analytics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
}
