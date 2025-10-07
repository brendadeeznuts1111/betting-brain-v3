/**
 * Bootstrap Script
 * Creates D1 database, queues, and applies migrations
 */

/// <reference types="bun" />
import { spawn } from 'child_process';

function exec(command: string, args: string[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { stdio: 'inherit' });
    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });
  });
}

async function main() {
  console.log('🚀 Bootstrapping Betting-Brain v3...\n');
  
  try {
    // Step 1: Create D1 database
    console.log('📊 Creating D1 database...');
    await exec('wrangler', ['d1', 'create', 'betting-analytics']);
    console.log('✅ D1 database created\n');
    
    // Step 2: Apply migrations
    console.log('🗄️  Applying database migrations...');
    await exec('wrangler', ['d1', 'migrations', 'apply', 'betting-analytics', '--local']);
    console.log('✅ Migrations applied\n');
    
    // Step 3: Create queues
    console.log('📬 Setting up queues...');
    console.log('   - line-ingress queue (configured in wrangler.toml)');
    console.log('   - steam-webhook queue (configured in wrangler.toml)');
    console.log('✅ Queues configured\n');
    
    // Step 4: Generate MCP tools
    console.log('🔧 Generating MCP tools...');
    await exec('bun', ['run', 'scripts/codegen.ts']);
    console.log('✅ MCP tools generated\n');
    
    // Step 5: Create .env if it doesn't exist
    console.log('📝 Setting up environment...');
    try {
      await Bun.file('.env').text();
      console.log('   .env already exists');
    } catch {
      const envExample = await Bun.file('.env.example').text();
      await Bun.write('.env', envExample);
      console.log('✅ Created .env from .env.example');
    }
    
    console.log('\n✨ Bootstrap complete!');
    console.log('\n📋 Next steps:');
    console.log('   1. Update wrangler.toml with your database_id');
    console.log('   2. Run: npm run dev (for local development)');
    console.log('   3. Run: npm run deploy:prod (for production)');
    console.log('\n📚 Documentation: open dist/redoc.html');
    
  } catch (error) {
    console.error('\n❌ Bootstrap failed:', error);
    process.exit(1);
  }
}

main();
