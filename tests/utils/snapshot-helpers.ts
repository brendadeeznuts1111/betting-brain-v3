/**
 * Snapshot Testing Utilities
 * 
 * Provides snapshot testing capabilities for API responses and complex objects
 * without relying on Jest infrastructure. Creates human-readable text snapshots.
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync, statSync, readdirSync } from 'fs';
import { join } from 'path';

export interface SnapshotOptions {
    normalize?: boolean;
    sortKeys?: boolean;
    excludeFields?: Record<string, any>;
}

export interface SnapshotResult {
    passed: boolean;
    snapshotPath: string;
    expected?: string;
    actual?: string;
    diff?: string;
    created?: boolean; // True when snapshot is created (first run)
}

/**
 * Creates a snapshot file for a given value
 */
export function createSnapshot(
    testFile: string,
    name: string,
    value: any,
    options?: SnapshotOptions
): string {
    const snapshotDir = getSnapshotDir(testFile);
    const snapshotPath = join(snapshotDir, `${name}.snap`);

    // Normalize the value if requested
    const normalizedValue = options?.normalize ? normalizeValue(value, options) : value;
    const serializedValue = serializeSnapshot(normalizedValue);

    // Create snapshot file
    writeFileSync(snapshotPath, serializedValue, 'utf8');

    return snapshotPath;
}

/**
 * Compares a value against an existing snapshot
 */
export function toMatchSnapshot(
    testFile: string,
    name: string,
    value: any,
    options?: SnapshotOptions
): SnapshotResult {
    const snapshotDir = getSnapshotDir(testFile);
    const snapshotPath = join(snapshotDir, `${name}.snap`);

    // Normalize the value if requested
    const normalizedValue = options?.normalize ? normalizeValue(value, options) : value;
    const serializedValue = serializeSnapshot(normalizedValue);

    // Check if snapshot exists
    if (!existsSync(snapshotPath)) {
        createSnapshot(testFile, name, value, options);
        return {
            passed: false,
            snapshotPath,
            actual: serializedValue,
            diff: 'Snapshot created - first run',
            created: true
        };
    }

    // Load existing snapshot
    const expectedValue = readFileSync(snapshotPath, 'utf8');

    // Compare values
    const passed = serializedValue === expectedValue;

    if (!passed) {
        const diff = generateDiff(expectedValue, serializedValue);
        return {
            passed: false,
            snapshotPath,
            expected: expectedValue,
            actual: serializedValue,
            diff
        };
    }

    return {
        passed: true,
        snapshotPath,
        expected: expectedValue
    };
}

/**
 * Gets the snapshot directory for a test file
 */
function getSnapshotDir(testFile: string): string {
    const testDir = testFile.replace(/\.test\.ts$/, '');
    const snapshotDir = join(testDir, '__snapshots__');

    if (!existsSync(snapshotDir)) {
        mkdirSync(snapshotDir, { recursive: true });
    }

    return snapshotDir;
}

/**
 * Normalizes a value for snapshot testing
 */
function normalizeValue(value: any, options: SnapshotOptions = {}): any {
    if (value === null || value === undefined) {
        return value;
    }

    // Normalize dates to ISO strings
    if (value instanceof Date) {
        return value.toISOString();
    }

    // Normalize arrays
    if (Array.isArray(value)) {
        return value.map(item => normalizeValue(item, options));
    }

    // Normalize objects
    if (typeof value === 'object') {
        const normalized: any = {};

        Object.keys(value)
            .sort(options.sortKeys ? undefined : (a, b) => a.localeCompare(b))
            .forEach(key => {
                // Skip excluded fields
                if (options.excludeFields?.[key] !== undefined) {
                    return;
                }

                normalized[key] = normalizeValue(value[key], options);
            });

        return normalized;
    }

    // Normalize functions
    if (typeof value === 'function') {
        return '[Function]';
    }

    // Normalize regex
    if (value instanceof RegExp) {
        return value.toString();
    }

    return value;
}

/**
 * Serializes a value for snapshot output
 */
function serializeSnapshot(value: any): string {
    return JSON.stringify(value, null, 2);
}

/**
 * Generates a human-readable diff
 */
function generateDiff(expected: string, actual: string): string {
    const expectedLines = expected.split('\n');
    const actualLines = actual.split('\n');

    const diffLines: string[] = [];
    const maxLines = Math.max(expectedLines.length, actualLines.length);

    for (let i = 0; i < maxLines; i++) {
        const expectedLine = expectedLines[i] || '';
        const actualLine = actualLines[i] || '';

        if (expectedLine === actualLine) {
            diffLines.push(`   ${expectedLine}`);
        } else {
            if (expectedLines[i] !== undefined) {
                diffLines.push(`-${expectedLine}`);
            }
            if (actualLines[i] !== undefined) {
                diffLines.push(`+${actualLine}`);
            }
        }
    }

    return diffLines.join('\n');
}

/**
 * Cleans up snapshots for a test file
 */
export function cleanupSnapshots(testFile: string): void {
    const testDir = testFile.replace(/\.test\.ts$/, '');
    const snapshotDir = join(testDir, '__snapshots__');

    if (existsSync(snapshotDir)) {
        const files = readdirSync(snapshotDir);
        files.forEach(file => {
            if (file.endsWith('.snap')) {
                unlinkSync(join(snapshotDir, file));
            }
        });

        // Remove directory if empty
        if (readdirSync(snapshotDir).length === 0) {
            rmdirSync(snapshotDir);
        }
    }
}

/**
 * Lists all snapshot files
 */
export function listSnapshots(): Array<{ testFile: string; name: string; path: string }> {
    const snapshots: Array<{ testFile: string; name: string; path: string }> = [];

    const testDirs = ['tests/unit', 'tests/integration'];

    for (const testDir of testDirs) {
        if (existsSync(testDir)) {
            const entries = readdirSync(testDir, { withFileTypes: true });

            for (const entry of entries) {
                if (entry.isDirectory() && entry.name.endsWith('__snapshots__')) {
                    const testFile = `${testDir}/${entry.name.replace('__snapshots__', '')}.test.ts`;
                    const snapshotDir = `${testDir}/${entry.name}`;

                    if (existsSync(snapshotDir)) {
                        const snapshotFiles = readdirSync(snapshotDir);

                        for (const snapshotFile of snapshotFiles) {
                            if (snapshotFile.endsWith('.snap')) {
                                const name = snapshotFile.replace('.snap', '');
                                snapshots.push({
                                    testFile,
                                    name,
                                    path: `${snapshotDir}/${snapshotFile}`
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    return snapshots;
}

// Node.js fs utilities
function rmdirSync(path: string): void {
    const fs = require('fs');
    fs.rmdirSync(path);
}

function unlinkSync(path: string): void {
    const fs = require('fs');
    fs.unlinkSync(path);
}

/**
 * Common snapshot options for API responses
 */
export const API_SNAPSHOT_OPTIONS: SnapshotOptions = {
    normalize: true,
    sortKeys: true,
    excludeFields: {
        requestId: true,
        timestamp: true,
        duration: true
    }
};

/**
 * Common snapshot options for database results
 */
export const DATABASE_SNAPSHOT_OPTIONS: SnapshotOptions = {
    normalize: true,
    sortKeys: true,
    excludeFields: {
        created_at: true,
        updated_at: true,
        id: true
    }
};

/**
 * Snapshot assertion for test files
 */
export function expect(value: any): SnapshotAssertion {
    return new SnapshotAssertion(value);
}

export class SnapshotAssertion {
    constructor(private actual: any) { }

    toMatchSnapshot(snapshotName: string, options?: SnapshotOptions): SnapshotResult {
        // Get the test file path from the call stack
        const testFile = getCallerTestFile();
        return toMatchSnapshot(testFile, snapshotName, this.actual, options);
    }
}

function getCallerTestFile(): string {
    const stack = new Error().stack;
    if (!stack) return 'unknown.test.ts';

    const lines = stack.split('\n');
    // Find the test file in the stack (skip first few lines)
    for (let i = 3; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('.test.ts')) {
            const match = line.match(/(.*\.test\.ts)/);
            if (match) {
                return match[1];
            }
        }
    }

    return 'unknown.test.ts';
}
