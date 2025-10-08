# 🧠 BetTicker Diagnostic Tools

A comprehensive suite of diagnostic tools designed to identify, troubleshoot, and resolve issues with BetTicker data capture in the betting-brain-v3 system.

## 🎯 Quick Start

**➡️ [Open Enhanced Tools Hub](index.html)** - Single entry point for all testing and diagnostic tools

### 🆕 New in Version 2.1
- **🔍 Enhanced Search** - Real-time search across all tools
- **📊 Performance Metrics** - Automatic performance monitoring
- **🧪 Automated Testing** - Built-in test suite with controls
- **⚙️ Configuration Management** - Centralized tool configuration
- **📈 Real-time Status** - Live system health monitoring
- **🎨 Enhanced UI** - Modern glass morphism design

**📚 [Enhanced Features Guide](docs/ENHANCED_FEATURES_GUIDE.md)** - Complete guide to new features

## 🎯 Problem Overview

The primary issue being addressed is: **"New data isn't being captured"** - where the dashboard shows old or no data despite the system being deployed. This comprehensive diagnostic system helps identify the root cause and provides step-by-step solutions.

## 📁 Directory Structure

The tools are now organized into logical categories for better navigation and maintenance:

```
tools/
├── index.html                    # Main tools hub
├── README.md                     # This documentation
├── organize-files.sh            # Organization script
├── diagnostics/                  # System health & troubleshooting
│   ├── system-health-monitor.html
│   ├── troubleshooting-guide.html
│   └── diagnostic-suite.html
├── setup/                       # Installation & configuration
│   ├── setup-wizard.html
│   └── extension-checker.html
├── testing/                     # Test suites & validation
│   ├── extension-test-suite.html
│   ├── flow-tester.html
│   ├── test-interceptor-with-auth.html
│   ├── extension-injection-tester.html
│   ├── test-extension.html
│   └── test-injection.html
├── data/                        # Data capture & analysis
│   ├── capture-live-data.html
│   ├── test-data-filtering.html
│   └── test-dashboard.html
├── logging/                     # Log monitoring
│   ├── log-monitor.js
│   └── log-viewer.html
└── automation/                  # Automation tools
    └── (empty - ready for future tools)
```

## 🛠️ Diagnostic Tools Suite

The tools are now organized into logical categories for better navigation and maintenance:

### 🏥 Diagnostics & Monitoring
**Location:** `diagnostics/`

#### System Health Monitor
**File:** `diagnostics/system-health-monitor.html`

**Purpose:** Real-time monitoring of all system components with comprehensive health checks.

**Features:**
- 🔍 Component-wise health monitoring (Worker, KV Storage, Extension, Network, Data Flow)
- 📊 Real-time metrics and status indicators
- 🚨 Critical alerts and warnings
- 📡 Live log streaming
- 🧪 Quick action buttons for testing
- 📄 Comprehensive diagnostic report generation

**Use When:** You need a complete overview of system health or want to monitor multiple components simultaneously.

#### Automated Troubleshooting Guide
**File:** `diagnostics/troubleshooting-guide.html`

**Purpose:** Intelligent problem diagnosis with step-by-step resolution guides.

**Features:**
- 🎯 Problem-specific diagnosis (No Data, Extension Issues, Worker Problems, etc.)
- 🔍 Automated diagnostic steps with progress tracking
- 📋 Interactive troubleshooting checklist
- ⚡ Quick fix buttons for common issues
- 📊 Real-time system monitoring
- 📄 Troubleshooting report generation

**Use When:** You know there's a problem but need help identifying and fixing it systematically.

#### Diagnostic Suite (Legacy)
**File:** `diagnostics/diagnostic-suite.html`

**Purpose:** Legacy comprehensive system diagnostics and data flow monitoring tool.

**Features:**
- 🔬 Comprehensive system analysis
- 📊 Data flow monitoring
- 🧪 Component testing
- 📄 Detailed reporting

**Use When:** You need legacy diagnostic functionality or comprehensive system analysis.

---

### ⚙️ Setup & Configuration
**Location:** `setup/`

#### Setup Wizard
**File:** `setup/setup-wizard.html`

**Purpose:** Complete system installation and verification from scratch.

**Features:**
- 📋 Prerequisites checking and validation
- ☁️ Step-by-step worker deployment guidance
- 🧩 Browser extension installation and verification
- 🧪 End-to-end testing with automated validation
- ✅ Final system verification
- 📄 Setup completion report

**Use When:** Setting up the system for the first time or verifying a complete installation.

#### Extension Checker
**File:** `setup/extension-checker.html`

**Purpose:** Browser extension installation, configuration, and debugging.

**Features:**
- 📦 Installation status verification
- 🔄 Live redirection testing
- 👀 Manual verification steps
- 🔧 Troubleshooting guidance
- 🔗 Quick access to essential pages

**Use When:** You suspect browser extension issues or need to verify extension functionality.

---

### 🧪 Testing & Validation
**Location:** `testing/`

#### Extension Test Suite
**File:** `testing/extension-test-suite.html`

**Purpose:** Comprehensive automated testing for the browser extension.

**Features:**
- 🧪 10 automated tests
- 📊 Detailed reporting and stats tracking
- 🔄 Real-time test execution
- 📄 Comprehensive test results

**Use When:** You need to validate extension functionality or run automated tests.

#### End-to-End Flow Tester
**File:** `testing/flow-tester.html`

**Purpose:** Complete data flow validation from browser to KV storage.

**Features:**
- 🔄 Visual flow diagram showing data path
- 🧪 Individual component testing
- 📡 Live monitoring with real-time updates
- 🎯 Simulated BetTicker requests
- 💾 KV storage inspector with record viewing
- 🔧 Automated troubleshooting recommendations

**Use When:** You need to test the complete data pipeline or identify where the flow is breaking.

#### Test Interceptor with Auth
**File:** `testing/test-interceptor-with-auth.html`

**Purpose:** Test the BetTicker interceptor with authentication and cookie handling.

**Features:**
- 🔐 Authentication testing
- 🍪 Cookie handling validation
- 🔄 Request interception testing
- 📊 Auth flow analysis

**Use When:** You need to test authentication flows or cookie handling in the interceptor.

---

### 📊 Data Capture & Analysis
**Location:** `data/`

#### Capture Live Data
**File:** `data/capture-live-data.html`

**Purpose:** Capture fresh betting data directly from the live site for testing and analysis.

**Features:**
- 📡 Live data capture
- 🎯 Real betting data
- 📊 Data analysis tools
- 💾 Data storage options

**Use When:** You need fresh data for testing or analysis purposes.

#### Test Data Filtering
**File:** `data/test-data-filtering.html`

**Purpose:** Test and validate data filtering logic for betting data processing.

**Features:**
- 🎯 Filter testing
- 📊 Data validation
- 🔍 Filter logic analysis
- 📄 Test results

**Use When:** You need to test data filtering logic or validate data processing.

#### Test Dashboard
**File:** `data/test-dashboard.html`

**Purpose:** Test dashboard functionality and data visualization components.

**Features:**
- 📊 Dashboard testing
- 📈 Visualization validation
- 🧪 Component testing
- 📄 Test results

**Use When:** You need to test dashboard functionality or data visualization components.

---

## 🆕 Enhanced Features (Version 2.1)

### 🔍 Advanced Search & Navigation
- **Real-time search** across all tools by name, description, or tags
- **Search highlighting** with visual feedback
- **Breadcrumb navigation** for better orientation
- **Category-based filtering** with color coding

### 📊 Performance Monitoring
- **Automatic performance tracking** for all tools
- **Load time monitoring** with thresholds
- **Success rate calculation** and trending
- **Health score assessment** with recommendations
- **Performance dashboard** with real-time metrics

### 🧪 Automated Testing System
- **Comprehensive test suite** with 6 different test types
- **Tool availability testing** - Verify all tools are accessible
- **Performance testing** - Measure load times and success rates
- **API endpoint testing** - Validate backend connectivity
- **Browser compatibility testing** - Check feature support
- **Search functionality testing** - Verify search works correctly
- **Status monitoring testing** - Validate status indicators

### ⚙️ Configuration Management
- **Centralized configuration** for all tools and categories
- **Tool metadata** with dependencies and performance data
- **Category management** with visual properties
- **Performance thresholds** and health criteria
- **Search and filtering** capabilities across configuration

### 📈 Real-time Status Dashboard
- **Live system health** monitoring with visual indicators
- **Worker status** with automatic updates
- **KV Storage status** tracking
- **Extension status** monitoring
- **Data flow status** validation
- **Auto-refresh** every 30 seconds

### 🎨 Enhanced User Interface
- **Glass morphism design** with backdrop blur effects
- **Smooth animations** and transitions
- **Responsive design** for all screen sizes
- **Color-coded status** indicators
- **Interactive elements** with hover effects
- **Accessibility features** for better usability

---

## 🔗 Enhanced Worker Endpoints

The diagnostic system includes enhanced worker endpoints for comprehensive monitoring:

### `/diagnostics`
- Complete system diagnostics
- Component health checks
- Configuration validation
- Performance metrics

### `/logs`
- Recent activity logs
- Error tracking
- Request/response logging
- System event monitoring

### `/system-status`
- Real-time system status
- KV storage metrics
- Data freshness indicators
- Health assessment

## 🚀 Quick Start Guide

### Step 1: Initial Diagnosis
1. Open **System Health Monitor** (`tools/diagnostics/system-health-monitor.html`)
2. Click "🔄 Run Full Check"
3. Review critical alerts and component status
4. Note any red indicators or error messages

### Step 2: Problem Identification
1. If issues found, open **Troubleshooting Guide** (`tools/diagnostics/troubleshooting-guide.html`)
2. Select the problem type that matches your symptoms
3. Click "🚀 Run Diagnosis"
4. Follow the automated troubleshooting steps

### Step 3: Flow Testing
1. Open **Flow Tester** (`tools/testing/flow-tester.html`)
2. Click "🚀 Run Full Test"
3. Review the visual flow diagram for failures
4. Use individual component tests if needed

### Step 4: Extension Verification
1. Open **Extension Checker** (`tools/setup/extension-checker.html`)
2. Follow the manual verification steps
3. Test redirection functionality
4. Verify extension status

### Step 5: Complete Setup (if needed)
1. Open **Setup Wizard** (`tools/setup/setup-wizard.html`)
2. Follow all 5 steps for complete system setup
3. Generate setup completion report

## 🎯 Common Issues and Solutions

### 📭 No Data in Dashboard
**Likely Causes:**
- Browser extension not installed/enabled
- No traffic to fantasy402.com
- Extension not redirecting requests
- Worker not receiving requests

**Quick Fix:**
1. Use Extension Checker (`tools/setup/extension-checker.html`) to verify installation
2. Visit fantasy402.com and navigate betting pages
3. Check for redirected requests in DevTools

### 🧩 Extension Not Working
**Likely Causes:**
- Extension not installed properly
- Developer mode not enabled
- Redirect rules not active
- Extension disabled

**Quick Fix:**
1. Go to `chrome://extensions/`
2. Enable Developer mode
3. Reload extension
4. Verify "ON" badge appears

### ☁️ Worker Issues
**Likely Causes:**
- Worker not deployed
- Configuration errors
- KV binding issues
- Network connectivity problems

**Quick Fix:**
1. Run `wrangler deploy`
2. Check `wrangler.toml` configuration
3. Verify KV namespace binding
4. Test worker health endpoint

### 💾 KV Storage Problems
**Likely Causes:**
- KV namespace not configured
- Binding permissions missing
- Data not being stored
- TTL issues

**Quick Fix:**
1. Check KV namespace in Cloudflare dashboard
2. Verify BET_TICKER_RAW binding
3. Test KV write/read operations
4. Check data retention settings

## 📊 Integration with Existing Tools

The diagnostic system integrates seamlessly with existing components:

- **Dashboard**: Real-time data display and monitoring
- **Worker**: Enhanced endpoints for diagnostics
- **Browser Extension**: Redirect functionality and status tracking
- **KV Storage**: Data persistence and retrieval

## 🔧 Advanced Features

### Real-time Monitoring
- Continuous system health checks
- Automatic alert generation
- Live log streaming
- Performance metrics tracking

### Automated Diagnostics
- Intelligent problem detection
- Step-by-step resolution guides
- Component-specific troubleshooting
- Progress tracking and reporting

### Interactive Testing
- Simulated request testing
- End-to-end flow validation
- Component isolation testing
- Real-time result visualization

## 📈 Monitoring and Alerting

### Health Metrics
- Worker response time and availability
- KV storage performance and capacity
- Data freshness and consistency
- Network connectivity and latency

### Alert Levels
- 🟢 **Info**: Normal operation
- 🟡 **Warning**: Potential issues
- 🔴 **Critical**: System failures
- 🔵 **Error**: Component errors

## 🛡️ Best Practices

### Regular Monitoring
1. Check System Health Monitor daily
2. Review data freshness every few hours
3. Monitor for unusual patterns or errors
4. Generate weekly diagnostic reports

### Proactive Maintenance
1. Test extension functionality weekly
2. Verify worker deployment status
3. Check KV storage capacity and performance
4. Update and patch components as needed

### Troubleshooting Workflow
1. Start with System Health Monitor for overview
2. Use specific tools based on symptoms
3. Follow automated troubleshooting guides
4. Document issues and resolutions for future reference

## 📚 Documentation

- **[README.md](README.md)** - This comprehensive guide
- **[Enhanced Features Guide](docs/ENHANCED_FEATURES_GUIDE.md)** - New features documentation
- **[Complete Tools Index](docs/TOOLS_INDEX.md)** - Comprehensive index of all 18 tools

## 📚 Additional Resources

- **Main Dashboard**: `../dashboard.html`
- **Original Diagnostics**: `../diagnostic-suite.html`
- **Worker Documentation**: `../docs/DEPLOYMENT.md`
- **Extension Guide**: `../browser-extension/README.md`

## 🆘 Support

For issues with the diagnostic tools themselves:
1. Check browser console for JavaScript errors
2. Verify network connectivity to worker endpoints
3. Ensure all tools are accessed via HTTP/HTTPS (not file://)
4. Clear browser cache and reload if needed

---

**🎯 Remember:** The diagnostic tools are designed to work together as a comprehensive system. Start with the System Health Monitor for an overview, then use specific tools based on what you discover. The Setup Wizard is perfect for new installations, while the Troubleshooting Guide excels at resolving existing issues.
