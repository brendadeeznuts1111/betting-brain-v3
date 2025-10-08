/**
 * Fantasy402 Agent Performance API
 *
 * GET /api/f402/agents/performance?period=today
 * Returns: { totalPnl: number, top: [{id: string, pnl: number}] }
 *
 * Data source: fantasy402_agent_performance table
 */

import { Env } from '../../types/api';

interface AgentPerformanceResponse {
  totalPnl: number;
  top: Array<{
    id: string;
    pnl: number;
  }>;
}

/**
 * GET /api/f402/agents/performance
 * Returns total PNL and top 3 agents for specified period
 */
export async function getAgentPerformance(
  request: Request,
  env: Env,
  requestId: string
): Promise<Response> {
  const url = new URL(request.url);
  const period = url.searchParams.get('period') || 'today';

  console.log(`[${requestId}] 🤖 GET /api/f402/agents/performance?period=${period}`);

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    if (!env.ANALYTICS) {
      throw new Error('ANALYTICS database not configured');
    }

    // Determine date filter based on period
    let dateFilter = `date(period_start) = date('now')`;
    if (period === 'week') {
      dateFilter = `date(period_start) >= date('now', '-7 days')`;
    } else if (period === 'month') {
      dateFilter = `date(period_start) >= date('now', '-30 days')`;
    }

    // 1. Get total PNL across all agents for period
    const totalPnlQuery = await env.ANALYTICS.prepare(`
      SELECT SUM(net_income) as totalPnl
      FROM fantasy402_agent_performance
      WHERE ${dateFilter}
    `).first() as { totalPnl: number | null } | null;

    const totalPnl = totalPnlQuery?.totalPnl || 0;
    console.log(`[${requestId}] 💰 Total PNL (${period}): $${totalPnl.toFixed(2)}`);

    // 2. Get top 3 agents by net income
    const topAgentsQuery = await env.ANALYTICS.prepare(`
      SELECT
        agent_id as id,
        SUM(net_income) as pnl
      FROM fantasy402_agent_performance
      WHERE ${dateFilter}
      GROUP BY agent_id
      ORDER BY pnl DESC
      LIMIT 3
    `).all();

    const topAgents = (topAgentsQuery.results as Array<{ id: string; pnl: number }>).map((agent) => ({
      id: agent.id,
      pnl: agent.pnl,
    }));

    console.log(`[${requestId}] 🏆 Top ${topAgents.length} agents:`, topAgents);

    const response: AgentPerformanceResponse = {
      totalPnl,
      top: topAgents,
    };

    return new Response(JSON.stringify(response), {
      headers: corsHeaders,
    });

  } catch (error) {
    console.error(`[${requestId}] ❌ Error fetching agent performance:`, error);

    return new Response(
      JSON.stringify({
        error: 'Failed to fetch agent performance',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      }),
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}
