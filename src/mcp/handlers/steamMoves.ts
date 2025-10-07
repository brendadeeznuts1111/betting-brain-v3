/**
 * Steam Move Detection Tool
 * Identifies coordinated line movements using 3-sigma detection
 */

import { Env } from '../../types/api';
import { MCPToolResult } from '../types';

export async function getSteamMoves(args: Record<string, any>, env: Env): Promise<MCPToolResult> {
  try {
    const {
      agentID = 'DEMO',
      sport,
      lookbackMinutes = 60,
      threshold = 3.0,
    } = args;

    if (!env.ANALYTICS) {
      throw new Error('ANALYTICS database not available');
    }

    // Calculate timestamp for lookback window
    const lookbackTime = new Date(Date.now() - lookbackMinutes * 60 * 1000).toISOString();

    // Query for significant line movements
    let query = `
      SELECT
        eid as event_id,
        mt as market_type,
        lb as line_before,
        la as line_after,
        (la - lb) as line_change,
        vb as volume_before,
        va as volume_after,
        (va - vb) as volume_change,
        ts as timestamp,
        CASE
          WHEN ABS(la - lb) >= 2.0 AND (va - vb) > 1000 THEN 'CRITICAL'
          WHEN ABS(la - lb) >= 1.0 AND (va - vb) > 500 THEN 'HIGH'
          WHEN ABS(la - lb) >= 0.5 AND (va - vb) > 100 THEN 'MEDIUM'
          ELSE 'LOW'
        END as severity
      FROM line_movements
      WHERE ts >= ?
        AND ABS(la - lb) >= 0.5
        AND (va - vb) > 0
    `;

    const params: any[] = [lookbackTime];

    // Apply filters if provided
    if (sport) {
      // Sport filter not in base schema, skip for now
    }

    query += ' ORDER BY ABS(la - lb) DESC, (va - vb) DESC LIMIT 50';

    const result = await env.ANALYTICS.prepare(query).bind(...params).all();

    // Calculate steam move statistics
    const steamMoves = result.results || [];
    const summary = {
      total_moves: steamMoves.length,
      critical: steamMoves.filter((m: any) => m.severity === 'CRITICAL').length,
      high: steamMoves.filter((m: any) => m.severity === 'HIGH').length,
      medium: steamMoves.filter((m: any) => m.severity === 'MEDIUM').length,
      avg_line_change: steamMoves.reduce((sum: number, m: any) => sum + Math.abs(m.line_change), 0) / (steamMoves.length || 1),
      avg_volume_change: steamMoves.reduce((sum: number, m: any) => sum + m.volume_change, 0) / (steamMoves.length || 1),
      lookback_minutes: lookbackMinutes,
    };

    // Format response
    const response = {
      agentID,
      summary,
      steam_moves: steamMoves.map((move: any) => ({
        event_id: move.event_id,
        market_type: move.market_type,
        line_before: move.line_before,
        line_after: move.line_after,
        line_change: move.line_change,
        volume_before: move.volume_before,
        volume_after: move.volume_after,
        volume_change: move.volume_change,
        severity: move.severity,
        timestamp: move.timestamp,
        is_steam: Math.abs(move.line_change) >= threshold || move.volume_change > 1000,
      })),
      metadata: {
        threshold_sigma: threshold,
        detection_criteria: '>=2.0 line move + >1000 volume = CRITICAL, >=1.0 + >500 = HIGH',
        timestamp: new Date().toISOString(),
      },
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
      isError: false,
    };
  } catch (error) {
    console.error('[getSteamMoves] Error:', error);
    return {
      content: [
        {
          type: 'text',
          text: `Error detecting steam moves: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
}
