// Sports Intelligence Engine
// Analyzes live sports data, odds movements, and betting patterns

import type { Env } from '../types/cloudflare';

export interface SportsGame {
    gameNum: number;
    team1: string;
    team2: string;
    sport: string;
    gameTime: string;
    status: string;
    spread: number;
    moneyline1: number;
    moneyline2: number;
    total: number;
    correlationID: string;
    broadcastInfo: string;
}

export interface OddsMovement {
    gameNum: number;
    team: string;
    market: string;
    oldOdds: number;
    newOdds: number;
    movement: number;
    timestamp: string;
    volume: number;
}

export interface SportsIntelligence {
    games: SportsGame[];
    activeGames: SportsGame[];
    upcomingGames: SportsGame[];
    oddsMovements: OddsMovement[];
    sharpGames: SportsGame[];
    steamGames: SportsGame[];
    volumeLeaders: Array<{
        game: string;
        volume: number;
        bets: number;
    }>;
    marketAnalysis: {
        mlb: { games: number; volume: number };
        nhl: { games: number; volume: number };
        ncaa: { games: number; volume: number };
        wnba: { games: number; volume: number };
    };
}

export class SportsIntelligenceEngine {
    private env: Env;
    private requestId: string;
    private gamesCache: Map<number, SportsGame> = new Map();
    private oddsHistory: Map<string, OddsMovement[]> = new Map();

    constructor(env: Env, requestId: string) {
        this.env = env;
        this.requestId = requestId;
    }

    // Process live sports data from Fantasy402
    async processSportsData(scoresData: any[]): Promise<SportsIntelligence> {
        console.log(`[${this.requestId}] 🏈 Processing ${scoresData.length} live sports games`);

        const games = this.parseSportsData(scoresData);
        const activeGames = this.filterActiveGames(games);
        const upcomingGames = this.filterUpcomingGames(games);

        // Analyze odds movements
        const oddsMovements = await this.analyzeOddsMovements(games);

        // Identify sharp games (professional betting)
        const sharpGames = this.identifySharpGames(games, oddsMovements);

        // Identify steam games (sudden line movements)
        const steamGames = this.identifySteamGames(games, oddsMovements);

        // Calculate volume leaders
        const volumeLeaders = await this.calculateVolumeLeaders(games);

        // Market analysis
        const marketAnalysis = this.analyzeMarkets(games);

        return {
            games,
            activeGames,
            upcomingGames,
            oddsMovements,
            sharpGames,
            steamGames,
            volumeLeaders,
            marketAnalysis
        };
    }

    // Parse sports data from Fantasy402 format
    private parseSportsData(scoresData: any[]): SportsGame[] {
        return scoresData.map(game => ({
            gameNum: game.GameNum,
            team1: game.Team1ID,
            team2: game.Team2ID,
            sport: game.SportType.trim(),
            gameTime: game.GameDateTime,
            status: game.STATUS,
            spread: game.Spread,
            moneyline1: game.MoneyLine1,
            moneyline2: game.MoneyLine2,
            total: game.Total,
            correlationID: game.CorrelationID,
            broadcastInfo: game.BroadcastInfo?.trim() || 'TBD'
        }));
    }

    // Filter active games (currently playing)
    private filterActiveGames(games: SportsGame[]): SportsGame[] {
        const now = new Date();
        return games.filter(game => {
            const gameTime = new Date(game.gameTime);
            const timeDiff = now.getTime() - gameTime.getTime();
            return timeDiff >= 0 && timeDiff <= 4 * 60 * 60 * 1000; // Within 4 hours
        });
    }

    // Filter upcoming games
    private filterUpcomingGames(games: SportsGame[]): SportsGame[] {
        const now = new Date();
        return games.filter(game => {
            const gameTime = new Date(game.gameTime);
            return gameTime.getTime() > now.getTime();
        });
    }

    // Analyze odds movements
    private async analyzeOddsMovements(games: SportsGame[]): Promise<OddsMovement[]> {
        const movements: OddsMovement[] = [];

        for (const game of games) {
            const gameKey = `${game.gameNum}`;
            const previousOdds = await this.getPreviousOdds(gameKey);

            if (previousOdds) {
                // Check moneyline movements
                if (previousOdds.moneyline1 !== game.moneyline1) {
                    movements.push({
                        gameNum: game.gameNum,
                        team: game.team1,
                        market: 'Moneyline',
                        oldOdds: previousOdds.moneyline1,
                        newOdds: game.moneyline1,
                        movement: game.moneyline1 - previousOdds.moneyline1,
                        timestamp: new Date().toISOString(),
                        volume: 0 // Would be calculated from betting data
                    });
                }

                if (previousOdds.moneyline2 !== game.moneyline2) {
                    movements.push({
                        gameNum: game.gameNum,
                        team: game.team2,
                        market: 'Moneyline',
                        oldOdds: previousOdds.moneyline2,
                        newOdds: game.moneyline2,
                        movement: game.moneyline2 - previousOdds.moneyline2,
                        timestamp: new Date().toISOString(),
                        volume: 0
                    });
                }

                // Check spread movements
                if (Math.abs(previousOdds.spread - game.spread) > 0.5) {
                    movements.push({
                        gameNum: game.gameNum,
                        team: 'Spread',
                        market: 'Spread',
                        oldOdds: previousOdds.spread,
                        newOdds: game.spread,
                        movement: game.spread - previousOdds.spread,
                        timestamp: new Date().toISOString(),
                        volume: 0
                    });
                }

                // Check total movements
                if (Math.abs(previousOdds.total - game.total) > 0.5) {
                    movements.push({
                        gameNum: game.gameNum,
                        team: 'Total',
                        market: 'Total',
                        oldOdds: previousOdds.total,
                        newOdds: game.total,
                        movement: game.total - previousOdds.total,
                        timestamp: new Date().toISOString(),
                        volume: 0
                    });
                }
            }

            // Store current odds for next comparison
            await this.storeCurrentOdds(gameKey, game);
        }

        return movements;
    }

    // Get previous odds from cache
    private async getPreviousOdds(gameKey: string): Promise<any> {
        try {
            const cached = await this.env.FANTASY_CACHE.get(`odds:${gameKey}`);
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            console.error(`[${this.requestId}] Error getting previous odds:`, error);
            return null;
        }
    }

    // Store current odds in cache
    private async storeCurrentOdds(gameKey: string, game: SportsGame): Promise<void> {
        try {
            const oddsData = {
                moneyline1: game.moneyline1,
                moneyline2: game.moneyline2,
                spread: game.spread,
                total: game.total,
                timestamp: new Date().toISOString()
            };

            await this.env.FANTASY_CACHE.put(
                `odds:${gameKey}`,
                JSON.stringify(oddsData),
                { expirationTtl: 24 * 60 * 60 } // 24 hours
            );
        } catch (error) {
            console.error(`[${this.requestId}] Error storing odds:`, error);
        }
    }

    // Identify sharp games (professional betting indicators)
    private identifySharpGames(games: SportsGame[], movements: OddsMovement[]): SportsGame[] {
        return games.filter(game => {
            // Look for games with significant line movements
            const gameMovements = movements.filter(m => m.gameNum === game.gameNum);

            // Sharp indicators:
            // 1. Large line movements (>3 points)
            // 2. Moneyline movements (>50 points)
            // 3. Multiple market movements
            const hasSharpMovement = gameMovements.some(m =>
                Math.abs(m.movement) > 3 ||
                (m.market === 'Moneyline' && Math.abs(m.movement) > 50)
            );

            // 4. Unusual line values (sharp money often moves lines to key numbers)
            const hasUnusualLines = this.hasUnusualLineValues(game);

            return hasSharpMovement || hasUnusualLines;
        });
    }

    // Identify steam games (sudden betting activity)
    private identifySteamGames(games: SportsGame[], movements: OddsMovement[]): SportsGame[] {
        return games.filter(game => {
            const gameMovements = movements.filter(m => m.gameNum === game.gameNum);

            // Steam indicators:
            // 1. Multiple movements in short time
            // 2. Consistent direction of movement
            // 3. High volume of movements

            const recentMovements = gameMovements.filter(m => {
                const movementTime = new Date(m.timestamp);
                const now = new Date();
                return (now.getTime() - movementTime.getTime()) < 30 * 60 * 1000; // Last 30 minutes
            });

            return recentMovements.length >= 2;
        });
    }

    // Check for unusual line values (sharp money indicators)
    private hasUnusualLineValues(game: SportsGame): boolean {
        // Sharp money often moves lines to key numbers
        const keyNumbers = [3, 7, 10, 14, 17, 21];

        // Check if spread is on a key number
        const spreadOnKey = keyNumbers.some(num => Math.abs(game.spread - num) < 0.5);

        // Check for unusual moneyline values
        const unusualML = Math.abs(game.moneyline1) > 200 || Math.abs(game.moneyline2) > 200;

        return spreadOnKey || unusualML;
    }

    // Calculate volume leaders
    private async calculateVolumeLeaders(games: SportsGame[]): Promise<Array<{ game: string; volume: number; bets: number }>> {
        const leaders: Array<{ game: string; volume: number; bets: number }> = [];

        for (const game of games) {
            try {
                // Get betting volume for this game from KV
                const volumeData = await this.env.FANTASY_CACHE.get(`volume:${game.gameNum}`);

                if (volumeData) {
                    const data = JSON.parse(volumeData);
                    leaders.push({
                        game: `${game.team1} vs ${game.team2}`,
                        volume: data.volume || 0,
                        bets: data.bets || 0
                    });
                }
            } catch (error) {
                console.error(`[${this.requestId}] Error getting volume for game ${game.gameNum}:`, error);
            }
        }

        return leaders.sort((a, b) => b.volume - a.volume).slice(0, 10);
    }

    // Analyze market breakdown
    private analyzeMarkets(games: SportsGame[]): {
        mlb: { games: number; volume: number };
        nhl: { games: number; volume: number };
        ncaa: { games: number; volume: number };
        wnba: { games: number; volume: number };
    } {
        const markets = {
            mlb: { games: 0, volume: 0 },
            nhl: { games: 0, volume: 0 },
            ncaa: { games: 0, volume: 0 },
            wnba: { games: 0, volume: 0 }
        };

        games.forEach(game => {
            const sport = game.sport.toLowerCase();
            if (sport.includes('baseball')) {
                markets.mlb.games++;
            } else if (sport.includes('hockey')) {
                markets.nhl.games++;
            } else if (sport.includes('football') && game.team1.includes('St')) {
                markets.ncaa.games++;
            } else if (sport.includes('basketball') && game.team1.includes('Aces')) {
                markets.wnba.games++;
            }
        });

        return markets;
    }

    // Get game by number
    getGame(gameNum: number): SportsGame | null {
        return this.gamesCache.get(gameNum) || null;
    }

    // Get odds history for a game
    getOddsHistory(gameNum: number): OddsMovement[] {
        return this.oddsHistory.get(gameNum.toString()) || [];
    }
}
