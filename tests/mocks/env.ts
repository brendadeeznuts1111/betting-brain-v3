/**
 * Shared mock environment for tests
 * Provides consistent mocking across all test suites
 */

import type { Env } from '../../src/types/api';

export function createMockEnv(): Env {
  return {
    ANALYTICS: {
      prepare: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue({ count: 0 }),
        run: vi.fn().mockResolvedValue({ success: true }),
        all: vi.fn().mockResolvedValue([]),
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ count: 0 }),
          run: vi.fn().mockResolvedValue({ success: true }),
          all: vi.fn().mockResolvedValue([])
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
}

export function createMockExecutionContext(): ExecutionContext {
  return {
    waitUntil: vi.fn(),
    passThroughOnException: vi.fn()
  } as any;
}

export function createMockMessage(body: any): Message {
  return {
    id: 'test-message-id',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    timestamp: new Date().toISOString(),
    attempts: 1
  } as any;
}

export function createMockMessageBatch(messages: Message[], queueName: string): MessageBatch {
  return {
    messages,
    queue: queueName
  } as any;
}

export function createMockScheduledEvent(cron: string): ScheduledEvent {
  return {
    cron,
    scheduledTime: Date.now(),
    noRetry: vi.fn()
  } as any;
}
