/**
 * Fantasy402 Data Ingestion Endpoint
 * Receives intercepted API calls from browser extension
 *
 * Production Limits (Cloudflare D1):
 * - Max request size: ~1 MB (HTTP API limit)
 * - Max batch size: ~10,000 statements per transaction
 * - Current usage: 1,953 agents = 715 KB (40% headroom)
 * - Chunking threshold: 2,800 agents or 900 KB (client-side)
 *
 * Performance Targets:
 * - p99 latency: <1s for batch inserts
 * - Throughput: >15,000 agents/sec (typical: ~18,000)
 * - Alert threshold: >8,000 agents (80% of limit)
 *
 * Monitoring:
 * - Analytics Engine: agent_sync events (batch size, latency, throughput)
 * - Console warnings: batch size >8k or latency >1s
 * - Rate limiting: 5-minute window between syncs (bypassed with force flag)
 */

import { Errors, createErrorResponse } from '../utils/error-handler';
import type { Env } from '../types/cloudflare';
import { extractAllTokens, parseJWT, getTokenInfo } from '../utils/jwt-parser';
import { extractOperationData, normalizeObject } from '../utils/fantasy402-parser';
import { generateAnalyticsRollup, type BetData } from '../utils/analytics-rollups';

// Import processors and extractors from modular files
import {
    processAuthentication,
    processWeeklyFigures,
    processAgentList,
    processSportTypes,
    processAccountInfo,
    processAuthorizations,
    processAgentPerformance,
    processPlayerInfo,
    processPlayerPerformance,
    processTransactionList,
    processPendingWagers,
    processPlayerAnalysis
} from './fantasy402/processors';
import {
    extractBetDataFromBetTicker,
    extractBetDataFromPendingWagers,
    extractBetDataFromTransactions
} from './fantasy402/extractors';

interface Fantasy402Packet {
    timestamp: string;
    endpoint: string;
    operation: string;
    method: string;
    url: string;
    request: {
        headers?: Record<string, string>;
        body?: Record<string, any>;
        rawBody?: string;
    };
    response: {
        status: number;
        statusText: string;
        headers?: Record<string, string>;
        body?: any;
        size?: number;
    };
    metadata: {
        duration: number;
        agentID?: string;
        agentOwner?: string;
        customerID?: string;
        token?: string;
        userAgent?: string;
        pageUrl?: string;
    };
}

/**
 * D1 Production Limits Configuration
 * Used by both HEAD endpoint and POST handler
 */
export const D1_LIMITS = {
    MAX_PAYLOAD_BYTES: 1_000_000,    // 1 MB (Cloudflare HTTP API limit)
    MAX_BATCH_SIZE: 10_000,          // 10k statements (D1 transaction limit)
    RECOMMENDED_CHUNK_SIZE: 9_000    // 9k agents (safety margin)
};

/**
 * HEAD /api/fantasy402/ingest
 * Returns D1 limits in headers for client-side limit discovery
 * Client can query this once at startup to determine chunking strategy
 */
export async function handleFantasy402IngestHead(
    request: Request,
    env: Env,
    requestId: string
): Promise<Response> {
    console.log(`[${requestId}] 📋 Limit discovery request`);

    return new Response(null, {
        status: 204, // No Content
        headers: {
            'X-D1-Max-Payload-Bytes': D1_LIMITS.MAX_PAYLOAD_BYTES.toString(),
            'X-D1-Max-Agents': D1_LIMITS.MAX_BATCH_SIZE.toString(),
            'X-D1-Recommended-Chunk': D1_LIMITS.RECOMMENDED_CHUNK_SIZE.toString(),
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Expose-Headers': 'X-D1-Max-Payload-Bytes, X-D1-Max-Agents, X-D1-Recommended-Chunk'
        }
    });
}

export async function handleFantasy402Ingest(
    request: Request,
    env: Env,
    requestId: string
): Promise<Response> {
    try {
        // 🔒 SECRET CHECK: Only allow extension requests
        const authHeader = request.headers.get('X-Extension-Secret');
        const expectedSecret = env.EXTENSION_SECRET || 'default-dev-secret-change-me';

        if (!authHeader || authHeader !== expectedSecret) {
            console.warn(`[${requestId}] ⚠️ Unauthorized ingest attempt`);
            return new Response(JSON.stringify({
                error: 'Unauthorized',
                message: 'Valid X-Extension-Secret header required',
                requestId
            }), {
                status: 401,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        console.log(`[${requestId}] ✅ Authorized ingest request`);

        // 📏 PAYLOAD SIZE CHECK: Reject requests >1 MB (D1 HTTP API limit)
        const contentLength = request.headers.get('content-length');
        const MAX_PAYLOAD_SIZE = 1_000_000; // 1 MB

        if (contentLength && parseInt(contentLength) > MAX_PAYLOAD_SIZE) {
            const sizeMB = (parseInt(contentLength) / 1_000_000).toFixed(2);
            console.warn(`[${requestId}] 📦 Payload too large: ${sizeMB} MB (max: 1 MB)`);

            return new Response(JSON.stringify({
                error: 'PAYLOAD_TOO_LARGE',
                message: `Request payload exceeds maximum size of 1 MB (received: ${sizeMB} MB). Use chunked upload for large agent trees.`,
                maxSize: MAX_PAYLOAD_SIZE,
                receivedSize: parseInt(contentLength),
                requestId
            }), {
                status: 413, // Payload Too Large
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        // Parse request body (gunzip if needed when USE_GZIP=true in sync script)
        let body: any;
        if (request.headers.get('content-encoding') === 'gzip') {
            const raw = await request.arrayBuffer();
            const decompressed = new DecompressionStream('gzip');
            const writer = decompressed.writable.getWriter();
            await writer.write(new Uint8Array(raw));
            await writer.close();

            const reader = decompressed.readable.getReader();
            const chunks: Uint8Array[] = [];
            let result = await reader.read();
            while (!result.done) {
                chunks.push(result.value);
                result = await reader.read();
            }

            let totalLength = 0;
            for (const chunk of chunks) totalLength += chunk.length;
            const concatenated = new Uint8Array(totalLength);
            let offset = 0;
            for (const chunk of chunks) {
                concatenated.set(chunk, offset);
                offset += chunk.length;
            }

            body = JSON.parse(new TextDecoder().decode(concatenated));
        } else {
            body = await request.json();
        }

        // Handle agent tree sync (from sync-agent-tree.js)
        if (body.tree && Array.isArray(body.tree)) {
            const { tree, ts, source } = body;
            const forceSync = body.force === true;

            console.log(`[${requestId}] 🌳 Agent tree sync: ${tree.length} agents (source: ${source}, force: ${forceSync})`);

            // Rate limiting: check last sync timestamp
            if (!forceSync) {
                const lastSyncKey = 'fantasy402:agent-sync:last-run';
                const lastSyncStr = await env.FANTASY_CACHE.get(lastSyncKey);

                if (lastSyncStr) {
                    const lastSyncTime = parseInt(lastSyncStr);
                    const timeSinceLastSync = Date.now() - lastSyncTime;
                    const minInterval = 5 * 60 * 1000; // 5 minutes

                    if (timeSinceLastSync < minInterval) {
                        const waitTime = Math.ceil((minInterval - timeSinceLastSync) / 1000);
                        console.warn(`[${requestId}] ⏱️  Rate limit: last sync ${Math.floor(timeSinceLastSync / 1000)}s ago`);

                        return new Response(JSON.stringify({
                            error: 'RATE_LIMIT_EXCEEDED',
                            message: `Agent sync rate limited. Please wait ${waitTime} seconds.`,
                            retryAfter: waitTime,
                            lastSync: new Date(lastSyncTime).toISOString(),
                            requestId
                        }), {
                            status: 429,
                            headers: {
                                'Content-Type': 'application/json',
                                'Retry-After': waitTime.toString(),
                                'X-RateLimit-Reset': new Date(lastSyncTime + minInterval).toISOString(),
                                'Access-Control-Allow-Origin': '*'
                            }
                        });
                    }
                }
            }

            // Store complete agent tree in KV for quick access
            await env.FANTASY_CACHE.put('fantasy402:agents:tree:latest', JSON.stringify({
                agents: tree,
                count: tree.length,
                timestamp: new Date(ts).toISOString(),
                source
            }), {
                expirationTtl: 3600 // 1 hour
            });

            // Use D1 batch insert for atomic transaction (prevents race conditions)
            // Production Limits:
            // - Max request size: ~1 MB (enforced by Content-Length check above)
            // - Max batch size: ~10,000 statements (enforced by client chunking logic)
            if (env.RAW_FEED_DB) {
                try {
                    console.log(`[${requestId}] 📊 Preparing D1 batch insert for ${tree.length} agents...`);

                    // Prepare INSERT OR REPLACE statement
                    const stmt = env.RAW_FEED_DB.prepare(`
                        INSERT OR REPLACE INTO fantasy402_agents (
                            agent_id, parent_id, agent_type, agent_owner, level, path,
                            agent_name, credit_limit, outstanding_balance, hold_percentage,
                            risk_score, steam_percentage, velocity, sharpness,
                            active, site_id, synced_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())
                    `);

                    // Build array of bound statements for batch execution
                    const statements = tree.map((agent: any) =>
                        stmt.bind(
                            agent.agent_id,
                            agent.parent_id || null,
                            agent.agent_type,
                            agent.agent_owner,
                            agent.level || 0,
                            agent.path || `/${agent.agent_id}`,
                            agent.agent_name || agent.agent_id,
                            agent.credit_limit || 0,
                            agent.outstanding_balance || 0,
                            agent.hold_percentage || 0,
                            agent.risk_score || 0,
                            agent.steam_percentage || 0,
                            agent.velocity || 0,
                            agent.sharpness || 0,
                            agent.active !== undefined ? agent.active : 1,
                            agent.site_id || 1,
                            agent.synced_at || Date.now()
                        )
                    );

                    // Execute all statements in a single atomic transaction
                    const batchStart = Date.now();
                    const results = await env.RAW_FEED_DB.batch(statements);
                    const batchDuration = Date.now() - batchStart;
                    const throughput = Math.round(tree.length / batchDuration * 1000);

                    // 📊 METRICS: Log batch performance for alerting
                    console.log(`[${requestId}] ✅ D1 batch insert completed: ${tree.length} agents in ${batchDuration}ms (${throughput} agents/sec)`);

                    // Send metrics to Analytics Engine for monitoring
                    if (env.ANALYTICS_ENGINE) {
                        env.ANALYTICS_ENGINE.writeDataPoint({
                            blobs: [
                                'agent_sync',
                                source || 'unknown',
                                'batch_insert'
                            ],
                            doubles: [
                                tree.length,        // Batch size
                                batchDuration,      // Latency (ms)
                                throughput          // Throughput (agents/sec)
                            ],
                            indexes: [`agent-sync-${requestId}`]
                        });
                    }

                    // ⚠️ ALERT: Warn if approaching production limits
                    if (tree.length > 8000) {
                        console.warn(`[${requestId}] ⚠️  Batch size approaching D1 limit: ${tree.length}/10000 statements (${(tree.length / 10000 * 100).toFixed(1)}%)`);
                    }
                    if (batchDuration > 1000) {
                        console.warn(`[${requestId}] ⚠️  Batch latency high: ${batchDuration}ms (p99 threshold: 1000ms)`);
                    }

                    // Update last sync timestamp for rate limiting
                    await env.FANTASY_CACHE.put('fantasy402:agent-sync:last-run', Date.now().toString(), {
                        expirationTtl: 300 // 5 minutes (matches rate limit window)
                    });

                    return new Response(JSON.stringify({
                        success: true,
                        stored: tree.length,
                        duration_ms: batchDuration,
                        throughput: Math.round(tree.length / batchDuration * 1000),
                        requestId
                    }), {
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        }
                    });

                } catch (dbError) {
                    console.error(`[${requestId}] ❌ D1 batch insert failed:`, dbError);

                    return new Response(JSON.stringify({
                        error: 'DATABASE_ERROR',
                        message: 'Failed to store agents in database',
                        details: dbError instanceof Error ? dbError.message : String(dbError),
                        requestId
                    }), {
                        status: 500,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        }
                    });
                }
            }

            // Fallback if D1 unavailable (KV only)
            return new Response(JSON.stringify({
                success: true,
                stored: tree.length,
                warning: 'Stored in KV only (D1 unavailable)',
                requestId
            }), {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        // Standard packet processing
        const packet: Fantasy402Packet = body as Fantasy402Packet;

        console.log(`[${requestId}] 📥 Fantasy402 data:`, packet.endpoint, packet.operation);

        // Validate packet (we only get here if it's NOT a chunk)
        if (!packet.timestamp || !packet.endpoint) {
            throw Errors.validationError(['Missing required fields: timestamp, endpoint']);
        }

        // If this is a BetTicker call, store in BET_TICKER_RAW for mission-control
        if (packet.operation === 'getBetTicker' && packet.response?.body && env.BET_TICKER_RAW) {
            const kvKey = `raw:getBetTicker:${Date.now()}`;

            // Extract bet data for analytics
            const betData = extractBetDataFromBetTicker(packet.response.body);
            const analytics = generateAnalyticsRollup(betData);

            // Store raw data with analytics
            const enrichedData = {
                raw: packet.response.body,
                analytics,
                timestamp: packet.timestamp,
                capturedAt: new Date().toISOString()
            };

            await env.BET_TICKER_RAW.put(kvKey, JSON.stringify(enrichedData), {
                expirationTtl: 604800, // 7 days
            });

            // Also store as latest for quick access
            await env.BET_TICKER_RAW.put('betTicker:latest', JSON.stringify(enrichedData), {
                expirationTtl: 604800,
            });

            console.log(`[${requestId}] 💾 Stored BetTicker with analytics in KV: ${kvKey}`);
        }

        // If this is a Scores call, store in SPORTS_CACHE for live-scores endpoint
        if (packet.operation === 'getScoresLiveDynamic' && packet.response?.body && env.SPORTS_CACHE) {
            try {
                const scores = packet.response.body.Scores || packet.response.body.scores || [];

                await env.SPORTS_CACHE.put(
                    'scores:latest',
                    JSON.stringify({
                        raw: packet.response.body,
                        timestamp: packet.timestamp,
                        count: scores.length,
                        capturedAt: new Date().toISOString(),
                    }),
                    { expirationTtl: 300 } // 5 minutes
                );

                console.log(`[${requestId}] 🏀 Stored ${scores.length} scores in SPORTS_CACHE`);
            } catch (error) {
                console.warn(`[${requestId}] ⚠️ Failed to store scores:`, error);
            }
        }

        // If this is a Player Analysis report, store in FANTASY_CACHE for analytics
        if (packet.operation === 'getReportPlayerAnalysis' && packet.response?.body && env.FANTASY_CACHE) {
            try {
                // Store raw player analysis data
                await env.FANTASY_CACHE.put(
                    'playerAnalysis:latest',
                    JSON.stringify({
                        raw: packet.response.body,
                        timestamp: packet.timestamp,
                        capturedAt: new Date().toISOString(),
                        metadata: {
                            reportType: packet.request?.body?.reportType,
                            startDate: packet.request?.body?.startDate,
                            endDate: packet.request?.body?.endDate,
                            lineType: packet.request?.body?.lineType,
                            agentID: packet.request?.body?.agentID,
                            customerID: packet.request?.body?.customerID,
                        }
                    }),
                    { expirationTtl: 3600 } // 1 hour
                );

                console.log(`[${requestId}] 📊 Stored player analysis in FANTASY_CACHE`);
            } catch (error) {
                console.warn(`[${requestId}] ⚠️ Failed to store player analysis:`, error);
            }
        }

        // If this is Transaction History, store in FANTASY_CACHE for financial tracking
        if (packet.operation === 'getTransactionHistory' && packet.response?.body && env.FANTASY_CACHE) {
            try {
                const transactions = packet.response.body.LIST || packet.response.body.list || [];

                // Extract bet data for analytics
                const betData = extractBetDataFromTransactions(transactions, packet.metadata);
                const analytics = generateAnalyticsRollup(betData);

                await env.FANTASY_CACHE.put(
                    'transactionHistory:latest',
                    JSON.stringify({
                        raw: packet.response.body,
                        analytics,
                        timestamp: packet.timestamp,
                        capturedAt: new Date().toISOString(),
                        count: transactions.length,
                        metadata: {
                            agentID: packet.request?.body?.agentID,
                            customerID: packet.request?.body?.customerID,
                            startDate: packet.request?.body?.startDate,
                            endDate: packet.request?.body?.endDate,
                            filters: {
                                deposits: packet.request?.body?.deposits === 'checked',
                                withdrawals: packet.request?.body?.withdrawals === 'checked',
                                adjustments: packet.request?.body?.adjustments === 'checked',
                                transfers: packet.request?.body?.transfers === 'checked',
                            }
                        }
                    }),
                    { expirationTtl: 1800 } // 30 minutes
                );

                console.log(`[${requestId}] 💳 Stored ${transactions.length} transactions with analytics in FANTASY_CACHE`);
            } catch (error) {
                console.warn(`[${requestId}] ⚠️ Failed to store transaction history:`, error);
            }
        }

        // If this is New Users Info, store in FANTASY_CACHE for signup tracking
        if (packet.operation === 'getNewUsersInfo' && packet.response?.body && env.FANTASY_CACHE) {
            try {
                const users = packet.response.body.LIST || packet.response.body.list || [];

                await env.FANTASY_CACHE.put(
                    'newUsersInfo:latest',
                    JSON.stringify({
                        raw: packet.response.body,
                        timestamp: packet.timestamp,
                        capturedAt: new Date().toISOString(),
                        count: users.length,
                        metadata: {
                            agentID: packet.request?.body?.agentID,
                            days: packet.request?.body?.days,
                            agentOwner: packet.request?.body?.agentOwner,
                        }
                    }),
                    { expirationTtl: 3600 } // 1 hour
                );

                console.log(`[${requestId}] 👥 Stored ${users.length} new users in FANTASY_CACHE`);
            } catch (error) {
                console.warn(`[${requestId}] ⚠️ Failed to store new users info:`, error);
            }
        }

        // If this is Pending Wagers (detected by path param), store in FANTASY_CACHE
        if (packet.endpoint?.includes('getPending') && packet.response?.body && env.FANTASY_CACHE) {
            try {
                const pending = packet.response.body.LIST || packet.response.body.list || [];

                // Extract bet data for analytics
                const betData = extractBetDataFromPendingWagers(pending, packet.metadata);
                const analytics = generateAnalyticsRollup(betData);

                await env.FANTASY_CACHE.put(
                    'pendingWagers:latest',
                    JSON.stringify({
                        raw: packet.response.body,
                        analytics,
                        timestamp: packet.timestamp,
                        capturedAt: new Date().toISOString(),
                        count: pending.length,
                        metadata: {
                            agentID: packet.request?.body?.agentID,
                            date: packet.request?.body?.date,
                            wagerType: packet.request?.body?.wagerType,
                            customerID: packet.request?.body?.customerID,
                            agentOwner: packet.request?.body?.agentOwner,
                        }
                    }),
                    { expirationTtl: 300 } // 5 minutes (live data)
                );

                console.log(`[${requestId}] 🎲 Stored ${pending.length} pending wagers with analytics in FANTASY_CACHE`);
            } catch (error) {
                console.warn(`[${requestId}] ⚠️ Failed to store pending wagers:`, error);
            }
        }

        // Store Fantasy402 configuration data (for all getConfig* operations)
        if (packet.operation?.startsWith('getConfig') && packet.response?.body && env.FANTASY_CONFIG_CACHE) {
            try {
                const configKey = packet.operation.replace('getConfig', '').toLowerCase();

                await env.FANTASY_CONFIG_CACHE.put(
                    `config:${configKey}`,
                    JSON.stringify({
                        raw: packet.response.body,
                        timestamp: packet.timestamp,
                        capturedAt: new Date().toISOString(),
                        metadata: {
                            agentID: packet.request?.body?.agentID,
                            operation: packet.operation,
                        }
                    }),
                    { expirationTtl: 86400 } // 24 hours (config rarely changes)
                );

                console.log(`[${requestId}] ⚙️ Stored ${packet.operation} config in FANTASY_CONFIG_CACHE`);
            } catch (error) {
                console.warn(`[${requestId}] ⚠️ Failed to store config:`, error);
            }
        }

        // 🚀 FAST PATH: Push to queue and return immediately
        // The queue consumer will handle all database writes asynchronously
        if (env.FANTASY402_QUEUE) {
            await env.FANTASY402_QUEUE.send(packet);
            console.log(`[${requestId}] ✅ Queued for processing`);

            return new Response(JSON.stringify({
                success: true,
                message: 'Data queued for processing',
                requestId,
                timestamp: new Date().toISOString()
            }), {
                status: 202, // Accepted
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        // Fallback: Direct processing if queue unavailable
        console.log(`[${requestId}] ⚠️ Queue unavailable, processing directly`);

        // Extract and parse JWT tokens
        const jwtAuthHeader = packet.request.headers?.authorization;
        const tokens = extractAllTokens(jwtAuthHeader, packet.request.body);
        let jwtInfo = null;

        if (tokens.length > 0) {
            const tokenInfo = getTokenInfo(tokens[0]);
            jwtInfo = {
                userID: tokenInfo.userID,
                office: tokenInfo.office,
                expiresAt: tokenInfo.expiresAt,
                isExpired: tokenInfo.isExpired,
                valid: tokenInfo.valid
            };

            console.log(`[${requestId}] 🔐 JWT User: ${tokenInfo.userID}, Office: ${tokenInfo.office}, Expires: ${tokenInfo.expiresAt}`);

            // Store token info in KV for quick lookup
            if (tokenInfo.userID && tokenInfo.valid) {
                await env.TOKEN_STORE.put(`fantasy402:user:${tokenInfo.userID}`, tokens[0], {
                    expirationTtl: 3600 // 1 hour
                });
            }
        }

        // Generate unique ID for this packet
        const packetId = `${packet.timestamp}_${packet.endpoint}_${packet.operation}`.replace(/[^a-zA-Z0-9_-]/g, '_');

        // Store raw packet in KV for quick access
        const kvKey = `fantasy402:${packetId}`;
        await env.FANTASY_CACHE.put(kvKey, JSON.stringify({
            ...packet,
            jwt: jwtInfo
        }), {
            expirationTtl: 86400 * 7, // 7 days
            metadata: {
                endpoint: packet.endpoint,
                operation: packet.operation,
                agentID: packet.metadata.agentID || jwtInfo?.userID,
                office: jwtInfo?.office,
                timestamp: packet.timestamp
            }
        });

        console.log(`[${requestId}] ✅ Stored in KV: ${kvKey}`);

        // Store structured data in D1
        if (env.RAW_FEED_DB) {
            try {
                await env.RAW_FEED_DB.prepare(`
          INSERT INTO fantasy402_raw_feed (
            packet_id,
            timestamp,
            endpoint,
            operation,
            method,
            url,
            request_body,
            response_status,
            response_body,
            duration_ms,
            agent_id,
            customer_id,
            metadata
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
                    packetId,
                    packet.timestamp,
                    packet.endpoint,
                    packet.operation,
                    packet.method,
                    packet.url,
                    JSON.stringify(packet.request.body),
                    packet.response.status,
                    JSON.stringify(packet.response.body),
                    packet.metadata.duration,
                    packet.metadata.agentID || null,
                    packet.metadata.customerID || null,
                    JSON.stringify(packet.metadata)
                ).run();

                console.log(`[${requestId}] ✅ Stored in D1: ${packetId}`);
            } catch (dbError) {
                console.error(`[${requestId}] ❌ D1 error:`, dbError);
                // Don't fail the request if D1 fails
            }
        }

        // Parse and normalize response data
        const parsedData = extractOperationData(packet.operation, packet.response.body);

        // Extract and process specific operation types
        switch (packet.operation) {
            case 'authenticateCustomer':
                await processAuthentication(packet, parsedData, env, requestId);
                break;
            case 'getWeeklyFigureByAgentLite':
                await processWeeklyFigures(packet, parsedData, env, requestId);
                break;
            case 'getListAgenstByAgent':
                await processAgentList(packet, parsedData, env, requestId);
                break;
            case 'getSportsType':
                await processSportTypes(packet, parsedData, env, requestId);
                break;
            case 'getAccountInfoOwner':
                await processAccountInfo(packet, parsedData, env, requestId);
                break;
            case 'getAuthorizations':
                await processAuthorizations(packet, parsedData, env, requestId);
                break;
            case 'getAgentPerformance':
                await processAgentPerformance(packet, parsedData, env, requestId);
                break;
            case 'getInfoPlayer':
                await processPlayerInfo(packet, parsedData, env, requestId);
                break;
            case 'getPerformancePlayer':
                await processPlayerPerformance(packet, parsedData, env, requestId);
                break;
            case 'getTransactionList':
                await processTransactionList(packet, parsedData, env, requestId);
                break;
            case 'getPending':
                await processPendingWagers(packet, parsedData, env, requestId);
                break;
            case 'getReportPlayerAnalysis':
                await processPlayerAnalysis(packet, parsedData, env, requestId);
                break;
            // Add more operation handlers as needed
        }

        // Send to Analytics Engine - Basic packet metrics
        if (env.ANALYTICS_ENGINE) {
            env.ANALYTICS_ENGINE.writeDataPoint({
                blobs: [
                    packet.endpoint,
                    packet.operation,
                    packet.metadata.agentID || 'unknown'
                ],
                doubles: [
                    packet.response.status,
                    packet.metadata.duration
                ],
                indexes: [packetId]
            });

            // Additional analytics for specific operations
            if (packet.operation === 'getBetTicker' && packet.response?.body) {
                const betData = extractBetDataFromBetTicker(packet.response.body);
                const analytics = generateAnalyticsRollup(betData);

                // Steam move analytics
                env.ANALYTICS_ENGINE.writeDataPoint({
                    blobs: [
                        'steam_moves',
                        packet.metadata.agentID || 'system',
                        'betTicker'
                    ],
                    doubles: [
                        analytics.steamAlerts.length,
                        analytics.steamAlerts.reduce((sum, alert) => sum + Math.abs(alert.newLine - alert.oldLine), 0)
                    ],
                    indexes: [`steam-${packetId}`]
                });

                // Risk analytics by agent
                for (const [agentId, risk] of Object.entries(analytics.riskByAgent)) {
                    env.ANALYTICS_ENGINE.writeDataPoint({
                        blobs: [
                            'agent_risk',
                            agentId,
                            'betTicker'
                        ],
                        doubles: [risk, analytics.steamAlerts.length],
                        indexes: [`risk-${agentId}-${packetId}`]
                    });
                }
            }

            // Transaction analytics
            if (packet.operation === 'getTransactionHistory' && packet.response?.body) {
                const transactions = packet.response.body.LIST || packet.response.body.list || [];
                const betData = extractBetDataFromTransactions(transactions, packet.metadata);
                const analytics = generateAnalyticsRollup(betData);

                env.ANALYTICS_ENGINE.writeDataPoint({
                    blobs: [
                        'transaction_analytics',
                        packet.metadata.agentID || 'unknown',
                        'transaction_history'
                    ],
                    doubles: [
                        transactions.length,
                        Object.keys(analytics.riskByAgent).length
                    ],
                    indexes: [`tx-${packetId}`]
                });
            }

            // Pending wagers analytics
            if (packet.endpoint?.includes('getPending') && packet.response?.body) {
                const pending = packet.response.body.LIST || packet.response.body.list || [];
                const betData = extractBetDataFromPendingWagers(pending, packet.metadata);
                const analytics = generateAnalyticsRollup(betData);

                env.ANALYTICS_ENGINE.writeDataPoint({
                    blobs: [
                        'pending_wagers',
                        packet.metadata.agentID || 'unknown',
                        'pending_analysis'
                    ],
                    doubles: [
                        pending.length,
                        Object.values(analytics.riskByAgent).reduce((sum, risk) => sum + risk, 0)
                    ],
                    indexes: [`pending-${packetId}`]
                });
            }
        }

        return new Response(JSON.stringify({
            success: true,
            packetId,
            message: 'Data ingested successfully',
            requestId,
            timestamp: new Date().toISOString()
        }), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });

    } catch (error) {
        return createErrorResponse(error, requestId, '/api/fantasy402/ingest');
    }
}
