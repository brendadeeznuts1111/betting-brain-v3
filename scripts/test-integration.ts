#!/usr/bin/env bun
/**
 * Test Integration Script
 * 
 * Comprehensive test integration for all environments and scopes
 * Integrates quiet testing, scopes, CI/CD, and pre-commit hooks
 */

import { TestScopeManager } from './test-scope-manager';
import { existsSync } from 'fs';
import { join } from 'path';

interface TestIntegrationConfig {
    environment: 'development' | 'ci' | 'ai' | 'preCommit';
    scopes: string[];
    quiet: boolean;
    coverage: boolean;
    parallel: boolean;
    skipPassing: boolean;
    timeout: number;
}

class TestIntegration {
    private scopeManager: TestScopeManager;
    private config: TestIntegrationConfig;

    constructor(environment: string = 'development') {
        this.scopeManager = new TestScopeManager();
        this.config = this.buildConfig(environment);
    }

    private buildConfig(environment: string): TestIntegrationConfig {
        const envConfig = this.scopeManager.getEnvironment(environment);
        const scopes = this.scopeManager.getScopesForEnvironment(environment);

        return {
            environment: environment as any,
            scopes,
            quiet: envConfig?.quiet || false,
            coverage: envConfig?.coverage || false,
            parallel: envConfig?.parallel !== false,
            skipPassing: envConfig?.skipPassing !== false,
            timeout: 300000 // 5 minutes default
        };
    }

    async runTests(): Promise<boolean> {
        console.log('🧪 Test Integration Starting...');
        console.log(`🌍 Environment: ${this.config.environment}`);
        console.log(`📋 Scopes: ${this.config.scopes.join(', ')}`);
        console.log('');

        let allPassed = true;

        for (const scope of this.config.scopes) {
            console.log(`🏃 Running ${scope} tests...`);

            try {
                const command = this.scopeManager.getTestCommand(scope, this.config.environment);
                const result = await this.executeCommand(command);

                if (result.success) {
                    console.log(`✅ ${scope} tests passed`);
                } else {
                    console.log(`❌ ${scope} tests failed`);
                    allPassed = false;
                }
            } catch (error) {
                console.log(`❌ ${scope} tests error:`, error);
                allPassed = false;
            }

            console.log('');
        }

        if (allPassed) {
            console.log('🎉 All tests passed!');
        } else {
            console.log('💥 Some tests failed');
        }

        return allPassed;
    }

    private async executeCommand(command: string[]): Promise<{ success: boolean; output: string }> {
        const { spawn } = await import('child_process');

        return new Promise((resolve) => {
            const proc = spawn(command[0], command.slice(1), {
                stdio: 'pipe',
                cwd: process.cwd()
            });

            let output = '';
            let errorOutput = '';

            proc.stdout?.on('data', (data) => {
                output += data.toString();
                if (!this.config.quiet) {
                    process.stdout.write(data);
                }
            });

            proc.stderr?.on('data', (data) => {
                errorOutput += data.toString();
                if (!this.config.quiet) {
                    process.stderr.write(data);
                }
            });

            proc.on('close', (code) => {
                resolve({
                    success: code === 0,
                    output: output + errorOutput
                });
            });

            // Timeout
            setTimeout(() => {
                proc.kill();
                resolve({
                    success: false,
                    output: 'Test execution timed out'
                });
            }, this.config.timeout);
        });
    }

    async runPreCommit(): Promise<boolean> {
        console.log('🔍 Running pre-commit tests...');

        const preCommitConfig = this.scopeManager.getPreCommitConfig();
        const scopes = preCommitConfig.scopes || ['unit'];

        this.config.scopes = scopes;
        this.config.quiet = true;
        this.config.timeout = preCommitConfig.timeout || 30000;

        return await this.runTests();
    }

    async runCI(): Promise<boolean> {
        console.log('🚀 Running CI tests...');

        const ciConfig = this.scopeManager.getCIConfig();
        const scopes = ciConfig.scopes || ['unit', 'integration', 'performance', 'snapshot'];

        this.config.scopes = scopes;
        this.config.quiet = true;
        this.config.coverage = true;
        this.config.skipPassing = false;
        this.config.timeout = ciConfig.timeout || 300000;

        return await this.runTests();
    }

    async runAI(): Promise<boolean> {
        console.log('🤖 Running AI-friendly tests...');

        this.config.scopes = ['unit', 'integration'];
        this.config.quiet = true;
        this.config.coverage = false;
        this.config.skipPassing = true;
        this.config.timeout = 120000;

        return await this.runTests();
    }

    showStatus(): void {
        console.log('📊 Test Integration Status');
        console.log('');
        console.log(`Environment: ${this.config.environment}`);
        console.log(`Scopes: ${this.config.scopes.join(', ')}`);
        console.log(`Quiet: ${this.config.quiet}`);
        console.log(`Coverage: ${this.config.coverage}`);
        console.log(`Parallel: ${this.config.parallel}`);
        console.log(`Skip Passing: ${this.config.skipPassing}`);
        console.log(`Timeout: ${this.config.timeout}ms`);
        console.log('');
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'help';

    switch (command) {
        case 'pre-commit':
            const preCommit = new TestIntegration('preCommit');
            const preCommitResult = await preCommit.runPreCommit();
            process.exit(preCommitResult ? 0 : 1);
            break;

        case 'ci':
            const ci = new TestIntegration('ci');
            const ciResult = await ci.runCI();
            process.exit(ciResult ? 0 : 1);
            break;

        case 'ai':
            const ai = new TestIntegration('ai');
            const aiResult = await ai.runAI();
            process.exit(aiResult ? 0 : 1);
            break;

        case 'dev':
            const dev = new TestIntegration('development');
            const devResult = await dev.runTests();
            process.exit(devResult ? 0 : 1);
            break;

        case 'status':
            const status = new TestIntegration(args[1] || 'development');
            status.showStatus();
            break;

        case 'help':
        default:
            console.log('Test Integration Script');
            console.log('');
            console.log('Usage:');
            console.log('  bun run scripts/test-integration.ts pre-commit  # Pre-commit tests');
            console.log('  bun run scripts/test-integration.ts ci         # CI tests');
            console.log('  bun run scripts/test-integration.ts ai         # AI-friendly tests');
            console.log('  bun run scripts/test-integration.ts dev        # Development tests');
            console.log('  bun run scripts/test-integration.ts status     # Show status');
            console.log('');
            break;
    }
}

if (import.meta.main) {
    main().catch(console.error);
}

export { TestIntegration };
