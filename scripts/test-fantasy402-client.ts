#!/usr/bin/env bun
/**
 * Test Fantasy402 API Client
 * 
 * Demonstrates server-side authenticated API calls to fantasy402.com
 * 
 * Usage:
 *   bun run scripts/test-fantasy402-client.ts
 */

import { Fantasy402Client, cacheBustURL } from '../src/utils/fantasy402-client';

// Color helpers for terminal output
const colors = {
    green: (str: string) => `\x1b[32m${str}\x1b[0m`,
    red: (str: string) => `\x1b[31m${str}\x1b[0m`,
    yellow: (str: string) => `\x1b[33m${str}\x1b[0m`,
    blue: (str: string) => `\x1b[34m${str}\x1b[0m`,
    cyan: (str: string) => `\x1b[36m${str}\x1b[0m`,
};

async function main() {
    console.log(colors.cyan('🧪 Testing Fantasy402 API Client\n'));

    // Check for JWT token in environment
    const jwtToken = process.env.FANTASY402_JWT_TOKEN || Bun.env.FANTASY402_JWT_TOKEN;

    if (!jwtToken) {
        console.log(colors.yellow('⚠️  No JWT token found in environment'));
        console.log(colors.yellow('   Set FANTASY402_JWT_TOKEN environment variable'));
        console.log(colors.yellow('   Or authenticate first:\n'));
        console.log(colors.cyan('   const token = await Fantasy402Client.authenticate({'));
        console.log(colors.cyan('     username: "BILLY666",'));
        console.log(colors.cyan('     password: "your-password"'));
        console.log(colors.cyan('   });\n'));

        // Test cache busting
        console.log(colors.blue('✅ Testing cache busting:'));
        const testURL = 'https://fantasy402.com/manager.html';
        const bustedURL = cacheBustURL(testURL);
        console.log(colors.green(`   ${testURL}`));
        console.log(colors.green(`   → ${bustedURL}\n`));

        return;
    }

    try {
        // Create client
        console.log(colors.blue('📡 Creating Fantasy402 client...'));
        const client = new Fantasy402Client({ jwtToken });
        console.log(colors.green('✅ Client created\n'));

        // Test 1: Get Bet Ticker
        console.log(colors.blue('📊 Test 1: Get Bet Ticker'));
        console.log(colors.yellow('   Fetching recent bets...'));

        const startTime1 = Date.now();
        const betTickerData = await client.getBetTicker({
            agent: '',
            daterange: '01/01/2025 - 12/31/2025',
            limit: '10'
        });
        const duration1 = Date.now() - startTime1;

        console.log(colors.green(`✅ Response received in ${duration1}ms`));
        console.log(colors.green(`   Found ${betTickerData.length || 0} bets\n`));

        // Test 2: Get Agent Performance
        console.log(colors.blue('📊 Test 2: Get Agent Performance'));
        console.log(colors.yellow('   Fetching performance data...'));

        const startTime2 = Date.now();
        const performanceData = await client.getAgentPerformance({
            agentID: 'BILLY666',
            start: '01/01/2025',
            end: '12/31/2025',
            type: 'CP'
        });
        const duration2 = Date.now() - startTime2;

        console.log(colors.green(`✅ Response received in ${duration2}ms`));
        if (performanceData) {
            console.log(colors.green(`   Agent: ${performanceData.AgentID || 'Unknown'}`));
            console.log(colors.green(`   Total Risk: $${(parseFloat(performanceData.TotalRisk || 0) / 100).toLocaleString()}`));
            console.log(colors.green(`   Total Win: $${(parseFloat(performanceData.TotalWin || 0) / 100).toLocaleString()}`));
            console.log(colors.green(`   Net Income: $${(parseFloat(performanceData.NetIncome || 0) / 100).toLocaleString()}\n`));
        }

        // Test 3: Get Account Info
        console.log(colors.blue('📊 Test 3: Get Account Info'));
        console.log(colors.yellow('   Fetching account details...'));

        const startTime3 = Date.now();
        const accountInfo = await client.getAccountInfoOwner('BILLY666');
        const duration3 = Date.now() - startTime3;

        console.log(colors.green(`✅ Response received in ${duration3}ms`));
        if (accountInfo) {
            console.log(colors.green(`   Account: ${accountInfo.AgentID || 'Unknown'}`));
            console.log(colors.green(`   Owner: ${accountInfo.AgentOwner || 'Unknown'}\n`));
        }

        // Test 4: Cache Busting
        console.log(colors.blue('📊 Test 4: Cache Busting'));
        const testURL = 'https://fantasy402.com/manager.html';
        const bustedURL = cacheBustURL(testURL);
        console.log(colors.green(`   Original: ${testURL}`));
        console.log(colors.green(`   Busted:   ${bustedURL}\n`));

        // Summary
        console.log(colors.cyan('✅ All tests completed successfully!\n'));
        console.log(colors.yellow('Performance Summary:'));
        console.log(colors.green(`   Bet Ticker:        ${duration1}ms`));
        console.log(colors.green(`   Agent Performance: ${duration2}ms`));
        console.log(colors.green(`   Account Info:      ${duration3}ms`));
        console.log(colors.green(`   Average:           ${Math.round((duration1 + duration2 + duration3) / 3)}ms\n`));

    } catch (error) {
        console.log(colors.red('❌ Error:'), error);
        if (error instanceof Error) {
            console.log(colors.red(`   ${error.message}\n`));
        }
        process.exit(1);
    }
}

main();

