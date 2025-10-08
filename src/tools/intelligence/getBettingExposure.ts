/**
 * MCP Tool: Get Betting Exposure
 * Returns current exposure metrics for a given event
 */

import { Env, GetBettingExposureRequest as GetBettingExposureRequestSchema, BettingExposureResponse as BettingExposureResponseSchema } from '../../types/api';
import { createErrorResponse, Errors } from '../../utils/error-handler';
import { createDatabaseHelper } from '../../utils/database';
import { rateLimitGuard } from '../../guards/rateLimit';
import { costCapGuard } from '../../guards/costCap';

export async function getBettingExposure(request: Request, env: Env): Promise<Response> {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimitGuard.checkRateLimit(request);
    if (!rateLimitResult.allowed) {
      return createErrorResponse(Errors.rateLimit(), Date.now().toString(36), '/api/betting-exposure');
    }

    // Cost cap check
    const costCheck = await costCapGuard.checkRequest(request, env);
    if (!costCheck.allowed) {
      return createErrorResponse(Errors.serviceUnavailable('Cost cap exceeded'), Date.now().toString(36), '/api/betting-exposure');
    }

    // Parse and validate request
    const url = new URL(request.url);
    const params = {
      eid: url.searchParams.get('eid') || '',
      includeHistory: url.searchParams.get('includeHistory') === 'true',
      timeWindow: parseInt(url.searchParams.get('timeWindow') || '1')
    };


    // Validate input
    const validation = GetBettingExposureRequestSchema.safeParse(params);
    if (!validation.success) {
      return createErrorResponse(Errors.validationError(['eid is required']), Date.now().toString(36), '/api/betting-exposure');
    }

    // Query exposure data
    const db = createDatabaseHelper(env);
    const queryResult = await db.executeQuery<any>(
      `SELECT side, risk, net FROM exposure_tracking WHERE eid = ?`,
      [params.eid]
    );

    // Handle both {results: []} and [] formats
    const exposureData = Array.isArray(queryResult) ? queryResult : (queryResult as any).results || [];

    if (!exposureData || exposureData.length === 0) {
      return createErrorResponse(Errors.notFound('Betting exposure data'), Date.now().toString(36), '/api/betting-exposure');
    }

    // Build response
    let totalRisk = 0;
    let maxExposure = 0;
    const sides = exposureData.map((row: any) => {
      const risk = row.risk || 0;
      const net = row.net || 0;
      totalRisk += risk;
      maxExposure = Math.max(maxExposure, Math.abs(net));

      return {
        side: row.side as 'HOME' | 'AWAY',
        risk,
        net,
        percentage: risk > 0 ? (net / risk) * 100 : 0
      };
    });

    const response = {
      eid: params.eid,
      sides,
      totalRisk,
      maxExposure,
      lastUpdated: new Date().toISOString(),
      alertThreshold: {
        maxAmount: 50000,
        maxPercentage: 60
      }
    };

    // Validate response

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in getBettingExposure:', error);
    return createErrorResponse(Errors.databaseError('getBettingExposure query failed'), Date.now().toString(36), '/api/betting-exposure');
  }
}
