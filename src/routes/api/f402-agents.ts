/**
 * Fantasy402 Agent APIs
 *
 * GET /api/f402/agents/performance?period=today
 * Returns: { totalPnl: number, top: [{id: string, pnl: number}] }
 *
 * GET /api/f402/agents/list?owner=BILLY666
 * Returns: { agents: [...], count: number, cached: boolean }
 *
 * GET /api/f402/agents/:agentID
 * Returns: { agent: {...}, cached: boolean }
 *
 * Data source: fantasy402_agent_performance table, FANTASY_CACHE KV
 */

import { Env } from '../../types/api';

interface AgentPerformanceResponse {
  totalPnl: number;
  top: Array<{
    id: string;
    pnl: number;
  }>;
}

interface AgentListResponse {
  agents: any[];
  count: number;
  agentOwner?: string;
  agentID?: string;
  cached: boolean;
  capturedAt?: string;
  offices?: string[];
  agentTypes?: string[];
  requestId: string;
}

interface AgentDetailResponse {
  agent: any;
  cached: boolean;
  capturedAt?: string;
  requestId: string;
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

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

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

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

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
export async function getAgentTree(
  request: Request,
  env: Env,
  requestId: string
): Promise<Response> {
  const url = new URL(request.url);
  const owner = url.searchParams.get('owner');

  console.log(`[${requestId}] 🌳 GET /api/f402/agents/tree?owner=${owner}`);

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    if (!env.FANTASY_CACHE) {
      throw new Error('FANTASY_CACHE not configured');
    }

    // Try cache keys in priority order (latest sync → owner-specific → D1)
    const cacheKeys = [
      'fantasy402:agents:tree:latest',                          // From sync script
      owner ? `fantasy402:agents:by-owner:${owner}` : null,     // From interceptor
    ].filter(Boolean) as string[];

    let agents: any[] = [];
    let cacheHit = false;

    for (const cacheKey of cacheKeys) {
      const cached = await env.FANTASY_CACHE.get(cacheKey);
      if (cached) {
        const data = JSON.parse(cached);
        agents = data.agents || [];
        console.log(`[${requestId}] ✅ Cache HIT (${cacheKey}): ${agents.length} agents`);
        cacheHit = true;
        break;
      }
    }

    // Fallback to D1 if no cache hit
    if (!cacheHit && env.RAW_FEED_DB) {
      const query = await env.RAW_FEED_DB.prepare(`
        SELECT * FROM fantasy402_agents
        ${owner ? 'WHERE agent_owner = ?' : ''}
        ORDER BY agent_owner, agent_id
        LIMIT 2000
      `);

      const result = owner ? await query.bind(owner).all() : await query.all();
      agents = result.results as any[];
      console.log(`[${requestId}] 📊 D1 fallback: ${agents.length} agents`);
    }

    if (agents.length === 0) {
      return new Response(
        JSON.stringify({
          tree: null,
          message: 'No agent data found',
          requestId,
        }),
        {
          status: 404,
          headers: corsHeaders,
        }
      );
    }

    // Build hierarchical tree structure
    const tree = buildAgentTree(agents, owner);

    return new Response(
      JSON.stringify({
        tree,
        totalAgents: agents.length,
        rootOwner: owner,
        requestId,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: corsHeaders,
      }
    );
  } catch (error) {
    console.error(`[${requestId}] ❌ Error building agent tree:`, error);

    return new Response(
      JSON.stringify({
        error: 'Failed to build agent tree',
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
 * Build hierarchical tree from flat agent list
 */
function buildAgentTree(agents: any[], rootOwner: string | null): any {
  // Group agents by parent_id
  const byParent = new Map<string, any[]>();
  const agentMap = new Map<string, any>();

  for (const agent of agents) {
    const id = agent.agentID || agent.agent_id;
    const parentId = agent.parentID || agent.parent_id;
    const owner = agent.agentOwner || agent.agent_owner;

    agentMap.set(id, {
      id,
      name: agent.agent_name || agent.agentName || id,
      owner,
      parent: parentId,
      type: agent.agentType || agent.agent_type,
      office: agent.office,
      totalRequests: agent.totalRequests || agent.total_requests || 0,
      lastActive: agent.lastActive || agent.last_active,
      // Real metrics from cached API data (own + children rollup)
      risk: agent.risk_score || 0,
      steam: agent.steam_percentage || 0,
      velocity: agent.velocity || 0,
      sharpness: agent.sharpness || 0,
      // Rollup totals (includes descendants)
      totalRisk: agent.total_risk || agent.risk_score || 0,
      totalSteam: agent.total_steam || agent.steam_percentage || 0,
      totalVelocity: agent.total_velocity || agent.velocity || 0,
      totalSharpness: agent.total_sharpness || agent.sharpness || 0,
      // Hierarchy metadata
      childCount: agent.child_count || 0,
      descendantCount: agent.descendant_count || 0,
      children: [],
    });

    // Group by parent_id for hierarchy
    if (parentId) {
      if (!byParent.has(parentId)) {
        byParent.set(parentId, []);
      }
      byParent.get(parentId)!.push(id);
    }
  }

  // Build tree structure
  const root = {
    id: rootOwner || 'ROOT',
    name: rootOwner || 'All Agents',
    owner: null,
    type: 'MASTER',
    office: null,
    totalRequests: 0,
    children: [] as any[],
  };

  // Recursive function to build children
  function buildChildren(parentId: string): any[] {
    const childIds = byParent.get(parentId) || [];
    return childIds.map((childId) => {
      const child = agentMap.get(childId);
      if (!child) return null;

      child.children = buildChildren(childId);
      return child;
    }).filter(Boolean);
  }

  // If we have a root owner, build from there
  if (rootOwner) {
    root.children = buildChildren(rootOwner);

    // Add the root owner's info
    const rootAgent = agentMap.get(rootOwner);
    if (rootAgent) {
      root.totalRequests = rootAgent.totalRequests;
      root.type = rootAgent.type;
      root.office = rootAgent.office;
    }
  } else {
    // No root specified - find top-level agents (agents with no parent in the set)
    const allIds = new Set(agentMap.keys());
    const childIds = new Set<string>();
    for (const children of byParent.values()) {
      children.forEach(id => childIds.add(id));
    }

    const topLevelIds = [...allIds].filter(id => !childIds.has(id));
    root.children = topLevelIds.map(id => {
      const agent = agentMap.get(id)!;
      agent.children = buildChildren(id);
      return agent;
    });
  }

  return root;
}

/**
 * POST /api/f402/agents/sync
 * Bulk upsert agents from Fantasy402 sync
 */
export async function syncAgents(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const requestId = Date.now().toString(36);
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    const body = await request.json() as { agents: any[]; source?: string; timestamp?: string };
    const agents = body.agents || [];

    if (!Array.isArray(agents) || agents.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: agents array required' }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`[${requestId}] 🔄 Syncing ${agents.length} agents from ${body.source || 'unknown'}`);

    if (!env.RAW_FEED_DB) {
      return new Response(
        JSON.stringify({ error: 'Database not available' }),
        { status: 503, headers: corsHeaders }
      );
    }

    let inserted = 0;
    let updated = 0;
    let errors = 0;

    // Batch upsert agents
    for (const agent of agents) {
      try {
        const stmt = env.RAW_FEED_DB.prepare(`
          INSERT OR REPLACE INTO fantasy402_agents (
            agent_id, parent_id, agent_type, agent_owner, agent_name,
            level, path, credit_limit, outstanding_balance, hold_percentage,
            active, site_id, synced_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          agent.agent_id,
          agent.parent_id || null,
          agent.agent_type,
          agent.agent_owner,
          agent.agent_name || agent.agent_id,
          agent.level || 0,
          agent.path || `/${agent.agent_id}`,
          agent.credit_limit || 0,
          agent.outstanding_balance || 0,
          agent.hold_percentage || 0,
          agent.active !== undefined ? agent.active : 1,
          agent.site_id || 1,
          agent.synced_at || Date.now(),
          Date.now()
        );

        await stmt.run();
        inserted++;
      } catch (error) {
        console.error(`[${requestId}] ❌ Error upserting agent ${agent.agent_id}:`, error);
        errors++;
      }
    }

    console.log(`[${requestId}] ✅ Sync complete: ${inserted} upserted, ${errors} errors`);

    // Invalidate cache
    ctx.waitUntil(
      Promise.all([
        env.LIVEBETS_STORE.delete('fantasy402:agents:tree:all'),
        env.LIVEBETS_STORE.delete(`fantasy402:agents:tree:${agents[0]?.agent_owner}`)
      ])
    );

    return new Response(
      JSON.stringify({
        success: true,
        total: agents.length,
        upserted: inserted,
        errors,
        requestId,
        timestamp: new Date().toISOString()
      }),
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error(`[${requestId}] ❌ Sync error:`, error);
    return new Response(
      JSON.stringify({
        error: 'Sync failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId
      }),
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * GET /api/f402/cache/metrics
 * Returns cache performance metrics
 */
export async function getCacheMetrics(
  request: Request,
  env: Env,
  requestId: string
): Promise<Response> {
  console.log(`[${requestId}] 📊 GET /api/f402/cache/metrics`);

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    if (!env.FANTASY_CACHE) {
      throw new Error('FANTASY_CACHE not configured');
    }

    // Fetch all cache metrics
    const metricKeys = [
      'agent_list_requests',
      'agent_list_cache_writes',
      'agent_list_cache_hits',
      'agent_list_cache_misses',
      'agent_list_d1_writes_skipped',
      'agent_list_d1_writes_executed',
      'agent_detail_cache_hits',
      'agent_detail_cache_misses',
    ];

    const metricValues = await Promise.all(
      metricKeys.map(async (key) => {
        const value = await env.FANTASY_CACHE!.get(`fantasy402:metrics:${key}`);
        return { key, value: value ? parseInt(value) : 0 };
      })
    );

    const metrics: Record<string, number> = {};
    metricValues.forEach(({ key, value }) => {
      metrics[key] = value;
    });

    // Calculate derived metrics
    const totalRequests = metrics.agent_list_requests || 0;
    const totalHits = metrics.agent_list_cache_hits || 0;
    const totalMisses = metrics.agent_list_cache_misses || 0;
    const totalD1Skipped = metrics.agent_list_d1_writes_skipped || 0;
    const totalD1Executed = metrics.agent_list_d1_writes_executed || 0;

    const cacheHitRate = totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;
    const d1WriteReduction = (totalD1Skipped + totalD1Executed) > 0
      ? (totalD1Skipped / (totalD1Skipped + totalD1Executed)) * 100
      : 0;

    const response = {
      raw: metrics,
      summary: {
        totalRequests,
        cacheHits: totalHits,
        cacheMisses: totalMisses,
        cacheHitRate: parseFloat(cacheHitRate.toFixed(2)),
        d1WritesSkipped: totalD1Skipped,
        d1WritesExecuted: totalD1Executed,
        d1WriteReduction: parseFloat(d1WriteReduction.toFixed(2)),
      },
      agentDetail: {
        cacheHits: metrics.agent_detail_cache_hits || 0,
        cacheMisses: metrics.agent_detail_cache_misses || 0,
        hitRate:
          (metrics.agent_detail_cache_hits || 0) +
            (metrics.agent_detail_cache_misses || 0) >
            0
            ? parseFloat(
              (
                ((metrics.agent_detail_cache_hits || 0) /
                  ((metrics.agent_detail_cache_hits || 0) +
                    (metrics.agent_detail_cache_misses || 0))) *
                100
              ).toFixed(2)
            )
            : 0,
      },
      requestId,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error(`[${requestId}] ❌ Error fetching cache metrics:`, error);

    return new Response(
      JSON.stringify({
        error: 'Failed to fetch cache metrics',
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
