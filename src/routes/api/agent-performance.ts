/**
 * Agent Performance API Endpoint
 */
import { Env } from '../../types/api';
import { createJSONResponse, CORS_HEADERS } from '../../utils/request';

export async function getAgentPerformance(request: Request, env: Env): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });
  if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405, headers: CORS_HEADERS });

  const mock = {
    agents: {
      totalPnl: 127_500,
      top: [
        { id: 'A1', pnl: 45_230 },
        { id: 'A2', pnl: 32_110 },
        { id: 'A3', pnl: 28_900 },
      ],
    },
  };

  return createJSONResponse({ success: true, data: mock });
}
