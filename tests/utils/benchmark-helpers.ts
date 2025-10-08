/**
 * Benchmark Testing Utilities
 * 
 * Provides performance benchmarking capabilities for critical paths
 * using the native Performance API for maximum compatibility.
 */


export interface BenchmarkResult {
    name: string;
    opsPerSecond: number;
    p75: number;
    p99: number;
    samples: number;
    totalTime: number;
}

export interface BenchmarkOptions {
    time?: number; // Run time in milliseconds (default: 100)
    warmup?: boolean; // Enable warmup runs (default: true)
    minSamples?: number; // Minimum number of samples (default: 10)
}

export interface PerformanceComparison {
    regression: boolean;
    improvement: boolean;
    factor: number;
    message: string;
}

/**
 * Creates a performance benchmark for a given function
 */
export function createBenchmark(
    name: string,
    fn: () => void,
    options?: BenchmarkOptions
): Promise<BenchmarkResult> {
    return new Promise((resolve) => {
        const startTime = performance.now();
        let samples = 0;
        const times: number[] = [];

        // Warmup if enabled
        if (options?.warmup !== false) {
            for (let i = 0; i < 10; i++) {
                fn();
            }
        }

        const benchmarkTime = options?.time || 100;
        const minSamples = options?.minSamples || 10;
        const endTime = startTime + benchmarkTime;

        while (performance.now() < endTime || samples < minSamples) {
            const iterStart = performance.now();
            fn();
            const iterEnd = performance.now();
            times.push(iterEnd - iterStart);
            samples++;
        }

        const totalTime = performance.now() - startTime;
        const opsPerSecond = (samples / totalTime) * 1000;

        // Calculate percentiles
        times.sort((a, b) => a - b);
        const p75 = times[Math.floor(times.length * 0.75)];
        const p99 = times[Math.floor(times.length * 0.99)];

        resolve({
            name,
            opsPerSecond,
            p75,
            p99,
            samples,
            totalTime
        });
    });
}

/**
 * Compares two benchmark results to detect performance regressions
 */
export function compareBenchmarks(
    baseline: BenchmarkResult,
    current: BenchmarkResult
): PerformanceComparison {
    const factor = current.opsPerSecond / baseline.opsPerSecond;
    const regression = factor < 0.9; // 10% slower
    const improvement = factor > 1.1; // 10% faster

    let message = `Performance ${factor >= 1 ? 'improved' : 'degraded'} by ${Math.abs((1 - factor) * 100).toFixed(1)}%`;

    if (regression) {
        message += " - REGRESSION DETECTED";
    } else if (improvement) {
        message += " - IMPROVEMENT";
    } else {
        message += " - WITHIN TOLERANCE";
    }

    return {
        regression,
        improvement,
        factor,
        message
    };
}

/**
 * Benchmark runner for multiple benchmarks
 */
export class BenchmarkRunner {
    private benchmarks: Array<{ name: string; fn: () => void; options?: BenchmarkOptions }> = [];
    private options: BenchmarkOptions;

    constructor(options?: BenchmarkOptions) {
        this.options = options || {};
    }

    addBenchmark(name: string, fn: () => void, options?: BenchmarkOptions): void {
        this.benchmarks.push({ name, fn, options });
    }

    async runAll(): Promise<BenchmarkResult[]> {
        const results: BenchmarkResult[] = [];

        for (const benchmark of this.benchmarks) {
            const result = await createBenchmark(
                benchmark.name,
                benchmark.fn,
                { ...this.options, ...benchmark.options }
            );
            results.push(result);
        }

        return results;
    }

    generateReport(results: BenchmarkResult[]): string {
        const lines: string[] = [];
        lines.push('📊 BENCHMARK REPORT');
        lines.push('='.repeat(50));

        for (const result of results) {
            lines.push(`\n${result.name}:`);
            lines.push(`  Operations/sec: ${result.opsPerSecond.toFixed(2)}`);
            lines.push(`  P75 latency: ${result.p75.toFixed(2)}ms`);
            lines.push(`  P99 latency: ${result.p99.toFixed(2)}ms`);
            lines.push(`  Samples: ${result.samples}`);
            lines.push(`  Total time: ${result.totalTime.toFixed(2)}ms`);
        }

        return lines.join('\n');
    }
}

/**
 * Critical path benchmarks for betting operations
 */
export const CRITICAL_PATHS = {
    CLV_CALCULATION: 'CLV Calculation',
    STEAM_MOVE_DETECTION: 'Steam Move Detection',
    DATABASE_QUERY: 'Database Query',
    API_RESPONSE: 'API Response',
    LINE_MOVEMENT_PROCESSING: 'Line Movement Processing',
    SHARP_SCORE_CALCULATION: 'Sharp Score Calculation',
    EXPOSURE_CALCULATION: 'Exposure Calculation'
} as const;

/**
 * Performance thresholds for critical operations
 */
export const PERFORMANCE_THRESHOLDS = {
    [CRITICAL_PATHS.CLV_CALCULATION]: { maxP75: 50, minOpsPerSecond: 20 },
    [CRITICAL_PATHS.STEAM_MOVE_DETECTION]: { maxP75: 100, minOpsPerSecond: 10 },
    [CRITICAL_PATHS.DATABASE_QUERY]: { maxP75: 30, minOpsPerSecond: 30 },
    [CRITICAL_PATHS.API_RESPONSE]: { maxP75: 200, minOpsPerSecond: 5 },
    [CRITICAL_PATHS.LINE_MOVEMENT_PROCESSING]: { maxP75: 75, minOpsPerSecond: 15 },
    [CRITICAL_PATHS.SHARP_SCORE_CALCULATION]: { maxP75: 60, minOpsPerSecond: 18 },
    [CRITICAL_PATHS.EXPOSURE_CALCULATION]: { maxP75: 40, minOpsPerSecond: 25 }
} as const;

/**
 * Validates benchmark results against performance thresholds
 */
export function validatePerformance(
    result: BenchmarkResult,
    thresholds?: typeof PERFORMANCE_THRESHOLDS[keyof typeof PERFORMANCE_THRESHOLDS]
): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    const threshold = thresholds || PERFORMANCE_THRESHOLDS[result.name as keyof typeof PERFORMANCE_THRESHOLDS];

    if (!threshold) {
        return { valid: true, issues: [] };
    }

    if (result.p75 > threshold.maxP75) {
        issues.push(`P75 latency ${result.p75.toFixed(2)}ms exceeds threshold ${threshold.maxP75}ms`);
    }

    if (result.opsPerSecond < threshold.minOpsPerSecond) {
        issues.push(`Ops/sec ${result.opsPerSecond.toFixed(2)} below threshold ${threshold.minOpsPerSecond}`);
    }

    return {
        valid: issues.length === 0,
        issues
    };
}

/**
 * Creates a baseline benchmark file for performance regression testing
 */
export async function createBaselineBenchmark(
    name: string,
    results: BenchmarkResult[]
): Promise<void> {
    const baseline = {
        timestamp: new Date().toISOString(),
        results: results.reduce((acc, result) => {
            acc[result.name] = result;
            return acc;
        }, {} as Record<string, BenchmarkResult>)
    };

    const baselinePath = `./tests/benchmark/baselines/${name}.baseline.json`;
    await Bun.write(baselinePath, JSON.stringify(baseline, null, 2));
}

/**
 * Loads a baseline benchmark for comparison
 */
export async function loadBaselineBenchmark(
    name: string
): Promise<Record<string, BenchmarkResult> | null> {
    try {
        const baselinePath = `./tests/benchmark/baselines/${name}.baseline.json`;
        const file = Bun.file(baselinePath);
        if (!(await file.exists())) {
            return null;
        }

        const content = await file.text();
        const baseline = JSON.parse(content);
        return baseline.results;
    } catch (error) {
        console.warn(`Failed to load baseline for ${name}:`, error);
        return null;
    }
}
