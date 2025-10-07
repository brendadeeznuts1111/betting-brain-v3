/**
 * API request/response types for MCP tools
 * Includes Zod validation schemas
 */

import { z } from 'zod';

// Environment interface for Cloudflare Workers
export interface Env {
  ANALYTICS: D1Database;
  LINE_INGRESS: Queue;
  STEAM_WEBHOOK: Queue;
  ANALYTICS_ENGINE: AnalyticsEngineDataset;
}

// Request schemas
export const GetBettingExposureRequest = z.object({
  eid: z.string().min(1, 'Event ID is required'),
  includeHistory: z.boolean().optional().default(false),
  timeWindow: z.number().min(1).max(24).optional().default(1) // hours
});

export const GetSharpScoreRequest = z.object({
  cid: z.string().min(1, 'Customer ID is required'),
  includeHistory: z.boolean().optional().default(false),
  timeWindow: z.number().min(1).max(168).optional().default(24) // hours
});

export const GetHoldPercentageRequest = z.object({
  eid: z.string().min(1, 'Event ID is required'),
  mt: z.string().min(1, 'Market Type is required'),
  includeHistory: z.boolean().optional().default(false),
  timeWindow: z.number().min(1).max(24).optional().default(1) // hours
});

export const GetCLVRequest = z.object({
  cid: z.string().min(1, 'Customer ID is required'),
  includeHistory: z.boolean().optional().default(false),
  timeWindow: z.number().min(1).max(168).optional().default(24) // hours
});

// Response schemas
export const BettingExposureResponse = z.object({
  eid: z.string(),
  sides: z.array(z.object({
    side: z.enum(['HOME', 'AWAY']),
    risk: z.number(),
    net: z.number(),
    percentage: z.number()
  })),
  totalRisk: z.number(),
  maxExposure: z.number(),
  lastUpdated: z.string(),
  alertThreshold: z.object({
    maxAmount: z.number(),
    maxPercentage: z.number()
  })
});

export const SharpScoreResponse = z.object({
  cid: z.string(),
  sharpScore: z.number(),
  clv: z.number(),
  winRate: z.number(),
  actionCount: z.number(),
  lastUpdated: z.string(),
  alertThreshold: z.number()
});

export const HoldPercentageResponse = z.object({
  eid: z.string(),
  mt: z.string(),
  holdPercentage: z.number(),
  totalVolume: z.number(),
  totalRisk: z.number(),
  lastUpdated: z.string(),
  alertThreshold: z.object({
    min: z.number(),
    max: z.number()
  })
});

export const CLVResponse = z.object({
  cid: z.string(),
  lifetimeValue: z.number(),
  winRate: z.number(),
  actionCount: z.number(),
  netBet: z.number(),
  lastUpdated: z.string(),
  alertThreshold: z.number()
});

// Error response schema
export const ErrorResponse = z.object({
  error: z.string(),
  code: z.string().optional(),
  details: z.record(z.any()).optional(),
  timestamp: z.string()
});

// Type exports
export type GetBettingExposureRequest = z.infer<typeof GetBettingExposureRequest>;
export type GetSharpScoreRequest = z.infer<typeof GetSharpScoreRequest>;
export type GetHoldPercentageRequest = z.infer<typeof GetHoldPercentageRequest>;
export type GetCLVRequest = z.infer<typeof GetCLVRequest>;

export type BettingExposureResponse = z.infer<typeof BettingExposureResponse>;
export type SharpScoreResponse = z.infer<typeof SharpScoreResponse>;
export type HoldPercentageResponse = z.infer<typeof HoldPercentageResponse>;
export type CLVResponse = z.infer<typeof CLVResponse>;
export type ErrorResponse = z.infer<typeof ErrorResponse>;

// API endpoint configuration
export interface APIEndpoint {
  path: string;
  method: 'GET' | 'POST';
  schema: z.ZodSchema;
  handler: (request: Request, env: Env) => Promise<Response>;
  rateLimit: {
    requests: number;
    window: number; // seconds
  };
  costCap: {
    d1Reads: number;
    d1Writes: number;
    queueOperations: number;
  };
}

// Rate limiting configuration
export interface RateLimitConfig {
  requestsPerSecond: number;
  burstLimit: number;
  windowSize: number; // seconds
  keyGenerator: (request: Request) => string;
}

// Cost cap configuration
export interface CostCapConfig {
  d1: {
    maxSize: number; // bytes
    maxRows: number;
    ttlDays: number;
  };
  queue: {
    maxOperationsPerMonth: number;
    maxBatchSize: number;
  };
  analytics: {
    maxPointsPerMonth: number;
    samplingRate: number; // 0.0 - 1.0
  };
  requests: {
    maxPerDay: number;
    hardStop: boolean;
  };
}
