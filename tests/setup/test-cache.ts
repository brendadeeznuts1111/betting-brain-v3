/**
 * Test Cache System - Skip Passing Tests
 * 
 * Caches test results to avoid re-running passing tests
 * unless files have changed or tests are forced to run.
 */

import { existsSync, readFileSync, writeFileSync, statSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

interface TestCacheEntry {
    testName: string;
    passed: boolean;
    timestamp: number;
    fileHash: string;
    duration: number;
    category: string;
}

interface TestCache {
    version: string;
    entries: Record<string, TestCacheEntry>;
    lastCleanup: number;
}

export class TestCache {
    private cacheFile: string;
    private cache: TestCache;
    private maxAge: number = 24 * 60 * 60 * 1000; // 24 hours

    constructor(cacheFile: string = '.test-cache.json') {
        this.cacheFile = join(process.cwd(), cacheFile);
        this.cache = this.loadCache();
    }

    private loadCache(): TestCache {
        if (existsSync(this.cacheFile)) {
            try {
                const data = readFileSync(this.cacheFile, 'utf-8');
                const parsed = JSON.parse(data);

                // Validate cache version
                if (parsed.version === '1.0.0') {
                    return parsed;
                }
            } catch (error) {
                console.warn('⚠️  Failed to load test cache, starting fresh');
            }
        }

        return {
            version: '1.0.0',
            entries: {},
            lastCleanup: Date.now()
        };
    }

    private saveCache(): void {
        try {
            writeFileSync(this.cacheFile, JSON.stringify(this.cache, null, 2));
        } catch (error) {
            console.warn('⚠️  Failed to save test cache');
        }
    }

    private getFileHash(filePath: string): string {
        try {
            const content = readFileSync(filePath, 'utf-8');
            return createHash('md5').update(content).digest('hex');
        } catch {
            return '';
        }
    }

    private isCacheValid(entry: TestCacheEntry, filePath: string): boolean {
        const now = Date.now();
        const age = now - entry.timestamp;

        // Check if cache is too old
        if (age > this.maxAge) {
            return false;
        }

        // Check if file has changed
        const currentHash = this.getFileHash(filePath);
        if (currentHash !== entry.fileHash) {
            return false;
        }

        return true;
    }

    public shouldSkipTest(testName: string, filePath: string): boolean {
        const entry = this.cache.entries[testName];

        if (!entry) {
            return false; // No cache entry, run the test
        }

        if (!entry.passed) {
            return false; // Test failed before, run it again
        }

        if (!this.isCacheValid(entry, filePath)) {
            return false; // Cache invalid, run the test
        }

        return true; // Skip the test
    }

    public recordTestResult(
        testName: string,
        filePath: string,
        passed: boolean,
        duration: number,
        category: string = 'unit'
    ): void {
        const fileHash = this.getFileHash(filePath);

        this.cache.entries[testName] = {
            testName,
            passed,
            timestamp: Date.now(),
            fileHash,
            duration,
            category
        };

        this.saveCache();
    }

    public getTestStats(): {
        total: number;
        passed: number;
        failed: number;
        skipped: number;
        avgDuration: number;
    } {
        const entries = Object.values(this.cache.entries);

        return {
            total: entries.length,
            passed: entries.filter(e => e.passed).length,
            failed: entries.filter(e => !e.passed).length,
            skipped: 0, // This would be calculated by the runner
            avgDuration: entries.reduce((sum, e) => sum + e.duration, 0) / entries.length || 0
        };
    }

    public cleanup(): void {
        const now = Date.now();
        const entries = Object.entries(this.cache.entries);

        // Remove old entries
        const validEntries = entries.filter(([_, entry]) => {
            const age = now - entry.timestamp;
            return age <= this.maxAge;
        });

        this.cache.entries = Object.fromEntries(validEntries);
        this.cache.lastCleanup = now;

        this.saveCache();
    }

    public clear(): void {
        this.cache.entries = {};
        this.cache.lastCleanup = Date.now();
        this.saveCache();
    }

    public getCacheInfo(): {
        file: string;
        size: number;
        entries: number;
        lastCleanup: string;
    } {
        const stats = existsSync(this.cacheFile) ? statSync(this.cacheFile) : null;

        return {
            file: this.cacheFile,
            size: stats?.size || 0,
            entries: Object.keys(this.cache.entries).length,
            lastCleanup: new Date(this.cache.lastCleanup).toISOString()
        };
    }
}

// Global cache instance
export const testCache = new TestCache();
