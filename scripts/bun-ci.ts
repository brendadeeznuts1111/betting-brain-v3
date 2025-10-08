#!/usr/bin/env bun

/**
 * 🚀 Bun CI Integration Script
 * 
 * Integrates cursor rules with Bun's built-in speed tools
 * No separate installs, no Node fallback - pure Bun speed
 */

import { $ } from 'bun';
import { existsSync } from 'fs';
import { join } from 'path';

interface CIConfig {
  timeout: number;
  parallel: boolean;
  verbose: boolean;
  skipTests: boolean;
  skipLint: boolean;
  skipSecurity: boolean;
  skipTypeCheck: boolean;
  skipFormat: boolean;
}

interface CIResult {
  success: boolean;
  duration: number;
  steps: Array<{
    name: string;
    success: boolean;
    duration: number;
    output?: string;
    error?: string;
  }>;
}

class BunCI {
  private config: CIConfig;
  private startTime: number;
  private results: CIResult['steps'] = [];

  constructor(config: Partial<CIConfig> = {}) {
    this.config = {
      timeout: 30000, // 30 seconds
      parallel: false,
      verbose: false,
      skipTests: false,
      skipLint: false,
      skipSecurity: false,
      skipTypeCheck: false,
      skipFormat: false,
      ...config
    };
    this.startTime = Date.now();
  }

  private isAIEnvironment(): boolean {
    // Detect AI coding assistant environments
    return !!(
      process.env.CLAUDECODE ||
      process.env.REPL_ID ||
      process.env.AGENT
    );
  }

  private async runStep(name: string, command: string, args: string[] = []): Promise<boolean> {
    const stepStart = Date.now();
    console.log(`🔧 Running: ${name}...`);

    try {
      const result = await $`${command} ${args}`.quiet();
      const duration = Date.now() - stepStart;

      this.results.push({
        name,
        success: true,
        duration,
        output: result.stdout?.toString() || ''
      });

      console.log(`✅ ${name} completed in ${duration}ms`);
      return true;
    } catch (error) {
      const duration = Date.now() - stepStart;

      this.results.push({
        name,
        success: false,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      console.error(`❌ ${name} failed in ${duration}ms:`, error);
      return false;
    }
  }

  private async checkCursorRules(): Promise<boolean> {
    console.log('🤖 Checking cursor rules compliance...');

    // Check if .cursorrules exists
    if (!existsSync('.cursorrules')) {
      console.error('❌ .cursorrules file missing');
      return false;
    }

    // Check version format
    const versionMatch = Bun.file('.cursorrules').text().then(content => {
      const versionLine = content.split('\n').find(line => line.startsWith('version:'));
      if (!versionLine) {
        throw new Error('Missing version in .cursorrules');
      }
      const version = versionLine.split(':')[1].trim();
      if (!/^\d+\.\d+\.\d+$/.test(version)) {
        throw new Error(`Invalid version format: ${version}`);
      }
      return version;
    });

    try {
      const version = await versionMatch;
      console.log(`✅ Cursor rules version: ${version}`);
      return true;
    } catch (error) {
      console.error('❌ Cursor rules validation failed:', error);
      return false;
    }
  }

  private async runLinting(): Promise<boolean> {
    console.log('🔍 Running Bun-aware linting...');

    // ESLint via bunx
    const eslintSuccess = await this.runStep(
      'ESLint',
      'bunx',
      ['eslint@latest', 'src', '--ext', '.js,.jsx,.ts,.tsx', '--max-warnings', '0']
    );

    // Prettier check
    const prettierSuccess = await this.runStep(
      'Prettier',
      'bunx',
      ['prettier@latest', '--check', 'src', 'tests', 'docs']
    );

    return eslintSuccess && prettierSuccess;
  }

  private async runSecurityScan(): Promise<boolean> {
    console.log('🔒 Running security scan...');

    // ast-grep security scan
    const astGrepSuccess = await this.runStep(
      'ast-grep Security',
      'bunx',
      ['ast-grep@latest', 'scan', '--filter', 'sql-injection-risk', '--error']
    );

    // Additional security checks
    const stakeValidationSuccess = await this.runStep(
      'Stake Validation',
      'bunx',
      ['ast-grep@latest', 'scan', '--filter', 'no-parsefloat-stake', '--error']
    );

    const corsValidationSuccess = await this.runStep(
      'CORS Validation',
      'bunx',
      ['ast-grep@latest', 'scan', '--filter', 'missing-cors-headers', '--error']
    );

    return astGrepSuccess && stakeValidationSuccess && corsValidationSuccess;
  }

  private async runTypeCheck(): Promise<boolean> {
    console.log('📝 Running TypeScript type check...');

    return await this.runStep(
      'TypeScript',
      'bun',
      ['run', 'tsc', '--noEmit']
    );
  }

  private async runTests(): Promise<boolean> {
    console.log('🧪 Running tests...');

    // Enable AI-friendly output if in AI environment
    if (this.isAIEnvironment()) {
      console.log('  🤖 AI environment detected - enabling quiet mode');
      process.env.CLAUDECODE = '1';
    }

    // Run tests with coverage and randomization for analytics testing
    return await this.runStep(
      'Tests',
      'bun',
      ['run', 'test:ci']
    );
  }

  private async runBuild(): Promise<boolean> {
    console.log('🏗️ Building project...');

    return await this.runStep(
      'Build',
      'bun',
      ['run', 'build:worker']
    );
  }

  private async validateFileNaming(): Promise<boolean> {
    console.log('📁 Validating file naming conventions...');

    try {
      // Check for kebab-case files
      const { stdout } = await $`find . -name "*.ts" -o -name "*.js" -o -name "*.md" | grep -E '[A-Z]' | grep -v node_modules`.quiet();

      if (stdout.toString().trim()) {
        console.warn('⚠️  Found files with uppercase letters:');
        console.warn(stdout.toString());
        console.warn('💡 Consider using kebab-case for better compatibility');
      }

      return true;
    } catch (error) {
      console.error('❌ File naming validation failed:', error);
      return false;
    }
  }

  private async validateRootDirectory(): Promise<boolean> {
    console.log('📂 Validating root directory cleanliness...');

    try {
      const { stdout } = await $`ls -la | grep -E '\.(md|txt|json)$' | grep -v -E '^(README|LICENSE|CLAUDE|package|tsconfig|wrangler)\.'`.quiet();

      if (stdout.toString().trim()) {
        console.error('❌ Found unexpected files in root directory:');
        console.error(stdout.toString());
        console.error('💡 Move documentation files to docs/ directory');
        return false;
      }

      console.log('✅ Root directory is clean');
      return true;
    } catch (error) {
      console.log('✅ Root directory is clean');
      return true;
    }
  }

  async run(): Promise<CIResult> {
    console.log('🚀 Starting Bun CI with cursor rules integration...');
    console.log(`⚙️  Config: ${JSON.stringify(this.config, null, 2)}`);

    const steps = [
      { name: 'Cursor Rules', fn: () => this.checkCursorRules() },
      { name: 'File Naming', fn: () => this.validateFileNaming() },
      { name: 'Root Directory', fn: () => this.validateRootDirectory() },
    ];

    if (!this.config.skipLint) {
      steps.push({ name: 'Linting', fn: () => this.runLinting() });
    }

    if (!this.config.skipSecurity) {
      steps.push({ name: 'Security', fn: () => this.runSecurityScan() });
    }

    if (!this.config.skipTypeCheck) {
      steps.push({ name: 'Type Check', fn: () => this.runTypeCheck() });
    }

    if (!this.config.skipTests) {
      steps.push({ name: 'Tests', fn: () => this.runTests() });
    }

    steps.push({ name: 'Build', fn: () => this.runBuild() });

    // Run steps
    let allSuccess = true;
    for (const step of steps) {
      const success = await step.fn();
      if (!success) {
        allSuccess = false;
        if (!this.config.verbose) {
          console.log('❌ CI failed - stopping execution');
          break;
        }
      }
    }

    const duration = Date.now() - this.startTime;

    const result: CIResult = {
      success: allSuccess,
      duration,
      steps: this.results
    };

    // Print summary
    console.log('\n📊 CI Summary:');
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log(`✅ Success: ${allSuccess ? 'Yes' : 'No'}`);
    console.log(`📋 Steps: ${this.results.length}`);

    this.results.forEach(step => {
      const status = step.success ? '✅' : '❌';
      console.log(`  ${status} ${step.name} (${step.duration}ms)`);
    });

    if (allSuccess) {
      console.log('\n🎉 All CI checks passed!');
    } else {
      console.log('\n💥 CI checks failed!');
      process.exit(1);
    }

    return result;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const config: Partial<CIConfig> = {};

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--skip-tests':
        config.skipTests = true;
        break;
      case '--skip-lint':
        config.skipLint = true;
        break;
      case '--skip-security':
        config.skipSecurity = true;
        break;
      case '--skip-type-check':
        config.skipTypeCheck = true;
        break;
      case '--skip-format':
        config.skipFormat = true;
        break;
      case '--verbose':
        config.verbose = true;
        break;
      case '--timeout':
        config.timeout = parseInt(args[++i]) || 30000;
        break;
    }
  }

  const ci = new BunCI(config);
  await ci.run();
}

// Run if called directly
if (import.meta.main) {
  main().catch(console.error);
}

export { BunCI, type CIConfig, type CIResult };
