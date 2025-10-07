#!/usr/bin/env bun
/**
 * Direct MCP Handler Testing
 * Tests MCP handlers directly without HTTP server
 * Uses local D1 database with test data
 */

import { Database } from 'bun:sqlite';
import type { D1Database } from '@cloudflare/workers-types';

// Import all MCP handlers
import { getSteamMoves } from '../src/mcp/handlers/steamMoves';
import { getRiskConcentration } from '../src/mcp/handlers/riskConcentration';
import { getSharpActivity } from '../src/mcp/handlers/sharpActivity';
import { getTimeSeriesCLV } from '../src/mcp/handlers/timeSeriesCLV';
import { getEnhancedSharpScore } from '../src/mcp/handlers/enhancedSharpScore';
import { getHoldForecast } from '../src/mcp/handlers/holdForecast';
import { getHandleAndHold } from '../src/mcp/handlers/handleAndHold';
import { getCustomerVolume } from '../src/mcp/handlers/customerVolume';
import { getTimeSeriesAnalytics } from '../src/mcp/handlers/timeSeriesAnalytics';

// D1 database path (local wrangler state)
const DB_PATH = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject/01b59b890321a35d03a357938019b4e898a0a4755a7023b476de81b79fabe5c1.sqlite';

interface TestResult {
  tool: string;
  status: 'PASS' | 'FAIL' | 'ERROR';
  duration_ms?: number;
  error?: string;
  data_preview?: string;
  record_count?: number;
}

/**
 * Create a D1-compatible database wrapper from bun:sqlite
 */
function createD1Wrapper(sqliteDb: Database): D1Database {
  return {
    prepare: (query: string) => {
      const stmt = sqliteDb.prepare(query);
      return {
        bind: (...values: any[]) => {
          return {
            first: async <T = unknown>() => {
              try {
                return stmt.get(...values) as T;
              } catch (error) {
                console.error('[D1] first() error:', error);
                throw error;
              }
            },
            all: async <T = unknown>() => {
              try {
                const results = stmt.all(...values);
                return {
                  results: results as T[],
                  success: true,
                  meta: { duration: 0 }
                };
              } catch (error) {
                console.error('[D1] all() error:', error);
                throw error;
              }
            },
            run: async () => {
              try {
                stmt.run(...values);
                return { success: true, meta: { duration: 0 } };
              } catch (error) {
                console.error('[D1] run() error:', error);
                throw error;
              }
            }
          };
        },
        first: async <T = unknown>() => {
          try {
            return stmt.get() as T;
          } catch (error) {
            console.error('[D1] first() (no bind) error:', error);
            throw error;
          }
        },
        all: async <T = unknown>() => {
          try {
            const results = stmt.all();
            return {
              results: results as T[],
              success: true,
              meta: { duration: 0 }
            };
          } catch (error) {
            console.error('[D1] all() (no bind) error:', error);
            throw error;
          }
        },
        run: async () => {
          try {
            stmt.run();
            return { success: true, meta: { duration: 0 } };
          } catch (error) {
            console.error('[D1] run() (no bind) error:', error);
            throw error;
          }
        }
      };
    },
    dump: async () => new ArrayBuffer(0),
    batch: async <T = unknown>(statements: any[]) => [],
    exec: async (query: string) => ({ count: 0, duration: 0 })
  } as any;
}

async function testHandler(
  name: string,
  handler: (args: any, env: any) => Promise<any>,
  args: Record<string, any>
): Promise<TestResult> {
  const startTime = Date.now();

  try {
    // Open SQLite database
    const sqliteDb = new Database(DB_PATH, { readonly: true });

    // Create D1-compatible wrapper
    const d1Wrapper = createD1Wrapper(sqliteDb);

    // Create mock env
    const mockEnv = {
      ANALYTICS: d1Wrapper
    };

    // Call handler
    const result = await handler(args, mockEnv);
    const duration = Date.now() - startTime;

    // Close database
    sqliteDb.close();

    // Parse result
    if (result.isError) {
      return {
        tool: name,
        status: 'FAIL',
        duration_ms: duration,
        error: result.content[0].text
      };
    }

    const data = JSON.parse(result.content[0].text);
    const dataPreview = JSON.stringify(data, null, 2).substring(0, 150);

    // Count records if applicable
    let recordCount: number | undefined;
    if (data.steam_moves) recordCount = data.steam_moves.length;
    else if (data.concentrations) recordCount = data.concentrations.length;
    else if (data.sharp_customers) recordCount = data.sharp_customers.length;
    else if (data.time_series) recordCount = data.time_series.length;
    else if (data.all_customers) recordCount = data.all_customers.length;

    return {
      tool: name,
      status: 'PASS',
      duration_ms: duration,
      data_preview: dataPreview + '...',
      record_count: recordCount
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      tool: name,
      status: 'ERROR',
      duration_ms: duration,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function main() {
  console.log('🧪 MCP Direct Handler Testing');
  console.log('═'.repeat(80));
  console.log(`📂 Database: ${DB_PATH}`);
  console.log('');

  const results: TestResult[] = [];

  // Test Core Handlers
  console.log('📋 Testing Core Handlers (Steam, Risk, Sharp)...');

  results.push(await testHandler(
    'getSteamMoves',
    getSteamMoves,
    { agentID: 'DEMO', lookbackHours: 24, minLineChange: 0.5 }
  ));

  results.push(await testHandler(
    'getRiskConcentration',
    getRiskConcentration,
    { agentID: 'DEMO', groupBy: 'event', topN: 20 }
  ));

  results.push(await testHandler(
    'getSharpActivity',
    getSharpActivity,
    { agentID: 'DEMO', lookbackHours: 24, minSharpScore: 60 }
  ));

  // Test Analytics Handlers
  console.log('📊 Testing Analytics Handlers (CLV, Score, Forecast)...');

  results.push(await testHandler(
    'getTimeSeriesCLV',
    getTimeSeriesCLV,
    { cid: 'sharp-pro-001', lookbackDays: 30, granularity: 'daily' }
  ));

  results.push(await testHandler(
    'getEnhancedSharpScore',
    getEnhancedSharpScore,
    { cid: 'sharp-pro-001', lookbackDays: 30, includeFeatures: true }
  ));

  results.push(await testHandler(
    'getHoldForecast',
    getHoldForecast,
    { lookbackDays: 30, forecastHours: 24, marketType: 'SPREAD' }
  ));

  // Test Remaining Handlers
  console.log('📈 Testing Remaining Handlers (Handle, Volume, Time-Series)...');

  results.push(await testHandler(
    'getHandleAndHold',
    getHandleAndHold,
    { agentID: 'DEMO', lookbackDays: 7, granularity: 'daily' }
  ));

  results.push(await testHandler(
    'getCustomerVolume',
    getCustomerVolume,
    { agentID: 'DEMO', lookbackDays: 30, minBets: 5, segmentBy: 'volume' }
  ));

  results.push(await testHandler(
    'getTimeSeriesAnalytics',
    getTimeSeriesAnalytics,
    { metric: 'volume', lookbackDays: 30, granularity: 'daily' }
  ));

  // Print results
  console.log('');
  console.log('═'.repeat(80));
  console.log('📊 Test Results');
  console.log('═'.repeat(80));
  console.log('');

  // Summary table
  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  const errorCount = results.filter(r => r.status === 'ERROR').length;

  console.table(results.map(r => ({
    Tool: r.tool,
    Status: r.status === 'PASS' ? '✅ PASS' :
            r.status === 'FAIL' ? '❌ FAIL' : '🔥 ERROR',
    'Time (ms)': r.duration_ms,
    Records: r.record_count || '-'
  })));

  console.log('');
  console.log('Summary:');
  console.log(`  ✅ Passed: ${passCount}/9`);
  console.log(`  ❌ Failed: ${failCount}/9`);
  console.log(`  🔥 Errors: ${errorCount}/9`);
  console.log('');

  // Show errors if any
  const failed = results.filter(r => r.status !== 'PASS');
  if (failed.length > 0) {
    console.log('═'.repeat(80));
    console.log('❌ Failures and Errors:');
    console.log('═'.repeat(80));
    console.log('');

    failed.forEach(r => {
      console.log(`${r.tool}:`);
      console.log(`  Status: ${r.status}`);
      console.log(`  Error: ${r.error}`);
      console.log('');
    });
  }

  // Show sample data for passed tests
  const passed = results.filter(r => r.status === 'PASS');
  if (passed.length > 0) {
    console.log('═'.repeat(80));
    console.log('✅ Sample Data (First 3 Passing Tests):');
    console.log('═'.repeat(80));
    console.log('');

    passed.slice(0, 3).forEach(r => {
      console.log(`${r.tool}:`);
      console.log(r.data_preview);
      console.log('');
    });
  }

  // Exit with appropriate code
  process.exit(failCount + errorCount > 0 ? 1 : 0);
}

main();
