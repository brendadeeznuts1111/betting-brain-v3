/**
 * MCP Tool: Get Hold Percentage
 * Returns hold percentage and volume metrics for an event
 */

import { Env, GetHoldPercentageRequest, HoldPercentageResponse } from '../../types/api';
import { GetHoldPercentageRequestSchema, HoldPercentageResponseSchema } from '../../utils/validation';
import { createErrorResponse } from '../../utils/error-handler';
import { createDatabaseHelper } from '../../utils/database';
import { rateLimitGuard } from '../../guards/rateLimit';
import { costCapGuard } from '../../guards/costCap';

export async function getHoldPercentage(request: Request, env: Env): Promise<Response> {
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
      mt: url.searchParams.get('mt') || '',
      includeHistory: url.searchParams.get('includeHistory') === 'true',
      timeWindow: parseInt(url.searchParams.get('timeWindow') || '1')
    };

    const validation = GetHoldPercentageRequestSchema.safeParse(params);
    if (!validation.success) {
      return new Response(createErrorResponse('Invalid request parameters', 'VALIDATION_ERROR', {
        errors: validation.error.errors
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const validatedParams = validation.data;

    // Query line movement data for hold calculation
    const db = createDatabaseHelper(env);
    const lineData = await db.executeQuery<any>(
      `SELECT vb, va, lb, la FROM line_movements 
       WHERE eid = ? AND mt = ? 
       ORDER BY ts DESC LIMIT 1`,
      [validatedParams.eid, validatedParams.mt]
    );

    if (lineData.length === 0) {
      return new Response(createErrorResponse('No data found for event/market', 'NOT_FOUND'), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const latest = lineData[0];
    const totalVolume = (latest.va || 0) + (latest.vb || 0);
    const totalRisk = totalVolume; // Simplified calculation
    
    // Calculate hold percentage (simplified)
    // Hold = (Total handle - Total payouts) / Total handle
    // For demo purposes, using a standard 4.5% hold
    const holdPercentage = 4.5; // This would be calculated from actual betting data

    const response: HoldPercentageResponse = {
      eid: validatedParams.eid,
      mt: validatedParams.mt,
      holdPercentage,
      totalVolume,
      totalRisk,
      lastUpdated: new Date().toISOString(),
      alertThreshold: {
        min: 4,
        max: 8
      }
    };

    // Validate response
    const validatedResponse = HoldPercentageResponseSchema.parse(response);

    return new Response(JSON.stringify(validatedResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in getHoldPercentage:', error);
    return new Response(createErrorResponse('Internal server error', 'INTERNAL_ERROR'), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
