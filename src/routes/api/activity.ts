/**
 * Activity Feed API
 * GET /api/activity
 * Returns recent system activity (line movements, bets, etc.)
 */

import { Env } from '../../types/api';

export async function getActivity(
  request: Request,
  env: Env,
  requestId: string
): Promise<Response> {
  console.log(`[${requestId}] 📡 GET /api/activity`);

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '10');

    const activities: any[] = [];

    // Try to get line movements
    if (env.ANALYTICS) {
      try {
        const result = await env.ANALYTICS.prepare(
          `SELECT
            eid as eventId,
            mt as market,
            ol as oldLine,
            nl as newLine,
            ts as timestamp,
            'line_movement' as type
           FROM line_movements
           WHERE ing > datetime('now', '-1 hour')
           ORDER BY ts DESC
           LIMIT ?`
        ).bind(limit).all();

        if (result.results) {
          activities.push(...result.results.map((row: any) => ({
            type: 'line_movement',
            eventId: row.eventId,
            market: row.market,
            change: `${row.oldLine} → ${row.newLine}`,
            timestamp: row.timestamp,
          })));
        }
      } catch (error) {
        console.warn(`[${requestId}] ⚠️ Could not fetch line movements:`, error);
      }
    }

    // Try to get recent bet activity from KV
    if (env.LIVEBETS_STORE && activities.length < limit) {
      try {
        const betTickerData = await env.LIVEBETS_STORE.get('betTicker:latest');
        if (betTickerData) {
          const parsed = JSON.parse(betTickerData);
          const wagers = parsed.data?.wagers || parsed.wagers || [];

          wagers.slice(0, limit - activities.length).forEach((wager: any) => {
            activities.push({
              type: 'wager_placed',
              customerId: wager.customerId || 'unknown',
              amount: wager.risk || 0,
              timestamp: new Date(wager.placedAt || Date.now()).toISOString(),
            });
          });
        }
      } catch (error) {
        console.warn(`[${requestId}] ⚠️ Could not fetch bet activity:`, error);
      }
    }

    // Sort by timestamp descending
    activities.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeB - timeA;
    });

    const response = {
      activities: activities.slice(0, limit),
      count: activities.length,
      timestamp: new Date().toISOString(),
      requestId,
    };

    console.log(`[${requestId}] ✅ Activity feed: ${response.count} events`);

    return new Response(JSON.stringify(response), {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error(`[${requestId}] ❌ Activity feed error:`, error);

    return new Response(
      JSON.stringify({
        error: 'Failed to fetch activity',
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
