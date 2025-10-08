/**
 * API request/response types for MCP tools
 * Includes Zod validation schemas
 */

import { z } from 'zod';

// Cloudflare Workers types
export interface ExecutionContext {
  passThroughOnException(): void;
  waitUntil(promise: Promise<any>): void;
}

// Environment interface for Cloudflare Workers
export interface Env {
  // D1 Databases
  ANALYTICS: D1Database;
  RAW_FEED_DB: D1Database; // MCP raw feed database

  // Queues
  LINE_INGRESS: Queue;
  STEAM_WEBHOOK: Queue;
  STEAM_QUEUE: Queue; // MCP steam processor
  EXPOSURE_QUEUE: Queue; // MCP exposure calculator
  FANTASY402_QUEUE: Queue; // Fantasy402 data ingestion queue

  // Analytics Engine
  ANALYTICS_ENGINE: AnalyticsEngineDataset;

  // KV Namespaces
  BET_TICKER_RAW?: KVNamespace; // Optional: BetTicker interception storage
  FANTASY_CACHE: KVNamespace; // Fantasy402 data cache (1-hour TTL)
  TOKEN_STORE?: KVNamespace; // MCP: Legacy token storage
  USER_STORE?: KVNamespace; // MCP: User credentials
  SESSION_STORE?: KVNamespace; // MCP: Active sessions
  REFRESH_STORE?: KVNamespace; // MCP: Refresh tokens
  LIVEBETS_STORE?: KVNamespace; // MCP: Live betting cache

  // Environment Variables
  FANTASY402_JWT_TOKEN?: string; // MCP: Fantasy402.com JWT token
  FANTASY402_API_BASE?: string; // MCP: Fantasy402.com API base URL
  ENCRYPTION_KEY?: string; // MCP: Token encryption key
}

// Extended environment for BetTicker sniffer
export interface BetTickerSnifferEnv extends Env {
  BET_TICKER_RAW: KVNamespace; // Required for sniffer
}

// Extended environment for MCP server
export interface MCPEnv extends Env {
  TOKEN_STORE: KVNamespace;
  USER_STORE: KVNamespace;
  SESSION_STORE: KVNamespace;
  REFRESH_STORE: KVNamespace;
  LIVEBETS_STORE: KVNamespace;
  RAW_FEED_DB: D1Database;
  FANTASY402_JWT_TOKEN: string;
  FANTASY402_API_BASE: string;
  ENCRYPTION_KEY: string;
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
  mt: z.enum(['SPREAD', 'TOTAL', 'MONEYLINE'], {
    errorMap: () => ({ message: 'Market Type must be one of: SPREAD, TOTAL, MONEYLINE' })
  }),
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

// ============================================================================
// Sports API Types
// ============================================================================

export type Sport = 'nba' | 'nfl' | 'mlb' | 'nhl';
export type Market = 'moneyline' | 'spread' | 'total';

export interface OddsSource {
  source: string; // 'pinnacle', 'bet365', etc.
  data: {
    home: number;
    away: number;
    timestamp: string;
  } | null;
  error?: string;
}

export interface AggregatedOdds {
  sport: Sport;
  market: Market;
  sources: OddsSource[];
  aggregatedAt: string;
  cacheHit?: boolean;
}

export interface IngestDataPoint {
  eventId: string;
  timestamp: string;
  odds: number;
  market?: string;
  volume?: number;
  source?: string;
}

export interface IngestResponse {
  received: number;
  written: number;
  errors?: string[];
  rateLimit?: {
    remaining: number;
    reset: number;
  };
  timestamp: string;
}

// ============================================================================
// Extended Env for Sports & Rate Limiting
// ============================================================================

export interface SportsEnv extends Env {
  RATE_LIMITER: KVNamespace;
  SPORTS_CACHE: KVNamespace;
  JWT_SECRET: string;

  // Optional API keys (with rotation)
  PINNACLE_KEY?: string;
  PINNACLE_KEY_1?: string;
  PINNACLE_KEY_2?: string;
  PINNACLE_KEY_3?: string;

  BET365_KEY?: string;
  BET365_KEY_1?: string;
  BET365_KEY_2?: string;
  BET365_KEY_3?: string;

  SPORTSDATA_KEY?: string;
  SPORTSDATA_KEY_1?: string;
  SPORTSDATA_KEY_2?: string;
  SPORTSDATA_KEY_3?: string;
}
