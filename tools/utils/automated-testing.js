/**
 * Automated Testing System for Tools Hub
 * Version: 2.1.0
 * Last Updated: 2025-01-08
 */

class AutomatedTesting {
    constructor() {
        this.tests = new Map();
        this.results = new Map();
        this.isRunning = false;
        this.config = window.ToolsConfig || {};
        this.performanceMonitor = window.PerformanceMonitor;

        this.initializeTests();
    }

    // Initialize all available tests
    initializeTests() {
        // Tool availability tests
        this.addTest('tool-availability', this.testToolAvailability.bind(this));

        // Tool load performance tests
        this.addTest('tool-performance', this.testToolPerformance.bind(this));

        // API endpoint tests
        this.addTest('api-endpoints', this.testApiEndpoints.bind(this));

        // Browser compatibility tests
        this.addTest('browser-compatibility', this.testBrowserCompatibility.bind(this));

        // Search functionality tests
        this.addTest('search-functionality', this.testSearchFunctionality.bind(this));

        // Status monitoring tests
        this.addTest('status-monitoring', this.testStatusMonitoring.bind(this));
    }

    // Add a test to the test suite
    addTest(testId, testFunction, options = {}) {
        this.tests.set(testId, {
            id: testId,
            function: testFunction,
            name: options.name || testId,
            description: options.description || '',
            category: options.category || 'general',
            priority: options.priority || 'medium',
            timeout: options.timeout || 30000,
            retries: options.retries || 1,
            enabled: options.enabled !== false
        });
    }

    // Run a specific test
    async runTest(testId) {
        const test = this.tests.get(testId);
        if (!test || !test.enabled) {
            throw new Error(`Test ${testId} not found or disabled`);
        }

        const startTime = Date.now();
        let lastError = null;
        let attempts = 0;

        while (attempts < test.retries) {
            try {
                attempts++;
                const result = await Promise.race([
                    test.function(),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Test timeout')), test.timeout)
                    )
                ]);

                const duration = Date.now() - startTime;
                const testResult = {
                    testId,
                    name: test.name,
                    status: 'passed',
                    duration,
                    attempts,
                    result,
                    timestamp: new Date().toISOString()
                };

                this.results.set(testId, testResult);
                return testResult;

            } catch (error) {
                lastError = error;
                if (attempts < test.retries) {
                    await this.delay(1000 * attempts); // Exponential backoff
                }
            }
        }

        const duration = Date.now() - startTime;
        const testResult = {
            testId,
            name: test.name,
            status: 'failed',
            duration,
            attempts,
            error: lastError.message,
            timestamp: new Date().toISOString()
        };

        this.results.set(testId, testResult);
        return testResult;
    }

    // Run all enabled tests
    async runAllTests() {
        if (this.isRunning) {
            throw new Error('Tests are already running');
        }

        this.isRunning = true;
        const startTime = Date.now();
        const results = [];

        try {
            const enabledTests = Array.from(this.tests.values()).filter(test => test.enabled);

            for (const test of enabledTests) {
                try {
                    const result = await this.runTest(test.id);
                    results.push(result);
                } catch (error) {
                    results.push({
                        testId: test.id,
                        name: test.name,
                        status: 'error',
                        error: error.message,
                        timestamp: new Date().toISOString()
                    });
                }
            }

            const duration = Date.now() - startTime;
            const summary = this.generateTestSummary(results, duration);

            return {
                summary,
                results,
                duration,
                timestamp: new Date().toISOString()
            };

        } finally {
            this.isRunning = false;
        }
    }

    // Test tool availability
    async testToolAvailability() {
        const tools = this.config.tools || {};
        const results = [];

        for (const [toolId, tool] of Object.entries(tools)) {
            try {
                const response = await fetch(tool.path, { method: 'HEAD' });
                results.push({
                    toolId,
                    name: tool.name,
                    available: response.ok,
                    status: response.status,
                    statusText: response.statusText
                });
            } catch (error) {
                results.push({
                    toolId,
                    name: tool.name,
                    available: false,
                    error: error.message
                });
            }
        }

        const availableCount = results.filter(r => r.available).length;
        const totalCount = results.length;

        return {
            available: availableCount,
            total: totalCount,
            percentage: Math.round((availableCount / totalCount) * 100),
            details: results
        };
    }

    // Test tool performance
    async testToolPerformance() {
        const tools = this.config.tools || {};
        const results = [];

        for (const [toolId, tool] of Object.entries(tools)) {
            const startTime = Date.now();

            try {
                const response = await fetch(tool.path);
                const loadTime = Date.now() - startTime;

                results.push({
                    toolId,
                    name: tool.name,
                    loadTime,
                    success: response.ok,
                    status: response.status,
                    size: response.headers.get('content-length') || 0
                });

                // Track performance
                if (this.performanceMonitor) {
                    this.performanceMonitor.trackToolLoad(toolId, startTime);
                }

            } catch (error) {
                const loadTime = Date.now() - startTime;
                results.push({
                    toolId,
                    name: tool.name,
                    loadTime,
                    success: false,
                    error: error.message
                });

                // Track error
                if (this.performanceMonitor) {
                    this.performanceMonitor.trackToolError(toolId, error, startTime);
                }
            }
        }

        const successful = results.filter(r => r.success);
        const averageLoadTime = results.reduce((sum, r) => sum + r.loadTime, 0) / results.length;

        return {
            successful: successful.length,
            total: results.length,
            averageLoadTime: Math.round(averageLoadTime),
            details: results
        };
    }

    // Test API endpoints
    async testApiEndpoints() {
        const endpoints = [
            { name: 'Health', url: '/health', method: 'GET' },
            { name: 'Diagnostics', url: '/diagnostics', method: 'GET' },
            { name: 'Logs', url: '/logs', method: 'GET' },
            { name: 'System Status', url: '/system-status', method: 'GET' }
        ];

        const results = [];

        for (const endpoint of endpoints) {
            const startTime = Date.now();

            try {
                const response = await fetch(endpoint.url, { method: endpoint.method });
                const duration = Date.now() - startTime;

                results.push({
                    name: endpoint.name,
                    url: endpoint.url,
                    method: endpoint.method,
                    success: response.ok,
                    status: response.status,
                    duration,
                    size: response.headers.get('content-length') || 0
                });

                // Track API performance
                if (this.performanceMonitor) {
                    this.performanceMonitor.trackApiCall(endpoint.url, endpoint.method, startTime, response.ok);
                }

            } catch (error) {
                const duration = Date.now() - startTime;
                results.push({
                    name: endpoint.name,
                    url: endpoint.url,
                    method: endpoint.method,
                    success: false,
                    error: error.message,
                    duration
                });

                // Track API error
                if (this.performanceMonitor) {
                    this.performanceMonitor.trackApiCall(endpoint.url, endpoint.method, startTime, false, error);
                }
            }
        }

        const successful = results.filter(r => r.success);
        const averageDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

        return {
            successful: successful.length,
            total: results.length,
            averageDuration: Math.round(averageDuration),
            details: results
        };
    }

    // Test browser compatibility
    async testBrowserCompatibility() {
        const features = {
            'Performance Observer': typeof PerformanceObserver !== 'undefined',
            'Fetch API': typeof fetch !== 'undefined',
            'Promise': typeof Promise !== 'undefined',
            'Local Storage': typeof localStorage !== 'undefined',
            'Session Storage': typeof sessionStorage !== 'undefined',
            'WebSocket': typeof WebSocket !== 'undefined',
            'Canvas': typeof HTMLCanvasElement !== 'undefined',
            'WebGL': (() => {
                try {
                    const canvas = document.createElement('canvas');
                    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
                } catch (e) {
                    return false;
                }
            })(),
            'Service Worker': 'serviceWorker' in navigator,
            'Push Notifications': 'PushManager' in window
        };

        const supported = Object.values(features).filter(Boolean).length;
        const total = Object.keys(features).length;

        return {
            supported,
            total,
            percentage: Math.round((supported / total) * 100),
            features
        };
    }

    // Test search functionality
    async testSearchFunctionality() {
        const searchInput = document.getElementById('searchInput');
        if (!searchInput) {
            throw new Error('Search input not found');
        }

        const testQueries = ['health', 'testing', 'setup', 'data', 'monitor'];
        const results = [];

        for (const query of testQueries) {
            // Simulate search input
            searchInput.value = query;
            searchInput.dispatchEvent(new Event('input'));

            // Wait for search to process
            await this.delay(100);

            // Count visible results
            const visibleCards = document.querySelectorAll('.tool-card[style*="block"], .tool-card:not([style*="none"])');
            const hiddenCards = document.querySelectorAll('.tool-card[style*="none"]');

            results.push({
                query,
                visible: visibleCards.length,
                hidden: hiddenCards.length,
                total: visibleCards.length + hiddenCards.length
            });
        }

        // Clear search
        searchInput.value = '';
        searchInput.dispatchEvent(new Event('input'));

        const averageResults = results.reduce((sum, r) => sum + r.visible, 0) / results.length;

        return {
            testQueries: testQueries.length,
            averageResults: Math.round(averageResults),
            details: results
        };
    }

    // Test status monitoring
    async testStatusMonitoring() {
        const statusElements = [
            'workerStatus',
            'workerStatusIndicator',
            'workerStatusText',
            'onlineTools'
        ];

        const results = [];

        for (const elementId of statusElements) {
            const element = document.getElementById(elementId);
            results.push({
                elementId,
                exists: !!element,
                hasContent: element ? element.textContent.trim() !== '' : false,
                isVisible: element ? element.offsetParent !== null : false
            });
        }

        const existing = results.filter(r => r.exists).length;
        const withContent = results.filter(r => r.hasContent).length;
        const visible = results.filter(r => r.isVisible).length;

        return {
            existing,
            withContent,
            visible,
            total: statusElements.length,
            details: results
        };
    }

    // Generate test summary
    generateTestSummary(results, duration) {
        const passed = results.filter(r => r.status === 'passed').length;
        const failed = results.filter(r => r.status === 'failed').length;
        const errors = results.filter(r => r.status === 'error').length;
        const total = results.length;

        return {
            total,
            passed,
            failed,
            errors,
            successRate: Math.round((passed / total) * 100),
            duration,
            timestamp: new Date().toISOString()
        };
    }

    // Get test results
    getTestResults(testId = null) {
        if (testId) {
            return this.results.get(testId) || null;
        }
        return Array.from(this.results.values());
    }

    // Get test summary
    getTestSummary() {
        const results = Array.from(this.results.values());
        if (results.length === 0) {
            return { total: 0, passed: 0, failed: 0, errors: 0, successRate: 0 };
        }

        const passed = results.filter(r => r.status === 'passed').length;
        const failed = results.filter(r => r.status === 'failed').length;
        const errors = results.filter(r => r.status === 'error').length;
        const total = results.length;

        return {
            total,
            passed,
            failed,
            errors,
            successRate: Math.round((passed / total) * 100),
            lastRun: results[results.length - 1]?.timestamp
        };
    }

    // Export test results
    exportResults(format = 'json') {
        const data = {
            timestamp: new Date().toISOString(),
            version: this.config.version || '2.1.0',
            summary: this.getTestSummary(),
            results: Array.from(this.results.values())
        };

        if (format === 'csv') {
            return this.convertToCSV(data);
        }

        return data;
    }

    // Convert results to CSV format
    convertToCSV(data) {
        const lines = ['timestamp,testId,name,status,duration,error'];

        data.results.forEach(result => {
            const line = [
                result.timestamp,
                result.testId,
                result.name,
                result.status,
                result.duration || '',
                (result.error || '').replace(/,/g, ';')
            ].join(',');
            lines.push(line);
        });

        return lines.join('\n');
    }

    // Utility function for delays
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Check if tests are running
    isTestRunning() {
        return this.isRunning;
    }

    // Get available tests
    getAvailableTests() {
        return Array.from(this.tests.values()).map(test => ({
            id: test.id,
            name: test.name,
            description: test.description,
            category: test.category,
            priority: test.priority,
            enabled: test.enabled
        }));
    }
}

// Create global instance
window.AutomatedTesting = new AutomatedTesting();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AutomatedTesting;
}
