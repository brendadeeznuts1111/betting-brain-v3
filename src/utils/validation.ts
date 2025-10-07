/**
 * Zod Validation Schemas
 * Centralized validation for all API inputs and outputs
 */

import { z } from 'zod';

// Common validation patterns
export const EventIdSchema = z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/);
export const CustomerIdSchema = z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/);
export const MarketTypeSchema = z.enum(['SPREAD', 'MONEYLINE', 'TOTAL', 'PROP']);
export const SideSchema = z.enum(['HOME', 'AWAY']);
export const TimestampSchema = z.string().datetime();

// Line movement validation
export const LineMovementInputSchema = z.object({
  eid: EventIdSchema,
  mt: MarketTypeSchema,
  lb: z.number().nullable(),
  la: z.number().nullable(),
  vb: z.number().int().nonnegative().nullable(),
  va: z.number().int().nonnegative().nullable(),
  ts: TimestampSchema
});

// API request schemas
export const GetBettingExposureRequestSchema = z.object({
  eid: EventIdSchema,
  includeHistory: z.boolean().optional().default(false),
  timeWindow: z.number().int().min(1).max(24).optional().default(1)
});

export const GetSharpScoreRequestSchema = z.object({
  cid: CustomerIdSchema,
  includeHistory: z.boolean().optional().default(false),
  timeWindow: z.number().int().min(1).max(168).optional().default(24)
});

export const GetHoldPercentageRequestSchema = z.object({
  eid: EventIdSchema,
  mt: MarketTypeSchema,
  includeHistory: z.boolean().optional().default(false),
  timeWindow: z.number().int().min(1).max(24).optional().default(1)
});

export const GetCLVRequestSchema = z.object({
  cid: CustomerIdSchema,
  includeHistory: z.boolean().optional().default(false),
  timeWindow: z.number().int().min(1).max(168).optional().default(24)
});

// API response schemas
export const BettingExposureResponseSchema = z.object({
  eid: EventIdSchema,
  sides: z.array(z.object({
    side: SideSchema,
    risk: z.number(),
    net: z.number(),
    percentage: z.number()
  })),
  totalRisk: z.number(),
  maxExposure: z.number(),
  lastUpdated: TimestampSchema,
  alertThreshold: z.object({
    maxAmount: z.number(),
    maxPercentage: z.number()
  })
});

export const SharpScoreResponseSchema = z.object({
  cid: CustomerIdSchema,
  sharpScore: z.number().min(0).max(100),
  clv: z.number(),
  winRate: z.number().min(0).max(100),
  actionCount: z.number().int().nonnegative(),
  lastUpdated: TimestampSchema,
  alertThreshold: z.number()
});

export const HoldPercentageResponseSchema = z.object({
  eid: EventIdSchema,
  mt: MarketTypeSchema,
  holdPercentage: z.number(),
  totalVolume: z.number().nonnegative(),
  totalRisk: z.number().nonnegative(),
  lastUpdated: TimestampSchema,
  alertThreshold: z.object({
    min: z.number(),
    max: z.number()
  })
});

export const CLVResponseSchema = z.object({
  cid: CustomerIdSchema,
  lifetimeValue: z.number(),
  winRate: z.number().min(0).max(100),
  actionCount: z.number().int().nonnegative(),
  netBet: z.number(),
  lastUpdated: TimestampSchema,
  alertThreshold: z.number()
});

export const ErrorResponseSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  details: z.record(z.any()).optional(),
  timestamp: TimestampSchema
});

// Validation helper functions
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  try {
    // Check for circular references
    if (hasCircularReference(data)) {
      return { success: false, error: 'Circular reference detected' };
    }
    
    // Check for large objects (over 1MB)
    const dataSize = JSON.stringify(data).length;
    if (dataSize > 1024 * 1024) {
      return { success: false, error: 'Object too large' };
    }
    
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      };
    }
    return { success: false, error: 'Validation failed' };
  }
}

function hasCircularReference(obj: unknown, seen = new WeakSet()): boolean {
  if (obj === null || typeof obj !== 'object') {
    return false;
  }
  
  if (seen.has(obj)) {
    return true;
  }
  
  seen.add(obj);
  
  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (hasCircularReference(item, seen)) {
        return true;
      }
    }
  } else {
    for (const value of Object.values(obj)) {
      if (hasCircularReference(value, seen)) {
        return true;
      }
    }
  }
  
  seen.delete(obj);
  return false;
}

export function createErrorResponse(error: string, code?: string, details?: Record<string, any>): string {
  return JSON.stringify({
    error,
    code,
    details,
    timestamp: new Date().toISOString()
  });
}

export function createSuccessResponse<T>(data: T, schema: z.ZodSchema<T>): string {
  const validated = schema.parse(data);
  return JSON.stringify(validated);
}
