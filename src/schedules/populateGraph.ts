/**
 * Agent Graph Population Cron Job
 * 
 * Runs nightly to populate agent_graph table with relationship data
 * - Walks cached agent tree from KV
 * - Calculates customer overlap percentages
 * - Detects steam propagation patterns
 * - Assesses credit risk concentrations
 * 
 * Cron: "0 3 * * *" (3 AM UTC daily)
 */

import { Env } from '../types/api';

interface AgentNode {
    id: string;
    parentId?: string;
    children: string[];
    customers: string[];
    steamMoves: number;
    totalRisk: number;
    lastActivity: string;
}

interface GraphEdge {
    parentId: string;
    childId: string;
    edgeType: string;
    weight: number;
    customerOverlap: number;
    steamCorrelation: number;
    creditRiskScore: number;
}

/**
 * Populate agent graph with relationship data
 */
export async function populateAgentGraph(
    env: Env,
    ctx: ExecutionContext
): Promise<void> {
    const requestId = `populate-graph-${Date.now().toString(36)}`;
    console.log(`[${requestId}] 🌳 Starting agent graph population`);

    try {
        if (!env.ANALYTICS) {
            throw new Error('ANALYTICS database not configured');
        }

        // 1. Get cached agent tree from KV
        const agentTree = await getCachedAgentTree(env, requestId);
        if (!agentTree || Object.keys(agentTree).length === 0) {
            console.log(`[${requestId}] ⚠️ No agent tree data found in KV`);
            return;
        }

        console.log(`[${requestId}] 📊 Found ${Object.keys(agentTree).length} agents in tree`);

        // 2. Calculate relationships and edges
        const edges = await calculateAgentRelationships(agentTree, env, requestId);
        console.log(`[${requestId}] 🔗 Calculated ${edges.length} relationships`);

        // 3. Clear existing graph data
        await env.ANALYTICS.prepare('DELETE FROM agent_graph').run();
        console.log(`[${requestId}] 🗑️ Cleared existing graph data`);

        // 4. Insert new graph data in batches
        const batchSize = 100;
        for (let i = 0; i < edges.length; i += batchSize) {
            const batch = edges.slice(i, i + batchSize);
            await insertGraphBatch(env, batch, requestId);
        }

        console.log(`[${requestId}] ✅ Agent graph populated successfully: ${edges.length} edges`);

    } catch (error) {
        console.error(`[${requestId}] ❌ Error populating agent graph:`, error);
        throw error;
    }
}

/**
 * Get cached agent tree from KV
 */
async function getCachedAgentTree(env: Env, requestId: string): Promise<Record<string, AgentNode> | null> {
    try {
        if (!env.FANTASY_CACHE) {
            console.warn(`[${requestId}] ⚠️ FANTASY_CACHE not configured`);
            return null;
        }

        // Try to get agent tree from cache
        const treeData = await env.FANTASY_CACHE.get('agentTree:latest');
        if (!treeData) {
            console.warn(`[${requestId}] ⚠️ No agent tree in cache`);
            return null;
        }

        return JSON.parse(treeData);
    } catch (error) {
        console.warn(`[${requestId}] ⚠️ Failed to get agent tree from cache:`, error);
        return null;
    }
}

/**
 * Calculate agent relationships and edges
 */
async function calculateAgentRelationships(
    agentTree: Record<string, AgentNode>,
    env: Env,
    requestId: string
): Promise<GraphEdge[]> {
    const edges: GraphEdge[] = [];
    const agentIds = Object.keys(agentTree);

    console.log(`[${requestId}] 🔍 Calculating relationships for ${agentIds.length} agents`);

    for (const parentId of agentIds) {
        const parent = agentTree[parentId];
        if (!parent) continue;

        // 1. Ownership relationships (parent -> children)
        for (const childId of parent.children) {
            const child = agentTree[childId];
            if (!child) continue;

            const customerOverlap = calculateCustomerOverlap(parent.customers, child.customers);
            const steamCorrelation = await calculateSteamCorrelation(parentId, childId, env, requestId);
            const creditRiskScore = await calculateCreditRiskScore(parentId, childId, env, requestId);

            edges.push({
                parentId,
                childId,
                edgeType: 'owns',
                weight: 1.0, // Full ownership
                customerOverlap,
                steamCorrelation,
                creditRiskScore
            });
        }

        // 2. Reference relationships (agents that refer to each other)
        for (const otherId of agentIds) {
            if (otherId === parentId) continue;

            const other = agentTree[otherId];
            if (!other) continue;

            const customerOverlap = calculateCustomerOverlap(parent.customers, other.customers);

            // Only create reference edge if significant customer overlap
            if (customerOverlap > 0.1) { // 10% threshold
                const steamCorrelation = await calculateSteamCorrelation(parentId, otherId, env, requestId);
                const creditRiskScore = await calculateCreditRiskScore(parentId, otherId, env, requestId);

                edges.push({
                    parentId,
                    childId: otherId,
                    edgeType: 'refers',
                    weight: customerOverlap,
                    customerOverlap,
                    steamCorrelation,
                    creditRiskScore
                });
            }
        }

        // 3. Credit sharing relationships (agents sharing credit risk)
        for (const otherId of agentIds) {
            if (otherId === parentId) continue;

            const other = agentTree[otherId];
            if (!other) continue;

            const customerOverlap = calculateCustomerOverlap(parent.customers, other.customers);

            // Only create credit edge if high customer overlap (potential multi-account)
            if (customerOverlap > 0.8) { // 80% threshold for ring-fencing
                const steamCorrelation = await calculateSteamCorrelation(parentId, otherId, env, requestId);
                const creditRiskScore = await calculateCreditRiskScore(parentId, otherId, env, requestId);

                edges.push({
                    parentId,
                    childId: otherId,
                    edgeType: 'shares-credit',
                    weight: customerOverlap,
                    customerOverlap,
                    steamCorrelation,
                    creditRiskScore
                });
            }
        }
    }

    return edges;
}

/**
 * Calculate customer overlap percentage between two agents
 */
function calculateCustomerOverlap(customers1: string[], customers2: string[]): number {
    if (customers1.length === 0 || customers2.length === 0) return 0;

    const set1 = new Set(customers1);
    const set2 = new Set(customers2);

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
}

/**
 * Calculate steam correlation between two agents
 */
async function calculateSteamCorrelation(
    agent1: string,
    agent2: string,
    env: Env,
    requestId: string
): Promise<number> {
    try {
        // Get steam moves for both agents from last 24 hours
        const query = await env.ANALYTICS.prepare(`
      SELECT 
        agent_id,
        COUNT(*) as steam_count,
        AVG(ABS(new_line - old_line)) as avg_line_change
      FROM line_movements 
      WHERE agent_id IN (?, ?) 
        AND ts > datetime('now', '-24 hours')
        AND ABS(new_line - old_line) >= 1.0
      GROUP BY agent_id
    `).bind(agent1, agent2).all();

        const results = query.results as Array<{ agent_id: string; steam_count: number; avg_line_change: number }>;

        if (results.length < 2) return 0;

        const agent1Data = results.find(r => r.agent_id === agent1);
        const agent2Data = results.find(r => r.agent_id === agent2);

        if (!agent1Data || !agent2Data) return 0;

        // Simple correlation based on steam activity
        const correlation = Math.min(agent1Data.steam_count, agent2Data.steam_count) /
            Math.max(agent1Data.steam_count, agent2Data.steam_count);

        return Math.min(correlation, 1.0);
    } catch (error) {
        console.warn(`[${requestId}] ⚠️ Failed to calculate steam correlation:`, error);
        return 0;
    }
}

/**
 * Calculate credit risk score between two agents
 */
async function calculateCreditRiskScore(
    agent1: string,
    agent2: string,
    env: Env,
    requestId: string
): Promise<number> {
    try {
        // Get total risk exposure for both agents
        const query = await env.ANALYTICS.prepare(`
      SELECT 
        agent_id,
        SUM(stake * odds) as total_risk
      FROM bet_history 
      WHERE agent_id IN (?, ?) 
        AND result = 'PENDING'
        AND ts > datetime('now', '-7 days')
      GROUP BY agent_id
    `).bind(agent1, agent2).all();

        const results = query.results as Array<{ agent_id: string; total_risk: number }>;

        if (results.length < 2) return 0;

        const agent1Risk = results.find(r => r.agent_id === agent1)?.total_risk || 0;
        const agent2Risk = results.find(r => r.agent_id === agent2)?.total_risk || 0;

        // Risk score based on combined exposure
        const combinedRisk = agent1Risk + agent2Risk;
        const maxRisk = Math.max(agent1Risk, agent2Risk);

        return Math.min(combinedRisk / (maxRisk * 2), 1.0);
    } catch (error) {
        console.warn(`[${requestId}] ⚠️ Failed to calculate credit risk:`, error);
        return 0;
    }
}

/**
 * Insert graph data in batches
 */
async function insertGraphBatch(
    env: Env,
    edges: GraphEdge[],
    requestId: string
): Promise<void> {
    try {
        const stmt = env.ANALYTICS.prepare(`
      INSERT INTO agent_graph (
        parent_id, child_id, edge_type, weight, 
        customer_overlap, steam_correlation, credit_risk_score
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

        for (const edge of edges) {
            await stmt.bind(
                edge.parentId,
                edge.childId,
                edge.edgeType,
                edge.weight,
                edge.customerOverlap,
                edge.steamCorrelation,
                edge.creditRiskScore
            ).run();
        }

        console.log(`[${requestId}] ✅ Inserted batch of ${edges.length} edges`);
    } catch (error) {
        console.error(`[${requestId}] ❌ Failed to insert graph batch:`, error);
        throw error;
    }
}
