#!/usr/bin/env bun
/**
 * Test the player analysis parser with the provided fetch request data
 */

import { parsePlayerAnalysis, extractOperationData } from '../src/utils/fantasy402-parser';

// Mock response data that would come from Fantasy402 getReportPlayerAnalysis API
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

console.log('🧪 Testing Fantasy402 Player Analysis Parser...\n');

// Test direct parser
console.log('📋 Testing parsePlayerAnalysis directly:');
const parsedAnalysis = parsePlayerAnalysis(mockResponseData);
if (parsedAnalysis) {
    console.log(`✅ Analysis parsed successfully`);
    console.log(`👤 Customer: ${parsedAnalysis.customerID}`);
    console.log(`🏷️ Agent: ${parsedAnalysis.agentID}`);
    console.log(`📅 Period: ${parsedAnalysis.startDate} → ${parsedAnalysis.endDate}`);
    console.log(`🎯 Line Type: ${parsedAnalysis.lineType}`);

    console.log(`\n📊 Overall Metrics:`);
    console.log(`  Total Wagers: ${parsedAnalysis.totalWagers}`);
    console.log(`  Total Risk: $${parsedAnalysis.totalRisk.toFixed(2)}`);
    console.log(`  Total Win: $${parsedAnalysis.totalWin.toFixed(2)}`);
    console.log(`  Net Income: $${parsedAnalysis.netIncome.toFixed(2)}`);
    console.log(`  Win Rate: ${(parsedAnalysis.winRate * 100).toFixed(1)}%`);
    console.log(`  Average Odds: ${parsedAnalysis.averageOdds.toFixed(2)}`);

    console.log(`\n🏈 Sports Breakdown:`);
    Object.entries(parsedAnalysis.sportsBreakdown).forEach(([sport, data]) => {
        console.log(`  ${sport}: ${data.wagerCount} wagers, $${data.totalRisk.toFixed(2)} risk, ${(data.winRate * 100).toFixed(1)}% win rate`);
    });

    console.log(`\n🎲 Bet Types Breakdown:`);
    Object.entries(parsedAnalysis.betTypesBreakdown).forEach(([betType, data]) => {
        console.log(`  ${betType}: ${data.wagerCount} wagers, $${data.totalRisk.toFixed(2)} risk, ${(data.winRate * 100).toFixed(1)}% win rate`);
    });

    console.log(`\n⏰ Time Breakdown:`);
    Object.entries(parsedAnalysis.timeBreakdown).forEach(([period, data]) => {
        console.log(`  ${period}: ${data.wagerCount} wagers, $${data.totalRisk.toFixed(2)} risk, ${(data.winRate * 100).toFixed(1)}% win rate`);
    });

} else {
    console.log('❌ Parser returned null');
}

console.log('\n📋 Testing extractOperationData:');
const extractedData = extractOperationData('getReportPlayerAnalysis', mockResponseData);
if (extractedData && extractedData.analysis) {
    console.log(`✅ Operation: getReportPlayerAnalysis`);
    console.log(`✅ Analysis extracted: ${extractedData.analysis.customerID}`);
    console.log(`✅ Raw data preserved: ${!!extractedData.raw}`);
} else {
    console.log('❌ extractOperationData failed');
}

console.log('\n🎯 Test completed!');
