/**
 * Fantasy402 Authenticated API Client
 * 
 * Server-side client for making authenticated API calls to fantasy402.com
 * Mimics browser behavior with proper headers and JWT authentication
 */

import type { Env } from '../types/cloudflare';

export interface Fantasy402ClientOptions {
    jwtToken: string;
    userAgent?: string;
    referer?: string;
}

export interface BetTickerParams {
    agent?: string;
    level?: string;
    ticket?: string;
    customer?: string;
    daterange?: string;
    show?: string;
    limit?: string;
    offset?: string;
}

export interface AgentPerformanceParams {
    agentID: string;
    start: string;  // MM/DD/YYYY
    end: string;    // MM/DD/YYYY
    type?: string;  // CP = Custom Period
    period?: string;
}

/**
 * Fantasy402 API Client
 * Makes authenticated server-side API calls that mimic browser behavior
 */
export class Fantasy402Client {
    private jwtToken: string;
    private baseURL: string = 'https://fantasy402.com';
    private userAgent: string;
    private referer: string;

    constructor(options: Fantasy402ClientOptions) {
        this.jwtToken = options.jwtToken;
        this.userAgent = options.userAgent ||
            'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36';
        this.referer = options.referer || 'https://fantasy402.com/';
    }

    /**
     * Make an authenticated POST request to a Fantasy402 endpoint
     */
    private async makeRequest(
        endpoint: string,
        params: Record<string, string>
    ): Promise<any> {
        const urlParams = new URLSearchParams(params);

        const response = await fetch(`${this.baseURL}${endpoint}`, {
            method: 'POST',
            headers: {
                // --- Mimicked Browser Headers ---
                'User-Agent': this.userAgent,
                'Accept': '*/*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': this.referer,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Origin': this.baseURL,

                // --- Authentication Header ---
                'Authorization': `Bearer ${this.jwtToken}`,
            },
            body: urlParams.toString(),
        });

        if (!response.ok) {
            throw new Error(`Fantasy402 API call failed: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    }

    /**
     * Get Bet Ticker data
     * 
     * @example
     * const data = await client.getBetTicker({
     *   agent: 'BILLY666',
     *   daterange: '01/01/2025 - 12/31/2025',
     *   limit: '200'
     * });
     */
    async getBetTicker(params: BetTickerParams = {}): Promise<any> {
        const defaultParams = {
            agent: '',
            level: '0',
            ticket: '',
            customer: '',
            daterange: '01/01/1970 - 12/31/2026',
            show: '',
            limit: '200',
            offset: '0',
        };

        return this.makeRequest(
            '/cloud/api/Manager/getBetTicker',
            { ...defaultParams, ...params }
        );
    }

    /**
     * Get Agent Performance data
     * 
     * @example
     * const data = await client.getAgentPerformance({
     *   agentID: 'BILLY666',
     *   start: '01/01/2025',
     *   end: '12/31/2025',
     *   type: 'CP'
     * });
     */
    async getAgentPerformance(params: AgentPerformanceParams): Promise<any> {
        const defaultParams = {
            type: 'CP',
            period: '-1',
        };

        return this.makeRequest(
            '/cloud/api/Manager/getAgentPerformance',
            { ...defaultParams, ...params, operation: 'getAgentPerformance' }
        );
    }

    /**
     * Get Transaction History
     */
    async getTransactionHistory(params: {
        agentID: string;
        customerID?: string;
        start: string;
        end: string;
        limit?: string;
        offset?: string;
    }): Promise<any> {
        return this.makeRequest(
            '/cloud/api/Manager/getTransactionHistory',
            {
                agentID: params.agentID,
                customerID: params.customerID || '',
                start: params.start,
                end: params.end,
                limit: params.limit || '100',
                offset: params.offset || '0',
                operation: 'getTransactionHistory'
            }
        );
    }

    /**
     * Get Account Info (Owner)
     */
    async getAccountInfoOwner(agentID: string): Promise<any> {
        return this.makeRequest(
            '/cloud/api/Manager/getAccountInfoOwner',
            { agentID, operation: 'getAccountInfoOwner' }
        );
    }

    /**
     * Authenticate and get JWT token
     * 
     * @example
     * const token = await Fantasy402Client.authenticate({
     *   username: 'BILLY666',
     *   password: 'your-password'
     * });
     */
    static async authenticate(credentials: {
        username: string;
        password: string;
    }): Promise<string> {
        const response = await fetch('https://fantasy402.com/cloud/api/System/authenticateCustomer', {
            method: 'POST',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
                'Accept': '*/*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://fantasy402.com/',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Origin': 'https://fantasy402.com',
            },
            body: new URLSearchParams({
                username: credentials.username,
                password: credentials.password,
                operation: 'authenticateCustomer'
            }).toString(),
        });

        if (!response.ok) {
            throw new Error(`Authentication failed: ${response.status}`);
        }

        const data = await response.json();

        if (!data.token) {
            throw new Error('No token returned from authentication');
        }

        return data.token;
    }
}

/**
 * Create a Fantasy402 client from environment variables
 * 
 * @example
 * const client = createFantasy402Client(env);
 * const data = await client.getBetTicker();
 */
export function createFantasy402Client(env: Env): Fantasy402Client {
    const token = env.FANTASY402_JWT_TOKEN;

    if (!token) {
        throw new Error('FANTASY402_JWT_TOKEN environment variable is required');
    }

    return new Fantasy402Client({ jwtToken: token });
}

/**
 * Generate cache-busted URL
 * 
 * Adds a ?v= timestamp parameter to force browser to fetch latest version
 * 
 * @example
 * const url = cacheBustURL('https://fantasy402.com/manager.html');
 * // Returns: https://fantasy402.com/manager.html?v=1759902256518
 */
export function cacheBustURL(url: string): string {
    const timestamp = Date.now();
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}v=${timestamp}`;
}

/**
 * Parse cache-bust version from URL
 * 
 * @example
 * const version = getCacheBustVersion('https://fantasy402.com/manager.html?v=1759902256518');
 * // Returns: 1759902256518
 */
export function getCacheBustVersion(url: string): number | null {
    const match = url.match(/[?&]v=(\d+)/);
    return match ? parseInt(match[1], 10) : null;
}

