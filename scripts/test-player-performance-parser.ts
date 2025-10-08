#!/usr/bin/env bun
/**
 * Test the player performance parser with the provided fetch request data
 */

import { parsePlayerPerformance, extractOperationData } from '../src/utils/fantasy402-parser';

// Mock response data that would come from Fantasy402 getPerformancePlayer API
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

console.log('🧪 Testing Fantasy402 Player Performance Parser...\n');

// Test direct parser
console.log('📋 Testing parsePlayerPerformance directly:');
const parsedPerformance = parsePlayerPerformance(mockResponseData);
if (parsedPerformance) {
    console.log(`✅ Customer ID: ${parsedPerformance.customerID}`);
    console.log(`✅ Agent ID: ${parsedPerformance.agentID}`);
    console.log(`✅ Period: ${parsedPerformance.periodStart} → ${parsedPerformance.periodEnd}`);
    console.log(`✅ Type: ${parsedPerformance.type}, Period: ${parsedPerformance.period}`);
    console.log(`💰 Total Risk: $${parsedPerformance.totalRisk.toFixed(2)}`);
    console.log(`💰 Total Win: $${parsedPerformance.totalWin.toFixed(2)}`);
    console.log(`💰 Net Income: $${parsedPerformance.netIncome.toFixed(2)}`);
    console.log(`🎲 Total Wagers: ${parsedPerformance.totalWagers}`);
    console.log(`🎲 Pending: ${parsedPerformance.pendingWagers}, Settled: ${parsedPerformance.settledWagers}`);
    console.log(`🎁 Free Play Used: $${parsedPerformance.freePlayUsed.toFixed(2)}`);
    console.log(`🎁 Free Play Win: $${parsedPerformance.freePlayWin.toFixed(2)}`);
    console.log(`🏈 Sports: ${parsedPerformance.sportBreakdown.length} sports tracked`);

    if (parsedPerformance.sportBreakdown.length > 0) {
        console.log('📊 Sport Breakdown:');
        parsedPerformance.sportBreakdown.forEach((sport, index) => {
            console.log(`  ${index + 1}. ${sport.sport}: $${sport.risk.toFixed(2)} risk, $${sport.win.toFixed(2)} win, ${sport.count} wagers`);
        });
    }
} else {
    console.log('❌ Parser returned null');
}

console.log('\n📋 Testing extractOperationData:');
const extractedData = extractOperationData('getPerformancePlayer', mockResponseData);
if (extractedData && extractedData.performance) {
    console.log(`✅ Operation: getPerformancePlayer`);
    console.log(`✅ Performance data extracted: ${extractedData.performance.customerID}`);
    console.log(`✅ Raw data preserved: ${!!extractedData.raw}`);
} else {
    console.log('❌ extractOperationData failed');
}

console.log('\n🎯 Test completed!');
