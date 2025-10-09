/**
 * Transaction Ticker API Endpoint
 */
import { Env } from '../../types/api';
import { createJSONResponse, CORS_HEADERS } from '../../utils/request';

export async function getTransactionTicker(request: Request, env: Env): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });
  if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405, headers: CORS_HEADERS });

  const mock = {
    transactions: Array.from({ length: 10 }, (_, i) => ({
      timestamp: new Date(Date.now() - i * 30_000).toISOString(),
      type: ['wager', 'deposit', 'withdrawal'][i % 3],
      amount: Math.floor(Math.random() * 500) + 50,
      customer: `C${Math.floor(Math.random() * 100)}`,
    })),
  };

  return createJSONResponse({ success: true, data: mock });
}
