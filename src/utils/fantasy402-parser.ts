/**
 * Fantasy402 Parser - Main Entry (Legacy Compatibility)
 *
 * This file has been split into modular parsers for better maintainability.
 * All exports are re-exported here for backward compatibility.
 *
 * New structure:
 * - helpers.ts: Utility functions (cleanString, safeParseFloat, normalizeObject)
 * - auth-parser.ts: Authentication & sports parsing
 * - agent-parser.ts: Agent & account data parsing
 * - player-parser.ts: Player data & wagers parsing
 * - index.ts: Main entry with extractOperationData
 *
 * @see src/utils/fantasy402-parsers/
 */

// Re-export everything from the new modular structure
export * from './fantasy402-parsers';
