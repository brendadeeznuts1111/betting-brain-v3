// Agent Performance and Network Analysis
// Tracks agent performance, commission flows, and network relationships

import type { Env } from '../types/cloudflare';

export interface AgentPerformance {
    agentID: string;
    agentLogin: string;
    totalVolume: number;
    totalBets: number;
    avgBetSize: number;
    winRate: number;
    commission: number;
    customers: number;
    lastActive: string;
    performance: {
        hourly: number;
        daily: number;
        weekly: number;
    };
    topSports: Array<{
        sport: string;
        volume: number;
        percentage: number;
    }>;
    network: {
        directCustomers: string[];
        subAgents: string[];
        hierarchy: string;
    };
}

export interface AgentNetwork {
    agents: Map<string, AgentPerformance>;
    relationships: Map<string, string[]>; // agent -> [sub-agents]
    hierarchy: Map<string, number>; // agent -> level
    totalVolume: number;
    totalCommission: number;
}

export class AgentTracker {
    private env: Env;
    private requestId: string;
    private performanceCache: Map<string, AgentPerformance> = new Map();
    private networkCache: AgentNetwork | null = null;

    constructor(env: Env, requestId: string) {
        this.env = env;
        this.requestId = requestId;
    }

    // Analyze agent performance from betting data
    async analyzeAgentPerformance(bets: any[]): Promise<AgentPerformance[]> {
        console.log(`[${this.requestId}] 📊 Analyzing agent performance from ${bets.length} bets`);

        const agentStats = new Map<string, {
            volume: number;
            bets: any[];
            customers: Set<string>;
            sports: Map<string, number>;
            lastActive: Date;
        }>();

        // Process all bets
        bets.forEach(bet => {
            const agentID = bet.AgentID;
            const amount = parseFloat(bet.AmountWagered) || 0;
            const customerID = bet.CustomerID;
            const sport = this.extractSport(bet.ShortDesc);
            const timestamp = new Date(bet.InsertDateTime);

            if (!agentStats.has(agentID)) {
                agentStats.set(agentID, {
                    volume: 0,
                    bets: [],
                    customers: new Set(),
                    sports: new Map(),
                    lastActive: timestamp
                });
            }

            const stats = agentStats.get(agentID)!;
            stats.volume += amount;
            stats.bets.push(bet);
            stats.customers.add(customerID);
            stats.sports.set(sport, (stats.sports.get(sport) || 0) + amount);
            stats.lastActive = timestamp > stats.lastActive ? timestamp : stats.lastActive;
        });

        // Convert to performance objects
        const performances: AgentPerformance[] = [];

        agentStats.forEach((stats, agentID) => {
            const performance = this.calculateAgentPerformance(agentID, stats);
            performances.push(performance);
            this.performanceCache.set(agentID, performance);
        });

        // Sort by total volume
        return performances.sort((a, b) => b.totalVolume - a.totalVolume);
    }

    // Calculate individual agent performance
    private calculateAgentPerformance(agentID: string, stats: any): AgentPerformance {
        const totalVolume = stats.volume;
        const totalBets = stats.bets.length;
        const avgBetSize = totalBets > 0 ? totalVolume / totalBets : 0;
        const customers = stats.customers.size;

        // Calculate win rate (mock - would need settlement data)
        const winRate = this.calculateWinRate(stats.bets);

        // Calculate commission (mock - would need actual commission rates)
        const commission = this.calculateCommission(totalVolume, agentID);

        // Calculate performance metrics
        const performance = this.calculatePerformanceMetrics(stats.bets);

        // Get top sports
        const topSports = this.getTopSports(stats.sports, totalVolume);

        // Analyze network
        const network = this.analyzeAgentNetwork(agentID, stats.bets);

        return {
            agentID,
            agentLogin: stats.bets[0]?.AgentLogin || agentID,
            totalVolume,
            totalBets,
            avgBetSize,
            winRate,
            commission,
            customers,
            lastActive: stats.lastActive.toISOString(),
            performance,
            topSports,
            network
        };
    }

    // Calculate win rate (mock implementation)
    private calculateWinRate(bets: any[]): number {
        // In reality, this would require settlement data
        // For now, return a mock win rate based on bet types
        const totalBets = bets.length;
        if (totalBets === 0) return 0;

        // Mock: Higher win rate for moneyline bets, lower for parlays
        let winRate = 0.5; // Base 50%

        bets.forEach(bet => {
            if (bet.WagerType === 'M') winRate += 0.1; // Moneyline
            if (bet.WagerType === 'P') winRate -= 0.2; // Parlay
            if (bet.WagerType === 'T') winRate -= 0.15; // Teaser
        });

        return Math.max(0, Math.min(1, winRate / totalBets));
    }

    // Calculate commission (mock implementation)
    private calculateCommission(volume: number, agentID: string): number {
        // Mock commission rates based on agent tier
        const tierRates = {
            'ADAM': 0.05,    // 5%
            'CSUTT': 0.04,   // 4%
            'JACRAI50': 0.03, // 3%
            'default': 0.02  // 2%
        };

        const rate = tierRates[agentID as keyof typeof tierRates] || tierRates.default;
        return volume * rate;
    }

    // Calculate performance metrics
    private calculatePerformanceMetrics(bets: any[]): { hourly: number; daily: number; weekly: number } {
        const now = Date.now();
        const hourly = this.calculateVolumeInPeriod(bets, now - 60 * 60 * 1000);
        const daily = this.calculateVolumeInPeriod(bets, now - 24 * 60 * 60 * 1000);
        const weekly = this.calculateVolumeInPeriod(bets, now - 7 * 24 * 60 * 60 * 1000);

        return { hourly, daily, weekly };
    }

    // Calculate volume in time period
    private calculateVolumeInPeriod(bets: any[], since: number): number {
        return bets
            .filter(bet => new Date(bet.InsertDateTime).getTime() >= since)
            .reduce((sum, bet) => sum + (parseFloat(bet.AmountWagered) || 0), 0);
    }

    // Get top sports for agent
    private getTopSports(sports: Map<string, number>, totalVolume: number): Array<{ sport: string; volume: number; percentage: number }> {
        return Array.from(sports.entries())
            .map(([sport, volume]) => ({
                sport,
                volume,
                percentage: (volume / totalVolume) * 100
            }))
            .sort((a, b) => b.volume - a.volume)
            .slice(0, 5);
    }

    // Analyze agent network
    private analyzeAgentNetwork(agentID: string, bets: any[]): {
        directCustomers: string[];
        subAgents: string[];
        hierarchy: string;
    } {
        const customers = new Set<string>();
        const subAgents = new Set<string>();

        bets.forEach(bet => {
            customers.add(bet.CustomerID);

            // Check if this might be a sub-agent (has own customers)
            if (bet.CustomerID !== bet.AgentID) {
                // This is a customer bet
            } else {
                // This might be an agent bet
                subAgents.add(bet.CustomerID);
            }
        });

        return {
            directCustomers: Array.from(customers),
            subAgents: Array.from(subAgents),
            hierarchy: this.determineHierarchy(agentID, Array.from(customers).length)
        };
    }

    // Determine agent hierarchy level
    private determineHierarchy(agentID: string, customerCount: number): string {
        if (customerCount > 100) return 'Master Agent';
        if (customerCount > 50) return 'Senior Agent';
        if (customerCount > 20) return 'Agent';
        if (customerCount > 5) return 'Junior Agent';
        return 'New Agent';
    }

    // Build complete agent network
    async buildAgentNetwork(performances: AgentPerformance[]): Promise<AgentNetwork> {
        console.log(`[${this.requestId}] 🕸️ Building agent network from ${performances.length} agents`);

        const agents = new Map<string, AgentPerformance>();
        const relationships = new Map<string, string[]>();
        const hierarchy = new Map<string, number>();

        // Build agent map
        performances.forEach(perf => {
            agents.set(perf.agentID, perf);
        });

        // Build relationships (mock - would need actual hierarchy data)
        performances.forEach(perf => {
            const subAgents = perf.network.subAgents;
            relationships.set(perf.agentID, subAgents);

            // Assign hierarchy levels
            const level = this.calculateHierarchyLevel(perf);
            hierarchy.set(perf.agentID, level);
        });

        // Calculate totals
        const totalVolume = performances.reduce((sum, perf) => sum + perf.totalVolume, 0);
        const totalCommission = performances.reduce((sum, perf) => sum + perf.commission, 0);

        this.networkCache = {
            agents,
            relationships,
            hierarchy,
            totalVolume,
            totalCommission
        };

        return this.networkCache;
    }

    // Calculate hierarchy level
    private calculateHierarchyLevel(perf: AgentPerformance): number {
        const volume = perf.totalVolume;
        const customers = perf.customers;

        if (volume > 1000000 && customers > 100) return 5; // Master
        if (volume > 500000 && customers > 50) return 4;  // Senior
        if (volume > 100000 && customers > 20) return 3;   // Agent
        if (volume > 10000 && customers > 5) return 2;    // Junior
        return 1; // New
    }

    // Get agent performance summary
    getAgentSummary(agentID: string): AgentPerformance | null {
        return this.performanceCache.get(agentID) || null;
    }

    // Get network summary
    getNetworkSummary(): AgentNetwork | null {
        return this.networkCache;
    }

    // Extract sport from description
    private extractSport(description: string): string {
        const desc = description.toLowerCase();
        if (desc.includes('football')) return 'Football';
        if (desc.includes('baseball')) return 'Baseball';
        if (desc.includes('basketball')) return 'Basketball';
        if (desc.includes('tennis')) return 'Tennis';
        if (desc.includes('hockey')) return 'Hockey';
        if (desc.includes('soccer')) return 'Soccer';
        return 'Other';
    }
}
