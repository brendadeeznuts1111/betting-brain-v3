#!/usr/bin/env bun
/**
 * Test script for getPending Fantasy402 operation
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
                    return { success: true, meta: { last_row_id: 789 } };
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

// Mock response data (typical Fantasy402 getPending response)
const mockResponseData = {
    success: true,
    LIST: [
        {
            WagerID: 'WAGER001',
            CustomerID: '14801_6',
            AgentID: 'BILLY666',
            Sport: 'Basketball',
            BetType: 'Moneyline',
            Stake: 10000, // $100.00
            Odds: 150, // 1.50
            Risk: 10000, // $100.00
            PotentialWin: 15000, // $150.00
            EventID: 'EVT001',
            EventName: 'Lakers vs Warriors',
            WagerDate: '2025-01-08 15:30:00',
            Status: 'Pending',
            Description: 'Lakers Moneyline'
        },
        {
            WagerID: 'WAGER002',
            CustomerID: '14801_6',
            AgentID: 'BILLY666',
            Sport: 'Football',
            BetType: 'Spread',
            Stake: 5000, // $50.00
            Odds: 110, // 1.10
            Risk: 5000, // $50.00
            PotentialWin: 5500, // $55.00
            EventID: 'EVT002',
            EventName: 'Chiefs vs Bills',
            WagerDate: '2025-01-08 16:00:00',
            Status: 'Pending',
            Description: 'Chiefs -3.5'
        },
        {
            WagerID: 'WAGER003',
            CustomerID: '14801_6',
            AgentID: 'BILLY666',
            Sport: 'Baseball',
            BetType: 'Total',
            Stake: 7500, // $75.00
            Odds: 105, // 1.05
            Risk: 7500, // $75.00
            PotentialWin: 7875, // $78.75
            EventID: 'EVT003',
            EventName: 'Yankees vs Red Sox',
            WagerDate: '2025-01-08 17:00:00',
            Status: 'Pending',
            Description: 'Over 8.5 Runs'
        }
    ]
};

// Create the packet that would be sent by the browser extension
const testPacket = {
    timestamp: new Date().toISOString(),
    endpoint: '/cloud/api/Manager/getPending',
    operation: 'getPending',
    method: 'POST',
    url: 'https://fantasy402.com/cloud/api/Manager/getPending',
    request: {
        headers: {
            'authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJCSUxMWTY2NiIsInR5cGUiOjAsImFnIjoiIiwiaW1wIjoiIiwib2ZmIjoiTk9MQVJPU0UiLCJyYiI6bnVsbCwibmJmIjoxNzU5OTMyMzExLCJleHAiOjE3NTk5MzM1NzF9.I9X95-r1lrwOj23QKpFPJS3wu9iHbQJfUgi8F4Zxrt8',
            'content-type': 'application/x-www-form-urlencoded; charset=UTF-8'
        },
        body: {
            agentID: 'BILLY666',
            path: '/qubic/api/Manager/getPending',
            RRO: '1',
            date: '2023-10-09',
            sort: '5',
            typeSort: '2',
            week: '0',
            customerID: '14801_6',
            agentOwner: 'DANIEL2025',
            agentSite: '1'
        },
        rawBody: 'agentID=BILLY666&path=%2Fqubic%2Fapi%2FManager%2FgetPending&RRO=1&date=2023-10-09&sort=5&typeSort=2&week=0&customerID=14801_6&agentOwner=DANIEL2025&agentSite=1'
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
        duration: 180,
        agentID: 'BILLY666',
        agentOwner: 'DANIEL2025',
        customerID: '14801_6',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        pageUrl: 'https://fantasy402.com/manager.html'
    }
};

async function testGetPending() {
    console.log('🧪 Testing getPending Fantasy402 operation...\n');

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
    await testGetPending();
}
