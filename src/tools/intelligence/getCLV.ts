/**
 * MCP Tool: Get CLV (Customer Lifetime Value)
 * Returns CLV metrics and betting performance for a customer
 */

import { Env, GetCLVRequest as GetCLVRequestSchema, CLVResponse as CLVResponseSchema } from '../../types/api';
import { createErrorResponse, Errors } from '../../utils/error-handler';
import { createDatabaseHelper } from '../../utils/database';
import { rateLimitGuard } from '../../guards/rateLimit';
import { costCapGuard } from '../../guards/costCap';

export async function getCLV(request: Request, env: Env): Promise<Response> {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimitGuard.checkRateLimit(request);
    if (!rateLimitResult.allowed) {
      return createErrorResponse(Errors.rateLimit(), Date.now().toString(36), '/api/clv');
    }

    // Cost cap check
    const costCheck = await costCapGuard.checkRequest(request, env);
    if (!costCheck.allowed) {
      return createErrorResponse(Errors.serviceUnavailable('Cost cap exceeded'), Date.now().toString(36), '/api/clv');
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
      return createErrorResponse(Errors.validationError(['cid is required']), Date.now().toString(36), '/api/clv');
    }

    const validatedParams = validation.data;

    // Query CLV data
    const db = createDatabaseHelper(env);
    const clvData = await db.executeQueryFirst<any>(
      `SELECT cid, clv, wr, ao, nb FROM sharp_indicators WHERE cid = ?`,
      [validatedParams.cid]
    );

    if (!clvData) {
      return createErrorResponse(Errors.notFound('CLV data'), Date.now().toString(36), '/api/clv');
    }

    const response = {
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
    return new Response(JSON.stringify(createErrorResponse(Errors.databaseError('getCLV query failed'), Date.now().toString(36), '/api/clv')), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
