/**
 * Database Metrics API
 * GET /api/database/metrics
 * Returns record counts from D1 tables
 */

import { Env } from '../../types/api';
import { CORS_HEADERS } from '../../utils/request';

export async function getDatabaseMetrics(
  request: Request,
  env: Env,
  requestId: string
): Promise<Response> {
  console.log(`[${requestId}] 💾 GET /api/database/metrics`);



  try {
    if (!env.ANALYTICS) {
      return new Response(
        JSON.stringify({
          error: 'Database not configured',
          requestId,
        }),
        { status: 503, headers: CORS_HEADERS }
      );
    }

    // Query all tables in parallel
    const [lineMovements, sharpIndicators, exposureTracking, betHistory, holdTracking] = await Promise.all([
      env.ANALYTICS.prepare('SELECT COUNT(*) as count FROM line_movements').first(),
      env.ANALYTICS.prepare('SELECT COUNT(*) as count FROM sharp_indicators').first(),
      env.ANALYTICS.prepare('SELECT COUNT(*) as count FROM exposure_tracking').first(),
      env.ANALYTICS.prepare('SELECT COUNT(*) as count FROM bet_history').first().catch(() => ({ count: 0 })),
      env.ANALYTICS.prepare('SELECT COUNT(*) as count FROM hold_tracking').first().catch(() => ({ count: 0 })),
    ]);

    const total =
      (lineMovements?.count || 0) +
      (sharpIndicators?.count || 0) +
      (exposureTracking?.count || 0) +
      (betHistory?.count || 0) +
      (holdTracking?.count || 0);

    const response = {
      total,
      tables: {
        lineMovements: lineMovements?.count || 0,
        sharpIndicators: sharpIndicators?.count || 0,
        exposureTracking: exposureTracking?.count || 0,
        betHistory: betHistory?.count || 0,
        holdTracking: holdTracking?.count || 0,
      },
      timestamp: new Date(Date.now()).toISOString(),
      requestId,
    };

    console.log(`[${requestId}] ✅ Database metrics:`, response);

    return new Response(JSON.stringify(response), {
      headers: CORS_HEADERS,
    });
  } catch (error) {
    console.error(`[${requestId}] ❌ Database metrics error:`, error);

    return new Response(
      JSON.stringify({
        error: 'Failed to fetch database metrics',
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
