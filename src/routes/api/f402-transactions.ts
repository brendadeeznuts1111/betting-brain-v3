/**
 * Fantasy402 Transaction Ticker API
 *
 * GET /api/f402/transactions/latest?limit=10
 * Returns: [{ type: string, customerId: string, amount: number, status: string, timestamp: string }]
 *
 * Data source: bet_history table
 */

import { Env } from '../../types/api';
import { CORS_HEADERS } from '../../utils/request';

interface Transaction {
  type: 'BET' | 'PAYOUT';
  customerId: string;
  amount: number;
  status: 'PENDING' | 'SETTLED';
  timestamp: string;
}

type TransactionsResponse = Transaction[];

/**
 * GET /api/f402/transactions/latest
 * Returns last N transactions (bets and payouts)
 */
export async function getLatestTransactions(
  request: Request,
  env: Env,
  requestId: string
): Promise<Response> {
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '10', 10);

  console.log(`[${requestId}] 💸 GET /api/f402/transactions/latest?limit=${limit}`);

  

  try {
    if (!env.ANALYTICS) {
      throw new Error('ANALYTICS database not configured');
    }

    // Get latest transactions from bet_history
    // Map: WIN bets → PAYOUT, others → BET
    const query = await env.ANALYTICS.prepare(`
      SELECT
        CASE
          WHEN result = 'WIN' THEN 'PAYOUT'
          ELSE 'BET'
        END as type,
        cid as customerId,
        CASE
          WHEN result = 'WIN' THEN payout
          ELSE stake
        END as amount,
        CASE
          WHEN result = 'PENDING' THEN 'PENDING'
          ELSE 'SETTLED'
        END as status,
        ts as timestamp
      FROM bet_history
      ORDER BY ts DESC
      LIMIT ?
    `).bind(limit).all();

    const transactions = query.results as Transaction[];

    console.log(`[${requestId}] 📋 Fetched ${transactions.length} transactions`);

    // Log summary stats
    const betCount = transactions.filter((t) => t.type === 'BET').length;
    const payoutCount = transactions.filter((t) => t.type === 'PAYOUT').length;
    const pendingCount = transactions.filter((t) => t.status === 'PENDING').length;

    console.log(`[${requestId}] 📊 Stats: ${betCount} bets, ${payoutCount} payouts, ${pendingCount} pending`);

    return new Response(JSON.stringify(transactions), {
      headers: CORS_HEADERS,
    });

  } catch (error) {
    console.error(`[${requestId}] ❌ Error fetching transactions:`, error);

    return new Response(
      JSON.stringify({
        error: 'Failed to fetch transactions',
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
