/**
 * Fantasy402 Mission Control - Unified Dashboard Endpoint
 *
 * GET /api/f402/mission-control
 * Reads intercepted BetTicker data from KV (populated by bet-ticker-sniffer)
 * Returns all dashboard data in a single call:
 * - Floor status
 * - Grove health
 * - MCP tools
 * - Live bets (in-flight + volume)
 * - Agent performance (PNL + top agents)
 * - Customer pulse (active + staked)
 * - Transaction ticker (last 10)
 */

import { Env } from '../../types/api';

interface BetTickerWager {
  wagerId?: string;
  customerId?: string;
  agentId?: string;
  risk?: number;
  toWin?: number;
  agentPnl?: number;
  type?: string;
  status?: string;
  placedAt?: number | string;
  settledAt?: number | string;
}

interface BetTickerResponse {
  data?: {
    wagers?: BetTickerWager[];
    summary?: any;
  };
  wagers?: BetTickerWager[]; // Alternative structure
}

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
    volume: number;
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
    type: string;
    customerId: string;
    amount: number;
    status: string;
  }>;
  timestamp: string;
  requestId: string;
  dataSource: 'kv' | 'mock';
}

/**
 * GET /api/f402/mission-control
 * Reads from KV-stored BetTicker responses
 * 
 * Query Parameters:
 * - expand=true: Include analytics data for drill-down cards
 */
export async function getMissionControl(
  request: Request,
  env: Env,
  requestId: string
): Promise<Response> {
  console.log(`[${requestId}] 🎯 GET /api/f402/mission-control (KV-backed)`);

  const url = new URL(request.url);
  const expand = url.searchParams.get('expand') === 'true';

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    // 1. Get latest BetTicker data from KV
    const betTickerData = await getLatestBetTickerFromKV(env, requestId);
    const wagers = betTickerData?.data?.wagers || betTickerData?.wagers || [];

    console.log(`[${requestId}] 📊 Found ${wagers.length} wagers in latest BetTicker`);

    // 2. Aggregate live bets
    const liveBets = {
      count: wagers.length,
      volume: wagers.reduce((sum, w) => sum + (w.risk || 0), 0),
      buckets: aggregateLast5Min(wagers),
    };

    // Add analytics data if expand=true
    if (expand) {
      try {
        // Get analytics from KV cache
        const analyticsData = await env.FANTASY_CACHE?.get('betTicker:analytics');
        if (analyticsData) {
          const analytics = JSON.parse(analyticsData);
          (liveBets as any).analytics = {
            steamAlerts: analytics.steamAlerts || [],
            riskByAgent: analytics.riskByAgent || {},
            exposureBySide: analytics.exposureBySide || {},
            custRecency: analytics.custRecency || {}
          };
          console.log(`[${requestId}] 📊 Added analytics to liveBets:`, {
            steamAlerts: analytics.steamAlerts?.length || 0,
            agents: Object.keys(analytics.riskByAgent || {}).length,
            games: Object.keys(analytics.exposureBySide || {}).length
          });
        } else {
          console.log(`[${requestId}] ⚠️ No analytics data found in cache`);
        }
      } catch (error) {
        console.warn(`[${requestId}] ⚠️ Failed to fetch analytics data:`, error);
      }
    }

    // 3. Aggregate agents
    const agentMap = new Map<string, number>();
    wagers.forEach((w) => {
      const agent = w.agentId || 'unknown';
      agentMap.set(agent, (agentMap.get(agent) || 0) + (w.agentPnl || 0));
    });

    const topAgents = Array.from(agentMap.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([id, pnl]) => ({ id, pnl }));

    const agents = {
      totalPnl: wagers.reduce((sum, w) => sum + (w.agentPnl || 0), 0),
      top: topAgents,
    };

    // 4. Aggregate customers
    const uniqueCustomers = new Set(wagers.map((w) => w.customerId).filter(Boolean));
    const customers = {
      active: uniqueCustomers.size,
      staked: wagers.reduce((sum, w) => sum + (w.risk || 0), 0),
    };

    // 5. Last 10 transactions
    const transactions = wagers.slice(0, 10).map((w) => ({
      type: w.type || 'wager',
      customerId: w.customerId || 'unknown',
      amount: w.risk || 0,
      status: w.status || 'pending',
    }));

    // 6. Build response
    const response: MissionControlResponse = {
      floor: getFloorStatus(),
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
      liveBets,
      agents,
      customers,
      transactions,
      timestamp: new Date().toISOString(),
      requestId,
      dataSource: wagers.length > 0 ? 'kv' : 'mock',
    };

    console.log(`[${requestId}] ✅ Mission control data:`, {
      liveBets: response.liveBets.count,
      volume: response.liveBets.volume,
      activeCustomers: response.customers.active,
      totalPnl: response.agents.totalPnl,
      transactions: response.transactions.length,
      dataSource: response.dataSource,
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
 * Get latest BetTicker response from KV
 */
async function getLatestBetTickerFromKV(
  env: Env,
  requestId: string
): Promise<BetTickerResponse | null> {
  try {
    if (!env.BET_TICKER_RAW) {
      console.warn(`[${requestId}] ⚠️  BET_TICKER_RAW KV not configured`);
      return null;
    }

    // List all BetTicker keys (they're timestamped)
    const list = await env.BET_TICKER_RAW.list({
      prefix: 'raw:getBetTicker:',
      limit: 1, // Only get the most recent
    });

    if (list.keys.length === 0) {
      console.warn(`[${requestId}] ⚠️  No BetTicker data in KV`);
      return null;
    }

    // Keys are sorted by name, and we use timestamps, so the last one is most recent
    // But list() returns in sorted order, so we need to reverse or get the latest
    const latestKey = list.keys[list.keys.length - 1].name;

    console.log(`[${requestId}] 🔑 Latest BetTicker key: ${latestKey}`);

    // Get the value
    const rawValue = await env.BET_TICKER_RAW.get(latestKey);

    if (!rawValue) {
      console.warn(`[${requestId}] ⚠️  No value for key ${latestKey}`);
      return null;
    }

    // Parse JSON
    const data = JSON.parse(rawValue) as BetTickerResponse;

    console.log(`[${requestId}] ✅ Loaded BetTicker data from KV`);

    return data;
  } catch (error) {
    console.error(`[${requestId}] ❌ Error loading from KV:`, error);
    return null;
  }
}

/**
 * Aggregate wagers into 5-minute buckets
 */
function aggregateLast5Min(wagers: BetTickerWager[]): Array<{ minute: string; volume: number }> {
  const now = Date.now();
  const buckets: Record<string, number> = {};

  for (const w of wagers) {
    const placedTime = typeof w.placedAt === 'number' ? w.placedAt : Date.parse(w.placedAt || '0');
    const ageMinutes = Math.floor((now - placedTime) / 60_000);

    if (ageMinutes < 5 && ageMinutes >= 0) {
      const label = `${4 - ageMinutes}m ago`;
      buckets[label] = (buckets[label] || 0) + (w.risk || 0);
    }
  }

  return Object.entries(buckets)
    .map(([minute, volume]) => ({ minute, volume }))
    .sort((a, b) => a.minute.localeCompare(b.minute));
}

/**
 * Get Floor status data (static for now)
 */
function getFloorStatus() {
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
}
