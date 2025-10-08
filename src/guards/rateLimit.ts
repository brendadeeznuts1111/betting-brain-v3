/**
 * Rate Limiting Logic
 * 10 req/s per IP with burst protection
 */

import { RateLimitConfig } from '../types/api';
import { isTestEnvironment } from '../lib/testToggles';

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
  remaining: number;
  resetTime: number;
}

export class RateLimitGuard {
  private config: RateLimitConfig;
  private store: Map<string, RateLimitData> = new Map();

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /**
   * Check if request is within rate limits
   */
  async checkRateLimit(request: Request): Promise<RateLimitResult> {
    // Bypass rate limiting in test environment
    if (isTestEnvironment()) {
      return {
        allowed: true,
        remaining: 999,
        resetTime: Date.now() + 60000
      };
    }

    const key = this.config.keyGenerator(request);
    const now = Date.now();
    const windowStart = now - (this.config.windowSize * 1000);

    // Get or create rate limit data for this key
    let data = this.store.get(key);
    if (!data) {
      data = {
        requests: [],
        burstCount: 0,
        lastReset: now
      };
      this.store.set(key, data);
    }

    // Clean up old requests outside the window
    data.requests = data.requests.filter(timestamp => timestamp > windowStart);

    // Check if we're in burst mode
    const isBurst = data.burstCount < this.config.burstLimit;

    // Calculate current rate
    const currentRate = data.requests.length / this.config.windowSize;
    const maxRate = this.config.requestsPerSecond;

    // Check burst limit first
    if (data.burstCount >= this.config.burstLimit) {
      const oldestRequest = Math.min(...data.requests);
      const retryAfter = Math.ceil((oldestRequest + (this.config.windowSize * 1000) - now) / 1000);

      return {
        allowed: false,
        retryAfter,
        remaining: 0,
        resetTime: oldestRequest + (this.config.windowSize * 1000)
      };
    }

    if (currentRate >= maxRate && !isBurst) {
      // Rate limit exceeded
      const oldestRequest = Math.min(...data.requests);
      const retryAfter = Math.ceil((oldestRequest + (this.config.windowSize * 1000) - now) / 1000);

      return {
        allowed: false,
        retryAfter,
        remaining: 0,
        resetTime: oldestRequest + (this.config.windowSize * 1000)
      };
    }

    // Allow request
    data.requests.push(now);
    if (isBurst) {
      data.burstCount++;
    } else {
      data.burstCount = 0;
    }

    // Probabilistic cleanup (1% chance per request)
    if (Math.random() < 0.01) {
      this.cleanup();
    }

    const remaining = Math.max(0, Math.floor(maxRate * this.config.windowSize) - data.requests.length);
    const resetTime = now + (this.config.windowSize * 1000);

    return {
      allowed: true,
      remaining,
      resetTime
    };
  }

  /**
   * Clean up old rate limit data
   */
  cleanup(): void {
    const now = Date.now();
    const cutoff = now - (this.config.windowSize * 1000 * 2); // Keep 2 windows worth of data

    for (const [key, data] of this.store.entries()) {
      if (data.lastReset < cutoff) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Get rate limit status for a key
   */
  getStatus(key: string): RateLimitResult | null {
    const data = this.store.get(key);
    if (!data) {
      return null;
    }

    const now = Date.now();
    const windowStart = now - (this.config.windowSize * 1000);
    const currentRequests = data.requests.filter(timestamp => timestamp > windowStart);
    const currentRate = currentRequests.length / this.config.windowSize;
    const maxRate = this.config.requestsPerSecond;

    return {
      allowed: currentRate < maxRate,
      remaining: Math.max(0, Math.floor(maxRate * this.config.windowSize) - currentRequests.length),
      resetTime: now + (this.config.windowSize * 1000)
    };
  }
}

interface RateLimitData {
  requests: number[];
  burstCount: number;
  lastReset: number;
}

// Default configuration
export const defaultRateLimitConfig: RateLimitConfig = {
  requestsPerSecond: 10,
  burstLimit: 20,
  windowSize: 60, // 1 minute
  keyGenerator: (request: Request) => {
    // Extract IP from request headers
    const cfConnectingIp = request.headers.get('CF-Connecting-IP');
    const xForwardedFor = request.headers.get('X-Forwarded-For');
    const ip = cfConnectingIp || xForwardedFor?.split(',')[0] || 'unknown';
    return ip;
  }
};

// Global instance
export const rateLimitGuard = new RateLimitGuard(defaultRateLimitConfig);

// Note: Periodic cleanup is handled probabilistically during rate limit checks
// to avoid setInterval in stateless edge workers
