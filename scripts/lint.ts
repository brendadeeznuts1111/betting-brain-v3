#!/usr/bin/env bun
/**
 * Linting script for the project
 */

import { spawn } from 'bun';
import { glob } from 'bun';
import { join } from 'path';

interface LintResult {
  file: string;
  status: 'pass' | 'fail' | 'skip';
  errors: string[];
  warnings: string[];
}

class Linter {
  private results: LintResult[] = [];

  async runLinting(): Promise<void> {
    console.log('🔍 Starting linting process...');
    console.log('=' .repeat(50));

    // TypeScript files
    await this.lintTypeScriptFiles();
    
    // JavaScript files
    await this.lintJavaScriptFiles();
    
    // JSON files
    await this.lintJsonFiles();
    
    // Generate report
    this.generateReport();
  }

  private async lintTypeScriptFiles(): Promise<void> {
    console.log('\n📝 Linting TypeScript files...');
    
    const tsFiles = await glob('**/*.ts', {
      ignore: ['node_modules/**', 'dist/**', 'coverage/**']
    });

    for (const file of tsFiles) {
      await this.lintFile(file, 'typescript');
    }
  }

  private async lintJavaScriptFiles(): Promise<void> {
    console.log('\n📝 Linting JavaScript files...');
    
    const jsFiles = await glob('**/*.js', {
      ignore: ['node_modules/**', 'dist/**', 'coverage/**']
    });

    for (const file of jsFiles) {
      await this.lintFile(file, 'javascript');
    }
  }

  private async lintJsonFiles(): Promise<void> {
    console.log('\n📝 Linting JSON files...');
    
    const jsonFiles = await glob('**/*.json', {
      ignore: ['node_modules/**', 'dist/**', 'coverage/**']
    });

    for (const file of jsonFiles) {
      await this.lintFile(file, 'json');
    }
  }

  private async lintFile(file: string, type: string): Promise<void> {
    try {
      const result = await this.runLinter(file, type);
      this.results.push(result);
      
      if (result.status === 'pass') {
        console.log(`✅ ${file}`);
      } else if (result.status === 'fail') {
        console.log(`❌ ${file}`);
        result.errors.forEach(error => {
          console.log(`   Error: ${error}`);
        });
      } else {
        console.log(`⏭️  ${file} (skipped)`);
      }
    } catch (error) {
      console.log(`❌ ${file} (linting failed)`);
      this.results.push({
        file,
        status: 'fail',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: []
      });
    }
  }

  private async runLinter(file: string, type: string): Promise<LintResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      switch (type) {
        case 'typescript':
          await this.lintTypeScript(file, errors, warnings);
          break;
        case 'javascript':
          await this.lintJavaScript(file, errors, warnings);
          break;
        case 'json':
          await this.lintJson(file, errors, warnings);
          break;
      }

      return {
        file,
        status: errors.length > 0 ? 'fail' : 'pass',
        errors,
        warnings
      };
    } catch (error) {
      return {
        file,
        status: 'fail',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings
      };
    }
  }

  private async lintTypeScript(file: string, errors: string[], warnings: string[]): Promise<void> {
    // Basic TypeScript linting
    const content = await Bun.file(file).text();
    
    // Check for common issues
    if (content.includes('any')) {
      warnings.push('Use of "any" type detected');
    }
    
    if (content.includes('console.log') && !file.includes('test')) {
      warnings.push('console.log found in non-test file');
    }
    
    if (content.includes('TODO') || content.includes('FIXME')) {
      warnings.push('TODO/FIXME comment found');
    }
  }

  private async lintJavaScript(file: string, errors: string[], warnings: string[]): Promise<void> {
    // Basic JavaScript linting
    const content = await Bun.file(file).text();
    
    // Check for common issues
    if (content.includes('var ')) {
      errors.push('Use "let" or "const" instead of "var"');
    }
    
    if (content.includes('==') && !content.includes('===')) {
      warnings.push('Use strict equality (===) instead of loose equality (==)');
    }
    
    if (content.includes('eval(')) {
      errors.push('eval() usage detected - security risk');
    }
  }

  private async lintJson(file: string, errors: string[], warnings: string[]): Promise<void> {
    try {
      const content = await Bun.file(file).text();
      JSON.parse(content);
    } catch (error) {
      errors.push(`Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private generateReport(): void {
    console.log('\n' + '=' .repeat(50));
    console.log('📊 LINTING REPORT');
    console.log('=' .repeat(50));

    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const skipped = this.results.filter(r => r.status === 'skip').length;
    const total = this.results.length;

    console.log(`\n📈 Results: ${passed} passed, ${failed} failed, ${skipped} skipped (${total} total)`);

    if (failed > 0) {
      console.log('\n❌ Failed Files:');
      this.results
        .filter(r => r.status === 'fail')
        .forEach(r => {
          console.log(`   • ${r.file}`);
          r.errors.forEach(error => {
            console.log(`     Error: ${error}`);
          });
        });
    }

    // Save report
    const reportPath = join(process.cwd(), 'lint-report.json');
    Bun.write(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: { passed, failed, skipped, total },
      results: this.results
    }, null, 2));

    console.log(`\n💾 Detailed report saved to: ${reportPath}`);

    if (failed > 0) {
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const linter = new Linter();
  await linter.runLinting();
}

if (import.meta.main) {
  main().catch(error => {
    console.error('❌ Linting failed:', error);
    process.exit(1);
  });
}

export { Linter };
