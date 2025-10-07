/**
 * 🎯 Bet Ticker Sniffer - Transparent API Interceptor
 * 
 * Intercepts calls to fantasy402.com/cloud/api/Manager/getBetTicker
 * Stores raw JSON responses in KV for analysis while returning original response
 * Zero impact on client - fully transparent proxy
 */

import { z } from 'zod';
import type { BetTickerSnifferEnv } from '../types/api';

// Configuration
const RAW_TTL_DAYS = 7; // Keep data for 7 days
const RAW_TTL_SECONDS = RAW_TTL_DAYS * 86400;
const TARGET_ORIGIN = 'https://fantasy402.com';
const TARGET_PATH = '/cloud/api/Manager/getBetTicker';

// Metadata schema for stored responses
export const BetTickerMetadata = z.object({
  userAgent: z.string(),
  ip: z.string(),
  status: z.number(),
  timestamp: z.string(),
  contentType: z.string().optional(),
  contentLength: z.number().optional(),
});

export type BetTickerMetadata = z.infer<typeof BetTickerMetadata>;

/**
 * Handles getBetTicker interception
 * Routes: POST /cloud/api/Manager/getBetTicker
 */
export async function handleBetTickerInterception(
  request: Request,
  env: BetTickerSnifferEnv,
  ctx: ExecutionContext
): Promise<Response> {
  const requestId = Date.now().toString(36);
  const url = new URL(request.url);
  const interceptId = request.headers.get('X-Intercept-ID') || 'unknown';
  const interceptorVersion = request.headers.get('X-Interceptor-Version') || 'unknown';

  console.log(`[${requestId}] 🎯 BetTicker intercept request:`, {
    method: request.method,
    pathname: url.pathname,
    userAgent: request.headers.get('user-agent')?.substring(0, 50),
    ip: request.headers.get('cf-connecting-ip'),
    interceptId,
    interceptorVersion,
    hasCookies: !!request.headers.get('X-Original-Cookies'),
  });

  // Only intercept exact endpoint
  if (url.pathname !== TARGET_PATH || request.method !== 'POST') {
    console.log(`[${requestId}] ⏭️  Pass-through (not target endpoint)`);
    // Pass-through everything else
    return fetchOrigin(request, requestId);
  }

  console.log(`[${requestId}] ✅ Target endpoint matched, intercepting...`);

  try {
    // 1. Validate request has cookies
    const forwardedCookies = request.headers.get('X-Original-Cookies');
    if (!forwardedCookies) {
      console.warn(`[${requestId}] ⚠️  No cookies forwarded - auth may fail`);
    }

    // 2. Call the real origin with timeout
    console.log(`[${requestId}] 📡 Calling origin: ${TARGET_ORIGIN}${TARGET_PATH}`);
    const startTime = Date.now();
    
    const originRes = await Promise.race([
      fetchOrigin(request, requestId),
      new Promise<Response>((_, reject) =>
        setTimeout(() => reject(new Error('Origin timeout after 30s')), 30000)
      )
    ]);
    
    const fetchDuration = Date.now() - startTime;
    
    console.log(`[${requestId}] 📥 Origin responded:`, {
      status: originRes.status,
      statusText: originRes.statusText,
      contentType: originRes.headers.get('content-type'),
      duration: `${fetchDuration}ms`,
      hasCookies: !!forwardedCookies,
      cookieCount: forwardedCookies ? forwardedCookies.split(';').length : 0
    });

    // 3. Check if origin returned error
    if (!originRes.ok) {
      console.error(`[${requestId}] ❌ Origin returned error: ${originRes.status}`);
      
      // For 4xx errors, still try to return the response (might be useful error info)
      if (originRes.status >= 400 && originRes.status < 500) {
        console.log(`[${requestId}] 📤 Returning client error response`);
        return originRes;
      }
      
      // For 5xx errors, return with CORS headers
      const errorBody = await originRes.text().catch(() => 'Unknown error');
      return new Response(errorBody, {
        status: originRes.status,
        headers: {
          'Content-Type': originRes.headers.get('content-type') || 'text/html',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    // 4. Validate response is JSON
    const contentType = originRes.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      console.error(`[${requestId}] ❌ Origin returned non-JSON: ${contentType}`);
      console.log(`[${requestId}] 📤 Returning anyway (might be error page)`);
      
      // Return with CORS headers so client can see the error
      return new Response(originRes.body, {
        status: originRes.status,
        headers: {
          'Content-Type': contentType || 'text/html',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    // 5. Clone response so we can read body AND return it
    const cloned = originRes.clone();

    // 6. Read raw body
    const rawBody = await cloned.text();
    console.log(`[${requestId}] 📄 Response body size: ${rawBody.length} bytes`);

    // 7. Validate it's actually JSON
    try {
      JSON.parse(rawBody);
      console.log(`[${requestId}] ✅ Valid JSON response`);
    } catch (parseError) {
      console.error(`[${requestId}] ❌ Invalid JSON in response:`, parseError);
      // Still return it - client will see the error
    }

    // 8. Store in KV asynchronously (don't block response)
    if (env.BET_TICKER_RAW) {
      console.log(`[${requestId}] 💾 Queuing KV storage (async)...`);
      const storePromise = storeRawResponse(
        env, 
        request, 
        rawBody, 
        originRes.status, 
        requestId,
        fetchDuration
      ).catch(err => {
        console.error(`[${requestId}] ❌ KV storage error:`, err);
      });
      ctx.waitUntil(storePromise);
    } else {
      console.warn(`[${requestId}] ⚠️  BET_TICKER_RAW not configured - skipping storage`);
    }

    console.log(`[${requestId}] ✅ Returning response to client (${fetchDuration}ms total)`);
    
    // 9. Return original response with CORS headers
    const headers = new Headers(originRes.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('X-Worker-Request-Id', requestId);
    headers.set('X-Worker-Duration', `${fetchDuration}ms`);
    
    return new Response(originRes.body, {
      status: originRes.status,
      headers
    });
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : 'No stack';
    
    console.error(`[${requestId}] ❌ BetTicker interception error:`, errorMsg);
    console.error(`[${requestId}] Error stack:`, errorStack);
    
    // Return JSON error with CORS headers so client can read it
    return new Response(
      JSON.stringify({
        error: 'Worker interception failed',
        message: errorMsg,
        requestId,
        hint: 'Check worker logs for details',
      }),
      {
        status: 502, // Bad Gateway - indicates proxy error
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}

/**
 * Fetches from origin server with forwarded cookies
 */
async function fetchOrigin(request: Request, requestId: string): Promise<Response> {
  // Create new request to origin with same method, headers, and body
  const url = new URL(request.url);
  const originUrl = `${TARGET_ORIGIN}${url.pathname}${url.search}`;

  // Extract forwarded cookies from custom header
  const forwardedCookies = request.headers.get('X-Original-Cookies');
  
  // Build headers for origin request
  const originHeaders = new Headers(request.headers);
  
  // Remove worker-specific headers
  originHeaders.delete('X-Original-Cookies');
  originHeaders.delete('X-Original-Host');
  originHeaders.delete('X-Interceptor-Version');
  originHeaders.delete('X-Intercept-ID');
  originHeaders.delete('Host');
  
  // Set proper Host header for origin
  originHeaders.set('Host', 'fantasy402.com');
  
  // Add forwarded cookies as Cookie header
  if (forwardedCookies) {
    originHeaders.set('Cookie', forwardedCookies);
    const cookiePreview = forwardedCookies.length > 100 
      ? forwardedCookies.substring(0, 100) + '...'
      : forwardedCookies;
    console.log(`[${requestId}] 🍪 Forwarding cookies to origin (${forwardedCookies.length} chars):`, cookiePreview);
    
    // Debug: Show cookie names for troubleshooting
    const cookieNames = forwardedCookies.split(';').map(c => c.trim().split('=')[0]).join(', ');
    console.log(`[${requestId}] 🍪 Cookie names:`, cookieNames);
  } else {
    console.warn(`[${requestId}] ⚠️  No cookies forwarded from extension`);
  }

  try {
    return await fetch(originUrl, {
      method: request.method,
      headers: originHeaders,
      body: request.body,
      redirect: 'follow',
    });
  } catch (error) {
    console.error(`[${requestId}] ❌ Fetch to origin failed:`, error);
    throw error;
  }
}

/**
 * Stores raw response in KV with metadata
 */
async function storeRawResponse(
  env: BetTickerSnifferEnv,
  request: Request,
  rawBody: string,
  status: number,
  requestId: string,
  fetchDuration?: number
): Promise<void> {
  const storeStartTime = Date.now();
  
  try {
    // Generate key with timestamp
    const timestamp = Date.now();
    const key = `raw:getBetTicker:${timestamp}`;

    console.log(`[${requestId}] 💾 Starting KV storage:`, {
      key,
      bodySize: rawBody.length,
      status,
    });

    // Extract metadata
    const metadata: BetTickerMetadata = {
      userAgent: request.headers.get('user-agent') || 'unknown',
      ip: request.headers.get('cf-connecting-ip') || 'unknown',
      status,
      timestamp: new Date().toISOString(),
      contentType: 'application/json',
      contentLength: rawBody.length,
      ...(fetchDuration && { fetchDuration }),
    };

    console.log(`[${requestId}] 📊 Metadata:`, metadata);

    // Validate metadata
    const validatedMetadata = BetTickerMetadata.parse(metadata);
    console.log(`[${requestId}] ✅ Metadata validated`);

    // Store in KV with TTL
    await env.BET_TICKER_RAW.put(key, rawBody, {
      metadata: validatedMetadata,
      expirationTtl: RAW_TTL_SECONDS,
    });

    const storeDuration = Date.now() - storeStartTime;
    console.log(`[${requestId}] ✅ Stored in KV: ${key} (${rawBody.length} bytes, ${storeDuration}ms)`);
    console.log(`[${requestId}] ⏰ TTL: ${RAW_TTL_DAYS} days (${RAW_TTL_SECONDS}s)`);
  } catch (error) {
    console.error(`[${requestId}] ❌ Storage error:`, error);
    console.error(`[${requestId}] Error details:`, {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack',
    });
    // Don't throw - storage failure shouldn't impact client
  }
}

/**
 * Retrieves stored responses from KV
 * Utility function for analysis/debugging
 */
export async function getBetTickerHistory(
  env: BetTickerSnifferEnv,
  options?: {
    limit?: number;
    startTime?: number;
    endTime?: number;
  }
): Promise<{ key: string; metadata: BetTickerMetadata }[]> {
  const requestId = Date.now().toString(36);
  const limit = options?.limit ?? 100;
  
  console.log(`[${requestId}] 📜 getBetTickerHistory called:`, {
    limit,
    startTime: options?.startTime,
    endTime: options?.endTime,
  });
  
  const results: { key: string; metadata: BetTickerMetadata }[] = [];

  // List all keys with prefix
  console.log(`[${requestId}] 🔍 Listing KV keys (prefix: raw:getBetTicker:, limit: ${limit})`);
  const listStartTime = Date.now();
  const list = await env.BET_TICKER_RAW.list({
    prefix: 'raw:getBetTicker:',
    limit,
  });
  const listDuration = Date.now() - listStartTime;
  
  console.log(`[${requestId}] 📋 Found ${list.keys.length} keys (${listDuration}ms)`);

  for (const key of list.keys) {
    if (key.metadata) {
      try {
        const metadata = BetTickerMetadata.parse(key.metadata);
        
        // Filter by time range if provided
        const keyTime = parseInt(key.name.split(':')[2] || '0');
        if (options?.startTime && keyTime < options.startTime) {
          console.log(`[${requestId}] ⏭️  Skipping ${key.name} (before startTime)`);
          continue;
        }
        if (options?.endTime && keyTime > options.endTime) {
          console.log(`[${requestId}] ⏭️  Skipping ${key.name} (after endTime)`);
          continue;
        }

        results.push({
          key: key.name,
          metadata,
        });
      } catch (error) {
        console.error(`[${requestId}] ❌ Invalid metadata for ${key.name}:`, error);
      }
    } else {
      console.warn(`[${requestId}] ⚠️  No metadata for ${key.name}`);
    }
  }

  console.log(`[${requestId}] ✅ Returning ${results.length} results`);
  return results;
}

/**
 * Retrieves a specific stored response
 */
export async function getBetTickerResponse(
  env: BetTickerSnifferEnv,
  key: string
): Promise<{ body: string; metadata: BetTickerMetadata } | null> {
  try {
    const value = await env.BET_TICKER_RAW.getWithMetadata(key);
    
    if (!value.value || !value.metadata) {
      return null;
    }

    const metadata = BetTickerMetadata.parse(value.metadata);
    
    return {
      body: value.value,
      metadata,
    };
  } catch (error) {
    console.error(`[BetTicker] Retrieval error for ${key}:`, error);
    return null;
  }
}

