#!/usr/bin/env bun
/**
 * Code formatting script for the project
 */

import { glob } from 'bun';
import { join } from 'path';

interface FormatResult {
  file: string;
  status: 'formatted' | 'unchanged' | 'error';
  error?: string;
}

class Formatter {
  private results: FormatResult[] = [];

  async runFormatting(): Promise<void> {
    console.log('🎨 Starting code formatting...');
    console.log('=' .repeat(50));

    // Format TypeScript files
    await this.formatTypeScriptFiles();
    
    // Format JavaScript files
    await this.formatJavaScriptFiles();
    
    // Format JSON files
    await this.formatJsonFiles();
    
    // Generate report
    this.generateReport();
  }

  private async formatTypeScriptFiles(): Promise<void> {
    console.log('\n📝 Formatting TypeScript files...');
    
    const tsFiles = await glob('**/*.ts', {
      ignore: ['node_modules/**', 'dist/**', 'coverage/**']
    });

    for (const file of tsFiles) {
      await this.formatFile(file, 'typescript');
    }
  }

  private async formatJavaScriptFiles(): Promise<void> {
    console.log('\n📝 Formatting JavaScript files...');
    
    const jsFiles = await glob('**/*.js', {
      ignore: ['node_modules/**', 'dist/**', 'coverage/**']
    });

    for (const file of jsFiles) {
      await this.formatFile(file, 'javascript');
    }
  }

  private async formatJsonFiles(): Promise<void> {
    console.log('\n📝 Formatting JSON files...');
    
    const jsonFiles = await glob('**/*.json', {
      ignore: ['node_modules/**', 'dist/**', 'coverage/**']
    });

    for (const file of jsonFiles) {
      await this.formatFile(file, 'json');
    }
  }

  private async formatFile(file: string, type: string): Promise<void> {
    try {
      const result = await this.formatFileContent(file, type);
      this.results.push(result);
      
      if (result.status === 'formatted') {
        console.log(`✅ ${file} (formatted)`);
      } else if (result.status === 'unchanged') {
        console.log(`⏭️  ${file} (unchanged)`);
      } else {
        console.log(`❌ ${file} (error: ${result.error})`);
      }
    } catch (error) {
      console.log(`❌ ${file} (formatting failed)`);
      this.results.push({
        file,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async formatFileContent(file: string, type: string): Promise<FormatResult> {
    try {
      const originalContent = await Bun.file(file).text();
      let formattedContent = originalContent;

      switch (type) {
        case 'typescript':
        case 'javascript':
          formattedContent = this.formatJavaScript(originalContent);
          break;
        case 'json':
          formattedContent = this.formatJson(originalContent);
          break;
      }

      if (formattedContent !== originalContent) {
        await Bun.write(file, formattedContent);
        return {
          file,
          status: 'formatted'
        };
      } else {
        return {
          file,
          status: 'unchanged'
        };
      }
    } catch (error) {
      return {
        file,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private formatJavaScript(content: string): string {
    // Basic JavaScript/TypeScript formatting
    let formatted = content;

    // Remove trailing whitespace
    formatted = formatted.replace(/[ \t]+$/gm, '');

    // Ensure consistent line endings
    formatted = formatted.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Add trailing newline if missing
    if (!formatted.endsWith('\n')) {
      formatted += '\n';
    }

    // Basic indentation fixes
    const lines = formatted.split('\n');
    let indentLevel = 0;
    const indentSize = 2;

    const formattedLines = lines.map(line => {
      const trimmed = line.trim();
      
      // Decrease indent for closing braces/brackets
      if (trimmed === '}' || trimmed === ']' || trimmed === ')') {
        indentLevel = Math.max(0, indentLevel - 1);
      }

      // Apply current indent level
      const indented = ' '.repeat(indentLevel * indentSize) + trimmed;

      // Increase indent for opening braces/brackets
      if (trimmed.endsWith('{') || trimmed.endsWith('[') || trimmed.endsWith('(')) {
        indentLevel++;
      }

      return indented;
    });

    return formattedLines.join('\n');
  }

  private formatJson(content: string): string {
    try {
      const parsed = JSON.parse(content);
      return JSON.stringify(parsed, null, 2) + '\n';
    } catch (error) {
      throw new Error(`Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private generateReport(): void {
    console.log('\n' + '=' .repeat(50));
    console.log('📊 FORMATTING REPORT');
    console.log('=' .repeat(50));

    const formatted = this.results.filter(r => r.status === 'formatted').length;
    const unchanged = this.results.filter(r => r.status === 'unchanged').length;
    const errors = this.results.filter(r => r.status === 'error').length;
    const total = this.results.length;

    console.log(`\n📈 Results: ${formatted} formatted, ${unchanged} unchanged, ${errors} errors (${total} total)`);

    if (errors > 0) {
      console.log('\n❌ Files with errors:');
      this.results
        .filter(r => r.status === 'error')
        .forEach(r => {
          console.log(`   • ${r.file}: ${r.error}`);
        });
    }

    // Save report
    const reportPath = join(process.cwd(), 'format-report.json');
    Bun.write(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: { formatted, unchanged, errors, total },
      results: this.results
    }, null, 2));

    console.log(`\n💾 Detailed report saved to: ${reportPath}`);

    if (errors > 0) {
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const formatter = new Formatter();
  await formatter.runFormatting();
}

if (import.meta.main) {
  main().catch(error => {
    console.error('❌ Formatting failed:', error);
    process.exit(1);
  });
}

export { Formatter };
