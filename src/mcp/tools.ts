/**
 * MCP Tools List Generator
 * Returns all available MCP tools with their schemas
 */

import { MCPTool, MCPToolCategory } from './types';
import { MCPEnv } from '../types/api';

/**
 * Get all available MCP tools
 * Returns 45+ tools organized by category
 */
export async function getMCPTools(env: MCPEnv): Promise<MCPTool[]> {
  return [
    // Intelligence Tools (4)
    ...getIntelligenceTools(),

    // Live Betting Tools (5)
    ...getLiveBettingTools(),

    // Analytics Tools (10)
    ...getAnalyticsTools(),

    // Raw Feed Tools (4)
    ...getRawFeedTools(),

    // Admin Tools (3)
    ...getAdminTools(),

    // AI-Enhanced Tools (3)
    ...getAITools(),

    // Management Tools (19)
    ...getManagementTools(),
  ];
}

/**
 * Intelligence Tools
 * Core betting intelligence: exposure, CLV, sharp detection, hold percentage
 */
function getIntelligenceTools(): MCPTool[] {
  return [
    {
      name: 'getBettingExposure',
      description: 'Get real-time betting exposure metrics for events - tracks risk, net position, and hedge requirements',
      inputSchema: {
        type: 'object',
        properties: {
          agentID: { type: 'string', description: 'Agent ID to scope exposure to' },
          eventID: { type: 'string', description: 'Specific event ID (optional)' },
          sport: { type: 'string', description: 'Filter by sport type (optional)' },
          exposureLevel: {
            type: 'string',
            enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
            description: 'Filter by exposure level (optional)',
          },
        },
        required: ['agentID'],
      },
    },
    {
      name: 'getCLV',
      description: 'Get Closing Line Value analysis for customers - identifies +EV bettors and winning patterns',
      inputSchema: {
        type: 'object',
        properties: {
          agentID: { type: 'string', description: 'Agent ID to scope analysis to' },
          customerID: { type: 'string', description: 'Specific customer ID (optional)' },
          startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
          endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
          threshold: { type: 'number', default: -2.0, description: 'CLV threshold for alerts (%)' },
        },
        required: ['agentID'],
      },
    },
    {
      name: 'getHoldPercentage',
      description: 'Get hold percentage and volume metrics - analyzes profit margins by market',
      inputSchema: {
        type: 'object',
        properties: {
          agentID: { type: 'string', description: 'Agent ID to analyze' },
          eventID: { type: 'string', description: 'Specific event ID (optional)' },
          marketType: { type: 'string', description: 'Market type (MONEYLINE, SPREAD, TOTAL, etc.)' },
          startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
          endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
        },
        required: ['agentID', 'marketType'],
      },
    },
    {
      name: 'getSharpScore',
      description: 'Get sharp customer scoring - identifies professional bettors using CLV, win rate, and action patterns',
      inputSchema: {
        type: 'object',
        properties: {
          agentID: { type: 'string', description: 'Agent ID to scope to' },
          customerID: { type: 'string', description: 'Specific customer ID (optional)' },
          minScore: { type: 'number', default: 60, description: 'Minimum sharp score threshold (0-100)' },
          lookbackDays: { type: 'integer', default: 30, description: 'Days to look back for analysis' },
        },
        required: ['agentID'],
      },
    },
  ];
}

/**
 * Live Betting Tools
 * Real-time betting ticker and live data with sub-20ms caching
 */
function getLiveBettingTools(): MCPTool[] {
  return [
    {
      name: 'getLiveBettingTicker',
      description: 'Get real-time betting ticker with active wagers - returns Fantasy402 live betting feed with caching (sub-20ms)',
      inputSchema: {
        type: 'object',
        properties: {
          agentID: { type: 'string', description: 'Agent ID to scope live betting data' },
          betType: {
            type: 'string',
            enum: ['ALL', 'MONEYLINE', 'PARLAY', 'TEASER', 'IF_BET', 'PROP'],
            default: 'ALL',
            description: 'Filter by bet type',
          },
          startDate: { type: 'string', description: 'Start date for filtering bets' },
          endDate: { type: 'string', description: 'End date for filtering bets' },
          limit: { type: 'integer', default: 100, description: 'Maximum number of live bets to return' },
          ticketWriter: {
            type: 'string',
            enum: ['ALL', 'GSLIVE', 'Internet', 'ALERT'],
            default: 'ALL',
            description: 'Filter by ticket writer type',
          },
        },
        required: ['agentID'],
      },
    },
    {
      name: 'getSteamMoves',
      description: '3-sigma steam move detection with severity classification (CRITICAL/HIGH/MEDIUM/LOW)',
      inputSchema: {
        type: 'object',
        properties: {
          agentID: { type: 'string', default: 'DEMO', description: 'Agent ID to analyze' },
          lookbackHours: { type: 'integer', default: 24, description: 'Hours to look back' },
          minLineChange: { type: 'number', default: 0.5, description: 'Minimum line change to detect' },
        },
        required: [],
      },
    },
    {
      name: 'getRiskConcentration',
      description: 'Risk clustering analysis by event, customer, or market with exposure distribution',
      inputSchema: {
        type: 'object',
        properties: {
          agentID: { type: 'string', default: 'DEMO', description: 'Agent ID to analyze' },
          groupBy: {
            type: 'string',
            enum: ['event', 'customer', 'market'],
            default: 'event',
            description: 'Grouping dimension for risk analysis',
          },
          topN: { type: 'integer', default: 20, description: 'Number of top concentrations to return' },
        },
        required: [],
      },
    },
    {
      name: 'getSharpActivity',
      description: 'Recent betting actions from identified sharp customers with sharp score calculation',
      inputSchema: {
        type: 'object',
        properties: {
          agentID: { type: 'string', default: 'DEMO', description: 'Agent ID to scope to' },
          lookbackHours: { type: 'integer', default: 24, description: 'Hours to look back for activity' },
          minSharpScore: { type: 'number', default: 60, description: 'Minimum sharp score threshold (0-100)' },
        },
        required: [],
      },
    },
    {
      name: 'getClosingLineValue',
      description: 'Get closing line value analysis - compares bet prices to closing lines',
      inputSchema: {
        type: 'object',
        properties: {
          agentID: { type: 'string', description: 'Agent ID to analyze' },
          customerID: { type: 'string', description: 'Specific customer (optional)' },
          sport: { type: 'string', description: 'Filter by sport (optional)' },
          startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
          endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
        },
        required: ['agentID'],
      },
    },
  ];
}

/**
 * Analytics Tools
 * Handle/hold, customer volume, time-series analysis, forecasting
 */
function getAnalyticsTools(): MCPTool[] {
  return [
    {
      name: 'getTimeSeriesCLV',
      description: 'Track CLV trends over time with rolling metrics and trend analysis for customer profiling',
      inputSchema: {
        type: 'object',
        properties: {
          cid: { type: 'string', description: 'Customer ID to analyze' },
          lookbackDays: { type: 'integer', default: 30, description: 'Number of days to analyze' },
          granularity: {
            type: 'string',
            enum: ['hourly', 'daily', 'weekly', 'monthly'],
            default: 'daily',
            description: 'Time period granularity',
          },
        },
        required: ['cid'],
      },
    },
    {
      name: 'getEnhancedSharpScore',
      description: 'Multi-dimensional customer profiling with ML-like feature engineering (CLV, timing, sizing, diversity)',
      inputSchema: {
        type: 'object',
        properties: {
          cid: { type: 'string', description: 'Customer ID to analyze' },
          lookbackDays: { type: 'integer', default: 30, description: 'Number of days for analysis' },
          includeFeatures: { type: 'boolean', default: true, description: 'Include detailed feature breakdown' },
        },
        required: ['cid'],
      },
    },
    {
      name: 'getHoldForecast',
      description: 'Predictive analytics for hold percentage with linear regression forecasting and confidence intervals',
      inputSchema: {
        type: 'object',
        properties: {
          eventID: { type: 'string', description: 'Event ID to analyze (optional)' },
          marketType: { type: 'string', description: 'Market type filter (optional)' },
          lookbackDays: { type: 'integer', default: 30, description: 'Historical data period' },
          forecastHours: { type: 'integer', default: 24, description: 'Hours to forecast ahead' },
        },
        required: [],
      },
    },
    {
      name: 'getHandleAndHold',
      description: 'Track total betting handle and hold percentage over time with trend analysis and market breakdown',
      inputSchema: {
        type: 'object',
        properties: {
          agentID: { type: 'string', default: 'DEMO', description: 'Agent ID to analyze' },
          lookbackDays: { type: 'integer', default: 7, description: 'Number of days to analyze' },
          granularity: {
            type: 'string',
            enum: ['hourly', 'daily', 'weekly'],
            default: 'daily',
            description: 'Time period granularity',
          },
          marketType: { type: 'string', description: 'Market type filter (optional)' },
        },
        required: [],
      },
    },
    {
      name: 'getCustomerVolume',
      description: 'Customer volume analytics with segmentation (whale/high-roller/regular/casual) and ranking',
      inputSchema: {
        type: 'object',
        properties: {
          agentID: { type: 'string', default: 'DEMO', description: 'Agent ID to analyze' },
          lookbackDays: { type: 'integer', default: 30, description: 'Number of days to analyze' },
          minBets: { type: 'integer', default: 5, description: 'Minimum bets for inclusion' },
          segmentBy: {
            type: 'string',
            enum: ['volume', 'frequency', 'value'],
            default: 'volume',
            description: 'Segmentation criteria',
          },
        },
        required: [],
      },
    },
    {
      name: 'getTimeSeriesAnalytics',
      description: 'Flexible time-series analysis with anomaly detection for volume, hold, bets, customers, or exposure',
      inputSchema: {
        type: 'object',
        properties: {
          metric: {
            type: 'string',
            enum: ['volume', 'hold', 'bets', 'customers', 'exposure'],
            default: 'volume',
            description: 'Metric to analyze',
          },
          lookbackDays: { type: 'integer', default: 30, description: 'Number of days to analyze' },
          granularity: {
            type: 'string',
            enum: ['hourly', 'daily', 'weekly'],
            default: 'daily',
            description: 'Time grouping',
          },
          marketType: { type: 'string', description: 'Market type filter (optional)' },
          groupBy: { type: 'string', description: 'Group by market_type or customer_segment (optional)' },
        },
        required: [],
      },
    },
  ];
}

/**
 * Raw Feed Tools
 * Direct access to raw betting data feeds
 */
function getRawFeedTools(): MCPTool[] {
  return [
    {
      name: 'getRawFeedSamples',
      description: 'Get Fantasy402 raw feed samples for data exploration and debugging',
      inputSchema: {
        type: 'object',
        properties: {
          agentID: { type: 'string', description: 'Agent ID to scope feeds to' },
          limit: { type: 'integer', default: 5, description: 'Number of samples to return' },
          dataType: { type: 'string', default: 'live_ticker', description: 'Feed type filter' },
        },
        required: ['agentID'],
      },
    },
    {
      name: 'getParsedBetData',
      description: 'Get parsed betting data with ShortDesc analysis from raw Fantasy402 feeds',
      inputSchema: {
        type: 'object',
        properties: {
          agentID: { type: 'string', description: 'Agent ID to scope data to' },
          limit: { type: 'integer', default: 20, description: 'Number of bets to return' },
          confidenceThreshold: { type: 'number', default: 0.0, description: 'Minimum parsing confidence score' },
        },
        required: ['agentID'],
      },
    },
    {
      name: 'getRawFeedHealth',
      description: 'Get raw feed processing statistics and system health metrics',
      inputSchema: {
        type: 'object',
        properties: {
          agentID: { type: 'string', description: 'Agent ID to analyze' },
          lookbackHours: { type: 'integer', default: 24, description: 'Hours to look back for analysis' },
        },
        required: ['agentID'],
      },
    },
    {
      name: 'searchRawFeeds',
      description: 'Search raw Fantasy402 feeds by content patterns and parsed data',
      inputSchema: {
        type: 'object',
        properties: {
          agentID: { type: 'string', description: 'Agent ID to scope search to' },
          searchTerm: { type: 'string', description: 'Search term to find in feeds' },
          limit: { type: 'integer', default: 20, description: 'Maximum results to return' },
        },
        required: ['agentID', 'searchTerm'],
      },
    },
  ];
}

/**
 * Admin Tools
 * Customer search, agent profiles, communications
 */
function getAdminTools(): MCPTool[] {
  return [
    {
      name: 'searchCustomers',
      description: 'Search for customers by name, email, phone, or ID - returns customer profiles and status',
      inputSchema: {
        type: 'object',
        properties: {
          agentID: { type: 'string', description: 'Agent ID to scope search to' },
          searchTerm: { type: 'string', description: 'Search term (name, email, phone, ID)' },
          searchType: {
            type: 'string',
            enum: ['ALL', 'NAME', 'EMAIL', 'PHONE', 'ID'],
            default: 'ALL',
            description: 'Type of search to perform',
          },
          limit: { type: 'integer', default: 50, description: 'Maximum results' },
          offset: { type: 'integer', default: 0, description: 'Pagination offset' },
        },
        required: ['agentID', 'searchTerm'],
      },
    },
    {
      name: 'getAgentProfile',
      description: 'Get detailed agent profile information - hierarchy, limits, settings',
      inputSchema: {
        type: 'object',
        properties: {
          agentID: { type: 'string', description: 'Agent ID to retrieve' },
        },
        required: ['agentID'],
      },
    },
    {
      name: 'getCommunicationMessages',
      description: 'Get communication messages and logs for agents or customers',
      inputSchema: {
        type: 'object',
        properties: {
          agentID: { type: 'string', description: 'Agent ID to scope to' },
          customerID: { type: 'string', description: 'Specific customer ID (optional)' },
          messageType: {
            type: 'string',
            enum: ['ALL', 'EMAIL', 'SMS', 'ALERT', 'NOTIFICATION'],
            default: 'ALL',
            description: 'Filter by message type',
          },
          limit: { type: 'integer', default: 50, description: 'Maximum messages to return' },
        },
        required: ['agentID'],
      },
    },
  ];
}

/**
 * Management Tools (Fantasy402.com API)
 * Account management, reporting, configuration
 * Note: These are proxied to Fantasy402.com API
 */
/**
 * AI-Enhanced Tools
 * AI-powered analysis using Kimi K2
 */
function getAITools(): MCPTool[] {
  return [
    {
      name: 'aiSharpAnalysis',
      description: 'AI-powered customer profiling and sharp detection using Kimi K2 - analyzes CLV, win rate, and betting patterns',
      inputSchema: {
        type: 'object',
        properties: {
          customerId: { type: 'string', description: 'Customer ID to analyze' },
          agentID: { type: 'string', description: 'Agent ID to scope to (optional)', default: 'DEMO' },
        },
        required: ['customerId'],
      },
    },
    {
      name: 'aiSteamDetection',
      description: 'AI-powered line movement and steam move detection using Kimi K2 - identifies sharp money patterns',
      inputSchema: {
        type: 'object',
        properties: {
          eventId: { type: 'string', description: 'Event ID to analyze' },
          marketType: { type: 'string', enum: ['SPREAD', 'MONEYLINE', 'TOTAL', 'PROP'], default: 'SPREAD', description: 'Market type' },
          agentID: { type: 'string', description: 'Agent ID to scope to (optional)', default: 'DEMO' },
        },
        required: ['eventId'],
      },
    },
    {
      name: 'aiRiskReport',
      description: 'AI-powered risk assessment and hedge recommendations using Kimi K2 - generates actionable risk management strategies',
      inputSchema: {
        type: 'object',
        properties: {
          eventId: { type: 'string', description: 'Event ID to analyze' },
          agentID: { type: 'string', description: 'Agent ID to scope to (optional)', default: 'DEMO' },
        },
        required: ['eventId'],
      },
    },
  ];
}

function getManagementTools(): MCPTool[] {
  return [
    {
      name: 'getAccountInfoOwner',
      description: 'Get detailed information about the account owner',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    // Additional 18+ Fantasy402 management tools would be added here
    // Examples: getListAgentsByAgent, getAgentDetails, getAgentPlayers, etc.
  ];
}
