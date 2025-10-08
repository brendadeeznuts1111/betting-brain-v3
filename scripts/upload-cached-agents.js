#!/usr/bin/env node
/**
 * Upload cached agents from /tmp/fantasy402-agents.json to worker
 */

const WORKER_URL = 'http://localhost:8787';
const CACHE_FILE = '/tmp/fantasy402-agents.json';
const CHUNK_SIZE = 300;

(async () => {
  console.log('📤 Uploading cached agents to worker...');

  // Read cached agents
  const file = Bun.file(CACHE_FILE);
  const agents = await file.json();
  console.log(`✅ Read ${agents.length} agents from cache`);

  // Chunk the agents
  const chunks = [];
  for (let i = 0; i < agents.length; i += CHUNK_SIZE) {
    chunks.push(agents.slice(i, i + CHUNK_SIZE));
  }
  console.log(`📦 Split into ${chunks.length} chunks`);

  // Upload each chunk
  const ts = Date.now();
  for (let c = 0; c < chunks.length; c++) {
    const payload = {
      tree: chunks[c],
      chunk: { index: c, total: chunks.length },
      ts,
      source: 'cache-upload',
      force: true
    };

    const res = await fetch(`${WORKER_URL}/api/fantasy402/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Extension-Secret': 'default-dev-secret-change-me'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      console.error(`❌ Chunk ${c} failed: ${res.status}`);
      throw new Error(`Chunk ${c} failed`);
    }

    const result = await res.json();
    console.log(`  ✅ Chunk ${c + 1}/${chunks.length}: ${result.stored} agents stored`);
  }

  console.log('🎉 Done! All agents uploaded.');
})();
