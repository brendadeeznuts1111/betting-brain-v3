/**
 * MCP Tool: Get Hold Percentage
 * Returns hold percentage and volume metrics for an event
 */

import { Env, GetHoldPercentageRequest as GetHoldPercentageRequestSchema, HoldPercentageResponse as HoldPercentageResponseSchema } from '../../types/api';
import { createErrorResponse, Errors } from '../../utils/error-handler';
import { createDatabaseHelper } from '../../utils/database';
import { rateLimitGuard } from '../../guards/rateLimit';
import { costCapGuard } from '../../guards/costCap';

export async function getHoldPercentage(request: Request, env: Env): Promise<Response> {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimitGuard.checkRateLimit(request);
    if (!rateLimitResult.allowed) {
      return createErrorResponse(Errors.rateLimit(), Date.now().toString(36), '/api/hold-percentage');
    }

    // Cost cap check
    const costCheck = await costCapGuard.checkRequest(request, env);
    if (!costCheck.allowed) {
      return createErrorResponse(Errors.serviceUnavailable('Cost cap exceeded'), Date.now().toString(36), '/api/hold-percentage');
    }

    // Parse and validate request
    const url = new URL(request.url);
    const params = {
      eid: url.searchParams.get('eid') || '',
      mt: url.searchParams.get('mt') || '',
      includeHistory: url.searchParams.get('includeHistory') === 'true',
      timeWindow: parseInt(url.searchParams.get('timeWindow') || '1')
    };

    // Validate request with Zod schema
    const validationResult = GetHoldPercentageRequestSchema.safeParse(params);
    if (!validationResult.success) {
      return createErrorResponse(Errors.validationError(['eid and mt required']), Date.now().toString(36), '/api/hold-percentage');
    }

    // Query line movement data for hold calculation
    const db = createDatabaseHelper(env);
    const lineData = await db.executeQuery<any>(
      `SELECT vb, va, lb, la FROM line_movements
       WHERE eid = ? AND mt = ?
       ORDER BY ts DESC LIMIT 1`,
      [params.eid, params.mt]
    );

    if (lineData.length === 0) {
      return createErrorResponse(Errors.notFound('Line movement data'), Date.now().toString(36), '/api/hold-percentage');
    }

    const latest = lineData[0];
    const totalVolume = (latest.va || 0) + (latest.vb || 0);
    const totalRisk = totalVolume; // Simplified calculation

    // Calculate hold percentage (simplified)
    // Hold = (Total handle - Total payouts) / Total handle
    // For demo purposes, using a standard 4.5% hold
    const holdPercentage = 4.5; // This would be calculated from actual betting data

    const response = {
      eid: params.eid,
      mt: params.mt,
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

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in getHoldPercentage:', error);
    return new Response(JSON.stringify(createErrorResponse(Errors.databaseError('getHoldPercentage query failed'), Date.now().toString(36), '/api/hold-percentage')), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
