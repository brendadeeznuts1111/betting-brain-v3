#!/usr/bin/env bun
/**
 * Coverage Analysis Script for Bun Testing Suite
 * Generates detailed coverage reports and provides targeted recommendations
 * Usage: bun run scripts/analyze-coverage.ts
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { analyzeCoverageFromLCOV, printCoverageReport, CoverageAnalysis } from '../tests/utils/coverage-analysis';
import { $ } from 'bun';

async function main() {
    console.log('🔍 Analyzing Bun Testing Coverage...\n');

    // Generate coverage if needed
    const coverageDir = 'coverage-reports';
    const lcovFile = join(coverageDir, 'lcov.info');

    if (!existsSync(lcovFile)) {
        console.log('📊 Generating coverage reports...');
        await $`bun test --coverage --coverage-report=lcov --coverage-report=text --quiet`;
    }

    if (!existsSync(lcovFile)) {
        console.error('❌ Coverage report not found. Run "bun test --coverage --coverage-report=lcov" first.');
        process.exit(1);
    }

    try {
        // Load coverage data from LCOV
        const lcovContent = readFileSync(lcovFile, 'utf8');
        const analysis = analyzeCoverageFromLCOV(lcovContent);

        // Print detailed report
        printCoverageReport(analysis);

        // Save detailed analysis to file
        const analysisFile = join(coverageDir, 'coverage-analysis.json');
        const txtFile = join(coverageDir, 'coverage-analysis.txt');

        // Write JSON analysis
        await Bun.write(analysisFile, JSON.stringify(analysis, null, 2));

        // Generate text report
        let textReport = '📊 Bun Testing Coverage Analysis Report\n';
        textReport += '='.repeat(50) + '\n\n';
        textReport += `Generated: ${new Date().toISOString()}\n\n`;
        textReport += `OVERALL COVERAGE:\n`;
        textReport += `  Functions: ${analysis.overall.functions.toFixed(1)}%\n`;
        textReport += `  Lines: ${analysis.overall.lines.toFixed(1)}%\n`;
        textReport += `  Branches: ${analysis.overall.branches.toFixed(1)}%\n`;
        textReport += `  Statements: ${analysis.overall.statements.toFixed(1)}%\n\n`;

        textReport += `FILES ANALYZED: ${analysis.perFile.length}\n`;
        textReport += `UNCOVERED FUNCTIONS: ${analysis.uncoveredFunctions.length}\n\n`;

        if (analysis.uncoveredFunctions.length > 0) {
            textReport += 'HIGH-RISK UNTREATED FUNCTIONS:\n';
            const highRisk = analysis.uncoveredFunctions.filter(f => f.riskLevel === 'high');
            highRisk.forEach(func => {
                textReport += `  🔴 ${func.functionName} (${func.file}:${func.line})\n          ${func.reason}\n`;
            });
            textReport += '\n';
        }

        textReport += 'RECOMMENDATIONS:\n';
        analysis.recommendations.forEach(rec => {
            textReport += `  ${rec}\n`;
        });

        await Bun.write(txtFile, textReport);

        console.log('\n📄 Analysis saved to:');
        console.log(`   • JSON: ${analysisFile}`);
        console.log(`   • Text: ${txtFile}`);
        if (existsSync(join(coverageDir, 'index.html'))) {
            console.log(`   • HTML: ${join(coverageDir, 'index.html')}`);
        }

        // Check if we need to expand coverage
        const functionTarget = 80;
        const currentFunctions = analysis.overall.functions;

        if (currentFunctions < functionTarget) {
            const gap = functionTarget - currentFunctions;
            console.log(`\n🎯 Coverage Expansion Needed:`);
            console.log(`   Current: ${currentFunctions.toFixed(1)}% function coverage`);
            console.log(`   Target: ${functionTarget}% function coverage`);
            console.log(`   Gap: ${gap.toFixed(1)}% (${gap.toFixed(1)} percentage points)`);

            const highRiskCount = analysis.uncoveredFunctions.filter(f => f.riskLevel === 'high').length;
            console.log(`   📋 Next Steps:`);
            console.log(`      1. Test ${highRiskCount} high-risk uncovered functions`);
            console.log(`      2. Add tests for ${analysis.perFile.filter(f => f.functions.percentage < 70).length} low-coverage files`);
            console.log(`      3. Focus on API handlers, database operations, and error handlers`);
        } else {
            console.log(`\n✅ Coverage Target Achieved: ${currentFunctions.toFixed(1)}% functions`);
        }

        // Return success/failure based on threshold
        if (currentFunctions >= functionTarget) {
            process.exit(0);
        } else {
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ Error analyzing coverage:', error);
        process.exit(1);
    }
}

if (import.meta.main) {
    main();
}
