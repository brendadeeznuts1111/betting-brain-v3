/**
 * Recent Activity API Endpoint
 */
import { Env } from '../../types/api';
import { createJSONResponse, CORS_HEADERS } from '../../utils/request';

export async function getRecentActivity(request: Request, env: Env): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });
  if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405, headers: CORS_HEADERS });

  const mock = {
    metrics: {
      steamMoves: {
        alerts: [
          { gameId: 'NBA_123', oldLine: -3.5, newLine: -5, timestamp: Date.now() - 120_000 },
          { gameId: 'NFL_456', oldLine: +2.5, newLine: +4, timestamp: Date.now() - 300_000 },
        ],
      },
      agentRisk: {
        topAgents: [
          { agentId: 'A1', risk: 45_230 },
          { agentId: 'A2', risk: 32_110 },
        ],
      },
      transactionAnalytics: {
        totalTransactions: 1_234,
        totalVolume: 987_654,
      },
      performance: {
        avgResponseTime: 42,
        totalRequests: 56_789,
        errorRate: 0.02,
      },
    },
  };

  return createJSONResponse({ success: true, data: mock });
}
