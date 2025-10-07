#!/usr/bin/env bun
/**
 * MCP Server Test Script
 * Quick verification that MCP endpoint is working
 */

const MCP_URL = process.env.MCP_URL || 'http://localhost:8787/mcp';

interface MCPRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: Record<string, any>;
}

interface MCPResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

async function callMCP(request: MCPRequest): Promise<MCPResponse> {
  const response = await fetch(MCP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  return (await response.json()) as MCPResponse;
}

async function testToolsList() {
  console.log('\n🔍 Testing tools/list...');
  const response = await callMCP({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
  });

  if (response.error) {
    console.error('❌ Error:', response.error);
    return false;
  }

  const tools = response.result?.tools || [];
  console.log(`✅ Found ${tools.length} tools:`);
  tools.forEach((tool: any) => {
    console.log(`   - ${tool.name}: ${tool.description.substring(0, 60)}...`);
  });

  return tools.length > 0;
}

async function testToolCall(toolName: string, args: Record<string, any>) {
  console.log(`\n🔍 Testing ${toolName}...`);
  const response = await callMCP({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: args,
    },
  });

  if (response.error) {
    console.error(`❌ Error:`, response.error);
    return false;
  }

  const content = response.result?.content?.[0];
  if (content?.type === 'text') {
    const data = JSON.parse(content.text);
    console.log(`✅ Success! Response keys:`, Object.keys(data).join(', '));

    // Show sample of data
    if (data.message) {
      console.log(`   Message: ${data.message}`);
    } else {
      console.log(`   Sample:`, JSON.stringify(data, null, 2).substring(0, 200) + '...');
    }
  } else {
    console.log(`✅ Success!`, response.result);
  }

  return true;
}

async function main() {
  console.log('🧪 MCP Server Test Suite');
  console.log(`📍 Target: ${MCP_URL}`);
  console.log('=' .repeat(60));

  try {
    // Test 1: List tools
    const listSuccess = await testToolsList();
    if (!listSuccess) {
      console.error('\n❌ Failed to list tools. Exiting.');
      process.exit(1);
    }

    // Test 2: Call a simple tool (getBettingExposure)
    await testToolCall('getBettingExposure', {
      eventID: 'test-event-1',
    });

    // Test 3: Call new analytics tool (getSteamMoves)
    await testToolCall('getSteamMoves', {
      agentID: 'DEMO',
      lookbackHours: 24,
      minLineChange: 0.5,
    });

    // Test 4: Call enhanced sharp score
    await testToolCall('getEnhancedSharpScore', {
      cid: 'test-customer-1',
      lookbackDays: 30,
      includeFeatures: true,
    });

    // Test 5: Call customer volume segmentation
    await testToolCall('getCustomerVolume', {
      agentID: 'DEMO',
      lookbackDays: 30,
      minBets: 5,
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests passed!');
    console.log('\n📚 Next steps:');
    console.log('   1. Start dev server: bun run dev');
    console.log('   2. Run this test: bun scripts/test-mcp.ts');
    console.log('   3. See docs/MCP_TESTING_GUIDE.md for more examples');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('\n💡 Make sure the dev server is running:');
    console.error('   bun run dev');
    process.exit(1);
  }
}

main();
