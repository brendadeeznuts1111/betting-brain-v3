/**
 * 🧠 Betting-Brain v3 - Main Entry Point
 * 
 * Edge-native betting intelligence layer with zero-downtime deployment
 * Runs entirely on Cloudflare Edge (D1, Workers, Queues, Analytics Engine)
 */

import { Env, BetTickerSnifferEnv } from './types/api';
import { handleLineIngress } from './queues/lineIngress';
import { handleSteamWebhook } from './queues/steamWebhook';
import { handleSharpCalculation } from './schedules/sharpCalc';
import { handleExposureCalculation } from './schedules/exposureCalc';
import { getBettingExposure } from './tools/intelligence/getBettingExposure';
import { getSharpScore } from './tools/intelligence/getSharpScore';
import { getHoldPercentage } from './tools/intelligence/getHoldPercentage';
import { getCLV } from './tools/intelligence/getCLV';
import { handleBetTickerInterception, getBetTickerHistory, getBetTickerResponse } from './interceptors/bet-ticker-sniffer';

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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
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

    // MCP Tools API routes
    if (url.pathname.startsWith('/tools/')) {
      console.log(`[${requestId}] 🛠️  MCP Tools API: ${url.pathname}`);
      return handleMCPTools(request, env, ctx);
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
