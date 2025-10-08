/**
 * MCP Tool: Get Betting Exposure
 * Returns current exposure metrics for a given event
 */

import { Env, GetBettingExposureRequest as GetBettingExposureRequestSchema, BettingExposureResponse as BettingExposureResponseSchema } from '../../types/api';
import { createErrorResponse } from '../../utils/error-handler';
import { createDatabaseHelper } from '../../utils/database';
import { rateLimitGuard } from '../../guards/rateLimit';
import { costCapGuard } from '../../guards/costCap';

export async function getBettingExposure(request: Request, env: Env): Promise<Response> {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimitGuard.checkRateLimit(request);
    if (!rateLimitResult.allowed) {
      return new Response(createErrorResponse('Rate limit exceeded', 'RATE_LIMIT', {
        retryAfter: rateLimitResult.retryAfter
      }), {
        status: 429,
        headers: { 
          'Content-Type': 'application/json',
          'Retry-After': String(rateLimitResult.retryAfter || 60)
        }
      });
    }

    // Cost cap check
    const costCheck = await costCapGuard.checkRequest(request, env);
    if (!costCheck.allowed) {
      return new Response(createErrorResponse('Cost cap exceeded', 'COST_CAP', {
        reason: costCheck.reason
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse and validate request
    const url = new URL(request.url);
    const params = {
      eid: url.searchParams.get('eid') || '',
      includeHistory: url.searchParams.get('includeHistory') === 'true',
      timeWindow: parseInt(url.searchParams.get('timeWindow') || '1')
    };


    // Query exposure data
    const db = createDatabaseHelper(env);
    const exposureData = await db.executeQuery<any>(
      `SELECT side, risk, net FROM exposure_tracking WHERE eid = ?`,
      [params.eid]
    );

    if (exposureData.length === 0) {
      return new Response(createErrorResponse('No exposure data found for event', 'NOT_FOUND'), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
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

    const response: BettingExposureResponse = {
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
    return new Response(createErrorResponse('Internal server error', 'INTERNAL_ERROR'), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
