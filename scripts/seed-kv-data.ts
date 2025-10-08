/**
 * Seed KV with mock BetTicker data for testing
 * Run: bun run scripts/seed-kv-data.ts
 */

// Mock BetTicker response with realistic data
const mockBetTickerData = {
  data: {
    wagers: [
      {
        wagerId: 'w001',
        customerId: 'cust-123',
        agentId: 'agent-001',
        risk: 100,
        toWin: 110,
        agentPnl: 5.50,
        type: 'straight',
        status: 'pending',
        placedAt: Date.now() - 60000, // 1 min ago
      },
      {
        wagerId: 'w002',
        customerId: 'cust-456',
        agentId: 'agent-001',
        risk: 250,
        toWin: 225,
        agentPnl: 12.75,
        type: 'parlay',
        status: 'pending',
        placedAt: Date.now() - 120000, // 2 mins ago
      },
      {
        wagerId: 'w003',
        customerId: 'cust-789',
        agentId: 'agent-002',
        risk: 500,
        toWin: 550,
        agentPnl: 25.00,
        type: 'straight',
        status: 'pending',
        placedAt: Date.now() - 180000, // 3 mins ago
      },
      {
        wagerId: 'w004',
        customerId: 'cust-123',
        agentId: 'agent-003',
        risk: 150,
        toWin: 165,
        agentPnl: 7.50,
        type: 'teaser',
        status: 'pending',
        placedAt: Date.now() - 240000, // 4 mins ago
      },
      {
        wagerId: 'w005',
        customerId: 'cust-999',
        agentId: 'agent-001',
        risk: 300,
        toWin: 270,
        agentPnl: 15.00,
        type: 'straight',
        status: 'settled',
        placedAt: Date.now() - 300000, // 5 mins ago
        settledAt: Date.now() - 60000,
      },
      {
        wagerId: 'w006',
        customerId: 'cust-555',
        agentId: 'agent-002',
        risk: 75,
        toWin: 82.50,
        agentPnl: 3.75,
        type: 'straight',
        status: 'pending',
        placedAt: Date.now() - 30000, // 30 secs ago
      },
      {
        wagerId: 'w007',
        customerId: 'cust-888',
        agentId: 'agent-003',
        risk: 1000,
        toWin: 900,
        agentPnl: 50.00,
        type: 'parlay',
        status: 'pending',
        placedAt: Date.now() - 90000, // 1.5 mins ago
      },
      {
        wagerId: 'w008',
        customerId: 'cust-456',
        agentId: 'agent-001',
        risk: 200,
        toWin: 180,
        agentPnl: 10.00,
        type: 'straight',
        status: 'pending',
        placedAt: Date.now() - 150000, // 2.5 mins ago
      },
    ],
    summary: {
      totalWagers: 8,
      totalRisk: 2575,
      totalToWin: 2542.50,
      totalAgentPnl: 129.50,
    },
  },
};

console.log('🌱 Seeding KV with mock BetTicker data...');
console.log(`📊 Wagers: ${mockBetTickerData.data.wagers.length}`);
console.log(`💰 Total Risk: $${mockBetTickerData.data.summary.totalRisk}`);
console.log(`🤖 Agents: ${new Set(mockBetTickerData.data.wagers.map(w => w.agentId)).size}`);
console.log(`👥 Customers: ${new Set(mockBetTickerData.data.wagers.map(w => w.customerId)).size}`);

console.log('\n📝 To seed this data, run:');
console.log('wrangler kv:key put "raw:getBetTicker:' + Date.now() + '" \\');
console.log('  --binding BET_TICKER_RAW \\');
console.log('  --local \\');
console.log('  "' + JSON.stringify(mockBetTickerData).replace(/"/g, '\\"') + '"');

console.log('\n✅ Or use this curl command:');
console.log('curl -X POST http://localhost:8787/__test/seed-kv');
