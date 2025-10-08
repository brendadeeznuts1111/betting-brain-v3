#!/usr/bin/env bun
/**
 * Test the player info parser with the provided fetch request data
 */

import { parsePlayerInfo, extractOperationData } from '../src/utils/fantasy402-parser';

// Mock response data that would come from Fantasy402 getInfoPlayer API
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

console.log('🧪 Testing Fantasy402 Player Info Parser...\n');

// Test direct parser
console.log('📋 Testing parsePlayerInfo directly:');
const parsedPlayer = parsePlayerInfo(mockResponseData);
if (parsedPlayer) {
    console.log(`✅ Customer ID: ${parsedPlayer.customerID}`);
    console.log(`✅ Player Name: ${parsedPlayer.playerName}`);
    console.log(`✅ Office: ${parsedPlayer.office}`);
    console.log(`✅ Status: ${parsedPlayer.status}`);
    console.log(`💰 Available Balance: $${parsedPlayer.availableBalance.toFixed(2)}`);
    console.log(`💰 Total Risk: $${parsedPlayer.totalRisk.toFixed(2)}`);
    console.log(`💰 Net Income: $${parsedPlayer.netIncome.toFixed(2)}`);
    console.log(`🎲 Total Wagers: ${parsedPlayer.totalWagers}`);
    console.log(`🔒 Active: ${parsedPlayer.active}`);
    console.log(`📧 Contact: ${parsedPlayer.contactInfo.email || 'N/A'}`);
} else {
    console.log('❌ Parser returned null');
}

console.log('\n📋 Testing extractOperationData:');
const extractedData = extractOperationData('getInfoPlayer', mockResponseData);
if (extractedData && extractedData.player) {
    console.log(`✅ Operation: getInfoPlayer`);
    console.log(`✅ Player data extracted: ${extractedData.player.customerID}`);
    console.log(`✅ Raw data preserved: ${!!extractedData.raw}`);
} else {
    console.log('❌ extractOperationData failed');
}

console.log('\n🎯 Test completed!');
