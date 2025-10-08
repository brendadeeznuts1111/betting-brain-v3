/**
 * Server-Sent Events (SSE) Streams for Live Dashboard Updates
 *
 * Provides real-time data streams to dashboards without polling.
 * Uses Bun's native ReadableStream for efficient streaming.
 *
 * Features:
 * - Auto-reconnect on disconnect
 * - 2-second heartbeat
 * - CORS-safe
 * - Zero-copy streaming
 */

import type { Env } from '../types/api';

// Active SSE client connections
const clients = {
  hierarchy: new Set<ReadableStreamDefaultController>(),
  health: new Set<ReadableStreamDefaultController>(),
  bets: new Set<ReadableStreamDefaultController>(),
  agents: new Set<ReadableStreamDefaultController>(),
};

/**
 * Broadcast data to all connected clients for a stream
 */
function broadcast(stream: keyof typeof clients, data: any) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  clients[stream].forEach(controller => {
    try {
      controller.enqueue(payload);
    } catch (err) {
      // Client disconnected, remove from set
      clients[stream].delete(controller);
    }
  });
}

/**
 * Create SSE stream for agent hierarchy
 */
export async function createHierarchyStream(env: Env): Promise<Response> {
  const stream = new ReadableStream({
    start(controller) {
      clients.hierarchy.add(controller);

      // Send initial snapshot
      getHierarchySnapshot(env).then(data => {
        controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
      });

      // Heartbeat every 2 seconds
      const interval = setInterval(async () => {
        try {
          const data = await getHierarchySnapshot(env);
          controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
        } catch (err) {
          console.error('[SSE] Hierarchy stream error:', err);
        }
      }, 2000);

      // Cleanup on disconnect
      return () => {
        clearInterval(interval);
        clients.hierarchy.delete(controller);
      };
    },
    cancel(controller) {
      clients.hierarchy.delete(controller);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}

/**
 * Create SSE stream for health status
 */
export async function createHealthStream(env: Env): Promise<Response> {
  const stream = new ReadableStream({
    start(controller) {
      clients.health.add(controller);

      // Send initial snapshot
      getHealthSnapshot(env).then(data => {
        controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
      });

      // Heartbeat every 2 seconds
      const interval = setInterval(async () => {
        try {
          const data = await getHealthSnapshot(env);
          controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
        } catch (err) {
          console.error('[SSE] Health stream error:', err);
        }
      }, 2000);

      return () => {
        clearInterval(interval);
        clients.health.delete(controller);
      };
    },
    cancel(controller) {
      clients.health.delete(controller);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Accel-Buffering': 'no',
    },
  });
}

/**
 * Create SSE stream for live bets
 */
export async function createBetsStream(env: Env): Promise<Response> {
  const stream = new ReadableStream({
    start(controller) {
      clients.bets.add(controller);

      // Send initial snapshot
      getBetsSnapshot(env).then(data => {
        controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
      });

      // Heartbeat every 2 seconds
      const interval = setInterval(async () => {
        try {
          const data = await getBetsSnapshot(env);
          controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
        } catch (err) {
          console.error('[SSE] Bets stream error:', err);
        }
      }, 2000);

      return () => {
        clearInterval(interval);
        clients.bets.delete(controller);
      };
    },
    cancel(controller) {
      clients.bets.delete(controller);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Accel-Buffering': 'no',
    },
  });
}

/**
 * Get current hierarchy snapshot from KV cache
 */
async function getHierarchySnapshot(env: Env) {
  try {
    const cached = await env.FANTASY_CACHE?.get('fantasy402:agents:tree:latest');
    if (cached) {
      const data = JSON.parse(cached);
      return {
        agents: data.agents || [],
        count: data.count || 0,
        timestamp: data.timestamp || new Date().toISOString(),
        source: 'kv-cache',
      };
    }
  } catch (err) {
    console.error('[SSE] Hierarchy snapshot error:', err);
  }

  return {
    agents: [],
    count: 0,
    timestamp: new Date().toISOString(),
    source: 'empty',
    error: 'No cached data available',
  };
}

/**
 * Get current health snapshot
 */
async function getHealthSnapshot(env: Env) {
  return {
    status: 'healthy',
    version: '3.3.0',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(performance.now() / 1000),
    services: {
      worker: 'up',
      database: 'up',
      queue: 'up',
      kv: env.FANTASY_CACHE ? 'up' : 'down',
    },
  };
}

/**
 * Get current live bets snapshot
 */
async function getBetsSnapshot(env: Env) {
  try {
    const cached = await env.LIVEBETS_STORE?.get('livebets:latest');
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (err) {
    console.error('[SSE] Bets snapshot error:', err);
  }

  return {
    count: 0,
    volume: 0,
    timestamp: new Date().toISOString(),
    source: 'empty',
  };
}

/**
 * Manual broadcast function for external triggers
 * Example: Call from queue consumer when new data arrives
 */
export function broadcastHierarchyUpdate(data: any) {
  broadcast('hierarchy', data);
}

export function broadcastHealthUpdate(data: any) {
  broadcast('health', data);
}

export function broadcastBetsUpdate(data: any) {
  broadcast('bets', data);
}

/**
 * Get connection stats for monitoring
 */
export function getStreamStats() {
  return {
    hierarchy: clients.hierarchy.size,
    health: clients.health.size,
    bets: clients.bets.size,
    agents: clients.agents.size,
    total: clients.hierarchy.size + clients.health.size + clients.bets.size + clients.agents.size,
  };
}
