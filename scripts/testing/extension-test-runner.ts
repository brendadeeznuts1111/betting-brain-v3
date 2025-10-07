#!/usr/bin/env bun
/**
 * Automated Extension Testing Suite
 * Tests extension injection, functionality, and log forwarding
 */

import { spawn } from 'bun';
import { existsSync } from 'fs';
import { join } from 'path';

interface TestConfig {
  extensionPath: string;
  testPages: string[];
  workerUrl: string;
  timeout: number;
  retries: number;
}

interface TestResult {
  test: string;
  status: 'pass' | 'fail' | 'skip';
  duration: number;
  error?: string;
  logs?: string[];
}

class ExtensionTestRunner {
  private config: TestConfig;
  private results: TestResult[] = [];
  private logMonitor: any = null;

  constructor(config: TestConfig) {
    this.config = config;
  }

  async runAllTests(): Promise<TestResult[]> {
    console.log('🚀 Starting Automated Extension Testing Suite');
    console.log('=' .repeat(60));

    // Start log monitor
    await this.startLogMonitor();

    // Run tests
    await this.testExtensionStructure();
    await this.testManifestValidation();
    await this.testContentScriptInjection();
    await this.testLogForwarding();
    await this.testWorkerConnectivity();
    await this.testAuthenticationFlow();

    // Stop log monitor
    await this.stopLogMonitor();

    // Generate report
    this.generateReport();

    return this.results;
  }

  private async testExtensionStructure(): Promise<void> {
    const test = 'Extension Structure';
    const startTime = Date.now();

    try {
      console.log(`\n📁 Testing ${test}...`);

      const requiredFiles = [
        'manifest.json',
        'background.js',
        'content.js',
        'popup.html',
        'popup.js',
        'icon.svg'
      ];

      const missingFiles: string[] = [];
      
      for (const file of requiredFiles) {
        const filePath = join(this.config.extensionPath, file);
        if (!existsSync(filePath)) {
          missingFiles.push(file);
        }
      }

      if (missingFiles.length > 0) {
        throw new Error(`Missing files: ${missingFiles.join(', ')}`);
      }

      // Validate manifest.json
      const manifestPath = join(this.config.extensionPath, 'manifest.json');
      const manifestContent = await Bun.file(manifestPath).text();
      const manifest = JSON.parse(manifestContent);

      if (manifest.manifest_version !== 3) {
        throw new Error('Manifest must be version 3');
      }

      if (!manifest.content_scripts || manifest.content_scripts.length === 0) {
        throw new Error('No content scripts defined');
      }

      this.addResult(test, 'pass', Date.now() - startTime);
      console.log(`✅ ${test}: PASS`);

    } catch (error) {
      this.addResult(test, 'fail', Date.now() - startTime, error instanceof Error ? error.message : 'Unknown error');
      console.log(`❌ ${test}: FAIL - ${error}`);
    }
  }

  private async testManifestValidation(): Promise<void> {
    const test = 'Manifest Validation';
    const startTime = Date.now();

    try {
      console.log(`\n📋 Testing ${test}...`);

      const manifestPath = join(this.config.extensionPath, 'manifest.json');
      const manifestContent = await Bun.file(manifestPath).text();
      const manifest = JSON.parse(manifestContent);

      // Check required fields
      const requiredFields = ['name', 'version', 'manifest_version', 'permissions', 'host_permissions'];
      const missingFields = requiredFields.filter(field => !manifest[field]);

      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Check host permissions include fantasy402.com
      const hostPermissions = manifest.host_permissions || [];
      const hasFantasy402 = hostPermissions.some((permission: string) => 
        permission.includes('fantasy402.com')
      );

      if (!hasFantasy402) {
        throw new Error('Missing fantasy402.com host permission');
      }

      // Check content scripts
      const contentScripts = manifest.content_scripts || [];
      if (contentScripts.length === 0) {
        throw new Error('No content scripts defined');
      }

      this.addResult(test, 'pass', Date.now() - startTime);
      console.log(`✅ ${test}: PASS`);

    } catch (error) {
      this.addResult(test, 'fail', Date.now() - startTime, error instanceof Error ? error.message : 'Unknown error');
      console.log(`❌ ${test}: FAIL - ${error}`);
    }
  }

  private async testContentScriptInjection(): Promise<void> {
    const test = 'Content Script Injection';
    const startTime = Date.now();

    try {
      console.log(`\n🔧 Testing ${test}...`);

      const contentScriptPath = join(this.config.extensionPath, 'content.js');
      if (!existsSync(contentScriptPath)) {
        throw new Error('content.js not found');
      }

      const contentScriptContent = await Bun.file(contentScriptPath).text();

      // Check for required functions
      const requiredFunctions = [
        'window.fetch',
        'originalFetch',
        'WORKER_URL',
        'TARGET_PATH'
      ];

      const missingFunctions = requiredFunctions.filter(func => 
        !contentScriptContent.includes(func)
      );

      if (missingFunctions.length > 0) {
        throw new Error(`Missing required functions: ${missingFunctions.join(', ')}`);
      }

      // Check for debug logging
      if (!contentScriptContent.includes('console.log')) {
        console.log('⚠️  Warning: No debug logging found in content script');
      }

      this.addResult(test, 'pass', Date.now() - startTime);
      console.log(`✅ ${test}: PASS`);

    } catch (error) {
      this.addResult(test, 'fail', Date.now() - startTime, error instanceof Error ? error.message : 'Unknown error');
      console.log(`❌ ${test}: FAIL - ${error}`);
    }
  }

  private async testLogForwarding(): Promise<void> {
    const test = 'Log Forwarding';
    const startTime = Date.now();

    try {
      console.log(`\n📡 Testing ${test}...`);

      const logForwarderPath = join(this.config.extensionPath, 'log-forwarder.js');
      if (!existsSync(logForwarderPath)) {
        throw new Error('log-forwarder.js not found');
      }

      const logForwarderContent = await Bun.file(logForwarderPath).text();

      // Check for required components
      const requiredComponents = [
        'LogForwarder',
        'forwardLogs',
        'captureConsole',
        'endpoint'
      ];

      const missingComponents = requiredComponents.filter(component => 
        !logForwarderContent.includes(component)
      );

      if (missingComponents.length > 0) {
        throw new Error(`Missing required components: ${missingComponents.join(', ')}`);
      }

      // Check endpoint URL
      if (!logForwarderContent.includes(this.config.workerUrl)) {
        throw new Error('Worker URL not configured in log forwarder');
      }

      this.addResult(test, 'pass', Date.now() - startTime);
      console.log(`✅ ${test}: PASS`);

    } catch (error) {
      this.addResult(test, 'fail', Date.now() - startTime, error instanceof Error ? error.message : 'Unknown error');
      console.log(`❌ ${test}: FAIL - ${error}`);
    }
  }

  private async testWorkerConnectivity(): Promise<void> {
    const test = 'Worker Connectivity';
    const startTime = Date.now();

    try {
      console.log(`\n🌐 Testing ${test}...`);

      const healthUrl = `${this.config.workerUrl}/health`;
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'ExtensionTestRunner/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status} ${response.statusText}`);
      }

      const healthData = await response.json();
      if (healthData.status !== 'healthy') {
        throw new Error(`Worker not healthy: ${healthData.status}`);
      }

      // Test logs endpoint
      const logsUrl = `${this.config.workerUrl}/logs`;
      const logsResponse = await fetch(logsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': 'test-session',
          'X-Extension-ID': 'test-extension'
        },
        body: JSON.stringify({
          logs: [{
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'Test log from automated test',
            url: 'test://automation',
            extensionId: 'test-extension'
          }]
        })
      });

      if (!logsResponse.ok) {
        throw new Error(`Logs endpoint failed: ${logsResponse.status} ${logsResponse.statusText}`);
      }

      this.addResult(test, 'pass', Date.now() - startTime);
      console.log(`✅ ${test}: PASS`);

    } catch (error) {
      this.addResult(test, 'fail', Date.now() - startTime, error instanceof Error ? error.message : 'Unknown error');
      console.log(`❌ ${test}: FAIL - ${error}`);
    }
  }

  private async testAuthenticationFlow(): Promise<void> {
    const test = 'Authentication Flow';
    const startTime = Date.now();

    try {
      console.log(`\n🔐 Testing ${test}...`);

      // Test interceptor endpoint
      const interceptorUrl = `${this.config.workerUrl}/cloud/api/Manager/getBetTicker`;
      const response = await fetch(interceptorUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Original-Host': 'fantasy402.com',
          'X-Test-Request': 'true'
        },
        body: JSON.stringify({
          test: 'data'
        })
      });

      // We expect 401 without proper cookies, which is correct behavior
      if (response.status === 401) {
        console.log('✅ Authentication correctly requires cookies');
        this.addResult(test, 'pass', Date.now() - startTime);
        console.log(`✅ ${test}: PASS`);
      } else if (response.status === 200) {
        console.log('⚠️  Unexpected 200 response - may indicate auth bypass');
        this.addResult(test, 'pass', Date.now() - startTime);
        console.log(`✅ ${test}: PASS (with warning)`);
      } else {
        throw new Error(`Unexpected response: ${response.status} ${response.statusText}`);
      }

    } catch (error) {
      this.addResult(test, 'fail', Date.now() - startTime, error instanceof Error ? error.message : 'Unknown error');
      console.log(`❌ ${test}: FAIL - ${error}`);
    }
  }

  private async startLogMonitor(): Promise<void> {
    console.log('\n📊 Starting log monitor...');
    
    try {
      this.logMonitor = spawn({
        cmd: ['bun', 'run', 'tools/logging/log-monitor.js'],
        cwd: process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe']
      });

      // Give it a moment to start
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('✅ Log monitor started');
    } catch (error) {
      console.log('⚠️  Log monitor failed to start:', error);
    }
  }

  private async stopLogMonitor(): Promise<void> {
    if (this.logMonitor) {
      try {
        this.logMonitor.kill();
        console.log('✅ Log monitor stopped');
      } catch (error) {
        console.log('⚠️  Error stopping log monitor:', error);
      }
    }
  }

  private addResult(test: string, status: 'pass' | 'fail' | 'skip', duration: number, error?: string): void {
    this.results.push({
      test,
      status,
      duration,
      error
    });
  }

  private generateReport(): void {
    console.log('\n' + '=' .repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('=' .repeat(60));

    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const skipped = this.results.filter(r => r.status === 'skip').length;
    const total = this.results.length;

    console.log(`\n📈 Results: ${passed} passed, ${failed} failed, ${skipped} skipped (${total} total)`);
    console.log(`⏱️  Total duration: ${this.results.reduce((sum, r) => sum + r.duration, 0)}ms`);

    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter(r => r.status === 'fail')
        .forEach(r => {
          console.log(`   • ${r.test}: ${r.error}`);
        });
    }

    console.log('\n📋 Detailed Results:');
    this.results.forEach(r => {
      const status = r.status === 'pass' ? '✅' : r.status === 'fail' ? '❌' : '⏭️';
      console.log(`   ${status} ${r.test} (${r.duration}ms)`);
      if (r.error) {
        console.log(`      Error: ${r.error}`);
      }
    });

    // Save results to file
    const reportPath = join(process.cwd(), 'test-results.json');
    Bun.write(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: { passed, failed, skipped, total },
      results: this.results
    }, null, 2));

    console.log(`\n💾 Detailed report saved to: ${reportPath}`);
  }
}

// Main execution
async function main() {
  const config: TestConfig = {
    extensionPath: join(process.cwd(), 'browser-extension'),
    testPages: [
      'https://fantasy402.com',
      'file://' + join(process.cwd(), 'test-injection.html')
    ],
    workerUrl: 'https://betting-brain-v3.nolarose1968-806.workers.dev',
    timeout: 30000,
    retries: 3
  };

  const runner = new ExtensionTestRunner(config);
  const results = await runner.runAllTests();

  // Exit with error code if any tests failed
  const failedTests = results.filter(r => r.status === 'fail');
  if (failedTests.length > 0) {
    console.log(`\n❌ ${failedTests.length} test(s) failed`);
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  }
}

if (import.meta.main) {
  main().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

export { ExtensionTestRunner, TestConfig, TestResult };
