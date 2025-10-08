/**
 * Fantasy402 Agent Cache Management
 * Cache metrics and warming operations
 */

import type { Env } from '../../../types/api';
import { CORS_HEADERS } from '../../../utils/request';

export async function getCacheMetrics(
  request: Request,
  env: Env,
  requestId: string
): Promise<Response> {
  console.log(`[${requestId}] 📊 GET /api/f402/cache/metrics`);

  const corsHeaders = CORS_HEADERS;

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
