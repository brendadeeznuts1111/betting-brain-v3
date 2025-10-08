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
      synced_at: Date.now()
    };

    agentMap[agentId] = node;
    levelStack[level] = agentId;
  });

  const flatAgents = Object.values(agentMap);
  console.log(`✅ Built tree with ${flatAgents.length} agents`);

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
