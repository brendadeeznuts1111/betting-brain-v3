/**
 * AI Steam Detection Tool
 * AI-powered line movement and steam move detection
 */

import { Env } from '../../types/api';
import { MCPToolResult } from '../types';
import { BettingAnalyzer } from '../../ai/betting-analyzer';
import { LineMovementData } from '../../ai/types';

export async function getAISteamDetection(args: Record<string, any>, env: Env): Promise<MCPToolResult> {
  try {
    const { eventId, marketType = 'SPREAD', agentID = 'DEMO' } = args;

    if (!eventId) {
      throw new Error('eventId is required');
    }

    if (!env.ANALYTICS) {
      throw new Error('ANALYTICS database not available');
    }

    if (!env.KIMI_API_KEY || env.KIMI_API_KEY === 'sk-placeholder-use-dotenv-or-secrets') {
      throw new Error('KIMI_API_KEY not configured');
    }

    // Query line movement from D1
    const lineMovement = await env.ANALYTICS.prepare(`
      SELECT eid, mt, lb, la, vb, va, ts
      FROM line_movements
      WHERE eid = ? AND mt = ?
      ORDER BY ts DESC
      LIMIT 1
    `).bind(eventId, marketType).first<LineMovementData>();

    if (!lineMovement) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: 'Line movement not found', eventId, marketType, agentID }, null, 2) }],
        isError: true,
      };
    }

    // Initialize AI analyzer
    const analyzer = new BettingAnalyzer({ apiKey: env.KIMI_API_KEY });

    // Analyze with AI
    const result = await analyzer.analyzeSteamMove(lineMovement);

    // Format response
    const response = {
      tool: 'aiSteamDetection',
      agentID,
      eventId: result.eventId,
      marketType: result.marketType,
      detection: { isSteamMove: result.isSteamMove, confidence: result.confidence, severity: result.severity, reasoning: result.reasoning },
      lineMovement: { before: result.lineMovement.before, after: result.lineMovement.after, change: result.lineMovement.change, changePercent: result.lineMovement.changePercent },
      volumeMovement: { before: result.volumeMovement.before, after: result.volumeMovement.after, change: result.volumeMovement.change, changePercent: result.volumeMovement.changePercent },
      insights: result.insights,
      rawData: { lineBefore: lineMovement.lb, lineAfter: lineMovement.la, volumeBefore: lineMovement.vb, volumeAfter: lineMovement.va, timestamp: lineMovement.ts },
      aiUsage: { inputTokens: result.usage.inputTokens, outputTokens: result.usage.outputTokens, totalTokens: result.usage.totalTokens, cost: result.cost.totalCost },
      timestamp: new Date().toISOString(),
    };

    return { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }], isError: false };
  } catch (error) {
    console.error('AI Steam Detection error:', error);
    return {
      content: [{ type: 'text', text: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error', tool: 'aiSteamDetection', agentID: args.agentID || 'DEMO', timestamp: new Date().toISOString() }, null, 2) }],
      isError: true,
    };
  }
}
