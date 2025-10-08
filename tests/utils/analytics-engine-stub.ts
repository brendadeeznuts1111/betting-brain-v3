/**
 * Analytics Engine Stub for Testing
 * 
 * Provides first-class analytics call tracking without network dependencies.
 * Replaces real Analytics Engine in tests for fast, reliable testing.
 */

export interface AnalyticsCall {
    blobs: string[];
    doubles: number[];
    tags?: Record<string, string>;
    timestamp: number;
}

export class AnalyticsEngineStub {
    private calls: AnalyticsCall[] = [];
    private flushPromises: Promise<void>[] = [];

    /**
     * Write a data point (stubbed - just tracks the call)
     */
    async writeDataPoint(data: {
        blobs: string[];
        doubles: number[];
        tags?: Record<string, string>;
    }): Promise<void> {
        const call: AnalyticsCall = {
            blobs: [...data.blobs],
            doubles: [...data.doubles],
            tags: data.tags ? { ...data.tags } : undefined,
            timestamp: Date.now()
        };

        this.calls.push(call);

        // Simulate async behavior but resolve immediately
        return Promise.resolve();
    }

    /**
     * Get all analytics calls made during the test
     */
    getCalls(): AnalyticsCall[] {
        return [...this.calls];
    }

    /**
     * Reset the stub to clean state
     */
    reset(): void {
        this.calls = [];
        this.flushPromises = [];
    }

    /**
     * Get calls filtered by blob content
     */
    callsWithBlob(blob: string): AnalyticsCall[] {
        return this.calls.filter(call => call.blobs.includes(blob));
    }

    /**
     * Get calls filtered by tag
     */
    callsWithTag(tagKey: string, tagValue?: string): AnalyticsCall[] {
        return this.calls.filter(call => {
            if (!call.tags) return false;
            if (tagValue !== undefined) {
                return call.tags[tagKey] === tagValue;
            }
            return call.tags.hasOwnProperty(tagKey);
        });
    }

    /**
     * Get the number of calls made
     */
    callCount(): number {
        return this.calls.length;
    }

    /**
     * Check if a specific call was made
     */
    wasCalledWith(expectedCall: Partial<AnalyticsCall>): boolean {
        return this.calls.some(call => {
            if (expectedCall.blobs && !this.arraysEqual(call.blobs, expectedCall.blobs)) {
                return false;
            }
            if (expectedCall.doubles && !this.arraysEqual(call.doubles, expectedCall.doubles)) {
                return false;
            }
            if (expectedCall.tags && !this.objectsEqual(call.tags, expectedCall.tags)) {
                return false;
            }
            return true;
        });
    }

    /**
     * Get the last call made
     */
    lastCall(): AnalyticsCall | undefined {
        return this.calls[this.calls.length - 1];
    }

    /**
     * Clear all calls (useful for test cleanup)
     */
    clear(): void {
        this.calls = [];
        this.flushPromises = [];
    }

    /**
     * Flush all pending calls (stubbed - just clears the array)
     */
    async flush(): Promise<void> {
        // In real implementation, this would send data to analytics
        // For testing, we just clear the calls
        this.calls = [];
        return Promise.resolve();
    }

    /**
     * Simulate flush with delay (for testing async behavior)
     */
    async flushWithDelay(ms: number = 100): Promise<void> {
        await new Promise(resolve => setTimeout(resolve, ms));
        return this.flush();
    }

    /**
     * Get calls grouped by first blob (event type)
     */
    callsByEventType(): Record<string, AnalyticsCall[]> {
        const grouped: Record<string, AnalyticsCall[]> = {};

        for (const call of this.calls) {
            const eventType = call.blobs[0] || 'unknown';
            if (!grouped[eventType]) {
                grouped[eventType] = [];
            }
            grouped[eventType].push(call);
        }

        return grouped;
    }

    /**
     * Get summary statistics
     */
    getStats(): {
        totalCalls: number;
        eventTypes: Record<string, number>;
        averageDoublesPerCall: number;
        timeRange: { start: number; end: number } | null;
    } {
        const eventTypes: Record<string, number> = {};
        let totalDoubles = 0;
        let minTime = Infinity;
        let maxTime = -Infinity;

        for (const call of this.calls) {
            const eventType = call.blobs[0] || 'unknown';
            eventTypes[eventType] = (eventTypes[eventType] || 0) + 1;
            totalDoubles += call.doubles.length;
            minTime = Math.min(minTime, call.timestamp);
            maxTime = Math.max(maxTime, call.timestamp);
        }

        return {
            totalCalls: this.calls.length,
            eventTypes,
            averageDoublesPerCall: this.calls.length > 0 ? totalDoubles / this.calls.length : 0,
            timeRange: this.calls.length > 0 ? { start: minTime, end: maxTime } : null
        };
    }

    private arraysEqual(a: any[], b: any[]): boolean {
        if (a.length !== b.length) return false;
        return a.every((val, index) => val === b[index]);
    }

    private objectsEqual(a: Record<string, any> | undefined, b: Record<string, any> | undefined): boolean {
        if (!a && !b) return true;
        if (!a || !b) return false;

        const keysA = Object.keys(a);
        const keysB = Object.keys(b);

        if (keysA.length !== keysB.length) return false;

        return keysA.every(key => a[key] === b[key]);
    }
}

/**
 * Create a new Analytics Engine Stub instance
 */
export function createAnalyticsEngineStub(): AnalyticsEngineStub {
    return new AnalyticsEngineStub();
}

/**
 * Mock the Analytics Engine for testing
 * Replaces the real ANALYTICS_ENGINE with a stub
 */
export function mockAnalyticsEngine(env: any): AnalyticsEngineStub {
    const stub = createAnalyticsEngineStub();
    env.ANALYTICS_ENGINE = {
        writeDataPoint: stub.writeDataPoint.bind(stub)
    };
    return stub;
}
