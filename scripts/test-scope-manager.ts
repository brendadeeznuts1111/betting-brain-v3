#!/usr/bin/env bun
/**
 * Test Scope Manager
 * 
 * Manages test execution based on scopes and environments
 * Integrates with the quiet testing system
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface TestScope {
    description: string;
    timeout: number;
    parallel: boolean;
    priority: number;
    patterns: string[];
    exclude: string[];
}

interface TestScopes {
    scopes: Record<string, TestScope>;
    environments: Record<string, any>;
    preCommit: any;
    ci: any;
}

class TestScopeManager {
    private scopes: TestScopes;

    constructor() {
        this.scopes = this.loadScopes();
    }

    private loadScopes(): TestScopes {
        const scopeFile = join(process.cwd(), 'tests/scopes/test-scopes.json');

        if (!existsSync(scopeFile)) {
            throw new Error('Test scopes configuration not found');
        }

        return JSON.parse(readFileSync(scopeFile, 'utf-8'));
    }

    getScope(name: string): TestScope | undefined {
        return this.scopes.scopes[name];
    }

    getEnvironment(name: string): any {
        return this.scopes.environments[name];
    }

    getPreCommitConfig(): any {
        return this.scopes.preCommit;
    }

    getCIConfig(): any {
        return this.scopes.ci;
    }

    getScopesForEnvironment(env: string): string[] {
        const config = this.getEnvironment(env);
        if (!config) {
            return Object.keys(this.scopes.scopes);
        }

        // Return scopes based on environment
        switch (env) {
            case 'preCommit':
                return this.scopes.preCommit.scopes;
            case 'ci':
                return this.scopes.ci.scopes;
            default:
                return Object.keys(this.scopes.scopes);
        }
    }

    getTestFiles(scope: string): string[] {
        const scopeConfig = this.getScope(scope);
        if (!scopeConfig) {
            return [];
        }

        // This would integrate with the test discovery logic
        // For now, return the patterns
        return scopeConfig.patterns;
    }

    getTestCommand(scope: string, environment: string = 'development'): string[] {
        const scopeConfig = this.getScope(scope);
        const envConfig = this.getEnvironment(environment);

        if (!scopeConfig) {
            throw new Error(`Unknown test scope: ${scope}`);
        }

        const command = ['bun', 'run', 'scripts/test-runner.ts'];

        // Add scope
        command.push('--category', scope);

        // Add environment-specific options
        if (envConfig) {
            if (envConfig.quiet) {
                command.push('--quiet');
            }
            if (envConfig.coverage) {
                command.push('--coverage');
            }
            if (envConfig.ci) {
                command.push('--ci');
            }
            if (!envConfig.skipPassing) {
                command.push('--no-skip');
            }
            if (!envConfig.parallel) {
                command.push('--serial');
            }
        }

        return command;
    }

    listScopes(): void {
        console.log('📋 Available Test Scopes:');
        console.log('');

        Object.entries(this.scopes.scopes).forEach(([name, scope]) => {
            console.log(`  ${name.padEnd(12)} - ${scope.description}`);
            console.log(`    Timeout: ${scope.timeout}ms, Parallel: ${scope.parallel ? 'Yes' : 'No'}, Priority: ${scope.priority}`);
            console.log('');
        });
    }

    listEnvironments(): void {
        console.log('🌍 Available Environments:');
        console.log('');

        Object.entries(this.scopes.environments).forEach(([name, config]) => {
            console.log(`  ${name.padEnd(12)} - Quiet: ${config.quiet}, Coverage: ${config.coverage}, Skip: ${config.skipPassing}`);
        });
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const manager = new TestScopeManager();

    if (args.length === 0) {
        console.log('Test Scope Manager');
        console.log('');
        console.log('Usage:');
        console.log('  bun run scripts/test-scope-manager.ts list-scopes');
        console.log('  bun run scripts/test-scope-manager.ts list-environments');
        console.log('  bun run scripts/test-scope-manager.ts get-command <scope> [environment]');
        console.log('');
        return;
    }

    const command = args[0];

    switch (command) {
        case 'list-scopes':
            manager.listScopes();
            break;
        case 'list-environments':
            manager.listEnvironments();
            break;
        case 'get-command':
            if (args.length < 2) {
                console.error('Error: Scope name required');
                process.exit(1);
            }
            const scope = args[1];
            const environment = args[2] || 'development';
            const cmd = manager.getTestCommand(scope, environment);
            console.log(cmd.join(' '));
            break;
        default:
            console.error(`Unknown command: ${command}`);
            process.exit(1);
    }
}

if (import.meta.main) {
    main().catch(console.error);
}

export { TestScopeManager };
