/**
 * DNS Health API Endpoint
 */
import { Env } from '../../types/api';
import { createJSONResponse, CORS_HEADERS } from '../../utils/request';

export async function getDnsHealth(request: Request, env: Env): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });
  if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405, headers: CORS_HEADERS });

  const mock = {
    ip: '104.16.123.45',
    latency: 23,
    host: 'fantasy402.com',
    status: 'healthy',
  };

  return createJSONResponse({ success: true, data: mock });
}
