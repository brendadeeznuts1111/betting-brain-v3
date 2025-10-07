/**
 * Sharp Activity Tool
 * Recent betting actions from identified sharp customers
 */

import { Env } from '../../types/api';
import { MCPToolResult } from '../types';

export async function getSharpActivity(args: Record<string, any>, env: Env): Promise<MCPToolResult> {
  try {
    const {
      agentID = 'DEMO',
      lookbackHours = 24,
      minSharpScore = 60,
    } = args;

    if (!env.ANALYTICS) {
      throw new Error('ANALYTICS database not available');
    }

    // Calculate lookback timestamp
    const lookbackTime = new Date(Date.now() - lookbackHours * 60 * 60 * 1000).toISOString();

    // Get sharp customers (score >= minSharpScore)
    const sharpQuery = `
      SELECT cid, clv, wr, ao
      FROM sharp_indicators
      WHERE (clv / 1000 * 0.5) + ((wr - 50) * 0.3) + ((ao / 10) * 0.2) >= ?
      ORDER BY clv DESC
      LIMIT 20
    `;

    const sharpCustomers = await env.ANALYTICS.prepare(sharpQuery).bind(minSharpScore).all();

    if (!sharpCustomers.results || sharpCustomers.results.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              message: 'No sharp customers found',
              criteria: {
                minSharpScore,
                lookbackHours,
              },
              agentID,
            }, null, 2),
          },
        ],
        isError: false,
      };
    }

    // Get recent line movements as proxy for sharp activity
    const activityQuery = `
      SELECT *
      FROM line_movements
      WHERE ts >= ?
      ORDER BY ts DESC
      LIMIT 50
    `;

    const recentActivity = await env.ANALYTICS.prepare(activityQuery).bind(lookbackTime).all();

    const response = {
      agentID,
      lookbackHours,
      minSharpScore,
      summary: {
        sharp_customers: sharpCustomers.results.length,
        recent_actions: recentActivity.results?.length || 0,
        time_period: `Last ${lookbackHours} hours`,
      },
      sharp_customers: sharpCustomers.results.map((c: any) => ({
        customer_id: c.cid,
        clv: c.clv,
        win_rate: c.wr,
        action_count: c.ao,
        sharp_score: Math.min(100, (c.clv / 1000 * 50) + ((c.wr - 50) * 30 / 100) + (c.ao / 10 * 20)),
      })),
      recent_activity: (recentActivity.results || []).map((a: any) => ({
        event_id: a.eid,
        market_type: a.mt,
        line_before: a.lb,
        line_after: a.la,
        volume_change: a.va - a.vb,
        timestamp: a.ts,
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
    console.error('[getSharpActivity] Error:', error);
    return {
      content: [
        {
          type: 'text',
          text: `Error tracking sharp activity: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
}
