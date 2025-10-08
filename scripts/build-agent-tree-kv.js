#!/usr/bin/env node
/**
 * Build agent tree from cached data and output JSON for manual KV upload
 */

const CACHE_FILE = '/tmp/fantasy402-agents.json';
const OUTPUT_FILE = '/tmp/fantasy402-agents-tree.json';

(async () => {
  console.log('🌲 Building agent tree from cached data...');

  // Read cached agents
  const file = Bun.file(CACHE_FILE);
  const agents = await file.json();
  console.log(`✅ Read ${agents.length} agents from cache`);

  // Sort by SeqNumber
  agents.sort((a, b) => (a.SeqNumber || 0) - (b.SeqNumber || 0));

  const agentMap = {};
  const levelStack = [];

  // Build hierarchy using Level field
  agents.forEach(agent => {
    const agentId = (agent.AgentID || '').trim();
    const level = agent.Level || 1;

    // Find parent: last agent at level-1
    let parentId = null;
    if (level > 1 && levelStack[level - 1]) {
      parentId = levelStack[level - 1];
    }

    const node = {
      agent_id: agentId,
      parent_id: parentId,
      agent_type: agent.AgentType || 'A',
      agent_owner: parentId || 'BILLY666',
      agent_name: agent.Login || agentId,
      level: level,
      active: 1,
      site_id: 1,
      synced_at: Date.now(),
      // Real metrics from API
      risk_score: agent.HeadCountRateM || 0,
      steam_percentage: (agent.LiveBettingRateM || 0) + (agent.LiveBetting2RateM || 0),
      velocity: agent.InetHeadCountRateM || 0,
      sharpness: (agent.PropBuilderRateM || 0) + (agent.FlashBetsRate || 0) + (agent.ExtPropsRate || 0),
      // Additional raw metrics
      casino_rate: agent.CasinoHeadCountRateM || 0,
      live_casino_rate: agent.LiveCasinoRateM || 0,
      crash_rate: agent.CrashRate || 0
    };

    agentMap[agentId] = node;
    levelStack[level] = agentId;
  });

  const flatAgents = Object.values(agentMap);
  console.log(`✅ Built tree with ${flatAgents.length} agents`);

  // Calculate rollup metrics (bottom-up: children → parents)
  // Sort by level descending to process children before parents
  const sortedAgents = [...flatAgents].sort((a, b) => b.level - a.level);

  for (const agent of sortedAgents) {
    // Find all direct children
    const children = flatAgents.filter(a => a.parent_id === agent.agent_id);

    if (children.length > 0) {
      // Aggregate child metrics
      agent.child_count = children.length;
      agent.total_risk = agent.risk_score + children.reduce((sum, c) => sum + (c.total_risk || c.risk_score), 0);
      agent.total_steam = agent.steam_percentage + children.reduce((sum, c) => sum + (c.total_steam || c.steam_percentage), 0);
      agent.total_velocity = agent.velocity + children.reduce((sum, c) => sum + (c.total_velocity || c.velocity), 0);
      agent.total_sharpness = agent.sharpness + children.reduce((sum, c) => sum + (c.total_sharpness || c.sharpness), 0);

      // Count all descendants (recursive depth)
      agent.descendant_count = children.reduce((sum, c) => sum + 1 + (c.descendant_count || 0), 0);
    } else {
      // Leaf node - own metrics only
      agent.child_count = 0;
      agent.descendant_count = 0;
      agent.total_risk = agent.risk_score;
      agent.total_steam = agent.steam_percentage;
      agent.total_velocity = agent.velocity;
      agent.total_sharpness = agent.sharpness;
    }
  }

  console.log(`📊 Rollup complete: calculated totals for ${flatAgents.filter(a => a.child_count > 0).length} parent agents`);

  // Count levels
  const levelCounts = {};
  flatAgents.forEach(a => {
    levelCounts[a.level] = (levelCounts[a.level] || 0) + 1;
  });
  console.log(`📊 Level distribution:`, levelCounts);

  // Output KV-ready JSON
  const kvPayload = {
    agents: flatAgents,
    count: flatAgents.length,
    timestamp: new Date().toISOString(),
    source: 'manual-tree-build',
    levels: levelCounts
  };

  await Bun.write(OUTPUT_FILE, JSON.stringify(kvPayload, null, 2));
  console.log(`💾 Wrote ${OUTPUT_FILE}`);
  console.log(`\n🔧 Next steps:`);
  console.log(`   wrangler kv:key put --binding=FANTASY_CACHE "fantasy402:agents:tree:latest" --path="${OUTPUT_FILE}"`);
})();
