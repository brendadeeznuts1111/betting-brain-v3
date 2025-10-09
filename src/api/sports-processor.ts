// Sports Data Processor
// Processes live sports data from Fantasy402 and integrates with analytics

import type { Env } from '../types/cloudflare';

export interface ProcessedSportsData {
    games: Array<{
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
        broadcastInfo: string;
    }>;
    marketAnalysis: {
        mlb: { games: number; volume: number };
        nhl: { games: number; volume: number };
        ncaa: { games: number; volume: number };
        wnba: { games: number; volume: number };
    };
    sharpIndicators: Array<{
        gameNum: number;
        reason: string;
        severity: 'low' | 'medium' | 'high';
    }>;
}

export class SportsDataProcessor {
    private env: Env;
    private requestId: string;

    constructor(env: Env, requestId: string) {
        this.env = env;
        this.requestId = requestId;
    }

    // Process live sports data from Fantasy402
    async processSportsData(scoresData: any[]): Promise<ProcessedSportsData> {
        console.log(`[${this.requestId}] 🏈 Processing ${scoresData.length} sports games`);

        const games = this.parseGames(scoresData);
        const marketAnalysis = this.analyzeMarkets(games);
        const sharpIndicators = this.detectSharpIndicators(games);

        // Store processed data in KV for analytics
        await this.storeSportsData(games);

        return {
            games,
            marketAnalysis,
            sharpIndicators
        };
    }

    // Parse games from Fantasy402 format
    private parseGames(scoresData: any[]): Array<{
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
        broadcastInfo: string;
    }> {
        return scoresData.map(game => ({
            gameNum: game.GameNum,
            team1: game.Team1ID,
            team2: game.Team2ID,
            sport: this.categorizeSport(game.SportType, game.Team1ID),
            gameTime: game.GameDateTime,
            status: game.STATUS,
            spread: game.Spread,
            moneyline1: game.MoneyLine1,
            moneyline2: game.MoneyLine2,
            total: game.Total,
            broadcastInfo: game.BroadcastInfo?.trim() || 'TBD'
        }));
    }

    // Categorize sport type
    private categorizeSport(sportType: string, teamName: string): string {
        const sport = sportType.toLowerCase().trim();
        const team = teamName.toLowerCase();

        if (sport.includes('baseball')) return 'MLB';
        if (sport.includes('hockey')) return 'NHL';
        if (sport.includes('basketball')) {
            if (team.includes('aces') || team.includes('mercury')) return 'WNBA';
            return 'NBA';
        }
        if (sport.includes('football')) {
            if (team.includes('st') || team.includes('liberty') || team.includes('utep')) return 'NCAA';
            return 'NFL';
        }
        if (sport.includes('soccer')) return 'Soccer';
        return 'Other';
    }

    // Analyze market breakdown
    private analyzeMarkets(games: any[]): {
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
            switch (game.sport) {
                case 'MLB':
                    markets.mlb.games++;
                    break;
                case 'NHL':
                    markets.nhl.games++;
                    break;
                case 'NCAA':
                    markets.ncaa.games++;
                    break;
                case 'WNBA':
                    markets.wnba.games++;
                    break;
            }
        });

        return markets;
    }

    // Detect sharp money indicators
    private detectSharpIndicators(games: any[]): Array<{
        gameNum: number;
        reason: string;
        severity: 'low' | 'medium' | 'high';
    }> {
        const indicators: Array<{
            gameNum: number;
            reason: string;
            severity: 'low' | 'medium' | 'high';
        }> = [];

        games.forEach(game => {
            // Check for sharp money indicators
            const reasons: string[] = [];
            let severity: 'low' | 'medium' | 'high' = 'low';

            // 1. Unusual line values (sharp money moves lines to key numbers)
            if (this.hasUnusualLineValues(game)) {
                reasons.push('Unusual line values detected');
                severity = 'medium';
            }

            // 2. Large moneyline differences (sharp money creates value)
            if (Math.abs(game.moneyline1 - game.moneyline2) > 200) {
                reasons.push('Large moneyline spread');
                severity = 'high';
            }

            // 3. Key number spreads (3, 7, 10, 14, etc.)
            if (this.isKeyNumberSpread(game.spread)) {
                reasons.push('Key number spread');
                severity = 'medium';
            }

            // 4. Unusual totals
            if (this.hasUnusualTotal(game.total)) {
                reasons.push('Unusual total line');
                severity = 'low';
            }

            if (reasons.length > 0) {
                indicators.push({
                    gameNum: game.gameNum,
                    reason: reasons.join(', '),
                    severity
                });
            }
        });

        return indicators;
    }

    // Check for unusual line values
    private hasUnusualLineValues(game: any): boolean {
        // Sharp money often moves lines to key numbers
        const keyNumbers = [3, 7, 10, 14, 17, 21];

        // Check if spread is on a key number
        const spreadOnKey = keyNumbers.some(num => Math.abs(game.spread - num) < 0.5);

        // Check for unusual moneyline values
        const unusualML = Math.abs(game.moneyline1) > 300 || Math.abs(game.moneyline2) > 300;

        return spreadOnKey || unusualML;
    }

    // Check if spread is on a key number
    private isKeyNumberSpread(spread: number): boolean {
        const keyNumbers = [3, 7, 10, 14, 17, 21];
        return keyNumbers.some(num => Math.abs(spread - num) < 0.5);
    }

    // Check for unusual total
    private hasUnusualTotal(total: number): boolean {
        // Unusual totals are often indicators of sharp money
        const unusualTotals = [6.5, 7.5, 8.5, 9.5, 10.5, 11.5];
        return unusualTotals.includes(total);
    }

    // Store sports data in KV for analytics
    private async storeSportsData(games: any[]): Promise<void> {
        try {
            const sportsData = {
                games,
                timestamp: new Date(Date.now()).toISOString(),
                count: games.length
            };

            await this.env.FANTASY_CACHE.put(
                'sports:live',
                JSON.stringify(sportsData),
                { expirationTtl: 24 * 60 * 60 } // 24 hours
            );

            console.log(`[${this.requestId}] ✅ Stored ${games.length} sports games in KV`);
        } catch (error) {
            console.error(`[${this.requestId}] ❌ Error storing sports data:`, error);
        }
    }

    // Get live sports data from KV
    async getLiveSportsData(): Promise<any> {
        try {
            const data = await this.env.FANTASY_CACHE.get('sports:live');
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error(`[${this.requestId}] ❌ Error getting sports data:`, error);
            return null;
        }
    }

    // Get games by sport
    async getGamesBySport(sport: string): Promise<any[]> {
        const sportsData = await this.getLiveSportsData();
        if (!sportsData) return [];

        return sportsData.games.filter((game: any) => game.sport === sport);
    }

    // Get active games (currently playing)
    async getActiveGames(): Promise<any[]> {
        const sportsData = await this.getLiveSportsData();
        if (!sportsData) return [];

        const now = new Date(Date.now());
        return sportsData.games.filter((game: any) => {
            const gameTime = new Date(Date.parse(game.gameTime));
            const timeDiff = now.getTime() - gameTime.getTime();
            return timeDiff >= 0 && timeDiff <= 4 * 60 * 60 * 1000; // Within 4 hours
        });
    }

    // Get upcoming games
    async getUpcomingGames(): Promise<any[]> {
        const sportsData = await this.getLiveSportsData();
        if (!sportsData) return [];

        const now = new Date(Date.now());
        return sportsData.games.filter((game: any) => {
            const gameTime = new Date(Date.parse(game.gameTime));
            return gameTime.getTime() > now.getTime();
        });
    }
}
