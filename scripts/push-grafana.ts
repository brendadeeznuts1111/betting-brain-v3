#!/usr/bin/env bun
/**
 * Push Grafana Dashboard via API
 *
 * This script automatically imports the Grafana dashboard configuration
 * to a running Grafana instance via the HTTP API.
 *
 * Usage:
 *   bun run scripts/push-grafana.ts
 *
 * Environment Variables:
 *   GRAFANA_URL - Your Grafana instance URL (required)
 *   GRAFANA_KEY - API key with dashboard write permissions (required)
 *   GRAFANA_FOLDER_ID - Folder ID for dashboard (optional, default: 0/General)
 */

interface GrafanaResponse {
  id?: number;
  slug?: string;
  status?: string;
  uid?: string;
  url?: string;
  version?: number;
  message?: string;
}

/**
 * Read Grafana dashboard configuration
 */
async function readDashboardConfig(): Promise<any> {
  const dashboardPath = 'monitoring/grafana/dashboard.json';

  try {
    const content = await Bun.file(dashboardPath).text();
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to read dashboard file: ${error}`);
  }
}

/**
 * Import dashboard to Grafana
 */
async function importDashboard(
  grafanaUrl: string,
  apiKey: string,
  dashboard: any,
  folderId: number = 0
): Promise<GrafanaResponse> {
  const url = `${grafanaUrl}/api/dashboards/db`;

  const payload = {
    dashboard: dashboard,
    folderId: folderId,
    overwrite: true,
    message: 'Auto-imported from CI/CD'
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    return await response.json();
  } catch (error) {
    throw new Error(`Failed to import dashboard: ${error}`);
  }
}

/**
 * Main push workflow
 */
async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                                                               ║');
  console.log('║     📊 GRAFANA DASHBOARD AUTO-IMPORT 📊                       ║');
  console.log('║                                                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');

  // 1. Check environment variables
  const grafanaUrl = process.env.GRAFANA_URL;
  const apiKey = process.env.GRAFANA_KEY;
  const folderId = parseInt(process.env.GRAFANA_FOLDER_ID || '0');

  if (!grafanaUrl) {
    console.error('❌ Error: GRAFANA_URL environment variable is required');
    console.error('');
    console.error('Set it in your environment or GitHub secrets:');
    console.error('  export GRAFANA_URL=https://your-grafana.com');
    console.error('');
    process.exit(1);
  }

  if (!apiKey) {
    console.error('❌ Error: GRAFANA_KEY environment variable is required');
    console.error('');
    console.error('Create an API key in Grafana:');
    console.error('  1. Go to Configuration → API Keys');
    console.error('  2. Create new key with Editor role');
    console.error('  3. Export as: export GRAFANA_KEY=your-key');
    console.error('');
    process.exit(1);
  }

  console.log(`🔗 Grafana URL: ${grafanaUrl}`);
  console.log(`📂 Folder ID: ${folderId === 0 ? 'General' : folderId}`);
  console.log('');

  try {
    // 2. Read dashboard configuration
    console.log('📖 Reading dashboard configuration...');
    const dashboard = await readDashboardConfig();
    console.log(`   Dashboard: ${dashboard.title || 'Betting-Brain'}`);
    console.log(`   Panels: ${dashboard.panels?.length || 0}`);
    console.log('');

    // 3. Import to Grafana
    console.log('🚀 Importing dashboard to Grafana...');
    const result = await importDashboard(grafanaUrl, apiKey, dashboard, folderId);

    console.log('✅ Dashboard imported successfully!');
    console.log('');

    // 4. Display results
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ IMPORT COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log(`📊 Dashboard ID: ${result.id}`);
    console.log(`🔗 Dashboard Slug: ${result.slug}`);
    console.log(`🆔 Dashboard UID: ${result.uid}`);
    if (result.url) {
      console.log(`🌐 Direct URL: ${grafanaUrl}${result.url}`);
    } else {
      console.log(`🌐 Dashboard URL: ${grafanaUrl}/d/${result.slug}`);
    }
    console.log('');
    console.log('Next steps:');
    console.log('  1. Open dashboard in Grafana');
    console.log('  2. Configure data sources:');
    console.log('     → Cloudflare Analytics Engine');
    console.log('     → Prometheus (Cloudflare Workers)');
    console.log('  3. Map template variables');
    console.log('  4. Verify panels are showing data');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('❌ Import failed:', error);
    console.error('');
    console.error('Troubleshooting:');
    console.error('  • Verify GRAFANA_URL is correct');
    console.error('  • Check API key has Editor permissions');
    console.error('  • Ensure Grafana is accessible');
    console.error('  • Check dashboard JSON is valid');
    console.error('');
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  main();
}

export { readDashboardConfig, importDashboard };
