/**
 * Fantasy402 Agent Graph API
 *
 * GET /api/f402/graph?type=ownership&depth=3
 * Returns: { nodes: [...], edges: [...] } for D3 force-layout
 *
 * Query Parameters:
 * - type: 'ownership' | 'reference' | 'credit' | 'all' (default: 'all')
 * - depth: number (default: 3, max: 5)
 * - minOverlap: number (default: 0.1, min: 0.0, max: 1.0)
 * - ringFence: boolean (default: false) - Only show potential multi-account rings
 */

import { Env } from '../../types/api';
import { CORS_HEADERS } from '../../utils/request';

interface GraphNode {
    id: string;
    label: string;
    type: string;
    risk: number;
    customers: number;
    steamMoves: number;
    lastActivity: string;
    x?: number;
    y?: number;
    vx?: number;
    vy?: number;
}

interface GraphEdge {
    source: string;
    target: string;
    type: string;
    weight: number;
    customerOverlap: number;
    steamCorrelation: number;
    creditRiskScore: number;
    strength: number;
}

interface GraphResponse {
    nodes: GraphNode[];
    edges: GraphEdge[];
    metadata: {
        totalNodes: number;
        totalEdges: number;
        ringFenceAlerts: number;
        avgOverlap: number;
        maxDepth: number;
    };
}

/**
 * GET /api/f402/graph
 * Returns agent graph data for D3 force-layout visualization
 */
export async function getAgentGraph(
    request: Request,
    env: Env,
    requestId: string
): Promise<Response> {
    console.log(`[${requestId}] 🌳 GET /api/f402/graph`);

    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'all';
    const depth = Math.min(parseInt(url.searchParams.get('depth') || '3'), 5);
    const minOverlap = Math.max(0, Math.min(1, parseFloat(url.searchParams.get('minOverlap') || '0.1')));
    const ringFence = url.searchParams.get('ringFence') === 'true';

    

    try {
        if (!env.ANALYTICS) {
            throw new Error('ANALYTICS database not configured');
        }

        console.log(`[${requestId}] 📊 Graph query: type=${type}, depth=${depth}, minOverlap=${minOverlap}, ringFence=${ringFence}`);

        // 1. Get nodes (agents) with their metadata
        const nodes = await getGraphNodes(env, requestId);
        console.log(`[${requestId}] 📊 Found ${nodes.length} nodes`);

        // 2. Get edges (relationships) with filters
        const edges = await getGraphEdges(env, type, minOverlap, ringFence, requestId);
        console.log(`[${requestId}] 📊 Found ${edges.length} edges`);

        // 3. Apply depth filtering
        const filteredEdges = applyDepthFilter(edges, nodes, depth);
        const filteredNodes = getNodesFromEdges(filteredEdges, nodes);
        console.log(`[${requestId}] 📊 After depth filter: ${filteredNodes.length} nodes, ${filteredEdges.length} edges`);

        // 4. Calculate metadata
        const metadata = calculateGraphMetadata(filteredNodes, filteredEdges, ringFence);

        const response: GraphResponse = {
            nodes: filteredNodes,
            edges: filteredEdges,
            metadata
        };

        console.log(`[${requestId}] ✅ Graph response:`, {
            nodes: response.nodes.length,
            edges: response.edges.length,
            ringFenceAlerts: response.metadata.ringFenceAlerts,
            avgOverlap: response.metadata.avgOverlap
        });

        return new Response(JSON.stringify(response), {
            headers: CORS_HEADERS,
        });

    } catch (error) {
        console.error(`[${requestId}] ❌ Error fetching agent graph:`, error);

        return new Response(
            JSON.stringify({
                error: 'Failed to fetch agent graph',
                message: error instanceof Error ? error.message : 'Unknown error',
                requestId,
            }),
            {
                status: 500,
                headers: CORS_HEADERS,
            }
        );
    }
}

/**
 * Get graph nodes (agents) with metadata
 */
async function getGraphNodes(env: Env, requestId: string): Promise<GraphNode[]> {
    try {
        // Get agent data from multiple sources
        const query = await env.ANALYTICS.prepare(`
      SELECT 
        ag.parent_id as agent_id,
        COUNT(DISTINCT ag.child_id) as children_count,
        AVG(ag.customer_overlap) as avg_overlap,
        AVG(ag.steam_correlation) as avg_steam_corr,
        AVG(ag.credit_risk_score) as avg_credit_risk
      FROM agent_graph ag
      GROUP BY ag.parent_id
      
      UNION
      
      SELECT 
        ag.child_id as agent_id,
        COUNT(DISTINCT ag.parent_id) as children_count,
        AVG(ag.customer_overlap) as avg_overlap,
        AVG(ag.steam_correlation) as avg_steam_corr,
        AVG(ag.credit_risk_score) as avg_credit_risk
      FROM agent_graph ag
      GROUP BY ag.child_id
    `).all();

        const results = query.results as Array<{
            agent_id: string;
            children_count: number;
            avg_overlap: number;
            avg_steam_corr: number;
            avg_credit_risk: number;
        }>;

        // Get additional agent metadata
        const agentMetadata = await getAgentMetadata(env, results.map(r => r.agent_id), requestId);

        return results.map(result => {
            const metadata = agentMetadata.get(result.agent_id) || {
                risk: 0,
                customers: 0,
                steamMoves: 0,
                lastActivity: new Date().toISOString()
            };

            return {
                id: result.agent_id,
                label: `Agent ${result.agent_id}`,
                type: 'agent',
                risk: metadata.risk,
                customers: metadata.customers,
                steamMoves: metadata.steamMoves,
                lastActivity: metadata.lastActivity
            };
        });

    } catch (error) {
        console.warn(`[${requestId}] ⚠️ Failed to get graph nodes:`, error);
        return [];
    }
}

/**
 * Get agent metadata from various sources
 */
async function getAgentMetadata(
    env: Env,
    agentIds: string[],
    requestId: string
): Promise<Map<string, { risk: number; customers: number; steamMoves: number; lastActivity: string }>> {
    const metadata = new Map();

    try {
        // Get risk data
        const riskQuery = await env.ANALYTICS.prepare(`
      SELECT 
        agent_id,
        SUM(stake * odds) as total_risk,
        COUNT(DISTINCT customer_id) as customer_count,
        MAX(ts) as last_activity
      FROM bet_history 
      WHERE agent_id IN (${agentIds.map(() => '?').join(',')})
        AND ts > datetime('now', '-30 days')
      GROUP BY agent_id
    `).bind(...agentIds).all();

        const riskResults = riskQuery.results as Array<{
            agent_id: string;
            total_risk: number;
            customer_count: number;
            last_activity: string;
        }>;

        // Get steam moves data
        const steamQuery = await env.ANALYTICS.prepare(`
      SELECT 
        agent_id,
        COUNT(*) as steam_moves
      FROM line_movements 
      WHERE agent_id IN (${agentIds.map(() => '?').join(',')})
        AND ts > datetime('now', '-7 days')
        AND ABS(new_line - old_line) >= 1.0
      GROUP BY agent_id
    `).bind(...agentIds).all();

        const steamResults = steamQuery.results as Array<{
            agent_id: string;
            steam_moves: number;
        }>;

        // Combine data
        for (const agentId of agentIds) {
            const riskData = riskResults.find(r => r.agent_id === agentId);
            const steamData = steamResults.find(r => r.agent_id === agentId);

            metadata.set(agentId, {
                risk: riskData?.total_risk || 0,
                customers: riskData?.customer_count || 0,
                steamMoves: steamData?.steam_moves || 0,
                lastActivity: riskData?.last_activity || new Date().toISOString()
            });
        }

    } catch (error) {
        console.warn(`[${requestId}] ⚠️ Failed to get agent metadata:`, error);
    }

    return metadata;
}

/**
 * Get graph edges (relationships) with filters
 */
async function getGraphEdges(
    env: Env,
    type: string,
    minOverlap: number,
    ringFence: boolean,
    requestId: string
): Promise<GraphEdge[]> {
    try {
        let whereClause = 'WHERE customer_overlap >= ?';
        const params: any[] = [minOverlap];

        if (type !== 'all') {
            whereClause += ' AND edge_type = ?';
            params.push(type);
        }

        if (ringFence) {
            whereClause += ' AND customer_overlap > 0.8';
        }

        const query = await env.ANALYTICS.prepare(`
      SELECT 
        parent_id,
        child_id,
        edge_type,
        weight,
        customer_overlap,
        steam_correlation,
        credit_risk_score
      FROM agent_graph 
      ${whereClause}
      ORDER BY customer_overlap DESC, weight DESC
    `).bind(...params).all();

        const results = query.results as Array<{
            parent_id: string;
            child_id: string;
            edge_type: string;
            weight: number;
            customer_overlap: number;
            steam_correlation: number;
            credit_risk_score: number;
        }>;

        return results.map(result => ({
            source: result.parent_id,
            target: result.child_id,
            type: result.edge_type,
            weight: result.weight,
            customerOverlap: result.customer_overlap,
            steamCorrelation: result.steam_correlation,
            creditRiskScore: result.credit_risk_score,
            strength: result.customer_overlap * result.weight
        }));

    } catch (error) {
        console.warn(`[${requestId}] ⚠️ Failed to get graph edges:`, error);
        return [];
    }
}

/**
 * Apply depth filtering to edges
 */
function applyDepthFilter(edges: GraphEdge[], nodes: GraphNode[], maxDepth: number): GraphEdge[] {
    if (maxDepth >= 5) return edges; // No filtering needed

    const nodeIds = new Set(nodes.map(n => n.id));
    const filteredEdges: GraphEdge[] = [];
    const visited = new Set<string>();

    // Start from root nodes (nodes with no incoming edges)
    const rootNodes = nodes.filter(node =>
        !edges.some(edge => edge.target === node.id)
    );

    function traverse(nodeId: string, currentDepth: number) {
        if (currentDepth >= maxDepth || visited.has(nodeId)) return;
        visited.add(nodeId);

        const outgoingEdges = edges.filter(edge => edge.source === nodeId);
        for (const edge of outgoingEdges) {
            if (nodeIds.has(edge.target)) {
                filteredEdges.push(edge);
                traverse(edge.target, currentDepth + 1);
            }
        }
    }

    // Start traversal from root nodes
    for (const root of rootNodes) {
        traverse(root.id, 0);
    }

    return filteredEdges;
}

/**
 * Get nodes that are referenced in edges
 */
function getNodesFromEdges(edges: GraphEdge[], allNodes: GraphNode[]): GraphNode[] {
    const nodeIds = new Set<string>();

    for (const edge of edges) {
        nodeIds.add(edge.source);
        nodeIds.add(edge.target);
    }

    return allNodes.filter(node => nodeIds.has(node.id));
}

/**
 * Calculate graph metadata
 */
function calculateGraphMetadata(
    nodes: GraphNode[],
    edges: GraphEdge[],
    ringFence: boolean
): GraphResponse['metadata'] {
    const ringFenceAlerts = edges.filter(edge => edge.customerOverlap > 0.8).length;
    const avgOverlap = edges.length > 0
        ? edges.reduce((sum, edge) => sum + edge.customerOverlap, 0) / edges.length
        : 0;

    return {
        totalNodes: nodes.length,
        totalEdges: edges.length,
        ringFenceAlerts,
        avgOverlap,
        maxDepth: 5 // Maximum depth supported
    };
}
