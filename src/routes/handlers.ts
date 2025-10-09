/**
 * Core Request Handlers
 * Extracted from index.ts for better organization
 */

import type { Env } from '../types/api';
import { CORS_HEADERS } from '../utils/request';
import { getBettingExposure } from '../tools/intelligence/getBettingExposure';
import { getSharpScore } from '../tools/intelligence/getSharpScore';
import { getHoldPercentage } from '../tools/intelligence/getHoldPercentage';
import { getCLV } from '../tools/intelligence/getCLV';
import { getBetTickerHistory, getBetTickerResponse } from '../interceptors/bet-ticker-sniffer';

export async function handleMCPTools(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace('/tools/', '');

  // Route to appropriate tool handler
  switch (path) {
    case 'getBettingExposure':
      return getBettingExposure(request, env);
    case 'getSharpScore':
      return getSharpScore(request, env);
    case 'getHoldPercentage':
      return getHoldPercentage(request, env);
    case 'getCLV':
      return getCLV(request, env);
    default:
      return new Response(JSON.stringify({ error: 'Tool not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
  }
}

// Diagnostics handler
export async function handleDiagnostics(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {

  try {
    const diagnostics = {
      timestamp: new Date(Date.now()).toISOString(),
      worker: {
        version: '3.0.0',
        environment: env.ANALYTICS ? 'production' : 'development',
        bindings: {
          analytics: !!env.ANALYTICS,
          betTickerRaw: !!env.BET_TICKER_RAW,
          lineIngress: !!env.LINE_INGRESS,
          steamWebhook: !!env.STEAM_WEBHOOK,
          analyticsEngine: !!env.ANALYTICS_ENGINE
        }
      },
      kv: {
        available: !!env.BET_TICKER_RAW,
        status: 'unknown' as string,
        error: undefined as string | undefined
      },
      lastChecks: {
        timestamp: new Date(Date.now()).toISOString(),
        health: '/health',
        interceptor: '/interceptor/history?limit=1'
      }
    };

    // Check KV status
    if (env.BET_TICKER_RAW) {
      try {
        const testKey = `diagnostic:test:${Date.now()}`;
        await env.BET_TICKER_RAW.put(testKey, 'test', { expirationTtl: 60 });
        await env.BET_TICKER_RAW.delete(testKey);
        diagnostics.kv.status = 'healthy';
      } catch (error) {
        diagnostics.kv.status = 'error';
        diagnostics.kv.error = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    return new Response(JSON.stringify(diagnostics, null, 2), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Diagnostics error:', error);
    return new Response(JSON.stringify({
      error: 'Diagnostics failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
}

// Logs handler
export async function handleLogs(request: Request, env: Env): Promise<Response> {

  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const level = url.searchParams.get('level') || 'all';

    // Since we can't access actual console logs in Workers, we'll provide recent activity
    if (!env.BET_TICKER_RAW) {
      return new Response(JSON.stringify({
        error: 'KV storage not available for log retrieval'
      }), {
        status: 503,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    // Get recent BetTicker activity as a proxy for logs
    const history = await getBetTickerHistory(env as BetTickerSnifferEnv, { limit });

    const logs = history.map(record => ({
      timestamp: record.metadata.timestamp,
      level: 'info',
      message: `BetTicker intercepted: ${record.key}`,
      metadata: {
        status: record.metadata.status,
        ip: record.metadata.ip,
        userAgent: record.metadata.userAgent,
        contentLength: record.metadata.contentLength
      }
    }));

    // Add system logs
    const systemLogs = [
      {
        timestamp: new Date(Date.now()).toISOString(),
        level: 'info',
        message: 'Worker logs endpoint accessed',
        metadata: {
          endpoint: '/logs',
          limit: limit,
          totalRecords: logs.length
        }
      }
    ];

    const allLogs = [...systemLogs, ...logs].slice(0, limit);

    return new Response(JSON.stringify({
      logs: allLogs,
      total: allLogs.length,
      limit: limit,
      level: level
    }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Logs error:', error);
    return new Response(JSON.stringify({
      error: 'Log retrieval failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
}

// System status handler
export async function handleSystemStatus(request: Request, env: Env): Promise<Response> {

  try {
    const now = Date.now();
    const status: any = {
      timestamp: new Date(Date.now()).toISOString(),
      uptime: 'N/A', // Workers don't have traditional uptime
      memory: {
        used: 'N/A',
        limit: '128MB' // Workers memory limit
      },
      cpu: {
        usage: 'N/A',
        limit: '50ms' // Workers CPU limit
      },
      requests: {
        total: 'N/A',
        recent: 'N/A'
      },
      errors: {
        total: 'N/A',
        recent: 'N/A'
      },
      kv: {
        status: 'unknown' as string,
        records: 0,
        lastWrite: null as string | null,
        error: undefined as string | undefined
      },
      health: 'unknown' as string
    };

    // Check KV status and get recent activity
    if (env.BET_TICKER_RAW) {
      try {
        const history = await getBetTickerHistory(env as BetTickerSnifferEnv, { limit: 100 });
        status.kv.records = history.length;

        if (history.length > 0) {
          const timestamps = history.map(r => parseInt(r.key.split(':')[2]));
          const latestTimestamp = Math.max(...timestamps);
          status.kv.lastWrite = new Date(latestTimestamp).toISOString();

          // Determine data freshness
          const ageMinutes = Math.floor((now - latestTimestamp) / 60000);
          if (ageMinutes < 5) {
            status.kv.status = 'fresh';
            status.health = 'healthy';
          } else if (ageMinutes < 60) {
            status.kv.status = 'stale';
            status.health = 'warning';
          } else {
            status.kv.status = 'old';
            status.health = 'degraded';
          }
        } else {
          status.kv.status = 'empty';
          status.health = 'warning';
        }
      } catch (error) {
        status.kv.status = 'error';
        status.health = 'unhealthy';
        status.kv.error = error instanceof Error ? error.message : 'Unknown error';
      }
    } else {
      status.kv.status = 'not_configured';
      status.health = 'degraded';
    }

    // Add worker configuration info
    status.config = {
      version: '3.0.0',
      environment: env.ANALYTICS ? 'production' : 'development',
      bindings: {
        analytics: !!env.ANALYTICS,
        betTickerRaw: !!env.BET_TICKER_RAW,
        lineIngress: !!env.LINE_INGRESS,
        steamWebhook: !!env.STEAM_WEBHOOK,
        analyticsEngine: !!env.ANALYTICS_ENGINE
      }
    };

    return new Response(JSON.stringify(status, null, 2), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('System status error:', error);
    return new Response(JSON.stringify({
      error: 'System status check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
}

// Interceptor API handler (for analysis/debugging)
export async function handleInterceptorAPI(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {

  if (!env.BET_TICKER_RAW) {
    return new Response(JSON.stringify({
      error: 'BetTicker interception not configured'
    }), {
      status: 503,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }

  const url = new URL(request.url);
  const path = url.pathname.replace('/interceptor/', '');

  try {
    switch (path) {
      case 'history': {
        // GET /interceptor/history?limit=100&startTime=...&endTime=...
        const limit = parseInt(url.searchParams.get('limit') || '100');
        const startTime = url.searchParams.get('startTime')
          ? parseInt(url.searchParams.get('startTime')!)
          : undefined;
        const endTime = url.searchParams.get('endTime')
          ? parseInt(url.searchParams.get('endTime')!)
          : undefined;

        const history = await getBetTickerHistory(env as BetTickerSnifferEnv, {
          limit,
          startTime,
          endTime,
        });

        return new Response(JSON.stringify(history), {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
      }

      case 'response': {
        // GET /interceptor/response?key=raw:getBetTicker:1234567890
        const key = url.searchParams.get('key');
        if (!key) {
          return new Response(JSON.stringify({ error: 'Missing key parameter' }), {
            status: 400,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
          });
        }

        const response = await getBetTickerResponse(env as BetTickerSnifferEnv, key);
        if (!response) {
          return new Response(JSON.stringify({ error: 'Response not found' }), {
            status: 404,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify(response), {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid interceptor endpoint' }), {
          status: 404,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('Interceptor API error:', error);
    return new Response(JSON.stringify({
      error: 'Internal error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  }
};
