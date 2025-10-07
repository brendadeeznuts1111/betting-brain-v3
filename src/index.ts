/**
 * 🧠 Betting-Brain v3 - Main Entry Point
 * 
 * Edge-native betting intelligence layer with zero-downtime deployment
 * Runs entirely on Cloudflare Edge (D1, Workers, Queues, Analytics Engine)
 */

import { Env } from './types/api';
import { handleLineIngress } from './queues/lineIngress';
import { handleSteamWebhook } from './queues/steamWebhook';
import { handleSharpCalculation } from './schedules/sharpCalc';
import { handleExposureCalculation } from './schedules/exposureCalc';
import { getBettingExposure } from './tools/intelligence/getBettingExposure';
import { getSharpScore } from './tools/intelligence/getSharpScore';
import { getHoldPercentage } from './tools/intelligence/getHoldPercentage';
import { getCLV } from './tools/intelligence/getCLV';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ 
        status: 'healthy', 
        version: '3.0.0',
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // MCP Tools API routes
    if (url.pathname.startsWith('/tools/')) {
      return handleMCPTools(request, env, ctx);
    }

    // Default response
    return new Response('Betting-Brain v3 - Edge Intelligence Layer', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });
  },

  // Queue consumers
  async queue(batch: MessageBatch, env: Env, ctx: ExecutionContext): Promise<void> {
    for (const message of batch.messages) {
      try {
        if (message.queue === 'line-ingress') {
          await handleLineIngress(message, env, ctx);
        } else if (message.queue === 'steam-webhook') {
          await handleSteamWebhook(message, env, ctx);
        }
        
        message.ack();
      } catch (error) {
        console.error('Queue processing error:', error);
        message.retry();
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
