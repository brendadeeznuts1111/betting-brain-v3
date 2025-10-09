/**
 * Fantasy402 Live Bets API
 *
 * GET /api/f402/bets/live
 * Returns: { count: number, buckets: [{minute: string, volume: number}] }
 *
 * Data sources:
 * - bet_history table (PENDING bets for in-flight count)
 * - Last 5 minutes of volume data
 */

import { Env } from '../../types/api';
import { CORS_HEADERS } from '../../utils/request';

interface LiveBetsResponse {
  count: number;
  buckets: Array<{
    minute: string;
    volume: number;
  }>;
}

/**
 * GET /api/f402/bets/live
 * Returns in-flight bet count and 5-minute volume chart data
 * 
 * Query Parameters:
 * - expand=true: Include analytics data (steam alerts, risk by agent, etc.)
 */
export async function getLiveBets(
  request: Request,
  env: Env,
  requestId: string
): Promise<Response> {
  console.log(`[${requestId}] 🎲 GET /api/f402/bets/live`);

  const url = new URL(request.url);
  const expand = url.searchParams.get('expand') === 'true';

  

  try {
    if (!env.ANALYTICS) {
      throw new Error('ANALYTICS database not configured');
    }

    // 1. Get in-flight bets count (PENDING status)
    const inFlightQuery = await env.ANALYTICS.prepare(`
      SELECT COUNT(*) as count
      FROM bet_history
      WHERE result = 'PENDING'
    `).first() as { count: number } | null;

    const inFlightCount = inFlightQuery?.count || 0;
    console.log(`[${requestId}] 📊 In-flight bets: ${inFlightCount}`);

    // 2. Get last 5 minutes of volume data (grouped by minute)
    const volumeQuery = await env.ANALYTICS.prepare(`
      SELECT
        strftime('%H:%M', ts) as minute,
        SUM(stake) as volume
      FROM bet_history
      WHERE ts > datetime('now', '-5 minutes')
      GROUP BY strftime('%H:%M', ts)
      ORDER BY minute DESC
      LIMIT 5
    `).all();

    const volumeData = volumeQuery.results as Array<{ minute: string; volume: number }>;
    console.log(`[${requestId}] 📈 Volume buckets: ${volumeData.length}`);

    // 3. Fill in missing minutes (ensure we always have 5 buckets)
    const now = new Date();
    const buckets: LiveBetsResponse['buckets'] = [];

    for (let i = 4; i >= 0; i--) {
      const minuteTime = new Date(now.getTime() - i * 60000);
      const minuteKey = minuteTime.toISOString().substring(11, 16); // HH:MM format

      // Find matching volume data
      const volumeEntry = volumeData.find((v) => v.minute === minuteKey);

      buckets.push({
        minute: minuteKey,
        volume: volumeEntry?.volume || 0,
      });
    }

    const response: LiveBetsResponse = {
      count: inFlightCount,
      buckets,
    };

    // Add analytics data if expand=true
    if (expand) {
      try {
        // Get analytics from KV cache
        const analyticsData = await env.FANTASY_CACHE?.get('betTicker:analytics');
        if (analyticsData) {
          const analytics = JSON.parse(analyticsData);
          (response as any).analytics = {
            steamAlerts: analytics.steamAlerts || [],
            riskByAgent: analytics.riskByAgent || {},
            exposureBySide: analytics.exposureBySide || {},
            custRecency: analytics.custRecency || {}
          };
          console.log(`[${requestId}] 📊 Added analytics data:`, {
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

    console.log(`[${requestId}] ✅ Live bets response:`, {
      count: response.count,
      bucketsCount: response.buckets.length,
      totalVolume: response.buckets.reduce((sum, b) => sum + b.volume, 0),
      hasAnalytics: expand && !!(response as any).analytics
    });

    return new Response(JSON.stringify(response), {
      headers: CORS_HEADERS,
    });

  } catch (error) {
    console.error(`[${requestId}] ❌ Error fetching live bets:`, error);

    return new Response(
      JSON.stringify({
        error: 'Failed to fetch live bets',
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
