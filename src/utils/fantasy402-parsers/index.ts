/**
 * Fantasy402 Parsers - Main Entry Point
 * Centralized parser exports and operation data extraction
 */

// Re-export all parsers
export * from './helpers';
export * from './auth-parser';
export * from './agent-parser';
export * from './player-parser';

// Import for extractOperationData
import { parseSportTypes, parseAuthResponse } from './auth-parser';
import {
  parseWeeklyFigures,
  parseAgentList,
  parseAccountInfo,
  parseAuthorizations,
} from './agent-parser';
import {
  parsePlayerInfo,
  parsePlayerPerformance,
  parsePendingWagers,
  parsePlayerAnalysis,
  parseAgentPerformance,
} from './player-parser';

/**
 * Extract and parse operation data based on operation type
 */
export function extractOperationData(operation: string, responseBody: any): any {
  try {
    switch (operation?.toLowerCase()) {
      // Authentication
      case 'getauthentication':
      case 'authenticate':
        return { auth: parseAuthResponse(responseBody) };

      // Sports & Config
      case 'getsporttypes':
        return { sportTypes: parseSportTypes(responseBody) };

      // Weekly Data
      case 'getweeklyfigures':
        return { weeklyFigures: parseWeeklyFigures(responseBody) };

      // Agent Data
      case 'getagentlist':
        return { agentList: parseAgentList(responseBody) };

      case 'getaccountinfo':
        return { accountInfo: parseAccountInfo(responseBody) };

      case 'getauthorizations':
        return { authorizations: parseAuthorizations(responseBody) };

      case 'getagentperformance':
        return { agentPerformance: parseAgentPerformance(responseBody) };

      // Player Data
      case 'getplayerinfo':
        return { playerInfo: parsePlayerInfo(responseBody) };

      case 'getplayerperformance':
        return { playerPerformance: parsePlayerPerformance(responseBody) };

      case 'getpendingwagers':
        return { pendingWagers: parsePendingWagers(responseBody) };

      case 'getplayeranalysis':
        return { playerAnalysis: parsePlayerAnalysis(responseBody) };

      // Unknown operation - return raw
      default:
        console.warn(`Unknown operation: ${operation}`);
        return { raw: responseBody };
    }
  } catch (error) {
    console.error(`Error extracting operation data for ${operation}:`, error);
    return { raw: responseBody, error: String(error) };
  }
}
