#!/usr/bin/env bun
// Documentation Generator - Embeds live code snippets into markdown
// Uses markdown-magic to inject TypeScript signatures + examples

import { globSync } from 'glob';
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

interface FunctionDoc {
  name: string;
  file: string;
  line: number;
  signature: string;
  comment: string;
  example: string;
}

// Extract function documentation from TypeScript file
function extractFunctionDocs(filePath: string): FunctionDoc[] {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const docs: FunctionDoc[] = [];

  let currentComment = '';
  let currentExample = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Collect JSDoc comments
    if (line.trim().startsWith('/**') || line.trim().startsWith('*')) {
      currentComment += line.trim().replace(/^\/?\*+\s?/, '').replace(/\*\/$/, '') + '\n';

      // Extract examples from comments
      if (line.includes('@example')) {
        const exampleLines = [];
        let j = i + 1;
        while (j < lines.length && lines[j].trim().startsWith('*')) {
          const exampleLine = lines[j].trim().replace(/^\*\s?/, '');
          if (exampleLine && !exampleLine.startsWith('*/')) {
            exampleLines.push(exampleLine);
          }
          j++;
        }
        currentExample = exampleLines.join('\n');
      }
    }

    // Match function declarations
    const funcMatch = line.match(/^export\s+(async\s+)?function\s+(\w+)/);
    if (funcMatch) {
      const funcName = funcMatch[2];

      // Get full signature (may span multiple lines)
      let signature = line.trim();
      let j = i + 1;
      while (j < lines.length && !lines[j].includes('{')) {
        signature += ' ' + lines[j].trim();
        j++;
      }

      docs.push({
        name: funcName,
        file: filePath,
        line: i + 1,
        signature,
        comment: currentComment.trim(),
        example: currentExample.trim()
      });

      currentComment = '';
      currentExample = '';
    }
  }

  return docs;
}

// Generate markdown for function
function generateFunctionMarkdown(doc: FunctionDoc): string {
  let md = `### \`${doc.name}()\`\n\n`;

  if (doc.comment) {
    md += `${doc.comment}\n\n`;
  }

  md += '**Signature:**\n```typescript\n';
  md += doc.signature + '\n';
  md += '```\n\n';

  if (doc.example) {
    md += '**Example:**\n```typescript\n';
    md += doc.example + '\n';
    md += '```\n\n';
  }

  md += `**Source:** [\`${doc.file}:${doc.line}\`](../${doc.file}#L${doc.line})\n\n`;
  md += '---\n\n';

  return md;
}

// Process markdown file with AUTO-GENERATED sections
function processMarkdownFile(mdFile: string): boolean {
  let content = readFileSync(mdFile, 'utf-8');
  let modified = false;

  // Find all AUTO-GENERATED sections
  const regex = /<!-- AUTO-GENERATED-START (.*?) -->(.*?)<!-- AUTO-GENERATED-END -->/gs;
  const matches = Array.from(content.matchAll(regex));

  matches.forEach(match => {
    const sourceFile = match[1].trim();
    const oldContent = match[2];

    // Extract function name if specified (e.g., src/file.ts#functionName)
    const [file, funcName] = sourceFile.split('#');

    if (!file.endsWith('.ts')) return;

    try {
      const docs = extractFunctionDocs(file);
      const filteredDocs = funcName
        ? docs.filter(d => d.name === funcName)
        : docs;

      if (filteredDocs.length === 0) return;

      const newContent = '\n\n' + filteredDocs.map(generateFunctionMarkdown).join('') + '\n';

      if (newContent.trim() !== oldContent.trim()) {
        content = content.replace(match[0], `<!-- AUTO-GENERATED-START ${sourceFile} -->${newContent}<!-- AUTO-GENERATED-END -->`);
        modified = true;
      }
    } catch (error) {
      console.error(`  ❌ Error processing ${sourceFile}:`, error);
    }
  });

  if (modified) {
    writeFileSync(mdFile, content);
  }

  return modified;
}

// Generate API reference from all source files
function generateAPIReference(): void {
  const files = globSync('src/**/*.ts', {
    ignore: ['**/*.test.ts', 'node_modules/**', 'dist/**']
  });

  let apiMd = '# API Reference\n\n';
  apiMd += '*Auto-generated from TypeScript source files*\n\n';
  apiMd += '---\n\n';

  files.forEach(file => {
    const docs = extractFunctionDocs(file);
    if (docs.length === 0) return;

    apiMd += `## \`${file}\`\n\n`;
    docs.forEach(doc => {
      apiMd += generateFunctionMarkdown(doc);
    });
  });

  writeFileSync('docs/api/AUTO_GENERATED_API.md', apiMd);
  console.log('  ✓ docs/api/AUTO_GENERATED_API.md');
}

// Main
console.log('📚 Generating documentation...\n');

const startTime = Date.now();

// Process markdown files with AUTO-GENERATED sections
const mdFiles = globSync('docs/**/*.md', {
  ignore: ['node_modules/**', 'docs/api/AUTO_GENERATED_API.md']
});

let modified = 0;
mdFiles.forEach(file => {
  if (processMarkdownFile(file)) {
    modified++;
    console.log(`  ✓ ${file}`);
  }
});

// Generate full API reference
generateAPIReference();

const buildTime = Date.now() - startTime;

console.log(`\n✅ Documentation generated in ${buildTime}ms`);
console.log(`   📝 Updated ${modified} markdown files`);
console.log(`   📚 Generated API reference`);
