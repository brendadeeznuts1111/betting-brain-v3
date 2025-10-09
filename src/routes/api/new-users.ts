/**
 * New Users API
 * GET /api/new-users
 * Returns latest new user signups from Fantasy402
 */

import { Env } from '../../types/api';
import { CORS_HEADERS } from '../../utils/request';

export async function getNewUsers(
  request: Request,
  env: Env,
  requestId: string
): Promise<Response> {
  console.log(`[${requestId}] 👥 GET /api/new-users`);



  try {
    // Check KV cache for latest new users info
    if (env.FANTASY_CACHE) {
      const cached = await env.FANTASY_CACHE.get('newUsersInfo:latest');

      if (cached) {
        const data = JSON.parse(cached);
        const cacheAge = Date.now() - Date.parse(data.capturedAt);

        // Use cache if less than 1 hour old
        if (cacheAge < 3600000) {
          const users = data.raw?.LIST || data.raw?.list || [];

          // Calculate statistics
          let totalPlayers = 0;
          let totalAgents = 0;
          const agentBreakdown: Record<string, number> = {};
          const dailySignups: Record<string, number> = {};

          users.forEach((user: any) => {
            if (user.IsAgent === 1 || user.IsAgent === '1') {
              totalAgents++;
            } else {
              totalPlayers++;
            }

            // Count by agent
            const agent = user.AgentID?.trim() || 'Unknown';
            agentBreakdown[agent] = (agentBreakdown[agent] || 0) + 1;

            // Count by day
            const date = user.OpenDateTime?.split(' ')[0] || 'Unknown';
            dailySignups[date] = (dailySignups[date] || 0) + 1;
          });

          return new Response(JSON.stringify({
            users: users.map((user: any) => ({
              customerId: user.CustomerID?.trim(),
              agentId: user.AgentID?.trim(),
              isAgent: user.IsAgent === 1 || user.IsAgent === '1',
              openedBy: user.OpenedBy?.trim(),
              openDateTime: user.OpenDateTime,
            })),
            summary: {
              totalUsers: users.length,
              totalPlayers,
              totalAgents,
              topAgents: Object.entries(agentBreakdown)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([agent, count]) => ({ agent, count })),
              dailySignups: Object.entries(dailySignups)
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([date, count]) => ({ date, count })),
            },
            period: {
              days: data.metadata?.days,
              agentID: data.metadata?.agentID,
              agentOwner: data.metadata?.agentOwner,
            },
            cached: true,
            cacheAge: Math.round(cacheAge / 1000),
            timestamp: data.capturedAt,
            requestId,
          }), {
            headers: CORS_HEADERS,
          });
        }
      }
    }

    // No data available
    return new Response(JSON.stringify({
      users: [],
      summary: {
        totalUsers: 0,
        totalPlayers: 0,
        totalAgents: 0,
        topAgents: [],
        dailySignups: [],
      },
      period: null,
      cached: false,
      message: 'No new users data available. Visit fantasy402.com/manager.html to capture data.',
      requestId,
    }), {
      headers: CORS_HEADERS,
    });

  } catch (error) {
    console.error(`[${requestId}] ❌ New users error:`, error);

    return new Response(
      JSON.stringify({
        error: 'Failed to fetch new users',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      }),
      {
        status: 500,
        headers: CORS_HEADERS,
      }
    );
  }
}
