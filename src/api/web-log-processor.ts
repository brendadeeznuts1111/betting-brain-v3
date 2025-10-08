// Web Log Processor
// Processes getWebLog API calls from Fantasy402 for detailed betting analysis

import type { Env } from '../types/cloudflare';

export interface WebLogEntry {
    wagerNumber: string;
    agentID: string;
    customerID: string;
    login: string;
    wagerType: string;
    amountWagered: number;
    insertDateTime: string;
    toWinAmount: number;
    ticketWriter: string;
    volumeAmount: number;
    shortDesc: string;
    vip: string;
    agentLogin: string;
}

export interface ProcessedWebLog {
    entries: WebLogEntry[];
    summary: {
        totalWagers: number;
        totalVolume: number;
        totalToWin: number;
        agentBreakdown: Map<string, number>;
        customerBreakdown: Map<string, number>;
        wagerTypeBreakdown: Map<string, number>;
        timeRange: {
            start: string;
            end: string;
        };
    };
    patterns: {
        highValueWagers: WebLogEntry[];
        frequentCustomers: Array<{ customer: string; count: number }>;
        agentActivity: Array<{ agent: string; volume: number; wagers: number }>;
        timePatterns: Array<{ hour: number; count: number; volume: number }>;
    };
}

export class WebLogProcessor {
    private env: Env;
    private requestId: string;

    constructor(env: Env, requestId: string) {
        this.env = env;
        this.requestId = requestId;
    }

    // Process web log data from Fantasy402
    async processWebLog(webLogData: any[]): Promise<ProcessedWebLog> {
        console.log(`[${this.requestId}] 📊 Processing ${webLogData.length} web log entries`);

        const entries = this.parseWebLogEntries(webLogData);
        const summary = this.calculateSummary(entries);
        const patterns = this.analyzePatterns(entries);

        // Store processed data
        await this.storeWebLogData(entries, summary, patterns);

        return {
            entries,
            summary,
            patterns
        };
    }

    // Parse web log entries from Fantasy402 format
    private parseWebLogEntries(webLogData: any[]): WebLogEntry[] {
        return webLogData.map(entry => ({
            wagerNumber: entry.WagerNumber?.toString() || '',
            agentID: entry.AgentID || '',
            customerID: entry.CustomerID || '',
            login: entry.Login || '',
            wagerType: entry.WagerType || '',
            amountWagered: parseFloat(entry.AmountWagered) || 0,
            insertDateTime: entry.InsertDateTime || '',
            toWinAmount: parseFloat(entry.ToWinAmount) || 0,
            ticketWriter: entry.TicketWriter || '',
            volumeAmount: parseFloat(entry.VolumeAmount) || 0,
            shortDesc: entry.ShortDesc || '',
            vip: entry.VIP || '',
            agentLogin: entry.AgentLogin || ''
        }));
    }

    // Calculate summary statistics
    private calculateSummary(entries: WebLogEntry[]): {
        totalWagers: number;
        totalVolume: number;
        totalToWin: number;
        agentBreakdown: Map<string, number>;
        customerBreakdown: Map<string, number>;
        wagerTypeBreakdown: Map<string, number>;
        timeRange: { start: string; end: string };
    } {
        const totalWagers = entries.length;
        const totalVolume = entries.reduce((sum, entry) => sum + entry.amountWagered, 0);
        const totalToWin = entries.reduce((sum, entry) => sum + entry.toWinAmount, 0);

        // Agent breakdown
        const agentBreakdown = new Map<string, number>();
        entries.forEach(entry => {
            const current = agentBreakdown.get(entry.agentID) || 0;
            agentBreakdown.set(entry.agentID, current + entry.amountWagered);
        });

        // Customer breakdown
        const customerBreakdown = new Map<string, number>();
        entries.forEach(entry => {
            const current = customerBreakdown.get(entry.customerID) || 0;
            customerBreakdown.set(entry.customerID, current + entry.amountWagered);
        });

        // Wager type breakdown
        const wagerTypeBreakdown = new Map<string, number>();
        entries.forEach(entry => {
            const current = wagerTypeBreakdown.get(entry.wagerType) || 0;
            wagerTypeBreakdown.set(entry.wagerType, current + entry.amountWagered);
        });

        // Time range
        const dates = entries.map(entry => new Date(entry.insertDateTime)).sort();
        const timeRange = {
            start: dates[0]?.toISOString() || '',
            end: dates[dates.length - 1]?.toISOString() || ''
        };

        return {
            totalWagers,
            totalVolume,
            totalToWin,
            agentBreakdown,
            customerBreakdown,
            wagerTypeBreakdown,
            timeRange
        };
    }

    // Analyze patterns in the data
    private analyzePatterns(entries: WebLogEntry[]): {
        highValueWagers: WebLogEntry[];
        frequentCustomers: Array<{ customer: string; count: number }>;
        agentActivity: Array<{ agent: string; volume: number; wagers: number }>;
        timePatterns: Array<{ hour: number; count: number; volume: number }>;
    } {
        // High value wagers (>$1000)
        const highValueWagers = entries.filter(entry => entry.amountWagered >= 1000);

        // Frequent customers (top 10 by wager count)
        const customerCounts = new Map<string, number>();
        entries.forEach(entry => {
            const current = customerCounts.get(entry.customerID) || 0;
            customerCounts.set(entry.customerID, current + 1);
        });
        const frequentCustomers = Array.from(customerCounts.entries())
            .map(([customer, count]) => ({ customer, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        // Agent activity
        const agentActivity = new Map<string, { volume: number; wagers: number }>();
        entries.forEach(entry => {
            const current = agentActivity.get(entry.agentID) || { volume: 0, wagers: 0 };
            agentActivity.set(entry.agentID, {
                volume: current.volume + entry.amountWagered,
                wagers: current.wagers + 1
            });
        });
        const agentActivityArray = Array.from(agentActivity.entries())
            .map(([agent, data]) => ({ agent, ...data }))
            .sort((a, b) => b.volume - a.volume);

        // Time patterns (hourly breakdown)
        const timePatterns = new Map<number, { count: number; volume: number }>();
        entries.forEach(entry => {
            const hour = new Date(entry.insertDateTime).getHours();
            const current = timePatterns.get(hour) || { count: 0, volume: 0 };
            timePatterns.set(hour, {
                count: current.count + 1,
                volume: current.volume + entry.amountWagered
            });
        });
        const timePatternsArray = Array.from(timePatterns.entries())
            .map(([hour, data]) => ({ hour, ...data }))
            .sort((a, b) => a.hour - b.hour);

        return {
            highValueWagers,
            frequentCustomers,
            agentActivity: agentActivityArray,
            timePatterns: timePatternsArray
        };
    }

    // Store processed web log data
    private async storeWebLogData(
        entries: WebLogEntry[],
        summary: any,
        patterns: any
    ): Promise<void> {
        try {
            const webLogData = {
                entries,
                summary: {
                    totalWagers: summary.totalWagers,
                    totalVolume: summary.totalVolume,
                    totalToWin: summary.totalToWin,
                    timeRange: summary.timeRange
                },
                patterns: {
                    highValueCount: patterns.highValueWagers.length,
                    frequentCustomersCount: patterns.frequentCustomers.length,
                    agentCount: patterns.agentActivity.length
                },
                timestamp: new Date().toISOString(),
                requestId: this.requestId
            };

            await this.env.FANTASY_CACHE.put(
                'weblog:processed',
                JSON.stringify(webLogData),
                { expirationTtl: 24 * 60 * 60 } // 24 hours
            );

            // Store in Analytics Engine
            await this.env.ANALYTICS_ENGINE.writeDataPoint({
                blobs: [
                    'weblog_processed',
                    this.requestId,
                    `entries_${entries.length}`
                ],
                doubles: [
                    summary.totalVolume,
                    summary.totalWagers,
                    patterns.highValueWagers.length
                ],
                indexes: [`weblog-${this.requestId}`]
            });

            console.log(`[${this.requestId}] ✅ Stored ${entries.length} web log entries`);
        } catch (error) {
            console.error(`[${this.requestId}] ❌ Error storing web log data:`, error);
        }
    }

    // Get processed web log data
    async getProcessedWebLog(): Promise<any> {
        try {
            const data = await this.env.FANTASY_CACHE.get('weblog:processed');
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error(`[${this.requestId}] ❌ Error getting web log data:`, error);
            return null;
        }
    }

    // Get high value wagers
    async getHighValueWagers(threshold: number = 1000): Promise<WebLogEntry[]> {
        const data = await this.getProcessedWebLog();
        if (!data) return [];

        return data.entries.filter((entry: WebLogEntry) => 
            entry.amountWagered >= threshold
        );
    }

    // Get agent performance
    async getAgentPerformance(agentID: string): Promise<any> {
        const data = await this.getProcessedWebLog();
        if (!data) return null;

        const agentEntries = data.entries.filter((entry: WebLogEntry) => 
            entry.agentID === agentID
        );

        if (agentEntries.length === 0) return null;

        const totalVolume = agentEntries.reduce((sum, entry) => sum + entry.amountWagered, 0);
        const totalWagers = agentEntries.length;
        const avgWager = totalVolume / totalWagers;

        return {
            agentID,
            totalVolume,
            totalWagers,
            avgWager,
            highValueWagers: agentEntries.filter(entry => entry.amountWagered >= 1000).length,
            customers: new Set(agentEntries.map(entry => entry.customerID)).size
        };
    }
}
