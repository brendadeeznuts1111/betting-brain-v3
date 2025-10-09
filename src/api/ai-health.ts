/**
 * 🏥 AI Health Check Endpoint
 * Verify Kimi K2 AI and database connectivity
 */

import { Env } from '../types/api';
import { CORS_HEADERS } from '../utils/request';

interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'error';
  kimi: 'connected' | 'disconnected' | 'not_configured';
  databases: {
    name: string;
    status: 'connected' | 'error';
    tables?: number;
  }[];
  timestamp: string;
  version: string;
}

/**
 * Check database connectivity
 */
async function checkDatabase(db: D1Database, name: string): Promise<{ name: string; status: 'connected' | 'error'; tables?: number }> {
  try {
    // Try a simple query
    const result = await db.prepare('SELECT COUNT(*) as count FROM sqlite_master WHERE type = "table"').first<{ count: number }>();
    
    return {
      name,
      status: 'connected',
      tables: result?.count ?? 0,
    };
  } catch (error) {
    console.error(`Database ${name} check failed:`, error);
    return {
      name,
      status: 'error',
    };
  }
}

/**
 * Check Kimi API connectivity
 */
async function checkKimiAPI(apiKey: string): Promise<'connected' | 'disconnected' | 'not_configured'> {
  if (!apiKey || apiKey === 'sk-placeholder-use-dotenv-or-secrets') {
    return 'not_configured';
  }

  try {
    // Simple test call to Kimi API
    const response = await fetch('https://api.moonshot.cn/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      return 'connected';
    } else {
      return 'disconnected';
    }
  } catch (error) {
    console.error('Kimi API check failed:', error);
    return 'disconnected';
  }
}

/**
 * Handle health check request
 */
export async function handleHealthCheck(request: Request, env: Env): Promise<Response> {
  console.log('🏥 Health check request received');

  try {
    // Check Kimi API
    const kimiStatus = await checkKimiAPI(env.KIMI_API_KEY);

    // Check databases
    const databases = await Promise.all([
      checkDatabase(env.ANALYTICS, 'ANALYTICS'),
      checkDatabase(env.RAW_FEED_DB, 'RAW_FEED_DB'),
    ]);

    // Determine overall status
    const allDbsConnected = databases.every(db => db.status === 'connected');
    const kimiConnected = kimiStatus === 'connected';

    let status: 'ok' | 'degraded' | 'error';
    if (kimiConnected && allDbsConnected) {
      status = 'ok';
    } else if (kimiConnected || allDbsConnected) {
      status = 'degraded';
    } else {
      status = 'error';
    }

    const response: HealthCheckResponse = {
      status,
      kimi: kimiStatus,
      databases,
      timestamp: new Date().toISOString(),
      version: '3.0.0-phase3',
    };

    console.log('✅ Health check complete:', status);

    return new Response(JSON.stringify(response, null, 2), {
      status: status === 'ok' ? 200 : status === 'degraded' ? 206 : 503,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ Health check error:', error);

    const errorResponse: HealthCheckResponse = {
      status: 'error',
      kimi: 'disconnected',
      databases: [],
      timestamp: new Date().toISOString(),
      version: '3.0.0-phase3',
    };

    return new Response(JSON.stringify(errorResponse, null, 2), {
      status: 503,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
}

