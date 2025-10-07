#!/usr/bin/env bun
/**
 * SQL Migration Validator
 * 
 * Enforces SQL rules that ast-grep cannot check:
 * 1. agent-circular-ref: No circular references in agent tree
 * 2. position-rowid-off: WITHOUT ROWID on positions table
 * 
 * Run before deployment: bun run scripts/validate-migrations.ts
 */

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

interface ValidationRule {
  id: string;
  name: string;
  pattern: RegExp;
  check: (content: string) => { valid: boolean; message?: string };
}

const rules: ValidationRule[] = [
  {
    id: 'agent-circular-ref',
    name: 'Agent Circular Reference Prevention',
    pattern: /CREATE\s+TABLE\s+agents/i,
    check: (content: string) => {
      const hasTrigger = /CREATE\s+TRIGGER\s+prevent_circular_ref/i.test(content);
      
      if (!hasTrigger && /parent_id/i.test(content)) {
        return {
          valid: false,
          message: 'Agent tree requires circular reference prevention trigger'
        };
      }
      
      return { valid: true };
    }
  },
  {
    id: 'position-rowid-off',
    name: 'Position Table WITHOUT ROWID',
    pattern: /CREATE\s+TABLE\s+positions/i,
    check: (content: string) => {
      const hasWithoutRowid = /WITHOUT\s+ROWID/i.test(content);
      const hasPositionsTable = /CREATE\s+TABLE\s+positions/i.test(content);
      
      if (hasPositionsTable && !hasWithoutRowid) {
        return {
          valid: false,
          message: 'Positions table must use WITHOUT ROWID for performance'
        };
      }
      
      return { valid: true };
    }
  },
  {
    id: 'settlement-unique-constraint',
    name: 'Settlement Idempotency',
    pattern: /CREATE\s+TABLE\s+settlements/i,
    check: (content: string) => {
      const hasSettlementsTable = /CREATE\s+TABLE\s+settlements/i.test(content);
      const hasUniqueConstraint = /UNIQUE\s*\(.*user_id.*market_id.*\)/i.test(content) ||
                                  /PRIMARY\s+KEY\s*\(.*user_id.*market_id.*\)/i.test(content);
      
      if (hasSettlementsTable && !hasUniqueConstraint) {
        return {
          valid: false,
          message: 'Settlements table requires UNIQUE constraint on (user_id, market_id, outcome)'
        };
      }
      
      return { valid: true };
    }
  }
];

async function validateMigrations() {
  console.log('🔍 Validating SQL migrations...\n');
  
  const migrationsDir = join(process.cwd(), 'migrations');
  let files: string[];
  
  try {
    files = await readdir(migrationsDir);
  } catch (error) {
    console.log('⚠️  No migrations directory found - skipping validation');
    process.exit(0);
  }
  
  const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();
  
  if (sqlFiles.length === 0) {
    console.log('✅ No SQL migrations to validate');
    process.exit(0);
  }
  
  let hasErrors = false;
  
  for (const file of sqlFiles) {
    const filePath = join(migrationsDir, file);
    const content = await readFile(filePath, 'utf-8');
    
    console.log(`📄 Checking ${file}...`);
    
    for (const rule of rules) {
      if (rule.pattern.test(content)) {
        const result = rule.check(content);
        
        if (!result.valid) {
          console.error(`   ❌ [${rule.id}] ${rule.message}`);
          hasErrors = true;
        } else {
          console.log(`   ✅ [${rule.id}] ${rule.name}`);
        }
      }
    }
  }
  
  console.log('');
  
  if (hasErrors) {
    console.error('❌ SQL validation failed!\n');
    console.error('Fix the issues above or add them to your migration files.');
    console.error('See docs/REALTIME_MODULES.md for correct patterns.\n');
    process.exit(1);
  }
  
  console.log('✅ All SQL migrations passed validation!\n');
  process.exit(0);
}

// Run validation
validateMigrations().catch(error => {
  console.error('❌ Migration validation error:', error);
  process.exit(1);
});

