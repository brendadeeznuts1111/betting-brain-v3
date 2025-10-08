#!/usr/bin/env bun
/**
 * JWT Test Utility
 *
 * Generate test JWTs for local development and testing
 *
 * Usage:
 *   bun run scripts/test-jwt.ts
 *   bun run scripts/test-jwt.ts --secret your-secret --expires 3600
 */

import { createJWT, validateJWT } from '../src/utils/jwt';

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  let secret = process.env.JWT_SECRET || 'test-secret-minimum-32-characters-long';
  let expiresIn = 3600; // 1 hour default

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--secret' && args[i + 1]) {
      secret = args[i + 1];
      i++;
    } else if (args[i] === '--expires' && args[i + 1]) {
      expiresIn = parseInt(args[i + 1]);
      i++;
    }
  }

  if (secret.length < 32) {
    console.error('❌ Error: JWT_SECRET must be at least 32 characters');
    process.exit(1);
  }

  // Create payload
  const payload = {
    sub: 'test-user',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expiresIn,
  };

  // Generate JWT
  const token = await createJWT(payload, secret);

  // Validate JWT
  const isValid = await validateJWT(token, secret);

  // Output
  console.log('\n🔐 JWT Test Utility\n');
  console.log('Secret:', secret.substring(0, 10) + '...');
  console.log('Expires In:', expiresIn, 'seconds');
  console.log('Issued At:', new Date(payload.iat * 1000).toISOString());
  console.log('Expires At:', new Date(payload.exp * 1000).toISOString());
  console.log('\nGenerated JWT:\n');
  console.log(token);
  console.log('\nValidation:', isValid ? '✅ Valid' : '❌ Invalid');
  console.log('\nTest Command:\n');
  console.log(`curl -X POST http://localhost:8787/ingest \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${token}" \\
  -d '{
    "records": [
      {
        "eventId": "test-001",
        "timestamp": "${new Date().toISOString()}",
        "metric": "odds",
        "value": 1.95,
        "metadata": {
          "market": "moneyline",
          "source": "test",
          "volume": 1000
        }
      }
    ]
  }'`);
  console.log('\n');
}

if (import.meta.main) {
  main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
}
