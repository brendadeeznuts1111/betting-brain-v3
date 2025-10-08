/**
 * Sports API Integration Utilities
 *
 * Handles fetching from multiple bookmakers with fallback
 * Implements daily API key rotation for security
 */

import type { Sport, Market, OddsSource, AggregatedOdds } from '../types/api';

/**
 * Rotate API keys daily for security
 *
 * Pattern: PINNACLE_KEY_1, PINNACLE_KEY_2, PINNACLE_KEY_3
 * Rotates based on day of year modulo 3
 *
 * @param keyName - Base key name (e.g., 'PINNACLE_KEY')
 * @returns Rotated key value
 */
export function rotateSecret(keyName: string): string {
  const dayOfYear = Math.floor(Date.now() / 86400000) % 3 + 1;
  const rotatedKey = `${keyName}_${dayOfYear}`;

  return process.env[rotatedKey] || process.env[keyName] || '';
}

/**
 * Fetch odds from Pinnacle API
 */
async function fetchPinnacleOdds(
  sport: Sport,
  market: Market,
  apiKey: string
): Promise<OddsSource> {
  try {
    if (!apiKey) {
      return {
        source: 'pinnacle',
        data: null,
        error: 'API key not configured',
      };
    }

    const url = `https://api.pinnacle.com/v3/odds/${sport}/${market}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(5000), // 5s timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    return {
      source: 'pinnacle',
      data: {
        home: data.home_odds || data.homeOdds || 0,
        away: data.away_odds || data.awayOdds || 0,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      source: 'pinnacle',
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Fetch odds from Bet365 API
 */
async function fetchBet365Odds(
  sport: Sport,
  market: Market,
  apiKey: string
): Promise<OddsSource> {
  try {
    if (!apiKey) {
      return { source: 'bet365', data: null, error: 'API key not configured' };
    }

    const url = `https://api.bet365.com/v2/odds/${sport}/${market}`;
    const response = await fetch(url, {
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    return {
      source: 'bet365',
      data: {
        home: data.home || 0,
        away: data.away || 0,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      source: 'bet365',
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Aggregate odds from multiple bookmakers with fallback
 *
 * Fetches from Pinnacle and Bet365 in parallel
 * Returns all successful sources + any errors
 *
 * @param sport - Sport type
 * @param market - Market type
 * @returns Aggregated odds from all sources
 */
export async function aggregateOdds(
  sport: Sport,
  market: Market
): Promise<AggregatedOdds> {
  const pinnacleKey = rotateSecret('PINNACLE_KEY');
  const bet365Key = rotateSecret('BET365_KEY');

  // Fetch from all sources in parallel
  const results = await Promise.allSettled([
    fetchPinnacleOdds(sport, market, pinnacleKey),
    fetchBet365Odds(sport, market, bet365Key),
  ]);

  const sources: OddsSource[] = results
    .filter(
      (r): r is PromiseFulfilledResult<OddsSource> => r.status === 'fulfilled'
    )
    .map((r) => r.value);

  return {
    sport,
    market,
    sources,
    aggregatedAt: new Date().toISOString(),
  };
}

/**
 * Fetch live scores from SportsData.io
 */
export async function fetchLiveScores(sport: Sport): Promise<any> {
  const apiKey = rotateSecret('SPORTSDATA_KEY');

  if (!apiKey) {
    return { error: 'SportsData API key not configured' };
  }

  try {
    const url = `https://api.sportsdata.io/v3/${sport}/scores/json/GamesByDate/${
      new Date().toISOString().split('T')[0]
    }`;
    const response = await fetch(url, {
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    return {
      error: 'SportsData unavailable',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
