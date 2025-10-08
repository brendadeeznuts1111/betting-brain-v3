#!/usr/bin/env bun
/**
 * Health Ping Script
 *
 * This script performs health checks on the deployed worker
 * and sends alerts to Slack if anything is down.
 *
 * Purpose:
 * - Check worker /health endpoint
 * - Verify response time and status
 * - Send Slack notification on failure
 * - Can run in CI or scheduled workflows
 *
 * Usage:
 *   bun run scripts/health-ping.ts
 *   bun run health:ping
 *
 * Environment:
 *   WORKER_URL - Worker URL to check (default: from wrangler.toml)
 *   SLACK_WEBHOOK - Slack webhook URL for notifications
 *   HEALTH_TIMEOUT - Request timeout in ms (default: 10000)
 *
 * Exit codes:
 *   0 - All health checks passed
 *   1 - Health check failed or error
 */

interface HealthResponse {
  status: string;
  timestamp: number;
  version?: string;
  uptime?: number;
  [key: string]: any;
}

interface HealthCheckResult {
  success: boolean;
  url: string;
  status?: number;
  responseTime: number;
  health?: HealthResponse;
  error?: string;
}

/**
 * Get worker URL from environment or wrangler.toml
 */
async function getWorkerUrl(): Promise<string> {
  // First try environment variable
  if (process.env.WORKER_URL) {
    return process.env.WORKER_URL;
  }

  // Try to read from wrangler.toml
  try {
    const wranglerPath = 'wrangler.toml';
    const wranglerContent = await Bun.file(wranglerPath).text();

    // Extract name from wrangler.toml
    const nameMatch = wranglerContent.match(/^name\s*=\s*"([^"]+)"/m);
    if (nameMatch) {
      const workerName = nameMatch[1];
      // Construct workers.dev URL
      return `https://${workerName}.workers.dev`;
    }
  } catch {
    // Wrangler.toml not found or unreadable
  }

  throw new Error('WORKER_URL not found. Set WORKER_URL environment variable or configure wrangler.toml');
}

/**
 * Perform health check on worker
 */
async function checkWorkerHealth(url: string, timeout: number = 10000): Promise<HealthCheckResult> {
  const healthUrl = `${url}/health`;
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(healthUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Betting-Brain Health Ping',
      },
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      return {
        success: false,
        url: healthUrl,
        status: response.status,
        responseTime,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    let health: HealthResponse;
    try {
      health = await response.json();
    } catch {
      return {
        success: false,
        url: healthUrl,
        status: response.status,
        responseTime,
        error: 'Invalid JSON response',
      };
    }

    return {
      success: true,
      url: healthUrl,
      status: response.status,
      responseTime,
      health,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    return {
      success: false,
      url: healthUrl,
      responseTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Send Slack notification
 */
async function sendSlackNotification(
  webhookUrl: string,
  result: HealthCheckResult
): Promise<void> {
  const emoji = result.success ? '✅' : '❌';
  const color = result.success ? '#36a64f' : '#ff0000';
  const title = result.success
    ? 'Health Check Passed'
    : 'Health Check Failed';

  const fields: any[] = [
    {
      title: 'URL',
      value: result.url,
      short: false,
    },
    {
      title: 'Status',
      value: result.status ? `HTTP ${result.status}` : 'N/A',
      short: true,
    },
    {
      title: 'Response Time',
      value: `${result.responseTime}ms`,
      short: true,
    },
  ];

  if (result.error) {
    fields.push({
      title: 'Error',
      value: result.error,
      short: false,
    });
  }

  if (result.health) {
    fields.push({
      title: 'Health Status',
      value: result.health.status || 'unknown',
      short: true,
    });

    if (result.health.version) {
      fields.push({
        title: 'Version',
        value: result.health.version,
        short: true,
      });
    }
  }

  const payload = {
    text: `${emoji} ${title}`,
    attachments: [
      {
        color: color,
        title: title,
        fields: fields,
        footer: 'Betting-Brain Health Monitor',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(
        `Failed to send Slack notification: HTTP ${response.status}`
      );
    }
  } catch (error) {
    console.error('Failed to send Slack notification:', error);
  }
}

/**
 * Main health ping function
 */
async function healthPing(): Promise<void> {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                                                               ║');
  console.log('║     🏥 WORKER HEALTH PING 🏥                                  ║');
  console.log('║                                                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');

  // Get configuration
  const workerUrl = await getWorkerUrl();
  const slackWebhook = process.env.SLACK_WEBHOOK;
  const timeout = parseInt(process.env.HEALTH_TIMEOUT || '10000');

  console.log(`🔗 Worker URL: ${workerUrl}`);
  console.log(`⏱️  Timeout: ${timeout}ms`);
  console.log(`📢 Slack notifications: ${slackWebhook ? 'Enabled' : 'Disabled'}`);
  console.log('');

  // Perform health check
  console.log('🔍 Performing health check...');
  const result = await checkWorkerHealth(workerUrl, timeout);
  console.log('');

  // Report result
  if (result.success) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ HEALTH CHECK PASSED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log(`✓ Status: HTTP ${result.status}`);
    console.log(`✓ Response time: ${result.responseTime}ms`);

    if (result.health) {
      console.log(`✓ Health status: ${result.health.status}`);
      if (result.health.version) {
        console.log(`✓ Version: ${result.health.version}`);
      }
      if (result.health.uptime) {
        console.log(`✓ Uptime: ${result.health.uptime}s`);
      }
    }
  } else {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ HEALTH CHECK FAILED');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('');
    console.error(`✗ URL: ${result.url}`);
    if (result.status) {
      console.error(`✗ Status: HTTP ${result.status}`);
    }
    console.error(`✗ Response time: ${result.responseTime}ms`);
    if (result.error) {
      console.error(`✗ Error: ${result.error}`);
    }
  }

  console.log('');

  // Send Slack notification if configured
  if (slackWebhook) {
    console.log('📢 Sending Slack notification...');
    await sendSlackNotification(slackWebhook, result);
    console.log('✓ Slack notification sent');
    console.log('');
  }

  // Exit with appropriate code
  process.exit(result.success ? 0 : 1);
}

/**
 * Main entry point
 */
async function main() {
  try {
    await healthPing();
  } catch (error) {
    console.error('');
    console.error('❌ Health ping failed:', error);
    console.error('');
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  main();
}

export { healthPing, checkWorkerHealth, getWorkerUrl };
