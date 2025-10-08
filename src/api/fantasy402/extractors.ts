/**
 * Fantasy402 Data Extractors
 * Extract bet data from various Fantasy402 API responses for analytics
 */

import type { BetData } from '../../utils/analytics-rollups';

/**
 * Extract bet data from BetTicker response for analytics
 * @param betTickerResponse BetTicker API response data
 * @returns Array of bet data for analytics processing
 */
export function extractBetDataFromBetTicker(betTickerResponse: any): BetData[] {
    const betData: BetData[] = [];

    try {
        // BetTicker response structure varies, try common patterns
        const events = betTickerResponse.events || betTickerResponse.Events || betTickerResponse.data || [];

        for (const event of events) {
            if (!event || typeof event !== 'object') continue;

            const gameId = event.gameId || event.game_id || event.id;
            const lines = event.lines || event.Lines || [];

            for (const line of lines) {
                if (!line || typeof line !== 'object') continue;

                // Extract line movement data
                const oldLine = line.oldLine || line.old_line || line.previousLine;
                const newLine = line.newLine || line.new_line || line.currentLine;
                const timestamp = line.timestamp || line.updated_at || line.time;

                if (oldLine !== undefined && newLine !== undefined) {
                    betData.push({
                        gameId: gameId?.toString(),
                        oldLine: Number(oldLine),
                        newLine: Number(newLine),
                        timestamp: timestamp?.toString(),
                        // BetTicker doesn't have agent/customer info, use defaults
                        agentId: 'betTicker',
                        customerId: 'system',
                        stake: 0,
                        odds: 1,
                        side: 'home' // Default side
                    });
                }
            }
        }
    } catch (error) {
        console.warn('Failed to extract bet data from BetTicker response:', error);
    }

    return betData;
}

/**
 * Extract bet data from pending wagers for analytics
 * @param pendingWagers Array of pending wager data
 * @param metadata Packet metadata containing agent/customer info
 * @returns Array of bet data for analytics processing
 */
export function extractBetDataFromPendingWagers(pendingWagers: any[], metadata: any): BetData[] {
    const betData: BetData[] = [];

    try {
        for (const wager of pendingWagers) {
            if (!wager || typeof wager !== 'object') continue;

            betData.push({
                agentId: metadata.agentID || wager.agentID,
                customerId: metadata.customerID || wager.customerID,
                gameId: wager.gameId || wager.eventId || wager.event_id,
                stake: wager.stake || wager.amount || 0,
                odds: wager.odds || wager.line || 1,
                side: wager.side || (wager.betType === 'home' ? 'home' : 'away'),
                timestamp: wager.timestamp || wager.createdAt || wager.date,
                // Pending wagers don't have line movement data
                oldLine: undefined,
                newLine: undefined
            });
        }
    } catch (error) {
        console.warn('Failed to extract bet data from pending wagers:', error);
    }

    return betData;
}

/**
 * Extract bet data from transaction history for analytics
 * @param transactions Array of transaction data
 * @param metadata Packet metadata containing agent/customer info
 * @returns Array of bet data for analytics processing
 */
export function extractBetDataFromTransactions(transactions: any[], metadata: any): BetData[] {
    const betData: BetData[] = [];

    try {
        for (const transaction of transactions) {
            if (!transaction || typeof transaction !== 'object') continue;

            // Only process betting transactions (not deposits/withdrawals)
            const tranCode = transaction.tranCode || '';
            const tranType = transaction.tranType || '';

            if (tranCode === 'D' && (tranType === 'L' || tranType === 'X')) {
                // Betting loss transaction
                betData.push({
                    agentId: metadata.agentID || transaction.agentID,
                    customerId: metadata.customerID || transaction.customerID,
                    gameId: transaction.eventId || transaction.gameId,
                    stake: Math.abs(transaction.amount || 0),
                    odds: 1.0, // Default odds for transaction data
                    side: 'home', // Default side
                    timestamp: transaction.tranDateTime || transaction.timestamp,
                    // Transactions don't have line movement data
                    oldLine: undefined,
                    newLine: undefined
                });
            } else if (tranCode === 'C' && (tranType === 'W' || tranType === 'X')) {
                // Betting win transaction
                betData.push({
                    agentId: metadata.agentID || transaction.agentID,
                    customerId: metadata.customerID || transaction.customerID,
                    gameId: transaction.eventId || transaction.gameId,
                    stake: Math.abs(transaction.amount || 0),
                    odds: 1.0, // Default odds for transaction data
                    side: 'away', // Default side
                    timestamp: transaction.tranDateTime || transaction.timestamp,
                    // Transactions don't have line movement data
                    oldLine: undefined,
                    newLine: undefined
                });
            }
        }
    } catch (error) {
        console.warn('Failed to extract bet data from transactions:', error);
    }

    return betData;
}
