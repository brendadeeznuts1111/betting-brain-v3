#!/usr/bin/env bun
/**
 * Test script for getPerformancePlayer Fantasy402 operation
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
                    return { success: true, meta: { last_row_id: 456 } };
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

// Mock response data (typical Fantasy402 getPerformancePlayer response)
const mockResponseData = {
    success: true,
    CustomerID: '14801_6',
    AgentID: 'BILLY666',
    StartDate: '2025-01-01',
    EndDate: '2025-01-07',
    Type: 'CP',
    Period: 1,
    PeriodName: 'Week 1',

    // Financial metrics (in cents)
    TotalRisk: 250000, // $2,500.00
    TotalWin: 180000,  // $1,800.00
    TotalCommission: 5000, // $50.00
    NetIncome: -65000, // -$650.00

    // Wager counts
    TotalWagers: 45,
    PendingWagers: 8,
    SettledWagers: 37,

    // Free play
    FreePlayUsed: 10000, // $100.00
    FreePlayWin: 5000,   // $50.00

    // Sport breakdown
    SPORTS: [
        {
            Sport: 'Basketball',
            Risk: 150000, // $1,500.00
            Win: 120000,  // $1,200.00
            Count: 25
        },
        {
            Sport: 'Football',
            Risk: 100000, // $1,000.00
            Win: 60000,   // $600.00
            Count: 20
        }
    ]
};

// Create the packet that would be sent by the browser extension
const testPacket = {
    timestamp: new Date().toISOString(),
    endpoint: '/cloud/api/Manager/getPerformancePlayer',
    operation: 'getPerformancePlayer',
    method: 'POST',
    url: 'https://fantasy402.com/cloud/api/Manager/getPerformancePlayer',
    request: {
        headers: {
            'authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJCSUxMWTY2NiIsInR5cGUiOjAsImFnIjoiIiwiaW1wIjoiIiwib2ZmIjoiTk9MQVJPU0UiLCJyYiI6bnVsbCwibmJmIjoxNzU5OTMyMDExLCJleHAiOjE3NTk5MzMyNzF9.1tO_M_0Oc05CiJIO593yt0MGDJWNcqkzSfNhw9kD7Zs',
            'content-type': 'application/x-www-form-urlencoded; charset=UTF-8'
        },
        body: {
            acc: '14801_6',
            period: '0',
            operation: 'getPerformancePlayer',
            RRO: '1',
            agentID: 'BILLY666',
            agentOwner: 'BILLY666',
            agentSite: '1'
        },
        rawBody: 'acc=14801_6&period=0&operation=getPerformancePlayer&RRO=1&agentID=BILLY666&agentOwner=BILLY666&agentSite=1'
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
        duration: 200,
        agentID: 'BILLY666',
        agentOwner: 'BILLY666',
        customerID: '14801_6',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        pageUrl: 'https://fantasy402.com/manager.html'
    }
};

async function testGetPerformancePlayer() {
    console.log('🧪 Testing getPerformancePlayer Fantasy402 operation...\n');

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
    await testGetPerformancePlayer();
}
