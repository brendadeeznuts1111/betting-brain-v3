/**
 * 🧠 Betting-Brain v3 - Main Entry Point
 * 
 * Edge-native betting intelligence layer with zero-downtime deployment
 * Runs entirely on Cloudflare Edge (D1, Workers, Queues, Analytics Engine)
 */

import { Env, BetTickerSnifferEnv, MCPEnv, SportsEnv } from './types/api';
import { handleLineIngress } from './queues/lineIngress';
import { handleSteamWebhook } from './queues/steamWebhook';
import { handleSharpCalculation } from './schedules/sharpCalc';
import { handleExposureCalculation } from './schedules/exposureCalc';
import { handleBetTickerInterception } from './interceptors/bet-ticker-sniffer';
import { getAgentTree } from './routes/api/f402-agents';
import { handleMCPRequest } from './mcp/server';
import { handleAPIRoute } from './api/routes';
import { handleWebSocketUpgrade } from './websocket/fantasy402-ws-handler';
import { handleIngest } from './routes/ingest';
import { handleLiveAnalytics } from './api/analytics-live';
import { handleLiveSports } from './api/sports-live';
import { handleLiveSessions } from './api/session-live';
import { handleAIChat } from './api/ai-chat';
import { CORS_HEADERS } from './utils/request';

// Import core handlers from modular files
import {
  handleMCPTools,
  handleDiagnostics,
  handleLogs,
  handleSystemStatus,
  handleInterceptorAPI
} from './routes/handlers';

// See .cursor/rules/endpoint-routing.mdc for routing patterns
// See .cursor/rules/cloudflare-workers.mdc for Workers patterns
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

    // Handle OPTIONS preflight
    if (request.method === 'OPTIONS') {
      console.log(`[${requestId}] ✅ OPTIONS preflight request`);
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS
      });
    }

    // WebSocket endpoint (must be first to check Upgrade header)
    if (url.pathname === '/ws') {
      console.log(`[${requestId}] 🔌 WebSocket upgrade request`);
      return handleWebSocketUpgrade(request, env);
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
          ...CORS_HEADERS,
          'Content-Type': 'application/json',
        }
      });
    }

    // Floor status endpoint
    if (url.pathname === '/floor/status' && request.method === 'GET') {
      console.log(`[${requestId}] 🤖 Floor status check`);
      const { handleFloorStatus } = await import('./routes/floor-status');
      return handleFloorStatus(request, env);
    }

    // Data ingestion endpoint (MCP)
    if (url.pathname === '/ingest' && request.method === 'POST') {
      console.log(`[${requestId}] 📊 Data ingestion from MCP`);
      return handleIngest(request, env as SportsEnv);
    }

    // DNS health endpoints
    if (url.pathname === '/api/health/dns' && request.method === 'GET') {
      console.log(`[${requestId}] 🔍 DNS health check`);
      const { dnsHealth } = await import('./routes/health');
      return dnsHealth(request, env);
    }

    if (url.pathname === '/api/health/dns/batch' && request.method === 'GET') {
      console.log(`[${requestId}] 🔍 Batch DNS health check`);
      const { dnsBatchHealth } = await import('./routes/health');
      return dnsBatchHealth(request, env);
    }

    // Live odds API endpoint
    if (url.pathname === '/api/live-odds' && request.method === 'GET') {
      console.log(`[${requestId}] 🎲 Live odds API`);
      const { handleLiveOdds } = await import('./routes/api/live-odds');
      return handleLiveOdds(request, env as SportsEnv);
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
            ...CORS_HEADERS,
            'Content-Type': 'application/json'
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
            ...CORS_HEADERS,
            'Content-Type': 'application/json'
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

      // GET request → return tools list (convenience for dashboard)
      if (request.method === 'GET') {
        return new Response(JSON.stringify({
          protocol: 'MCP',
          version: '1.0',
          toolsCount: 13,
          tools: [
            'getBettingExposure',
            'getCLV',
            'getHoldPercentage',
            'getSharpScore',
            'getSteamMoves',
            'getRiskConcentration',
            'getSharpActivity',
            'getTimeSeriesCLV',
            'getEnhancedSharpScore',
            'getHoldForecast',
            'getHandleAndHold',
            'getCustomerVolume',
            'getTimeSeriesAnalytics'
          ],
          timestamp: new Date().toISOString(),
          requestId
        }), {
          headers: {
            ...CORS_HEADERS,
            'Content-Type': 'application/json'
          }
        });
      }

      // POST request → full JSON-RPC 2.0 protocol
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
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
      }
    }

    // Analytics routes
    if (url.pathname === '/api/analytics/live') {
      console.log(`[${requestId}] 📊 Live analytics request`);
      return handleLiveAnalytics(request, env, requestId);
    }

    // Sports routes
    if (url.pathname === '/api/sports/live') {
      console.log(`[${requestId}] 🏈 Live sports data request`);
      return handleLiveSports(request, env, requestId);
    }

    // Session routes
    if (url.pathname === '/api/sessions/live') {
      console.log(`[${requestId}] 👥 Live session data request`);
      return handleLiveSessions(request, env, requestId);
    }

    // NEW: agent tree (fast path)
    if (url.pathname === '/api/f402/agents/tree') {
      console.log(`[${requestId}] 🌲 Agent tree: ${url.searchParams.get('owner') || 'self'}`);
      return await getAgentTree(request, env, requestId);
    }

    // AI Chat endpoint
    if (url.pathname === '/api/ai/chat' && request.method === 'POST') {
      console.log(`[${requestId}] 🤖 AI Chat request`);
      return handleAIChat(request, env);
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
    // Route based on queue name
    if (batch.queue === 'fantasy402-logs') {
      // Process Fantasy402 logs in batches (efficient!)
      const { processFantasy402Logs } = await import('./queues/fantasy402-logger');
      await processFantasy402Logs(batch, env);
      return;
    }

    // Handle other queues message-by-message
    for (const message of batch.messages) {
      try {
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

      // Hourly config cache warmer
      const { warmConfigCache } = await import('./api/fantasy402-config');
      await warmConfigCache(env);
    } else if (cron === '*/30 * * * * *') {
      // 30-second exposure calculation
      await handleExposureCalculation(env, ctx);
    } else if (cron === '0 3 * * *') {
      // Daily at 3 AM UTC - Agent graph population
      console.log('🌳 Running agent graph population');
      const { populateAgentGraph } = await import('./schedules/populateGraph');
      await populateAgentGraph(env, ctx);
    }
  }
};
