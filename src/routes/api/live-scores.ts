/**
 * Live Scores API
 * GET /api/live-scores?sport=nba
 * Proxies Fantasy402 getScoresLiveDynamic API
 */

import { Env } from '../../types/api';
import { CORS_HEADERS } from '../../utils/request';

const FANTASY402_API = 'https://fantasy402.com/cloud/api/Report/getScoresLiveDynamic';

export async function getLiveScores(
  request: Request,
  env: Env,
  requestId: string
): Promise<Response> {
  console.log(`[${requestId}] 🏀 GET /api/live-scores`);

  

  try {
    const url = new URL(request.url);
    const sport = url.searchParams.get('sport') || 'nba';

    // FIRST: Check if we have cached scores from extension intercept (most recent)
    if (env.SPORTS_CACHE) {
      try {
        const cached = await env.SPORTS_CACHE.get('scores:latest');
        if (cached) {
          const cachedData = JSON.parse(cached);
          const cacheAge = Date.now() - new Date(cachedData.capturedAt).getTime();

          // Use cache if less than 5 minutes old
          if (cacheAge < 300000) {
            const scores = cachedData.raw.Scores || cachedData.raw.scores || [];

            // Transform cached data
            const games = scores.map((score: any) => ({
              gameId: score.GameNum,
              correlationId: score.CorrelationID,
              team1: {
                id: score.Team1ID,
                shortName: score.STeam1ID,
                logo: score.LogoTeam1,
                rotNum: score.Team1RotNum,
                score: score.Team1Score,
                record: score.Record,
                rank: score.Rank,
                status: score.StatusAway,
              },
              team2: {
                id: score.Team2ID,
                shortName: score.STeam2ID,
                logo: score.LogoTeam2,
                rotNum: score.Team2RotNum,
                score: score.Team2Score,
                record: score.Record2,
                rank: score.Rank2,
                status: score.StatusHome,
              },
              sport: score.DisplaySubType || score.SportSubType?.trim(),
              sportType: score.SportType?.trim(),
              grouping: score.Grouping?.trim(),
              status: score.STATUS,
              final: score.Final,
              gameDateTime: score.GameDateTime,
              broadcast: score.BroadcastInfo?.trim(),
              period: {
                number: score.PeriodNumber,
                description: score.PeriodDescription,
              },
              spread: {
                value: score.Spread,
                team1Adj: score.SpreadAdj1,
                team2Adj: score.SpreadAdj2,
              },
              moneyline: {
                team1: score.MoneyLine1,
                team2: score.MoneyLine2,
                draw: score.MoneyLineDraw,
              },
              total: score.Total,
              favorito: score.Favorito,
              defaultMainLine: score.DefaultMainLine,
            }));

            console.log(`[${requestId}] ✅ Returning ${games.length} scores from cache (${Math.round(cacheAge/1000)}s old)`);

            return new Response(JSON.stringify({
              sport,
              count: games.length,
              games,
              cached: true,
              cacheAge: Math.round(cacheAge / 1000),
              isLive: true,
              timestamp: cachedData.capturedAt,
              requestId,
            }), {
              headers: CORS_HEADERS,
            });
          }
        }
      } catch (error) {
        console.warn(`[${requestId}] ⚠️ Cache check failed:`, error);
      }
    }

    // SECOND: Try to get auth token for live proxy
    let authToken = request.headers.get('authorization');

    // If no token, try to get latest intercepted token from KV
    if (!authToken && env.BET_TICKER_RAW) {
      try {
        const latestCapture = await env.BET_TICKER_RAW.get('betTicker:latest');
        if (latestCapture) {
          const parsed = JSON.parse(latestCapture);
          // Extract token from intercepted metadata if available
          authToken = parsed.metadata?.token || null;
        }
      } catch (error) {
        console.warn(`[${requestId}] ⚠️ Could not retrieve auth token from KV`);
      }
    }

    // If we have a valid token, proxy the real API
    if (authToken && authToken.startsWith('Bearer ')) {
      try {
        console.log(`[${requestId}] 🔐 Proxying to Fantasy402 API with auth`);

        const response = await fetch(FANTASY402_API, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Authorization': authToken,
          },
          body: new URLSearchParams({
            customerID: 'BILLY666', // TODO: Get from session
            operation: 'getScoresLiveDynamic',
            RRO: '1',
            agentID: 'BILLY666',
            agentOwner: 'BILLY666',
            agentSite: '1',
          }).toString(),
        });

        if (response.ok) {
          const data = await response.json();

          // Fantasy402 returns {Scores: [...]} format
          const scores = data.Scores || data.scores || (Array.isArray(data) ? data : []);

          // Store raw response in KV for caching (5 min TTL)
          if (env.SPORTS_CACHE) {
            try {
              await env.SPORTS_CACHE.put(
                'scores:latest',
                JSON.stringify({
                  raw: data,
                  timestamp: new Date().toISOString(),
                  count: scores.length,
                }),
                { expirationTtl: 300 } // 5 minutes
              );
              console.log(`[${requestId}] 💾 Cached ${scores.length} scores in KV`);
            } catch (error) {
              console.warn(`[${requestId}] ⚠️ Failed to cache scores:`, error);
            }
          }

          // Transform to standardized format with ALL Fantasy402 fields
          const games = scores.map((score: any) => ({
            // Identifiers
            gameId: score.GameNum,
            correlationId: score.CorrelationID,

            // Teams (full data)
            team1: {
              id: score.Team1ID,
              shortName: score.STeam1ID,
              logo: score.LogoTeam1,
              rotNum: score.Team1RotNum,
              score: score.Team1Score,
              record: score.Record,
              rank: score.Rank,
              status: score.StatusAway,
            },
            team2: {
              id: score.Team2ID,
              shortName: score.STeam2ID,
              logo: score.LogoTeam2,
              rotNum: score.Team2RotNum,
              score: score.Team2Score,
              record: score.Record2,
              rank: score.Rank2,
              status: score.StatusHome,
            },

            // Game Info
            sport: score.DisplaySubType || score.SportSubType?.trim(),
            sportType: score.SportType?.trim(),
            grouping: score.Grouping?.trim(),
            status: score.STATUS,
            final: score.Final,
            gameDateTime: score.GameDateTime,
            broadcast: score.BroadcastInfo?.trim(),

            // Period/Time
            period: {
              number: score.PeriodNumber,
              description: score.PeriodDescription,
            },

            // Lines (complete)
            spread: {
              value: score.Spread,
              team1Adj: score.SpreadAdj1,
              team2Adj: score.SpreadAdj2,
            },
            moneyline: {
              team1: score.MoneyLine1,
              team2: score.MoneyLine2,
              draw: score.MoneyLineDraw,
            },
            total: score.Total,
            favorito: score.Favorito,
            defaultMainLine: score.DefaultMainLine,
          }));

          const result = {
            sport,
            count: games.length,
            games,
            raw: data, // Include raw response for debugging
            isLive: true,
            cached: false,
            timestamp: new Date().toISOString(),
            requestId,
          };

          console.log(`[${requestId}] ✅ Live scores from Fantasy402: ${result.count} games`);

          return new Response(JSON.stringify(result), {
            headers: CORS_HEADERS,
          });
        }

        console.warn(`[${requestId}] ⚠️ Fantasy402 API returned ${response.status}, using mock`);
      } catch (error) {
        console.warn(`[${requestId}] ⚠️ Fantasy402 API error:`, error);
      }
    }

    // Fallback to mock data
    console.log(`[${requestId}] 📦 Using mock data (no auth or API error)`);

    const mockScores = {
      nba: [
        {
          gameId: 'nba-20251008-001',
          homeTeam: 'Lakers',
          awayTeam: 'Celtics',
          homeScore: 98,
          awayScore: 95,
          quarter: 4,
          timeRemaining: '2:34',
          status: 'live',
        },
        {
          gameId: 'nba-20251008-002',
          homeTeam: 'Warriors',
          awayTeam: 'Nuggets',
          homeScore: 112,
          awayScore: 108,
          quarter: 4,
          timeRemaining: '0:45',
          status: 'live',
        },
      ],
      nfl: [
        {
          gameId: 'nfl-20251008-001',
          homeTeam: 'Chiefs',
          awayTeam: '49ers',
          homeScore: 24,
          awayScore: 21,
          quarter: 3,
          timeRemaining: '8:12',
          status: 'live',
        },
      ],
    };

    const games = mockScores[sport as keyof typeof mockScores] || [];

    const response = {
      sport,
      count: games.length,
      games,
      isMock: true,
      timestamp: new Date().toISOString(),
      requestId,
    };

    return new Response(JSON.stringify(response), {
      headers: CORS_HEADERS,
    });
  } catch (error) {
    console.error(`[${requestId}] ❌ Live scores error:`, error);

    return new Response(
      JSON.stringify({
        error: 'Failed to fetch live scores',
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
