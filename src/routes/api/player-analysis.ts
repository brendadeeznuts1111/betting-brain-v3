/**
 * Player Analysis API
 * GET /api/player-analysis
 * Returns latest player analysis report from Fantasy402
 */

import { Env } from '../../types/api';
import { CORS_HEADERS } from '../../utils/request';

export async function getPlayerAnalysis(
  request: Request,
  env: Env,
  requestId: string
): Promise<Response> {
  console.log(`[${requestId}] 📊 GET /api/player-analysis`);



  try {
    // Check KV cache for latest player analysis
    if (env.FANTASY_CACHE) {
      const cached = await env.FANTASY_CACHE.get('playerAnalysis:latest');

      if (cached) {
        const data = JSON.parse(cached);
        const cacheAge = Date.now() - Date.parse(data.capturedAt);

        // Use cache if less than 1 hour old
        if (cacheAge < 3600000) {
          const players = data.raw?.players || data.raw?.Players || [];
          const summary = data.raw?.summary || data.raw?.Summary || {};

          return new Response(JSON.stringify({
            players: players.map((player: any) => ({
              customerId: player.customerID || player.CustomerId,
              playerName: player.playerName || player.PlayerName,
              totalWagers: player.totalWagers || player.TotalWagers || 0,
              totalRisk: player.totalRisk || player.TotalRisk || 0,
              totalWin: player.totalWin || player.TotalWin || 0,
              netIncome: player.netIncome || player.NetIncome || 0,
              winRate: player.winRate || player.WinRate || 0,
              avgBetSize: player.avgBetSize || player.AvgBetSize || 0,
              largestBet: player.largestBet || player.LargestBet || 0,
              sportBreakdown: player.sportBreakdown || player.SportBreakdown || []
            })),
            summary: {
              totalPlayers: summary.totalPlayers || summary.TotalPlayers || players.length,
              totalWagers: summary.totalWagers || summary.TotalWagers || 0,
              totalRisk: summary.totalRisk || summary.TotalRisk || 0,
              totalWin: summary.totalWin || summary.TotalWin || 0,
              totalNet: summary.totalNet || summary.TotalNet || 0,
              avgRiskPerPlayer: summary.avgRiskPerPlayer || summary.AvgRiskPerPlayer || 0,
              avgWinRate: summary.avgWinRate || summary.AvgWinRate || 0
            },
            period: {
              startDate: data.metadata.startDate,
              endDate: data.metadata.endDate,
              reportType: data.metadata.reportType,
              lineType: data.metadata.lineType
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
      players: [],
      summary: {
        totalPlayers: 0,
        totalWagers: 0,
        totalRisk: 0,
        totalWin: 0,
        totalNet: 0,
        avgRiskPerPlayer: 0,
        avgWinRate: 0
      },
      period: null,
      cached: false,
      message: 'No player analysis data available. Visit fantasy402.com/manager.html to capture data.',
      requestId,
    }), {
      headers: CORS_HEADERS,
    });

  } catch (error) {
    console.error(`[${requestId}] ❌ Player analysis error:`, error);

    return new Response(
      JSON.stringify({
        error: 'Failed to fetch player analysis',
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
