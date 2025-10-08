/**
 * Coverage Analysis Utility for Bun Testing Suite
 * Analyzes test coverage gaps and provides targeted recommendations
 */

import { readdirSync, statSync, readFileSync } from 'fs';
import { join, extname, relative } from 'path';

export interface CoverageMetrics {
    file: string;
    lines: { total: number; covered: number; percentage: number };
    functions: { total: number; covered: number; percentage: number };
    branches: { total: number; covered: number; percentage: number };
    statements: { total: number; covered: number; percentage: number };
}

export interface UncoveredFunction {
    file: string;
    functionName: string;
    line: number;
    riskLevel: 'high' | 'medium' | 'low';
    reason: string;
}

export interface CoverageAnalysis {
    overall: {
        lines: number;
        functions: number;
        branches: number;
        statements: number;
    };
    perFile: CoverageMetrics[];
    uncoveredFunctions: UncoveredFunction[];
    recommendations: string[];
}

/**
 * Parse LCOV coverage format and analyze it
 */
export function parseLCOV(lcovContent: string): any {
    const result: any = {};
    const lines = lcovContent.split('\n');
    let currentFile: any = null;
    let currentFunction: any = null;

    for (const line of lines) {
        if (line.startsWith('SF:')) {
            // Start of file
            const filePath = line.substring(3);
            currentFile = {
                path: filePath,
                lines: { total: 0, covered: 0 },
                functions: { total: 0, covered: 0 },
                branches: { total: 0, covered: 0 },
                statements: { total: 0, covered: 0 },
                fnMap: {},
                f: {},
                b: {},
                bT: {}
            };
            result[filePath] = currentFile;
        } else if (line.startsWith('FN:')) {
            // Function definition
            const parts = line.substring(3).split(',');
            const lineNum = parseInt(parts[0]);
            const name = parts[1];
            if (currentFile && !currentFile.fnMap[lineNum.toString()]) {
                currentFile.fnMap[lineNum.toString()] = { name, line: lineNum };
                currentFile.functions.total++;
            }
        } else if (line.startsWith('FNDA:')) {
            // Function coverage
            const parts = line.substring(5).split(',');
            const coverage = parseInt(parts[0]);
            const lineNum = parts[1];
            if (currentFile) {
                currentFile.f[lineNum] = coverage;
                if (coverage > 0) {
                    currentFile.functions.covered++;
                }
            }
        } else if (line === 'end_of_record') {
            // End of file record
            currentFile = null;
        }
    }

    return result;
}

/**
 * Analyze test coverage from LCOV string
 */
export function analyzeCoverageFromLCOV(lcovContent: string): CoverageAnalysis {
    const coverageData = parseLCOV(lcovContent);
    return analyzeCoverage(coverageData);
}

/**
 * Analyze test coverage from LCOV or JSON format
 */
export function analyzeCoverage(coverageData: any): CoverageAnalysis {
    const perFile: CoverageMetrics[] = [];
    const uncoveredFunctions: UncoveredFunction[] = [];

    for (const [filePath, fileData] of Object.entries(coverageData) as [string, any][]) {
        // Calculate coverage metrics
        const lines = {
            total: fileData.lines?.total || 0,
            covered: fileData.lines?.covered || 0,
            percentage: fileData.lines?.total ?
                (fileData.lines.covered / fileData.lines.total) * 100 : 0
        };

        const functions = {
            total: fileData.functions?.total || 0,
            covered: fileData.functions?.covered || 0,
            percentage: fileData.functions?.total ?
                (fileData.functions.covered / fileData.functions.total) * 100 : 0
        };

        const branches = {
            total: fileData.branches?.total || 0,
            covered: fileData.branches?.covered || 0,
            percentage: fileData.branches?.total ?
                (fileData.branches.covered / fileData.branches.total) * 100 : 0
        };

        const statements = {
            total: fileData.statements?.total || 0,
            covered: fileData.statements?.covered || 0,
            percentage: fileData.statements?.total ?
                (fileData.statements.covered / fileData.statements.total) * 100 : 0
        };

        perFile.push({
            file: filePath,
            lines,
            functions,
            branches,
            statements
        });

        // Analyze uncovered functions
        if (fileData.fnMap) {
            for (const [key, fnData] of Object.entries(fileData.fnMap) as [string, any][]) {
                const coverage = fileData.f[key];
                if (coverage === 0) { // Not covered
                    const riskLevel = determineRiskLevel(filePath, fnData.name);
                    uncoveredFunctions.push({
                        file: relative(process.cwd(), filePath),
                        functionName: fnData.name,
                        line: fnData.line,
                        riskLevel,
                        reason: getRiskExplanation(riskLevel, filePath, fnData.name)
                    });
                }
            }
        }
    }

    // Calculate overall metrics
    const overall = {
        lines: perFile.reduce((sum, f) => sum + f.lines.percentage, 0) / perFile.length || 0,
        functions: perFile.reduce((sum, f) => sum + f.functions.percentage, 0) / perFile.length || 0,
        branches: perFile.reduce((sum, f) => sum + f.branches.percentage, 0) / perFile.length || 0,
        statements: perFile.reduce((sum, f) => sum + f.statements.percentage, 0) / perFile.length || 0
    };

    // Generate recommendations
    const recommendations = generateRecommendations(overall, uncoveredFunctions, perFile);

    return {
        overall,
        perFile,
        uncoveredFunctions,
        recommendations
    };
}

/**
 * Determine risk level for uncovered functions
 */
function determineRiskLevel(filePath: string, functionName: string): 'high' | 'medium' | 'low' {
    const relativePath = relative(process.cwd(), filePath);

    // High risk - database operations, API endpoints, error handlers
    if (
        functionName.includes('handler') ||
        functionName.includes('Handler') ||
        functionName.includes('execute') ||
        functionName.includes('query') ||
        functionName.includes('error') ||
        functionName.includes('Error') ||
        relativePath.includes('api/') ||
        relativePath.includes('database') ||
        relativePath.includes('db')
    ) {
        return 'high';
    }

    // Medium risk - utilities, validators, processors
    if (
        functionName.includes('validate') ||
        functionName.includes('process') ||
        functionName.includes('calculate') ||
        functionName.includes('compute') ||
        relativePath.includes('utils/') ||
        relativePath.includes('helpers/')
    ) {
        return 'medium';
    }

    // Low risk - getters, setters, formatting functions
    return 'low';
}

/**
 * Get explanation for risk level
 */
function getRiskExplanation(riskLevel: 'high' | 'medium' | 'low', filePath: string, functionName: string): string {
    const relativePath = relative(process.cwd(), filePath);

    switch (riskLevel) {
        case 'high':
            return `High-risk function in ${relativePath} - handles critical operations`;
        case 'medium':
            return `Medium-risk function in ${relativePath} - business logic processing`;
        case 'low':
            return `Low-risk function in ${relativePath} - utility/formatting function`;
    }
}

/**
 * Generate coverage improvement recommendations
 */
function generateRecommendations(
    overall: CoverageAnalysis['overall'],
    uncoveredFunctions: UncoveredFunction[],
    perFile: CoverageMetrics[]
): string[] {
    const recommendations: string[] = [];

    if (overall.functions < 80) {
        recommendations.push(`🔴 Critical: Function coverage at ${overall.functions.toFixed(1)}% - Add tests for uncovered functions`);
    } else {
        recommendations.push(`🟢 Good: Function coverage at ${overall.functions.toFixed(1)}% - maintaining target`);
    }

    // Priority-based recommendations
    const highRiskUncovered = uncoveredFunctions.filter(f => f.riskLevel === 'high');
    if (highRiskUncovered.length > 0) {
        recommendations.push(`⚠️  High-priority: Test ${highRiskUncovered.length} high-risk uncovered functions first`);
        recommendations.push(`   Examples: ${highRiskUncovered.slice(0, 3).map(f => f.functionName).join(', ')}`);
    }

    const lowCoverageFiles = perFile.filter(f => f.functions.percentage < 70);
    if (lowCoverageFiles.length > 0) {
        recommendations.push(`📊 Focus files: ${lowCoverageFiles.length} files below 70% function coverage`);
        recommendations.push(`   Low coverage: ${lowCoverageFiles.slice(0, 3).map(f => relative(process.cwd(), f.file)).join(', ')}`);
    }

    // Strategy recommendations
    if (uncoveredFunctions.length > 20) {
        recommendations.push(`🎯 Strategy: Focus on API handlers first, then utilities, then edge case functions`);
    }

    if (overall.branches < 60) {
        recommendations.push(`🌿 Branch coverage (${overall.branches.toFixed(1)}%) needs improvement - focus on conditional logic`);
    }

    recommendations.push(`📈 Target: Aim for 85% function, 75% branch, 80% line coverage`);

    return recommendations;
}

/**
 * Print coverage report to console
 */
export function printCoverageReport(analysis: CoverageAnalysis): void {
    console.log('\n📊 Bun Testing Coverage Analysis');
    console.log('='.repeat(50));
    console.log(`Overall Coverage:`);
    console.log(`   Functions: ${analysis.overall.functions.toFixed(1)}%`);
    console.log(`   Lines: ${analysis.overall.lines.toFixed(1)}%`);
    console.log(`   Branches: ${analysis.overall.branches.toFixed(1)}%`);
    console.log(`   Statements: ${analysis.overall.statements.toFixed(1)}%`);

    console.log(`\nFile Analysis (${analysis.perFile.length} files):`);
    analysis.perFile.slice(0, 10).forEach(file => {
        const relativeFile = relative(process.cwd(), file.file);
        const funcPerc = file.functions.percentage.toFixed(1);
        const color = file.functions.percentage < 70 ? '🔴' :
            file.functions.percentage < 80 ? '🟡' : '🟢';
        console.log(`   ${color} ${funcPerc}% ${relativeFile}`);
    });

    if (analysis.uncoveredFunctions.length > 0) {
        console.log(`\nUncovered Functions (${analysis.uncoveredFunctions.length}):`);
        const highRisk = analysis.uncoveredFunctions.filter(f => f.riskLevel === 'high').slice(0, 5);
        const medRisk = analysis.uncoveredFunctions.filter(f => f.riskLevel === 'medium').slice(0, 3);

        if (highRisk.length > 0) {
            console.log(`   🔴 High-risk:`);
            highRisk.forEach(func => {
                console.log(`      ${func.functionName} (${func.file}:${func.line})`);
            });
        }

        if (medRisk.length > 0) {
            console.log(`   🟡 Medium-risk:`);
            medRisk.forEach(func => {
                console.log(`      ${func.functionName} (${func.file}:${func.line})`);
            });
        }
    }

    console.log(`\n🎯 Recommendations:`);
    analysis.recommendations.forEach(rec => console.log(`   ${rec}`));

    console.log('\n💡 Next Steps:');
    console.log('   1. Add unit tests for high-risk uncovered functions');
    console.log('   2. Create integration tests for API endpoints');
    console.log('   3. Add edge case coverage for utilities');
    console.log('   4. Review low-coverage files');
}
