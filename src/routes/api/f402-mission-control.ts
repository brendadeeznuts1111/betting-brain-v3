/**
 * Fantasy402 Mission Control - Unified Dashboard Endpoint
 *
 * GET /api/f402/mission-control
 * Returns all dashboard data in a single call:
 * - Floor status
 * - Grove health
 * - MCP tools
 * - Live bets (in-flight + volume)
 * - Agent performance (PNL + top agents)
 * - Customer pulse (active + staked)
 * - Transaction ticker (last 10)
 * - Pending wagers count
 */

import { Env } from '../../types/api';

interface MissionControlResponse {
  floor: {
    version: string;
    status: string;
    tests: { pass: number; fail: number; total: number; rate: number };
    coverage: { percentage: number };
  };
  grove: {
    status: string;
    worker: string;
    database: string;
    queue: string;
  };
  mcp: {
    count: number;
    tools: string[];
  };
  liveBets: {
    count: number;
    buckets: Array<{ minute: string; volume: number }>;
  };
  agents: {
    totalPnl: number;
    top: Array<{ id: string; pnl: number }>;
  };
  customers: {
    active: number;
    staked: number;
  };
  transactions: Array<{
    type: 'BET' | 'PAYOUT';
    customerId: string;
    amount: number;
    status: 'PENDING' | 'SETTLED';
    timestamp: string;
  }>;
  pending: number;
  timestamp: string;
  requestId: string;
}

/**
 * GET /api/f402/mission-control
 * Single endpoint for entire dashboard - fetches all data in parallel
 */
export async function getMissionControl(
  request: Request,
  env: Env,
  requestId: string
): Promise<Response> {
  console.log(`[${requestId}] 🎯 GET /api/f402/mission-control (unified dashboard)`);

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

    // Fetch all data in parallel for maximum performance
    const [
      floorStatus,
      liveBetsCount,
      volumeData,
      totalPnl,
      topAgents,
      activeCustomers,
      stakedTotal,
      transactions,
      pendingCount,
    ] = await Promise.all([
      // 1. Floor status (from floor-status route)
      getFloorStatus(env, requestId),

      // 2. Live bets count (PENDING)
      env.ANALYTICS.prepare(`
        SELECT COUNT(*) as count
        FROM bet_history
        WHERE result = 'PENDING'
      `).first() as Promise<{ count: number } | null>,

      // 3. Volume buckets (last 5 minutes)
      env.ANALYTICS.prepare(`
        SELECT
          strftime('%H:%M', ts) as minute,
          SUM(stake) as volume
        FROM bet_history
        WHERE ts > datetime('now', '-5 minutes')
        GROUP BY strftime('%H:%M', ts)
        ORDER BY minute DESC
        LIMIT 5
      `).all(),

      // 4. Total PNL (today)
      env.ANALYTICS.prepare(`
        SELECT SUM(net_income) as totalPnl
        FROM fantasy402_agent_performance
        WHERE date(period_start) = date('now')
      `).first() as Promise<{ totalPnl: number | null } | null>,

      // 5. Top 3 agents
      env.ANALYTICS.prepare(`
        SELECT
          agent_id as id,
          SUM(net_income) as pnl
        FROM fantasy402_agent_performance
        WHERE date(period_start) = date('now')
        GROUP BY agent_id
        ORDER BY pnl DESC
        LIMIT 3
      `).all(),

      // 6. Active customers (last 30 min)
      env.ANALYTICS.prepare(`
        SELECT COUNT(DISTINCT cid) as count
        FROM bet_history
        WHERE ts > datetime('now', '-30 minutes')
      `).first() as Promise<{ count: number } | null>,

      // 7. Total staked (today)
      env.ANALYTICS.prepare(`
        SELECT SUM(stake) as total
        FROM bet_history
        WHERE date(ts) = date('now')
      `).first() as Promise<{ total: number | null } | null>,

      // 8. Last 10 transactions
      env.ANALYTICS.prepare(`
        SELECT
          CASE
            WHEN result = 'WIN' THEN 'PAYOUT'
            ELSE 'BET'
          END as type,
          cid as customerId,
          CASE
            WHEN result = 'WIN' THEN payout
            ELSE stake
          END as amount,
          CASE
            WHEN result = 'PENDING' THEN 'PENDING'
            ELSE 'SETTLED'
          END as status,
          ts as timestamp
        FROM bet_history
        ORDER BY ts DESC
        LIMIT 10
      `).all(),

      // 9. Pending wagers count (same as live bets for now)
      env.ANALYTICS.prepare(`
        SELECT COUNT(*) as count
        FROM bet_history
        WHERE result = 'PENDING'
      `).first() as Promise<{ count: number } | null>,
    ]);

    // Build volume buckets (fill missing minutes)
    const now = new Date();
    const buckets: MissionControlResponse['liveBets']['buckets'] = [];
    const volumeMap = new Map(
      (volumeData.results as Array<{ minute: string; volume: number }>).map((v) => [v.minute, v.volume])
    );

    for (let i = 4; i >= 0; i--) {
      const minuteTime = new Date(now.getTime() - i * 60000);
      const minuteKey = minuteTime.toISOString().substring(11, 16); // HH:MM
      buckets.push({
        minute: minuteKey,
        volume: volumeMap.get(minuteKey) || 0,
      });
    }

    // Build response
    const response: MissionControlResponse = {
      floor: floorStatus,
      grove: {
        status: 'healthy',
        worker: 'up',
        database: env.ANALYTICS ? 'up' : 'down',
        queue: env.LINE_INGRESS ? 'up' : 'down',
      },
      mcp: {
        count: 6,
        tools: [
          'forest-status',
          'deploy-dashboards',
          'release',
          'live-odds',
          'live-scores',
          'push-sports-data',
        ],
      },
      liveBets: {
        count: liveBetsCount?.count || 0,
        buckets,
      },
      agents: {
        totalPnl: totalPnl?.totalPnl || 0,
        top: (topAgents.results as Array<{ id: string; pnl: number }>).map((a) => ({
          id: a.id,
          pnl: a.pnl,
        })),
      },
      customers: {
        active: activeCustomers?.count || 0,
        staked: stakedTotal?.total || 0,
      },
      transactions: transactions.results as MissionControlResponse['transactions'],
      pending: pendingCount?.count || 0,
      timestamp: new Date().toISOString(),
      requestId,
    };

    console.log(`[${requestId}] ✅ Mission control data:`, {
      liveBets: response.liveBets.count,
      pending: response.pending,
      activeCustomers: response.customers.active,
      totalPnl: response.agents.totalPnl,
      transactions: response.transactions.length,
    });

    return new Response(JSON.stringify(response), {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error(`[${requestId}] ❌ Error fetching mission control:`, error);

    return new Response(
      JSON.stringify({
        error: 'Failed to fetch mission control data',
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

/**
 * Get Floor status data
 */
async function getFloorStatus(env: Env, requestId: string) {
  try {
    // Return floor metrics
    // In production, this would call the actual floor-status route
    return {
      version: '3.3.0',
      status: 'green',
      tests: {
        pass: 239,
        fail: 60,
        total: 299,
        rate: 0.8,
      },
      coverage: {
        percentage: 81,
      },
    };
  } catch (error) {
    console.error(`[${requestId}] ⚠️  Floor status error:`, error);
    return {
      version: '3.3.0',
      status: 'unknown',
      tests: { pass: 0, fail: 0, total: 0, rate: 0 },
      coverage: { percentage: 0 },
    };
  }
}
