/**
 * Centralized Configuration Management for Tools Hub
 * Version: 2.1.0
 * Last Updated: 2025-01-08
 */

// Global configuration object
window.ToolsConfig = {
    // Version information
    version: "2.1.0",
    lastUpdated: "2025-01-08",

    // Worker configuration
    worker: {
        baseUrl: window.location.origin,
        healthEndpoint: "/health",
        diagnosticsEndpoint: "/diagnostics",
        logsEndpoint: "/logs",
        systemStatusEndpoint: "/system-status",
        timeout: 10000, // 10 seconds
        retryAttempts: 3,
        retryDelay: 1000 // 1 second
    },

    // Tool categories and their configurations
    categories: {
        diagnostics: {
            name: "Diagnostics & Monitoring",
            icon: "🏥",
            color: "#3b82f6",
            description: "System health monitoring and troubleshooting tools",
            tools: [
                "system-health-monitor",
                "troubleshooting-guide",
                "diagnostic-suite"
            ]
        },
        setup: {
            name: "Setup & Configuration",
            icon: "⚙️",
            color: "#10b981",
            description: "Installation and configuration tools",
            tools: [
                "setup-wizard",
                "extension-checker"
            ]
        },
        testing: {
            name: "Testing & Validation",
            icon: "🧪",
            color: "#8b5cf6",
            description: "Test suites and validation tools",
            tools: [
                "extension-test-suite",
                "flow-tester",
                "test-interceptor-with-auth",
                "extension-injection-tester",
                "test-extension",
                "test-injection"
            ]
        },
        data: {
            name: "Data Capture & Analysis",
            icon: "📊",
            color: "#f59e0b",
            description: "Data capture and analysis tools",
            tools: [
                "capture-live-data",
                "test-data-filtering",
                "test-dashboard"
            ]
        },
        logging: {
            name: "Logging & Monitoring",
            icon: "📝",
            color: "#06b6d4",
            description: "Log monitoring and analysis tools",
            tools: [
                "log-viewer",
                "log-monitor"
            ]
        },
        automation: {
            name: "Automation & DevOps",
            icon: "🤖",
            color: "#dc2626",
            description: "Automated deployment and DevOps tools",
            tools: [
                "automated-deployment",
                "health-check-automation"
            ]
        }
    },

    // Tool definitions with metadata
    tools: {
        "system-health-monitor": {
            name: "System Health Monitor",
            category: "diagnostics",
            path: "diagnostics/system-health-monitor.html",
            status: "online",
            priority: "essential",
            description: "Real-time monitoring of all system components with comprehensive health checks and diagnostics",
            tags: ["monitoring", "health", "real-time", "alerts", "diagnostics"],
            features: ["Live Monitoring", "Auto-refresh", "Alerts"],
            dependencies: ["worker"],
            lastTested: null,
            performance: {
                loadTime: null,
                successRate: null,
                lastError: null
            }
        },
        "troubleshooting-guide": {
            name: "Troubleshooting Guide",
            category: "diagnostics",
            path: "diagnostics/troubleshooting-guide.html",
            status: "online",
            priority: "essential",
            description: "Intelligent problem diagnosis with step-by-step resolution guides for common issues",
            tags: ["troubleshooting", "diagnosis", "problem-solving", "guides"],
            features: ["Smart Diagnosis", "Step-by-Step", "Reports"],
            dependencies: ["worker"],
            lastTested: null,
            performance: {
                loadTime: null,
                successRate: null,
                lastError: null
            }
        },
        "diagnostic-suite": {
            name: "Diagnostic Suite",
            category: "diagnostics",
            path: "diagnostics/diagnostic-suite.html",
            status: "legacy",
            priority: "advanced",
            description: "Legacy comprehensive system diagnostics and data flow monitoring tool",
            tags: ["legacy", "comprehensive", "diagnostics", "monitoring"],
            features: ["Legacy", "Comprehensive"],
            dependencies: ["worker"],
            lastTested: null,
            performance: {
                loadTime: null,
                successRate: null,
                lastError: null
            }
        },
        "setup-wizard": {
            name: "Setup Wizard",
            category: "setup",
            path: "setup/setup-wizard.html",
            status: "online",
            priority: "essential",
            description: "Complete system installation and verification from scratch with 5-step guided process",
            tags: ["setup", "installation", "wizard", "guided", "verification"],
            features: ["5 Steps", "Guided", "Verification"],
            dependencies: ["worker", "kv"],
            lastTested: null,
            performance: {
                loadTime: null,
                successRate: null,
                lastError: null
            }
        },
        "extension-checker": {
            name: "Extension Checker",
            category: "setup",
            path: "setup/extension-checker.html",
            status: "online",
            priority: "essential",
            description: "Browser extension installation, configuration, and debugging with live redirection tests",
            tags: ["extension", "browser", "installation", "testing", "debugging"],
            features: ["Live Tests", "Manual Steps", "Quick Links"],
            dependencies: ["extension"],
            lastTested: null,
            performance: {
                loadTime: null,
                successRate: null,
                lastError: null
            }
        },
        "extension-test-suite": {
            name: "Extension Test Suite",
            category: "testing",
            path: "testing/extension-test-suite.html",
            status: "online",
            priority: "new",
            description: "Comprehensive automated testing for the browser extension with detailed reporting and stats tracking",
            tags: ["testing", "extension", "automated", "reporting", "stats"],
            features: ["10 Tests", "Automated", "Stats"],
            dependencies: ["extension", "worker"],
            lastTested: null,
            performance: {
                loadTime: null,
                successRate: null,
                lastError: null
            }
        },
        "flow-tester": {
            name: "End-to-End Flow Tester",
            category: "testing",
            path: "testing/flow-tester.html",
            status: "online",
            priority: "essential",
            description: "Complete data flow validation from browser to KV storage with visual flow diagram",
            tags: ["testing", "flow", "validation", "visual", "kv", "storage"],
            features: ["Visual Flow", "KV Inspector", "Live Monitor"],
            dependencies: ["worker", "kv", "extension"],
            lastTested: null,
            performance: {
                loadTime: null,
                successRate: null,
                lastError: null
            }
        },
        "test-interceptor-with-auth": {
            name: "Test Interceptor with Auth",
            category: "testing",
            path: "testing/test-interceptor-with-auth.html",
            status: "online",
            priority: "advanced",
            description: "Test the BetTicker interceptor with authentication and cookie handling",
            tags: ["testing", "interceptor", "auth", "authentication", "cookies"],
            features: ["Auth", "Cookies"],
            dependencies: ["extension", "worker"],
            lastTested: null,
            performance: {
                loadTime: null,
                successRate: null,
                lastError: null
            }
        },
        "capture-live-data": {
            name: "Capture Live Data",
            category: "data",
            path: "data/capture-live-data.html",
            status: "online",
            priority: "advanced",
            description: "Capture fresh betting data directly from the live site for testing and analysis",
            tags: ["data", "capture", "live", "betting", "analysis", "testing"],
            features: ["Live Capture", "Real Data"],
            dependencies: ["worker"],
            lastTested: null,
            performance: {
                loadTime: null,
                successRate: null,
                lastError: null
            }
        },
        "test-data-filtering": {
            name: "Test Data Filtering",
            category: "data",
            path: "data/test-data-filtering.html",
            status: "online",
            priority: "advanced",
            description: "Test and validate data filtering logic for betting data processing",
            tags: ["data", "filtering", "testing", "validation", "processing"],
            features: ["Filters", "Testing"],
            dependencies: ["worker"],
            lastTested: null,
            performance: {
                loadTime: null,
                successRate: null,
                lastError: null
            }
        },
        "test-dashboard": {
            name: "Test Dashboard",
            category: "data",
            path: "data/test-dashboard.html",
            status: "online",
            priority: "advanced",
            description: "Test dashboard functionality and data visualization components",
            tags: ["dashboard", "testing", "visualization", "components"],
            features: ["Dashboard", "Visualization"],
            dependencies: ["worker"],
            lastTested: null,
            performance: {
                loadTime: null,
                successRate: null,
                lastError: null
            }
        },
        "log-viewer": {
            name: "Log Viewer",
            category: "logging",
            path: "logging/log-viewer.html",
            status: "online",
            priority: "essential",
            description: "Real-time log monitoring and viewing for extension and worker logs with filtering and search capabilities",
            tags: ["logs", "monitoring", "real-time", "filtering", "search"],
            features: ["Real-time", "Filtering", "Search"],
            dependencies: ["worker"],
            lastTested: null,
            performance: {
                loadTime: null,
                successRate: null,
                lastError: null
            }
        },
        "log-monitor": {
            name: "Log Monitor (CLI)",
            category: "logging",
            path: "logging/log-monitor.js",
            status: "online",
            priority: "advanced",
            description: "Command-line log monitoring tool for real-time extension and worker log analysis with statistics",
            tags: ["logs", "cli", "monitoring", "statistics", "real-time"],
            features: ["CLI Tool", "Statistics", "Real-time"],
            dependencies: ["worker"],
            lastTested: null,
            performance: {
                loadTime: null,
                successRate: null,
                lastError: null
            }
        },
        "automated-deployment": {
            name: "Automated Deployment",
            category: "automation",
            path: "automation/automated-deployment.html",
            status: "online",
            priority: "essential",
            description: "Automated deployment pipeline for BetTicker system with comprehensive validation and rollback capabilities",
            tags: ["deployment", "pipeline", "staging", "production", "rollback", "devops"],
            features: ["Pipeline", "Validation", "Rollback"],
            dependencies: ["worker", "kv"],
            lastTested: null,
            performance: {
                loadTime: null,
                successRate: null,
                lastError: null
            }
        },
        "health-check-automation": {
            name: "Health Check Automation",
            category: "automation",
            path: "automation/health-check-automation.html",
            status: "online",
            priority: "essential",
            description: "Automated health monitoring and alerting system for BetTicker infrastructure with real-time checks",
            tags: ["health", "monitoring", "alerts", "automation", "real-time"],
            features: ["Monitoring", "Alerts", "Real-time"],
            dependencies: ["worker", "kv", "extension"],
            lastTested: null,
            performance: {
                loadTime: null,
                successRate: null,
                lastError: null
            }
        }
    },

    // Performance thresholds
    performance: {
        loadTime: {
            excellent: 1000, // 1 second
            good: 3000,      // 3 seconds
            poor: 5000       // 5 seconds
        },
        successRate: {
            excellent: 99,   // 99%
            good: 95,        // 95%
            poor: 90         // 90%
        }
    },

    // UI configuration
    ui: {
        theme: "dark",
        autoRefresh: true,
        refreshInterval: 30000, // 30 seconds
        showPerformanceMetrics: true,
        enableSearch: true,
        enableStatusMonitoring: true,
        animations: true,
        compactMode: false
    },

    // Logging configuration
    logging: {
        enabled: true,
        level: "info", // debug, info, warn, error
        maxEntries: 1000,
        retentionDays: 7
    },

    // Methods for configuration management
    methods: {
        // Get tool configuration
        getTool: function (toolId) {
            return this.tools[toolId] || null;
        },

        // Get category configuration
        getCategory: function (categoryId) {
            return this.categories[categoryId] || null;
        },

        // Get all tools in a category
        getToolsInCategory: function (categoryId) {
            const category = this.getCategory(categoryId);
            if (!category) return [];

            return category.tools.map(toolId => this.getTool(toolId)).filter(Boolean);
        },

        // Update tool status
        updateToolStatus: function (toolId, status) {
            if (this.tools[toolId]) {
                this.tools[toolId].status = status;
                this.tools[toolId].lastUpdated = new Date().toISOString();
            }
        },

        // Update tool performance
        updateToolPerformance: function (toolId, performanceData) {
            if (this.tools[toolId]) {
                this.tools[toolId].performance = {
                    ...this.tools[toolId].performance,
                    ...performanceData,
                    lastUpdated: new Date().toISOString()
                };
            }
        },

        // Get tools by status
        getToolsByStatus: function (status) {
            return Object.values(this.tools).filter(tool => tool.status === status);
        },

        // Get tools by priority
        getToolsByPriority: function (priority) {
            return Object.values(this.tools).filter(tool => tool.priority === priority);
        },

        // Search tools
        searchTools: function (query) {
            const searchTerm = query.toLowerCase();
            return Object.values(this.tools).filter(tool =>
                tool.name.toLowerCase().includes(searchTerm) ||
                tool.description.toLowerCase().includes(searchTerm) ||
                tool.tags.some(tag => tag.toLowerCase().includes(searchTerm))
            );
        },

        // Get system health summary
        getSystemHealth: function () {
            const tools = Object.values(this.tools);
            const total = tools.length;
            const online = tools.filter(tool => tool.status === 'online').length;
            const offline = tools.filter(tool => tool.status === 'offline').length;
            const unknown = tools.filter(tool => tool.status === 'unknown').length;
            const legacy = tools.filter(tool => tool.status === 'legacy').length;

            return {
                total,
                online,
                offline,
                unknown,
                legacy,
                healthPercentage: Math.round((online / total) * 100)
            };
        }
    }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.ToolsConfig;
}
