/**
 * 🤖 AI Chat API Endpoint
 * Interactive chat with Kimi K2 AI about betting data
 */

import { Env } from '../types/api';
import { BettingAnalyzer } from '../ai/betting-analyzer';
import { AIChatMessage } from '../ai/types';
import { CORS_HEADERS } from '../utils/request';

/**
 * Request validation schema
 */
interface AIChatRequest {
  messages: AIChatMessage[];
  includeContext?: boolean;
  maxTokens?: number;
}

/**
 * Response schema
 */
interface AIChatResponse {
  response: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  cost: {
    inputCost: number;
    outputCost: number;
    totalCost: number;
  };
  context?: {
    totalCustomers: number;
    avgCLV: number;
    avgWinRate: number;
  };
  timestamp: string;
}

/**
 * Error response schema
 */
interface ErrorResponse {
  error: string;
  code: string;
  details?: unknown;
  timestamp: string;
}

/**
 * Validate chat request
 */
function validateChatRequest(body: any): { valid: boolean; error?: string; data?: AIChatRequest } {
  if (!body) {
    return { valid: false, error: 'Request body is required' };
  }

  if (!Array.isArray(body.messages)) {
    return { valid: false, error: 'messages must be an array' };
  }

  if (body.messages.length === 0) {
    return { valid: false, error: 'messages array cannot be empty' };
  }

  // Validate each message
  for (const msg of body.messages) {
    if (!msg.role || !msg.content) {
      return { valid: false, error: 'Each message must have role and content' };
    }

    if (!['system', 'user', 'assistant'].includes(msg.role)) {
      return { valid: false, error: 'Message role must be system, user, or assistant' };
    }

    if (typeof msg.content !== 'string') {
      return { valid: false, error: 'Message content must be a string' };
    }
  }

  return {
    valid: true,
    data: {
      messages: body.messages,
      includeContext: body.includeContext ?? true,
      maxTokens: body.maxTokens ?? 2000,
    },
  };
}

/**
 * Get platform context from D1
 */
async function getPlatformContext(env: Env): Promise<{ totalCustomers: number; avgCLV: number; avgWinRate: number } | null> {
  try {
    const result = await env.ANALYTICS.prepare(`
      SELECT 
        COUNT(*) as total_customers,
        AVG(clv) as avg_clv,
        AVG(wr) as avg_win_rate
      FROM sharp_indicators
      WHERE upd > datetime('now', '-7 days')
    `).first<{ total_customers: number; avg_clv: number; avg_win_rate: number }>();

    return result || null;
  } catch (error) {
    console.error('Failed to get platform context:', error);
    return null;
  }
}

/**
 * Handle AI Chat Request
 */
export async function handleAIChat(request: Request, env: Env): Promise<Response> {
  const requestId = Date.now().toString(36);
  console.log(`[${requestId}] 🤖 AI Chat request received`);

  try {
    // Validate API key
    if (!env.KIMI_API_KEY || env.KIMI_API_KEY === 'sk-placeholder-use-dotenv-or-secrets') {
      console.error(`[${requestId}] ❌ KIMI_API_KEY not configured`);
      const errorResponse: ErrorResponse = {
        error: 'AI service not configured',
        code: 'AI_NOT_CONFIGURED',
        timestamp: new Date().toISOString(),
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 503,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    let body: any;
    try {
      body = await request.json();
    } catch (error) {
      console.error(`[${requestId}] ❌ Invalid JSON:`, error);
      const errorResponse: ErrorResponse = {
        error: 'Invalid JSON in request body',
        code: 'INVALID_JSON',
        timestamp: new Date().toISOString(),
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Validate request
    const validation = validateChatRequest(body);
    if (!validation.valid) {
      console.error(`[${requestId}] ❌ Validation failed:`, validation.error);
      const errorResponse: ErrorResponse = {
        error: validation.error!,
        code: 'VALIDATION_ERROR',
        timestamp: new Date().toISOString(),
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const chatRequest = validation.data!;

    // Get platform context if requested
    let context: { totalCustomers: number; avgCLV: number; avgWinRate: number } | undefined;
    if (chatRequest.includeContext) {
      const platformContext = await getPlatformContext(env);
      if (platformContext) {
        context = platformContext;

        // Add context to system message
        const contextMessage: AIChatMessage = {
          role: 'system',
          content: `Current platform stats: ${platformContext.total_customers} customers, avg CLV ${platformContext.avg_clv.toFixed(2)}, avg win rate ${platformContext.avg_win_rate.toFixed(1)}%`,
        };

        // Insert context message after any existing system messages
        const systemMessageIndex = chatRequest.messages.findIndex(m => m.role === 'system');
        if (systemMessageIndex >= 0) {
          chatRequest.messages.splice(systemMessageIndex + 1, 0, contextMessage);
        } else {
          chatRequest.messages.unshift(contextMessage);
        }
      }
    }

    // Initialize AI analyzer
    const analyzer = new BettingAnalyzer({
      apiKey: env.KIMI_API_KEY,
      maxTokens: chatRequest.maxTokens,
    });

    console.log(`[${requestId}] 🤖 Sending ${chatRequest.messages.length} messages to AI`);

    // Call AI
    const result = await analyzer.chatAboutBettingData(chatRequest.messages);

    console.log(`[${requestId}] ✅ AI response received (${result.usage.totalTokens} tokens, $${result.cost.totalCost.toFixed(6)})`);

    // Build response
    const response: AIChatResponse = {
      response: result.response,
      usage: result.usage,
      cost: result.cost,
      context,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(`[${requestId}] ❌ AI chat error:`, error);

    const errorResponse: ErrorResponse = {
      error: error instanceof Error ? error.message : 'Unknown error',
      code: 'AI_CHAT_ERROR',
      details: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
}
