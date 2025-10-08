#!/usr/bin/env bun
/**
 * URL Centralization Script
 * 
 * This script centralizes all hardcoded URLs in the codebase
 * by replacing them with references to the shared config.
 * 
 * Usage:
 *   bun run scripts/centralize-urls.ts
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
 * Find all hardcoded URLs in the codebase
 */
function findHardcodedUrls(): URLReplacement[] {
    const replacements: URLReplacement[] = [];

    // Common URL patterns to replace
    const urlPatterns = [
        {
            pattern: /https:\/\/betting-brain-v3\.nolarose1968-806\.workers\.dev/g,
            replacement: 'config.workerUrl',
            description: 'Production worker URL'
        },
        {
            pattern: /https:\/\/betting-brain-v3-staging\.nolarose1968-806\.workers\.dev/g,
            replacement: 'config.workerUrl',
            description: 'Staging worker URL'
        },
        {
            pattern: /http:\/\/localhost:8787/g,
            replacement: 'config.workerUrl',
            description: 'Local development URL'
        }
    ];

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

                for (const urlPattern of urlPatterns) {
                    if (urlPattern.pattern.test(line)) {
                        const newLine = line.replace(urlPattern.pattern, urlPattern.replacement);

                        replacements.push({
                            file: filePath,
                            line: i + 1,
                            oldUrl: line.match(urlPattern.pattern)?.[0] || '',
                            newUrl: urlPattern.replacement,
                            context: line.trim()
                        });
                    }
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
                content = content.replace(replacement.oldUrl, replacement.newUrl);

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
 * Update shared config to include all URLs
 */
function updateSharedConfig(): void {
    const configPath = 'dashboards/shared/config.js';

    if (!existsSync(configPath)) {
        console.log('Creating shared config...');
        writeFileSync(configPath, `/**
 * Centralized Configuration for Betting Brain Platform
 * 
 * This file centralizes all environment-specific URLs and configuration
 * to eliminate hardcoded values across the codebase.
 */

// Environment detection
const isProduction = window.location.hostname.includes('workers.dev');
const isStaging = window.location.hostname.includes('staging');
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Environment-specific configuration
const config = {
  // Worker URLs
  workerUrl: isProduction 
    ? 'https://betting-brain-v3.nolarose1968-806.workers.dev'
    : isStaging 
    ? 'https://betting-brain-v3-staging.nolarose1968-806.workers.dev'
    : 'http://localhost:8787',
    
  // API endpoints
  apiBaseUrl: isProduction 
    ? 'https://betting-brain-v3.nolarose1968-806.workers.dev/api'
    : isStaging 
    ? 'https://betting-brain-v3-staging.nolarose1968-806.workers.dev/api'
    : 'http://localhost:8787/api',
    
  // WebSocket endpoints
  websocketUrl: isProduction 
    ? 'wss://betting-brain-v3.nolarose1968-806.workers.dev/ws'
    : isStaging 
    ? 'wss://betting-brain-v3-staging.nolarose1968-806.workers.dev/ws'
    : 'ws://localhost:8787/ws',
    
  // Logging endpoints
  logEndpoint: isProduction 
    ? 'https://betting-brain-v3.nolarose1968-806.workers.dev/logs'
    : isStaging 
    ? 'https://betting-brain-v3-staging.nolarose1968-806.workers.dev/logs'
    : 'http://localhost:8787/logs',
    
  // Health check endpoints
  healthEndpoint: isProduction 
    ? 'https://betting-brain-v3.nolarose1968-806.workers.dev/health'
    : isStaging 
    ? 'https://betting-brain-v3-staging.nolarose1968-806.workers.dev/health'
    : 'http://localhost:8787/health',
    
  // Interceptor endpoints
  interceptorEndpoint: isProduction 
    ? 'https://betting-brain-v3.nolarose1968-806.workers.dev/interceptor'
    : isStaging 
    ? 'https://betting-brain-v3-staging.nolarose1968-806.workers.dev/interceptor'
    : 'http://localhost:8787/interceptor'
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = config;
} else if (typeof window !== 'undefined') {
  window.CONFIG = config;
}

// Make config available globally
if (typeof globalThis !== 'undefined') {
  globalThis.CONFIG = config;
}
`, 'utf-8');
    } else {
        console.log('Shared config already exists, updating...');
        // Update existing config if needed
    }
}

/**
 * Main execution
 */
function main(): void {
    console.log('🔍 Finding hardcoded URLs...');
    const replacements = findHardcodedUrls();

    console.log(`📊 Found ${replacements.length} URL replacements needed`);

    if (replacements.length === 0) {
        console.log('✅ No hardcoded URLs found!');
        return;
    }

    console.log('📝 Applying URL replacements...');
    applyReplacements(replacements);

    console.log('🔧 Updating shared config...');
    updateSharedConfig();

    console.log('✅ URL centralization complete!');
    console.log(`📊 Processed ${replacements.length} URL replacements`);
}

// Run if called directly
if (import.meta.main) {
    main();
}
