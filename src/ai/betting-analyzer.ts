/**
 * �� Betting-Brain v3 - AI Betting Analyzer
 * Core AI analysis logic using Kimi K2
 */

import { generateText, streamText } from 'ai';
import { parseAIJSON } from './json-parser';
import { createKimiModel, calculateCost } from './kimi-provider';
import type {
  SharpAnalysisResult,
  SteamMoveResult,
  RiskReportResult,
  AIChatMessage,
  AIChatResult,
  CustomerData,
  LineMovementData,
  ExposureData,
  AIAnalyzerConfig,
} from './types';

/**
 * BettingAnalyzer - AI-powered betting intelligence
 */
export class BettingAnalyzer {
  private apiKey: string;
  private model: string;
  private maxTokens: number;
  private temperature: number;

  constructor(config: AIAnalyzerConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'kimi-k2';
    this.maxTokens = config.maxTokens || 4000;
    this.temperature = config.temperature || 0.7;
  }

  /**
   * Analyze Sharp Customer Behavior
   * Uses AI to identify sharp bettors based on CLV, win rate, and betting patterns
   */
  async analyzeSharpBehavior(customerData: CustomerData): Promise<SharpAnalysisResult> {
    const model = createKimiModel(this.apiKey, this.model);

    const prompt = `You are a sports betting analytics expert. Analyze this customer's betting behavior and determine if they are a sharp bettor.

Customer Data:
- Customer ID: ${customerData.cid}
- CLV (Customer Lifetime Value): ${customerData.clv}
- Win Rate: ${customerData.wr}%
- Action Count (Number of Bets): ${customerData.ao}
- Net Bet Amount: $${customerData.nb}

Sharp Bettor Indicators:
- High CLV (positive value indicates beating closing lines)
- Win rate > 55% (industry sharp threshold)
- Consistent action (high bet count)
- Positive net betting (winning overall)

Analyze this customer and provide:
1. Sharp Score (0-100, where 100 is definitely sharp)
2. Confidence Level (0-1)
3. Key Insights (3-5 bullet points)
4. Recommendation (SHARP, RECREATIONAL, or MONITOR)
5. Detailed Reasoning

Respond in JSON format:
{
  "sharpScore": <number 0-100>,
  "confidence": <number 0-1>,
  "insights": ["insight1", "insight2", ...],
  "recommendation": "SHARP|RECREATIONAL|MONITOR",
  "reasoning": "detailed explanation"
}`;

    try {
      const result = await generateText({
        model,
        prompt,
        maxOutputTokens: this.maxTokens,
        temperature: this.temperature,
      });

      // Parse AI response
      const aiResponse = parseAIJSON(result.text);

      return {
        customerId: customerData.cid,
        sharpScore: aiResponse.sharpScore,
        confidence: aiResponse.confidence,
        indicators: {
          clv: customerData.clv,
          winRate: customerData.wr,
          actionCount: customerData.ao,
          netBet: customerData.nb,
        },
        insights: aiResponse.insights,
        recommendation: aiResponse.recommendation,
        reasoning: aiResponse.reasoning,
      };
    } catch (error) {
      throw new Error(`Sharp analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze Steam Move
   * Detects sharp money movement based on line and volume changes
   */
  async analyzeSteamMove(lineMovement: LineMovementData): Promise<SteamMoveResult> {
    const model = createKimiModel(this.apiKey, this.model);

    const lineChange = (lineMovement.la ?? 0) - (lineMovement.lb ?? 0);
    const lineChangePercent = lineMovement.lb ? (lineChange / lineMovement.lb) * 100 : 0;
    const volumeChange = lineMovement.va - lineMovement.vb;
    const volumeChangePercent = lineMovement.vb ? (volumeChange / lineMovement.vb) * 100 : 0;

    const prompt = `You are a sports betting steam move detection expert. Analyze this line movement and determine if it's a steam move (sharp money indicator).

Line Movement Data:
- Event ID: ${lineMovement.eid}
- Market Type: ${lineMovement.mt}
- Line Before: ${lineMovement.lb}
- Line After: ${lineMovement.la}
- Line Change: ${lineChange} (${lineChangePercent.toFixed(2)}%)
- Volume Before: ${lineMovement.vb}
- Volume After: ${lineMovement.va}
- Volume Change: ${volumeChange} (${volumeChangePercent.toFixed(2)}%)
- Timestamp: ${lineMovement.ts}

Steam Move Indicators:
- Significant line movement (>2% for spreads, >10% for moneylines)
- Large volume increase (>50%)
- Rapid movement (short time window)
- Movement against public betting patterns

Analyze and provide:
1. Is this a steam move? (true/false)
2. Confidence Level (0-1)
3. Severity (LOW, MEDIUM, HIGH, CRITICAL)
4. Key Insights (3-5 bullet points)
5. Detailed Reasoning

Respond in JSON format:
{
  "isSteamMove": <boolean>,
  "confidence": <number 0-1>,
  "severity": "LOW|MEDIUM|HIGH|CRITICAL",
  "insights": ["insight1", "insight2", ...],
  "reasoning": "detailed explanation"
}`;

    try {
      const result = await generateText({
        model,
        prompt,
        maxOutputTokens: this.maxTokens,
        temperature: this.temperature,
      });

      const aiResponse = parseAIJSON(result.text);

      return {
        eventId: lineMovement.eid,
        marketType: lineMovement.mt,
        isSteamMove: aiResponse.isSteamMove,
        confidence: aiResponse.confidence,
        lineMovement: {
          before: lineMovement.lb ?? 0,
          after: lineMovement.la ?? 0,
          change: lineChange,
          changePercent: lineChangePercent,
        },
        volumeMovement: {
          before: lineMovement.vb,
          after: lineMovement.va,
          change: volumeChange,
          changePercent: volumeChangePercent,
        },
        insights: aiResponse.insights,
        severity: aiResponse.severity,
        reasoning: aiResponse.reasoning,
      };
    } catch (error) {
      throw new Error(`Steam move analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate Risk Report
   * AI-powered risk assessment and hedge recommendations
   */
  async generateRiskReport(exposureData: ExposureData[]): Promise<RiskReportResult> {
    if (exposureData.length === 0) {
      throw new Error('No exposure data provided');
    }

    const model = createKimiModel(this.apiKey, this.model);

    // Calculate totals
    const totalRisk = exposureData.reduce((sum, exp) => sum + exp.risk, 0);
    const netExposure = exposureData.reduce((sum, exp) => sum + exp.net, 0);

    // Format exposure breakdown
    const exposureBreakdown = exposureData.map(exp => ({
      side: exp.side,
      risk: exp.risk,
      net: exp.net,
      percentage: totalRisk > 0 ? (exp.risk / totalRisk) * 100 : 0,
    }));

    const prompt = `You are a sports betting risk management expert. Analyze this exposure data and provide risk assessment with hedge recommendations.

Exposure Data:
- Event ID: ${exposureData[0].eid}
- Total Risk: $${(totalRisk / 100).toFixed(2)}
- Net Exposure: $${(netExposure / 100).toFixed(2)}

Breakdown by Side:
${exposureBreakdown.map(exp => `- ${exp.side}: Risk $${(exp.risk / 100).toFixed(2)}, Net $${(exp.net / 100).toFixed(2)} (${exp.percentage.toFixed(1)}%)`).join('\n')}

Risk Assessment Criteria:
- LOW: Net exposure < $1,000
- MEDIUM: Net exposure $1,000 - $5,000
- HIGH: Net exposure $5,000 - $10,000
- CRITICAL: Net exposure > $10,000

Analyze and provide:
1. Risk Level (LOW, MEDIUM, HIGH, CRITICAL)
2. Recommendations (3-5 actionable items)
3. Hedge Strategy (if needed)
4. Key Insights
5. Detailed Reasoning

Respond in JSON format:
{
  "riskLevel": "LOW|MEDIUM|HIGH|CRITICAL",
  "recommendations": ["rec1", "rec2", ...],
  "hedgeStrategy": {
    "action": "description",
    "amount": <number in cents>,
    "reasoning": "explanation"
  },
  "insights": ["insight1", "insight2", ...],
  "reasoning": "detailed explanation"
}`;

    try {
      const result = await generateText({
        model,
        prompt,
        maxOutputTokens: this.maxTokens,
        temperature: this.temperature,
      });

      const aiResponse = parseAIJSON(result.text);

      return {
        eventId: exposureData[0].eid,
        totalRisk,
        netExposure,
        riskLevel: aiResponse.riskLevel,
        exposureBreakdown,
        recommendations: aiResponse.recommendations,
        hedgeStrategy: aiResponse.hedgeStrategy,
        insights: aiResponse.insights,
        reasoning: aiResponse.reasoning,
      };
    } catch (error) {
      throw new Error(`Risk report generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Interactive Chat about Betting Data
   * Conversational AI for exploring betting patterns and insights
   */
  async chatAboutBettingData(messages: AIChatMessage[]): Promise<AIChatResult> {
    const model = createKimiModel(this.apiKey, this.model);

    // Add system message if not present
    const systemMessage: AIChatMessage = {
      role: 'system',
      content: `You are an expert sports betting analyst with deep knowledge of:
- Sharp bettor identification and CLV analysis
- Steam move detection and line movement patterns
- Risk management and exposure hedging
- Betting market dynamics and public vs sharp money
- Statistical analysis and probability assessment

Provide clear, actionable insights based on betting data. Use specific numbers and percentages when available.`,
    };

    const allMessages = messages[0]?.role === 'system' ? messages : [systemMessage, ...messages];

    try {
      const result = await generateText({
        model,
        messages: allMessages,
        maxOutputTokens: this.maxTokens,
        temperature: this.temperature,
      });

      const usage = {
        inputTokens: result.usage?.inputTokens ?? 0,
        outputTokens: result.usage?.outputTokens ?? 0,
        totalTokens: (result.usage?.inputTokens ?? 0) + (result.usage?.outputTokens ?? 0),
      };

      const cost = calculateCost(usage.inputTokens, usage.outputTokens);

      return {
        response: result.text,
        usage,
        cost,
      };
    } catch (error) {
      throw new Error(`Chat failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
