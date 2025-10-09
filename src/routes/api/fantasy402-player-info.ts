/**
 * Fantasy402 Player Info API Endpoint
 * Returns mock player information
 */
import { Env } from '../../types/api';
import { createJSONResponse, CORS_HEADERS } from '../../utils/request';

export async function getPlayerInfo(request: Request, env: Env, requestId?: string): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });
  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405, headers: CORS_HEADERS });
  }

  const mock = {
    count: 5,
    lastUpdated: new Date().toISOString(),
    status: 'active',
    players: [
      { id: 'P001', name: 'John Doe', status: 'active', balance: 12500 },
      { id: 'P002', name: 'Jane Smith', status: 'active', balance: 8900 },
      { id: 'P003', name: 'Bob Johnson', status: 'suspended', balance: 0 },
      { id: 'P004', name: 'Alice Williams', status: 'active', balance: 15600 },
      { id: 'P005', name: 'Charlie Brown', status: 'active', balance: 6700 }
    ]
  };

  return createJSONResponse({ success: true, data: mock });
}
