/**
 * Fantasy402 Player Parsers
 * Handle player info, performance, analysis, pending wagers
 */

import { cleanString, safeParseFloat } from './helpers';

export function parsePlayerInfo(response: any): {
    customerID: string;
    agentID: string;
    playerName: string;
    playerType: string;
    office: string;
    status: string;
    registrationDate: string;
    lastLogin: string;

    // Financial
    totalWagers: number;
    totalRisk: number;
    totalWin: number;
    netIncome: number;
    commissionRate: number;
    creditLimit: number;
    availableBalance: number;
    pendingBalance: number;
    freePlayBalance: number;
    currencyCode: string;

    // Status
    active: boolean;
    suspendSportsbook: boolean;
    readOnly: boolean;

    // Limits
    wagerLimit: number;
    minimumWager: number;
    maxPropPayout: number;

    // Permissions and preferences
    permissions: Record<string, any>;
    preferences: Record<string, any>;
    contactInfo: Record<string, any>;

    // Raw data
    raw: any;
} | null {
    try {
        if (!response || typeof response !== 'object') {
            return null;
        }

        // Extract player info (structure may vary)
        const player = response.player || response.Player || response;

        return {
            customerID: cleanString(player.customerID || player.CustomerID),
            agentID: cleanString(player.agentID || player.AgentID),
            playerName: cleanString(player.playerName || player.PlayerName || player.name),
            playerType: cleanString(player.playerType || player.PlayerType || player.type),
            office: cleanString(player.office || player.Office),
            status: cleanString(player.status || player.Status || player.active),
            registrationDate: cleanString(player.registrationDate || player.RegistrationDate || player.created),
            lastLogin: cleanString(player.lastLogin || player.LastLogin || player.lastAccess),

            // Financial (amounts may be in cents, divide by 100 if needed)
            totalWagers: parseInt(player.totalWagers || player.TotalWagers || '0'),
            totalRisk: safeParseFloat(player.totalRisk || player.TotalRisk || '0') / 100,
            totalWin: safeParseFloat(player.totalWin || player.TotalWin || '0') / 100,
            netIncome: safeParseFloat(player.netIncome || player.NetIncome || player.net || '0') / 100,
            commissionRate: safeParseFloat(player.commissionRate || player.CommissionRate || '0'),
            creditLimit: safeParseFloat(player.creditLimit || player.CreditLimit || '0') / 100,
            availableBalance: safeParseFloat(player.availableBalance || player.AvailableBalance || '0') / 100,
            pendingBalance: safeParseFloat(player.pendingBalance || player.PendingBalance || '0') / 100,
            freePlayBalance: safeParseFloat(player.freePlayBalance || player.FreePlayBalance || '0') / 100,
            currencyCode: cleanString(player.currencyCode || player.CurrencyCode || 'USD'),

            // Status
            active: cleanString(player.active || player.Active) === 'Y' || player.active === true,
            suspendSportsbook: cleanString(player.suspendSportsbook || player.SuspendSportsbook) === 'Y',
            readOnly: cleanString(player.readOnly || player.ReadOnly) === 'Y',

            // Limits (in cents, divide by 100 if needed)
            wagerLimit: safeParseFloat(player.wagerLimit || player.WagerLimit || '0') / 100,
            minimumWager: safeParseFloat(player.minimumWager || player.MinimumWager || '0') / 100,
            maxPropPayout: safeParseFloat(player.maxPropPayout || player.MaxPropPayout || '0') / 100,

            // Permissions and preferences
            permissions: player.permissions || player.Permissions || {},
            preferences: player.preferences || player.Preferences || {},
            contactInfo: player.contactInfo || player.ContactInfo || {},

            // Raw data
            raw: player
        };
    } catch (error) {
        console.error('Error parsing player info:', error);
        return null;
    }
}

/**
 * Parse player performance response
 * Returns financial metrics, risk data, and performance indicators for a specific player
 */
export function parsePlayerPerformance(response: any): {
    customerID: string;
    agentID: string;
    periodStart: string;
    periodEnd: string;
    type: string; // CP = Custom Period

    // Financial metrics
    totalRisk: number;
    totalWin: number;
    totalCommission: number;
    netIncome: number;

    // Wager counts
    totalWagers: number;
    pendingWagers: number;
    settledWagers: number;

    // Free play
    freePlayUsed: number;
    freePlayWin: number;

    // Sport breakdown
    sportBreakdown: Array<{
        sport: string;
        risk: number;
        win: number;
        count: number;
    }>;

    // Period analysis
    period: number;
    periodName: string;

    // Raw data
    raw: any;
} | null {
    try {
        if (!response || typeof response !== 'object') {
            return null;
        }

        // Extract sport breakdown if available
        const sportBreakdown: Array<{ sport: string; risk: number; win: number; count: number }> = [];

        if (response.SPORTS && Array.isArray(response.SPORTS)) {
            for (const sport of response.SPORTS) {
                sportBreakdown.push({
                    sport: cleanString(sport.Sport || sport.sport),
                    risk: safeParseFloat(sport.Risk || sport.risk || '0') / 100,
                    win: safeParseFloat(sport.Win || sport.win || '0') / 100,
                    count: parseInt(sport.Count || sport.count || '0')
                });
            }
        }

        return {
            customerID: cleanString(response.CustomerID || response.customerID || response.acc),
            agentID: cleanString(response.AgentID || response.agentID),
            periodStart: cleanString(response.StartDate || response.start || response.periodStart),
            periodEnd: cleanString(response.EndDate || response.end || response.periodEnd),
            type: cleanString(response.Type || response.type || 'CP'),

            // Financial metrics (amounts are in cents, divide by 100)
            totalRisk: safeParseFloat(response.TotalRisk || response.totalRisk || '0') / 100,
            totalWin: safeParseFloat(response.TotalWin || response.totalWin || '0') / 100,
            totalCommission: safeParseFloat(response.TotalCommission || response.commission || '0') / 100,
            netIncome: safeParseFloat(response.NetIncome || response.netIncome || response.Net || '0') / 100,

            // Wager counts
            totalWagers: parseInt(response.TotalWagers || response.totalCount || '0'),
            pendingWagers: parseInt(response.PendingWagers || response.pending || '0'),
            settledWagers: parseInt(response.SettledWagers || response.settled || '0'),

            // Free play
            freePlayUsed: safeParseFloat(response.FreePlayUsed || response.freePlay || '0') / 100,
            freePlayWin: safeParseFloat(response.FreePlayWin || response.freePlayWin || '0') / 100,

            // Sport breakdown
            sportBreakdown,

            // Period
            period: parseInt(response.Period || response.period || '-1'),
            periodName: cleanString(response.PeriodName || response.periodName || 'Custom'),

            // Raw data
            raw: response
        };
    } catch (error) {
        console.error('Error parsing player performance:', error);
        return null;
    }
}

/**
 * Parse pending wagers response
 * Returns pending wager details, risk data, and betting patterns
 */
export function parsePendingWagers(response: any): Array<{
    wagerId: string;
    customerID: string;
    agentID: string;
    sport: string;
    betType: string;
    stake: number;
    odds: number;
    risk: number;
    potentialWin: number;
    eventId: string;
    eventName: string;
    wagerDate: string;
    status: string;
    description: string;
    raw: any;
}> {
    try {
        if (!response || !response.LIST || !Array.isArray(response.LIST)) {
            return [];
        }

        return response.LIST.map((wager: any) => ({
            wagerId: cleanString(wager.WagerID || wager.wagerId || wager.id),
            customerID: cleanString(wager.CustomerID || wager.customerID),
            agentID: cleanString(wager.AgentID || wager.agentID),
            sport: cleanString(wager.Sport || wager.sport),
            betType: cleanString(wager.BetType || wager.betType),
            stake: safeParseFloat(wager.Stake || wager.stake || '0') / 100,
            odds: safeParseFloat(wager.Odds || wager.odds || '0'),
            risk: safeParseFloat(wager.Risk || wager.risk || '0') / 100,
            potentialWin: safeParseFloat(wager.PotentialWin || wager.potentialWin || '0') / 100,
            eventId: cleanString(wager.EventID || wager.eventId),
            eventName: cleanString(wager.EventName || wager.eventName),
            wagerDate: cleanString(wager.WagerDate || wager.wagerDate),
            status: cleanString(wager.Status || wager.status || 'Pending'),
            description: cleanString(wager.Description || wager.description),
            raw: wager
        })).filter((wager: any) => wager.wagerId);
    } catch (error) {
        console.error('Error parsing pending wagers:', error);
        return [];
    }
}

/**
 * Parse player analysis report response
 * Returns comprehensive player analysis data, metrics, and breakdowns
 */
export function parsePlayerAnalysis(response: any): {
    customerID: string;
    agentID: string;
    reportType: string;
    startDate: string;
    endDate: string;
    lineType: string;

    // Overall metrics
    totalWagers: number;
    totalRisk: number;
    totalWin: number;
    netIncome: number;
    winRate: number;
    averageOdds: number;

    // Breakdowns
    sportsBreakdown: Record<string, {
        wagerCount: number;
        totalRisk: number;
        totalWin: number;
        netIncome: number;
        winRate: number;
    }>;
    betTypesBreakdown: Record<string, {
        wagerCount: number;
        totalRisk: number;
        totalWin: number;
        netIncome: number;
        winRate: number;
    }>;
    timeBreakdown: Record<string, {
        wagerCount: number;
        totalRisk: number;
        totalWin: number;
        netIncome: number;
        winRate: number;
    }>;

    // Raw data
    raw: any;
} | null {
    try {
        if (!response || typeof response !== 'object') {
            return null;
        }

        // Extract analysis data (structure may vary)
        const analysis = response.analysis || response.Analysis || response;

        // Parse sports breakdown
        const sportsBreakdown: Record<string, any> = {};
        if (analysis.sportsBreakdown || analysis.SportsBreakdown) {
            const sports = analysis.sportsBreakdown || analysis.SportsBreakdown;
            for (const [sport, data] of Object.entries(sports)) {
                sportsBreakdown[sport] = {
                    wagerCount: (data as any).wagerCount || (data as any).wager_count || 0,
                    totalRisk: safeParseFloat((data as any).totalRisk || (data as any).total_risk || '0') / 100,
                    totalWin: safeParseFloat((data as any).totalWin || (data as any).total_win || '0') / 100,
                    netIncome: safeParseFloat((data as any).netIncome || (data as any).net_income || '0') / 100,
                    winRate: safeParseFloat((data as any).winRate || (data as any).win_rate || '0')
                };
            }
        }

        // Parse bet types breakdown
        const betTypesBreakdown: Record<string, any> = {};
        if (analysis.betTypesBreakdown || analysis.BetTypesBreakdown) {
            const betTypes = analysis.betTypesBreakdown || analysis.BetTypesBreakdown;
            for (const [betType, data] of Object.entries(betTypes)) {
                betTypesBreakdown[betType] = {
                    wagerCount: (data as any).wagerCount || (data as any).wager_count || 0,
                    totalRisk: safeParseFloat((data as any).totalRisk || (data as any).total_risk || '0') / 100,
                    totalWin: safeParseFloat((data as any).totalWin || (data as any).total_win || '0') / 100,
                    netIncome: safeParseFloat((data as any).netIncome || (data as any).net_income || '0') / 100,
                    winRate: safeParseFloat((data as any).winRate || (data as any).win_rate || '0')
                };
            }
        }

        // Parse time breakdown
        const timeBreakdown: Record<string, any> = {};
        if (analysis.timeBreakdown || analysis.TimeBreakdown) {
            const time = analysis.timeBreakdown || analysis.TimeBreakdown;
            for (const [period, data] of Object.entries(time)) {
                timeBreakdown[period] = {
                    wagerCount: (data as any).wagerCount || (data as any).wager_count || 0,
                    totalRisk: safeParseFloat((data as any).totalRisk || (data as any).total_risk || '0') / 100,
                    totalWin: safeParseFloat((data as any).totalWin || (data as any).total_win || '0') / 100,
                    netIncome: safeParseFloat((data as any).netIncome || (data as any).net_income || '0') / 100,
                    winRate: safeParseFloat((data as any).winRate || (data as any).win_rate || '0')
                };
            }
        }

        return {
            customerID: cleanString(analysis.customerID || analysis.CustomerID),
            agentID: cleanString(analysis.agentID || analysis.AgentID),
            reportType: cleanString(analysis.reportType || analysis.ReportType || 'PlayerAnalysis'),
            startDate: cleanString(analysis.startDate || analysis.StartDate),
            endDate: cleanString(analysis.endDate || analysis.EndDate),
            lineType: cleanString(analysis.lineType || analysis.LineType || 'All'),

            // Overall metrics (amounts may be in cents, divide by 100 if needed)
            totalWagers: parseInt(analysis.totalWagers || analysis.TotalWagers || '0'),
            totalRisk: safeParseFloat(analysis.totalRisk || analysis.TotalRisk || '0') / 100,
            totalWin: safeParseFloat(analysis.totalWin || analysis.TotalWin || '0') / 100,
            netIncome: safeParseFloat(analysis.netIncome || analysis.NetIncome || '0') / 100,
            winRate: safeParseFloat(analysis.winRate || analysis.WinRate || '0'),
            averageOdds: safeParseFloat(analysis.averageOdds || analysis.AverageOdds || '0'),

            // Breakdowns
            sportsBreakdown,
            betTypesBreakdown,
            timeBreakdown,

            // Raw data
            raw: analysis
        };
    } catch (error) {
        console.error('Error parsing player analysis:', error);
        return null;
    }
}

/**
 * Parse agent performance response
 * Returns financial metrics, risk data, and performance indicators
 */
export function parseAgentPerformance(response: any): {
    agentID: string;
    agentOwner: string;
    periodStart: string;
    periodEnd: string;
    type: string; // CP = Custom Period

    // Financial metrics
    totalRisk: number;
    totalWin: number;
    totalCommission: number;
    netIncome: number;

    // Wager counts
    totalWagers: number;
    pendingWagers: number;
    settledWagers: number;

    // Free play
    freePlayUsed: number;
    freePlayWin: number;

    // Sport breakdown
    sportBreakdown: Array<{
        sport: string;
        risk: number;
        win: number;
        count: number;
    }>;

    // Period analysis
    period: number;
    periodName: string;

    // Raw data
    raw: any;
} | null {
    try {
        if (!response || typeof response !== 'object') {
            return null;
        }

        // Extract sport breakdown if available
        const sportBreakdown: Array<{ sport: string; risk: number; win: number; count: number }> = [];

        if (response.SPORTS && Array.isArray(response.SPORTS)) {
            for (const sport of response.SPORTS) {
                sportBreakdown.push({
                    sport: cleanString(sport.Sport || sport.sport),
                    risk: safeParseFloat(sport.Risk || sport.risk || '0') / 100,
                    win: safeParseFloat(sport.Win || sport.win || '0') / 100,
                    count: parseInt(sport.Count || sport.count || '0')
                });
            }
        }

        return {
            agentID: cleanString(response.AgentID || response.agentID),
            agentOwner: cleanString(response.AgentOwner || response.agentOwner),
            periodStart: cleanString(response.StartDate || response.start),
            periodEnd: cleanString(response.EndDate || response.end),
            type: cleanString(response.Type || response.type || 'CP'),

            // Financial metrics (amounts are in cents, divide by 100)
            totalRisk: safeParseFloat(response.TotalRisk || response.totalRisk || '0') / 100,
            totalWin: safeParseFloat(response.TotalWin || response.totalWin || '0') / 100,
            totalCommission: safeParseFloat(response.TotalCommission || response.commission || '0') / 100,
            netIncome: safeParseFloat(response.NetIncome || response.netIncome || response.Net || '0') / 100,

            // Wager counts
            totalWagers: parseInt(response.TotalWagers || response.totalCount || '0'),
            pendingWagers: parseInt(response.PendingWagers || response.pending || '0'),
            settledWagers: parseInt(response.SettledWagers || response.settled || '0'),

            // Free play
            freePlayUsed: safeParseFloat(response.FreePlayUsed || response.freePlay || '0') / 100,
            freePlayWin: safeParseFloat(response.FreePlayWin || response.freePlayWin || '0') / 100,

            // Sport breakdown
            sportBreakdown,

            // Period
            period: parseInt(response.Period || response.period || '-1'),
            periodName: cleanString(response.PeriodName || response.periodName || 'Custom'),

            // Raw data
            raw: response
        };
    } catch (error) {
        console.error('Error parsing agent performance:', error);
        return null;
    }
}

/**
 * Extract operation-specific data
 */
