#!/usr/bin/env bun
/**
 * Build and Test Automation Script
 * Automates the entire build, test, and deployment pipeline
 */

import { existsSync } from 'fs';
import { join } from 'path';
import processManager from '../../tests/utils/process-cleanup';

interface BuildConfig {
  projectRoot: string;
  extensionPath: string;
  workerPath: string;
  outputPath: string;
  testTimeout: number;
}

interface BuildStep {
  name: string;
  command: string[];
  cwd?: string;
  timeout?: number;
  required?: boolean;
}

class BuildAndTestAutomation {
  private config: BuildConfig;
  private steps: BuildStep[] = [];
  private results: Array<{ step: string; status: 'success' | 'failure' | 'skipped'; duration: number; error?: string }> = [];

  constructor(config: BuildConfig) {
    this.config = config;
    this.initializeSteps();
  }

  private initializeSteps(): void {
    this.steps = [
      {
        name: 'Clean Build Directory',
        command: ['rm', '-rf', this.config.outputPath],
        required: false
      },
      {
        name: 'Create Build Directory',
        command: ['mkdir', '-p', this.config.outputPath],
        required: true
      },
      {
        name: 'Install Dependencies',
        command: ['bun', 'install'],
        cwd: this.config.projectRoot,
        required: true,
        timeout: 60000
      },
      {
        name: 'Lint Code',
        command: ['bun', 'run', 'lint'],
        cwd: this.config.projectRoot,
        required: false,
        timeout: 30000
      },
      {
        name: 'Format Code',
        command: ['bun', 'run', 'format'],
        cwd: this.config.projectRoot,
        required: false,
        timeout: 30000
      },
      {
        name: 'Run Unit Tests',
        command: ['bun', 'test'],
        cwd: this.config.projectRoot,
        required: true,
        timeout: 120000
      },
      {
        name: 'Build Worker',
        command: ['bun', 'run', 'build:worker'],
        cwd: this.config.projectRoot,
        required: true,
        timeout: 60000
      },
      {
        name: 'Test Extension',
        command: ['bun', 'run', 'scripts/testing/extension-test-runner.ts'],
        cwd: this.config.projectRoot,
        required: true,
        timeout: this.config.testTimeout
      },
      {
        name: 'Package Extension',
        command: ['zip', '-r', 'extension.zip', '.'],
        cwd: this.config.extensionPath,
        required: true,
        timeout: 30000
      },
      {
        name: 'Generate Documentation',
        command: ['bun', 'run', 'docs:generate'],
        cwd: this.config.projectRoot,
        required: false,
        timeout: 60000
      }
    ];
  }

  async runPipeline(): Promise<void> {
    console.log('🚀 Starting Build and Test Pipeline');
    console.log('=' .repeat(60));
    console.log(`📁 Project Root: ${this.config.projectRoot}`);
    console.log(`🔧 Extension Path: ${this.config.extensionPath}`);
    console.log(`☁️  Worker Path: ${this.config.workerPath}`);
    console.log(`📦 Output Path: ${this.config.outputPath}`);
    console.log('=' .repeat(60));

    const startTime = Date.now();

    try {
      for (const step of this.steps) {
        await this.executeStep(step);
      }

      const totalDuration = Date.now() - startTime;
      this.generateReport(totalDuration);
    } finally {
      // Ensure all processes are cleaned up
      await processManager.killAll(3000);
    }
  }

  private async executeStep(step: BuildStep): Promise<void> {
    const stepStartTime = Date.now();
    
    console.log(`\n🔧 ${step.name}...`);

    try {
      // Check if step is required and if prerequisites exist
      if (step.required && !this.checkPrerequisites(step)) {
        throw new Error('Prerequisites not met');
      }

      // Execute the command
      const result = await this.runCommand(step);
      
      if (result.success) {
        const duration = Date.now() - stepStartTime;
        this.results.push({
          step: step.name,
          status: 'success',
          duration
        });
        console.log(`✅ ${step.name}: SUCCESS (${duration}ms)`);
      } else {
        throw new Error(result.error || 'Command failed');
      }

    } catch (error) {
      const duration = Date.now() - stepStartTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.results.push({
        step: step.name,
        status: 'failure',
        duration,
        error: errorMessage
      });

      console.log(`❌ ${step.name}: FAILED (${duration}ms)`);
      console.log(`   Error: ${errorMessage}`);

      if (step.required) {
        console.log(`\n💥 Required step failed. Stopping pipeline.`);
        throw error;
      } else {
        console.log(`⚠️  Optional step failed. Continuing...`);
      }
    }
  }

  private checkPrerequisites(step: BuildStep): boolean {
    switch (step.name) {
      case 'Install Dependencies':
        return existsSync(join(this.config.projectRoot, 'package.json'));
      
      case 'Build Worker':
        return existsSync(join(this.config.workerPath, 'src', 'index.ts'));
      
      case 'Test Extension':
        return existsSync(join(this.config.extensionPath, 'manifest.json'));
      
      case 'Package Extension':
        return existsSync(this.config.extensionPath);
      
      default:
        return true;
    }
  }

  private async runCommand(step: BuildStep): Promise<{ success: boolean; error?: string }> {
    let proc;
    try {
      const timeout = step.timeout || 30000;
      
      // Spawn and track process
      proc = processManager.spawn(step.command, {
        cwd: step.cwd || this.config.projectRoot,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      // Race between process exit and timeout
      const result = await Promise.race([
        proc.exited,
        new Promise<number>((_, reject) => 
          setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout)
        )
      ]);

      if (result === 0) {
        return { success: true };
      } else {
        return { 
          success: false, 
          error: `Exit code ${result}` 
        };
      }
    } catch (error) {
      // Kill the process on timeout or error
      if (proc) {
        try {
          await processManager.kill(proc, 15, 2000);
        } catch (killError) {
          console.error('⚠️  Failed to kill process:', killError);
        }
      }
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  private generateReport(totalDuration: number): void {
    console.log('\n' + '=' .repeat(60));
    console.log('📊 BUILD AND TEST PIPELINE REPORT');
    console.log('=' .repeat(60));

    const successful = this.results.filter(r => r.status === 'success').length;
    const failed = this.results.filter(r => r.status === 'failure').length;
    const skipped = this.results.filter(r => r.status === 'skipped').length;
    const total = this.results.length;

    console.log(`\n📈 Results: ${successful} successful, ${failed} failed, ${skipped} skipped (${total} total)`);
    console.log(`⏱️  Total duration: ${totalDuration}ms`);

    if (failed > 0) {
      console.log('\n❌ Failed Steps:');
      this.results
        .filter(r => r.status === 'failure')
        .forEach(r => {
          console.log(`   • ${r.step}: ${r.error}`);
        });
    }

    console.log('\n📋 Step Details:');
    this.results.forEach(r => {
      const status = r.status === 'success' ? '✅' : r.status === 'failure' ? '❌' : '⏭️';
      console.log(`   ${status} ${r.step} (${r.duration}ms)`);
      if (r.error) {
        console.log(`      Error: ${r.error}`);
      }
    });

    // Save report to file
    const reportPath = join(this.config.outputPath, 'build-report.json');
    Bun.write(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      config: this.config,
      summary: { successful, failed, skipped, total, totalDuration },
      results: this.results
    }, null, 2));

    console.log(`\n💾 Detailed report saved to: ${reportPath}`);

    // Generate summary
    if (failed === 0) {
      console.log('\n🎉 All steps completed successfully!');
      console.log('🚀 Ready for deployment');
    } else {
      console.log('\n⚠️  Some steps failed. Review the report and fix issues before deployment.');
    }
  }
}

// Main execution
async function main() {
  const config: BuildConfig = {
    projectRoot: process.cwd(),
    extensionPath: join(process.cwd(), 'browser-extension'),
    workerPath: join(process.cwd(), 'src'),
    outputPath: join(process.cwd(), 'dist'),
    testTimeout: 120000
  };

  const automation = new BuildAndTestAutomation(config);
  
  try {
    await automation.runPipeline();
    process.exit(0);
  } catch (error) {
    console.error('❌ Pipeline failed:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main().catch(error => {
    console.error('❌ Automation script failed:', error);
    process.exit(1);
  });
}

export { BuildAndTestAutomation, BuildConfig };
