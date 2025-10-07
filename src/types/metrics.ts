/**
 * Core metrics types for betting intelligence
 * Based on industry-standard betting metrics
 */

export interface CLVMetrics {
  customerId: string;
  lifetimeValue: number;
  winRate: number;
  actionCount: number;
  netBet: number;
  lastUpdated: string;
  alertThreshold: number; // -2%
}

export interface HoldMetrics {
  eventId: string;
  marketType: string;
  holdPercentage: number;
  totalVolume: number;
  totalRisk: number;
  lastUpdated: string;
  alertThreshold: { min: number; max: number }; // 4% - 8%
}

export interface ExposureMetrics {
  eventId: string;
  sides: Array<{
    side: 'HOME' | 'AWAY';
    risk: number;
    net: number;
    percentage: number;
  }>;
  totalRisk: number;
  maxExposure: number;
  lastUpdated: string;
  alertThreshold: { maxAmount: number; maxPercentage: number }; // $50k, 60%
}

export interface SharpScoreMetrics {
  customerId: string;
  sharpScore: number;
  clv: number;
  winRate: number;
  actionCount: number;
  lastUpdated: string;
  alertThreshold: number; // 60
}

export interface SteamMoveMetrics {
  eventId: string;
  marketType: string;
  lineChange: number;
  volumeChange: number;
  sigma: number;
  timestamp: string;
  isSteamMove: boolean;
  alertThreshold: { sigma: number; timeWindow: number }; // 3σ in 60s
}

// Aggregated metrics for dashboard
export interface DashboardMetrics {
  clv: {
    total: number;
    average: number;
    alertCount: number;
    lastUpdated: string;
  };
  hold: {
    average: number;
    alertCount: number;
    lastUpdated: string;
  };
  exposure: {
    totalRisk: number;
    maxExposure: number;
    alertCount: number;
    lastUpdated: string;
  };
  sharp: {
    topPerformers: SharpScoreMetrics[];
    alertCount: number;
    lastUpdated: string;
  };
  steam: {
    recentMoves: SteamMoveMetrics[];
    alertCount: number;
    lastUpdated: string;
  };
}

// Alert types
export interface Alert {
  id: string;
  type: 'CLV' | 'HOLD' | 'EXPOSURE' | 'SHARP' | 'STEAM';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  value: number;
  threshold: number;
  timestamp: string;
  eventId?: string;
  customerId?: string;
}

// Cost cap metrics
export interface CostCapMetrics {
  requests: {
    current: number;
    limit: number;
    percentage: number;
  };
  d1: {
    size: number;
    rows: number;
    limit: { size: number; rows: number };
    percentage: number;
  };
  queue: {
    operations: number;
    limit: number;
    percentage: number;
  };
  analytics: {
    points: number;
    limit: number;
    percentage: number;
  };
}
