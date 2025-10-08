// Live Sports Data API Endpoint
// Processes and stores live sports data from Fantasy402

import { Errors, createErrorResponse } from '../utils/error-handler';
import type { Env } from '../types/cloudflare';
import { SportsDataProcessor } from './sports-processor';

export async function handleLiveSports(
    request: Request,
    env: Env,
    requestId: string
): Promise<Response> {
    try {
        console.log(`[${requestId}] 🏈 Processing live sports data`);

        // Parse request body
        const body = await request.json();

        if (!body.Scores || !Array.isArray(body.Scores)) {
            throw Errors.badRequest('Invalid sports data format. Expected Scores array.');
        }

        // Initialize sports processor
        const processor = new SportsDataProcessor(env, requestId);

        // Process sports data
        const processedData = await processor.processSportsData(body.Scores);

        // Store in Analytics Engine for tracking
        await env.ANALYTICS_ENGINE.writeDataPoint({
            blobs: [
                'sports_data_processed',
                requestId,
                `games_${processedData.games.length}`
            ],
            doubles: [
                processedData.games.length,
                processedData.sharpIndicators.length
            ],
            indexes: [`sports-${requestId}`]
        });

        console.log(`[${requestId}] ✅ Processed ${processedData.games.length} games, ${processedData.sharpIndicators.length} sharp indicators`);

        return new Response(JSON.stringify({
            success: true,
            message: 'Sports data processed successfully',
            data: {
                gamesProcessed: processedData.games.length,
                sharpIndicators: processedData.sharpIndicators.length,
                marketAnalysis: processedData.marketAnalysis
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
        console.error(`[${requestId}] ❌ Sports processing error:`, error);
        return createErrorResponse(error, requestId, '/api/sports/live');
    }
}
