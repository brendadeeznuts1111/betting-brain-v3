// Analytics Rollup Functions
// Pure math functions for micro-analytics - no database hits

export interface BetData {
    agentId?: string;
    customerId?: string;
    gameId?: string;
    stake?: number;
    odds?: number;
    side?: 'home' | 'away';
    timestamp?: string;
    oldLine?: number;
    newLine?: number;
}

export interface AnalyticsRollup {
    riskByAgent: Record<string, number>;
    steamAlerts: SteamAlert[];
    exposureBySide: Record<string, { home: number; away: number }>;
    custRecency: Record<string, string>;
}

export interface SteamAlert {
    gameId: string;
    oldLine: number;
    newLine: number;
    seconds: number;
}

/**
 * Rollup risk by agent from bet data
 * @param bets Array of bet data
 * @returns Object mapping agentId to total risk
 */
export function rollupRisk(bets: BetData[]): Record<string, number> {
    const riskByAgent: Record<string, number> = {};

    for (const bet of bets) {
        if (!bet.agentId || !bet.stake) continue;

        const risk = bet.stake * (bet.odds || 1);
        riskByAgent[bet.agentId] = (riskByAgent[bet.agentId] || 0) + risk;
    }

    return riskByAgent;
}

/**
 * Detect steam moves (≥ 1 point change in ≤ 60 seconds)
 * @param bets Array of bet data
 * @returns Array of steam alerts
 */
export function detectSteam(bets: BetData[]): SteamAlert[] {
    const steamAlerts: SteamAlert[] = [];
    const now = Date.now();

    for (const bet of bets) {
        if (!bet.gameId || !bet.oldLine || !bet.newLine) continue;

        const lineChange = Math.abs(bet.newLine - bet.oldLine);
        const betTime = bet.timestamp ? new Date(bet.timestamp).getTime() : now;
        const secondsAgo = (now - betTime) / 1000;

        // Steam move: ≥ 1 point change in ≤ 60 seconds
        if (lineChange >= 1 && secondsAgo <= 60) {
            steamAlerts.push({
                gameId: bet.gameId,
                oldLine: bet.oldLine,
                newLine: bet.newLine,
                seconds: Math.round(secondsAgo)
            });
        }
    }

    return steamAlerts;
}

/**
 * Calculate exposure by side for each game
 * @param bets Array of bet data
 * @returns Object mapping gameId to home/away exposure
 */
export function exposureMatrix(bets: BetData[]): Record<string, { home: number; away: number }> {
    const exposureBySide: Record<string, { home: number; away: number }> = {};

    for (const bet of bets) {
        if (!bet.gameId || !bet.stake || !bet.side) continue;

        if (!exposureBySide[bet.gameId]) {
            exposureBySide[bet.gameId] = { home: 0, away: 0 };
        }

        const exposure = bet.stake * (bet.odds || 1);
        exposureBySide[bet.gameId][bet.side] += exposure;
    }

    return exposureBySide;
}

/**
 * Calculate customer recency (last bet timestamp)
 * @param bets Array of bet data
 * @returns Object mapping customerId to last bet timestamp
 */
export function customerRecency(bets: BetData[]): Record<string, string> {
    const custRecency: Record<string, string> = {};

    for (const bet of bets) {
        if (!bet.customerId || !bet.timestamp) continue;

        const existing = custRecency[bet.customerId];
        if (!existing || bet.timestamp > existing) {
            custRecency[bet.customerId] = bet.timestamp;
        }
    }

    return custRecency;
}

/**
 * Generate analytics rollup from bet data
 * @param bets Array of bet data
 * @returns Complete analytics rollup
 */
export function generateAnalyticsRollup(bets: BetData[]): AnalyticsRollup {
    return {
        riskByAgent: rollupRisk(bets),
        steamAlerts: detectSteam(bets),
        exposureBySide: exposureMatrix(bets),
        custRecency: customerRecency(bets)
    };
}
