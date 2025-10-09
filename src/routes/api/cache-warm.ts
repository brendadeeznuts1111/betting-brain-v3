/**
 * Cache Warming API
 *
 * POST /api/f402/cache/warm
 * Warms the cache with pre-populated data from D1
 *
 * Useful for:
 * - Server restarts
 * - Initial deployment
 * - Manual cache refresh
 */

import { Env } from '../../types/api';
import { CORS_HEADERS } from '../../utils/request';

interface CacheWarmResponse {
  success: boolean;
  warmed: {
    agents: number;
    agentLists: number;
  };
  duration: number;
  requestId: string;
  timestamp: string;
}

/**
 * POST /api/f402/cache/warm
 * Warms KV cache with D1 data
 */
export async function warmCache(
  request: Request,
  env: Env,
  requestId: string
): Promise<Response> {
  console.log(`[${requestId}] 🔥 POST /api/f402/cache/warm`);

  const startTime = Date.now();



  try {
    if (!env.FANTASY_CACHE || !env.RAW_FEED_DB) {
      throw new Error('FANTASY_CACHE or RAW_FEED_DB not configured');
    }

    let agentsWarmed = 0;
    let agentListsWarmed = 0;

    // 1. Warm agent hierarchies (group by owner)
    const owners = await env.RAW_FEED_DB.prepare(`
      SELECT DISTINCT agent_owner
      FROM fantasy402_agents
      WHERE agent_owner IS NOT NULL
      LIMIT 100
    `).all();

    console.log(`[${requestId}] 🔍 Found ${owners.results.length} unique owners`);

    // Warm each owner's agent list
    for (const ownerRow of owners.results as Array<{ agent_owner: string }>) {
      const owner = ownerRow.agent_owner;
      if (!owner) continue;

      // Fetch all agents for this owner
      const agents = await env.RAW_FEED_DB.prepare(`
        SELECT *
        FROM fantasy402_agents
        WHERE agent_owner = ?
        ORDER BY last_active DESC
        LIMIT 500
      `).bind(owner).all();

      if (agents.results.length === 0) continue;

      const agentList = agents.results as any[];

      // Create cache data
      const cacheData = {
        agents: agentList,
        agentOwner: owner,
        agentID: null,
        count: agentList.length,
        capturedAt: new Date(Date.now()).toISOString(),
        offices: [...new Set(agentList.map((a: any) => a.office).filter(Boolean))],
        agentTypes: [...new Set(agentList.map((a: any) => a.agent_type).filter(Boolean))],
        warmedAt: new Date(Date.now()).toISOString(),
      };

      // Store in all cache keys
      const cacheKeys = [
        `fantasy402:agents:by-owner:${owner}`,
        `fantasy402:agents:latest:${owner}`,
      ];

      await Promise.all(
        cacheKeys.map(key =>
          env.FANTASY_CACHE!.put(key, JSON.stringify(cacheData), {
            expirationTtl: 3600, // 1 hour (safe during iteration)
          })
        )
      );

      agentListsWarmed += cacheKeys.length;

      // 2. Index individual agents
      const indexPromises = agentList.map((agent: any) => {
        if (!agent.agent_id) return null;
        return env.FANTASY_CACHE!.put(
          `fantasy402:agent:${agent.agent_id}`,
          JSON.stringify({
            ...agent,
            agentOwner: owner,
            capturedAt: new Date(Date.now()).toISOString(),
            warmedAt: new Date(Date.now()).toISOString(),
          }),
          { expirationTtl: 86400 }
        );
      }).filter(Boolean);

      await Promise.all(indexPromises);
      agentsWarmed += indexPromises.length;

      console.log(`[${requestId}] ✅ Warmed ${owner}: ${agentList.length} agents`);

      // Also store agentTree for instant dashboard painting
      await env.FANTASY_CACHE.put(
        `fantasy402:agentTree:${owner}`,
        JSON.stringify({
          tree: agentList,
          owner,
          count: agentList.length,
          warmedAt: new Date(Date.now()).toISOString()
        }),
        { expirationTtl: 3600 } // 1 hour TTL during iteration
      );
    }

    // 3. Create hash for change detection
    for (const ownerRow of owners.results as Array<{ agent_owner: string }>) {
      const owner = ownerRow.agent_owner;
      if (!owner) continue;

      const agents = await env.RAW_FEED_DB.prepare(`
        SELECT agent_id, agent_owner, agent_type, office
        FROM fantasy402_agents
        WHERE agent_owner = ?
        ORDER BY agent_id
      `).bind(owner).all();

      const agentHash = JSON.stringify(
        (agents.results as any[]).map((a: any) => ({
          id: a.agent_id,
          owner: a.agent_owner,
          type: a.agent_type,
          office: a.office,
        }))
      );

      await env.FANTASY_CACHE.put(`fantasy402:agents:hash:${owner}`, agentHash, {
        expirationTtl: 86400,
      });
    }

    const duration = Date.now() - startTime;

    const response: CacheWarmResponse = {
      success: true,
      warmed: {
        agents: agentsWarmed,
        agentLists: agentListsWarmed,
      },
      duration,
      requestId,
      timestamp: new Date(Date.now()).toISOString(),
    };

    console.log(`[${requestId}] 🔥 Cache warming complete: ${agentsWarmed} agents, ${agentListsWarmed} lists (${duration}ms)`);

    return new Response(JSON.stringify(response), {
      headers: CORS_HEADERS,
    });
  } catch (error) {
    console.error(`[${requestId}] ❌ Error warming cache:`, error);

    return new Response(
      JSON.stringify({
        error: 'Failed to warm cache',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      }),
      {
        status: 500,
        headers: CORS_HEADERS,
      }
    );
  }
}
