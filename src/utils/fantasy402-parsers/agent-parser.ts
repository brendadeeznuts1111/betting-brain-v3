/**
 * Fantasy402 Agent & Account Parsers
 * Handle agent lists, performance, account info, authorizations, weekly figures
 */

import { cleanString, safeParseFloat } from './helpers';
import { CENTS_TO_DOLLARS } from './constants';

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
            currentBalance: safeParseFloat(info.CurrentBalance || '0') / CENTS_TO_DOLLARS,
            availableBalance: safeParseFloat(info.AvailableBalance || '0') / CENTS_TO_DOLLARS,
            creditLimit: safeParseFloat(info.CreditLimit || '0') / CENTS_TO_DOLLARS,
            pendingWagerBalance: safeParseFloat(info.PendingWagerBalance || '0') / CENTS_TO_DOLLARS,
            freePlayBalance: safeParseFloat(info.FreePlayBalance || '0') / CENTS_TO_DOLLARS,
            currencyCode: cleanString(info.CurrencyCode || 'USD'),

            // Status
            active: cleanString(info.Active) === 'Y',
            casinoActive: cleanString(info.CasinoActive) === 'Y',
            suspendSportsbook: cleanString(info.SuspendSportsbook) === 'Y',
            suspendHorses: cleanString(info.SuspendHorses) === 'Y',
            readOnly: cleanString(info.ReadOnlyFlag) === 'Y',
            denyLiveBetting: cleanString(info.DenyLiveBetting) === 'Y',

            // Limits (in cents, divide by 100)
            wagerLimit: safeParseFloat(info.WagerLimit || '0') / CENTS_TO_DOLLARS,
            minimumWager: safeParseFloat(info.MinimumWager || '0') / CENTS_TO_DOLLARS,
            maxPropPayout: safeParseFloat(info.MaxPropPayout || '0') / CENTS_TO_DOLLARS,
            parlayMaxPayout: safeParseFloat(info.ParlayMaxPayout || '0') / CENTS_TO_DOLLARS,
            globalMaxPayout: safeParseFloat(info.GlobalMaxPayout || '0') / CENTS_TO_DOLLARS,

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
