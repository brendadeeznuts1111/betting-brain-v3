#!/usr/bin/env bun
/**
 * Test script for getInfoPlayer Fantasy402 operation
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
                    return { success: true, meta: { last_row_id: 123 } };
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

// Simulate the provided fetch request
const mockRequest = {
    method: 'POST',
    url: 'https://fantasy402.com/cloud/api/Manager/getInfoPlayer',
    headers: {
        'authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJCSUxMWTY2NiIsInR5cGUiOjAsImFnIjoiIiwiaW1wIjoiIiwib2ZmIjoiTk9MQVJPU0UiLCJyYiI6bnVsbCwibmJmIjoxNzU5OTMyMDExLCJleHAiOjE3NTk5MzMyNzF9.1tO_M_0Oc05CiJIO593yt0MGDJWNcqkzSfNhw9kD7Zs',
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8'
    },
    body: 'customerID=14801_6&agentID=BILLY666&operation=getInfoPlayer&RRO=0&agentOwner=BILLY666&agentSite=1'
};

// Mock response data (typical Fantasy402 getInfoPlayer response)
const mockResponseData = {
    success: true,
    player: {
        customerID: '14801_6',
        agentID: 'BILLY666',
        playerName: 'John Doe',
        playerType: 'Customer',
        office: 'Main Office',
        status: 'Active',
        registrationDate: '2024-01-15',
        lastLogin: '2025-01-08T14:30:00Z',
        
        // Financial data (in cents)
        totalWagers: 1250,
        totalRisk: 50000, // $500.00
        totalWin: 45000,  // $450.00
        netIncome: -5000, // -$50.00
        commissionRate: 5.0,
        creditLimit: 100000, // $1000.00
        availableBalance: 25000, // $250.00
        pendingBalance: 5000, // $50.00
        freePlayBalance: 0,
        currencyCode: 'USD',
        
        // Status flags
        active: true,
        suspendSportsbook: false,
        readOnly: false,
        
        // Limits (in cents)
        wagerLimit: 10000, // $100.00
        minimumWager: 100,  // $1.00
        maxPropPayout: 50000, // $500.00
        
        // Additional data
        permissions: {
            canBet: true,
            canWithdraw: true,
            canDeposit: true
        },
        preferences: {
            timezone: 'EST',
            language: 'en',
            notifications: true
        },
        contactInfo: {
            email: 'john.doe@example.com',
            phone: '+1-555-0123'
        }
    }
};

// Create the packet that would be sent by the browser extension
const testPacket = {
    timestamp: new Date().toISOString(),
    endpoint: '/cloud/api/Manager/getInfoPlayer',
    operation: 'getInfoPlayer',
    method: 'POST',
    url: 'https://fantasy402.com/cloud/api/Manager/getInfoPlayer',
    request: {
        headers: mockRequest.headers,
        body: {
            customerID: '14801_6',
            agentID: 'BILLY666',
            operation: 'getInfoPlayer',
            RRO: '0',
            agentOwner: 'BILLY666',
            agentSite: '1'
        },
        rawBody: mockRequest.body
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
        duration: 150,
        agentID: 'BILLY666',
        agentOwner: 'BILLY666',
        customerID: '14801_6',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        pageUrl: 'https://fantasy402.com/manager.html'
    }
};

async function testGetInfoPlayer() {
    console.log('🧪 Testing getInfoPlayer Fantasy402 operation...\n');
    
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
    await testGetInfoPlayer();
}
