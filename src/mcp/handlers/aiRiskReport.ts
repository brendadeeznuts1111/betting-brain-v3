/**
 * AI Risk Report Tool
 * AI-powered risk assessment and hedge recommendations
 */

import { Env } from '../../types/api';
import { MCPToolResult } from '../types';
import { BettingAnalyzer } from '../../ai/betting-analyzer';
import { ExposureData } from '../../ai/types';

export async function getAIRiskReport(args: Record<string, any>, env: Env): Promise<MCPToolResult> {
  try {
    const { eventId, agentID = 'DEMO' } = args;

    if (!eventId) {
      throw new Error('eventId is required');
    }

    if (!env.ANALYTICS) {
      throw new Error('ANALYTICS database not available');
    }

    if (!env.KIMI_API_KEY || env.KIMI_API_KEY === 'sk-placeholder-use-dotenv-or-secrets') {
      throw new Error('KIMI_API_KEY not configured');
    }

    // Query exposure data from D1
    const exposureResult = await env.ANALYTICS.prepare(`
      SELECT eid, side, risk, net, ts
      FROM exposure_tracking
      WHERE eid = ?
    `).bind(eventId).all<ExposureData>();

    if (!exposureResult.results || exposureResult.results.length === 0) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: 'No exposure data found', eventId, agentID }, null, 2) }],
        isError: true,
      };
    }

    // Initialize AI analyzer
    const analyzer = new BettingAnalyzer({ apiKey: env.KIMI_API_KEY });

    // Analyze with AI
    const result = await analyzer.generateRiskReport(exposureResult.results);

    // Format response
    const response = {
      tool: 'aiRiskReport',
      agentID,
      eventId: result.eventId,
      riskAssessment: { riskLevel: result.riskLevel, totalRisk: result.totalRisk, netExposure: result.netExposure, reasoning: result.reasoning },
      exposureBreakdown: result.exposureBreakdown.map(exp => ({ side: exp.side, risk: exp.risk, net: exp.net, percentage: exp.percentage })),
      recommendations: result.recommendations,
      hedgeStrategy: result.hedgeStrategy ? { action: result.hedgeStrategy.action, amount: result.hedgeStrategy.amount, reasoning: result.hedgeStrategy.reasoning } : null,
      insights: result.insights,
      rawData: exposureResult.results.map(exp => ({ side: exp.side, risk: exp.risk, net: exp.net, timestamp: exp.ts })),
      aiUsage: { inputTokens: result.usage.inputTokens, outputTokens: result.usage.outputTokens, totalTokens: result.usage.totalTokens, cost: result.cost.totalCost },
      timestamp: new Date().toISOString(),
    };

    return { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }], isError: false };
  } catch (error) {
    console.error('AI Risk Report error:', error);
    return {
      content: [{ type: 'text', text: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error', tool: 'aiRiskReport', agentID: args.agentID || 'DEMO', timestamp: new Date().toISOString() }, null, 2) }],
      isError: true,
    };
  }
}
