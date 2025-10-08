/**
 * MCP Tool: Get Sharp Score
 * Returns sharp score and performance metrics for a customer
 */

import { Env, GetSharpScoreRequest as GetSharpScoreRequestSchema, SharpScoreResponse as SharpScoreResponseSchema } from '../../types/api';
import { createErrorResponse, Errors } from '../../utils/error-handler';
import { createDatabaseHelper } from '../../utils/database';
import { rateLimitGuard } from '../../guards/rateLimit';
import { costCapGuard } from '../../guards/costCap';

export async function getSharpScore(request: Request, env: Env): Promise<Response> {
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

    // Validate required parameters
    if (!params.cid) {
      return createErrorResponse(Errors.validationError(['Customer ID (cid) is required']), Date.now().toString(36), '/api/sharp-score');
    }

    // Query sharp score data
    const db = createDatabaseHelper(env);
    const sharpData = await db.executeQueryFirst<any>(
      `SELECT cid, clv, wr, ao FROM sharp_indicators WHERE cid = ?`,
      [params.cid]
    );

    if (!sharpData) {
      return createErrorResponse(Errors.notFound('Customer'), Date.now().toString(36), '/api/sharp-score');
    }

    // Calculate sharp score
    const clvScore = Math.min(Math.max(sharpData.clv / 1000, 0), 50);
    const winRateScore = Math.min(Math.max(sharpData.wr - 50, 0), 30);
    const volumeScore = Math.min(Math.max(sharpData.ao / 10, 0), 20);
    const sharpScore = clvScore + winRateScore + volumeScore;

    const response: SharpScoreResponseSchema = {
      cid: params.cid,
      sharpScore,
      clv: sharpData.clv || 0,
      winRate: sharpData.wr || 0,
      actionCount: sharpData.ao || 0,
      lastUpdated: new Date().toISOString(),
      alertThreshold: 60
    };

    // Validate response

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in getSharpScore:', error);
    return new Response(createErrorResponse('Internal server error', 'INTERNAL_ERROR'), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
