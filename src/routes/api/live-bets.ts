/**
 * Live Bets API Endpoint
 */
import { Env } from '../../types/api';
import { createJSONResponse, CORS_HEADERS } from '../../utils/request';

export async function getLiveBets(request: Request, env: Env): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });
  if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405, headers: CORS_HEADERS });

  const url = new URL(request.url);
  const expand = url.searchParams.has('expand');

  const mock = {
    liveBets: {
      count: 42,
      buckets: Array.from({ length: 10 }, (_, i) => ({
        minute: `-${9 - i}m`,
        volume: Math.floor(Math.random() * 5_000) + 1_000,
      })),
      ...(expand && {
        analytics: {
          steamAlerts: [
            { gameId: 'NBA_123', oldLine: -3, newLine: -4.5, seconds: 45 },
          ],
          riskByAgent: { A1: 12_300, A2: 9_800, A3: 7_200 },
          exposureBySide: {
            NBA_123: { home: 25_000, away: 18_000 },
          },
        },
      }),
    },
  };

  return createJSONResponse({ success: true, data: mock });
}
