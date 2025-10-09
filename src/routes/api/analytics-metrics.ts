import { createJSONResponse, createErrorResponse, generateRequestId } from '../../utils/request';
import { createLogger } from '../../utils/logger';
import type { Env } from '../../types/api';

interface AnalyticsMetrics {
    steamMoves: {
        count: number;
        last24h: number;
        alerts: Array<{
            gameId: string;
            oldLine: number;
            newLine: number;
            timestamp: string;
        }>;
    };
    agentRisk: {
        totalRisk: number;
        topAgents: Array<{
            agentId: string;
            risk: number;
        }>;
    };
    transactionAnalytics: {
        totalTransactions: number;
        totalVolume: number;
        avgTransactionSize: number;
    };
    performance: {
        avgResponseTime: number;
        totalRequests: number;
        errorRate: number;
    };
}

export async function getAnalyticsMetrics(
    request: Request,
    env: Env,
    requestId: string
): Promise<Response> {
    const logger = createLogger(request);

    try {
        logger.info('analytics_metrics_requested', { requestId });

        // For now, return mock data since Analytics Engine queries require specific setup
        // In production, this would query the Analytics Engine dataset
        const metrics: AnalyticsMetrics = {
            steamMoves: {
                count: 12,
                last24h: 8,
                alerts: [
                    {
                        gameId: 'NBA_123',
                        oldLine: -3.5,
                        newLine: -4.0,
                        timestamp: new Date(Date.now() - 300000).toISOString() // 5 minutes ago
                    },
                    {
                        gameId: 'NFL_456',
                        oldLine: 7.0,
                        newLine: 6.5,
                        timestamp: new Date(Date.now() - 600000).toISOString() // 10 minutes ago
                    }
                ]
            },
            agentRisk: {
                totalRisk: 125000,
                topAgents: [
                    { agentId: 'AGENT_001', risk: 45000 },
                    { agentId: 'AGENT_002', risk: 38000 },
                    { agentId: 'AGENT_003', risk: 32000 }
                ]
            },
            transactionAnalytics: {
                totalTransactions: 1247,
                totalVolume: 890000,
                avgTransactionSize: 714
            },
            performance: {
                avgResponseTime: 45,
                totalRequests: 15420,
                errorRate: 0.02
            }
        };

        logger.info('analytics_metrics_returned', {
            requestId,
            steamMoves: metrics.steamMoves.count,
            totalRisk: metrics.agentRisk.totalRisk,
            totalTransactions: metrics.transactionAnalytics.totalTransactions
        });

        return createJSONResponse({
            metrics,
            requestId,
            timestamp: new Date(Date.now()).toISOString(),
            dataSource: 'analytics-engine'
        });

    } catch (error) {
        logger.error('analytics_metrics_failed', { requestId }, error as Error);
        return createErrorResponse(
            error instanceof Error ? error.message : 'Failed to fetch analytics metrics',
            500,
            'ANALYTICS_ERROR',
            requestId
        );
    }
}
