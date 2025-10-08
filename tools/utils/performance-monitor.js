/**
 * Performance Monitoring System for Tools Hub
 * Version: 2.1.0
 * Last Updated: 2025-01-08
 */

class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.observers = new Map();
        this.config = window.ToolsConfig || {};
        this.isEnabled = this.config.logging?.enabled !== false;

        this.initializePerformanceObserver();
        this.startPeriodicCleanup();
    }

    // Initialize Performance Observer for automatic monitoring
    initializePerformanceObserver() {
        if (!this.isEnabled || !window.PerformanceObserver) return;

        try {
            // Monitor navigation timing
            const navObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.recordNavigationMetrics(entry);
                }
            });
            navObserver.observe({ entryTypes: ['navigation'] });

            // Monitor resource timing
            const resourceObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.recordResourceMetrics(entry);
                }
            });
            resourceObserver.observe({ entryTypes: ['resource'] });

            // Monitor paint timing
            const paintObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.recordPaintMetrics(entry);
                }
            });
            paintObserver.observe({ entryTypes: ['paint'] });

        } catch (error) {
            console.warn('Performance Observer not supported:', error);
        }
    }

    // Record navigation timing metrics
    recordNavigationMetrics(entry) {
        const metrics = {
            type: 'navigation',
            url: entry.name,
            loadTime: entry.loadEventEnd - entry.loadEventStart,
            domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
            firstByte: entry.responseStart - entry.requestStart,
            dns: entry.domainLookupEnd - entry.domainLookupStart,
            tcp: entry.connectEnd - entry.connectStart,
            timestamp: Date.now()
        };

        this.storeMetrics('navigation', metrics);
    }

    // Record resource timing metrics
    recordResourceMetrics(entry) {
        const metrics = {
            type: 'resource',
            name: entry.name,
            duration: entry.duration,
            size: entry.transferSize || 0,
            cached: entry.transferSize === 0,
            timestamp: Date.now()
        };

        this.storeMetrics('resource', metrics);
    }

    // Record paint timing metrics
    recordPaintMetrics(entry) {
        const metrics = {
            type: 'paint',
            name: entry.name,
            startTime: entry.startTime,
            timestamp: Date.now()
        };

        this.storeMetrics('paint', metrics);
    }

    // Store metrics with automatic cleanup
    storeMetrics(type, metrics) {
        if (!this.metrics.has(type)) {
            this.metrics.set(type, []);
        }

        const typeMetrics = this.metrics.get(type);
        typeMetrics.push(metrics);

        // Keep only last 100 entries per type
        if (typeMetrics.length > 100) {
            typeMetrics.splice(0, typeMetrics.length - 100);
        }

        // Notify observers
        this.notifyObservers(type, metrics);
    }

    // Manual tool performance tracking
    trackToolLoad(toolId, startTime) {
        const loadTime = Date.now() - startTime;
        const metrics = {
            toolId,
            loadTime,
            timestamp: Date.now(),
            success: true
        };

        this.storeMetrics('tool', metrics);

        // Update global config if available
        if (window.ToolsConfig?.methods?.updateToolPerformance) {
            window.ToolsConfig.methods.updateToolPerformance(toolId, {
                loadTime,
                lastTested: new Date().toISOString()
            });
        }

        return metrics;
    }

    // Track tool error
    trackToolError(toolId, error, startTime) {
        const loadTime = startTime ? Date.now() - startTime : null;
        const metrics = {
            toolId,
            loadTime,
            error: error.message || error,
            timestamp: Date.now(),
            success: false
        };

        this.storeMetrics('tool', metrics);

        // Update global config if available
        if (window.ToolsConfig?.methods?.updateToolPerformance) {
            window.ToolsConfig.methods.updateToolPerformance(toolId, {
                loadTime,
                lastError: error.message || error,
                lastTested: new Date().toISOString()
            });
        }

        return metrics;
    }

    // Track API call performance
    trackApiCall(endpoint, method, startTime, success = true, error = null) {
        const duration = Date.now() - startTime;
        const metrics = {
            type: 'api',
            endpoint,
            method,
            duration,
            success,
            error: error?.message || error,
            timestamp: Date.now()
        };

        this.storeMetrics('api', metrics);
        return metrics;
    }

    // Get performance summary
    getPerformanceSummary(type = 'all') {
        if (type === 'all') {
            const summary = {};
            for (const [key, value] of this.metrics) {
                summary[key] = this.calculateSummary(value);
            }
            return summary;
        }

        const metrics = this.metrics.get(type) || [];
        return this.calculateSummary(metrics);
    }

    // Calculate summary statistics
    calculateSummary(metrics) {
        if (metrics.length === 0) {
            return { count: 0, average: 0, min: 0, max: 0, successRate: 0 };
        }

        const durations = metrics
            .filter(m => m.loadTime || m.duration)
            .map(m => m.loadTime || m.duration);

        const successCount = metrics.filter(m => m.success !== false).length;
        const totalCount = metrics.length;

        return {
            count: totalCount,
            average: durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
            min: durations.length > 0 ? Math.min(...durations) : 0,
            max: durations.length > 0 ? Math.max(...durations) : 0,
            successRate: Math.round((successCount / totalCount) * 100),
            lastUpdated: new Date().toISOString()
        };
    }

    // Get tool-specific performance
    getToolPerformance(toolId) {
        const toolMetrics = (this.metrics.get('tool') || [])
            .filter(m => m.toolId === toolId);

        return this.calculateSummary(toolMetrics);
    }

    // Get performance by category
    getCategoryPerformance(categoryId) {
        if (!window.ToolsConfig?.categories?.[categoryId]) {
            return { count: 0, average: 0, min: 0, max: 0, successRate: 0 };
        }

        const categoryTools = window.ToolsConfig.categories[categoryId].tools;
        const categoryMetrics = (this.metrics.get('tool') || [])
            .filter(m => categoryTools.includes(m.toolId));

        return this.calculateSummary(categoryMetrics);
    }

    // Observer pattern for real-time updates
    addObserver(type, callback) {
        if (!this.observers.has(type)) {
            this.observers.set(type, []);
        }
        this.observers.get(type).push(callback);
    }

    removeObserver(type, callback) {
        if (this.observers.has(type)) {
            const callbacks = this.observers.get(type);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    notifyObservers(type, metrics) {
        if (this.observers.has(type)) {
            this.observers.get(type).forEach(callback => {
                try {
                    callback(metrics);
                } catch (error) {
                    console.warn('Observer callback error:', error);
                }
            });
        }
    }

    // Performance health check
    getPerformanceHealth() {
        const toolSummary = this.getPerformanceSummary('tool');
        const thresholds = this.config.performance || {
            loadTime: { excellent: 1000, good: 3000, poor: 5000 },
            successRate: { excellent: 99, good: 95, poor: 90 }
        };

        let health = 'excellent';

        if (toolSummary.average > thresholds.loadTime.poor || toolSummary.successRate < thresholds.successRate.poor) {
            health = 'poor';
        } else if (toolSummary.average > thresholds.loadTime.good || toolSummary.successRate < thresholds.successRate.good) {
            health = 'good';
        }

        return {
            health,
            score: toolSummary.successRate,
            averageLoadTime: toolSummary.average,
            totalTools: toolSummary.count,
            recommendations: this.getPerformanceRecommendations(toolSummary, thresholds)
        };
    }

    // Get performance recommendations
    getPerformanceRecommendations(summary, thresholds) {
        const recommendations = [];

        if (summary.average > thresholds.loadTime.good) {
            recommendations.push('Consider optimizing tool load times');
        }

        if (summary.successRate < thresholds.successRate.good) {
            recommendations.push('Investigate tool error rates');
        }

        if (summary.count < 5) {
            recommendations.push('Run more tests to get better performance data');
        }

        return recommendations;
    }

    // Export metrics for analysis
    exportMetrics(format = 'json') {
        const data = {
            timestamp: new Date().toISOString(),
            version: this.config.version || '2.1.0',
            metrics: Object.fromEntries(this.metrics),
            summary: this.getPerformanceSummary(),
            health: this.getPerformanceHealth()
        };

        if (format === 'csv') {
            return this.convertToCSV(data);
        }

        return data;
    }

    // Convert metrics to CSV format
    convertToCSV(data) {
        const lines = ['timestamp,type,toolId,loadTime,success,error'];

        for (const [type, metrics] of this.metrics) {
            metrics.forEach(metric => {
                const line = [
                    new Date(metric.timestamp).toISOString(),
                    type,
                    metric.toolId || '',
                    metric.loadTime || metric.duration || '',
                    metric.success !== false ? 'true' : 'false',
                    (metric.error || '').replace(/,/g, ';')
                ].join(',');
                lines.push(line);
            });
        }

        return lines.join('\n');
    }

    // Cleanup old metrics
    startPeriodicCleanup() {
        setInterval(() => {
            const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days

            for (const [type, metrics] of this.metrics) {
                const filtered = metrics.filter(m => m.timestamp > cutoff);
                this.metrics.set(type, filtered);
            }
        }, 60 * 60 * 1000); // Run every hour
    }

    // Clear all metrics
    clearMetrics() {
        this.metrics.clear();
    }

    // Get real-time performance dashboard data
    getDashboardData() {
        const toolSummary = this.getPerformanceSummary('tool');
        const health = this.getPerformanceHealth();

        return {
            totalTools: toolSummary.count,
            averageLoadTime: toolSummary.average,
            successRate: toolSummary.successRate,
            healthStatus: health.health,
            healthScore: health.score,
            recommendations: health.recommendations,
            lastUpdated: new Date().toISOString()
        };
    }
}

// Create global instance
window.PerformanceMonitor = new PerformanceMonitor();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PerformanceMonitor;
}
