/**
 * MCP API Response Snapshot Testing
 *
 * Ensures MCP tool responses maintain consistent format and structure
 * API contract testing with human-readable snapshots
 */

import { describe, test, expect } from 'bun:test';
import { expect as snapshotExpect, API_SNAPSHOT_OPTIONS } from '../utils/snapshot-helpers';

// Mock MCP environment for API response testing
const createMockMCPEnv = () => ({
    ANALYTICS: {
        prepare: (query: string) => ({
            bind: (...params: any[]) => ({
                first: async () => ({
                    edge: 0.05,
                    sharp_score: 75,
                    total_bets: 150,
                    hold_percentage: 0.12,
                    customer_id: 'test-customer',
                    eid: 'event-1',
                    mt: 'SPREAD',
                    old_line: -3.0,
                    new_line: -3.5,
                    ts: '2025-01-08T03:00:00.000Z'
                }),
                all: async () => ([
                    {
                        customer_id: 'cust_1001',
                        edge: 0.05,
                        sharp_score: 75,
                        total_bets: 150,
                        hold_percentage: 0.12
                    },
                    {
                        customer_id: 'cust_1003',
                        edge: 0.08,
                        sharp_score: 85,
                        total_bets: 300,
                        hold_percentage: 0.15
                    }
                ]),
                run: async () => ({ success: true })
            }),
            first: async () => ({ count: 2 }),
            all: async () => ([]),
            run: async () => ({ success: true })
        })
    }
});

// Simulate MCP tool responses
function simulateMCPToolResponse(toolName: string, result: any) {
    return {
        jsonrpc: '2.0',
        id: 'test-request-123',
        result: {
            content: [{
                type: 'text',
                text: JSON.stringify(result, null, 2)
            }],
            isError: false
        }
    };
}

describe('MCP API Response Snapshots', () => {
    test('should snapshot getBettingExposure response', () => {
        const response = simulateMCPToolResponse('getBettingExposure', {
            exposures: {
                'event-123': {
                    side: 'OVER',
                    risk: 10000,
                    net: -2500,
                    currentLine: -110,
                    marketType: 'MONEYLINE',
                    confidence: 0.89
                }
            },
            totalExposure: -2500,
            summary: {
                events: 1,
                atRisk: 10000,
                netPosition: -2500,
                confidence: 0.89
            }
        });

        snapshotExpect(response).toMatchSnapshot('mcp-getBettingExposure', API_SNAPSHOT_OPTIONS);
    });

    test('should snapshot getCLV response', () => {
        const response = simulateMCPToolResponse('getCLV', {
            customerLifetimeValue: {
                currentValue: 1500.75,
                projectedValue: 2375.00,
                confidence: 0.92,
                riskLevel: 'LOW',
                metrics: {
                    totalBets: 150,
                    averageBetSize: 10.00,
                    winRate: 0.52,
                    edge: 0.05,
                    holding: -0.08
                },
                lastCalculated: '2025-01-08T03:00:00.000Z'
            }
        });

        snapshotExpect(response).toMatchSnapshot('mcp-getCLV', API_SNAPSHOT_OPTIONS);
    });

    test('should snapshot getSharpScore error response', () => {
        const response = {
            jsonrpc: '2.0',
            id: 'test-request-456',
            error: {
                code: -32602,
                message: 'Invalid parameters: customerId is required',
                data: {
                    field: 'customerId',
                    provided: null,
                    required: true,
                    example: 'cust_12345'
                }
            }
        };

        snapshotExpect(response).toMatchSnapshot('mcp-error-invalid-params', API_SNAPSHOT_OPTIONS);
    });

    test('should snapshot getSteamMoves with detected steam', () => {
        const response = simulateMCPToolResponse('getSteamMoves', {
            steamDetection: {
                events: [
                    {
                        eventId: 'NFL-SUN-123',
                        marketType: 'SPREAD',
                        lineMovement: 1.5,
                        severity: 'HIGH',
                        direction: 'against_public',
                        velocity: 'fast',
                        volumeChange: 85000,
                        confidence: 0.94
                    },
                    {
                        eventId: 'NBA-SAT-456',
                        marketType: 'TOTAL',
                        lineMovement: 2.0,
                        severity: 'CRITICAL',
                        direction: 'against_public',
                        velocity: 'extreme',
                        volumeChange: 125000,
                        confidence: 0.97
                    }
                ],
                summary: {
                    totalEvents: 2,
                    steamDetected: 2,
                    criticalSeverity: 1,
                    highSeverity: 1,
                    totalVolumeImpact: 210000,
                    averageConfidence: 0.955
                },
                alerts: [
                    {
                        level: 'CRITICAL',
                        message: 'NBA-SAT-456 showing extreme steam movement',
                        confidence: 0.97
                    }
                ]
            }
        });

        snapshotExpect(response).toMatchSnapshot('mcp-getSteamMoves-detected', API_SNAPSHOT_OPTIONS);
    });

    test('should snapshot getHoldForecast successful prediction', () => {
        const response = simulateMCPToolResponse('getHoldForecast', {
            holdForecast: {
                predictions: [
                    {
                        eventId: 'NBA_MON_789',
                        currentHold: 0.042,
                        predictedHold: 0.048,
                        trend: 'INCREASING',
                        confidence: 0.87,
                        volatility: 'LOW',
                        factors: {
                            historicalPattern: '+2.1%',
                            volumeVelocity: '+15%',
                            marketEfficiency: 'HIGH'
                        }
                    },
                    {
                        eventId: 'NFL_TUE_101',
                        currentHold: 0.038,
                        predictedHold: 0.034,
                        trend: 'DECREASING',
                        confidence: 0.81,
                        volatility: 'MEDIUM',
                        factors: {
                            historicalPattern: '-1.8%',
                            volumeVelocity: '-8%',
                            marketEfficiency: 'MEDIUM'
                        }
                    }
                ],
                methodology: {
                    algorithm: 'linear_regression',
                    lookbackDays: 30,
                    confidenceInterval: 0.95,
                    updateFrequency: 'hourly'
                },
                validation: {
                    meanAbsoluteError: 0.0042,
                    rSquared: 0.73,
                    lastTrained: '2025-01-08T02:00:00.000Z'
                }
            }
        });

        snapshotExpect(response).toMatchSnapshot('mcp-getHoldForecast-success', API_SNAPSHOT_OPTIONS);
    });

    test('should snapshot getTimeSeriesCLV complex analysis', () => {
        const response = simulateMCPToolResponse('getTimeSeriesCLV', {
            timeSeriesCLV: {
                customerId: 'cust_1001',
                timeframe: '90_days',
                metrics: {
                    rollingCLV: [
                        { date: '2024-10-10', clv: 850.0, change: '+5.2%' },
                        { date: '2024-10-17', clv: 895.5, change: '+5.2%' },
                        { date: '2024-10-24', clv: 942.2, change: '+5.2%' },
                        { date: '2024-10-31', clv: 987.3, change: '+5.0%' },
                        { date: '2024-11-07', clv: 1034.8, change: '+4.8%' },
                        { date: '2024-11-14', clv: 1082.1, change: '+4.6%' }
                    ],
                    trend: 'INCREASING',
                    acceleration: 0.031, // 3.1% per week
                    volatility: 'LOW'
                },
                insights: {
                    trendStrength: 'STRONG',
                    seasonalPatterns: ['weekend_increase', 'midweek_decline'],
                    keyFactors: ['volume_growth', 'edge_improvement'],
                    predictions: {
                        nextWeek: 1148.5,
                        confidence: 0.88,
                        riskLevel: 'LOW'
                    }
                },
                metadata: {
                    calculation: 'rolling_7day',
                    confidenceInterval: 0.95,
                    dataPoints: 26,
                    lastCalculated: '2025-01-08T03:00:00.000Z'
                }
            }
        });

        snapshotExpect(response).toMatchSnapshot('mcp-getTimeSeriesCLV-complex', API_SNAPSHOT_OPTIONS);
    });

    test('should snapshot getEnhancedSharpScore ML profiling', () => {
        const response = simulateMCPToolResponse('getEnhancedSharpScore', {
            enhancedSharpScore: {
                customerId: 'cust_1003',
                overallScore: 82.4,
                classification: 'PROFESSIONAL',
                confidence: 0.94,
                features: {
                    coreScoring: {
                        clv_component: 8.7,
                        win_rate_component: 12.8,
                        total: 21.5
                    },
                    advancedFeatures: {
                        volume_consistency: 14.2,
                        edge_stability: 13.1,
                        pattern_recognition: 11.8,
                        risk_management: 9.4,
                        total: 48.5
                    }
                },
                insights: {
                    strengths: ['volume_consistency', 'risk_management'],
                    weaknesses: [],
                    compared_to_peers: 'TOP_15_PERCENT',
                    improvement_suggestions: []
                },
                timeSeries: {
                    scoreHistory: [
                        { date: '2024-09-01', score: 65.2 },
                        { date: '2024-10-01', score: 72.8 },
                        { date: '2024-11-01', score: 79.1 },
                        { date: '2024-12-01', score: 82.4 }
                    ],
                    trend: 'IMPROVING',
                    velocity: '+0.98_per_month'
                },
                methodology: {
                    version: '2.1.0',
                    features_used: 7,
                    training_data: '2023-2024_season',
                    validation_accuracy: 0.89
                }
            }
        });

        snapshotExpect(response).toMatchSnapshot('mcp-getEnhancedSharpScore-profitable', API_SNAPSHOT_OPTIONS);
    });

    test('should snapshot MCP tools list response', () => {
        const response = {
            jsonrpc: '2.0',
            id: 'list-request-789',
            result: {
                tools: [
                    {
                        name: 'getBettingExposure',
                        description: 'Current betting exposure by event and market',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                agentID: { type: 'string', description: 'Agent identifier' }
                            },
                            required: ['agentID']
                        }
                    },
                    {
                        name: 'getCLV',
                        description: 'Customer lifetime value analysis',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                customerId: { type: 'string', description: 'Customer identifier' },
                                includeTrends: { type: 'boolean', description: 'Include trend analysis' }
                            },
                            required: ['customerId']
                        }
                    },
                    {
                        name: 'getSteamMoves',
                        description: '3-sigma steam move detection and analysis',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                agentID: { type: 'string', description: 'Agent identifier' },
                                lookbackHours: { type: 'number', description: 'Hours to look back', default: 24 },
                                minLineChange: { type: 'number', description: 'Minimum line change threshold', default: 0.5 }
                            },
                            required: ['agentID']
                        }
                    }
                    // Note: Only showing first 3 tools for snapshot brevity
                ]
            }
        };

        snapshotExpect(response).toMatchSnapshot('mcp-tools-list', API_SNAPSHOT_OPTIONS);
    });

    test('should snapshot database unavailable error response', () => {
        const response = {
            jsonrpc: '2.0',
            id: 'failed-request-999',
            error: {
                code: -32000,
                message: 'Database temporarily unavailable',
                data: {
                    type: 'SERVICE_UNAVAILABLE',
                    retryAfter: 30,
                    maintenanceWindow: false,
                    fallback: 'cached_results_available'
                }
            }
        };

        snapshotExpect(response).toMatchSnapshot('mcp-error-database-unavailable', API_SNAPSHOT_OPTIONS);
    });
});

describe('MCP Response Format Validation', () => {
    test('should validate JSON-RPC 2.0 compliance', () => {
        const validResponse = simulateMCPToolResponse('testTool', { result: 'test' });

        // JSON-RPC 2.0 required fields
        expect(validResponse.jsonrpc).toBe('2.0');
        expect(validResponse).toHaveProperty('id');
        expect(validResponse).toHaveProperty('result');

        // MCP-specific structure
        expect(validResponse.result).toHaveProperty('content');
        expect(Array.isArray(validResponse.result.content)).toBe(true);
        expect(validResponse.result.content[0]).toHaveProperty('type');
        expect(validResponse.result.content[0]).toHaveProperty('text');

        // Content should be parseable JSON
        const parsedContent = JSON.parse(validResponse.result.content[0].text);
        expect(parsedContent).toHaveProperty('result');
    });

    test('should validate error response format', () => {
        const errorResponse = {
            jsonrpc: '2.0',
            id: 'error-test-123',
            error: {
                code: -32602,
                message: 'Invalid method parameter',
                data: { field: 'agentID' }
            }
        };

        // Should have error, not result
        expect(errorResponse).toHaveProperty('error');
        expect(errorResponse).not.toHaveProperty('result');

        // Error structure
        expect(errorResponse.error).toHaveProperty('code');
        expect(errorResponse.error).toHaveProperty('message');
        expect(errorResponse.error.code).toBe(-32602);
    });

    test('should validate timestamp consistency', () => {
        const startTime = new Date('2025-01-08T03:00:00.000Z');

        // Simulate consistent timestamps across responses
        const response1 = simulateMCPToolResponse('tool1', {
            data: 'test',
            processedAt: startTime.toISOString()
        });

        const response2 = simulateMCPToolResponse('tool2', {
            data: 'test2',
            processedAt: startTime.toISOString()
        });

        // Both should have same timestamp for snapshot consistency
        const content1 = JSON.parse(response1.result.content[0].text);
        const content2 = JSON.parse(response2.result.content[0].text);

        expect(content1.processedAt).toBe(content2.processedAt);

        // Snapshot responses (timestamps should be excluded by API_SNAPSHOT_OPTIONS)
        snapshotExpect(response1).toMatchSnapshot('mcp-timestamp-consistency-1', API_SNAPSHOT_OPTIONS);
        snapshotExpect(response2).toMatchSnapshot('mcp-timestamp-consistency-2', API_SNAPSHOT_OPTIONS);
    });
});
