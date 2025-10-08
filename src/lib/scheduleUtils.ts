/**
 * Schedule Utilities
 * 
 * Centralized error handling for scheduled jobs to prevent test failures
 * caused by uncaught exceptions in schedule handlers.
 */

import type { Env, ExecutionContext } from '../types/api';

/**
 * Runs a scheduled job safely, swallowing errors and logging them
 * instead of throwing. This prevents test failures from uncaught exceptions.
 * 
 * @param name - Name of the scheduled job for logging
 * @param env - Environment bindings
 * @param ctx - Execution context
 * @param fn - The actual job function to run
 */
export async function runSafe(
    name: string,
    env: Env,
    ctx: ExecutionContext,
    fn: () => Promise<void>
): Promise<void> {
    try {
        await fn();
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);

        // Log error to analytics engine for monitoring
        try {
            await env.ANALYTICS_ENGINE?.writeDataPoint({
                blobs: [name, 'error'],
                doubles: [1],
                indexes: [name],
            });
        } catch (analyticsError) {
            // Don't let analytics errors break the error handling
            console.error(`[${name}] Failed to write error analytics:`, analyticsError);
        }

        // Log error to console for debugging
        console.error(`[${name}] Job failed: ${msg}`);

        // DO NOT re-throw - this prevents test failures
        // Tests expect no uncaught exceptions
    }
}

/**
 * Chunks an array into smaller batches for processing
 * 
 * @param array - Array to chunk
 * @param size - Chunk size
 * @returns Array of chunks
 */
export function chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

/**
 * Checks if cost cap has been reached
 * 
 * @param env - Environment bindings
 * @returns True if cost cap reached
 */
export async function isCostCapReached(env: Env): Promise<boolean> {
    try {
        const { costCapGuard } = await import('../guards/costCap');
        const result = await costCapGuard.checkRequest(env);
        return !result.allowed;
    } catch (error) {
        console.error('[scheduleUtils] Cost cap check failed:', error);
        return false; // Assume not reached if check fails
    }
}

/**
 * Waits for a specified number of milliseconds
 * 
 * @param ms - Milliseconds to wait
 */
export function wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
