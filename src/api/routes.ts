/**
 * REST API Routes
 * Provides easy-to-use REST endpoints on top of MCP infrastructure
 */

import { Env } from '../types/api';
import { validateQueryParams, Validators, validationErrorResponse } from '../utils/validation';
import { createErrorResponse, Errors, validateEnv } from '../utils/error-handler';
import { getBettingExposure } from '../tools/intelligence/getBettingExposure';
import { getCLV } from '../tools/intelligence/getCLV';
import { getSharpScore } from '../tools/intelligence/getSharpScore';
import { getHoldPercentage } from '../tools/intelligence/getHoldPercentage';
import { handleFantasy402Ingest } from './fantasy402-ingest';
import { getAgentPerformance, getSportPerformance, getPerformanceSummary } from './fantasy402-performance-api';
import { getLiveBets } from '../routes/api/f402-bets';
import { getAgentPerformance as getF402AgentPerformance, getAgentList, getAgentDetail, getAgentTree, getCacheMetrics } from '../routes/api/f402-agents';
import { warmCache } from '../routes/api/cache-warm';
import { getActiveCustomers, getStakedTotal } from '../routes/api/f402-customers';
import { getLatestTransactions } from '../routes/api/f402-transactions';
import { getMissionControl } from '../routes/api/f402-mission-control';
import { getAgentGraph } from '../routes/api/f402-graph';

/**
 * Handle REST API routes
 */
export async function handleAPIRoute(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const requestId = Date.now().toString(36);
  const url = new URL(request.url);
  const path = url.pathname.replace('/api', '');

  console.log(`[${requestId}] 📡 API Request: ${request.method} ${path}`);

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Route to specific endpoint
    switch (path) {
      case '/events':
        return await getEvents(request, env, requestId);

      case '/exposure':
        return await getExposureAPI(request, env, requestId);

      case '/sharp-customers':
        return await getSharpCustomers(request, env, requestId);

      case '/steam-moves':
        return await getSteamMovesAPI(request, env, requestId);

      case '/clv':
        return await getCLVAPI(request, env, requestId);

      case '/hold':
        return await getHoldAPI(request, env, requestId);

      case '/markets':
        return await getMarkets(request, env, requestId);

      case '/customers':
        return await getCustomers(request, env, requestId);

      case '/stats':
        return await getStats(request, env, requestId);

      case '/fantasy402/ingest':
        return await handleFantasy402Ingest(request, env, requestId);

      case '/fantasy402/performance':
        return await getAgentPerformance(request, env, requestId);

      case '/fantasy402/sport-performance':
        return await getSportPerformance(request, env, requestId);

      case '/fantasy402/summary':
        return await getPerformanceSummary(request, env, requestId);

      case '/fantasy402/config':
        const { getFantasy402Config } = await import('./fantasy402-config');
        return await getFantasy402Config(request, env, requestId);

      // Fantasy402 Mission Control endpoints
      case '/f402/mission-control':
        return await getMissionControl(request, env, requestId);

      case '/f402/bets/live':
        return await getLiveBets(request, env, requestId);

      case '/f402/agents/performance':
        return await getF402AgentPerformance(request, env, requestId);

      case '/f402/agents/list':
        return await getAgentList(request, env, requestId);

      case '/f402/agents/tree':
        return await getAgentTree(request, env, requestId);

      case '/f402/agents/sync':
        if (request.method !== 'POST') {
          throw Errors.validationError(['Method must be POST']);
        }
        const { syncAgents } = await import('../routes/api/f402-agents');
        return await syncAgents(request, env, ctx);

      case '/f402/cache/metrics':
        return await getCacheMetrics(request, env, requestId);

      case '/f402/cache/warm':
        if (request.method !== 'POST') {
          throw Errors.validationError(['Method must be POST']);
        }
        return await warmCache(request, env, requestId);

      case '/f402/customers/active':
        return await getActiveCustomers(request, env, requestId);

      // ========== SERVER-SENT EVENTS (SSE) STREAMS ==========
      // Real-time data streams for live dashboards

      case '/f402/agents/stream':
        const { createHierarchyStream } = await import('./sse-streams');
        return await createHierarchyStream(env);

      case '/health/stream':
        const { createHealthStream } = await import('./sse-streams');
        return await createHealthStream(env);

      case '/f402/bets/stream':
        const { createBetsStream } = await import('./sse-streams');
        return await createBetsStream(env);

      case '/streams/stats':
        const { getStreamStats } = await import('./sse-streams');
        return new Response(JSON.stringify(getStreamStats()), {
          headers: corsHeaders,
        });

      case '/f402/customers/staked':
        return await getStakedTotal(request, env, requestId);

      case '/f402/transactions/latest':
        return await getLatestTransactions(request, env, requestId);

      case '/f402/graph':
        return await getAgentGraph(request, env, requestId);

      case '/live-odds':
        const { getLiveOdds } = await import('../routes/api/live-odds');
        return await getLiveOdds(request, env, requestId);

      case '/live-scores':
        const { getLiveScores } = await import('../routes/api/live-scores');
        return await getLiveScores(request, env, requestId);

      case '/database/metrics':
        const { getDatabaseMetrics } = await import('../routes/api/database-metrics');
        return await getDatabaseMetrics(request, env, requestId);

      case '/analytics/metrics':
        const { getAnalyticsMetrics } = await import('../routes/api/analytics-metrics');
        return await getAnalyticsMetrics(request, env, requestId);

      case '/activity':
        const { getActivity } = await import('../routes/api/activity');
        return await getActivity(request, env, requestId);

      case '/player-analysis':
        const { getPlayerAnalysis } = await import('../routes/api/player-analysis');
        return await getPlayerAnalysis(request, env, requestId);

      case '/transaction-history':
        const { getTransactionHistory } = await import('../routes/api/transaction-history');
        return await getTransactionHistory(request, env, requestId);

      case '/new-users':
        const { getNewUsers } = await import('../routes/api/new-users');
        return await getNewUsers(request, env, requestId);

      default:
        // Check if it's an agent detail request (/f402/agents/:agentID)
        const agentDetailMatch = path.match(/^\/f402\/agents\/([a-zA-Z0-9_-]+)$/);
        if (agentDetailMatch) {
          const agentID = agentDetailMatch[1];
          return await getAgentDetail(request, env, requestId, agentID);
        }

        throw Errors.notFound('API endpoint');
    }
  } catch (error) {
    return createErrorResponse(error, requestId, path);
  }
}

/**
 * GET /api/events - List all active events
 */
async function getEvents(request: Request, env: Env, requestId: string): Promise<Response> {
  validateEnv(env, ['ANALYTICS']);

  const url = new URL(request.url);
  const validation = validateQueryParams(url, [
    Validators.sport(),
    Validators.limit(500),
    Validators.offset()
  ]);

  if (!validation.valid) {
    return validationErrorResponse(validation.errors, requestId);
  }

  const { sport, limit = 100, offset = 0 } = validation.sanitized!;

  let query = `
    SELECT DISTINCT 
      lm.eid as eventID,
      MAX(lm.ts) as lastUpdate,
      COUNT(DISTINCT lm.mt) as marketCount
    FROM line_movements lm
    WHERE lm.ing > datetime('now', '-24 hours')
  `;

  const params: any[] = [];

  if (sport) {
    query += ` AND lm.eid LIKE ?`;
    params.push(`${sport.toLowerCase()}%`);
  }

  query += `
    GROUP BY lm.eid
    ORDER BY MAX(lm.ts) DESC
    LIMIT ? OFFSET ?
  `;

  params.push(limit, offset);

  const result = await env.ANALYTICS.prepare(query).bind(...params).all();
  const events = result.results as unknown as Array<{
    eventID: string;
    lastUpdate: string;
    marketCount: number;
  }>;

  console.log(`[${requestId}] ✅ Found ${events.length} events`);

  return new Response(JSON.stringify({
    events,
    total: events.length,
    limit,
    offset,
    requestId,
    timestamp: new Date().toISOString()
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

/**
 * GET /api/exposure - Real-time exposure data
 */
async function getExposureAPI(request: Request, env: Env, requestId: string): Promise<Response> {
  const url = new URL(request.url);
  const validation = validateQueryParams(url, [
    Validators.agentID(),
    Validators.eventID(),
    Validators.sport(),
    Validators.exposureLevel()
  ]);

  if (!validation.valid) {
    return validationErrorResponse(validation.errors, requestId);
  }

  // Forward to intelligence tool
  const toolRequest = new Request(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(validation.sanitized)
  });

  return await getBettingExposure(toolRequest, env);
}

/**
 * GET /api/sharp-customers - List sharp customers
 */
async function getSharpCustomers(request: Request, env: Env, requestId: string): Promise<Response> {
  const url = new URL(request.url);
  const validation = validateQueryParams(url, [
    Validators.agentID(),
    Validators.threshold(0, 100),
    Validators.limit(100)
  ]);

  if (!validation.valid) {
    return validationErrorResponse(validation.errors, requestId);
  }

  const { agentID, threshold = 60, limit = 50 } = validation.sanitized!;

  // Forward to intelligence tool
  const toolRequest = new Request(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentID, minScore: threshold, limit })
  });

  return await getSharpScore(toolRequest, env);
}

/**
 * GET /api/steam-moves - Recent steam moves
 */
async function getSteamMovesAPI(request: Request, env: Env, requestId: string): Promise<Response> {
  validateEnv(env, ['ANALYTICS']);

  const url = new URL(request.url);
  const validation = validateQueryParams(url, [
    Validators.eventID(),
    Validators.marketType(),
    Validators.limit(100)
  ]);

  if (!validation.valid) {
    return validationErrorResponse(validation.errors, requestId);
  }

  const { eventID, marketType, limit = 50 } = validation.sanitized!;

  let query = `
    SELECT 
      sd.eid as eventID,
      sd.mt as marketType,
      sd.ts as timestamp
    FROM steam_dedupe sd
    WHERE sd.ts > datetime('now', '-1 hour')
  `;

  const params: any[] = [];

  if (eventID) {
    query += ` AND sd.eid = ?`;
    params.push(eventID);
  }

  if (marketType) {
    query += ` AND sd.mt = ?`;
    params.push(marketType);
  }

  query += ` ORDER BY sd.ts DESC LIMIT ?`;
  params.push(limit);

  const result = await env.ANALYTICS.prepare(query).bind(...params).all();
  const steamMoves = result.results as unknown as Array<{
    eventID: string;
    marketType: string;
    timestamp: string;
  }>;

  console.log(`[${requestId}] ✅ Found ${steamMoves.length} steam moves`);

  return new Response(JSON.stringify({
    steamMoves,
    total: steamMoves.length,
    requestId,
    timestamp: new Date().toISOString()
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

/**
 * GET /api/clv - CLV analysis
 */
async function getCLVAPI(request: Request, env: Env, requestId: string): Promise<Response> {
  const url = new URL(request.url);
  const validation = validateQueryParams(url, [
    Validators.agentID(),
    Validators.customerID(),
    Validators.date('startDate'),
    Validators.date('endDate'),
    Validators.threshold(-100, 100)
  ]);

  if (!validation.valid) {
    return validationErrorResponse(validation.errors, requestId);
  }

  // Forward to intelligence tool
  const toolRequest = new Request(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(validation.sanitized)
  });

  return await getCLV(toolRequest, env);
}

/**
 * GET /api/hold - Hold percentage analysis
 */
async function getHoldAPI(request: Request, env: Env, requestId: string): Promise<Response> {
  const url = new URL(request.url);
  const validation = validateQueryParams(url, [
    Validators.agentID(),
    Validators.eventID(),
    Validators.marketType(true),
    Validators.date('startDate'),
    Validators.date('endDate')
  ]);

  if (!validation.valid) {
    return validationErrorResponse(validation.errors, requestId);
  }

  // Forward to intelligence tool
  const toolRequest = new Request(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(validation.sanitized)
  });

  return await getHoldPercentage(toolRequest, env);
}

/**
 * GET /api/markets - List markets for events
 */
async function getMarkets(request: Request, env: Env, requestId: string): Promise<Response> {
  validateEnv(env, ['ANALYTICS']);

  const url = new URL(request.url);
  const validation = validateQueryParams(url, [
    Validators.eventID(),
    Validators.marketType()
  ]);

  if (!validation.valid) {
    return validationErrorResponse(validation.errors, requestId);
  }

  const { eventID, marketType } = validation.sanitized!;

  let query = `
    SELECT DISTINCT 
      lm.mt as marketType,
      COUNT(*) as updateCount,
      MAX(lm.ts) as lastUpdate
    FROM line_movements lm
    WHERE lm.ing > datetime('now', '-24 hours')
  `;

  const params: any[] = [];

  if (eventID) {
    query += ` AND lm.eid = ?`;
    params.push(eventID);
  }

  if (marketType) {
    query += ` AND lm.mt = ?`;
    params.push(marketType);
  }

  query += ` GROUP BY lm.mt ORDER BY updateCount DESC`;

  const result = await env.ANALYTICS.prepare(query).bind(...params).all();
  const markets = result.results as unknown as Array<{
    marketType: string;
    updateCount: number;
    lastUpdate: string;
  }>;

  console.log(`[${requestId}] ✅ Found ${markets.length} markets`);

  return new Response(JSON.stringify({
    markets,
    total: markets.length,
    requestId,
    timestamp: new Date().toISOString()
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

/**
 * GET /api/customers - Customer analytics
 */
async function getCustomers(request: Request, env: Env, requestId: string): Promise<Response> {
  validateEnv(env, ['ANALYTICS']);

  const url = new URL(request.url);
  const validation = validateQueryParams(url, [
    Validators.agentID(),
    Validators.limit(500)
  ]);

  if (!validation.valid) {
    return validationErrorResponse(validation.errors, requestId);
  }

  const { agentID, limit = 100 } = validation.sanitized!;

  const result = await env.ANALYTICS.prepare(`
    SELECT 
      si.cid as customerID,
      si.clv as CLV,
      si.wr as winRate,
      si.ao as actionCount,
      si.nb as netBets,
      si.upd as lastUpdate
    FROM sharp_indicators si
    WHERE si.upd > datetime('now', '-7 days')
    ORDER BY si.ao DESC
    LIMIT ?
  `).bind(limit).all();

  const customers = result.results as unknown as Array<{
    customerID: string;
    CLV: number;
    winRate: number;
    actionCount: number;
    netBets: number;
    lastUpdate: string;
  }>;

  console.log(`[${requestId}] ✅ Found ${customers.length} customers`);

  return new Response(JSON.stringify({
    customers,
    total: customers.length,
    agentID,
    requestId,
    timestamp: new Date().toISOString()
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

/**
 * GET /api/stats - System statistics
 */
async function getStats(request: Request, env: Env, requestId: string): Promise<Response> {
  validateEnv(env, ['ANALYTICS', 'BET_TICKER_RAW']);

  const [lineMovements, steamMoves, sharpCustomers, kvRecords] = await Promise.all([
    env.ANALYTICS.prepare(`
      SELECT COUNT(*) as count
      FROM line_movements
      WHERE ing > datetime('now', '-24 hours')
    `).first(),

    env.ANALYTICS.prepare(`
      SELECT COUNT(*) as count
      FROM steam_dedupe
      WHERE ts > datetime('now', '-1 hour')
    `).first(),

    env.ANALYTICS.prepare(`
      SELECT COUNT(*) as count
      FROM sharp_indicators
      WHERE upd > datetime('now', '-7 days')
    `).first(),

    env.BET_TICKER_RAW.list({ limit: 1000 })
  ]);

  const stats = {
    lineMovements: {
      last24Hours: (lineMovements as any)?.count || 0
    },
    steamMoves: {
      lastHour: (steamMoves as any)?.count || 0
    },
    customers: {
      activeLastWeek: (sharpCustomers as any)?.count || 0
    },
    storage: {
      kvRecords: kvRecords.keys.length,
      kvSizeEstimate: `${(kvRecords.keys.length * 10 / 1024).toFixed(2)} KB`
    },
    system: {
      version: '3.0.0',
      uptime: 'N/A (Cloudflare Workers)',
      requestId
    },
    timestamp: new Date().toISOString()
  };

  console.log(`[${requestId}] ✅ System stats retrieved`);

  return new Response(JSON.stringify(stats), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

