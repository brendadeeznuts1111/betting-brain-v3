/**
 * Fantasy402 Customer Activity API
 *
 * GET /api/f402/customers/active?minutes=30
 * Returns: { count: number }
 *
 * GET /api/f402/customers/staked?period=today
 * Returns: { total: number }
 *
 * Data source: bet_history table
 */

import { Env } from '../../types/api';

interface ActiveCustomersResponse {
  count: number;
}

interface StakedTotalResponse {
  total: number;
}

/**
 * GET /api/f402/customers/active
 * Returns count of unique customers who placed bets in last N minutes
 */
export async function getActiveCustomers(
  request: Request,
  env: Env,
  requestId: string
): Promise<Response> {
  const url = new URL(request.url);
  const minutes = parseInt(url.searchParams.get('minutes') || '30', 10);

  console.log(`[${requestId}] 👥 GET /api/f402/customers/active?minutes=${minutes}`);

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    if (!env.ANALYTICS) {
      throw new Error('ANALYTICS database not configured');
    }

    // Get distinct customer count in time window
    const query = await env.ANALYTICS.prepare(`
      SELECT COUNT(DISTINCT cid) as count
      FROM bet_history
      WHERE ts > datetime('now', '-${minutes} minutes')
    `).first() as { count: number } | null;

    const count = query?.count || 0;
    console.log(`[${requestId}] 📊 Active customers (${minutes}min): ${count}`);

    const response: ActiveCustomersResponse = { count };

    return new Response(JSON.stringify(response), {
      headers: corsHeaders,
    });

  } catch (error) {
    console.error(`[${requestId}] ❌ Error fetching active customers:`, error);

    return new Response(
      JSON.stringify({
        error: 'Failed to fetch active customers',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      }),
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}

/**
 * GET /api/f402/customers/staked
 * Returns total amount staked for specified period
 */
export async function getStakedTotal(
  request: Request,
  env: Env,
  requestId: string
): Promise<Response> {
  const url = new URL(request.url);
  const period = url.searchParams.get('period') || 'today';

  console.log(`[${requestId}] 💵 GET /api/f402/customers/staked?period=${period}`);

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    if (!env.ANALYTICS) {
      throw new Error('ANALYTICS database not configured');
    }

    // Determine date filter based on period
    let dateFilter = `date(ts) = date('now')`;
    if (period === 'week') {
      dateFilter = `date(ts) >= date('now', '-7 days')`;
    } else if (period === 'month') {
      dateFilter = `date(ts) >= date('now', '-30 days')`;
    }

    // Get total staked amount
    const query = await env.ANALYTICS.prepare(`
      SELECT SUM(stake) as total
      FROM bet_history
      WHERE ${dateFilter}
    `).first() as { total: number | null } | null;

    const total = query?.total || 0;
    console.log(`[${requestId}] 💰 Total staked (${period}): $${total.toFixed(2)}`);

    const response: StakedTotalResponse = { total };

    return new Response(JSON.stringify(response), {
      headers: corsHeaders,
    });

  } catch (error) {
    console.error(`[${requestId}] ❌ Error fetching staked total:`, error);

    return new Response(
      JSON.stringify({
        error: 'Failed to fetch staked total',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      }),
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}
