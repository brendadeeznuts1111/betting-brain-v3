/**
 * Centralized Configuration for Betting Brain Platform
 * 
 * This file centralizes all environment-specific URLs and configuration
 * to eliminate hardcoded values across the codebase.
 * 
 * @version 3.1.0
 * @lastUpdated 2025-10-08
 */

export interface EnvironmentConfig {
    workerUrl: string;
    apiBaseUrl: string;
    websocketUrl: string;
    logEndpoint: string;
    healthEndpoint: string;
    interceptorEndpoint: string;
}

/**
 * Environment-specific configuration
 */
export const ENVIRONMENTS = {
    development: {
        workerUrl: 'http://localhost:8787',
        apiBaseUrl: 'http://localhost:8787/api',
        websocketUrl: 'ws://localhost:8787/ws',
        logEndpoint: 'http://localhost:8787/logs',
        healthEndpoint: 'http://localhost:8787/health',
        interceptorEndpoint: 'http://localhost:8787/interceptor'
    },
    staging: {
        workerUrl: 'https://betting-brain-v3-staging.nolarose1968-806.workers.dev',
        apiBaseUrl: 'https://betting-brain-v3-staging.nolarose1968-806.workers.dev/api',
        websocketUrl: 'wss://betting-brain-v3-staging.nolarose1968-806.workers.dev/ws',
        logEndpoint: 'https://betting-brain-v3-staging.nolarose1968-806.workers.dev/logs',
        healthEndpoint: 'https://betting-brain-v3-staging.nolarose1968-806.workers.dev/health',
        interceptorEndpoint: 'https://betting-brain-v3-staging.nolarose1968-806.workers.dev/interceptor'
    },
    production: {
        workerUrl: 'https://betting-brain-v3.nolarose1968-806.workers.dev',
        apiBaseUrl: 'https://betting-brain-v3.nolarose1968-806.workers.dev/api',
        websocketUrl: 'wss://betting-brain-v3.nolarose1968-806.workers.dev/ws',
        logEndpoint: 'https://betting-brain-v3.nolarose1968-806.workers.dev/logs',
        healthEndpoint: 'https://betting-brain-v3.nolarose1968-806.workers.dev/health',
        interceptorEndpoint: 'https://betting-brain-v3.nolarose1968-806.workers.dev/interceptor'
    }
} as const;

/**
 * Get current environment configuration
 */
export function getEnvironmentConfig(): EnvironmentConfig {
    const env = process.env.NODE_ENV || 'development';

    switch (env) {
        case 'production':
            return ENVIRONMENTS.production;
        case 'staging':
            return ENVIRONMENTS.staging;
        default:
            return ENVIRONMENTS.development;
    }
}

/**
 * Get worker URL for current environment
 */
export function getWorkerUrl(): string {
    return getEnvironmentConfig().workerUrl;
}

/**
 * Get API base URL for current environment
 */
export function getApiBaseUrl(): string {
    return getEnvironmentConfig().apiBaseUrl;
}

/**
 * Get WebSocket URL for current environment
 */
export function getWebSocketUrl(): string {
    return getEnvironmentConfig().websocketUrl;
}

/**
 * Get log endpoint for current environment
 */
export function getLogEndpoint(): string {
    return getEnvironmentConfig().logEndpoint;
}

/**
 * Get health endpoint for current environment
 */
export function getHealthEndpoint(): string {
    return getEnvironmentConfig().healthEndpoint;
}

/**
 * Get interceptor endpoint for current environment
 */
export function getInterceptorEndpoint(): string {
    return getEnvironmentConfig().interceptorEndpoint;
}

/**
 * Legacy export for backward compatibility
 * @deprecated Use getWorkerUrl() instead
 */
export const WORKER_URL = getWorkerUrl();

/**
 * API Endpoints
 */
export const API_ENDPOINTS = {
    health: '/health',
    interceptorHistory: '/interceptor/history',
    interceptorStats: '/interceptor/stats',
    fantasy402Config: '/api/fantasy402/config',
    fantasy402Ingest: '/api/fantasy402/ingest',
    tools: '/tools'
} as const;

/**
 * Error Messages
 */
export const ERROR_MESSAGES = {
    NETWORK_ERROR: 'Network request failed',
    TIMEOUT_ERROR: 'Request timeout',
    VALIDATION_ERROR: 'Invalid input data',
    AUTHENTICATION_ERROR: 'Authentication failed',
    RATE_LIMIT_ERROR: 'Rate limit exceeded'
} as const;

/**
 * Status Constants
 */
export const STATUS = {
    SUCCESS: 'success',
    ERROR: 'error',
    LOADING: 'loading',
    IDLE: 'idle'
} as const;

/**
 * Formatters
 */
export const FORMATTERS = {
    currency: (value: number) => `$${(value / 100).toFixed(2)}`,
    percentage: (value: number) => `${(value * 100).toFixed(2)}%`,
    timestamp: (value: string) => new Date(value).toLocaleString()
} as const;
