/**
 * �� Betting-Brain v3 - AI Integration Test
 * Test script for Kimi K2 AI integration
 */

import { BettingAnalyzer } from './betting-analyzer';
import type { CustomerData, LineMovementData, ExposureData } from './types';

/**
 * Test Sharp Customer Analysis
 */
async function testSharpAnalysis() {
  console.log('\n🔍 Testing Sharp Customer Analysis...\n');

  const analyzer = new BettingAnalyzer({
    apiKey: process.env.KIMI_API_KEY || '',
  });

  // Test data: Sharp customer
  const sharpCustomer: CustomerData = {
    cid: 'CUST_12345',
    clv: 15.5,      // Positive CLV (beating closing lines)
    wr: 58.3,       // 58.3% win rate (above sharp threshold)
    ao: 247,        // 247 bets (consistent action)
    nb: 12450,      // $124.50 net profit
  };

  try {
    const result = await analyzer.analyzeSharpBehavior(sharpCustomer);
    
    console.log('✅ Sharp Analysis Result:');
    console.log(`   Customer: ${result.customerId}`);
    console.log(`   Sharp Score: ${result.sharpScore}/100`);
    console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log(`   Recommendation: ${result.recommendation}`);
    console.log(`\n   Insights:`);
    result.insights.forEach(insight => console.log(`   - ${insight}`));
    console.log(`\n   Reasoning: ${result.reasoning}`);
    
    return result;
  } catch (error) {
    console.error('❌ Sharp analysis failed:', error);
    throw error;
  }
}

/**
 * Test Steam Move Detection
 */
async function testSteamMoveDetection() {
  console.log('\n🌊 Testing Steam Move Detection...\n');

  const analyzer = new BettingAnalyzer({
    apiKey: process.env.KIMI_API_KEY || '',
  });

  // Test data: Potential steam move
  const lineMovement: LineMovementData = {
    eid: 'NBA_LAL_BOS_20251009',
    mt: 'SPREAD',
    lb: -5.5,       // Line before
    la: -7.0,       // Line after (moved 1.5 points)
    vb: 125000,     // Volume before ($1,250)
    va: 285000,     // Volume after ($2,850) - 128% increase
    ts: new Date().toISOString(),
  };

  try {
    const result = await analyzer.analyzeSteamMove(lineMovement);
    
    console.log('✅ Steam Move Analysis Result:');
    console.log(`   Event: ${result.eventId}`);
    console.log(`   Market: ${result.marketType}`);
    console.log(`   Is Steam Move: ${result.isSteamMove ? 'YES' : 'NO'}`);
    console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log(`   Severity: ${result.severity}`);
    console.log(`\n   Line Movement:`);
    console.log(`   - Before: ${result.lineMovement.before}`);
    console.log(`   - After: ${result.lineMovement.after}`);
    console.log(`   - Change: ${result.lineMovement.change} (${result.lineMovement.changePercent.toFixed(2)}%)`);
    console.log(`\n   Volume Movement:`);
    console.log(`   - Before: $${(result.volumeMovement.before / 100).toFixed(2)}`);
    console.log(`   - After: $${(result.volumeMovement.after / 100).toFixed(2)}`);
    console.log(`   - Change: $${(result.volumeMovement.change / 100).toFixed(2)} (${result.volumeMovement.changePercent.toFixed(2)}%)`);
    console.log(`\n   Insights:`);
    result.insights.forEach(insight => console.log(`   - ${insight}`));
    console.log(`\n   Reasoning: ${result.reasoning}`);
    
    return result;
  } catch (error) {
    console.error('❌ Steam move detection failed:', error);
    throw error;
  }
}

/**
 * Test Risk Report Generation
 */
async function testRiskReport() {
  console.log('\n⚠️  Testing Risk Report Generation...\n');

  const analyzer = new BettingAnalyzer({
    apiKey: process.env.KIMI_API_KEY || '',
  });

  // Test data: High exposure scenario
  const exposureData: ExposureData[] = [
    {
      eid: 'NBA_LAL_BOS_20251009',
      side: 'HOME',
      risk: 850000,   // $8,500 risk
      net: -450000,   // $4,500 net exposure (negative = liability)
      ts: new Date().toISOString(),
    },
    {
      eid: 'NBA_LAL_BOS_20251009',
      side: 'AWAY',
      risk: 620000,   // $6,200 risk
      net: 280000,    // $2,800 net exposure (positive = profit)
      ts: new Date().toISOString(),
    },
  ];

  try {
    const result = await analyzer.generateRiskReport(exposureData);
    
    console.log('✅ Risk Report Result:');
    console.log(`   Event: ${result.eventId}`);
    console.log(`   Total Risk: $${(result.totalRisk / 100).toFixed(2)}`);
    console.log(`   Net Exposure: $${(result.netExposure / 100).toFixed(2)}`);
    console.log(`   Risk Level: ${result.riskLevel}`);
    console.log(`\n   Exposure Breakdown:`);
    result.exposureBreakdown.forEach(exp => {
      console.log(`   - ${exp.side}: Risk $${(exp.risk / 100).toFixed(2)}, Net $${(exp.net / 100).toFixed(2)} (${exp.percentage.toFixed(1)}%)`);
    });
    console.log(`\n   Recommendations:`);
    result.recommendations.forEach(rec => console.log(`   - ${rec}`));
    
    if (result.hedgeStrategy) {
      console.log(`\n   Hedge Strategy:`);
      console.log(`   - Action: ${result.hedgeStrategy.action}`);
      console.log(`   - Amount: $${(result.hedgeStrategy.amount / 100).toFixed(2)}`);
      console.log(`   - Reasoning: ${result.hedgeStrategy.reasoning}`);
    }
    
    console.log(`\n   Insights:`);
    result.insights.forEach(insight => console.log(`   - ${insight}`));
    console.log(`\n   Reasoning: ${result.reasoning}`);
    
    return result;
  } catch (error) {
    console.error('❌ Risk report generation failed:', error);
    throw error;
  }
}

/**
 * Test AI Chat
 */
async function testAIChat() {
  console.log('\n💬 Testing AI Chat...\n');

  const analyzer = new BettingAnalyzer({
    apiKey: process.env.KIMI_API_KEY || '',
  });

  const messages = [
    {
      role: 'user' as const,
      content: 'What are the key indicators of a sharp bettor? How can I identify them in my customer data?',
    },
  ];

  try {
    const result = await analyzer.chatAboutBettingData(messages);
    
    console.log('✅ AI Chat Result:');
    console.log(`\n${result.response}\n`);
    console.log(`   Token Usage:`);
    console.log(`   - Input: ${result.usage.inputTokens.toLocaleString()}`);
    console.log(`   - Output: ${result.usage.outputTokens.toLocaleString()}`);
    console.log(`   - Total: ${result.usage.totalTokens.toLocaleString()}`);
    console.log(`\n   Cost:`);
    console.log(`   - Input: $${result.cost.inputCost.toFixed(6)}`);
    console.log(`   - Output: $${result.cost.outputCost.toFixed(6)}`);
    console.log(`   - Total: $${result.cost.totalCost.toFixed(6)}`);
    
    return result;
  } catch (error) {
    console.error('❌ AI chat failed:', error);
    throw error;
  }
}

/**
 * Run All Tests
 */
async function runAllTests() {
  console.log('🧠 Betting-Brain v3 - AI Integration Tests');
  console.log('==========================================');

  // Check API key
  if (!process.env.KIMI_API_KEY) {
    console.error('\n❌ Error: KIMI_API_KEY environment variable not set');
    console.error('   Please set your API key in .env file\n');
    process.exit(1);
  }

  console.log(`\n✅ API Key: ${process.env.KIMI_API_KEY.substring(0, 10)}...`);

  try {
    // Run tests sequentially
    await testSharpAnalysis();
    await testSteamMoveDetection();
    await testRiskReport();
    await testAIChat();

    console.log('\n✅ All tests completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests if executed directly
if (typeof Bun !== "undefined" && import.meta.path === Bun.main) {
  runAllTests();
}

export {
  testSharpAnalysis,
  testSteamMoveDetection,
  testRiskReport,
  testAIChat,
  runAllTests,
};
