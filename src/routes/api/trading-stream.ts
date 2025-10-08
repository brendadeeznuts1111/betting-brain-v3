/**
 * trading-stream.ts
 *
 * Server-Sent Events (SSE) endpoint for real-time trading dashboard.
 * Streams: predictions, signals, bet placements, circuit breaker status.
 */

import type { Env } from '../../types/api';

export async function handleTradingStream(
  request: Request,
  env: Env
): Promise<Response> {
  const requestId = Date.now().toString(36);
  console.log(`[${requestId}] SSE trading stream connected`);

  // Check authentication (simple token check)
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  const validToken = env.TRADING_DASHBOARD_TOKEN || 'dev-token';

  if (token !== validToken) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Create SSE stream
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // Send initial connection message
      const sendEvent = (event: string, data: any) => {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      sendEvent('connected', {
        timestamp: new Date().toISOString(),
        message: 'Trading stream connected',
      });

      // Stream loop (would poll database/KV for updates in production)
      const intervalId = setInterval(async () => {
        try {
          // Fetch latest trading status
          const status = await getTradingStatus(env);
          sendEvent('status', status);

          // Fetch recent signals (last 5)
          const signals = await getRecentSignals(env);
          if (signals.length > 0) {
            sendEvent('signals', signals);
          }

          // Fetch recent bets (last 5)
          const bets = await getRecentBets(env);
          if (bets.length > 0) {
            sendEvent('bets', bets);
          }
        } catch (error) {
          console.error('[SSE] Stream error:', error);
          sendEvent('error', { message: String(error) });
        }
      }, 5000); // Update every 5 seconds

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(intervalId);
        controller.close();
        console.log(`[${requestId}] SSE stream closed`);
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

async function getTradingStatus(env: Env): Promise<any> {
  // Fetch circuit breaker state
  const cbState = await env.SESSION_STORE?.get('circuit_breaker_state') || 'closed';
  const cbDetails = await env.SESSION_STORE?.get('circuit_breaker_details');

  // Fetch daily totals
  const today = new Date().toISOString().split('T')[0];
  const dailyVolume = await env.SESSION_STORE?.get(`daily_volume_${today}`) || '0';

  return {
    circuit_breaker: {
      state: cbState,
      details: cbDetails ? JSON.parse(cbDetails) : null,
    },
    daily_volume: parseFloat(dailyVolume),
    timestamp: new Date().toISOString(),
  };
}

async function getRecentSignals(env: Env): Promise<any[]> {
  // Would query Analytics Engine or D1 for recent signals
  // Placeholder implementation
  return [];
}

async function getRecentBets(env: Env): Promise<any[]> {
  // Would query bet_history table
  // Placeholder implementation
  return [];
}
