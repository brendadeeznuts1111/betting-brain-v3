/**
 * AI Sharp Analysis Tool
 * AI-powered customer profiling and sharp detection
 */

import { Env } from '../../types/api';
import { MCPToolResult } from '../types';
import { BettingAnalyzer } from '../../ai/betting-analyzer';
import { CustomerData } from '../../ai/types';

export async function getAISharpAnalysis(args: Record<string, any>, env: Env): Promise<MCPToolResult> {
  try {
    const { customerId, agentID = 'DEMO' } = args;

    if (!customerId) {
      throw new Error('customerId is required');
    }

    if (!env.ANALYTICS) {
      throw new Error('ANALYTICS database not available');
    }

    if (!env.KIMI_API_KEY || env.KIMI_API_KEY === 'sk-placeholder-use-dotenv-or-secrets') {
      throw new Error('KIMI_API_KEY not configured');
    }

    // Query customer data from D1
    const customer = await env.ANALYTICS.prepare(`
      SELECT cid, clv, wr, ao, nb, upd
      FROM sharp_indicators
      WHERE cid = ?
      LIMIT 1
    `).bind(customerId).first<CustomerData>();

    if (!customer) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: 'Customer not found', customerId, agentID }, null, 2) }],
        isError: true,
      };
    }

    // Initialize AI analyzer
    const analyzer = new BettingAnalyzer({ apiKey: env.KIMI_API_KEY });

    // Analyze with AI
    const result = await analyzer.analyzeSharpBehavior(customer);

    // Format response
    const response = {
      tool: 'aiSharpAnalysis',
      agentID,
      customerId: result.customerId,
      analysis: {
        sharpScore: result.sharpScore,
        confidence: result.confidence,
        recommendation: result.recommendation,
        reasoning: result.reasoning,
      },
      indicators: result.indicators,
      insights: result.insights,
      rawData: { clv: customer.clv, winRate: customer.wr, actionCount: customer.ao, netBet: customer.nb, lastUpdate: customer.upd },
      aiUsage: { inputTokens: result.usage.inputTokens, outputTokens: result.usage.outputTokens, totalTokens: result.usage.totalTokens, cost: result.cost.totalCost },
      timestamp: new Date().toISOString(),
    };

    return { content: [{ type: 'text', text: JSON.stringify(response, null, 2) }], isError: false };
  } catch (error) {
    console.error('AI Sharp Analysis error:', error);
    return {
      content: [{ type: 'text', text: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error', tool: 'aiSharpAnalysis', agentID: args.agentID || 'DEMO', timestamp: new Date().toISOString() }, null, 2) }],
      isError: true,
    };
  }
}
