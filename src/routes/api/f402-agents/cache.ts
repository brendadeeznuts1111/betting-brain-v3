/**
 * Fantasy402 Agent Cache Management
 * Cache metrics and warming operations
 */

import type { Env } from '../../../types/api';
import { CORS_HEADERS } from '../../../utils/request';
import { PERCENTAGE_MULTIPLIER, PERCENTAGE_PRECISION, HTTP_STATUS_SERVER_ERROR } from './constants';

export async function getCacheMetrics(
  request: Request,
  env: Env,
  requestId: string
): Promise<Response> {
  console.log(`[${requestId}] 📊 GET /api/f402/cache/metrics`);

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

    const cacheHitRate = totalRequests > 0 ? (totalHits / totalRequests) * PERCENTAGE_MULTIPLIER : 0;
    const d1WriteReduction = (totalD1Skipped + totalD1Executed) > 0
      ? (totalD1Skipped / (totalD1Skipped + totalD1Executed)) * PERCENTAGE_MULTIPLIER
      : 0;

    let cacheHitRateFixed = Number(cacheHitRate.toFixed(PERCENTAGE_PRECISION));
    if (isNaN(cacheHitRateFixed)) {
      console.warn(`[CacheMetrics] Invalid cacheHitRateFixed. Defaulting to 0.`);
      cacheHitRateFixed = 0;
    }

    let d1WriteReductionFixed = Number(d1WriteReduction.toFixed(PERCENTAGE_PRECISION));
    if (isNaN(d1WriteReductionFixed)) {
      console.warn(`[CacheMetrics] Invalid d1WriteReductionFixed. Defaulting to 0.`);
      d1WriteReductionFixed = 0;
    }

    const response = {
      raw: metrics,
      summary: {
        totalRequests,
        cacheHits: totalHits,
        cacheMisses: totalMisses,
        cacheHitRate: cacheHitRateFixed,
        d1WritesSkipped: totalD1Skipped,
        d1WritesExecuted: totalD1Executed,
        d1WriteReduction: d1WriteReductionFixed,
      },
      agentDetail: {
        cacheHits: metrics.agent_detail_cache_hits || 0,
        cacheMisses: metrics.agent_detail_cache_misses || 0,
        hitRate:
          (metrics.agent_detail_cache_hits || 0) +
            (metrics.agent_detail_cache_misses || 0) >
            0
            ? (() => {
              let hitRateVal = Number(
                ((metrics.agent_detail_cache_hits || 0) /
                  ((metrics.agent_detail_cache_hits || 0) +
                    (metrics.agent_detail_cache_misses || 0))) *
                PERCENTAGE_MULTIPLIER
              ).toFixed(PERCENTAGE_PRECISION);
              let parsedHitRate = Number(hitRateVal);
              if (isNaN(parsedHitRate)) {
                console.warn(`[CacheMetrics] Invalid agentDetail hitRate. Defaulting to 0.`);
                parsedHitRate = 0;
              }
              return parsedHitRate;
            })()
            : 0,
      },
      requestId,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      headers: CORS_HEADERS,
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
        status: HTTP_STATUS_SERVER_ERROR,
        headers: CORS_HEADERS,
      }
    );
  }
}
