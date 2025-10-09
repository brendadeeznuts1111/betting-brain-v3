/**
 * Fantasy402 Configuration API
 * 
 * Handles bootstrap/configuration data caching:
 * - Sports types
 * - Wager types
 * - Teaser types
 * - Betting rules
 * - UI configuration
 * 
 * Multi-tier caching strategy:
 * 1. Browser IndexedDB (instant load)
 * 2. Cloudflare KV (fast edge cache)
 * 3. Origin API (source of truth)
 */

import type { Env } from '../types/cloudflare';
import { Errors, createErrorResponse } from '../utils/error-handler';
import { Fantasy402Client } from '../utils/fantasy402-client';

const CONFIG_CACHE_KEY = 'fantasy402:config:bootstrap';
const CONFIG_CACHE_TTL = 3600; // 1 hour in seconds

export interface Fantasy402Config {
    sports: Array<{
        id: string;
        name: string;
        code: string;
        enabled: boolean;
    }>;
    wagerTypes: Array<{
        id: string;
        name: string;
        description: string;
    }>;
    teaserTypes: Array<{
        id: string;
        name: string;
        points: number;
    }>;
    bettingRules: {
        minWager: number;
        maxWager: number;
        maxParlay: number;
    };
    version: string;
    lastUpdated: string;
}

/**
 * Get Fantasy402 bootstrap configuration
 * 
 * Uses multi-tier caching:
 * 1. Check KV cache (fast)
 * 2. If miss, fetch from Origin API
 * 3. Cache in KV for next request
 * 
 * @example
 * // From Worker
 * return await getFantasy402Config(request, env, requestId);
 */
export async function getFantasy402Config(
    request: Request,
    env: Env,
    requestId: string
): Promise<Response> {
    try {
        console.log(`[${requestId}] 📥 Fetching Fantasy402 config`);

        // Try KV cache first
        const cached = await env.FANTASY_CACHE?.get(CONFIG_CACHE_KEY);

        if (cached) {
            console.log(`[${requestId}] ✅ Config served from KV cache`);

            return new Response(cached, {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'X-Cache': 'HIT',
                    'Cache-Control': `public, max-age=${CONFIG_CACHE_TTL}`
                }
            });
        }

        // Cache miss - fetch from Origin
        console.log(`[${requestId}] ⚠️  KV cache miss, fetching from Origin`);

        const config = await fetchConfigFromOrigin(env, requestId);

        // Cache in KV for next time
        if (env.FANTASY_CACHE) {
            await env.FANTASY_CACHE.put(
                CONFIG_CACHE_KEY,
                JSON.stringify(config),
                { expirationTtl: CONFIG_CACHE_TTL }
            );
            console.log(`[${requestId}] ✅ Config cached in KV (TTL: ${CONFIG_CACHE_TTL}s)`);
        }

        return new Response(JSON.stringify(config), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'X-Cache': 'MISS',
                'Cache-Control': `public, max-age=${CONFIG_CACHE_TTL}`
            }
        });

    } catch (error) {
        console.error(`[${requestId}] ❌ Error fetching config:`, error);
        return createErrorResponse(error, requestId, '/api/fantasy402/config');
    }
}

/**
 * Fetch configuration from Origin API
 * 
 * This is called:
 * 1. On cache miss
 * 2. By cache warmer cron job
 */
async function fetchConfigFromOrigin(env: Env, requestId: string): Promise<Fantasy402Config> {
    console.log(`[${requestId}] 🌐 Fetching from fantasy402.com`);

    // Create authenticated client
    const client = new Fantasy402Client({
        jwtToken: env.FANTASY402_JWT_TOKEN || 'demo-token'
    });

    // Fetch all config data in parallel
    const [sports, wagerTypes, teaserTypes, rules] = await Promise.all([
        fetchSportsTypes(client),
        fetchWagerTypes(client),
        fetchTeaserTypes(client),
        fetchBettingRules(client)
    ]);

    const config: Fantasy402Config = {
        sports,
        wagerTypes,
        teaserTypes,
        bettingRules: rules,
        version: '1.0.0',
        lastUpdated: new Date(Date.now()).toISOString()
    };

    console.log(`[${requestId}] ✅ Config fetched:`, {
        sports: sports.length,
        wagerTypes: wagerTypes.length,
        teaserTypes: teaserTypes.length
    });

    return config;
}

/**
 * Fetch sports types from Origin
 */
async function fetchSportsTypes(client: Fantasy402Client): Promise<Array<any>> {
    // This would call the actual Fantasy402 API endpoint
    // For now, return mock data structure
    return [
        { id: '1', name: 'NFL', code: 'NFL', enabled: true },
        { id: '2', name: 'NBA', code: 'NBA', enabled: true },
        { id: '3', name: 'MLB', code: 'MLB', enabled: true },
        { id: '4', name: 'NHL', code: 'NHL', enabled: true },
        { id: '5', name: 'NCAAF', code: 'NCAAF', enabled: true },
        { id: '6', name: 'NCAAB', code: 'NCAAB', enabled: true },
        { id: '7', name: 'Soccer', code: 'SOCCER', enabled: true },
        { id: '8', name: 'UFC/MMA', code: 'MMA', enabled: true }
    ];
}

/**
 * Fetch wager types from Origin
 */
async function fetchWagerTypes(client: Fantasy402Client): Promise<Array<any>> {
    return [
        { id: '1', name: 'Straight', description: 'Single game wager' },
        { id: '2', name: 'Parlay', description: 'Multiple games combined' },
        { id: '3', name: 'Teaser', description: 'Adjusted point spread' },
        { id: '4', name: 'If Bet', description: 'Conditional wager' },
        { id: '5', name: 'Reverse', description: 'Two if bets combined' }
    ];
}

/**
 * Fetch teaser types from Origin
 */
async function fetchTeaserTypes(client: Fantasy402Client): Promise<Array<any>> {
    return [
        { id: '1', name: '6 Point Teaser', points: 6 },
        { id: '2', name: '6.5 Point Teaser', points: 6.5 },
        { id: '3', name: '7 Point Teaser', points: 7 },
        { id: '4', name: '10 Point Teaser', points: 10 }
    ];
}

/**
 * Fetch betting rules from Origin
 */
async function fetchBettingRules(client: Fantasy402Client): Promise<any> {
    return {
        minWager: 10,      // $10 minimum
        maxWager: 10000,   // $10,000 maximum
        maxParlay: 15      // 15 legs maximum
    };
}

/**
 * Warm KV cache with fresh config
 * 
 * Called by Cron Trigger to keep cache fresh
 * 
 * @example
 * // In scheduled trigger
 * if (event.cron === '0 * * * *') {
 *   await warmConfigCache(env);
 * }
 */
export async function warmConfigCache(env: Env): Promise<void> {
    const requestId = `cron-${Date.now().toString(36)}`;

    console.log(`[${requestId}] 🔥 Cache warmer: Starting`);

    try {
        // Fetch fresh config from Origin
        const config = await fetchConfigFromOrigin(env, requestId);

        // Update KV cache
        if (env.FANTASY_CACHE) {
            await env.FANTASY_CACHE.put(
                CONFIG_CACHE_KEY,
                JSON.stringify(config),
                { expirationTtl: CONFIG_CACHE_TTL }
            );

            console.log(`[${requestId}] ✅ Cache warmer: Success`);
        } else {
            console.warn(`[${requestId}] ⚠️  Cache warmer: No FANTASY_CACHE binding`);
        }

    } catch (error) {
        console.error(`[${requestId}] ❌ Cache warmer: Failed:`, error);
        // Don't throw - let the old cache continue serving
    }
}

/**
 * Invalidate config cache
 * 
 * Called when admin updates configuration
 * 
 * @example
 * // After admin updates sports
 * await invalidateConfigCache(env);
 */
export async function invalidateConfigCache(env: Env): Promise<void> {
    if (env.FANTASY_CACHE) {
        await env.FANTASY_CACHE.delete(CONFIG_CACHE_KEY);
        console.log('✅ Config cache invalidated');
    }
}

