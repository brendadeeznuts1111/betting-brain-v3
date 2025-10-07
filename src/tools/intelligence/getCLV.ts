/**
 * MCP Tool: Get CLV (Customer Lifetime Value)
 * Returns CLV metrics and betting performance for a customer
 */

import { Env, GetCLVRequest, CLVResponse } from '../../types/api';
import { GetCLVRequestSchema, CLVResponseSchema } from '../../utils/validation';
import { createErrorResponse } from '../../utils/error-handler';
import { createDatabaseHelper } from '../../utils/database';
import { rateLimitGuard } from '../../guards/rateLimit';
import { costCapGuard } from '../../guards/costCap';

export async function getCLV(request: Request, env: Env): Promise<Response> {
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
      cid: url.searchParams.get('cid') || '',
      includeHistory: url.searchParams.get('includeHistory') === 'true',
      timeWindow: parseInt(url.searchParams.get('timeWindow') || '24')
    };

    const validation = GetCLVRequestSchema.safeParse(params);
    if (!validation.success) {
      return new Response(createErrorResponse('Invalid request parameters', 'VALIDATION_ERROR', {
        errors: validation.error.errors
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const validatedParams = validation.data;

    // Query CLV data
    const db = createDatabaseHelper(env);
    const clvData = await db.executeQueryFirst<any>(
      `SELECT cid, clv, wr, ao, nb FROM sharp_indicators WHERE cid = ?`,
      [validatedParams.cid]
    );

    if (!clvData) {
      return new Response(createErrorResponse('No CLV data found for customer', 'NOT_FOUND'), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const response: CLVResponse = {
      cid: validatedParams.cid,
      lifetimeValue: clvData.clv || 0,
      winRate: clvData.wr || 0,
      actionCount: clvData.ao || 0,
      netBet: clvData.nb || 0,
      lastUpdated: new Date().toISOString(),
      alertThreshold: -2 // Alert if CLV drops below -2%
    };

    // Validate response
    const validatedResponse = CLVResponseSchema.parse(response);

    return new Response(JSON.stringify(validatedResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in getCLV:', error);
    return new Response(createErrorResponse('Internal server error', 'INTERNAL_ERROR'), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
