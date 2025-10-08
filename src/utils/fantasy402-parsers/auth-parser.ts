/**
 * Fantasy402 Authentication & Sports Parsers
 * Handle auth responses and sports type data
 */

import { cleanString } from './helpers';

/**
 * Parse sport types from Fantasy402 response
 */
export function parseSportTypes(response: any): string[] {
  try {
    const sports = response?.SportTypes || response?.sportTypes || [];
    
    if (!Array.isArray(sports)) {
      return [];
    }

    return sports
      .map((sport: any) => cleanString(sport.Name || sport.name || sport))
      .filter((name: string) => name.length > 0);
  } catch (error) {
    console.error('Error parsing sport types:', error);
    return [];
  }
}

/**
 * Parse authentication response
 */
export function parseAuthResponse(response: any): {
  success: boolean;
  token?: string;
  error?: string;
} {
  try {
    // Check for successful auth
    if (response?.Success === true || response?.success === true) {
      return {
        success: true,
        token: cleanString(response.Token || response.token),
      };
    }

    // Check for error
    if (response?.Error || response?.error) {
      return {
        success: false,
        error: cleanString(response.Error || response.error),
      };
    }

    return { success: false, error: 'Unknown auth response' };
  } catch (error) {
    console.error('Error parsing auth response:', error);
    return { success: false, error: 'Parse error' };
  }
}
