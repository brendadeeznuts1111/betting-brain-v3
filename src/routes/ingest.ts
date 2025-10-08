/**
 * Data Ingestion Endpoint - Production Edition
 *
 * Accepts betting intelligence data from MCP tools
 * Writes to Analytics Engine with rate limiting + JWT auth
 *
 * Security Features:
 * - Rate limiting: 100 req/min per IP
 * - JWT validation with expiry check
 * - CORS headers for dashboard access
 * - Input validation with detailed errors
 *
 * Usage:
 *   POST /ingest
 *   Authorization: Bearer <JWT>
 *   Body: Array of data points
 *
 * Example:
 *   {
 *     "eventId": "nba-lal-gsw-20251008",
 *     "timestamp": "2025-10-08T10:00:00Z",
 *     "odds": 1.85,
 *     "market": "moneyline",
 *     "volume": 1000,
 *     "source": "pinnacle"
 *   }
 */

import type {
  SportsEnv,
  IngestDataPoint,
  IngestResponse,
} from '../types/api';
import { CORS_HEADERS } from '../utils/request';
import { validateJWT } from '../utils/jwt';

export async function handleIngest(
  req: Request,
  env: SportsEnv
): Promise<Response> {
  // CORS headers
  

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const requestId = Date.now().toString(36);
  console.log(`[${requestId}] 📊 Ingest request received`);

  try {
    // ========================================================================
    // 1. Rate Limiting (100 req/min per IP)
    // ========================================================================
    const ip = req.headers.get('cf-connecting-ip') || 'unknown';
    const rateLimitKey = `ingest:${ip}:${Math.floor(Date.now() / 60000)}`;

    const currentCount = parseInt(
      (await env.RATE_LIMITER.get(rateLimitKey)) || '0'
    );

    if (currentCount >= 100) {
      console.log(`[${requestId}] ⚠️ Rate limit exceeded for ${ip}`);
      return new Response(
        JSON.stringify({
          error: 'Too Many Requests',
          message: 'Rate limit: 100 requests per minute',
          remaining: 0,
          reset: 60,
        }),
        {
          status: 429,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        }
      );
    }

    await env.RATE_LIMITER.put(rateLimitKey, String(currentCount + 1), {
      expirationTtl: 60,
    });

    const remaining = 100 - currentCount - 1;

    // ========================================================================
    // 2. JWT Authentication
    // ========================================================================
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    const isValidToken = await validateJWT(token, env.JWT_SECRET);

    if (!isValidToken) {
      console.log(`[${requestId}] 🔒 Invalid JWT token`);
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          message: 'Invalid or expired JWT token',
        }),
        {
          status: 401,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        }
      );
    }

    // ========================================================================
    // 3. Input Validation
    // ========================================================================
    const body = await req.json();

    if (!Array.isArray(body)) {
      return new Response(
        JSON.stringify({
          error: 'Bad request',
          message: 'Body must be an array of data points',
        }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        }
      );
    }

    // ========================================================================
    // 4. Data Ingestion
    // ========================================================================
    let written = 0;
    const errors: string[] = [];

    for (let i = 0; i < body.length; i++) {
      const dataPoint = body[i] as IngestDataPoint;

      // Validate required fields
      if (
        !dataPoint.eventId ||
        !dataPoint.timestamp ||
        typeof dataPoint.odds !== 'number'
      ) {
        errors.push(
          `Invalid data point at index ${i}: missing required fields`
        );
        continue;
      }

      try {
        // Write to Analytics Engine
        env.ANALYTICS_ENGINE.writeDataPoint({
          blobs: [
            dataPoint.eventId,
            dataPoint.market || 'unknown',
            dataPoint.source || 'mcp',
          ],
          doubles: [dataPoint.odds, dataPoint.volume || 0],
          indexes: [dataPoint.timestamp],
        });

        written++;
      } catch (error) {
        errors.push(
          `Failed to write data point ${i}: ${error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    // ========================================================================
    // 5. Response
    // ========================================================================
    const response: IngestResponse = {
      received: body.length,
      written,
      errors: errors.length > 0 ? errors : undefined,
      rateLimit: {
        remaining,
        reset: 60,
      },
      timestamp: new Date().toISOString(),
    };

    console.log(
      `[${requestId}] ✅ Ingested ${written}/${body.length} records`
    );

    return new Response(JSON.stringify(response, null, 2), {
      status: written > 0 ? 200 : 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(`[${requestId}] ❌ Ingest error:`, error);
    return new Response(
      JSON.stringify({
        error: 'Internal error',
        message: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  }
}
