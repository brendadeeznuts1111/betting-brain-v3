/**
 * Fantasy402 Agent Tree & Sync
 * Agent hierarchy and synchronization logic
 */

import type { Env } from '../../../types/api';
import { CORS_HEADERS } from '../../../utils/request';
import {
  MAX_AGENT_QUERY_LIMIT,
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_NOT_FOUND,
  HTTP_STATUS_SERVICE_UNAVAILABLE,
  HTTP_STATUS_SERVER_ERROR
} from './constants';

export async function getAgentTree(
  request: Request,
  env: Env,
  requestId: string
): Promise<Response> {
  const url = new URL(request.url);
  const owner = url.searchParams.get('owner');

  console.log(`[${requestId}] 🌳 GET /api/f402/agents/tree?owner=${owner}`);

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
        LIMIT ${MAX_AGENT_QUERY_LIMIT}
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
          status: HTTP_STATUS_NOT_FOUND,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
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
        timestamp: new Date(Date.now()).toISOString(),
      }),
      {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
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
        status: HTTP_STATUS_SERVER_ERROR,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
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
      lastActive: agent.lastActive || agent.last_active || new Date(Date.now()).toISOString(),
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
  // Using CORS_HEADERS directly

  try {
    const body = await request.json() as { agents: any[]; source?: string; timestamp?: string };
    const agents = body.agents || [];

    if (!Array.isArray(agents) || agents.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: agents array required' }),
        { status: HTTP_STATUS_BAD_REQUEST, headers: CORS_HEADERS }
      );
    }

    console.log(`[${requestId}] 🔄 Syncing ${agents.length} agents from ${body.source || 'unknown'}`);

    if (!env.RAW_FEED_DB) {
      return new Response(
        JSON.stringify({ error: 'Database not available' }),
        { status: HTTP_STATUS_SERVICE_UNAVAILABLE, headers: CORS_HEADERS }
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
        timestamp: new Date(Date.now()).toISOString()
      }),
      { headers: CORS_HEADERS }
    );

  } catch (error) {
    console.error(`[${requestId}] ❌ Sync error:`, error);
    return new Response(
      JSON.stringify({
        error: 'Sync failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId
      }),
      { status: HTTP_STATUS_SERVER_ERROR, headers: CORS_HEADERS }
    );
  }
}

/**
 * GET /api/f402/cache/metrics
 * Returns cache performance metrics
 */
