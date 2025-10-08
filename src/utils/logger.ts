/**
 * Structured Logging Utility
 * 
 * Production-grade logging with trace IDs for full request tracing
 * Compatible with Cloudflare LogExplorer and external log aggregators
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
    traceId: string;
    requestId?: string;
    userId?: string;
    agentId?: string;
    operation?: string;
    [key: string]: any;
}

export interface LogEntry {
    level: LogLevel;
    timestamp: string;
    message: string;
    traceId: string;
    context?: Record<string, any>;
    error?: {
        name: string;
        message: string;
        stack?: string;
    };
}

/**
 * Structured Logger
 * 
 * @example
 * const logger = new StructuredLogger({ traceId, requestId });
 * logger.info('order_enqueued', { orderId, latencyMs });
 * logger.error('payment_failed', { orderId, reason }, error);
 */
export class StructuredLogger {
    private context: LogContext;

    constructor(context: Partial<LogContext> = {}) {
        this.context = {
            traceId: context.traceId || crypto.randomUUID(),
            ...context
        };
    }

    /**
     * Log with specific level
     */
    private log(level: LogLevel, message: string, data?: Record<string, any>, error?: Error): void {
        const entry: LogEntry = {
            level,
            timestamp: new Date().toISOString(),
            message,
            traceId: this.context.traceId,
            context: {
                ...this.context,
                ...data
            }
        };

        if (error) {
            entry.error = {
                name: error.name,
                message: error.message,
                stack: error.stack
            };
        }

        // Output as JSON for LogExplorer
        console.log(JSON.stringify(entry));
    }

    /**
     * Debug level logging
     */
    debug(message: string, data?: Record<string, any>): void {
        this.log('debug', message, data);
    }

    /**
     * Info level logging
     */
    info(message: string, data?: Record<string, any>): void {
        this.log('info', message, data);
    }

    /**
     * Warning level logging
     */
    warn(message: string, data?: Record<string, any>): void {
        this.log('warn', message, data);
    }

    /**
     * Error level logging
     */
    error(message: string, data?: Record<string, any>, error?: Error): void {
        this.log('error', message, data, error);
    }

    /**
     * Add context to logger
     */
    withContext(additionalContext: Record<string, any>): StructuredLogger {
        return new StructuredLogger({
            ...this.context,
            ...additionalContext
        });
    }

    /**
     * Get trace ID
     */
    getTraceId(): string {
        return this.context.traceId;
    }
}

/**
 * Create logger from request
 * 
 * Extracts trace ID from headers or generates new one
 * 
 * @example
 * const logger = createLogger(request);
 * logger.info('request_started', { method, url });
 */
export function createLogger(request: Request, additionalContext?: Record<string, any>): StructuredLogger {
    // Try to get trace ID from headers (for distributed tracing)
    const traceId = request.headers.get('x-trace-id') ||
        request.headers.get('x-request-id') ||
        crypto.randomUUID();

    const url = new URL(request.url);
    const requestId = Date.now().toString(36);

    return new StructuredLogger({
        traceId,
        requestId,
        method: request.method,
        path: url.pathname,
        userAgent: request.headers.get('user-agent')?.substring(0, 50),
        cfRay: request.headers.get('cf-ray'),
        ...additionalContext
    });
}

/**
 * Performance timer
 * 
 * @example
 * const timer = performanceTimer(logger, 'db_query');
 * const result = await db.query(...);
 * timer.end({ rows: result.length });
 */
export function performanceTimer(
    logger: StructuredLogger,
    operation: string
): { end: (data?: Record<string, any>) => void } {
    const startTime = Date.now();

    return {
        end: (data?: Record<string, any>) => {
            const latencyMs = Date.now() - startTime;
            logger.info(`${operation}_complete`, {
                operation,
                latencyMs,
                ...data
            });
        }
    };
}

/**
 * Metrics logger for Analytics Engine
 * 
 * @example
 * logMetric(env, 'api_request', {
 *   endpoint: '/api/events',
 *   status: 200,
 *   latencyMs: 45
 * });
 */
export function logMetric(
    env: { ANALYTICS_ENGINE?: any },
    metric: string,
    data: Record<string, any>
): void {
    if (!env.ANALYTICS_ENGINE) return;

    try {
        env.ANALYTICS_ENGINE.writeDataPoint({
            blobs: [metric],
            doubles: [
                data.latencyMs || 0,
                data.count || 1
            ],
            indexes: [
                data.status?.toString() || '200',
                data.endpoint || 'unknown'
            ]
        });
    } catch (error) {
        console.error('Failed to log metric:', error);
    }
}

