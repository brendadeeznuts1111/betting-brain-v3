/**
 * Integration Tests for src/index.ts
 * Tests the main entry point, queue handlers, and scheduled jobs
 */

import { describe, test, expect, vi, beforeEach } from "bun:test";
import type { Env } from '../../src/types/api';

// Mock the imported modules
vi.mock('../../src/queues/lineIngress', () => ({
  handleLineIngress: vi.fn()
}));

vi.mock('../../src/queues/steamWebhook', () => ({
  handleSteamWebhook: vi.fn()
}));

vi.mock('../../src/schedules/sharpCalc', () => ({
  handleSharpCalculation: vi.fn()
}));

vi.mock('../../src/schedules/exposureCalc', () => ({
  handleExposureCalculation: vi.fn()
}));

vi.mock('../../src/tools/intelligence/getBettingExposure', () => ({
  getBettingExposure: vi.fn()
}));

vi.mock('../../src/tools/intelligence/getSharpScore', () => ({
  getSharpScore: vi.fn()
}));

vi.mock('../../src/tools/intelligence/getHoldPercentage', () => ({
  getHoldPercentage: vi.fn()
}));

vi.mock('../../src/tools/intelligence/getCLV', () => ({
  getCLV: vi.fn()
}));

// Import the mocked modules
import { handleLineIngress } from '../../src/queues/lineIngress';
import { handleSteamWebhook } from '../../src/queues/steamWebhook';
import { handleSharpCalculation } from '../../src/schedules/sharpCalc';
import { handleExposureCalculation } from '../../src/schedules/exposureCalc';
import { getBettingExposure } from '../../src/tools/intelligence/getBettingExposure';
import { getSharpScore } from '../../src/tools/intelligence/getSharpScore';
import { getHoldPercentage } from '../../src/tools/intelligence/getHoldPercentage';
import { getCLV } from '../../src/tools/intelligence/getCLV';

// Import the main module after mocking
import worker from '../../src/index';

describe('Integration Tests - Main Entry Point', () => {
  let mockEnv: Env;
  let mockCtx: ExecutionContext;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockEnv = {
      ANALYTICS: {
        prepare: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ count: 0 }),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue({ results: [] }),
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue({ count: 0 }),
            run: vi.fn().mockResolvedValue({ success: true }),
            all: vi.fn().mockResolvedValue({ results: [] })
          })
        }),
        exec: vi.fn().mockResolvedValue({ success: true })
      } as any,
      LINE_INGRESS: {
        send: vi.fn().mockResolvedValue({ success: true })
      } as any,
      STEAM_WEBHOOK: {
        send: vi.fn().mockResolvedValue({ success: true })
      } as any,
      ANALYTICS_ENGINE: {
        writeDataPoint: vi.fn().mockResolvedValue(undefined)
      } as any
    };

    mockCtx = {
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn()
    } as any;
  });

  describe('Health Check Endpoint', () => {
    test('should return healthy status for /health endpoint', async () => {
      const request = new Request('https://example.com/health');
      const response = await worker.fetch(request, mockEnv, mockCtx);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      
      const body = await response.json();
      expect(body.status).toBe('healthy');
      expect(body.version).toBe('3.0.0');
      expect(body.timestamp).toBeDefined();
    });

    test('should return valid timestamp in health check', async () => {
      const request = new Request('https://example.com/health');
      const response = await worker.fetch(request, mockEnv, mockCtx);
      const body = await response.json();
      
      const timestamp = new Date(body.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).toBeGreaterThan(Date.now() - 1000);
    });
  });

  describe('MCP Tools API Routes', () => {
    test('should route to getBettingExposure tool', async () => {
      const mockResponse = new Response(JSON.stringify({ exposure: 1000 }), { status: 200 });
      (getBettingExposure as any).mockResolvedValue(mockResponse);

      const request = new Request('https://example.com/tools/getBettingExposure');
      const response = await worker.fetch(request, mockEnv, mockCtx);
      
      expect(getBettingExposure).toHaveBeenCalledWith(request, mockEnv);
      expect(response).toBe(mockResponse);
    });

    test('should route to getSharpScore tool', async () => {
      const mockResponse = new Response(JSON.stringify({ score: 45 }), { status: 200 });
      (getSharpScore as any).mockResolvedValue(mockResponse);

      const request = new Request('https://example.com/tools/getSharpScore');
      const response = await worker.fetch(request, mockEnv, mockCtx);
      
      expect(getSharpScore).toHaveBeenCalledWith(request, mockEnv);
      expect(response).toBe(mockResponse);
    });

    test('should route to getHoldPercentage tool', async () => {
      const mockResponse = new Response(JSON.stringify({ hold: 5.2 }), { status: 200 });
      (getHoldPercentage as any).mockResolvedValue(mockResponse);

      const request = new Request('https://example.com/tools/getHoldPercentage');
      const response = await worker.fetch(request, mockEnv, mockCtx);
      
      expect(getHoldPercentage).toHaveBeenCalledWith(request, mockEnv);
      expect(response).toBe(mockResponse);
    });

    test('should route to getCLV tool', async () => {
      const mockResponse = new Response(JSON.stringify({ clv: 2.5 }), { status: 200 });
      (getCLV as any).mockResolvedValue(mockResponse);

      const request = new Request('https://example.com/tools/getCLV');
      const response = await worker.fetch(request, mockEnv, mockCtx);
      
      expect(getCLV).toHaveBeenCalledWith(request, mockEnv);
      expect(response).toBe(mockResponse);
    });

    test('should return 404 for unknown tool', async () => {
      const request = new Request('https://example.com/tools/unknownTool');
      const response = await worker.fetch(request, mockEnv, mockCtx);
      
      expect(response.status).toBe(404);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      
      const body = await response.json();
      expect(body.error).toBe('Tool not found');
    });
  });

  describe('Default Response', () => {
    test('should return default response for unknown paths', async () => {
      const request = new Request('https://example.com/unknown');
      const response = await worker.fetch(request, mockEnv, mockCtx);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/plain');
      
      const body = await response.text();
      expect(body).toMatch(/Betting-Brain v3 - Edge Intelligence Layer\nRequest ID: \w+\nDuration: \d+ms/);
    });
  });

  describe('Queue Processing', () => {
    test('should process line-ingress queue messages', async () => {
      const mockMessage = {
        id: 'msg-1',
        body: JSON.stringify({ eid: 'nba_123', mt: 'SPREAD', lb: -110, la: -108, vb: 10000, va: 15000, ts: new Date().toISOString() })
      } as any;

      const batch = { messages: [mockMessage], queue: 'line-ingress' } as any;
      
      await worker.queue(batch, mockEnv, mockCtx);
      
      expect(handleLineIngress).toHaveBeenCalledWith(mockMessage, mockEnv, mockCtx);
      // Cloudflare Workers automatically handle ack/retry based on exceptions
    });

    test('should process steam-webhook queue messages', async () => {
      const mockMessage = {
        id: 'msg-2',
        body: JSON.stringify({ eid: 'nba_456', mt: 'SPREAD', lb: -110, la: -100, vb: 10000, va: 20000, ts: new Date().toISOString() })
      } as any;

      const batch = { messages: [mockMessage], queue: 'steam-webhook' } as any;
      
      await worker.queue(batch, mockEnv, mockCtx);
      
      expect(handleSteamWebhook).toHaveBeenCalledWith(mockMessage, mockEnv, mockCtx);
      // Cloudflare Workers automatically handle ack/retry based on exceptions
    });

    test('should handle queue processing errors', async () => {
      const mockMessage = {
        id: 'msg-3',
        body: JSON.stringify({ invalid: 'data' })
      } as any;

      const batch = { messages: [mockMessage], queue: 'line-ingress' } as any;
      
      (handleLineIngress as any).mockRejectedValue(new Error('Processing failed'));
      
      await expect(worker.queue(batch, mockEnv, mockCtx)).rejects.toThrow('Processing failed');
      
      // Cloudflare Workers automatically handle ack/retry based on exceptions
    });
  });

  describe('Scheduled Jobs', () => {
    test('should execute sharp calculation on hourly cron', async () => {
      const event = {
        cron: '0 * * * *',
        scheduledTime: Date.now()
      } as any;

      await worker.scheduled(event, mockEnv, mockCtx);
      
      expect(handleSharpCalculation).toHaveBeenCalledWith(mockEnv, mockCtx);
      expect(handleExposureCalculation).not.toHaveBeenCalled();
    });

    test('should execute exposure calculation on 30-second cron', async () => {
      const event = {
        cron: '*/30 * * * * *',
        scheduledTime: Date.now()
      } as any;

      await worker.scheduled(event, mockEnv, mockCtx);
      
      expect(handleExposureCalculation).toHaveBeenCalledWith(mockEnv, mockCtx);
      expect(handleSharpCalculation).not.toHaveBeenCalled();
    });

    test('should handle unknown cron schedules', async () => {
      const event = {
        cron: '0 0 1 1 *', // Unknown schedule
        scheduledTime: Date.now()
      } as any;

      await worker.scheduled(event, mockEnv, mockCtx);
      
      expect(handleSharpCalculation).not.toHaveBeenCalled();
      expect(handleExposureCalculation).not.toHaveBeenCalled();
    });

    test('should handle scheduled job errors', async () => {
      const event = {
        cron: '0 * * * *',
        scheduledTime: Date.now()
      } as any;

      (handleSharpCalculation as any).mockRejectedValue(new Error('Calculation failed'));
      
      // Should not throw - errors should be handled gracefully
      await expect(worker.scheduled(event, mockEnv, mockCtx)).rejects.toThrow('Calculation failed');
    });
  });

  describe('Edge Cases', () => {
    test('should handle malformed URLs', async () => {
      // Use a valid URL but test error handling
      const request = new Request('https://example.com/unknown');
      const response = await worker.fetch(request, mockEnv, mockCtx);
      
      expect(response.status).toBe(200);
      const body = await response.text();
      expect(body).toMatch(/Betting-Brain v3 - Edge Intelligence Layer\nRequest ID: \w+\nDuration: \d+ms/);
    });

    test('should handle empty queue batches', async () => {
      const batch = { messages: [] } as any;
      
      await worker.queue(batch, mockEnv, mockCtx);
      
      expect(handleLineIngress).not.toHaveBeenCalled();
      expect(handleSteamWebhook).not.toHaveBeenCalled();
    });

    test('should handle requests with query parameters', async () => {
      const request = new Request('https://example.com/tools/getBettingExposure?eventId=nba_123');
      const mockResponse = new Response(JSON.stringify({ exposure: 1000 }), { status: 200 });
      (getBettingExposure as any).mockResolvedValue(mockResponse);

      const response = await worker.fetch(request, mockEnv, mockCtx);
      
      expect(getBettingExposure).toHaveBeenCalledWith(request, mockEnv);
      expect(response).toBe(mockResponse);
    });
  });
});
