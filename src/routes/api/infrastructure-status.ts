/**
 * Infrastructure Status API Endpoint
 * Returns mock infrastructure health metrics
 */
import { Env } from '../../types/api';
import { createJSONResponse, CORS_HEADERS } from '../../utils/request';

export async function getInfrastructureStatus(request: Request, env: Env): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });
  if (request.method !== 'GET' && request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: CORS_HEADERS });
  }

  const mock = {
    status: 'healthy',
    worker: {
      status: 'online',
      version: '3.0.0',
      uptime: 86400,
      region: 'auto'
    },
    database: {
      status: 'connected',
      type: 'D1',
      latency: 12,
      connections: 1
    },
    queues: {
      status: 'operational',
      total: 4,
      active: 4,
      processing: 0
    },
    kv: {
      status: 'operational',
      namespaces: 10,
      hitRate: 0.95
    },
    analytics: {
      status: 'recording',
      dataset: 'betting-metrics',
      eventsPerMin: 150
    },
    timestamp: new Date().toISOString()
  };

  return createJSONResponse({ success: true, data: mock });
}
