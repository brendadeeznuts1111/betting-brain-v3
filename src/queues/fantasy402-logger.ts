// Fantasy402 Queue Consumer
// Processes queued API logs and writes them to D1 in batches

import type { Env } from '../types/cloudflare';
import { extractOperationData } from '../utils/fantasy402-parser';

interface Fantasy402LogMessage {
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

export async function processFantasy402Logs(
    batch: MessageBatch<Fantasy402LogMessage>,
    env: Env
): Promise<void> {
    console.log(`[Fantasy402 Logger] 📦 Processing batch of ${batch.messages.length} messages`);

    const statements: D1PreparedStatement[] = [];
    const kvWrites: Promise<void>[] = [];

    for (const message of batch.messages) {
        try {
            const packet = message.body;

            // Generate unique ID
            const packetId = `${packet.timestamp}_${packet.endpoint}_${packet.operation}`.replace(/[^a-zA-Z0-9_-]/g, '_');

            // Parse operation-specific data
            const parsedData = extractOperationData(packet.operation, packet.response.body);

            // Store in KV for quick access (non-blocking)
            kvWrites.push(
                env.FANTASY_CACHE.put(
                    `fantasy402:raw:${packetId}`,
                    JSON.stringify(packet),
                    { expirationTtl: 3600 } // 1 hour
                ).catch(error => {
                    console.error(`[Fantasy402 Logger] ❌ KV write failed for ${packetId}:`, error);
                })
            );

            // Prepare D1 insert statement
            if (env.RAW_FEED_DB) {
                statements.push(
                    env.RAW_FEED_DB.prepare(`
                        INSERT INTO fantasy402_raw_feed (
                            packet_id,
                            timestamp,
                            endpoint,
                            operation,
                            method,
                            url,
                            request_headers,
                            request_body,
                            response_status,
                            response_headers,
                            response_body,
                            response_size,
                            duration_ms,
                            agent_id,
                            customer_id,
                            user_agent,
                            page_url,
                            parsed_data
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `).bind(
                        packetId,
                        packet.timestamp,
                        packet.endpoint,
                        packet.operation,
                        packet.method,
                        packet.url,
                        JSON.stringify(packet.request.headers || {}),
                        JSON.stringify(packet.request.body || {}),
                        packet.response.status,
                        JSON.stringify(packet.response.headers || {}),
                        JSON.stringify(packet.response.body || {}),
                        packet.response.size || 0,
                        packet.metadata.duration,
                        packet.metadata.agentID || null,
                        packet.metadata.customerID || null,
                        packet.metadata.userAgent || null,
                        packet.metadata.pageUrl || null,
                        parsedData ? JSON.stringify(parsedData) : null
                    )
                );
            }

            // Handle operation-specific inserts
            if (parsedData && packet.operation === 'getAgentPerformance') {
                await handleAgentPerformance(packet, parsedData, env, statements);
            }

            // Acknowledge message immediately
            message.ack();

        } catch (error) {
            console.error(`[Fantasy402 Logger] ❌ Error processing message:`, error);
            // Don't ack - message will be retried
            message.retry();
        }
    }

    // Execute all D1 writes in a single batch transaction
    if (statements.length > 0 && env.RAW_FEED_DB) {
        try {
            const startTime = Date.now();
            await env.RAW_FEED_DB.batch(statements);
            const duration = Date.now() - startTime;
            console.log(`[Fantasy402 Logger] ✅ Batch inserted ${statements.length} records in ${duration}ms`);
        } catch (error) {
            console.error(`[Fantasy402 Logger] ❌ Batch insert failed:`, error);
            // Messages will be retried automatically by the queue
        }
    }

    // Wait for KV writes (non-blocking, best-effort)
    await Promise.allSettled(kvWrites);

    console.log(`[Fantasy402 Logger] ✅ Batch processing complete`);
}

async function handleAgentPerformance(
    packet: Fantasy402LogMessage,
    parsedData: any,
    env: Env,
    statements: D1PreparedStatement[]
): Promise<void> {
    const performance = parsedData.performance;

    if (!performance || !performance.agentID) return;

    console.log(`[Fantasy402 Logger] 📊 Agent Performance: ${performance.agentID} (${performance.agentOwner})`);

    // Store in KV for quick lookup
    const kvKey = `fantasy402:performance:${performance.agentID}:${performance.periodStart}:${performance.periodEnd}`;
    await env.FANTASY_CACHE.put(kvKey, JSON.stringify(performance), {
        expirationTtl: 3600
    }).catch(error => {
        console.error(`[Fantasy402 Logger] ❌ Performance KV write failed:`, error);
    });

    // Add to batch statements
    if (env.RAW_FEED_DB) {
        statements.push(
            env.RAW_FEED_DB.prepare(`
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
            )
        );

        // Add sport-specific records
        if (performance.sportBreakdown && performance.sportBreakdown.length > 0) {
            for (const sport of performance.sportBreakdown) {
                statements.push(
                    env.RAW_FEED_DB.prepare(`
                        INSERT INTO fantasy402_sport_performance (
                            agent_id,
                            sport,
                            risk,
                            win,
                            wager_count,
                            period_start,
                            period_end,
                            captured_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `).bind(
                        performance.agentID,
                        sport.sport,
                        sport.risk,
                        sport.win,
                        sport.count,
                        performance.periodStart,
                        performance.periodEnd,
                        packet.timestamp
                    )
                );
            }
        }
    }
}

