// Live Analytics API Endpoint
// Provides real-time betting analytics for the dashboard

import { Errors, createErrorResponse } from '../utils/error-handler';
import type { Env } from '../types/cloudflare';
import { PatternDetector } from '../alerts/pattern-detector';
import { AgentTracker } from '../analytics/agent-tracker';
import { SportsIntelligenceEngine } from '../analytics/sports-intelligence';

interface LiveAnalyticsData {
    metrics: {
        liveVolume: number;
        activeAgents: number;
        betsPerMinute: number;
        avgBetSize: number;
        volumeChange: string;
        agentsChange: string;
        peakBetsPerMinute: number;
        sizeChange: string;
    };
    volumeHistory: Array<{
        time: string;
        volume: number;
    }>;
    sportsBreakdown: {
        football: number;
        baseball: number;
        basketball: number;
        tennis: number;
        hockey: number;
        soccer: number;
    };
    alerts: Array<{
        id: string;
        type: 'high-value' | 'steam' | 'unusual';
        title: string;
        message: string;
        timestamp: number;
    }>;
    topAgents: Array<{
        name: string;
        volume: number;
    }>;
}

export async function handleLiveAnalytics(
    request: Request,
    env: Env,
    requestId: string
): Promise<Response> {
    try {
        console.log(`[${requestId}] 📊 Generating live analytics`);

        // Get time range (last hour by default)
        const url = new URL(request.url);
        const hours = parseInt(url.searchParams.get('hours') || '1');
        const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

        // Fetch recent betting data from KV
        const recentBets = await getRecentBets(env, since, requestId);

        // Initialize analytics components
        const patternDetector = new PatternDetector(env, requestId);
        const agentTracker = new AgentTracker(env, requestId);
        const sportsEngine = new SportsIntelligenceEngine(env, requestId);

        // Calculate metrics
        const metrics = calculateMetrics(recentBets, hours);

        // Generate volume history (last 12 data points)
        const volumeHistory = generateVolumeHistory(recentBets, 12);

        // Calculate sports breakdown
        const sportsBreakdown = calculateSportsBreakdown(recentBets);

        // Generate advanced alerts using pattern detection
        const alerts = await patternDetector.detectPatterns(recentBets);

        // Analyze agent performance
        const agentPerformances = await agentTracker.analyzeAgentPerformance(recentBets);
        const topAgents = agentPerformances.slice(0, 10).map(agent => ({
            name: agent.agentID,
            volume: agent.totalVolume
        }));

        // Process sports intelligence (mock data for now)
        const mockSportsData = [
            {
                GameNum: 618853869,
                Team1ID: "Seattle Mariners",
                Team2ID: "Detroit Tigers",
                SportType: "Baseball",
                GameDateTime: "2025-10-08 15:08:00.000",
                STATUS: "O",
                Spread: -1.5,
                MoneyLine1: -103,
                MoneyLine2: -107,
                Total: 8.5
            }
        ];

        const sportsIntelligence = await sportsEngine.processSportsData(mockSportsData);

        const analyticsData: LiveAnalyticsData = {
            metrics,
            volumeHistory,
            sportsBreakdown,
            alerts,
            topAgents,
            sportsIntelligence: {
                activeGames: sportsIntelligence.activeGames.length,
                upcomingGames: sportsIntelligence.upcomingGames.length,
                sharpGames: sportsIntelligence.sharpGames.length,
                steamGames: sportsIntelligence.steamGames.length,
                oddsMovements: sportsIntelligence.oddsMovements.length,
                volumeLeaders: sportsIntelligence.volumeLeaders,
                marketAnalysis: sportsIntelligence.marketAnalysis
            },
            requestId,
            timestamp: new Date().toISOString()
        };

        console.log(`[${requestId}] ✅ Analytics generated: ${recentBets.length} bets analyzed`);

        return new Response(JSON.stringify({
            success: true,
            data: analyticsData,
            requestId,
            timestamp: new Date().toISOString()
        }), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-cache'
            }
        });

    } catch (error) {
        console.error(`[${requestId}] ❌ Analytics error:`, error);
        return createErrorResponse(error, requestId, '/api/analytics/live');
    }
}

// Get recent bets from KV storage
async function getRecentBets(env: Env, since: string, requestId: string): Promise<any[]> {
    try {
        // Query KV for recent bet ticker data
        const keys = await env.BET_TICKER_RAW.list({ prefix: 'raw:getBetTicker:' });

        const recentBets = [];
        const cutoffTime = new Date(since).getTime();

        for (const key of keys.keys.slice(0, 50)) { // Limit to 50 most recent
            try {
                const data = await env.BET_TICKER_RAW.get(key.name);
                if (data) {
                    const betData = JSON.parse(data);

                    // Check if this is recent enough
                    const betTime = new Date(betData.timestamp || betData.InsertDateTime).getTime();
                    if (betTime >= cutoffTime) {
                        recentBets.push(betData);
                    }
                }
            } catch (error) {
                console.warn(`[${requestId}] ⚠️ Error parsing bet data for key ${key.name}:`, error);
            }
        }

        // Sort by timestamp (newest first)
        return recentBets.sort((a, b) => {
            const timeA = new Date(a.timestamp || a.InsertDateTime).getTime();
            const timeB = new Date(b.timestamp || b.InsertDateTime).getTime();
            return timeB - timeA;
        });

    } catch (error) {
        console.error(`[${requestId}] ❌ Error fetching recent bets:`, error);
        return [];
    }
}

// Calculate key metrics
function calculateMetrics(bets: any[], hours: number) {
    if (bets.length === 0) {
        return {
            liveVolume: 0,
            activeAgents: 0,
            betsPerMinute: 0,
            avgBetSize: 0,
            volumeChange: '+0%',
            agentsChange: '+0 new',
            peakBetsPerMinute: 0,
            sizeChange: '+0%'
        };
    }

    // Calculate total volume
    const totalVolume = bets.reduce((sum, bet) => {
        return sum + (parseFloat(bet.AmountWagered) || 0);
    }, 0);

    // Count unique agents
    const uniqueAgents = new Set(bets.map(bet => bet.AgentID)).size;

    // Calculate bets per minute
    const timeSpan = hours * 60; // minutes
    const betsPerMinute = Math.round((bets.length / timeSpan) * 10) / 10;

    // Calculate average bet size
    const avgBetSize = Math.round(totalVolume / bets.length);

    // Calculate volume change (mock for now)
    const volumeChange = '+12.5%';

    // Calculate agents change
    const agentsChange = `+${Math.floor(uniqueAgents * 0.1)} new`;

    // Calculate peak bets per minute (mock)
    const peakBetsPerMinute = Math.round(betsPerMinute * 1.5);

    // Calculate size change (mock)
    const sizeChange = '+8.3%';

    return {
        liveVolume: Math.round(totalVolume),
        activeAgents: uniqueAgents,
        betsPerMinute,
        avgBetSize,
        volumeChange,
        agentsChange,
        peakBetsPerMinute,
        sizeChange
    };
}

// Generate volume history for chart
function generateVolumeHistory(bets: any[], dataPoints: number) {
    const now = Date.now();
    const intervalMs = (60 * 60 * 1000) / dataPoints; // 1 hour / dataPoints

    const history = [];

    for (let i = dataPoints - 1; i >= 0; i--) {
        const timeStart = now - (i + 1) * intervalMs;
        const timeEnd = now - i * intervalMs;

        // Count bets in this time window
        const betsInWindow = bets.filter(bet => {
            const betTime = new Date(bet.timestamp || bet.InsertDateTime).getTime();
            return betTime >= timeStart && betTime < timeEnd;
        });

        // Calculate volume for this window
        const volume = betsInWindow.reduce((sum, bet) => {
            return sum + (parseFloat(bet.AmountWagered) || 0);
        }, 0);

        history.push({
            time: new Date(timeEnd).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            }),
            volume: Math.round(volume)
        });
    }

    return history;
}

// Calculate sports breakdown
function calculateSportsBreakdown(bets: any[]) {
    const sports = {
        football: 0,
        baseball: 0,
        basketball: 0,
        tennis: 0,
        hockey: 0,
        soccer: 0
    };

    bets.forEach(bet => {
        const description = (bet.ShortDesc || '').toLowerCase();

        if (description.includes('football')) {
            sports.football++;
        } else if (description.includes('baseball')) {
            sports.baseball++;
        } else if (description.includes('basketball')) {
            sports.basketball++;
        } else if (description.includes('tennis')) {
            sports.tennis++;
        } else if (description.includes('hockey')) {
            sports.hockey++;
        } else if (description.includes('soccer')) {
            sports.soccer++;
        }
    });

    return sports;
}

// Generate alerts based on betting patterns
function generateAlerts(bets: any[], requestId: string) {
    const alerts = [];
    const now = Date.now();

    // High value bet alerts
    const highValueBets = bets.filter(bet => {
        const amount = parseFloat(bet.AmountWagered) || 0;
        return amount > 10000; // $100+ bets
    });

    highValueBets.slice(0, 3).forEach(bet => {
        alerts.push({
            id: `high-${bet.WagerNumber}`,
            type: 'high-value' as const,
            title: 'High Value Alert',
            message: `Agent ${bet.AgentID} placed ${formatCurrency(parseFloat(bet.AmountWagered))} bet on ${bet.ShortDesc?.substring(0, 50)}...`,
            timestamp: new Date(bet.timestamp || bet.InsertDateTime).getTime()
        });
    });

    // Steam move alerts (mock for now)
    if (Math.random() > 0.7) {
        alerts.push({
            id: `steam-${now}`,
            type: 'steam' as const,
            title: 'Steam Move',
            message: 'Football #161 Alabama line moved from -3 to -3.5',
            timestamp: now - Math.random() * 300000 // Random time in last 5 minutes
        });
    }

    // Unusual pattern alerts
    if (Math.random() > 0.8) {
        alerts.push({
            id: `unusual-${now}`,
            type: 'unusual' as const,
            title: 'Unusual Pattern',
            message: 'Multiple agents betting same side on Football #105 Eagles',
            timestamp: now - Math.random() * 600000 // Random time in last 10 minutes
        });
    }

    // Sort by timestamp (newest first)
    return alerts.sort((a, b) => b.timestamp - a.timestamp);
}

// Get top agents by volume
function getTopAgents(bets: any[], limit: number) {
    const agentVolumes: { [key: string]: number } = {};

    bets.forEach(bet => {
        const agent = bet.AgentID;
        const amount = parseFloat(bet.AmountWagered) || 0;

        if (!agentVolumes[agent]) {
            agentVolumes[agent] = 0;
        }
        agentVolumes[agent] += amount;
    });

    return Object.entries(agentVolumes)
        .map(([name, volume]) => ({ name, volume }))
        .sort((a, b) => b.volume - a.volume)
        .slice(0, limit);
}

// Utility function to format currency
function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}
