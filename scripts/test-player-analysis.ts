#!/usr/bin/env bun
/**
 * Test script for getReportPlayerAnalysis Fantasy402 operation
 * Simulates the provided fetch request to test the new handler
 */

import { handleFantasy402Ingest } from '../src/api/fantasy402-ingest';

// Mock environment
const mockEnv = {
    FANTASY_CACHE: {
        put: async (key: string, value: string, options?: any) => {
            console.log(`[KV] Stored: ${key} (TTL: ${options?.expirationTtl || 'none'})`);
            return Promise.resolve();
        }
    },
    RAW_FEED_DB: {
        prepare: (query: string) => ({
            bind: (...params: any[]) => ({
                run: async () => {
                    console.log(`[D1] Query: ${query.substring(0, 100)}...`);
                    console.log(`[D1] Params: ${JSON.stringify(params.slice(0, 5))}...`);
                    return { success: true, meta: { last_row_id: 999 } };
                }
            })
        })
    },
    ANALYTICS_ENGINE: {
        writeDataPoint: async (data: any) => {
            console.log(`[Analytics] Data point: ${JSON.stringify(data)}`);
            return Promise.resolve();
        }
    }
} as any;

// Mock response data (typical Fantasy402 getReportPlayerAnalysis response)
const mockResponseData = {
    success: true,
    analysis: {
        customerID: '14801_6',
        agentID: 'BILLY666',
        reportType: 'PlayerAnalysis',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        lineType: 'All',

        // Overall metrics
        totalWagers: 150,
        totalRisk: 150000, // $1,500.00
        totalWin: 120000,  // $1,200.00
        netIncome: -30000,  // -$300.00
        winRate: 0.45,      // 45%
        averageOdds: 1.85,

        // Sports breakdown
        sportsBreakdown: {
            'Basketball': {
                wagerCount: 60,
                totalRisk: 60000, // $600.00
                totalWin: 48000,  // $480.00
                netIncome: -12000, // -$120.00
                winRate: 0.40
            },
            'Football': {
                wagerCount: 45,
                totalRisk: 45000, // $450.00
                totalWin: 36000,  // $360.00
                netIncome: -9000, // -$90.00
                winRate: 0.50
            },
            'Baseball': {
                wagerCount: 45,
                totalRisk: 45000, // $450.00
                totalWin: 36000,  // $360.00
                netIncome: -9000, // -$90.00
                winRate: 0.45
            }
        },

        // Bet types breakdown
        betTypesBreakdown: {
            'Moneyline': {
                wagerCount: 75,
                totalRisk: 75000, // $750.00
                totalWin: 60000,  // $600.00
                netIncome: -15000, // -$150.00
                winRate: 0.45
            },
            'Spread': {
                wagerCount: 45,
                totalRisk: 45000, // $450.00
                totalWin: 36000,  // $360.00
                netIncome: -9000, // -$90.00
                winRate: 0.50
            },
            'Total': {
                wagerCount: 30,
                totalRisk: 30000, // $300.00
                totalWin: 24000,  // $240.00
                netIncome: -6000, // -$60.00
                winRate: 0.40
            }
        },

        // Time breakdown
        timeBreakdown: {
            'Morning': {
                wagerCount: 30,
                totalRisk: 30000, // $300.00
                totalWin: 24000,  // $240.00
                netIncome: -6000, // -$60.00
                winRate: 0.40
            },
            'Afternoon': {
                wagerCount: 60,
                totalRisk: 60000, // $600.00
                totalWin: 48000,  // $480.00
                netIncome: -12000, // -$120.00
                winRate: 0.45
            },
            'Evening': {
                wagerCount: 60,
                totalRisk: 60000, // $600.00
                totalWin: 48000,  // $480.00
                netIncome: -12000, // -$120.00
                winRate: 0.50
            }
        }
    }
};

// Create the packet that would be sent by the browser extension
const testPacket = {
    timestamp: new Date().toISOString(),
    endpoint: '/cloud/api/Manager/getReportPlayerAnalysis',
    operation: 'getReportPlayerAnalysis',
    method: 'POST',
    url: 'https://fantasy402.com/cloud/api/Manager/getReportPlayerAnalysis',
    request: {
        headers: {
            'authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJCSUxMWTY2NiIsInR5cGUiOjAsImFnIjoiIiwiaW1wIjoiIiwib2ZmIjoiTk9MQVJPU0UiLCJyYiI6bnVsbCwibmJmIjoxNzU5OTMyMzExLCJleHAiOjE3NTk5MzM1NzF9.I9X95-r1lrwOj23QKpFPJS3wu9iHbQJfUgi8F4Zxrt8',
            'content-type': 'application/x-www-form-urlencoded; charset=UTF-8'
        },
        body: {
            reportType: 'PlayerAnalysis',
            startDate: '2025-01-01',
            endDate: '2025-01-31',
            lineType: 'All',
            agentID: 'BILLY666',
            customerID: '14801_6'
        },
        rawBody: 'reportType=PlayerAnalysis&startDate=2025-01-01&endDate=2025-01-31&lineType=All&agentID=BILLY666&customerID=14801_6'
    },
    response: {
        status: 200,
        statusText: 'OK',
        headers: {
            'content-type': 'application/json'
        },
        body: mockResponseData,
        size: JSON.stringify(mockResponseData).length
    },
    metadata: {
        duration: 250,
        agentID: 'BILLY666',
        agentOwner: 'DANIEL2025',
        customerID: '14801_6',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        pageUrl: 'https://fantasy402.com/manager.html'
    }
};

async function testGetReportPlayerAnalysis() {
    console.log('🧪 Testing getReportPlayerAnalysis Fantasy402 operation...\n');

    try {
        // Create a mock request object
        const request = new Request('http://localhost:8787/api/fantasy402/ingest', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testPacket)
        });

        const requestId = Date.now().toString(36);

        console.log(`📥 Processing packet for customer: ${testPacket.metadata.customerID}`);
        console.log(`🏷️ Agent: ${testPacket.metadata.agentID}`);
        console.log(`🔗 Endpoint: ${testPacket.endpoint}`);
        console.log(`⏱️ Duration: ${testPacket.metadata.duration}ms\n`);

        // Call the handler
        const response = await handleFantasy402Ingest(request, mockEnv, requestId);

        console.log(`\n📤 Response Status: ${response.status}`);

        if (response.ok) {
            const result = await response.json();
            console.log(`✅ Success: ${result.message}`);
            console.log(`🆔 Packet ID: ${result.packetId}`);
        } else {
            const error = await response.text();
            console.log(`❌ Error: ${error}`);
        }

    } catch (error) {
        console.error('💥 Test failed:', error);
    }
}

// Run the test
if (import.meta.main) {
    await testGetReportPlayerAnalysis();
}
