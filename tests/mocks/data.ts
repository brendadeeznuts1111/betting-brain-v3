/**
 * Shared test data for consistent testing across suites
 */

import type { LineMovement, SteamMoveMetrics, CLVMetrics, HoldMetrics, ExposureMetrics, SharpScoreMetrics } from '../../src/types/database';

export const mockLineMovement: LineMovement = {
  eid: 'nba_123',
  mt: 'SPREAD',
  lb: -110,
  la: -108,
  vb: 10000,
  va: 15000,
  ts: new Date().toISOString()
};

export const mockSignificantLineMovement: LineMovement = {
  eid: 'nba_456',
  mt: 'SPREAD',
  lb: -110,
  la: -100, // 10 point move - significant
  vb: 10000,
  va: 20000, // 100% volume increase - significant
  ts: new Date().toISOString()
};

export const mockSteamMoveMetrics: SteamMoveMetrics = {
  eventId: 'nba_123',
  marketType: 'SPREAD',
  lineChange: 5,
  volumeChange: 15000,
  sigma: 2.5,
  timestamp: new Date().toISOString(),
  isSteamMove: true,
  alertThreshold: { sigma: 3, timeWindow: 60 }
};

export const mockCLVMetrics: CLVMetrics = {
  customerId: 'cust_123',
  lifetimeValue: 1500,
  winRate: 55,
  actionCount: 100,
  netBet: 1500,
  lastUpdated: new Date().toISOString(),
  alertThreshold: -2
};

export const mockHoldMetrics: HoldMetrics = {
  eventId: 'nba_123',
  marketType: 'SPREAD',
  holdPercentage: 5.5,
  totalVolume: 100000,
  totalRisk: 5000,
  lastUpdated: new Date().toISOString(),
  alertThreshold: { min: 4, max: 8 }
};

export const mockExposureMetrics: ExposureMetrics = {
  eventId: 'nba_123',
  sides: [
    { side: 'HOME', risk: 30000, net: -15000, percentage: 60 },
    { side: 'AWAY', risk: 25000, net: 15000, percentage: 40 }
  ],
  totalRisk: 55000,
  maxExposure: 15000,
  lastUpdated: new Date().toISOString(),
  alertThreshold: { maxAmount: 50000, maxPercentage: 60 }
};

export const mockSharpScoreMetrics: SharpScoreMetrics = {
  customerId: 'cust_123',
  sharpScore: 75,
  clv: 1500,
  winRate: 55,
  actionCount: 100,
  lastUpdated: new Date().toISOString(),
  alertThreshold: 60
};

export const mockInvalidData = {
  invalid: 'data',
  missing: 'required fields'
};

export const mockMalformedJSON = '{"invalid": json}';

export const mockQueueMessage = {
  eid: 'nba_123',
  mt: 'SPREAD',
  lb: -110,
  la: -108,
  vb: 10000,
  va: 15000,
  ts: new Date().toISOString()
};
