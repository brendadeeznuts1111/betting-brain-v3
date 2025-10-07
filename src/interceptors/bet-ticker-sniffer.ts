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

  console.log(`[${requestId}] 🎯 BetTicker intercept request:`, {
    method: request.method,
    pathname: url.pathname,
    userAgent: request.headers.get('user-agent')?.substring(0, 50),
    ip: request.headers.get('cf-connecting-ip'),
  });

  // Only intercept exact endpoint
  if (url.pathname !== TARGET_PATH || request.method !== 'POST') {
    console.log(`[${requestId}] ⏭️  Pass-through (not target endpoint)`);
    // Pass-through everything else
    return fetchOrigin(request);
  }

  console.log(`[${requestId}] ✅ Target endpoint matched, intercepting...`);

  try {
    // 1. Call the real origin
    console.log(`[${requestId}] 📡 Calling origin: ${TARGET_ORIGIN}${TARGET_PATH}`);
    const startTime = Date.now();
    const originRes = await fetchOrigin(request);
    const fetchDuration = Date.now() - startTime;
    
    console.log(`[${requestId}] 📥 Origin responded:`, {
      status: originRes.status,
      statusText: originRes.statusText,
      contentType: originRes.headers.get('content-type'),
      duration: `${fetchDuration}ms`,
    });

    // 2. Clone response so we can read body AND return it
    const cloned = originRes.clone();

    // 3. Read raw body (guaranteed JSON)
    const rawBody = await cloned.text();
    console.log(`[${requestId}] 📄 Response body size: ${rawBody.length} bytes`);

    // 4. Store in KV asynchronously (don't block response)
    console.log(`[${requestId}] 💾 Queuing KV storage (async)...`);
    console.log(`[${requestId}] 🔍 KV binding available: ${!!env.BET_TICKER_RAW}`);
    
    const storePromise = storeRawResponse(env, request, rawBody, originRes.status, requestId).catch(err => {
      console.error(`[${requestId}] ❌ KV storage error:`, err);
    });
    
    ctx.waitUntil(storePromise);

    console.log(`[${requestId}] ✅ Returning response to client (${fetchDuration}ms total)`);
    // 5. Return original response (zero impact on client)
    return originRes;
  } catch (error) {
    console.error(`[${requestId}] ❌ BetTicker interception error:`, error);
    console.error(`[${requestId}] Error stack:`, error instanceof Error ? error.stack : 'No stack');
    // On error, fail open - return error response but don't crash
    return new Response(
      JSON.stringify({
        error: 'Interception failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Fetches from origin server
 */
async function fetchOrigin(request: Request): Promise<Response> {
  // Create new request to origin with same method, headers, and body
  const url = new URL(request.url);
  const originUrl = `${TARGET_ORIGIN}${url.pathname}${url.search}`;

  return fetch(originUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    redirect: 'follow',
  });
}

/**
 * Stores raw response in KV with metadata
 */
async function storeRawResponse(
  env: BetTickerSnifferEnv,
  request: Request,
  rawBody: string,
  status: number,
  requestId: string
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

