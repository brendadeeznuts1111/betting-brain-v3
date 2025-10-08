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

// Process authentication responses
async function processAuthentication(
    packet: Fantasy402Packet,
    parsedData: any,
    env: Env,
    requestId: string
): Promise<void> {
    try {
        const customerID = packet.request.body?.customerID;
        const authData = parsedData.auth;

        if (!customerID || !authData) return;

        console.log(`[${requestId}] 🔐 Processing auth for: ${customerID}, Success: ${authData.success}`);

        // Store in TOKEN_STORE
        if (authData.success && authData.token) {
            await env.TOKEN_STORE.put(`customer:${customerID}`, authData.token, {
                expirationTtl: 3600 // 1 hour
            });
            console.log(`[${requestId}] ✅ Stored token for: ${customerID}`);
        }

    } catch (error) {
        console.error(`[${requestId}] ❌ Error processing auth:`, error);
    }
}

// Process weekly figures
async function processWeeklyFigures(
    packet: Fantasy402Packet,
    parsedData: any,
    env: Env,
    requestId: string
): Promise<void> {
    try {
        const figures = parsedData.figures;

        if (!figures || !figures.agentID) return;

        console.log(`[${requestId}] 📊 Processing weekly figures for: ${figures.agentID}, Week: ${figures.weekNumber}`);

        // Store in D1
        if (env.RAW_FEED_DB) {
            try {
                await env.RAW_FEED_DB.prepare(`
          INSERT INTO fantasy402_weekly_figures (agent_id, week_number, week_year, figures_json, captured_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(agent_id, week_number, week_year) DO UPDATE SET
            figures_json = excluded.figures_json,
            captured_at = excluded.captured_at
        `).bind(
                    figures.agentID,
                    figures.weekNumber,
                    figures.year,
                    JSON.stringify(figures.figures),
                    packet.timestamp
                ).run();

                console.log(`[${requestId}] ✅ Stored weekly figures in D1`);
            } catch (dbError) {
                console.error(`[${requestId}] ❌ D1 error:`, dbError);
            }
        }

    } catch (error) {
        console.error(`[${requestId}] ❌ Error processing figures:`, error);
    }
}

// Process agent list
async function processAgentList(
    packet: Fantasy402Packet,
    parsedData: any,
    env: Env,
    requestId: string
): Promise<void> {
    try {
        const agents = parsedData.agents;

        if (!agents || !Array.isArray(agents)) return;

        const agentOwner = packet.request?.body?.agentOwner || packet.metadata?.agentID;
        const agentID = packet.request?.body?.agentID;

        console.log(`[${requestId}] 👥 Processing agent list: ${agents.length} agents (Owner: ${agentOwner})`);

        // Track cache metrics
        await incrementCacheMetric(env, 'agent_list_requests');

        // 🚀 FAST PATH: Cache in KV immediately (critical for login flow)
        if (env.FANTASY_CACHE) {
            // Create multiple cache keys for different lookup patterns
            const cacheKeys = [
                // Primary key: agent hierarchy by owner
                `fantasy402:agents:by-owner:${agentOwner}`,
                // Secondary key: by requesting agentID
                agentID && `fantasy402:agents:by-agent:${agentID}`,
                // Latest agents list (fallback)
                agentOwner && `fantasy402:agents:latest:${agentOwner}`
            ].filter(Boolean) as string[];

            const cacheData = {
                agents,
                agentOwner,
                agentID,
                count: agents.length,
                capturedAt: packet.timestamp,
                offices: [...new Set(agents.map((a: any) => a.office).filter(Boolean))],
                agentTypes: [...new Set(agents.map((a: any) => a.agentType).filter(Boolean))]
            };

            // Store in all cache keys (fast parallel writes)
            await Promise.all(
                cacheKeys.map(key =>
                    env.FANTASY_CACHE!.put(key, JSON.stringify(cacheData), {
                        expirationTtl: 3600 // 1 hour (safe during iteration)
                    })
                )
            );

            console.log(`[${requestId}] ✅ Cached ${agents.length} agents in ${cacheKeys.length} KV keys (1hr TTL)`);

            // Track successful cache write
            await incrementCacheMetric(env, 'agent_list_cache_writes');

            // Create indexed lookups for individual agents
            const indexPromises = agents.map((agent: any) => {
                if (!agent.agentID) return null;
                return env.FANTASY_CACHE!.put(
                    `fantasy402:agent:${agent.agentID}`,
                    JSON.stringify({
                        ...agent,
                        agentOwner,
                        capturedAt: packet.timestamp
                    }),
                    { expirationTtl: 3600 } // 1 hour TTL
                );
            }).filter(Boolean);

            await Promise.all(indexPromises);
            console.log(`[${requestId}] 🔍 Indexed ${indexPromises.length} individual agents`);
        }

        // 🐌 SLOW PATH: Only write to D1 if data changed (check cache first)
        if (env.RAW_FEED_DB && env.FANTASY_CACHE) {
            // Check if we have cached hash to detect changes
            const hashKey = `fantasy402:agents:hash:${agentOwner}`;
            const agentHash = JSON.stringify(agents.map((a: any) => ({
                id: a.agentID,
                owner: a.agentOwner,
                type: a.agentType,
                office: a.office
            })));
            const currentHash = await env.FANTASY_CACHE.get(hashKey);

            if (currentHash === agentHash) {
                console.log(`[${requestId}] ⚡ Agent list unchanged, skipping D1 writes`);
                await incrementCacheMetric(env, 'agent_list_d1_writes_skipped');
                return; // Skip D1 writes if data hasn't changed
            }

            // Track D1 write (data changed)
            await incrementCacheMetric(env, 'agent_list_d1_writes_executed');

            // Data changed - update hash and write to D1
            await env.FANTASY_CACHE.put(hashKey, agentHash, { expirationTtl: 3600 });

            for (const agent of agents) {
                try {
                    await env.RAW_FEED_DB.prepare(`
            INSERT INTO fantasy402_agents (agent_id, agent_owner, agent_type, office, first_seen, last_active, total_requests)
            VALUES (?, ?, ?, ?, ?, ?, 1)
            ON CONFLICT(agent_id) DO UPDATE SET
              agent_owner = excluded.agent_owner,
              agent_type = excluded.agent_type,
              office = excluded.office,
              last_active = excluded.last_active,
              total_requests = total_requests + 1
          `).bind(
                        agent.agentID,
                        agent.agentOwner || agentOwner || null,
                        agent.agentType || null,
                        agent.office || null,
                        packet.timestamp,
                        packet.timestamp
                    ).run();
                } catch (dbError) {
                    console.error(`[${requestId}] ❌ D1 error for agent ${agent.agentID}:`, dbError);
                }
            }

            console.log(`[${requestId}] ✅ Stored ${agents.length} agents in D1 (data changed)`);
        }

    } catch (error) {
        console.error(`[${requestId}] ❌ Error processing agent list:`, error);
    }
}

/**
 * Increment cache metric counter
 */
async function incrementCacheMetric(env: Env, metricName: string): Promise<void> {
    try {
        if (!env.FANTASY_CACHE) return;

        const key = `fantasy402:metrics:${metricName}`;
        const current = await env.FANTASY_CACHE.get(key);
        const count = current ? parseInt(current) : 0;

        await env.FANTASY_CACHE.put(key, String(count + 1), {
            expirationTtl: 86400 * 7 // 7 days
        });
    } catch (error) {
        // Don't fail the request if metrics fail
        console.warn('Failed to increment metric:', metricName, error);
    }
}

// Process sport types
async function processSportTypes(
    packet: Fantasy402Packet,
    parsedData: any,
    env: Env,
    requestId: string
): Promise<void> {
    try {
        const sportTypes = parsedData.sportTypes;

        if (!sportTypes || !Array.isArray(sportTypes)) return;

        console.log(`[${requestId}] 🏈 Processing sport types: ${sportTypes.length} sports`);
        console.log(`[${requestId}] 📋 Sports: ${sportTypes.join(', ')}`);

        // Store in KV for quick access
        await env.FANTASY_CACHE.put('fantasy402:sport_types', JSON.stringify(sportTypes), {
            expirationTtl: 86400 * 30 // 30 days (sport types rarely change)
        });

        console.log(`[${requestId}] ✅ Stored sport types in KV`);

    } catch (error) {
        console.error(`[${requestId}] ❌ Error processing sport types:`, error);
    }
}

// Process account info
async function processAccountInfo(
    packet: Fantasy402Packet,
    parsedData: any,
    env: Env,
    requestId: string
): Promise<void> {
    try {
        const account = parsedData.account;

        if (!account || !account.customerID) return;

        console.log(`[${requestId}] 💰 Processing account info for: ${account.customerID}`);
        console.log(`[${requestId}] 💵 Balance: $${account.currentBalance.toLocaleString()}, Available: $${account.availableBalance.toLocaleString()}`);
        console.log(`[${requestId}] 🏢 Office: ${account.office}, Type: ${account.agentType}, Status: ${account.active ? 'Active' : 'Inactive'}`);

        // Store in KV for quick access
        await env.FANTASY_CACHE.put(`fantasy402:account:${account.customerID}`, JSON.stringify(account), {
            expirationTtl: 300 // 5 minutes
        });

        // Store in D1 for historical tracking
        if (env.RAW_FEED_DB) {
            try {
                await env.RAW_FEED_DB.prepare(`
          INSERT INTO fantasy402_account_snapshots (
            customer_id,
            agent_id,
            office,
            agent_type,
            current_balance,
            available_balance,
            credit_limit,
            pending_wager_balance,
            free_play_balance,
            currency_code,
            active,
            suspend_sportsbook,
            read_only,
            wager_limit,
            minimum_wager,
            max_prop_payout,
            captured_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
                    account.customerID,
                    account.agentID || account.customerID,
                    account.office,
                    account.agentType,
                    account.currentBalance,
                    account.availableBalance,
                    account.creditLimit,
                    account.pendingWagerBalance,
                    account.freePlayBalance,
                    account.currencyCode,
                    account.active ? 1 : 0,
                    account.suspendSportsbook ? 1 : 0,
                    account.readOnly ? 1 : 0,
                    account.wagerLimit,
                    account.minimumWager,
                    account.maxPropPayout,
                    packet.timestamp
                ).run();

                console.log(`[${requestId}] ✅ Stored account snapshot in D1`);
            } catch (dbError) {
                console.error(`[${requestId}] ❌ D1 error:`, dbError);
            }
        }

    } catch (error) {
        console.error(`[${requestId}] ❌ Error processing account info:`, error);
    }
}

// Process authorizations
async function processAuthorizations(
    packet: Fantasy402Packet,
    parsedData: any,
    env: Env,
    requestId: string
): Promise<void> {
    try {
        const auth = parsedData.authorizations;

        if (!auth || !auth.agentID) return;

        console.log(`[${requestId}] 🔐 Processing authorizations for: ${auth.agentID}, Master: ${auth.masterAgentID}`);
        console.log(`[${requestId}] 💼 Permissions: DeleteBets=${auth.featureFlags.PermitDeleteBets}, SuspendWagering=${auth.featureFlags.SuspendWageringFlag}`);
        console.log(`[${requestId}] 💰 Financial: Commission=${auth.financialSettings.commissionPercent}%, InetRate=${auth.financialSettings.inetHeadCountRate}`);

        // Store in KV for quick access
        await env.FANTASY_CACHE.put(`fantasy402:auth:${auth.agentID}`, JSON.stringify(auth), {
            expirationTtl: 3600 // 1 hour
        });

        // Store in D1 for historical tracking
        if (env.RAW_FEED_DB) {
            try {
                await env.RAW_FEED_DB.prepare(`
          INSERT INTO fantasy402_authorizations (
            agent_id,
            customer_id,
            master_agent_id,
            master_login,
            permissions_json,
            commission_percent,
            inet_head_count_rate,
            charge_core_plus_inet,
            captured_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
                    auth.agentID,
                    auth.customerID,
                    auth.masterAgentID || null,
                    auth.masterLogin || null,
                    JSON.stringify(auth.permissions),
                    auth.financialSettings.commissionPercent,
                    auth.financialSettings.inetHeadCountRate,
                    auth.financialSettings.chargeCorePlusInet ? 1 : 0,
                    packet.timestamp
                ).run();

                console.log(`[${requestId}] ✅ Stored authorizations in D1`);
            } catch (dbError) {
                console.error(`[${requestId}] ❌ D1 error:`, dbError);
            }
        }

    } catch (error) {
        console.error(`[${requestId}] ❌ Error processing authorizations:`, error);
    }
}

// Process agent performance
async function processAgentPerformance(
    packet: Fantasy402Packet,
    parsedData: any,
    env: Env,
    requestId: string
): Promise<void> {
    try {
        const performance = parsedData.performance;

        if (!performance || !performance.agentID) return;

        console.log(`[${requestId}] 📊 Processing agent performance for: ${performance.agentID} (${performance.agentOwner})`);
        console.log(`[${requestId}] 📅 Period: ${performance.periodStart} → ${performance.periodEnd} (${performance.type})`);
        console.log(`[${requestId}] 💰 Risk: $${performance.totalRisk.toLocaleString()}, Win: $${performance.totalWin.toLocaleString()}, Net: $${performance.netIncome.toLocaleString()}`);
        console.log(`[${requestId}] 🎲 Wagers: ${performance.totalWagers} total (${performance.pendingWagers} pending, ${performance.settledWagers} settled)`);

        if (performance.sportBreakdown && performance.sportBreakdown.length > 0) {
            console.log(`[${requestId}] 🏈 Sports: ${performance.sportBreakdown.length} sports tracked`);
        }

        // Store in KV for quick access (latest performance)
        const kvKey = `fantasy402:performance:${performance.agentID}:${performance.periodStart}:${performance.periodEnd}`;
        await env.FANTASY_CACHE.put(kvKey, JSON.stringify(performance), {
            expirationTtl: 3600 // 1 hour
        });

        // Store in D1 for historical tracking
        if (env.RAW_FEED_DB) {
            try {
                // Insert main performance record
                const result = await env.RAW_FEED_DB.prepare(`
                    INSERT INTO fantasy402_agent_performance (
                        agent_id,
                        agent_owner,
                        period_start,
                        period_end,
                        period_type,
                        period_number,
                        period_name,
                        total_risk,
                        total_win,
                        total_commission,
                        net_income,
                        total_wagers,
                        pending_wagers,
                        settled_wagers,
                        free_play_used,
                        free_play_win,
                        sport_breakdown_json,
                        captured_at,
                        raw_response_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).bind(
                    performance.agentID,
                    performance.agentOwner || null,
                    performance.periodStart,
                    performance.periodEnd,
                    performance.type,
                    performance.period,
                    performance.periodName,
                    performance.totalRisk,
                    performance.totalWin,
                    performance.totalCommission,
                    performance.netIncome,
                    performance.totalWagers,
                    performance.pendingWagers,
                    performance.settledWagers,
                    performance.freePlayUsed,
                    performance.freePlayWin,
                    JSON.stringify(performance.sportBreakdown),
                    packet.timestamp,
                    JSON.stringify(performance.raw)
                ).run();

                console.log(`[${requestId}] ✅ Stored performance in D1`);

                // Insert sport-specific records if available
                if (performance.sportBreakdown && performance.sportBreakdown.length > 0) {
                    const performanceId = result.meta.last_row_id;

                    for (const sport of performance.sportBreakdown) {
                        try {
                            await env.RAW_FEED_DB.prepare(`
                                INSERT INTO fantasy402_sport_performance (
                                    performance_id,
                                    agent_id,
                                    sport,
                                    risk,
                                    win,
                                    wager_count,
                                    period_start,
                                    period_end,
                                    captured_at
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                            `).bind(
                                performanceId,
                                performance.agentID,
                                sport.sport,
                                sport.risk,
                                sport.win,
                                sport.count,
                                performance.periodStart,
                                performance.periodEnd,
                                packet.timestamp
                            ).run();
                        } catch (sportError) {
                            console.error(`[${requestId}] ❌ D1 error for sport ${sport.sport}:`, sportError);
                        }
                    }

                    console.log(`[${requestId}] ✅ Stored ${performance.sportBreakdown.length} sport breakdown records`);
                }

            } catch (dbError) {
                console.error(`[${requestId}] ❌ D1 error:`, dbError);
            }
        }

    } catch (error) {
        console.error(`[${requestId}] ❌ Error processing agent performance:`, error);
    }
}

// Process player information
async function processPlayerInfo(
    packet: Fantasy402Packet,
    parsedData: any,
    env: Env,
    requestId: string
): Promise<void> {
    try {
        const player = parsedData.player;

        if (!player || !player.customerID) return;

        console.log(`[${requestId}] 👤 Processing player info for: ${player.customerID}`);
        console.log(`[${requestId}] 🏷️ Name: ${player.playerName || 'N/A'}, Type: ${player.playerType || 'N/A'}`);
        console.log(`[${requestId}] 🏢 Office: ${player.office || 'N/A'}, Status: ${player.status || 'N/A'}`);
        console.log(`[${requestId}] 💰 Balance: $${(player.availableBalance || 0).toLocaleString()}, Risk: $${(player.totalRisk || 0).toLocaleString()}`);
        console.log(`[${requestId}] 🎲 Wagers: ${player.totalWagers || 0}, Net: $${(player.netIncome || 0).toLocaleString()}`);

        // Store in KV for quick access
        await env.FANTASY_CACHE.put(`fantasy402:player:${player.customerID}`, JSON.stringify(player), {
            expirationTtl: 300 // 5 minutes
        });

        // Store in D1 for historical tracking
        if (env.RAW_FEED_DB) {
            try {
                await env.RAW_FEED_DB.prepare(`
                    INSERT INTO fantasy402_players (
                        customer_id,
                        agent_id,
                        player_name,
                        player_type,
                        office,
                        status,
                        registration_date,
                        last_login,
                        total_wagers,
                        total_risk,
                        total_win,
                        net_income,
                        commission_rate,
                        credit_limit,
                        available_balance,
                        pending_balance,
                        free_play_balance,
                        currency_code,
                        active,
                        suspend_sportsbook,
                        read_only,
                        wager_limit,
                        minimum_wager,
                        max_prop_payout,
                        permissions_json,
                        preferences_json,
                        contact_info_json,
                        raw_response_json,
                        captured_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(customer_id) DO UPDATE SET
                        agent_id = excluded.agent_id,
                        player_name = excluded.player_name,
                        player_type = excluded.player_type,
                        office = excluded.office,
                        status = excluded.status,
                        last_login = excluded.last_login,
                        total_wagers = excluded.total_wagers,
                        total_risk = excluded.total_risk,
                        total_win = excluded.total_win,
                        net_income = excluded.net_income,
                        commission_rate = excluded.commission_rate,
                        credit_limit = excluded.credit_limit,
                        available_balance = excluded.available_balance,
                        pending_balance = excluded.pending_balance,
                        free_play_balance = excluded.free_play_balance,
                        active = excluded.active,
                        suspend_sportsbook = excluded.suspend_sportsbook,
                        read_only = excluded.read_only,
                        wager_limit = excluded.wager_limit,
                        minimum_wager = excluded.minimum_wager,
                        max_prop_payout = excluded.max_prop_payout,
                        permissions_json = excluded.permissions_json,
                        preferences_json = excluded.preferences_json,
                        contact_info_json = excluded.contact_info_json,
                        raw_response_json = excluded.raw_response_json,
                        captured_at = excluded.captured_at,
                        updated_at = CURRENT_TIMESTAMP
                `).bind(
                    player.customerID,
                    player.agentID || packet.metadata.agentID,
                    player.playerName || null,
                    player.playerType || null,
                    player.office || null,
                    player.status || null,
                    player.registrationDate || null,
                    player.lastLogin || null,
                    player.totalWagers || 0,
                    player.totalRisk || 0,
                    player.totalWin || 0,
                    player.netIncome || 0,
                    player.commissionRate || 0,
                    player.creditLimit || 0,
                    player.availableBalance || 0,
                    player.pendingBalance || 0,
                    player.freePlayBalance || 0,
                    player.currencyCode || 'USD',
                    player.active ? 1 : 0,
                    player.suspendSportsbook ? 1 : 0,
                    player.readOnly ? 1 : 0,
                    player.wagerLimit || 0,
                    player.minimumWager || 0,
                    player.maxPropPayout || 0,
                    JSON.stringify(player.permissions || {}),
                    JSON.stringify(player.preferences || {}),
                    JSON.stringify(player.contactInfo || {}),
                    JSON.stringify(player.raw || packet.response.body),
                    packet.timestamp
                ).run();

                console.log(`[${requestId}] ✅ Stored player info in D1`);

                // Track this as player activity
                await env.RAW_FEED_DB.prepare(`
                    INSERT INTO fantasy402_player_activity (
                        customer_id,
                        agent_id,
                        activity_type,
                        activity_description,
                        amount,
                        balance_before,
                        balance_after,
                        metadata_json,
                        captured_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).bind(
                    player.customerID,
                    player.agentID || packet.metadata.agentID,
                    'info_request',
                    'Player information requested',
                    null,
                    null,
                    player.availableBalance || 0,
                    JSON.stringify({
                        requestId,
                        endpoint: packet.endpoint,
                        operation: packet.operation,
                        playerType: player.playerType,
                        status: player.status
                    }),
                    packet.timestamp
                ).run();

                console.log(`[${requestId}] ✅ Tracked player activity`);

            } catch (dbError) {
                console.error(`[${requestId}] ❌ D1 error:`, dbError);
            }
        }

    } catch (error) {
        console.error(`[${requestId}] ❌ Error processing player info:`, error);
    }
}

// Process player performance
async function processPlayerPerformance(
    packet: Fantasy402Packet,
    parsedData: any,
    env: Env,
    requestId: string
): Promise<void> {
    try {
        const performance = parsedData.performance;

        if (!performance || !performance.customerID) return;

        console.log(`[${requestId}] 📊 Processing player performance for: ${performance.customerID}`);
        console.log(`[${requestId}] 📅 Period: ${performance.periodStart} → ${performance.periodEnd} (${performance.type})`);
        console.log(`[${requestId}] 💰 Risk: $${performance.totalRisk.toLocaleString()}, Win: $${performance.totalWin.toLocaleString()}, Net: $${performance.netIncome.toLocaleString()}`);
        console.log(`[${requestId}] 🎲 Wagers: ${performance.totalWagers} total (${performance.pendingWagers} pending, ${performance.settledWagers} settled)`);

        if (performance.sportBreakdown && performance.sportBreakdown.length > 0) {
            console.log(`[${requestId}] 🏈 Sports: ${performance.sportBreakdown.length} sports tracked`);
        }

        // Store in KV for quick access (latest performance)
        const kvKey = `fantasy402:player-performance:${performance.customerID}:${performance.periodStart}:${performance.periodEnd}`;
        await env.FANTASY_CACHE.put(kvKey, JSON.stringify(performance), {
            expirationTtl: 3600 // 1 hour
        });

        // Store in D1 for historical tracking
        if (env.RAW_FEED_DB) {
            try {
                // Insert main performance record
                const result = await env.RAW_FEED_DB.prepare(`
                    INSERT INTO fantasy402_player_performance (
                        customer_id,
                        agent_id,
                        period_start,
                        period_end,
                        period_type,
                        period_number,
                        period_name,
                        total_risk,
                        total_win,
                        total_commission,
                        net_income,
                        total_wagers,
                        pending_wagers,
                        settled_wagers,
                        free_play_used,
                        free_play_win,
                        sport_breakdown_json,
                        captured_at,
                        raw_response_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).bind(
                    performance.customerID,
                    performance.agentID || packet.metadata.agentID,
                    performance.periodStart,
                    performance.periodEnd,
                    performance.type,
                    performance.period,
                    performance.periodName,
                    performance.totalRisk,
                    performance.totalWin,
                    performance.totalCommission,
                    performance.netIncome,
                    performance.totalWagers,
                    performance.pendingWagers,
                    performance.settledWagers,
                    performance.freePlayUsed,
                    performance.freePlayWin,
                    JSON.stringify(performance.sportBreakdown),
                    packet.timestamp,
                    JSON.stringify(performance.raw)
                ).run();

                console.log(`[${requestId}] ✅ Stored player performance in D1`);

                // Insert sport-specific records if available
                if (performance.sportBreakdown && performance.sportBreakdown.length > 0) {
                    const performanceId = result.meta.last_row_id;

                    for (const sport of performance.sportBreakdown) {
                        try {
                            await env.RAW_FEED_DB.prepare(`
                                INSERT INTO fantasy402_player_sport_performance (
                                    performance_id,
                                    customer_id,
                                    agent_id,
                                    sport,
                                    risk,
                                    win,
                                    wager_count,
                                    period_start,
                                    period_end,
                                    captured_at
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            `).bind(
                                performanceId,
                                performance.customerID,
                                performance.agentID || packet.metadata.agentID,
                                sport.sport,
                                sport.risk,
                                sport.win,
                                sport.count,
                                performance.periodStart,
                                performance.periodEnd,
                                packet.timestamp
                            ).run();
                        } catch (sportError) {
                            console.error(`[${requestId}] ❌ D1 error for sport ${sport.sport}:`, sportError);
                        }
                    }

                    console.log(`[${requestId}] ✅ Stored ${performance.sportBreakdown.length} sport breakdown records`);
                }

            } catch (dbError) {
                console.error(`[${requestId}] ❌ D1 error:`, dbError);
            }
        }

    } catch (error) {
        console.error(`[${requestId}] ❌ Error processing player performance:`, error);
    }
}

// Process transaction list
async function processTransactionList(
    packet: Fantasy402Packet,
    parsedData: any,
    env: Env,
    requestId: string
): Promise<void> {
    try {
        const transactions = parsedData.transactions;

        if (!transactions || !Array.isArray(transactions)) return;

        console.log(`[${requestId}] 💳 Processing transaction list: ${transactions.length} transactions`);

        // Calculate summary statistics
        const summary = {
            totalTransactions: transactions.length,
            totalWagerLoss: 0,
            totalWagerWin: 0,
            totalCasinoWin: 0,
            totalCasinoLoss: 0,
            totalDeposits: 0,
            totalWithdrawals: 0,
            netBalance: 0
        };

        // Process each transaction
        for (const transaction of transactions) {
            const amount = transaction.amount || 0;
            const tranCode = transaction.tranCode || '';
            const tranType = transaction.tranType || '';

            // Update summary based on transaction type
            if (tranCode === 'D' && tranType === 'L') {
                summary.totalWagerLoss += amount;
                summary.netBalance -= amount;
            } else if (tranCode === 'C' && tranType === 'W') {
                summary.totalWagerWin += amount;
                summary.netBalance += amount;
            } else if (tranCode === 'C' && tranType === 'X') {
                summary.totalCasinoWin += amount;
                summary.netBalance += amount;
            } else if (tranCode === 'D' && tranType === 'X') {
                summary.totalCasinoLoss += amount;
                summary.netBalance -= amount;
            } else if (tranCode === 'C' && tranType === 'E') {
                summary.totalDeposits += amount;
                summary.netBalance += amount;
            } else if (tranCode === 'D' && tranType === 'E') {
                summary.totalWithdrawals += amount;
                summary.netBalance -= amount;
            }
        }

        console.log(`[${requestId}] 📊 Summary: Wager Loss: $${summary.totalWagerLoss.toFixed(2)}, Wager Win: $${summary.totalWagerWin.toFixed(2)}`);
        console.log(`[${requestId}] 🎰 Casino: Win: $${summary.totalCasinoWin.toFixed(2)}, Loss: $${summary.totalCasinoLoss.toFixed(2)}`);
        console.log(`[${requestId}] 💰 Deposits: $${summary.totalDeposits.toFixed(2)}, Withdrawals: $${summary.totalWithdrawals.toFixed(2)}`);
        console.log(`[${requestId}] 📈 Net Balance: $${summary.netBalance.toFixed(2)}`);

        // Store in KV for quick access (latest transaction list)
        const kvKey = `fantasy402:transactions:${packet.metadata.customerID}:${Date.now()}`;
        await env.FANTASY_CACHE.put(kvKey, JSON.stringify({
            transactions,
            summary,
            capturedAt: packet.timestamp
        }), {
            expirationTtl: 3600 // 1 hour
        });

        // Store in D1 for historical tracking
        if (env.RAW_FEED_DB) {
            try {
                // Insert transaction records
                for (const transaction of transactions) {
                    try {
                        await env.RAW_FEED_DB.prepare(`
                            INSERT INTO fantasy402_transactions (
                                document_number,
                                customer_id,
                                agent_id,
                                tran_code,
                                tran_type,
                                amount,
                                description,
                                tran_date_time,
                                hold_amount,
                                grade_num,
                                entered_by,
                                balance,
                                captured_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            ON CONFLICT(document_number) DO UPDATE SET
                                amount = excluded.amount,
                                balance = excluded.balance,
                                captured_at = excluded.captured_at
                        `).bind(
                            transaction.documentNumber,
                            packet.metadata.customerID,
                            packet.metadata.agentID,
                            transaction.tranCode,
                            transaction.tranType,
                            transaction.amount,
                            transaction.description,
                            transaction.tranDateTime,
                            transaction.holdAmount,
                            transaction.gradeNum,
                            transaction.enteredBy,
                            transaction.balance,
                            packet.timestamp
                        ).run();
                    } catch (txError) {
                        console.error(`[${requestId}] ❌ D1 error for transaction ${transaction.documentNumber}:`, txError);
                    }
                }

                console.log(`[${requestId}] ✅ Stored ${transactions.length} transactions in D1`);

                // Store summary record
                await env.RAW_FEED_DB.prepare(`
                    INSERT INTO fantasy402_transaction_summary (
                        customer_id,
                        agent_id,
                        total_transactions,
                        total_wager_loss,
                        total_wager_win,
                        total_casino_win,
                        total_casino_loss,
                        total_deposits,
                        total_withdrawals,
                        net_balance,
                        captured_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).bind(
                    packet.metadata.customerID,
                    packet.metadata.agentID,
                    summary.totalTransactions,
                    summary.totalWagerLoss,
                    summary.totalWagerWin,
                    summary.totalCasinoWin,
                    summary.totalCasinoLoss,
                    summary.totalDeposits,
                    summary.totalWithdrawals,
                    summary.netBalance,
                    packet.timestamp
                ).run();

                console.log(`[${requestId}] ✅ Stored transaction summary in D1`);

            } catch (dbError) {
                console.error(`[${requestId}] ❌ D1 error:`, dbError);
            }
        }

    } catch (error) {
        console.error(`[${requestId}] ❌ Error processing transaction list:`, error);
    }
}

// Process pending wagers
async function processPendingWagers(
    packet: Fantasy402Packet,
    parsedData: any,
    env: Env,
    requestId: string
): Promise<void> {
    try {
        const pendingWagers = parsedData.pendingWagers;

        if (!pendingWagers || !Array.isArray(pendingWagers)) return;

        console.log(`[${requestId}] ⏳ Processing pending wagers: ${pendingWagers.length} wagers`);

        // Calculate summary statistics
        const summary = {
            totalWagers: pendingWagers.length,
            totalRisk: 0,
            totalPotentialWin: 0,
            totalStake: 0,
            averageOdds: 0,
            sportBreakdown: {} as Record<string, number>,
            betTypeBreakdown: {} as Record<string, number>
        };

        // Process each pending wager
        for (const wager of pendingWagers) {
            const risk = wager.risk || 0;
            const potentialWin = wager.potentialWin || 0;
            const stake = wager.stake || 0;
            const odds = wager.odds || 0;
            const sport = wager.sport || 'Unknown';
            const betType = wager.betType || 'Unknown';

            summary.totalRisk += risk;
            summary.totalPotentialWin += potentialWin;
            summary.totalStake += stake;
            summary.averageOdds += odds;

            // Sport breakdown
            if (!summary.sportBreakdown[sport]) {
                summary.sportBreakdown[sport] = 0;
            }
            summary.sportBreakdown[sport] += risk;

            // Bet type breakdown
            if (!summary.betTypeBreakdown[betType]) {
                summary.betTypeBreakdown[betType] = 0;
            }
            summary.betTypeBreakdown[betType] += risk;
        }

        // Calculate average odds
        if (summary.totalWagers > 0) {
            summary.averageOdds = summary.averageOdds / summary.totalWagers;
        }

        console.log(`[${requestId}] 📊 Summary: ${summary.totalWagers} wagers, $${summary.totalRisk.toFixed(2)} risk, $${summary.totalPotentialWin.toFixed(2)} potential win`);
        console.log(`[${requestId}] 🎯 Average Odds: ${summary.averageOdds.toFixed(2)}, Total Stake: $${summary.totalStake.toFixed(2)}`);
        console.log(`[${requestId}] 🏈 Sports: ${Object.keys(summary.sportBreakdown).join(', ')}`);
        console.log(`[${requestId}] 🎲 Bet Types: ${Object.keys(summary.betTypeBreakdown).join(', ')}`);

        // Store in KV for quick access (latest pending wagers)
        const kvKey = `fantasy402:pending:${packet.metadata.customerID}:${Date.now()}`;
        await env.FANTASY_CACHE.put(kvKey, JSON.stringify({
            pendingWagers,
            summary,
            capturedAt: packet.timestamp
        }), {
            expirationTtl: 300 // 5 minutes (pending wagers change frequently)
        });

        // Store in D1 for historical tracking
        if (env.RAW_FEED_DB) {
            try {
                // Insert pending wager records
                for (const wager of pendingWagers) {
                    try {
                        await env.RAW_FEED_DB.prepare(`
                            INSERT INTO fantasy402_pending_wagers (
                                wager_id,
                                customer_id,
                                agent_id,
                                sport,
                                bet_type,
                                stake,
                                odds,
                                risk,
                                potential_win,
                                event_id,
                                event_name,
                                wager_date,
                                status,
                                description,
                                captured_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            ON CONFLICT(wager_id) DO UPDATE SET
                                stake = excluded.stake,
                                odds = excluded.odds,
                                risk = excluded.risk,
                                potential_win = excluded.potential_win,
                                status = excluded.status,
                                captured_at = excluded.captured_at
                        `).bind(
                            wager.wagerId || wager.id,
                            packet.metadata.customerID,
                            packet.metadata.agentID,
                            wager.sport,
                            wager.betType,
                            wager.stake,
                            wager.odds,
                            wager.risk,
                            wager.potentialWin,
                            wager.eventId,
                            wager.eventName,
                            wager.wagerDate,
                            wager.status || 'Pending',
                            wager.description,
                            packet.timestamp
                        ).run();
                    } catch (wagerError) {
                        console.error(`[${requestId}] ❌ D1 error for wager ${wager.wagerId}:`, wagerError);
                    }
                }

                console.log(`[${requestId}] ✅ Stored ${pendingWagers.length} pending wagers in D1`);

                // Store summary record
                await env.RAW_FEED_DB.prepare(`
                    INSERT INTO fantasy402_pending_summary (
                        customer_id,
                        agent_id,
                        total_wagers,
                        total_risk,
                        total_potential_win,
                        total_stake,
                        average_odds,
                        sport_breakdown_json,
                        bet_type_breakdown_json,
                        captured_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).bind(
                    packet.metadata.customerID,
                    packet.metadata.agentID,
                    summary.totalWagers,
                    summary.totalRisk,
                    summary.totalPotentialWin,
                    summary.totalStake,
                    summary.averageOdds,
                    JSON.stringify(summary.sportBreakdown),
                    JSON.stringify(summary.betTypeBreakdown),
                    packet.timestamp
                ).run();

                console.log(`[${requestId}] ✅ Stored pending summary in D1`);

            } catch (dbError) {
                console.error(`[${requestId}] ❌ D1 error:`, dbError);
            }
        }

    } catch (error) {
        console.error(`[${requestId}] ❌ Error processing pending wagers:`, error);
    }
}

// Process player analysis report
async function processPlayerAnalysis(
    packet: Fantasy402Packet,
    parsedData: any,
    env: Env,
    requestId: string
): Promise<void> {
    try {
        const analysis = parsedData.analysis;

        if (!analysis) return;

        console.log(`[${requestId}] 📊 Processing player analysis report`);
        console.log(`[${requestId}] 📅 Report Period: ${analysis.startDate} → ${analysis.endDate}`);
        console.log(`[${requestId}] 🎯 Line Type: ${analysis.lineType || 'All'}`);
        console.log(`[${requestId}] 👤 Customer: ${analysis.customerID || packet.metadata.customerID}`);

        // Extract key metrics
        const metrics = {
            totalWagers: analysis.totalWagers || 0,
            totalRisk: analysis.totalRisk || 0,
            totalWin: analysis.totalWin || 0,
            netIncome: analysis.netIncome || 0,
            winRate: analysis.winRate || 0,
            averageOdds: analysis.averageOdds || 0,
            sportsBreakdown: analysis.sportsBreakdown || {},
            betTypesBreakdown: analysis.betTypesBreakdown || {},
            timeBreakdown: analysis.timeBreakdown || {}
        };

        console.log(`[${requestId}] 📈 Metrics: ${metrics.totalWagers} wagers, $${metrics.totalRisk.toFixed(2)} risk, $${metrics.totalWin.toFixed(2)} win`);
        console.log(`[${requestId}] 📊 Performance: ${(metrics.winRate * 100).toFixed(1)}% win rate, $${metrics.netIncome.toFixed(2)} net`);

        // Store in KV for quick access (latest analysis)
        const kvKey = `fantasy402:player-analysis:${packet.metadata.customerID}:${Date.now()}`;
        await env.FANTASY_CACHE.put(kvKey, JSON.stringify({
            analysis,
            metrics,
            capturedAt: packet.timestamp
        }), {
            expirationTtl: 3600 // 1 hour
        });

        // Store in D1 for historical tracking
        if (env.RAW_FEED_DB) {
            try {
                // Insert main analysis record
                await env.RAW_FEED_DB.prepare(`
                    INSERT INTO fantasy402_player_analysis (
                        customer_id,
                        agent_id,
                        report_type,
                        start_date,
                        end_date,
                        line_type,
                        total_wagers,
                        total_risk,
                        total_win,
                        net_income,
                        win_rate,
                        average_odds,
                        sports_breakdown_json,
                        bet_types_breakdown_json,
                        time_breakdown_json,
                        raw_analysis_json,
                        captured_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).bind(
                    packet.metadata.customerID,
                    packet.metadata.agentID,
                    analysis.reportType || 'PlayerAnalysis',
                    analysis.startDate,
                    analysis.endDate,
                    analysis.lineType || 'All',
                    metrics.totalWagers,
                    metrics.totalRisk,
                    metrics.totalWin,
                    metrics.netIncome,
                    metrics.winRate,
                    metrics.averageOdds,
                    JSON.stringify(metrics.sportsBreakdown),
                    JSON.stringify(metrics.betTypesBreakdown),
                    JSON.stringify(metrics.timeBreakdown),
                    JSON.stringify(analysis.raw || packet.response.body),
                    packet.timestamp
                ).run();

                console.log(`[${requestId}] ✅ Stored player analysis in D1`);

                // Store sport-specific records if available
                if (metrics.sportsBreakdown && Object.keys(metrics.sportsBreakdown).length > 0) {
                    for (const [sport, data] of Object.entries(metrics.sportsBreakdown)) {
                        try {
                            await env.RAW_FEED_DB.prepare(`
                                INSERT INTO fantasy402_player_sport_analysis (
                                    customer_id,
                                    agent_id,
                                    sport,
                                    wager_count,
                                    total_risk,
                                    total_win,
                                    net_income,
                                    win_rate,
                                    start_date,
                                    end_date,
                                    captured_at
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            `).bind(
                                packet.metadata.customerID,
                                packet.metadata.agentID,
                                sport,
                                (data as any).wagerCount || 0,
                                (data as any).totalRisk || 0,
                                (data as any).totalWin || 0,
                                (data as any).netIncome || 0,
                                (data as any).winRate || 0,
                                analysis.startDate,
                                analysis.endDate,
                                packet.timestamp
                            ).run();
                        } catch (sportError) {
                            console.error(`[${requestId}] ❌ D1 error for sport ${sport}:`, sportError);
                        }
                    }

                    console.log(`[${requestId}] ✅ Stored ${Object.keys(metrics.sportsBreakdown).length} sport analysis records`);
                }

            } catch (dbError) {
                console.error(`[${requestId}] ❌ D1 error:`, dbError);
            }
        }

    } catch (error) {
        console.error(`[${requestId}] ❌ Error processing player analysis:`, error);
    }
}

/**
 * Extract bet data from BetTicker response for analytics
 * @param betTickerResponse Raw BetTicker API response
 * @returns Array of bet data for analytics processing
 */
function extractBetDataFromBetTicker(betTickerResponse: any): BetData[] {
    const betData: BetData[] = [];

    try {
        // BetTicker response structure varies, try common patterns
        const events = betTickerResponse.events || betTickerResponse.Events || betTickerResponse.data || [];

        for (const event of events) {
            if (!event || typeof event !== 'object') continue;

            const gameId = event.gameId || event.game_id || event.id;
            const lines = event.lines || event.Lines || [];

            for (const line of lines) {
                if (!line || typeof line !== 'object') continue;

                // Extract line movement data
                const oldLine = line.oldLine || line.old_line || line.previousLine;
                const newLine = line.newLine || line.new_line || line.currentLine;
                const timestamp = line.timestamp || line.updated_at || line.time;

                if (oldLine !== undefined && newLine !== undefined) {
                    betData.push({
                        gameId: gameId?.toString(),
                        oldLine: Number(oldLine),
                        newLine: Number(newLine),
                        timestamp: timestamp?.toString(),
                        // BetTicker doesn't have agent/customer info, use defaults
                        agentId: 'betTicker',
                        customerId: 'system',
                        stake: 0,
                        odds: 1,
                        side: 'home' // Default side
                    });
                }
            }
        }
    } catch (error) {
        console.warn('Failed to extract bet data from BetTicker response:', error);
    }

    return betData;
}

/**
 * Extract bet data from pending wagers for analytics
 * @param pendingWagers Array of pending wager data
 * @param metadata Packet metadata containing agent/customer info
 * @returns Array of bet data for analytics processing
 */
function extractBetDataFromPendingWagers(pendingWagers: any[], metadata: any): BetData[] {
    const betData: BetData[] = [];

    try {
        for (const wager of pendingWagers) {
            if (!wager || typeof wager !== 'object') continue;

            betData.push({
                agentId: metadata.agentID || wager.agentID,
                customerId: metadata.customerID || wager.customerID,
                gameId: wager.gameId || wager.eventId || wager.event_id,
                stake: wager.stake || wager.amount || 0,
                odds: wager.odds || wager.line || 1,
                side: wager.side || (wager.betType === 'home' ? 'home' : 'away'),
                timestamp: wager.timestamp || wager.createdAt || wager.date,
                // Pending wagers don't have line movement data
                oldLine: undefined,
                newLine: undefined
            });
        }
    } catch (error) {
        console.warn('Failed to extract bet data from pending wagers:', error);
    }

    return betData;
}

/**
 * Extract bet data from transaction history for analytics
 * @param transactions Array of transaction data
 * @param metadata Packet metadata containing agent/customer info
 * @returns Array of bet data for analytics processing
 */
function extractBetDataFromTransactions(transactions: any[], metadata: any): BetData[] {
    const betData: BetData[] = [];

    try {
        for (const transaction of transactions) {
            if (!transaction || typeof transaction !== 'object') continue;

            // Only process betting transactions (not deposits/withdrawals)
            const tranCode = transaction.tranCode || '';
            const tranType = transaction.tranType || '';

            if (tranCode === 'D' && (tranType === 'L' || tranType === 'X')) {
                // Betting loss transaction
                betData.push({
                    agentId: metadata.agentID || transaction.agentID,
                    customerId: metadata.customerID || transaction.customerID,
                    gameId: transaction.eventId || transaction.gameId,
                    stake: Math.abs(transaction.amount || 0),
                    odds: 1.0, // Default odds for transaction data
                    side: 'home', // Default side
                    timestamp: transaction.tranDateTime || transaction.timestamp,
                    // Transactions don't have line movement data
                    oldLine: undefined,
                    newLine: undefined
                });
            } else if (tranCode === 'C' && (tranType === 'W' || tranType === 'X')) {
                // Betting win transaction
                betData.push({
                    agentId: metadata.agentID || transaction.agentID,
                    customerId: metadata.customerID || transaction.customerID,
                    gameId: transaction.eventId || transaction.gameId,
                    stake: Math.abs(transaction.amount || 0),
                    odds: 1.0, // Default odds for transaction data
                    side: 'away', // Default side
                    timestamp: transaction.tranDateTime || transaction.timestamp,
                    // Transactions don't have line movement data
                    oldLine: undefined,
                    newLine: undefined
                });
            }
        }
    } catch (error) {
        console.warn('Failed to extract bet data from transactions:', error);
    }

    return betData;
}

