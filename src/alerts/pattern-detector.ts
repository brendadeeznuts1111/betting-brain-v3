// Pattern Detection and Alert System
// Detects high-value bets, steam moves, and unusual patterns

import type { Env } from '../types/cloudflare';

export interface BettingAlert {
    id: string;
    type: 'high-value' | 'steam' | 'unusual' | 'sharp-money' | 'line-movement';
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    message: string;
    timestamp: number;
    data: {
        agentID?: string;
        customerID?: string;
        amount?: number;
        sport?: string;
        game?: string;
        line?: string;
        movement?: number;
        confidence?: number;
    };
}

export interface BetData {
    WagerNumber: number;
    AgentID: string;
    CustomerID: string;
    AmountWagered: number;
    ToWinAmount: number;
    InsertDateTime: string;
    ShortDesc: string;
    WagerType: string;
    AgentLogin: string;
}

export class PatternDetector {
    private env: Env;
    private requestId: string;
    private recentBets: BetData[] = [];
    private lineHistory: Map<string, number[]> = new Map();
    private agentPatterns: Map<string, any> = new Map();

    constructor(env: Env, requestId: string) {
        this.env = env;
        this.requestId = requestId;
    }

    // Main detection method
    async detectPatterns(bets: BetData[]): Promise<BettingAlert[]> {
        console.log(`[${this.requestId}] 🔍 Detecting patterns in ${bets.length} bets`);

        this.recentBets = bets;
        const alerts: BettingAlert[] = [];

        // Run all detection algorithms
        alerts.push(...this.detectHighValueBets());
        alerts.push(...this.detectSteamMoves());
        alerts.push(...this.detectUnusualPatterns());
        alerts.push(...this.detectSharpMoney());
        alerts.push(...this.detectLineMovements());

        // Sort by severity and timestamp
        return alerts.sort((a, b) => {
            const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
            const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
            if (severityDiff !== 0) return severityDiff;
            return b.timestamp - a.timestamp;
        });
    }

    // Detect high-value bets
    private detectHighValueBets(): BettingAlert[] {
        const alerts: BettingAlert[] = [];
        const highValueThreshold = 10000; // $100+
        const criticalThreshold = 50000; // $500+

        this.recentBets.forEach(bet => {
            const amount = bet.AmountWagered;

            if (amount >= criticalThreshold) {
                alerts.push({
                    id: `high-value-${bet.WagerNumber}`,
                    type: 'high-value',
                    severity: 'critical',
                    title: 'CRITICAL: Massive Bet Placed',
                    message: `Agent ${bet.AgentID} placed ${this.formatCurrency(amount)} bet on ${this.extractGame(bet.ShortDesc)}`,
                    timestamp: Date.parse(bet.InsertDateTime),
                    data: {
                        agentID: bet.AgentID,
                        customerID: bet.CustomerID,
                        amount,
                        sport: this.extractSport(bet.ShortDesc),
                        game: this.extractGame(bet.ShortDesc),
                        confidence: 1.0
                    }
                });
            } else if (amount >= highValueThreshold) {
                alerts.push({
                    id: `high-value-${bet.WagerNumber}`,
                    type: 'high-value',
                    severity: 'high',
                    title: 'High Value Bet Alert',
                    message: `Agent ${bet.AgentID} placed ${this.formatCurrency(amount)} bet on ${this.extractGame(bet.ShortDesc)}`,
                    timestamp: Date.parse(bet.InsertDateTime),
                    data: {
                        agentID: bet.AgentID,
                        customerID: bet.CustomerID,
                        amount,
                        sport: this.extractSport(bet.ShortDesc),
                        game: this.extractGame(bet.ShortDesc),
                        confidence: 0.9
                    }
                });
            }
        });

        return alerts;
    }

    // Detect steam moves (sudden line movements)
    private detectSteamMoves(): BettingAlert[] {
        const alerts: BettingAlert[] = [];
        const steamThreshold = 0.5; // 0.5 point movement
        const timeWindow = 5 * 60 * 1000; // 5 minutes

        // Group bets by game
        const gameBets = new Map<string, BetData[]>();
        this.recentBets.forEach(bet => {
            const game = this.extractGame(bet.ShortDesc);
            if (!gameBets.has(game)) {
                gameBets.set(game, []);
            }
            gameBets.get(game)!.push(bet);
        });

        // Analyze each game for steam moves
        gameBets.forEach((bets, game) => {
            if (bets.length < 3) return; // Need at least 3 bets

            // Check for sudden betting activity
            const now = Date.now();
            const recentBets = bets.filter(bet =>
                now - Date.parse(bet.InsertDateTime) < timeWindow
            );

            if (recentBets.length >= 3) {
                const totalVolume = recentBets.reduce((sum, bet) => sum + bet.AmountWagered, 0);
                const avgBetSize = totalVolume / recentBets.length;

                if (avgBetSize > 5000) { // High average bet size
                    alerts.push({
                        id: `steam-${game}-${Date.now()}`,
                        type: 'steam',
                        severity: 'high',
                        title: 'Steam Move Detected',
                        message: `Heavy betting activity on ${game} - ${recentBets.length} bets in 5 minutes`,
                        timestamp: Date.now(),
                        data: {
                            sport: this.extractSport(bets[0].ShortDesc),
                            game,
                            amount: totalVolume,
                            confidence: 0.8
                        }
                    });
                }
            }
        });

        return alerts;
    }

    // Detect unusual betting patterns
    private detectUnusualPatterns(): BettingAlert[] {
        const alerts: BettingAlert[] = [];
        const timeWindow = 10 * 60 * 1000; // 10 minutes

        // Check for multiple agents betting same side
        const gameBets = new Map<string, BetData[]>();
        this.recentBets.forEach(bet => {
            const game = this.extractGame(bet.ShortDesc);
            if (!gameBets.has(game)) {
                gameBets.set(game, []);
            }
            gameBets.get(game)!.push(bet);
        });

        gameBets.forEach((bets, game) => {
            if (bets.length < 5) return;

            // Check for agent clustering
            const agentCounts = new Map<string, number>();
            bets.forEach(bet => {
                agentCounts.set(bet.AgentID, (agentCounts.get(bet.AgentID) || 0) + 1);
            });

            const uniqueAgents = agentCounts.size;
            const totalBets = bets.length;

            // Unusual if many agents betting same game
            if (uniqueAgents >= 5 && totalBets >= 10) {
                alerts.push({
                    id: `unusual-${game}-${Date.now()}`,
                    type: 'unusual',
                    severity: 'medium',
                    title: 'Unusual Betting Pattern',
                    message: `${uniqueAgents} different agents betting on ${game} (${totalBets} total bets)`,
                    timestamp: Date.now(),
                    data: {
                        sport: this.extractSport(bets[0].ShortDesc),
                        game,
                        confidence: 0.7
                    }
                });
            }
        });

        return alerts;
    }

    // Detect sharp money (professional bettors)
    private detectSharpMoney(): BettingAlert[] {
        const alerts: BettingAlert[] = [];
        const sharpAgents = ['ADAM', 'CSUTT', 'JACRAI50']; // Known sharp agents
        const sharpThreshold = 25000; // $250+ bets

        this.recentBets.forEach(bet => {
            if (sharpAgents.includes(bet.AgentID) && bet.AmountWagered >= sharpThreshold) {
                alerts.push({
                    id: `sharp-${bet.WagerNumber}`,
                    type: 'sharp-money',
                    severity: 'high',
                    title: 'Sharp Money Alert',
                    message: `Sharp agent ${bet.AgentID} placed ${this.formatCurrency(bet.AmountWagered)} bet on ${this.extractGame(bet.ShortDesc)}`,
                    timestamp: Date.parse(bet.InsertDateTime),
                    data: {
                        agentID: bet.AgentID,
                        customerID: bet.CustomerID,
                        amount: bet.AmountWagered,
                        sport: this.extractSport(bet.ShortDesc),
                        game: this.extractGame(bet.ShortDesc),
                        confidence: 0.95
                    }
                });
            }
        });

        return alerts;
    }

    // Detect line movements
    private detectLineMovements(): BettingAlert[] {
        const alerts: BettingAlert[] = [];

        // This would require historical line data
        // For now, we'll simulate based on betting volume
        const highVolumeGames = new Map<string, number>();

        this.recentBets.forEach(bet => {
            const game = this.extractGame(bet.ShortDesc);
            highVolumeGames.set(game, (highVolumeGames.get(game) || 0) + bet.AmountWagered);
        });

        highVolumeGames.forEach((volume, game) => {
            if (volume > 100000) { // $100k+ in volume
                alerts.push({
                    id: `line-move-${game}-${Date.now()}`,
                    type: 'line-movement',
                    severity: 'medium',
                    title: 'Potential Line Movement',
                    message: `High volume betting on ${game} (${this.formatCurrency(volume)}) may indicate line movement`,
                    timestamp: Date.now(),
                    data: {
                        sport: this.extractSport(this.recentBets.find(b => this.extractGame(b.ShortDesc) === game)?.ShortDesc || ''),
                        game,
                        amount: volume,
                        confidence: 0.6
                    }
                });
            }
        });

        return alerts;
    }

    // Utility methods
    private extractSport(description: string): string {
        const desc = description.toLowerCase();
        if (desc.includes('football')) return 'Football';
        if (desc.includes('baseball')) return 'Baseball';
        if (desc.includes('basketball')) return 'Basketball';
        if (desc.includes('tennis')) return 'Tennis';
        if (desc.includes('hockey')) return 'Hockey';
        if (desc.includes('soccer')) return 'Soccer';
        return 'Unknown';
    }

    private extractGame(description: string): string {
        // Extract team names or game identifier
        const match = description.match(/#(\d+)/);
        if (match) {
            return `Game #${match[1]}`;
        }

        // Try to extract team names
        const parts = description.split(' - ');
        if (parts.length > 1) {
            return parts[1].substring(0, 50) + '...';
        }

        return description.substring(0, 50) + '...';
    }

    private formatCurrency(amount: number): string {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }
}
