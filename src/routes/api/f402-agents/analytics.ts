/**
 * Fantasy402 Agent Analytics
 * Performance metrics and detailed agent analysis
 */

import type { Env } from '../../../types/api';
import { CORS_HEADERS } from '../../../utils/request';

export async function getAgentPerformance(
  request: Request,
  env: Env,
  requestId: string
): Promise<Response> {
  const url = new URL(request.url);
  const period = url.searchParams.get('period') || 'today';

  console.log(`[${requestId}] 🤖 GET /api/f402/agents/performance?period=${period}`);

  const corsHeaders = CORS_HEADERS;

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

/**
 * GET /api/f402/agents/list?owner=BILLY666
 * Returns cached agent list by owner (fast login flow)
 */
export async function getAgentList(
  request: Request,
  env: Env,
  requestId: string
): Promise<Response> {
  const url = new URL(request.url);
  const owner = url.searchParams.get('owner');
  const agentID = url.searchParams.get('agentID');

  console.log(`[${requestId}] 👥 GET /api/f402/agents/list?owner=${owner}&agentID=${agentID}`);

  const corsHeaders = CORS_HEADERS;

  try {
    if (!env.FANTASY_CACHE) {
      throw new Error('FANTASY_CACHE not configured');
    }

    // Try cache keys in priority order
    const cacheKeys = [
      owner && `fantasy402:agents:by-owner:${owner}`,
      agentID && `fantasy402:agents:by-agent:${agentID}`,
      owner && `fantasy402:agents:latest:${owner}`,
    ].filter(Boolean) as string[];

    console.log(`[${requestId}] 🔍 Checking ${cacheKeys.length} cache keys...`);

    // Try each cache key until we find data
    for (const key of cacheKeys) {
      const cached = await env.FANTASY_CACHE.get(key);
      if (cached) {
        const data = JSON.parse(cached);
        console.log(`[${requestId}] ✅ Cache HIT: ${key} (${data.count} agents)`);

        // Track cache hit
        await incrementCacheMetric(env, 'agent_list_cache_hits');

        const response: AgentListResponse = {
          agents: data.agents,
          count: data.count,
          agentOwner: data.agentOwner,
          agentID: data.agentID,
          cached: true,
          capturedAt: data.capturedAt,
          offices: data.offices,
          agentTypes: data.agentTypes,
          requestId,
        };

        return new Response(JSON.stringify(response), {
          headers: {
            ...corsHeaders,
            'X-Cache': 'HIT',
            'X-Cache-Key': key,
          },
        });
      }
    }

    console.log(`[${requestId}] ❌ Cache MISS: No data found for owner=${owner} agentID=${agentID}`);

    // Track cache miss
    await incrementCacheMetric(env, 'agent_list_cache_misses');

    // Fallback to D1 if cache miss
    if (env.RAW_FEED_DB) {
      const query = owner
        ? await env.RAW_FEED_DB.prepare(`
            SELECT * FROM fantasy402_agents
            WHERE agent_owner = ?
            ORDER BY last_active DESC
            LIMIT 100
          `).bind(owner).all()
        : agentID
          ? await env.RAW_FEED_DB.prepare(`
            SELECT * FROM fantasy402_agents
            WHERE agent_id = ?
            ORDER BY last_active DESC
            LIMIT 100
          `).bind(agentID).all()
          : null;

      if (query && query.results.length > 0) {
        console.log(`[${requestId}] 📊 D1 fallback: ${query.results.length} agents`);

        const response: AgentListResponse = {
          agents: query.results,
          count: query.results.length,
          cached: false,
          requestId,
        };

        return new Response(JSON.stringify(response), {
          headers: {
            ...corsHeaders,
            'X-Cache': 'MISS',
            'X-Data-Source': 'D1',
          },
        });
      }
    }

    // No data found
    return new Response(
      JSON.stringify({
        agents: [],
        count: 0,
        cached: false,
        message: 'No agent data found. Please trigger a login flow to populate cache.',
        requestId,
      }),
      {
        status: 404,
        headers: {
          ...corsHeaders,
          'X-Cache': 'MISS',
        },
      }
    );

  } catch (error) {
    console.error(`[${requestId}] ❌ Error fetching agent list:`, error);

    return new Response(
      JSON.stringify({
        error: 'Failed to fetch agent list',
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
 * GET /api/f402/agents/:agentID
 * Returns cached agent details by ID
 */
export async function getAgentDetail(
  request: Request,
  env: Env,
  requestId: string,
  agentID: string
): Promise<Response> {
  console.log(`[${requestId}] 👤 GET /api/f402/agents/${agentID}`);

  const corsHeaders = CORS_HEADERS;

  try {
    if (!env.FANTASY_CACHE) {
      throw new Error('FANTASY_CACHE not configured');
    }

    // Check indexed agent cache
    const cacheKey = `fantasy402:agent:${agentID}`;
    const cached = await env.FANTASY_CACHE.get(cacheKey);

    if (cached) {
      const agent = JSON.parse(cached);
      console.log(`[${requestId}] ✅ Cache HIT: ${cacheKey}`);

      // Track cache hit
      await incrementCacheMetric(env, 'agent_detail_cache_hits');

      const response: AgentDetailResponse = {
        agent,
        cached: true,
        capturedAt: agent.capturedAt,
        requestId,
      };

      return new Response(JSON.stringify(response), {
        headers: {
          ...corsHeaders,
          'X-Cache': 'HIT',
        },
      });
    }

    console.log(`[${requestId}] ❌ Cache MISS: ${cacheKey}`);

    // Track cache miss
    await incrementCacheMetric(env, 'agent_detail_cache_misses');

    // Fallback to D1
    if (env.RAW_FEED_DB) {
      const result = await env.RAW_FEED_DB.prepare(`
        SELECT * FROM fantasy402_agents
        WHERE agent_id = ?
        LIMIT 1
      `).bind(agentID).first();

      if (result) {
        console.log(`[${requestId}] 📊 D1 fallback: Found agent ${agentID}`);

        const response: AgentDetailResponse = {
          agent: result,
          cached: false,
          requestId,
        };

        return new Response(JSON.stringify(response), {
          headers: {
            ...corsHeaders,
            'X-Cache': 'MISS',
            'X-Data-Source': 'D1',
          },
        });
      }
    }

    // Agent not found
    return new Response(
      JSON.stringify({
        error: 'Agent not found',
        message: `No agent found with ID: ${agentID}`,
        requestId,
      }),
      {
        status: 404,
        headers: corsHeaders,
      }
    );

  } catch (error) {
    console.error(`[${requestId}] ❌ Error fetching agent detail:`, error);

    return new Response(
      JSON.stringify({
        error: 'Failed to fetch agent detail',
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
 * Increment cache metric counter
 */
async function incrementCacheMetric(env: Env, metricName: string): Promise<void> {
  try {
    if (!env.FANTASY_CACHE) return;

    const key = `fantasy402:metrics:${metricName}`;
    const current = await env.FANTASY_CACHE.get(key);
    const count = current ? parseInt(current) : 0;

    await env.FANTASY_CACHE.put(key, String(count + 1), {
      expirationTtl: 86400 * 7, // 7 days
    });
  } catch (error) {
    // Don't fail the request if metrics fail
    console.warn('Failed to increment metric:', metricName, error);
  }
}

/**
 * GET /api/f402/agents/tree?owner=BILLY666
 * Returns agent hierarchy as tree structure
 */
