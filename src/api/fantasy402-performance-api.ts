// Fantasy402 Performance API Endpoints
// Query endpoints for agent performance data

import { Errors, createErrorResponse } from '../utils/error-handler';
import { CORS_HEADERS } from '../utils/request';
import type { Env } from '../types/cloudflare';

/**
 * Get agent performance history
 * Query params: agentID, period (7, 30, 90, or 'all')
 */
export async function getAgentPerformance(
    request: Request,
    env: Env,
    requestId: string
): Promise<Response> {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    try {
        const url = new URL(request.url);
        const agentID = url.searchParams.get('agentID') || 'BILLY666';
        const period = url.searchParams.get('period') || '30';

        console.log(`[${requestId}] 📊 Fetching performance for agent: ${agentID}, period: ${period} days`);

        if (!env.RAW_FEED_DB) {
            throw Errors.serviceUnavailable('Database not available');
        }

        // Build date filter
        // Build query with proper parameterization
        let query = `
            SELECT 
                agent_id,
                agent_owner,
                period_start,
                period_end,
                period_type,
                total_risk,
                total_win,
                total_commission,
                net_income,
                total_wagers,
                pending_wagers,
                settled_wagers,
                free_play_used,
                free_play_win,
                captured_at
            FROM fantasy402_agent_performance
            WHERE agent_id = ?
        `;

        let bindParams: any[] = [agentID];

        if (period !== 'all') {
            const daysAgo = parseInt(period);
            query += ` AND captured_at >= datetime('now', '-${daysAgo} days')`;
        }

        query += ` ORDER BY captured_at DESC LIMIT 100`;

        // Query performance data
        const result = await env.RAW_FEED_DB.prepare(query).bind(...bindParams).all();

        const performance = result.results as unknown as Array<{
            agent_id: string;
            agent_owner: string;
            period_start: string;
            period_end: string;
            period_type: string;
            total_risk: number;
            total_win: number;
            total_commission: number;
            net_income: number;
            total_wagers: number;
            pending_wagers: number;
            settled_wagers: number;
            free_play_used: number;
            free_play_win: number;
            captured_at: string;
        }>;

        console.log(`[${requestId}] ✅ Found ${performance.length} performance reports`);

        return new Response(JSON.stringify({
            success: true,
            agentID,
            period,
            count: performance.length,
            performance,
            requestId,
            timestamp: new Date().toISOString()
        }), {
            headers: corsHeaders
        });

    } catch (error) {
        return createErrorResponse(error, requestId, '/api/fantasy402/performance');
    }
}

/**
 * Get sport-specific performance breakdown
 * Query params: agentID, period (7, 30, 90, or 'all')
 */
export async function getSportPerformance(
    request: Request,
    env: Env,
    requestId: string
): Promise<Response> {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    try {
        const url = new URL(request.url);
        const agentID = url.searchParams.get('agentID') || 'BILLY666';
        const period = url.searchParams.get('period') || '30';

        console.log(`[${requestId}] 🏈 Fetching sport performance for agent: ${agentID}`);

        if (!env.RAW_FEED_DB) {
            throw Errors.serviceUnavailable('Database not available');
        }

        // Build query with proper parameterization
        let query = `
            SELECT 
                sport,
                SUM(risk) as total_risk,
                SUM(win) as total_win,
                SUM(wager_count) as total_wagers,
                ROUND(SUM(win) * 100.0 / NULLIF(SUM(risk), 0), 2) as win_percentage,
                COUNT(*) as report_count
            FROM fantasy402_sport_performance
            WHERE agent_id = ?
        `;

        let bindParams: any[] = [agentID];

        if (period !== 'all') {
            const daysAgo = parseInt(period);
            query += ` AND captured_at >= datetime('now', '-${daysAgo} days')`;
        }

        query += ` GROUP BY sport ORDER BY total_risk DESC`;

        // Query sport breakdown
        const result = await env.RAW_FEED_DB.prepare(query).bind(...bindParams).all();

        const sports = result.results as unknown as Array<{
            sport: string;
            total_risk: number;
            total_win: number;
            total_wagers: number;
            win_percentage: number;
            report_count: number;
        }>;

        console.log(`[${requestId}] ✅ Found ${sports.length} sports`);

        return new Response(JSON.stringify({
            success: true,
            agentID,
            period,
            count: sports.length,
            sports,
            requestId,
            timestamp: new Date().toISOString()
        }), {
            headers: corsHeaders
        });

    } catch (error) {
        return createErrorResponse(error, requestId, '/api/fantasy402/sport-performance');
    }
}

/**
 * Get performance summary (from view)
 * Query params: agentID
 */
export async function getPerformanceSummary(
    request: Request,
    env: Env,
    requestId: string
): Promise<Response> {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    try {
        const url = new URL(request.url);
        const agentID = url.searchParams.get('agentID') || 'BILLY666';

        console.log(`[${requestId}] 📈 Fetching summary for agent: ${agentID}`);

        if (!env.RAW_FEED_DB) {
            throw Errors.serviceUnavailable('Database not available');
        }

        // Query summary view
        const result = await env.RAW_FEED_DB.prepare(`
            SELECT * FROM v_agent_performance_summary
            WHERE agent_id = ?
        `).bind(agentID).first();

        if (!result) {
            throw Errors.notFound('Agent performance summary');
        }

        const summary = result as unknown as {
            agent_id: string;
            agent_owner: string;
            total_reports: number;
            lifetime_risk: number;
            lifetime_win: number;
            lifetime_commission: number;
            lifetime_net_income: number;
            lifetime_wagers: number;
            first_period: string;
            last_period: string;
            last_captured: string;
        };

        console.log(`[${requestId}] ✅ Found summary: ${summary.total_reports} reports`);

        return new Response(JSON.stringify({
            success: true,
            agentID,
            summary,
            requestId,
            timestamp: new Date().toISOString()
        }), {
            headers: corsHeaders
        });

    } catch (error) {
        return createErrorResponse(error, requestId, '/api/fantasy402/summary');
    }
}

