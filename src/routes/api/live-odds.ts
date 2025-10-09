/**
 * Live Odds API Endpoint
 */
import { Env } from '../../types/api';
import { createJSONResponse, CORS_HEADERS } from '../../utils/request';

export async function getLiveOdds(request: Request, env: Env): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });
  if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405, headers: CORS_HEADERS });

  const fakeOdds = [
    { gameId: 1, sport: 'NBA', homeTeam: 'Lakers', awayTeam: 'Celtics', homeLine: -110, awayLine: -110, homeSpread: -5.5, awaySpread: 5.5, overUnder: 215.5, timestamp: Date.now() },
    { gameId: 2, sport: 'NFL', homeTeam: 'Chiefs', awayTeam: 'Bills', homeLine: -120, awayLine: 100, homeSpread: -3, awaySpread: 3, overUnder: 48.5, timestamp: Date.now() }
  ];

  return createJSONResponse({ success: true, data: fakeOdds, count: fakeOdds.length, timestamp: new Date().toISOString() });
}
