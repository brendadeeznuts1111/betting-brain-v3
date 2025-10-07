/**
 * Risk Concentration Analysis Tool
 * Identifies exposure clustering by customer, event, or market
 */

import { Env } from '../../types/api';
import { MCPToolResult } from '../types';

export async function getRiskConcentration(args: Record<string, any>, env: Env): Promise<MCPToolResult> {
  try {
    const {
      agentID = 'DEMO',
      groupBy = 'event',
      limit = 20,
    } = args;

    if (!env.ANALYTICS) {
      throw new Error('ANALYTICS database not available');
    }

    let query = '';
    let groupByField = '';

    switch (groupBy) {
      case 'event':
        // Group by event to find highest risk events
        query = `
          SELECT
            eid as event_id,
            SUM(risk) as total_risk,
            SUM(net) as net_exposure,
            COUNT(*) as position_count,
            MAX(risk) as max_single_risk,
            GROUP_CONCAT(side) as sides
          FROM exposure_tracking
          GROUP BY eid
          ORDER BY total_risk DESC
          LIMIT ?
        `;
        groupByField = 'event';
        break;

      case 'customer':
        // Would need customer_id in exposure_tracking table
        // For now, return aggregated data
        query = `
          SELECT
            'ALL' as customer_group,
            SUM(risk) as total_risk,
            SUM(net) as net_exposure,
            COUNT(DISTINCT eid) as event_count,
            AVG(risk) as avg_risk_per_event
          FROM exposure_tracking
          LIMIT ?
        `;
        groupByField = 'customer';
        break;

      case 'market':
        // Would need market_type in exposure_tracking
        // Return per-side analysis instead
        query = `
          SELECT
            side as market_side,
            SUM(risk) as total_risk,
            SUM(net) as net_exposure,
            COUNT(DISTINCT eid) as event_count,
            AVG(risk) as avg_risk_per_event,
            MAX(risk) as max_risk
          FROM exposure_tracking
          GROUP BY side
          ORDER BY total_risk DESC
          LIMIT ?
        `;
        groupByField = 'market';
        break;

      case 'sport':
        // Sport not in base schema, return message
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                message: 'Sport grouping requires extended schema',
                suggestion: 'Use groupBy: event, customer, or market',
                agentID,
              }, null, 2),
            },
          ],
          isError: false,
        };

      default:
        throw new Error(`Invalid groupBy: ${groupBy}. Use: event, customer, market, or sport`);
    }

    const result = await env.ANALYTICS.prepare(query).bind(limit).all();

    // Calculate concentration metrics
    const concentrations = result.results || [];
    const totalRisk = concentrations.reduce((sum: number, c: any) => sum + (c.total_risk || 0), 0);

    const summary = {
      group_by: groupBy,
      total_groups: concentrations.length,
      total_risk: totalRisk,
      top_10_pct: concentrations.slice(0, Math.ceil(concentrations.length * 0.1))
        .reduce((sum: number, c: any) => sum + (c.total_risk || 0), 0),
      concentration_ratio: concentrations.length > 0
        ? (concentrations[0] as any).total_risk / totalRisk
        : 0,
      diversification_score: Math.min(100, (concentrations.length / limit) * 100),
    };

    const response = {
      agentID,
      groupBy,
      summary,
      concentrations: concentrations.map((c: any) => ({
        ...c,
        risk_percentage: totalRisk > 0 ? ((c.total_risk / totalRisk) * 100).toFixed(2) + '%' : '0%',
        severity: c.total_risk > 100000 ? 'HIGH' : c.total_risk > 50000 ? 'MEDIUM' : 'LOW',
      })),
      metadata: {
        risk_thresholds: {
          high: '>$1,000',
          medium: '>$500',
          low: '<$500',
        },
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
    console.error('[getRiskConcentration] Error:', error);
    return {
      content: [
        {
          type: 'text',
          text: `Error analyzing risk concentration: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
}
