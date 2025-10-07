/**
 * Enhanced Sharp Score Tool with ML-like Feature Engineering
 * Multi-dimensional customer profiling with weighted features
 */

import { Env } from '../../types/api';
import { MCPToolResult } from '../types';

export async function getEnhancedSharpScore(args: Record<string, any>, env: Env): Promise<MCPToolResult> {
  try {
    const {
      cid,
      lookbackDays = 30,
      includeFeatures = true,
    } = args;

    if (!cid) {
      throw new Error('Customer ID (cid) is required');
    }

    if (!env.ANALYTICS) {
      throw new Error('ANALYTICS database not available');
    }

    // Get base sharp indicators
    const baseQuery = `
      SELECT cid, clv, wr, ao, nb
      FROM sharp_indicators
      WHERE cid = ?
      LIMIT 1
    `;

    const baseMetrics = await env.ANALYTICS.prepare(baseQuery).bind(cid).first();

    if (!baseMetrics) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Customer not found',
              cid,
            }, null, 2),
          },
        ],
        isError: true,
      };
    }

    const lookbackTime = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();

    // Feature 1: Line Movement Correlation (do they bet before steam?)
    const steamCorrelationQuery = `
      SELECT
        COUNT(*) as total_line_movements,
        SUM(CASE WHEN ABS(la - lb) >= 1.0 THEN 1 ELSE 0 END) as significant_moves,
        AVG(ABS(la - lb)) as avg_line_change
      FROM line_movements
      WHERE ts >= ?
      LIMIT 1
    `;

    const steamData = await env.ANALYTICS.prepare(steamCorrelationQuery).bind(lookbackTime).first();

    // Feature 2: Market Timing (early vs late bets)
    const timingQuery = `
      SELECT
        COUNT(*) as total_bets,
        SUM(CASE WHEN time_to_event > 3600 THEN 1 ELSE 0 END) as early_bets,
        AVG(time_to_event) as avg_time_to_event
      FROM bet_history
      WHERE cid = ? AND ts >= ?
    `;

    const timingData = await env.ANALYTICS.prepare(timingQuery).bind(cid, lookbackTime).first();

    // Feature 3: Bet Sizing Variance (sharp bettors have consistent sizing)
    const sizingQuery = `
      SELECT
        AVG(stake) as avg_stake,
        MIN(stake) as min_stake,
        MAX(stake) as max_stake,
        COUNT(*) as bet_count
      FROM bet_history
      WHERE cid = ? AND ts >= ?
    `;

    const sizingData = await env.ANALYTICS.prepare(sizingQuery).bind(cid, lookbackTime).first();

    // Feature 4: Market Selection Diversity
    const marketDiversityQuery = `
      SELECT
        COUNT(DISTINCT market_type) as unique_markets,
        COUNT(DISTINCT event_id) as unique_events,
        COUNT(*) as total_bets
      FROM bet_history
      WHERE cid = ? AND ts >= ?
    `;

    const diversityData = await env.ANALYTICS.prepare(marketDiversityQuery).bind(cid, lookbackTime).first();

    // Feature Engineering: Calculate normalized features (0-100 scale)
    const features = {
      // Core metrics (40 points)
      clv_score: Math.min(Math.max((Number(baseMetrics.clv) || 0) / 1000 * 50, 0), 20), // 0-20 points
      win_rate_score: Math.min(Math.max(((Number(baseMetrics.wr) || 50) - 50) * 0.3, 0), 15), // 0-15 points
      volume_score: Math.min(Math.max((Number(baseMetrics.ao) || 0) / 20, 0), 5), // 0-5 points

      // Advanced metrics (60 points)
      steam_correlation: steamData && Number(steamData.significant_moves) > 0
        ? Math.min((Number(steamData.significant_moves) / Number(steamData.total_line_movements)) * 15, 15)
        : 0, // 0-15 points

      timing_score: timingData && Number(timingData.early_bets) > 0
        ? Math.min((Number(timingData.early_bets) / Number(timingData.total_bets)) * 15, 15)
        : 0, // 0-15 points (early betting is sharp)

      sizing_consistency: sizingData && Number(sizingData.avg_stake) > 0
        ? Math.min((1 - ((Number(sizingData.max_stake) - Number(sizingData.min_stake)) / Number(sizingData.avg_stake))) * 15, 15)
        : 0, // 0-15 points (consistent sizing)

      market_diversity: diversityData && Number(diversityData.unique_markets) > 0
        ? Math.min((Number(diversityData.unique_markets) / 10) * 15, 15)
        : 0, // 0-15 points (sharps know multiple markets)
    };

    // Calculate composite score (0-100)
    const compositeScore = Math.round(
      features.clv_score +
      features.win_rate_score +
      features.volume_score +
      features.steam_correlation +
      features.timing_score +
      features.sizing_consistency +
      features.market_diversity
    );

    // Classification thresholds
    const classification =
      compositeScore >= 75 ? 'PROFESSIONAL_SHARP' :
      compositeScore >= 60 ? 'ADVANCED_SHARP' :
      compositeScore >= 45 ? 'INTERMEDIATE_SHARP' :
      compositeScore >= 30 ? 'CASUAL_SHARP' :
      'RECREATIONAL';

    const riskLevel =
      compositeScore >= 75 ? 'CRITICAL' :
      compositeScore >= 60 ? 'HIGH' :
      compositeScore >= 45 ? 'MEDIUM' :
      'LOW';

    const response: any = {
      customer_id: cid,
      composite_score: compositeScore,
      classification,
      risk_level: riskLevel,
      base_metrics: {
        clv: baseMetrics.clv,
        win_rate: baseMetrics.wr,
        action_count: baseMetrics.ao,
        net_balance: baseMetrics.nb,
      },
      recommendations: generateRecommendations(compositeScore, classification, features),
      metadata: {
        lookback_days: lookbackDays,
        timestamp: new Date().toISOString(),
      },
    };

    // Include detailed features if requested
    if (includeFeatures) {
      response.feature_breakdown = {
        core_features: {
          clv_score: Math.round(features.clv_score * 100) / 100,
          win_rate_score: Math.round(features.win_rate_score * 100) / 100,
          volume_score: Math.round(features.volume_score * 100) / 100,
        },
        advanced_features: {
          steam_correlation: Math.round(features.steam_correlation * 100) / 100,
          timing_score: Math.round(features.timing_score * 100) / 100,
          sizing_consistency: Math.round(features.sizing_consistency * 100) / 100,
          market_diversity: Math.round(features.market_diversity * 100) / 100,
        },
        raw_data: {
          steam_data: steamData,
          timing_data: timingData,
          sizing_data: sizingData,
          diversity_data: diversityData,
        },
      };
    }

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
    console.error('[getEnhancedSharpScore] Error:', error);
    return {
      content: [
        {
          type: 'text',
          text: `Error calculating enhanced sharp score: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Generate actionable recommendations based on sharp score
 */
function generateRecommendations(
  score: number,
  classification: string,
  features: Record<string, number>
): string[] {
  const recommendations: string[] = [];

  if (score >= 75) {
    recommendations.push('CRITICAL: Limit bet sizes immediately');
    recommendations.push('Monitor all activity in real-time');
    recommendations.push('Consider account restrictions or closure');
  } else if (score >= 60) {
    recommendations.push('HIGH RISK: Review all bets before acceptance');
    recommendations.push('Implement stricter bet limits');
    recommendations.push('Flag for manual review on large bets');
  } else if (score >= 45) {
    recommendations.push('MEDIUM RISK: Monitor for pattern changes');
    recommendations.push('Standard limits apply with caution');
  } else if (score >= 30) {
    recommendations.push('LOW-MEDIUM RISK: Standard monitoring');
    recommendations.push('Normal limits acceptable');
  } else {
    recommendations.push('LOW RISK: Recreational player');
    recommendations.push('Standard limits and monitoring');
  }

  // Feature-specific recommendations
  if (features.steam_correlation > 10) {
    recommendations.push('Customer shows high correlation with line movements');
  }
  if (features.timing_score > 10) {
    recommendations.push('Customer tends to bet early (potential information advantage)');
  }
  if (features.sizing_consistency > 10) {
    recommendations.push('Consistent bet sizing indicates professional approach');
  }

  return recommendations;
}
