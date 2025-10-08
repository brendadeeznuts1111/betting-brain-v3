/**
 * Fantasy402 Agent Routes - Main Entry Point
 * Re-exports all agent-related functionality
 */

// Re-export analytics functions
export {
  getAgentPerformance,
  getAgentList,
  getAgentDetail
} from './analytics';

// Re-export tree functions
export {
  getAgentTree,
  syncAgents
} from './tree';

// Re-export cache functions
export {
  getCacheMetrics
} from './cache';
