/**
 * 🧠 Betting-Brain v3 - D1 → AI Integration Test
 * Tests the complete data pipeline: D1 Database → AI Analysis
 */

import { BettingAnalyzer } from './betting-analyzer';
import type { Env } from '../types/api';
import type { CustomerData, LineMovementData, ExposureData } from './types';

/**
 * Test Sharp Customer Analysis with D1 Data
 */
export async function testD1SharpAnalysis(env: Env): Promise<void> {
  console.log('\n🔍 Testing D1 → AI Sharp Customer Analysis...\n');

  // 1. Query customer data from D1
  const customerId = 'CUST_TEST_001';
  
  const customer = await env.ANALYTICS.prepare(`
    SELECT cid, clv, wr, ao, nb, upd
    FROM sharp_indicators
    WHERE cid = ?
    LIMIT 1
  `).bind(customerId).first<CustomerData>();

  if (!customer) {
    console.log('⚠️  No customer data found in D1, using mock data');
    // Use mock data for testing
    const mockCustomer: CustomerData = {
      cid: customerId,
      clv: 12.3,
      wr: 56.7,
      ao: 189,
      nb: 8950,
    };
    
    await analyzeCustomer(mockCustomer, env);
    return;
  }

  console.log(`✅ Retrieved customer from D1: ${customer.cid}`);
  console.log(`   CLV: ${customer.clv}, WR: ${customer.wr}%, Bets: ${customer.ao}`);

  await analyzeCustomer(customer, env);
}

async function analyzeCustomer(customer: CustomerData, env: Env): Promise<void> {
  // 2. Initialize AI analyzer
  const apiKey = env.KIMI_API_KEY || process.env.KIMI_API_KEY || '';
  
  if (!apiKey || apiKey === 'sk-placeholder-use-dotenv-or-secrets') {
    console.error('❌ KIMI_API_KEY not configured');
    console.error('   Set KIMI_API_KEY in .env or wrangler.toml');
    return;
  }

  const analyzer = new BettingAnalyzer({ apiKey });

  // 3. Analyze with AI
  console.log('\n�� Sending to Kimi K2 AI...');
  const result = await analyzer.analyzeSharpBehavior(customer);

  // 4. Display results
  console.log('\n✅ AI Analysis Complete:');
  console.log(`   Sharp Score: ${result.sharpScore}/100`);
  console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
  console.log(`   Recommendation: ${result.recommendation}`);
  console.log(`\n   Insights:`);
  result.insights.forEach(insight => console.log(`   - ${insight}`));
}

/**
 * Test Steam Move Detection with D1 Data
 */
export async function testD1SteamDetection(env: Env): Promise<void> {
  console.log('\n🌊 Testing D1 → AI Steam Move Detection...\n');

  // 1. Query line movement from D1
  const eventId = 'NBA_TEST_EVENT';
  const marketType = 'SPREAD';

  const lineMovement = await env.ANALYTICS.prepare(`
    SELECT eid, mt, lb, la, vb, va, ts
    FROM line_movements
    WHERE eid = ? AND mt = ?
    ORDER BY ts DESC
    LIMIT 1
  `).bind(eventId, marketType).first<LineMovementData>();

  if (!lineMovement) {
    console.log('⚠️  No line movement data found in D1, using mock data');
    const mockLineMovement: LineMovementData = {
      eid: eventId,
      mt: marketType,
      lb: -6.0,
      la: -7.5,
      vb: 150000,
      va: 320000,
      ts: new Date().toISOString(),
    };
    
    await analyzeLineMovement(mockLineMovement, env);
    return;
  }

  console.log(`✅ Retrieved line movement from D1: ${lineMovement.eid}`);
  console.log(`   Line: ${lineMovement.lb} → ${lineMovement.la}`);
  console.log(`   Volume: $${(lineMovement.vb / 100).toFixed(2)} → $${(lineMovement.va / 100).toFixed(2)}`);

  await analyzeLineMovement(lineMovement, env);
}

async function analyzeLineMovement(lineMovement: LineMovementData, env: Env): Promise<void> {
  const apiKey = env.KIMI_API_KEY || process.env.KIMI_API_KEY || '';
  
  if (!apiKey || apiKey === 'sk-placeholder-use-dotenv-or-secrets') {
    console.error('❌ KIMI_API_KEY not configured');
    return;
  }

  const analyzer = new BettingAnalyzer({ apiKey });

  console.log('\n🤖 Sending to Kimi K2 AI...');
  const result = await analyzer.analyzeSteamMove(lineMovement);

  console.log('\n✅ AI Analysis Complete:');
  console.log(`   Is Steam Move: ${result.isSteamMove ? 'YES' : 'NO'}`);
  console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
  console.log(`   Severity: ${result.severity}`);
  console.log(`\n   Insights:`);
  result.insights.forEach(insight => console.log(`   - ${insight}`));
}

/**
 * Test Risk Report with D1 Data
 */
export async function testD1RiskReport(env: Env): Promise<void> {
  console.log('\n⚠️  Testing D1 → AI Risk Report...\n');

  // 1. Query exposure data from D1
  const eventId = 'NBA_TEST_EVENT';

  const exposureData = await env.ANALYTICS.prepare(`
    SELECT eid, side, risk, net, ts
    FROM exposure_tracking
    WHERE eid = ?
  `).bind(eventId).all<ExposureData>();

  if (!exposureData.results || exposureData.results.length === 0) {
    console.log('⚠️  No exposure data found in D1, using mock data');
    const mockExposure: ExposureData[] = [
      {
        eid: eventId,
        side: 'HOME',
        risk: 750000,
        net: -350000,
        ts: new Date().toISOString(),
      },
      {
        eid: eventId,
        side: 'AWAY',
        risk: 520000,
        net: 180000,
        ts: new Date().toISOString(),
      },
    ];
    
    await analyzeRisk(mockExposure, env);
    return;
  }

  console.log(`✅ Retrieved exposure data from D1: ${exposureData.results.length} sides`);
  exposureData.results.forEach(exp => {
    console.log(`   ${exp.side}: Risk $${(exp.risk / 100).toFixed(2)}, Net $${(exp.net / 100).toFixed(2)}`);
  });

  await analyzeRisk(exposureData.results, env);
}

async function analyzeRisk(exposureData: ExposureData[], env: Env): Promise<void> {
  const apiKey = env.KIMI_API_KEY || process.env.KIMI_API_KEY || '';
  
  if (!apiKey || apiKey === 'sk-placeholder-use-dotenv-or-secrets') {
    console.error('❌ KIMI_API_KEY not configured');
    return;
  }

  const analyzer = new BettingAnalyzer({ apiKey });

  console.log('\n🤖 Sending to Kimi K2 AI...');
  const result = await analyzer.generateRiskReport(exposureData);

  console.log('\n✅ AI Analysis Complete:');
  console.log(`   Risk Level: ${result.riskLevel}`);
  console.log(`   Total Risk: $${(result.totalRisk / 100).toFixed(2)}`);
  console.log(`   Net Exposure: $${(result.netExposure / 100).toFixed(2)}`);
  console.log(`\n   Recommendations:`);
  result.recommendations.forEach(rec => console.log(`   - ${rec}`));
  
  if (result.hedgeStrategy) {
    console.log(`\n   Hedge Strategy:`);
    console.log(`   - ${result.hedgeStrategy.action}`);
    console.log(`   - Amount: $${(result.hedgeStrategy.amount / 100).toFixed(2)}`);
  }
}

/**
 * Run All D1 Integration Tests
 */
export async function runD1IntegrationTests(env: Env): Promise<void> {
  console.log('�� Betting-Brain v3 - D1 → AI Integration Tests');
  console.log('================================================');

  // Check API key
  const apiKey = env.KIMI_API_KEY || process.env.KIMI_API_KEY || '';
  
  if (!apiKey || apiKey === 'sk-placeholder-use-dotenv-or-secrets') {
    console.error('\n❌ Error: KIMI_API_KEY not configured');
    console.error('   Please set KIMI_API_KEY in .env or wrangler.toml\n');
    return;
  }

  console.log(`\n✅ API Key: ${apiKey.substring(0, 10)}...`);
  console.log(`✅ D1 Database: ${env.ANALYTICS ? 'Connected' : 'Not Connected'}`);

  try {
    await testD1SharpAnalysis(env);
    await testD1SteamDetection(env);
    await testD1RiskReport(env);

    console.log('\n✅ All D1 integration tests completed!\n');
  } catch (error) {
    console.error('\n❌ D1 integration test failed:', error);
    throw error;
  }
}
