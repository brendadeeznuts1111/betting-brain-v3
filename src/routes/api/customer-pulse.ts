/**
 * Customer Pulse API Endpoint
 */
import { Env } from '../../types/api';
import { createJSONResponse, CORS_HEADERS } from '../../utils/request';

export async function getCustomerPulse(request: Request, env: Env): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });
  if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405, headers: CORS_HEADERS });

  const mock = {
    customers: {
      active: 182,
      staked: 1_234_567,
    },
  };

  return createJSONResponse({ success: true, data: mock });
}
