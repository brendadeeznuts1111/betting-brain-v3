import { describe, test, expect } from 'bun:test';
import {
    rollupRisk,
    detectSteam,
    exposureMatrix,
    customerRecency,
    generateAnalyticsRollup,
    type BetData
} from '../../src/utils/analytics-rollups';

describe('Analytics Rollup Functions', () => {
    const now = new Date();
    const recentTime = new Date(now.getTime() - 30000).toISOString(); // 30 seconds ago

    const sampleBets: BetData[] = [
        {
            agentId: 'agent1',
            customerId: 'customer1',
            gameId: 'game1',
            stake: 100,
            odds: 1.5,
            side: 'home',
            timestamp: recentTime,
            oldLine: -3.5,
            newLine: -4.0
        },
        {
            agentId: 'agent1',
            customerId: 'customer2',
            gameId: 'game1',
            stake: 200,
            odds: 2.0,
            side: 'away',
            timestamp: recentTime,
            oldLine: -3.5,
            newLine: -4.0
        },
        {
            agentId: 'agent2',
            customerId: 'customer3',
            gameId: 'game2',
            stake: 50,
            odds: 1.8,
            side: 'home',
            timestamp: recentTime,
            oldLine: 7.5,
            newLine: 6.5 // Steam move: 1 point change
        }
    ];

    test('rollupRisk should calculate total risk by agent', () => {
        const result = rollupRisk(sampleBets);

        expect(result).toEqual({
            'agent1': 550, // (100 * 1.5) + (200 * 2.0) = 150 + 400 = 550
            'agent2': 90   // (50 * 1.8) = 90
        });
    });

    test('detectSteam should find line movements ≥ 1 point in ≤ 60 seconds', () => {
        const result = detectSteam(sampleBets);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
            gameId: 'game2',
            oldLine: 7.5,
            newLine: 6.5,
            seconds: expect.any(Number)
        });
    });

    test('exposureMatrix should calculate exposure by side for each game', () => {
        const result = exposureMatrix(sampleBets);

        expect(result).toEqual({
            'game1': {
                home: 150, // 100 * 1.5
                away: 400  // 200 * 2.0
            },
            'game2': {
                home: 90,  // 50 * 1.8
                away: 0
            }
        });
    });

    test('customerRecency should track last bet timestamp per customer', () => {
        const result = customerRecency(sampleBets);

        expect(result).toEqual({
            'customer1': recentTime,
            'customer2': recentTime,
            'customer3': recentTime
        });
    });

    test('generateAnalyticsRollup should create complete analytics object', () => {
        const result = generateAnalyticsRollup(sampleBets);

        expect(result).toHaveProperty('riskByAgent');
        expect(result).toHaveProperty('steamAlerts');
        expect(result).toHaveProperty('exposureBySide');
        expect(result).toHaveProperty('custRecency');

        expect(result.riskByAgent).toEqual({
            'agent1': 550,
            'agent2': 90
        });

        expect(result.steamAlerts).toHaveLength(1);
        expect(result.exposureBySide).toHaveProperty('game1');
        expect(result.exposureBySide).toHaveProperty('game2');
        expect(result.custRecency).toHaveProperty('customer1');
        expect(result.custRecency).toHaveProperty('customer2');
        expect(result.custRecency).toHaveProperty('customer3');
    });

    test('should handle empty bet arrays', () => {
        const emptyBets: BetData[] = [];

        expect(rollupRisk(emptyBets)).toEqual({});
        expect(detectSteam(emptyBets)).toEqual([]);
        expect(exposureMatrix(emptyBets)).toEqual({});
        expect(customerRecency(emptyBets)).toEqual({});

        const emptyRollup = generateAnalyticsRollup(emptyBets);
        expect(emptyRollup.riskByAgent).toEqual({});
        expect(emptyRollup.steamAlerts).toEqual([]);
        expect(emptyRollup.exposureBySide).toEqual({});
        expect(emptyRollup.custRecency).toEqual({});
    });

    test('should handle bets with missing data gracefully', () => {
        const incompleteBets: BetData[] = [
            { agentId: 'agent1' }, // Missing most fields
            { agentId: 'agent2', stake: 100, odds: 1.5 }, // Missing side
            { agentId: 'agent3', stake: 50, odds: 2.0, side: 'home' } // Complete
        ];

        const result = generateAnalyticsRollup(incompleteBets);

        expect(result.riskByAgent).toEqual({
            'agent2': 150, // 100 * 1.5
            'agent3': 100  // 50 * 2.0
        });
        expect(result.steamAlerts).toEqual([]);
        expect(result.exposureBySide).toEqual({});
        expect(result.custRecency).toEqual({});
    });
});
