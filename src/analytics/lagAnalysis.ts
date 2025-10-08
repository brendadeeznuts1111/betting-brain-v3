// Lag Analysis – Steam propagation timing between agents
// Calculates average lag between parent/child agent steam bets

import type { Env } from '../types/api';

export interface LagResult {
  parentId: string;
  childId: string;
  avgLagMs: number;
  eventCount: number;
  lastSharedSteam: number; // Unix timestamp
}

/**
 * Analyze lag between parent and child agents on steam events
 * Returns map: parentId -> { childId -> LagResult }
 */
export async function lagAnalysis(
  bets: any[],
  steamEvents: Set<string>,
  lookbackDays = 30
): Promise<Map<string, Map<string, LagResult>>> {
  const cutoff = Date.now() - lookbackDays * 24 * 60 * 60 * 1000;

  // Filter to steam bets within lookback
  const steamBets = bets.filter(b =>
    steamEvents.has(b.EventID) &&
    new Date(b.InsertDateTime).getTime() >= cutoff
  );

  // Group by event and agent
  const eventAgentBets = new Map<string, Map<string, any[]>>();
  steamBets.forEach(bet => {
    const eid = bet.EventID;
    const aid = bet.AgentID;

    if (!eventAgentBets.has(eid)) {
      eventAgentBets.set(eid, new Map());
    }
    const agentMap = eventAgentBets.get(eid)!;
    if (!agentMap.has(aid)) {
      agentMap.set(aid, []);
    }
    agentMap.get(aid)!.push(bet);
  });

  // Calculate lags between all agent pairs
  const lagMap = new Map<string, Map<string, { lags: number[]; lastShared: number }>>();

  eventAgentBets.forEach((agentMap, eid) => {
    const agents = Array.from(agentMap.keys());

    // Compare all pairs
    for (let i = 0; i < agents.length; i++) {
      for (let j = 0; j < agents.length; j++) {
        if (i === j) continue;

        const parentId = agents[i];
        const childId = agents[j];

        const parentBets = agentMap.get(parentId)!;
        const childBets = agentMap.get(childId)!;

        // Find earliest parent bet and earliest child bet
        const parentTime = Math.min(...parentBets.map(b => new Date(b.InsertDateTime).getTime()));
        const childTime = Math.min(...childBets.map(b => new Date(b.InsertDateTime).getTime()));

        // Only count if child bet after parent (child follows parent)
        if (childTime > parentTime) {
          const lag = childTime - parentTime;

          if (!lagMap.has(parentId)) {
            lagMap.set(parentId, new Map());
          }
          const childMap = lagMap.get(parentId)!;
          if (!childMap.has(childId)) {
            childMap.set(childId, { lags: [], lastShared: 0 });
          }
          const data = childMap.get(childId)!;
          data.lags.push(lag);
          data.lastShared = Math.max(data.lastShared, parentTime);
        }
      }
    }
  });

  // Convert to results with averages
  const results = new Map<string, Map<string, LagResult>>();

  lagMap.forEach((childMap, parentId) => {
    const childResults = new Map<string, LagResult>();

    childMap.forEach((data, childId) => {
      const avgLagMs = data.lags.reduce((sum, lag) => sum + lag, 0) / data.lags.length;
      childResults.set(childId, {
        parentId,
        childId,
        avgLagMs: Math.round(avgLagMs),
        eventCount: data.lags.length,
        lastSharedSteam: data.lastShared
      });
    });

    results.set(parentId, childResults);
  });

  return results;
}

/**
 * Update agent_graph table with lag results
 * Non-blocking via waitUntil
 */
export async function updateGraphWithLags(
  env: Env,
  ctx: ExecutionContext,
  lagResults: Map<string, Map<string, LagResult>>
): Promise<void> {
  const updates: Promise<void>[] = [];

  lagResults.forEach((childMap, parentId) => {
    childMap.forEach((result, childId) => {
      const query = `
        UPDATE agent_graph
        SET avg_lag_ms = ?,
            last_steamed_same_game = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE parent_id = ? AND child_id = ?
      `;

      updates.push(
        env.ANALYTICS.prepare(query)
          .bind(result.avgLagMs, result.lastSharedSteam, parentId, childId)
          .run()
          .then(() => {})
      );
    });
  });

  ctx.waitUntil(Promise.all(updates));
}

/**
 * Get steam propagation view (with lag filtering)
 */
export async function getSteamPropagation(
  env: Env,
  minLagMs = 0,
  limit = 100
): Promise<Array<{
  parentId: string;
  childId: string;
  avgLagMs: number;
  steamCorrelation: number;
  lastSharedSteam: number;
}>> {
  const query = `
    SELECT
      parent_id,
      child_id,
      avg_lag_ms,
      steam_correlation,
      last_steamed_same_game
    FROM agent_graph
    WHERE edge_type = 'refers'
      AND avg_lag_ms >= ?
      AND steam_correlation > 0.5
    ORDER BY steam_correlation DESC, avg_lag_ms ASC
    LIMIT ?
  `;

  const result = await env.ANALYTICS.prepare(query)
    .bind(minLagMs, limit)
    .all();

  return result.results.map((row: any) => ({
    parentId: row.parent_id,
    childId: row.child_id,
    avgLagMs: row.avg_lag_ms,
    steamCorrelation: row.steam_correlation,
    lastSharedSteam: row.last_steamed_same_game
  }));
}

/**
 * Ring-fence query excluding fast followers (< 5s lag)
 */
export async function getRingFenceAgents(
  env: Env,
  overlapThreshold = 0.8,
  minLagMs = 5000
): Promise<Array<{
  parentId: string;
  childId: string;
  customerOverlap: number;
  avgLagMs: number;
  creditRisk: number;
}>> {
  const query = `
    SELECT
      parent_id,
      child_id,
      customer_overlap,
      avg_lag_ms,
      credit_risk_score
    FROM agent_graph
    WHERE customer_overlap > ?
      AND avg_lag_ms >= ?
    ORDER BY customer_overlap DESC, avg_lag_ms DESC
    LIMIT 50
  `;

  const result = await env.ANALYTICS.prepare(query)
    .bind(overlapThreshold, minLagMs)
    .all();

  return result.results.map((row: any) => ({
    parentId: row.parent_id,
    childId: row.child_id,
    customerOverlap: row.customer_overlap,
    avgLagMs: row.avg_lag_ms,
    creditRisk: row.credit_risk_score
  }));
}
