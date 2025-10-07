/**
 * Customer Volume Analytics Tool
 * Track betting volume patterns and customer segmentation
 */

import { Env } from '../../types/api';
import { MCPToolResult } from '../types';

export async function getCustomerVolume(args: Record<string, any>, env: Env): Promise<MCPToolResult> {
  try {
    const {
      agentID = 'DEMO',
      lookbackDays = 30,
      minBets = 5,
      segmentBy = 'volume', // volume, frequency, value
    } = args;

    if (!env.ANALYTICS) {
      throw new Error('ANALYTICS database not available');
    }

    const lookbackTime = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();

    // Get customer volume data
    const volumeQuery = `
      SELECT
        cid,
        COUNT(*) as bet_count,
        SUM(stake) as total_volume,
        AVG(stake) as avg_bet_size,
        MIN(stake) as min_bet,
        MAX(stake) as max_bet,
        SUM(payout - stake) as net_profit,
        MIN(ts) as first_bet,
        MAX(ts) as last_bet
      FROM bet_history
      WHERE ts >= ?
      GROUP BY cid
      HAVING bet_count >= ?
      ORDER BY total_volume DESC
      LIMIT 100
    `;

    const volumeData = await env.ANALYTICS.prepare(volumeQuery).bind(lookbackTime, minBets).all();

    if (!volumeData.results || volumeData.results.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              message: 'No customer volume data found',
              lookbackDays,
              minBets,
              agentID,
            }, null, 2),
          },
        ],
        isError: false,
      };
    }

    // Calculate percentiles for segmentation
    const volumes = volumeData.results.map((row: any) => row.total_volume).sort((a: number, b: number) => a - b);
    const p90 = volumes[Math.floor(volumes.length * 0.9)];
    const p75 = volumes[Math.floor(volumes.length * 0.75)];
    const p50 = volumes[Math.floor(volumes.length * 0.50)];
    const p25 = volumes[Math.floor(volumes.length * 0.25)];

    // Segment customers
    const customers = volumeData.results.map((row: any) => {
      const volume = row.total_volume;
      const roi = row.total_volume > 0 ? (row.net_profit / row.total_volume) * 100 : 0;
      const daysActive = Math.ceil(
        (new Date(row.last_bet).getTime() - new Date(row.first_bet).getTime()) / (1000 * 60 * 60 * 24)
      );
      const betFrequency = daysActive > 0 ? row.bet_count / daysActive : row.bet_count;

      let segment: string;
      if (volume >= p90) {
        segment = 'WHALE';
      } else if (volume >= p75) {
        segment = 'HIGH_ROLLER';
      } else if (volume >= p50) {
        segment = 'REGULAR';
      } else if (volume >= p25) {
        segment = 'CASUAL';
      } else {
        segment = 'OCCASIONAL';
      }

      return {
        customer_id: row.cid,
        segment,
        bet_count: row.bet_count,
        total_volume: Math.round(row.total_volume * 100) / 100,
        avg_bet_size: Math.round(row.avg_bet_size * 100) / 100,
        min_bet: Math.round(row.min_bet * 100) / 100,
        max_bet: Math.round(row.max_bet * 100) / 100,
        net_profit: Math.round(row.net_profit * 100) / 100,
        roi: Math.round(roi * 100) / 100,
        days_active: daysActive,
        bet_frequency: Math.round(betFrequency * 100) / 100,
        first_bet: row.first_bet,
        last_bet: row.last_bet,
      };
    });

    // Calculate segment statistics
    const segmentStats = {
      WHALE: { count: 0, total_volume: 0, avg_bet_size: 0 },
      HIGH_ROLLER: { count: 0, total_volume: 0, avg_bet_size: 0 },
      REGULAR: { count: 0, total_volume: 0, avg_bet_size: 0 },
      CASUAL: { count: 0, total_volume: 0, avg_bet_size: 0 },
      OCCASIONAL: { count: 0, total_volume: 0, avg_bet_size: 0 },
    };

    customers.forEach((customer) => {
      const segment = customer.segment as keyof typeof segmentStats;
      segmentStats[segment].count++;
      segmentStats[segment].total_volume += customer.total_volume;
      segmentStats[segment].avg_bet_size += customer.avg_bet_size;
    });

    // Calculate averages
    Object.keys(segmentStats).forEach((segment) => {
      const key = segment as keyof typeof segmentStats;
      if (segmentStats[key].count > 0) {
        segmentStats[key].avg_bet_size = Math.round(
          (segmentStats[key].avg_bet_size / segmentStats[key].count) * 100
        ) / 100;
        segmentStats[key].total_volume = Math.round(segmentStats[key].total_volume * 100) / 100;
      }
    });

    // Overall statistics
    const totalVolume = customers.reduce((sum, c) => sum + c.total_volume, 0);
    const totalBets = customers.reduce((sum, c) => sum + c.bet_count, 0);

    // Top customers
    const topByVolume = [...customers].sort((a, b) => b.total_volume - a.total_volume).slice(0, 10);
    const topByFrequency = [...customers].sort((a, b) => b.bet_frequency - a.bet_frequency).slice(0, 10);
    const topByROI = [...customers].sort((a, b) => b.roi - a.roi).slice(0, 10);

    const response = {
      agent_id: agentID,
      lookback_days: lookbackDays,
      min_bets: minBets,
      summary: {
        total_customers: customers.length,
        total_volume: Math.round(totalVolume * 100) / 100,
        total_bets: totalBets,
        avg_volume_per_customer: Math.round((totalVolume / customers.length) * 100) / 100,
        avg_bets_per_customer: Math.round((totalBets / customers.length) * 100) / 100,
      },
      segmentation: {
        percentiles: {
          p90: Math.round(p90 * 100) / 100,
          p75: Math.round(p75 * 100) / 100,
          p50: Math.round(p50 * 100) / 100,
          p25: Math.round(p25 * 100) / 100,
        },
        segments: segmentStats,
      },
      top_customers: {
        by_volume: topByVolume.map((c) => ({
          customer_id: c.customer_id,
          segment: c.segment,
          total_volume: c.total_volume,
          bet_count: c.bet_count,
        })),
        by_frequency: topByFrequency.map((c) => ({
          customer_id: c.customer_id,
          segment: c.segment,
          bet_frequency: c.bet_frequency,
          bet_count: c.bet_count,
        })),
        by_roi: topByROI.map((c) => ({
          customer_id: c.customer_id,
          segment: c.segment,
          roi: c.roi,
          net_profit: c.net_profit,
        })),
      },
      all_customers: customers,
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
    console.error('[getCustomerVolume] Error:', error);
    return {
      content: [
        {
          type: 'text',
          text: `Error retrieving customer volume analytics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
}
