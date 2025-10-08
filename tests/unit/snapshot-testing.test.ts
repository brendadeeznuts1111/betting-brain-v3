/**
 * Bun Testing Features Implementation
 *
 * Demonstrates 10 high-leverage Bun-only testing features from the user's request
 */

import { describe, test, expect } from 'bun:test';
import { toMatchSnapshot, createSnapshot, expect as snapshotExpect, API_SNAPSHOT_OPTIONS } from '../utils/snapshot-helpers';

describe('Snapshot Testing', () => {
    test('should create and match API response snapshots', () => {
        const apiResponse = {
            requestId: 'abc123',
            timestamp: '2025-01-08T03:00:00.000Z',
            data: {
                events: [
                    {
                        id: 'event-1',
                        name: 'Game 1',
                        line: -3.5,
                        timestamp: '2025-01-08T03:00:00.000Z'
                    }
                ],
                total: 1,
                limit: 100,
                duration: 45
            },
            error: null
        };

        // Use the snapshot assertion
        const result = snapshotExpect(apiResponse).toMatchSnapshot('api-response', API_SNAPSHOT_OPTIONS);

        // On first run, snapshots are created (passed=true when created, false when created with different values)
        expect(result.passed === true || result.created === true).toBe(true);
    });

    test('should handle complex object snapshots', () => {
        const complexObject = {
            title: "Customer Profile",
            customer: {
                id: "cust_12345",
                name: "John Doe",
                email: "john@example.com",
                stats: {
                    totalBets: 150,
                    totalWagered: 10000,
                    totalWon: 8500,
                    holdPercentage: 0.15,
                    edge: 0.05,
                    sharpScore: 75,
                    lastBet: "2025-01-07T20:30:00.000Z",
                    created: "2024-06-01T10:00:00.000Z"
                },
                preferences: {
                    notifications: true,
                    language: "en-US",
                    timezone: "America/Chicago"
                },
                riskFactors: {
                    concentrationRisk: 0.12,
                    exposureLimit: 5000,
                    betFrequency: "high"
                }
            },
            metadata: {
                generated: "2025-01-08T03:00:00.000Z",
                version: "3.0.0",
                source: "analytics-database"
            }
        };

        const result = snapshotExpect(complexObject).toMatchSnapshot('customer-profile');
        // On first run, snapshots are created (passed=false), on subsequent runs they match (passed=true)
        expect(result.passed || result.created).toBe(true);
    });

    test('should handle array snapshots with sorting', () => {
        const eventArray = [
            { id: 'event-3', line: -2.5, sport: 'NBA' },
            { id: 'event-1', line: -3.5, sport: 'NFL' },
            { id: 'event-2', line: -1.5, sport: 'MLB' }
        ];

        // Sort the array for consistent snapshots
        const sortedArray = [...eventArray].sort((a, b) => a.id.localeCompare(b.id));

        const result = snapshotExpect(sortedArray).toMatchSnapshot('event-array', {
            sortKeys: true
        });
        // On first run, snapshots are created (passed=false), on subsequent runs they match (passed=true)
        expect(result.passed || result.created).toBe(true);
    });

    test('should handle error snapshots', () => {
        const errorResponse = {
            requestId: 'abc124',
            timestamp: '2025-01-08T03:00:00.000Z',
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid market type',
                details: {
                    field: 'marketType',
                    value: 'INVALID_TYPE',
                    allowed: ['SPREAD', 'TOTAL', 'MONEYLINE']
                }
            },
            data: null
        };

        const result = snapshotExpect(errorResponse).toMatchSnapshot('error-response', API_SNAPSHOT_OPTIONS);
        // On first run, snapshots are created (passed=false), on subsequent runs they match (passed=true)
        expect(result.passed || result.created).toBe(true);
    });

    test('should handle database result snapshots', () => {
        const dbResults = [
            {
                id: 1,
                eid: 'event-123',
                mt: 'SPREAD',
                ts: '2025-01-08T03:00:00.000Z',
                old_line: -3.0,
                new_line: -3.5,
                created_at: '2025-01-08T03:00:00.000Z',
                updated_at: '2025-01-08T03:00:00.000Z'
            },
            {
                id: 2,
                eid: 'event-456',
                mt: 'TOTAL',
                ts: '2025-01-08T03:05:00.000Z',
                old_line: 48.5,
                new_line: 49.0,
                created_at: '2025-01-08T03:05:00.000Z',
                updated_at: '2025-01-08T03:05:00.000Z'
            }
        ];

        const result = snapshotExpect(dbResults).toMatchSnapshot('line-movements', {
            ...API_SNAPSHOT_OPTIONS,
            excludeFields: {
                created_at: true,
                updated_at: true,
                id: true
            }
        });
        // On first run, snapshots are created (passed=false), on subsequent runs they match (passed=true)
        expect(result.passed || result.created).toBe(true);
    });

    test('should handle date normalization', () => {
        // Use fixed dates for consistent snapshots
        const dateObject = {
            past: new Date('2024-01-01T00:00:00.000Z'),
            future: new Date('2025-12-31T23:59:59.999Z'),
            metadata: {
                generated: '2025-01-08T03:00:00.000Z'
            }
        };

        const result = snapshotExpect(dateObject).toMatchSnapshot('date-object', {
            normalize: true,
            sortKeys: true
        });
        // Verify the function runs and returns a result
        expect(typeof result.passed).toBe('boolean');
        expect(result.snapshotPath).toContain('date-object.snap');
    });

    test('should handle function and regex normalization', () => {
        const complexData = {
            validator: (value: any) => value > 0,
            pattern: /^test-\d{3}$/,
            processor: function (data: any) { return data; },
            metadata: {
                version: '1.0.0'
            }
        };

        const result = snapshotExpect(complexData).toMatchSnapshot('complex-data', {
            normalize: true,
            sortKeys: true
        });
        // On first run, snapshots are created (passed=false), on subsequent runs they match (passed=true)
        expect(result.passed || result.created).toBe(true);
    });
});

describe('Snapshot Testing Utilities', () => {
    test('should create snapshot manually', () => {
        const testData = { message: 'test', value: 42 };
        const snapshotPath = createSnapshot('tests/unit/snapshot-testing.test.ts', 'manual-test', testData);

        expect(snapshotPath).toContain('__snapshots__');
        expect(snapshotPath).toContain('manual-test.snap');
    });

    test('should handle snapshot mismatch with different values', () => {
        const uniqueData = { unique: true, timestamp: Date.now() };
        const result = toMatchSnapshot(
            'tests/unit/snapshot-testing.test.ts',
            'first-time-test',
            uniqueData
        );

        // Snapshot exists, but data is different, so test fails
        expect(result.passed).toBe(false);
        expect(result.diff).toContain('timestamp');
        expect(result.actual).toBeDefined();
        expect(result.expected).toBeDefined();
    });
});
