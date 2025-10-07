/**
 * Deployment Script
 * Handles blue-green deployment with rollback tagging
 */

import { spawn } from 'child_process';
// Using Bun native file operations (no Node.js fs module)

function exec(command: string, args: string[] = []): Promise<string> {
  return new Promise((resolve, reject) => {
    let output = '';
    const proc = spawn(command, args);
    
    proc.stdout.on('data', (data) => {
      output += data.toString();
      process.stdout.write(data);
    });
    
    proc.stderr.on('data', (data) => {
      process.stderr.write(data);
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });
  });
}

async function main() {
  console.log('🚀 Deploying Betting-Brain v3 to production...\n');
  
  try {
    // Get version from package.json using Bun
    const packageJson = JSON.parse(await Bun.file('package.json').text());
    const version = packageJson.version;
    
    // Get git commit SHA
    const sha = await exec('git', ['rev-parse', '--short', 'HEAD']);
    const commitSha = sha.trim();
    const rollbackTag = `v${version}-${commitSha}`;
    
    console.log(`📦 Version: ${version}`);
    console.log(`🔖 Rollback tag: ${rollbackTag}\n`);
    
    // Step 1: Run tests
    console.log('🧪 Running tests...');
    await exec('npm', ['test']);
    console.log('✅ Tests passed\n');
    
    // Step 2: Build
    console.log('🔨 Building...');
    await exec('npm', ['run', 'build']);
    console.log('✅ Build complete\n');
    
    // Step 3: Apply migrations to production
    console.log('🗄️  Applying migrations to production...');
    await exec('wrangler', ['d1', 'migrations', 'apply', 'betting-analytics', '--env', 'production']);
    console.log('✅ Migrations applied\n');
    
    // Step 4: Deploy to Cloudflare
    console.log('☁️  Deploying to Cloudflare Edge...');
    await exec('wrangler', ['deploy', '--env', 'production']);
    console.log('✅ Deployed to edge\n');
    
    // Step 5: Create git tag for rollback
    console.log('🔖 Creating rollback tag...');
    try {
      await exec('git', ['tag', rollbackTag]);
      await exec('git', ['push', 'origin', rollbackTag]);
      console.log(`✅ Tagged as ${rollbackTag}\n`);
    } catch (error) {
      console.log('⚠️  Could not create git tag (non-fatal)\n');
    }
    
    // Step 6: Display deployment info
    console.log('✨ Deployment complete!\n');
    console.log('📊 Deployment summary:');
    console.log(`   Version: ${version}`);
    console.log(`   Rollback tag: ${rollbackTag}`);
    console.log(`   Environment: production`);
    console.log('\n📚 Resources:');
    console.log('   API: https://betting-brain-v3-prod.your-domain.workers.dev');
    console.log('   Docs: https://betting-brain-v3-prod.your-domain.workers.dev/.redoc');
    console.log('   Dashboard: https://dash.cloudflare.com');
    console.log('\n🔄 Rollback command:');
    console.log(`   npm run rollback ${rollbackTag}`);
    
  } catch (error) {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  }
}

main();
