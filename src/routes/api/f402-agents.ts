/**
 * Fantasy402 Agent Routes - Main Entry (Legacy Compatibility)
 *
 * This file has been split into modular routes for better maintainability.
 * All exports are re-exported here for backward compatibility.
 *
 * New structure:
 * - analytics.ts: Agent performance, list, and detail endpoints
 * - tree.ts: Agent hierarchy and synchronization
 * - cache.ts: Cache metrics and warming operations
 * - index.ts: Main entry with all exports
 *
 * @see src/routes/api/f402-agents/
 */

// Re-export everything from the new modular structure
export * from './f402-agents';
