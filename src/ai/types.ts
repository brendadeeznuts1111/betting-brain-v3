/**
 * 🧠 Betting-Brain v3 - AI Type Definitions
 * TypeScript types for Kimi K2 AI integration
 */

/**
 * Sharp Customer Analysis Result
 */
export interface SharpAnalysisResult {
  customerId: string;
  sharpScore: number;        // 0-100 score
  confidence: number;         // 0-1 confidence level
  indicators: {
    clv: number;             // Customer Lifetime Value
    winRate: number;         // Win rate percentage
    actionCount: number;     // Number of bets
    netBet: number;          // Net betting amount
  };
  insights: string[];        // AI-generated insights
  recommendation: 'SHARP' | 'RECREATIONAL' | 'MONITOR';
  reasoning: string;         // AI explanation
}

/**
 * Steam Move Analysis Result
 */
export interface SteamMoveResult {
  eventId: string;
  marketType: string;
  isSteamMove: boolean;
  confidence: number;        // 0-1 confidence level
  lineMovement: {
    before: number;
    after: number;
    change: number;
    changePercent: number;
  };
  volumeMovement: {
    before: number;
    after: number;
    change: number;
    changePercent: number;
  };
  insights: string[];
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reasoning: string;
}

/**
 * Risk Report Result
 */
export interface RiskReportResult {
  eventId: string;
  totalRisk: number;
  netExposure: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  exposureBreakdown: {
    side: string;
    risk: number;
    net: number;
    percentage: number;
  }[];
  recommendations: string[];
  hedgeStrategy?: {
    action: string;
    amount: number;
    reasoning: string;
  };
  insights: string[];
  reasoning: string;
}

/**
 * AI Chat Message
 */
export interface AIChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * AI Chat Result
 */
export interface AIChatResult {
  response: string;
  usage: TokenUsage;
  cost: CostBreakdown;
}

/**
 * Token Usage Tracking
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

/**
 * Cost Breakdown
 */
export interface CostBreakdown {
  inputCost: number;        // USD
  outputCost: number;       // USD
  totalCost: number;        // USD
  inputTokens: number;
  outputTokens: number;
}

/**
 * Customer Data for Analysis
 */
export interface CustomerData {
  cid: string;
  clv: number;
  wr: number;
  ao: number;
  nb: number;
  upd?: string;
}

/**
 * Line Movement Data
 */
export interface LineMovementData {
  eid: string;
  mt: string;
  lb: number | null;
  la: number | null;
  vb: number;
  va: number;
  ts: string;
}

/**
 * Exposure Data
 */
export interface ExposureData {
  eid: string;
  side: string;
  risk: number;
  net: number;
  ts: string;
}

/**
 * AI Analyzer Configuration
 */
export interface AIAnalyzerConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * AI Error
 */
export interface AIError {
  code: string;
  message: string;
  details?: unknown;
}
