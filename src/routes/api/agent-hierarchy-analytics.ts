/**
 * Agent Hierarchy Analytics API Endpoint
 */
import { Env } from '../../types/api';
import { createJSONResponse, CORS_HEADERS } from '../../utils/request';

export async function getAgentHierarchyAnalytics(request: Request, env: Env): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });
  if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405, headers: CORS_HEADERS });

  const mock = {
    totalAgents: 42,
    activeAgents: 40,
    totalRisk: 123_456,
    maxDepth: 3,
    topAgents: [
      { id: 'A1', ownRisk: 12_300, totalRisk: 45_600, networkRisk: 78_900 },
      { id: 'A2', ownRisk: 9_800, totalRisk: 33_200, networkRisk: 55_100 },
      { id: 'A3', ownRisk: 7_500, totalRisk: 28_900, networkRisk: 42_300 },
    ],
    levelDistribution: { L0: 1, L1: 5, L2: 12, L3: 24 },
    riskDistribution: { low: 30, medium: 8, high: 3, critical: 1 },
    agentTypes: { master: 1, agent: 17, player: 24 },
  };

  return createJSONResponse({ success: true, data: mock });
}
