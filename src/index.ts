/**
 * 🧠 Betting-Brain v3 - Main Entry Point
 * 
 * Edge-native betting intelligence layer with zero-downtime deployment
 * Runs entirely on Cloudflare Edge (D1, Workers, Queues, Analytics Engine)
 */

import { Env, BetTickerSnifferEnv, MCPEnv } from './types/api';
import { handleLineIngress } from './queues/lineIngress';
import { handleSteamWebhook } from './queues/steamWebhook';
import { handleSharpCalculation } from './schedules/sharpCalc';
import { handleExposureCalculation } from './schedules/exposureCalc';
import { getBettingExposure } from './tools/intelligence/getBettingExposure';
import { getSharpScore } from './tools/intelligence/getSharpScore';
import { getHoldPercentage } from './tools/intelligence/getHoldPercentage';
import { getCLV } from './tools/intelligence/getCLV';
import { handleBetTickerInterception, getBetTickerHistory, getBetTickerResponse } from './interceptors/bet-ticker-sniffer';
import { handleMCPRequest } from './mcp/server';
import { handleAPIRoute } from './api/routes';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const requestId = Date.now().toString(36);
    const url = new URL(request.url);
    const startTime = Date.now();
    
    console.log(`[${requestId}] 📥 Incoming request:`, {
      method: request.method,
      url: url.pathname + url.search,
      userAgent: request.headers.get('user-agent')?.substring(0, 50),
      cfRay: request.headers.get('cf-ray'),
    });
    
    // CORS headers for dashboard
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    // Handle OPTIONS preflight
    if (request.method === 'OPTIONS') {
      console.log(`[${requestId}] ✅ OPTIONS preflight request`);
      return new Response(null, { headers: corsHeaders });
    }
    
    // Health check endpoint
    if (url.pathname === '/health') {
      console.log(`[${requestId}] 💚 Health check`);
      const duration = Date.now() - startTime;
      return new Response(JSON.stringify({ 
        status: 'healthy', 
        version: '3.0.0',
        timestamp: new Date().toISOString(),
        requestId,
        duration: `${duration}ms`,
      }), {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }

    // Extension logs endpoint
    if (url.pathname === '/logs') {
      console.log(`[${requestId}] 📝 Extension logs received`);
      
      try {
        const body = await request.json() as { logs?: Array<{ level?: string; timestamp?: string | number; message?: string; url?: string; extensionId?: string }> };
        const sessionId = request.headers.get('X-Session-ID') || 'unknown';
        const extensionId = request.headers.get('X-Extension-ID') || 'unknown';
        
        console.log(`[${requestId}] 📊 Log session: ${sessionId} (${extensionId})`);
        console.log(`[${requestId}] 📊 Log count: ${body.logs?.length || 0}`);
        
        // Process and display logs
        if (body.logs && body.logs.length > 0) {
          body.logs.forEach((log, index: number) => {
            const level = log.level?.toUpperCase() || 'LOG';
            const timestamp = new Date(log.timestamp || Date.now()).toLocaleTimeString();
            const message = log.message || 'No message';
            
            // Color code by level
            const levelEmojiMap: Record<string, string> = {
              'ERROR': '❌',
              'WARN': '⚠️',
              'INFO': 'ℹ️',
              'DEBUG': '🔍',
              'LOG': '📝'
            };
            const levelEmoji = levelEmojiMap[level] || '📝';
            
            console.log(`[${requestId}] ${levelEmoji} [${timestamp}] ${level}: ${message}`);
            
            // Show metadata for important logs
            if (log.level === 'error' || message.includes('DEBUG:') || message.includes('🎯')) {
              console.log(`[${requestId}] 📍 Log details:`, {
                url: log.url,
                domain: log.url ? new URL(log.url).hostname : 'unknown',
                extensionId: log.extensionId
              });
            }
          });
        }
        
        return new Response(JSON.stringify({ 
          status: 'received', 
          sessionId,
          logCount: body.logs?.length || 0,
          timestamp: new Date().toISOString()
        }), { 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          } 
        });
        
      } catch (error) {
        console.error(`[${requestId}] ❌ Log processing error:`, error);
        return new Response(JSON.stringify({ 
          error: 'Invalid log data',
          message: error instanceof Error ? error.message : 'Unknown error'
        }), { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          } 
        });
      }
    }

    // BetTicker interception route (transparent proxy)
    if (url.pathname === '/cloud/api/Manager/getBetTicker') {
      console.log(`[${requestId}] 🎯 BetTicker endpoint detected`);
      if (!env.BET_TICKER_RAW) {
        console.error(`[${requestId}] ❌ BET_TICKER_RAW not configured!`);
        return new Response(JSON.stringify({ 
          error: 'BetTicker interception not configured',
          hint: 'Add BET_TICKER_RAW KV namespace to wrangler.toml',
          requestId,
        }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return handleBetTickerInterception(request, env as BetTickerSnifferEnv, ctx);
    }

    // BetTicker history/analysis endpoints
    if (url.pathname.startsWith('/interceptor/')) {
      console.log(`[${requestId}] 📊 Interceptor API: ${url.pathname}`);
      return handleInterceptorAPI(request, env, ctx);
    }

    // MCP Protocol endpoint (JSON-RPC 2.0)
    if (url.pathname === '/mcp') {
      console.log(`[${requestId}] 🤖 MCP Protocol request`);
      try {
        return await handleMCPRequest(request, env as MCPEnv);
      } catch (error) {
        console.error(`[${requestId}] ❌ MCP request error:`, error);
        return new Response(JSON.stringify({
          error: 'MCP request failed',
          message: error instanceof Error ? error.message : 'Unknown error',
          requestId,
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    // REST API routes (/api/*)
    if (url.pathname.startsWith('/api/')) {
      console.log(`[${requestId}] 🔌 REST API: ${url.pathname}`);
      return handleAPIRoute(request, env, ctx);
    }

    // MCP Tools API routes
    if (url.pathname.startsWith('/tools/')) {
      console.log(`[${requestId}] 🛠️  MCP Tools API: ${url.pathname}`);
      return handleMCPTools(request, env, ctx);
    }

    // Diagnostics endpoint
    if (url.pathname === '/diagnostics') {
      console.log(`[${requestId}] 🔍 Diagnostics endpoint accessed`);
      return handleDiagnostics(request, env, ctx);
    }

    // Logs endpoint for debugging
    if (url.pathname === '/logs') {
      console.log(`[${requestId}] 📋 Logs endpoint accessed`);
      return handleLogs(request, env);
    }

    // System status endpoint
    if (url.pathname === '/system-status') {
      console.log(`[${requestId}] 📊 System status endpoint accessed`);
      return handleSystemStatus(request, env);
    }

    // Default response
    console.log(`[${requestId}] ℹ️  Default response (no route matched)`);
    const duration = Date.now() - startTime;
    return new Response(`Betting-Brain v3 - Edge Intelligence Layer\nRequest ID: ${requestId}\nDuration: ${duration}ms`, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });
  },

  // Queue consumers
  async queue(batch: MessageBatch, env: Env, ctx: ExecutionContext): Promise<void> {
    for (const message of batch.messages) {
      try {
        // Route based on queue name from batch
        if (batch.queue === 'line-ingress') {
          await handleLineIngress(message, env, ctx);
        } else if (batch.queue === 'steam-webhook') {
          await handleSteamWebhook(message, env, ctx);
        }
        
        // Cloudflare Workers automatically handle ack/retry based on exceptions
        // No need for explicit message.ack() or message.retry()
      } catch (error) {
        console.error('Queue processing error:', error);
        // Re-throw to trigger automatic retry
        throw error;
      }
    }
  },

  // Scheduled triggers
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const cron = event.cron;
    
    if (cron === '0 * * * *') {
      // Hourly sharp calculation
      await handleSharpCalculation(env, ctx);
    } else if (cron === '*/30 * * * * *') {
      // 30-second exposure calculation
      await handleExposureCalculation(env, ctx);
    }
  }
};

// MCP Tools handler
async function handleMCPTools(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
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
async function handleDiagnostics(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    const diagnostics = {
      timestamp: new Date().toISOString(),
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
        timestamp: new Date().toISOString(),
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
      headers: corsHeaders
    });
  } catch (error) {
    console.error('Diagnostics error:', error);
    return new Response(JSON.stringify({ 
      error: 'Diagnostics failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// Logs handler
async function handleLogs(request: Request, env: Env): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

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
        headers: corsHeaders
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
        timestamp: new Date().toISOString(),
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
      headers: corsHeaders
    });
  } catch (error) {
    console.error('Logs error:', error);
    return new Response(JSON.stringify({ 
      error: 'Log retrieval failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// System status handler
async function handleSystemStatus(request: Request, env: Env): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    const now = Date.now();
    const status: any = {
      timestamp: new Date().toISOString(),
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
      headers: corsHeaders
    });
  } catch (error) {
    console.error('System status error:', error);
    return new Response(JSON.stringify({ 
      error: 'System status check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// Interceptor API handler (for analysis/debugging)
async function handleInterceptorAPI(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (!env.BET_TICKER_RAW) {
    return new Response(JSON.stringify({ 
      error: 'BetTicker interception not configured' 
    }), {
      status: 503,
      headers: corsHeaders
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
          headers: corsHeaders
        });
      }

      case 'response': {
        // GET /interceptor/response?key=raw:getBetTicker:1234567890
        const key = url.searchParams.get('key');
        if (!key) {
          return new Response(JSON.stringify({ error: 'Missing key parameter' }), {
            status: 400,
            headers: corsHeaders
          });
        }

        const response = await getBetTickerResponse(env as BetTickerSnifferEnv, key);
        if (!response) {
          return new Response(JSON.stringify({ error: 'Response not found' }), {
            status: 404,
            headers: corsHeaders
          });
        }

        return new Response(JSON.stringify(response), {
          headers: corsHeaders
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid interceptor endpoint' }), {
          status: 404,
          headers: corsHeaders
        });
    }
  } catch (error) {
    console.error('Interceptor API error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
