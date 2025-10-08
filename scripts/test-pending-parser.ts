#!/usr/bin/env bun
/**
 * Test the pending wagers parser with the provided fetch request data
 */

import { parsePendingWagers, extractOperationData } from '../src/utils/fantasy402-parser';

// Mock response data that would come from Fantasy402 getPending API
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

console.log('🧪 Testing Fantasy402 Pending Wagers Parser...\n');

// Test direct parser
console.log('📋 Testing parsePendingWagers directly:');
const parsedWagers = parsePendingWagers(mockResponseData);
if (parsedWagers && parsedWagers.length > 0) {
    console.log(`✅ Total Wagers: ${parsedWagers.length}`);

    parsedWagers.forEach((wager, index) => {
        console.log(`\n🎲 Wager ${index + 1}:`);
        console.log(`  ID: ${wager.wagerId}`);
        console.log(`  Sport: ${wager.sport}`);
        console.log(`  Bet Type: ${wager.betType}`);
        console.log(`  Stake: $${wager.stake.toFixed(2)}`);
        console.log(`  Odds: ${wager.odds}`);
        console.log(`  Risk: $${wager.risk.toFixed(2)}`);
        console.log(`  Potential Win: $${wager.potentialWin.toFixed(2)}`);
        console.log(`  Event: ${wager.eventName}`);
        console.log(`  Status: ${wager.status}`);
    });

    // Calculate summary
    const totalRisk = parsedWagers.reduce((sum, wager) => sum + wager.risk, 0);
    const totalPotentialWin = parsedWagers.reduce((sum, wager) => sum + wager.potentialWin, 0);
    const totalStake = parsedWagers.reduce((sum, wager) => sum + wager.stake, 0);
    const averageOdds = parsedWagers.reduce((sum, wager) => sum + wager.odds, 0) / parsedWagers.length;

    console.log(`\n📊 Summary:`);
    console.log(`  Total Risk: $${totalRisk.toFixed(2)}`);
    console.log(`  Total Potential Win: $${totalPotentialWin.toFixed(2)}`);
    console.log(`  Total Stake: $${totalStake.toFixed(2)}`);
    console.log(`  Average Odds: ${averageOdds.toFixed(2)}`);

    // Sport breakdown
    const sportBreakdown = parsedWagers.reduce((acc, wager) => {
        acc[wager.sport] = (acc[wager.sport] || 0) + wager.risk;
        return acc;
    }, {} as Record<string, number>);

    console.log(`\n🏈 Sport Breakdown:`);
    Object.entries(sportBreakdown).forEach(([sport, risk]) => {
        console.log(`  ${sport}: $${risk.toFixed(2)} risk`);
    });

} else {
    console.log('❌ Parser returned empty array');
}

console.log('\n📋 Testing extractOperationData:');
const extractedData = extractOperationData('getPending', mockResponseData);
if (extractedData && extractedData.pendingWagers) {
    console.log(`✅ Operation: getPending`);
    console.log(`✅ Pending wagers extracted: ${extractedData.pendingWagers.length} wagers`);
    console.log(`✅ Raw data preserved: ${!!extractedData.raw}`);
} else {
    console.log('❌ extractOperationData failed');
}

console.log('\n🎯 Test completed!');
