// Fantasy402 Data Ingestion Endpoint
// Receives intercepted API calls from browser extension

import { Errors, createErrorResponse } from '../utils/error-handler';
import type { Env } from '../types/cloudflare';
import { extractAllTokens, parseJWT, getTokenInfo } from '../utils/jwt-parser';
import { extractOperationData, normalizeObject } from '../utils/fantasy402-parser';

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

export async function handleFantasy402Ingest(
    request: Request,
    env: Env,
    requestId: string
): Promise<Response> {
    try {
        // Parse request body
        const packet: Fantasy402Packet = await request.json();

        console.log(`[${requestId}] 📥 Fantasy402 data:`, packet.endpoint, packet.operation);

        // Validate packet
        if (!packet.timestamp || !packet.endpoint) {
            throw Errors.validationError(['Missing required fields: timestamp, endpoint']);
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
        const authHeader = packet.request.headers?.authorization;
        const tokens = extractAllTokens(authHeader, packet.request.body);
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
            // Add more operation handlers as needed
        }

        // Send to Analytics Engine
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

        console.log(`[${requestId}] 👥 Processing agent list: ${agents.length} agents`);

        // Store agents in D1
        if (env.RAW_FEED_DB) {
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
                        agent.agentOwner || null,
                        agent.agentType || null,
                        agent.office || null,
                        packet.timestamp,
                        packet.timestamp
                    ).run();
                } catch (dbError) {
                    console.error(`[${requestId}] ❌ D1 error for agent ${agent.agentID}:`, dbError);
                }
            }

            console.log(`[${requestId}] ✅ Stored ${agents.length} agents in D1`);
        }

    } catch (error) {
        console.error(`[${requestId}] ❌ Error processing agent list:`, error);
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

