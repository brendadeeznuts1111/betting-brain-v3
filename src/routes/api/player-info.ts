/**
 * Player Info API Endpoint
 */
import { Env } from '../../types/api';
import { createJSONResponse, CORS_HEADERS } from '../../utils/request';

export async function getPlayerInfo(request: Request, env: Env): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });
  if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405, headers: CORS_HEADERS });

  const mock = {
    count: 1_247,
    lastUpdated: new Date().toISOString(),
    status: 'healthy',
    players: Array.from({ length: 5 }, (_, i) => ({
      id: `P${i + 1}`,
      name: `Player ${i + 1}`,
    })),
  };

  return createJSONResponse({ success: true, data: mock });
}
