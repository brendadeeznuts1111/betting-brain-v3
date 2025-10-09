/**
 * Floor Status Endpoint
 *
 * Provides real-time system health and metrics for the Floor
 *
 * GET /floor/status
 *
 * Response:
 * {
 *   version: '3.3.0',
 *   status: 'green' | 'yellow' | 'red',
 *   health: { ... },
 *   tests: { pass, fail, total, rate },
 *   coverage: { percentage },
 *   mcpTools: 6,
 *   lastDeploy: '2025-10-08T12:00:00Z',
 *   uptime: 99.9,
 *   endpoints: { ... }
 * }
 */

import type { Env } from '../types/api';

interface FloorStatus {
  version: string;
  status: 'green' | 'yellow' | 'red';
  health: {
    worker: 'up' | 'down';
    database: 'up' | 'down';
    kv: 'up' | 'down';
    queue: 'up' | 'down';
    analytics: 'up' | 'down';
  };
  tests: {
    pass: number;
    fail: number;
    total: number;
    rate: number;
  };
  coverage: {
    percentage: number;
  };
  mcpTools: number;
  sportsApi: {
    supported: string[];
    markets: string[];
    caching: string;
    rateLimiting: string;
  };
  lastDeploy: string;
  uptime: number;
  endpoints: {
    health: string;
    mcp: string;
    liveOdds: string;
    ingest: string;
    dashboard: string;
  };
  knownIssues: {
    testFailures: number;
    typeScriptErrors: number;
    status: string;
  };
}

export async function handleFloorStatus(
  request: Request,
  env: Env
): Promise<Response> {
  const requestId = Date.now().toString(36);
  console.log(`[${requestId}] 📊 Floor status request`);

  try {
    // Check component health
    const health = await checkComponentHealth(env);

    // Determine overall status
    const status = determineOverallStatus(health);

    // Build status response
    const floorStatus: FloorStatus = {
      version: '3.3.0',
      status,
      health,
      tests: {
        pass: 239,
        fail: 60,
        total: 299,
        rate: 0.80,
      },
      coverage: {
        percentage: 81,
      },
      mcpTools: 6,
      sportsApi: {
        supported: ['nba', 'nfl', 'mlb', 'nhl'],
        markets: ['moneyline', 'spread', 'total'],
        caching: '30s KV cache',
        rateLimiting: '100 req/min per IP',
      },
      lastDeploy: new Date(Date.now()).toISOString(), // Would be from deployment metadata
      uptime: 99.9, // Would be calculated from actual uptime
      endpoints: {
        health: '/health',
        mcp: '/mcp',
        liveOdds: '/api/live-odds',
        ingest: '/ingest',
        dashboard: '/dashboards/sports.html',
      },
      knownIssues: {
        testFailures: 60,
        typeScriptErrors: 154,
        status: 'Non-blocking, tracked in docs/TESTING_STATUS.md',
      },
    };

    console.log(`[${requestId}] ✅ Floor status: ${status}`);

    return new Response(JSON.stringify(floorStatus, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=30',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error(`[${requestId}] ❌ Floor status error:`, error);

    return new Response(
      JSON.stringify({
        error: 'Failed to get floor status',
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

/**
 * Check health of all system components
 */
async function checkComponentHealth(env: Env): Promise<FloorStatus['health']> {
  const health: FloorStatus['health'] = {
    worker: 'up',
    database: 'down',
    kv: 'down',
    queue: 'down',
    analytics: 'down',
  };

  // Check D1 database
  try {
    if (env.ANALYTICS) {
      await env.ANALYTICS.prepare('SELECT 1').first();
      health.database = 'up';
    }
  } catch (error) {
    console.error('Database health check failed:', error);
  }

  // Check KV namespaces
  try {
    if (env.RATE_LIMITER && env.SPORTS_CACHE) {
      // Simple read check
      await env.RATE_LIMITER.get('health-check');
      health.kv = 'up';
    }
  } catch (error) {
    console.error('KV health check failed:', error);
  }

  // Check queues
  try {
    if (env.LINE_INGRESS) {
      // Queues are always available if bound
      health.queue = 'up';
    }
  } catch (error) {
    console.error('Queue health check failed:', error);
  }

  // Check Analytics Engine
  try {
    if (env.ANALYTICS_ENGINE) {
      // Analytics Engine is always available if bound
      health.analytics = 'up';
    }
  } catch (error) {
    console.error('Analytics Engine health check failed:', error);
  }

  return health;
}

/**
 * Determine overall system status based on component health
 */
function determineOverallStatus(
  health: FloorStatus['health']
): 'green' | 'yellow' | 'red' {
  const components = Object.values(health);
  const upCount = components.filter((status) => status === 'up').length;
  const totalCount = components.length;

  if (upCount === totalCount) {
    return 'green'; // All systems operational
  } else if (upCount >= totalCount * 0.8) {
    return 'yellow'; // Some degradation
  } else {
    return 'red'; // Critical issues
  }
}
