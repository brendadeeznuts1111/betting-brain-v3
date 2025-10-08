/**
 * Live Odds API Endpoint
 *
 * Aggregates odds from multiple bookmakers (Pinnacle, Bet365)
 * Caches responses for 30 seconds in KV
 *
 * Usage:
 *   GET /api/live-odds?sport=nba&market=moneyline
 *
 * Response:
 *   {
 *     "sport": "nba",
 *     "market": "moneyline",
 *     "sources": [
 *       { "source": "pinnacle", "data": { "home": 1.91, "away": 1.95 } },
 *       { "source": "bet365", "data": { "home": 1.90, "away": 1.96 } }
 *     ],
 *     "aggregatedAt": "2025-01-10T12:00:00Z",
 *     "cacheHit": false
 *   }
 */

import type {
  SportsEnv,
  Sport,
  Market,
  AggregatedOdds,
} from '../../types/api';
import { CORS_HEADERS } from '../utils/request';
import { aggregateOdds } from '../../utils/sports-api';

export async function handleLiveOdds(
  req: Request,
  env: SportsEnv
): Promise<Response> {
  

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(req.url);
  const sport = (url.searchParams.get('sport') || 'nba') as Sport;
  const market = (url.searchParams.get('market') || 'moneyline') as Market;

  const requestId = Date.now().toString(36);
  console.log(`[${requestId}] 🎲 Live odds request: ${sport} ${market}`);

  // Validate parameters
  const validSports: Sport[] = ['nba', 'nfl', 'mlb', 'nhl'];
  const validMarkets: Market[] = ['moneyline', 'spread', 'total'];

  if (!validSports.includes(sport)) {
    return new Response(
      JSON.stringify({
        error: 'Invalid sport',
        message: `Sport must be one of: ${validSports.join(', ')}`,
      }),
      {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  }

  if (!validMarkets.includes(market)) {
    return new Response(
      JSON.stringify({
        error: 'Invalid market',
        message: `Market must be one of: ${validMarkets.join(', ')}`,
      }),
      {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    // Check cache (30s TTL)
    const cacheKey = `odds:${sport}:${market}`;
    const cached = await env.SPORTS_CACHE.get(cacheKey);

    if (cached) {
      console.log(`[${requestId}] ✅ Cache HIT`);
      const cachedData: AggregatedOdds = JSON.parse(cached);
      cachedData.cacheHit = true;

      return new Response(JSON.stringify(cachedData, null, 2), {
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json',
          'X-Cache': 'HIT',
          'Cache-Control': 'public, max-age=30',
        },
      });
    }

    console.log(`[${requestId}] ⚠️ Cache MISS - fetching from APIs`);

    // Fetch from external APIs
    const odds = await aggregateOdds(sport, market);
    odds.cacheHit = false;

    // Cache for 30 seconds
    await env.SPORTS_CACHE.put(cacheKey, JSON.stringify(odds), {
      expirationTtl: 30,
    });

    console.log(
      `[${requestId}] ✅ Fetched ${odds.sources.length} sources, cached for 30s`
    );

    return new Response(JSON.stringify(odds, null, 2), {
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json',
        'X-Cache': 'MISS',
        'Cache-Control': 'public, max-age=30',
      },
    });
  } catch (error) {
    console.error(`[${requestId}] ❌ Error fetching odds:`, error);
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
