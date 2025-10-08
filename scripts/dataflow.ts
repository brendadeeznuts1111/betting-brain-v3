#!/usr/bin/env bun
// Data Flow Visualizer - AST + import graph → Mermaid diagram
// Usage: bun scripts/dataflow.ts

import { globSync } from 'glob';
import { readFileSync, writeFileSync } from 'fs';

interface ImportEdge {
  from: string;
  to: string;
}

interface ModuleNode {
  name: string;
  path: string;
  imports: string[];
  exports: string[];
  incomingEdges: number;
  outgoingEdges: number;
}

// Extract imports from TypeScript file
function extractImports(content: string, filePath: string): string[] {
  const imports: string[] = [];
  const importRegex = /import\s+.*\s+from\s+['"](.+)['"]/g;

  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];

    // Resolve relative imports to file paths
    if (importPath.startsWith('.')) {
      const resolved = resolveImport(filePath, importPath);
      imports.push(resolved);
    }
  }

  return imports;
}

// Resolve relative import to absolute path
function resolveImport(fromFile: string, importPath: string): string {
  const parts = fromFile.split('/');
  parts.pop(); // Remove filename

  const importParts = importPath.split('/');
  importParts.forEach(part => {
    if (part === '..') {
      parts.pop();
    } else if (part !== '.') {
      parts.push(part);
    }
  });

  return parts.join('/') + '.ts';
}

// Simplify file path for display
function simplifyPath(path: string): string {
  return path
    .replace('src/', '')
    .replace('.ts', '')
    .replace('/', '_');
}

// Parse import graph
function parseImportGraph(): Map<string, ModuleNode> {
  const files = globSync('src/**/*.ts', {
    ignore: ['node_modules/**', 'dist/**', '**/*.test.ts']
  });

  const nodes = new Map<string, ModuleNode>();

  // First pass: create nodes
  files.forEach(file => {
    const content = readFileSync(file, 'utf-8');
    const imports = extractImports(content, file);

    nodes.set(file, {
      name: simplifyPath(file),
      path: file,
      imports,
      exports: [], // TODO: parse exports
      incomingEdges: 0,
      outgoingEdges: imports.length
    });
  });

  // Second pass: count incoming edges
  nodes.forEach(node => {
    node.imports.forEach(imp => {
      const targetNode = nodes.get(imp);
      if (targetNode) {
        targetNode.incomingEdges++;
      }
    });
  });

  return nodes;
}

// Generate Mermaid diagram
function toMermaid(nodes: Map<string, ModuleNode>): string {
  let diagram = 'flowchart LR\n';

  // Add nodes with styling based on hotness
  nodes.forEach(node => {
    const isHotspot = node.incomingEdges >= 3;
    const style = isHotspot ? ':::hotspot' : '';

    diagram += `  ${node.name}[${node.name}]${style}\n`;
  });

  // Add edges
  const edges = new Set<string>();
  nodes.forEach(node => {
    node.imports.forEach(imp => {
      const targetNode = nodes.get(imp);
      if (targetNode) {
        const edge = `${node.name}-->${targetNode.name}`;
        if (!edges.has(edge)) {
          edges.add(edge);
          diagram += `  ${edge}\n`;
        }
      }
    });
  });

  // Add styling
  diagram += '\n';
  diagram += '  classDef hotspot fill:#ff6b6b,stroke:#c92a2a,color:#fff\n';

  return diagram;
}

// Generate statistics
function generateStats(nodes: Map<string, ModuleNode>): string {
  const hotspots = Array.from(nodes.values())
    .filter(n => n.incomingEdges >= 3)
    .sort((a, b) => b.incomingEdges - a.incomingEdges);

  let stats = '\n📊 Import Graph Statistics:\n';
  stats += `   Total modules: ${nodes.size}\n`;
  stats += `   Total edges: ${Array.from(nodes.values()).reduce((sum, n) => sum + n.outgoingEdges, 0)}\n`;
  stats += `   Hotspots (≥3 incoming): ${hotspots.length}\n\n`;

  if (hotspots.length > 0) {
    stats += '🔥 Top Hotspots:\n';
    hotspots.slice(0, 10).forEach((node, i) => {
      stats += `   ${i + 1}. ${node.path} (${node.incomingEdges} imports)\n`;
    });
  }

  return stats;
}

// Main
console.log('📊 Generating data flow diagram...\n');

const startTime = Date.now();
const nodes = parseImportGraph();
const mermaid = toMermaid(nodes);
const stats = generateStats(nodes);
const buildTime = Date.now() - startTime;

// Write Mermaid diagram to file
const outputFile = 'docs/dataflow.mmd';
writeFileSync(outputFile, mermaid);

console.log(stats);
console.log(`✅ Diagram generated in ${buildTime}ms`);
console.log(`   📄 Saved to: ${outputFile}`);
console.log(`   🔗 View at: http://localhost:8080/floor-control.html#dataflow`);
console.log(`   💡 Or paste into: https://mermaid.live`);
