#!/usr/bin/env bun
/**
 * URL Restoration Script
 * 
 * This script restores hardcoded URLs by replacing config.workerUrl placeholders
 * with actual worker URLs based on the environment.
 * 
 * Usage:
 *   bun run scripts/restore-urls.ts
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface URLReplacement {
    file: string;
    line: number;
    oldUrl: string;
    newUrl: string;
    context: string;
}

/**
 * Find all config.workerUrl placeholders in the codebase
 */
function findPlaceholderUrls(): URLReplacement[] {
    const replacements: URLReplacement[] = [];

    // Determine the actual worker URL based on environment
    const workerUrl = process.env.WORKER_URL || 'http://localhost:8787';

    console.log(`🔧 Using worker URL: ${workerUrl}`);

    // Files to process
    const filesToProcess = [
        'browser-extension/background.js',
        'browser-extension/content.js',
        'browser-extension/popup.js',
        'browser-extension/fantasy402-interceptor.js',
        'browser-extension/fantasy402-websocket.js',
        'browser-extension/fantasy402-config-cache.js',
        'browser-extension/log-forwarder.js',
        'tools/logging/log-monitor.js',
        'dashboards/shared/config.js',
        'dashboards/dashboard.html',
        'dashboards/dashboard-enhanced.html',
        'dashboards/dashboard-pro.html',
        'dashboards/dashboard-positions.html',
        'dashboards/dashboard-agent-performance.html',
        'tools/capture-live-data.html',
        'tools/index.html',
        'tools/setup-wizard.html',
        'tools/test-data-filtering.html',
        'tools/flow-tester.html',
        'tools/extension-test-suite.html',
        'tools/test-interceptor-with-auth.html',
        'tools/testing/extension-injection-tester.html',
        'tools/testing/test-extension.html',
        'tools/extension-checker.html',
        'tools/system-health-monitor.html',
        'tools/troubleshooting-guide.html'
    ];

    for (const filePath of filesToProcess) {
        if (!existsSync(filePath)) continue;

        try {
            const content = readFileSync(filePath, 'utf-8');
            const lines = content.split('\n');

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];

                // Look for config.workerUrl patterns
                if (line.includes('config.workerUrl')) {
                    const newLine = line.replace(/config\.workerUrl/g, workerUrl);

                    replacements.push({
                        file: filePath,
                        line: i + 1,
                        oldUrl: 'config.workerUrl',
                        newUrl: workerUrl,
                        context: line.trim()
                    });
                }
            }
        } catch (error) {
            console.error(`Error processing ${filePath}:`, error);
        }
    }

    return replacements;
}

/**
 * Apply URL replacements
 */
function applyReplacements(replacements: URLReplacement[]): void {
    const fileGroups = new Map<string, URLReplacement[]>();

    // Group replacements by file
    for (const replacement of replacements) {
        if (!fileGroups.has(replacement.file)) {
            fileGroups.set(replacement.file, []);
        }
        fileGroups.get(replacement.file)!.push(replacement);
    }

    // Apply replacements to each file
    for (const [filePath, fileReplacements] of fileGroups) {
        try {
            let content = readFileSync(filePath, 'utf-8');
            let modified = false;

            for (const replacement of fileReplacements) {
                const oldContent = content;
                content = content.replace(/config\.workerUrl/g, replacement.newUrl);

                if (content !== oldContent) {
                    modified = true;
                    console.log(`✅ ${filePath}:${replacement.line} - ${replacement.oldUrl} → ${replacement.newUrl}`);
                }
            }

            if (modified) {
                writeFileSync(filePath, content, 'utf-8');
                console.log(`📝 Updated ${filePath}`);
            }
        } catch (error) {
            console.error(`Error updating ${filePath}:`, error);
        }
    }
}

/**
 * Main execution
 */
function main(): void {
    console.log('🔍 Finding config.workerUrl placeholders...');
    const replacements = findPlaceholderUrls();

    console.log(`📊 Found ${replacements.length} URL replacements needed`);

    if (replacements.length === 0) {
        console.log('✅ No config.workerUrl placeholders found!');
        return;
    }

    console.log('📝 Applying URL replacements...');
    applyReplacements(replacements);

    console.log('✅ URL restoration complete!');
    console.log(`📊 Processed ${replacements.length} URL replacements`);
}

// Run if called directly
if (import.meta.main) {
    main();
}
