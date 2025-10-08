// Fantasy402.com Data Parser
// Normalizes and cleans data from Fantasy402.com API responses

/**
 * Clean trailing whitespace from strings
 */
export function cleanString(str: string | undefined | null): string {
    return str ? str.trim() : '';
}

/**
 * Safe parseFloat that rejects invalid input (prevents "100abc" → 100)
 * For betting stakes, always validate with Number() + isNaN() check
 */
export function safeParseFloat(value: string | number | undefined | null): number {
    if (value === null || value === undefined) return 0;

    const num = Number(value);
    if (isNaN(num)) {
        console.warn(`Invalid number input: "${value}" - using 0`);
        return 0;
    }

    return num;
}

/**
 * Parse sport types list from Fantasy402 API
 * Input: {"LIST":[{"sportType":"Auto Racing         ","0":"Auto Racing         "}, ...]}
 * Output: ["Auto Racing", "Baseball", "Basketball", ...]
 */
export function parseSportTypes(response: any): string[] {
    try {
        if (!response || !response.LIST || !Array.isArray(response.LIST)) {
            return [];
        }

        return response.LIST
            .map((item: any) => cleanString(item.sportType || item['0']))
            .filter((sport: string) => sport.length > 0);
    } catch (error) {
        console.error('Error parsing sport types:', error);
        return [];
    }
}

/**
 * Parse weekly figures from Fantasy402 API
 */
export function parseWeeklyFigures(response: any): {
    agentID: string;
    weekNumber: number;
    year: number;
    figures: any;
} | null {
    try {
        if (!response || typeof response !== 'object') {
            return null;
        }

        // Extract week info (structure varies)
        const weekNumber = response.week || 0;
        const year = new Date().getFullYear();

        return {
            agentID: cleanString(response.agentID),
            weekNumber,
            year,
            figures: response
        };
    } catch (error) {
        console.error('Error parsing weekly figures:', error);
        return null;
    }
}

/**
 * Parse agent list from Fantasy402 API
 */
export function parseAgentList(response: any): Array<{
    agentID: string;
    agentType: string;
    agentOwner?: string;
    office?: string;
}> {
    try {
        if (!response || !Array.isArray(response)) {
            return [];
        }

        return response.map((agent: any) => ({
            agentID: cleanString(agent.agentID || agent.id),
            agentType: cleanString(agent.agentType || agent.type),
            agentOwner: cleanString(agent.agentOwner || agent.owner),
            office: cleanString(agent.office)
        })).filter((agent: any) => agent.agentID);
    } catch (error) {
        console.error('Error parsing agent list:', error);
        return [];
    }
}

/**
 * Parse account info from Fantasy402 API
 */
export function parseAccountInfo(response: any): {
    customerID: string;
    agentID: string;
    office: string;
    agentType: string;
    store: string;

    // Financial
    currentBalance: number;
    availableBalance: number;
    creditLimit: number;
    pendingWagerBalance: number;
    freePlayBalance: number;
    currencyCode: string;

    // Status
    active: boolean;
    casinoActive: boolean;
    suspendSportsbook: boolean;
    suspendHorses: boolean;
    readOnly: boolean;
    denyLiveBetting: boolean;

    // Limits
    wagerLimit: number;
    minimumWager: number;
    maxPropPayout: number;
    parlayMaxPayout: number;
    globalMaxPayout: number;

    // Contact
    email: string;
    phone: string;
    nameFirst: string;
    nameLast: string;
    playerName: string;

    // Dates
    openDateTime: string;

    // Settings
    timezone: number;
    language: string;
    skin: string;
    priceType: string;

    // Raw data
    raw: any;
} | null {
    try {
        if (!response || !response.accountInfo || typeof response.accountInfo !== 'object') {
            return null;
        }

        const info = response.accountInfo;

        return {
            customerID: cleanString(info.customerID),
            agentID: cleanString(info.AgentID || info.customerID),
            office: cleanString(info.Office),
            agentType: cleanString(info.AgentType),
            store: cleanString(info.Store),

            // Financial (amounts are in cents, divide by 100)
            currentBalance: safeParseFloat(info.CurrentBalance || '0') / 100,
            availableBalance: safeParseFloat(info.AvailableBalance || '0') / 100,
            creditLimit: safeParseFloat(info.CreditLimit || '0') / 100,
            pendingWagerBalance: safeParseFloat(info.PendingWagerBalance || '0') / 100,
            freePlayBalance: safeParseFloat(info.FreePlayBalance || '0') / 100,
            currencyCode: cleanString(info.CurrencyCode || 'USD'),

            // Status
            active: cleanString(info.Active) === 'Y',
            casinoActive: cleanString(info.CasinoActive) === 'Y',
            suspendSportsbook: cleanString(info.SuspendSportsbook) === 'Y',
            suspendHorses: cleanString(info.SuspendHorses) === 'Y',
            readOnly: cleanString(info.ReadOnlyFlag) === 'Y',
            denyLiveBetting: cleanString(info.DenyLiveBetting) === 'Y',

            // Limits (in cents, divide by 100)
            wagerLimit: safeParseFloat(info.WagerLimit || '0') / 100,
            minimumWager: safeParseFloat(info.MinimumWager || '0') / 100,
            maxPropPayout: safeParseFloat(info.MaxPropPayout || '0') / 100,
            parlayMaxPayout: safeParseFloat(info.ParlayMaxPayout || '0') / 100,
            globalMaxPayout: safeParseFloat(info.GlobalMaxPayout || '0') / 100,

            // Contact
            email: cleanString(info.email),
            phone: cleanString(info.Phone || info.SMSPhoneNumber),
            nameFirst: cleanString(info.NameFirst),
            nameLast: cleanString(info.NameLast),
            playerName: cleanString(info.PlayerName),

            // Dates
            openDateTime: cleanString(info.OpenDateTime),

            // Settings
            timezone: parseInt(info.TimeZone || '0'),
            language: cleanString(info.Language),
            skin: cleanString(info.Skin),
            priceType: cleanString(info.PriceType),

            // Raw data
            raw: info
        };
    } catch (error) {
        console.error('Error parsing account info:', error);
        return null;
    }
}

/**
 * Parse authentication response
 */
export function parseAuthResponse(response: any): {
    success: boolean;
    token?: string;
    customerID?: string;
    message?: string;
} {
    try {
        if (!response || typeof response !== 'object') {
            return { success: false, message: 'Invalid response' };
        }

        // Different auth response formats
        const success = response.success === true ||
            response.status === 'success' ||
            !!response.token;

        return {
            success,
            token: cleanString(response.token),
            customerID: cleanString(response.customerID || response.customer_id || response.userID),
            message: cleanString(response.message || response.error)
        };
    } catch (error) {
        console.error('Error parsing auth response:', error);
        return { success: false, message: 'Parse error' };
    }
}

/**
 * Normalize Fantasy402 data object
 * Removes trailing spaces from all string values
 */
export function normalizeObject(obj: any): any {
    if (obj === null || obj === undefined) {
        return obj;
    }

    if (typeof obj === 'string') {
        return cleanString(obj);
    }

    if (Array.isArray(obj)) {
        return obj.map(item => normalizeObject(item));
    }

    if (typeof obj === 'object') {
        const normalized: any = {};
        for (const [key, value] of Object.entries(obj)) {
            normalized[key] = normalizeObject(value);
        }
        return normalized;
    }

    return obj;
}

/**
 * Parse authorizations response
 */
export function parseAuthorizations(response: any): {
    customerID: string;
    agentID: string;
    masterAgentID?: string;
    masterLogin?: string;
    permissions: Record<string, any>;
    financialSettings: {
        commissionPercent: number;
        inetHeadCountRate: number;
        chargeCorePlusInet: boolean;
    };
    featureFlags: Record<string, boolean>;
} | null {
    try {
        if (!response || !response.INFO || typeof response.INFO !== 'object') {
            return null;
        }

        const info = response.INFO;

        // Extract permissions (Y/N flags)
        const permissions: Record<string, any> = {};
        const featureFlags: Record<string, boolean> = {};

        for (const [key, value] of Object.entries(info)) {
            const cleanValue = cleanString(value as string);

            // Permission flags (usually Y/N)
            if (cleanValue === 'Y' || cleanValue === 'N') {
                permissions[key] = cleanValue;
                featureFlags[key] = cleanValue === 'Y';
            }
        }

        return {
            customerID: cleanString(info.CustomerID),
            agentID: cleanString(info.AgentID),
            masterAgentID: cleanString(info.MasterAgentID),
            masterLogin: cleanString(info.MasterLogin),
            permissions,
            financialSettings: {
                commissionPercent: safeParseFloat(info.CommissionPercent || '0'),
                inetHeadCountRate: safeParseFloat(info.InetHeadCountRate || '0'),
                chargeCorePlusInet: cleanString(info.ChargeCorePlusInet) === 'Y'
            },
            featureFlags
        };
    } catch (error) {
        console.error('Error parsing authorizations:', error);
        return null;
    }
}

/**
 * Parse player information response
 * Returns player details, financial data, and preferences
 */
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
export function extractOperationData(operation: string, responseBody: any): any {
    switch (operation) {
        case 'getSportsType':
            return {
                sportTypes: parseSportTypes(responseBody),
                raw: responseBody
            };

        case 'getWeeklyFigureByAgentLite':
        case 'getWeeklyFigureByAgent':
            return {
                figures: parseWeeklyFigures(responseBody),
                raw: responseBody
            };

        case 'getListAgenstByAgent':
        case 'getAgentList':
            return {
                agents: parseAgentList(responseBody),
                raw: responseBody
            };

        case 'getAccountInfoOwner':
        case 'getAccountInfo':
            return {
                account: parseAccountInfo(responseBody),
                raw: responseBody
            };

        case 'authenticateCustomer':
        case 'login':
            return {
                auth: parseAuthResponse(responseBody),
                raw: responseBody
            };

        case 'getAuthorizations':
            return {
                authorizations: parseAuthorizations(responseBody),
                raw: responseBody
            };

        case 'getAgentPerformance':
            return {
                performance: parseAgentPerformance(responseBody),
                raw: responseBody
            };

        case 'getInfoPlayer':
            return {
                player: parsePlayerInfo(responseBody),
                raw: responseBody
            };

        case 'getPerformancePlayer':
            return {
                performance: parsePlayerPerformance(responseBody),
                raw: responseBody
            };

        case 'getPending':
            return {
                pendingWagers: parsePendingWagers(responseBody),
                raw: responseBody
            };

        case 'getReportPlayerAnalysis':
            return {
                analysis: parsePlayerAnalysis(responseBody),
                raw: responseBody
            };

        default:
            return {
                normalized: normalizeObject(responseBody),
                raw: responseBody
            };
    }
}

