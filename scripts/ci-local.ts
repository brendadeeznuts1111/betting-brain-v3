#!/usr/bin/env bun
/**
 * Local CI Script - One-Click Testing
 * Runs full CI pipeline locally with zombie process protection
 * 
 * Usage:
 *   bun run ci:local           # Full CI
 *   bun run ci:local --quick   # Quick CI (skip slow checks)
 *   bun run ci:local --watch   # Watch mode
 */

import processManager from '../tests/utils/process-cleanup';

interface CIStep {
  name: string;
  emoji: string;
  command: string[];
  timeout?: number;
  required?: boolean;
  skip?: boolean;
}

interface CIResult {
  step: string;
  status: 'pass' | 'fail' | 'skip';
  duration: number;
  error?: string;
}

class LocalCI {
  private results: CIResult[] = [];
  private startTime: number = 0;
  private quickMode: boolean = false;

  constructor(quickMode: boolean = false) {
    this.quickMode = quickMode;
  }

  private isAIEnvironment(): boolean {
    // Detect AI coding assistant environments
    return !!(
      process.env.CLAUDECODE ||
      process.env.REPL_ID ||
      process.env.AGENT
    );
  }

  async run(): Promise<boolean> {
    console.log('\n' + '═'.repeat(70));
    console.log('🚀 LOCAL CI PIPELINE');
    console.log('═'.repeat(70));
    console.log(`Mode: ${this.quickMode ? '⚡ Quick' : '🔍 Full'}`);

    // Enable AI-friendly output if in AI environment
    if (this.isAIEnvironment()) {
      console.log('🤖 AI Environment: Quiet test output enabled');
      process.env.CLAUDECODE = '1';
    }

    console.log('═'.repeat(70) + '\n');

    this.startTime = Date.now();

    const steps: CIStep[] = [
      {
        name: 'Security Scan',
        emoji: '🔒',
        command: ['sg', 'scan', 'src/'],
        timeout: 30000,
        required: true
      },
      {
        name: 'SQL Migration Validation',
        emoji: '🗄️',
        command: ['bun', 'run', 'scripts/validate-migrations.ts'],
        timeout: 10000,
        required: true
      },
      {
        name: 'Lint Code',
        emoji: '🎨',
        command: ['bun', 'run', 'lint'],
        timeout: 30000,
        required: false,
        skip: this.quickMode
      },
      {
        name: 'Type Check',
        emoji: '📝',
        command: ['bun', 'x', 'tsc', '--noEmit'],
        timeout: 60000,
        required: false,
        skip: this.quickMode
      },
      {
        name: 'Unit Tests',
        emoji: '🧪',
        command: ['bun', 'run', 'test:unit'],
        timeout: 120000,
        required: true
      },
      {
        name: 'Integration Tests',
        emoji: '🔗',
        command: ['bun', 'run', 'test:integration'],
        timeout: 180000,
        required: true
      },
      {
        name: 'Test Coverage',
        emoji: '📊',
        command: ['bun', 'run', 'test:coverage'],
        timeout: 120000,
        required: false,
        skip: this.quickMode
      },
      {
        name: 'Build Worker',
        emoji: '🏗️',
        command: ['bun', 'run', 'build:worker'],
        timeout: 60000,
        required: true
      },
      {
        name: 'Link Check',
        emoji: '🔗',
        command: ['bun', 'scripts/link-check.js'],
        timeout: 30000,
        required: false,
        skip: this.quickMode
      }
    ];

    let allPassed = true;

    try {
      for (const step of steps) {
        if (step.skip) {
          console.log(`⏭️  ${step.emoji} ${step.name}: SKIPPED (quick mode)`);
          this.results.push({
            step: step.name,
            status: 'skip',
            duration: 0
          });
          continue;
        }

        const result = await this.runStep(step);
        this.results.push(result);

        if (result.status === 'fail' && step.required) {
          console.log(`\n❌ ${step.name} failed (required step)`);
          allPassed = false;
          break;
        }
      }

      // Check for zombie processes
      await this.checkZombieProcesses();

    } catch (error) {
      console.error('\n❌ CI pipeline error:', error);
      allPassed = false;
    } finally {
      // Cleanup all processes
      await processManager.killAll(3000);
    }

    this.printReport();
    return allPassed;
  }

  private async runStep(step: CIStep): Promise<CIResult> {
    const startTime = Date.now();
    console.log(`\n${step.emoji} ${step.name}...`);

    let proc;
    try {
      const timeout = step.timeout || 30000;

      // Spawn and track process
      proc = processManager.spawn(step.command, {
        cwd: process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe']
      });

      // Capture output
      const stdout: string[] = [];
      const stderr: string[] = [];

      if (proc.stdout) {
        for await (const chunk of proc.stdout) {
          const text = new TextDecoder().decode(chunk);
          stdout.push(text);
          process.stdout.write(text);
        }
      }

      if (proc.stderr) {
        for await (const chunk of proc.stderr) {
          const text = new TextDecoder().decode(chunk);
          stderr.push(text);
          process.stderr.write(text);
        }
      }

      // Wait for exit with timeout
      const exitCode = await Promise.race([
        proc.exited,
        new Promise<number>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout)
        )
      ]);

      const duration = Date.now() - startTime;

      if (exitCode === 0) {
        console.log(`✅ ${step.name}: PASS (${duration}ms)`);
        return {
          step: step.name,
          status: 'pass',
          duration
        };
      } else {
        console.log(`❌ ${step.name}: FAIL (exit ${exitCode}, ${duration}ms)`);
        return {
          step: step.name,
          status: 'fail',
          duration,
          error: `Exit code ${exitCode}`
        };
      }

    } catch (error) {
      // Kill process on timeout/error
      if (proc) {
        await processManager.kill(proc, 15, 2000).catch(() => {});
      }

      const duration = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';

      console.log(`❌ ${step.name}: FAIL (${errorMsg}, ${duration}ms)`);

      return {
        step: step.name,
        status: 'fail',
        duration,
        error: errorMsg
      };
    }
  }

  private async checkZombieProcesses(): Promise<void> {
    console.log('\n🧹 Checking for zombie processes...');

    const count = processManager.count();
    if (count > 0) {
      console.log(`⚠️  Found ${count} tracked process(es), cleaning up...`);
      await processManager.killAll(3000);
      console.log('✅ Cleanup complete');
    } else {
      console.log('✅ No zombie processes found');
    }
  }

  private printReport(): void {
    const duration = Date.now() - this.startTime;

    console.log('\n' + '═'.repeat(70));
    console.log('📊 CI PIPELINE REPORT');
    console.log('═'.repeat(70));

    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const skipped = this.results.filter(r => r.status === 'skip').length;
    const total = this.results.length;

    console.log(`\n📈 Results: ${passed} passed, ${failed} failed, ${skipped} skipped (${total} total)`);
    console.log(`⏱️  Total duration: ${(duration / 1000).toFixed(2)}s`);

    if (failed > 0) {
      console.log('\n❌ Failed Steps:');
      this.results
        .filter(r => r.status === 'fail')
        .forEach(r => {
          console.log(`   • ${r.step}: ${r.error}`);
        });
    }

    console.log('\n📋 Step Details:');
    this.results.forEach(r => {
      const status = r.status === 'pass' ? '✅' : r.status === 'fail' ? '❌' : '⏭️';
      const time = r.duration > 0 ? `${(r.duration / 1000).toFixed(2)}s` : 'skipped';
      console.log(`   ${status} ${r.step.padEnd(30)} ${time}`);
    });

    // Final status
    const allPassed = failed === 0;
    console.log('\n' + '═'.repeat(70));
    if (allPassed) {
      console.log('✅ CI PIPELINE PASSED!');
      console.log('🚀 Ready to push to GitHub');
    } else {
      console.log('❌ CI PIPELINE FAILED');
      console.log('🔧 Fix the errors above before pushing');
    }
    console.log('═'.repeat(70) + '\n');
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const quickMode = args.includes('--quick') || args.includes('-q');
  const watchMode = args.includes('--watch') || args.includes('-w');

  if (watchMode) {
    console.log('👀 Watch mode not yet implemented');
    console.log('💡 Use: bun test --watch');
    process.exit(1);
  }

  const ci = new LocalCI(quickMode);
  const success = await ci.run();

  process.exit(success ? 0 : 1);
}

if (import.meta.main) {
  main().catch(error => {
    console.error('❌ CI script failed:', error);
    process.exit(1);
  });
}

export { LocalCI };

