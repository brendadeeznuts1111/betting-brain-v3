// Live Session Data API Endpoint
// Processes and stores live user session data from Fantasy402

import { Errors, createErrorResponse } from '../utils/error-handler';
import type { Env } from '../types/cloudflare';
import { SessionProcessor } from './session-processor';

export async function handleLiveSessions(
    request: Request,
    env: Env,
    requestId: string
): Promise<Response> {
    try {
        console.log(`[${requestId}] 👥 Processing live user session data`);

        // Parse request body
        const body = await request.json();
        
        if (!body.LIST || !Array.isArray(body.LIST)) {
            throw Errors.badRequest('Invalid session data format. Expected LIST array.');
        }

        // Initialize session processor
        const processor = new SessionProcessor(env, requestId);

        // Process session data
        const processedData = await processor.processSessionData(body.LIST);

        // Store in Analytics Engine for tracking
        await env.ANALYTICS_ENGINE.writeDataPoint({
            blobs: [
                'session_data_processed',
                requestId,
                `users_${processedData.uniqueUsers}`
            ],
            doubles: [
                processedData.totalSessions,
                processedData.uniqueUsers,
                processedData.networkAnalysis.vpnDetected
            ],
            indexes: [`sessions-${requestId}`]
        });

        console.log(`[${requestId}] ✅ Processed ${processedData.totalSessions} sessions from ${processedData.uniqueUsers} users`);

        return new Response(JSON.stringify({
            success: true,
            message: 'Session data processed successfully',
            data: {
                totalSessions: processedData.totalSessions,
                uniqueUsers: processedData.uniqueUsers,
                uniqueIPs: processedData.uniqueIPs,
                riskUsers: processedData.riskUsers.length,
                vpnDetected: processedData.networkAnalysis.vpnDetected,
                proxyDetected: processedData.networkAnalysis.proxyDetected,
                suspiciousPatterns: processedData.networkAnalysis.suspiciousPatterns,
                multiSessionUsers: processedData.multiSessionUsers.length,
                sharedIPUsers: processedData.sharedIPUsers.size
            },
            requestId,
            timestamp: new Date().toISOString()
        }), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-cache'
            }
        });

    } catch (error) {
        console.error(`[${requestId}] ❌ Session processing error:`, error);
        return createErrorResponse(error, requestId, '/api/sessions/live');
    }
}
