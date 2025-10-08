/**
 * Health Check Routes
 *
 * Provides health, status, and diagnostic endpoints
 */

import { resolveHost, resolveMultiple } from '../lib/dns-worker';
import { CORS_HEADERS } from '../utils/request';
import type { Env } from '../types/api';

/**
 * DNS Health Check
 *
 * GET /api/health/dns?host=api.fantasy402.com
 *
 * Resolves a hostname using Cloudflare DNS-over-HTTPS and returns:
 * - Resolved IP address
 * - Query latency in ms
 * - Cache status (if available)
 */
export async function dnsHealth(req: Request, env: Env): Promise<Response> {
  const requestId = Date.now().toString(36);
  const url = new URL(req.url);
  const host = url.searchParams.get('host') ?? 'api.fantasy402.com';

  console.log(`[${requestId}] 🔍 DNS health check for: ${host}`);

  

  try {
    const result = await resolveHost(host);

    console.log(`[${requestId}] ✅ DNS resolved:`, {
      host,
      ip: result.ip,
      latency: `${result.latency}ms`,
    });

    return new Response(
      JSON.stringify({
        host,
        ip: result.ip,
        latency: result.latency,
        cached: result.cached ?? false,
        timestamp: new Date().toISOString(),
        requestId,
      }),
      {
        headers: CORS_HEADERS,
      }
    );
  } catch (error) {
    console.error(`[${requestId}] ❌ DNS resolution failed:`, error);

    return new Response(
      JSON.stringify({
        host,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        requestId,
      }),
      {
        status: 500,
        headers: CORS_HEADERS,
      }
    );
  }
}

/**
 * Batch DNS Health Check
 *
 * GET /api/health/dns/batch?hosts=api.fantasy402.com,fantasy402.com
 *
 * Resolves multiple hostnames in parallel
 */
export async function dnsBatchHealth(req: Request, env: Env): Promise<Response> {
  const requestId = Date.now().toString(36);
  const url = new URL(req.url);
  const hostsParam = url.searchParams.get('hosts');

  

  if (!hostsParam) {
    return new Response(
      JSON.stringify({
        error: 'Missing "hosts" query parameter',
        example: '/api/health/dns/batch?hosts=api.fantasy402.com,fantasy402.com',
        requestId,
      }),
      {
        status: 400,
        headers: CORS_HEADERS,
      }
    );
  }

  const hosts = hostsParam.split(',').map((h) => h.trim()).filter(Boolean);

  if (hosts.length === 0) {
    return new Response(
      JSON.stringify({
        error: 'No valid hosts provided',
        requestId,
      }),
      {
        status: 400,
        headers: CORS_HEADERS,
      }
    );
  }

  console.log(`[${requestId}] 🔍 Batch DNS health check for ${hosts.length} hosts`);

  const results = await resolveMultiple(hosts);
  const response: Record<string, any> = {};

  results.forEach((result, host) => {
    if (result instanceof Error) {
      response[host] = {
        error: result.message,
        success: false,
      };
    } else {
      response[host] = {
        ip: result.ip,
        latency: result.latency,
        cached: result.cached ?? false,
        success: true,
      };
    }
  });

  console.log(`[${requestId}] ✅ Batch DNS resolved: ${hosts.length} hosts`);

  return new Response(
    JSON.stringify({
      results: response,
      totalHosts: hosts.length,
      successCount: Object.values(response).filter((r: any) => r.success).length,
      timestamp: new Date().toISOString(),
      requestId,
    }),
    {
      headers: CORS_HEADERS,
    }
  );
}
