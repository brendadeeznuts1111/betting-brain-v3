/**
 * 🔍 AI Natural Language Query Parser
 * Parse natural language queries into structured tool calls
 */

import { Env } from '../types/api';
import { CORS_HEADERS } from '../utils/request';
import { getAISharpAnalysis } from '../mcp/handlers/aiSharpAnalysis';
import { getAISteamDetection } from '../mcp/handlers/aiSteamDetection';
import { getAIRiskReport } from '../mcp/handlers/aiRiskReport';
import { BettingAnalyzer } from '../ai/betting-analyzer';

interface QueryRequest {
  query: string;
  agentID?: string;
}

interface QueryResponse {
  query: string;
  intent: string;
  result: any;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  cost?: {
    totalCost: number;
  };
  timestamp: string;
}

/**
 * Parse query intent and extract parameters
 */
function parseQuery(query: string): { intent: string; params: Record<string, any> } {
  const lowerQuery = query.toLowerCase();

  // Sharp customer analysis
  if (lowerQuery.includes('sharp') || lowerQuery.includes('customer') || lowerQuery.includes('cust_')) {
    const customerMatch = query.match(/cust[_-]?(\w+)/i);
    if (customerMatch) {
      return {
        intent: 'sharp_analysis',
        params: { customerId: `CUST_${customerMatch[1]}` },
      };
    }
  }

  // Steam move detection
  if (lowerQuery.includes('steam') || lowerQuery.includes('line move') || lowerQuery.includes('movement')) {
    // Try to extract team names
    const teams = query.match(/(\w+)\s+(?:vs?\.?|@)\s+(\w+)/i);
    if (teams) {
      return {
        intent: 'steam_detection',
        params: {
          homeTeam: teams[2],
          awayTeam: teams[1],
        },
      };
    }
    
    // Try to extract event ID
    const eventMatch = query.match(/([A-Z]+_[A-Z0-9_]+)/);
    if (eventMatch) {
      return {
        intent: 'steam_detection',
        params: { eventId: eventMatch[1] },
      };
    }
  }

  // Risk report
  if (lowerQuery.includes('risk') || lowerQuery.includes('exposure') || lowerQuery.includes('hedge')) {
    const eventMatch = query.match(/([A-Z]+_[A-Z0-9_]+)/);
    if (eventMatch) {
      return {
        intent: 'risk_report',
        params: { eventId: eventMatch[1] },
      };
    }
    
    // General risk report
    return {
      intent: 'risk_report',
      params: { date: new Date().toISOString().split('T')[0] },
    };
  }

  // Agent performance
  if (lowerQuery.includes('agent') || lowerQuery.includes('top') || lowerQuery.includes('performance')) {
    return {
      intent: 'agent_performance',
      params: { period: 'week' },
    };
  }

  // Default to general chat
  return {
    intent: 'general_chat',
    params: { query },
  };
}

/**
 * Execute sharp analysis
 */
async function executeSharpAnalysis(params: Record<string, any>, env: Env): Promise<any> {
  const result = await getAISharpAnalysis(params, env);
  
  if (result.isError) {
    throw new Error(result.content[0].text);
  }
  
  return JSON.parse(result.content[0].text);
}

/**
 * Execute steam detection
 */
async function executeSteamDetection(params: Record<string, any>, env: Env): Promise<any> {
  // If we have team names, construct event ID
  if (params.homeTeam && params.awayTeam) {
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    params.eventId = `NBA_${params.awayTeam.toUpperCase()}_${params.homeTeam.toUpperCase()}_${today}`;
    params.marketType = 'SPREAD';
  }
  
  const result = await getAISteamDetection(params, env);
  
  if (result.isError) {
    throw new Error(result.content[0].text);
  }
  
  return JSON.parse(result.content[0].text);
}

/**
 * Execute risk report
 */
async function executeRiskReport(params: Record<string, any>, env: Env): Promise<any> {
  const result = await getAIRiskReport(params, env);
  
  if (result.isError) {
    throw new Error(result.content[0].text);
  }
  
  return JSON.parse(result.content[0].text);
}

/**
 * Execute agent performance query
 */
async function executeAgentPerformance(params: Record<string, any>, env: Env): Promise<any> {
  // Query top agents from fantasy402_agents
  const period = params.period || 'week';
  const limit = params.limit || 5;
  
  const query = `
    SELECT 
      agent_id,
      agent_owner,
      total_risk,
      total_win,
      (total_win - total_risk) as net_profit,
      risk_score,
      steam_percentage,
      last_bet_timestamp
    FROM fantasy402_agents
    WHERE last_bet_timestamp > datetime('now', '-7 days')
    ORDER BY (total_win - total_risk) DESC
    LIMIT ?
  `;
  
  const results = await env.RAW_FEED_DB.prepare(query).bind(limit).all();
  
  return {
    period,
    topAgents: results.results,
    count: results.results?.length ?? 0,
  };
}

/**
 * Execute general chat
 */
async function executeGeneralChat(params: Record<string, any>, env: Env): Promise<any> {
  const analyzer = new BettingAnalyzer({
    apiKey: env.KIMI_API_KEY,
  });
  
  const result = await analyzer.chatAboutBettingData([
    { role: 'user', content: params.query },
  ]);
  
  return {
    response: result.response,
    usage: result.usage,
    cost: result.cost,
  };
}

/**
 * Handle natural language query
 */
export async function handleAIQuery(request: Request, env: Env): Promise<Response> {
  const requestId = Date.now().toString(36);
  console.log(`[${requestId}] 🔍 AI query request received`);

  try {
    // Validate API key
    if (!env.KIMI_API_KEY || env.KIMI_API_KEY === 'sk-placeholder-use-dotenv-or-secrets') {
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 503,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Parse request
    const body = await request.json() as QueryRequest;
    
    if (!body.query) {
      return new Response(JSON.stringify({ error: 'query is required' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[${requestId}] Query: "${body.query}"`);

    // Parse intent
    const { intent, params } = parseQuery(body.query);
    console.log(`[${requestId}] Intent: ${intent}`, params);

    // Add agentID if provided
    if (body.agentID) {
      params.agentID = body.agentID;
    }

    // Execute based on intent
    let result: any;
    let usage: any;
    let cost: any;

    switch (intent) {
      case 'sharp_analysis':
        result = await executeSharpAnalysis(params, env);
        usage = result.aiUsage;
        cost = { totalCost: result.aiUsage?.cost };
        break;

      case 'steam_detection':
        result = await executeSteamDetection(params, env);
        usage = result.aiUsage;
        cost = { totalCost: result.aiUsage?.cost };
        break;

      case 'risk_report':
        result = await executeRiskReport(params, env);
        usage = result.aiUsage;
        cost = { totalCost: result.aiUsage?.cost };
        break;

      case 'agent_performance':
        result = await executeAgentPerformance(params, env);
        break;

      case 'general_chat':
        result = await executeGeneralChat(params, env);
        usage = result.usage;
        cost = result.cost;
        break;

      default:
        throw new Error(`Unknown intent: ${intent}`);
    }

    console.log(`[${requestId}] ✅ Query executed successfully`);

    const response: QueryResponse = {
      query: body.query,
      intent,
      result,
      usage,
      cost,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response, null, 2), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(`[${requestId}] ❌ Query error:`, error);

    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
}

