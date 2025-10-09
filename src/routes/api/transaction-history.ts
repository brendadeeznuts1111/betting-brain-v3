/**
 * Transaction History API
 * GET /api/transaction-history
 * Returns latest transaction history from Fantasy402
 */

import { Env } from '../../types/api';
import { CORS_HEADERS } from '../../utils/request';

export async function getTransactionHistory(
  request: Request,
  env: Env,
  requestId: string
): Promise<Response> {
  console.log(`[${requestId}] 💳 GET /api/transaction-history`);

  

  try {
    // Check KV cache for latest transaction history
    if (env.FANTASY_CACHE) {
      const cached = await env.FANTASY_CACHE.get('transactionHistory:latest');

      if (cached) {
        const data = JSON.parse(cached);
        const cacheAge = Date.now() - new Date(data.capturedAt).getTime();

        // Use cache if less than 30 minutes old
        if (cacheAge < 1800000) {
          const transactions = data.raw?.LIST || data.raw?.list || [];

          // Calculate summary statistics
          let totalDeposits = 0;
          let totalWithdrawals = 0;
          let totalAdjustments = 0;
          let depositCount = 0;
          let withdrawalCount = 0;
          let adjustmentCount = 0;

          transactions.forEach((txn: any) => {
            const amount = Math.abs(txn.Amount || 0);
            const tranCode = txn.TranCode;
            const tranType = txn.TranType;

            // Deposits (C/E - Credits/Extensions)
            if (tranCode === 'C' && tranType === 'E') {
              totalDeposits += amount;
              depositCount++;
            }
            // Withdrawals (D/I or D/D - Debits)
            else if (tranCode === 'D' && (tranType === 'I' || tranType === 'D')) {
              totalWithdrawals += amount;
              withdrawalCount++;
            }
            // Adjustments (C/C - Credit corrections)
            else if (tranCode === 'C' && tranType === 'C') {
              totalAdjustments += amount;
              adjustmentCount++;
            }
          });

          const netBalance = totalDeposits - totalWithdrawals + totalAdjustments;

          return new Response(JSON.stringify({
            transactions: transactions.map((txn: any) => ({
              documentNumber: txn.DocumentNumber,
              tranCode: txn.TranCode,
              tranType: txn.TranType,
              amount: txn.Amount,
              balance: txn.Balance,
              date: txn.Date,
              time: txn.Time,
              description: txn.Description || '',
              reference: txn.Reference || '',
              customerName: txn.CustomerName || '',
              customerId: txn.CustomerID || ''
            })),
            summary: {
              totalDeposits,
              totalWithdrawals,
              totalAdjustments,
              netBalance,
              depositCount,
              withdrawalCount,
              adjustmentCount,
              totalTransactions: transactions.length
            },
            filters: data.metadata?.filters || {},
            period: {
              startDate: data.metadata?.startDate,
              endDate: data.metadata?.endDate,
              agentID: data.metadata?.agentID,
              customerID: data.metadata?.customerID
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
      transactions: [],
      summary: {
        totalDeposits: 0,
        totalWithdrawals: 0,
        totalAdjustments: 0,
        netBalance: 0,
        depositCount: 0,
        withdrawalCount: 0,
        adjustmentCount: 0,
        totalTransactions: 0
      },
      filters: {},
      period: null,
      cached: false,
      message: 'No transaction history available. Visit fantasy402.com/manager.html to capture data.',
      requestId,
    }), {
      headers: CORS_HEADERS,
    });

  } catch (error) {
    console.error(`[${requestId}] ❌ Transaction history error:`, error);

    return new Response(
      JSON.stringify({
        error: 'Failed to fetch transaction history',
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
