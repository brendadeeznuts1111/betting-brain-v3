# 📊 BetTicker Dashboards

**Version:** 3.2.0  
**Last Updated:** 2025-10-08  
**Status:** ✅ Production Ready

---

## 📚 Overview

The BetTicker Dashboards provide real-time betting intelligence and analytics visualization. All dashboards are now refactored to use shared utilities, reducing code duplication by ~60%.

---

## 🎯 Available Dashboards

### 1. **Dashboard Hub** ([`index.html`](index.html))
- **Purpose:** Landing page and dashboard selector
- **Features:** System status, quick actions, feature comparison
- **Use Case:** Starting point for all dashboard access
- **Size:** 357 lines

### 2. **🌲 Floor Control Dashboard** ([`floor-control.html`](floor-control.html)) ⭐ **NEW RECOMMENDED**
- **Purpose:** Complete system monitoring and control center
- **Features:** Floor health, Forest grove status, MCP tools, live odds, scores, database metrics, Fantasy402 integration, cache performance, agent tree visualization, real-time analytics
- **Use Case:** Primary dashboard for system monitoring and management
- **Size:** 1750 lines
- **Badge:** `NEW ⚡ RECOMMENDED`

### 3. **Enhanced Analytics Dashboard** ([`dashboard-enhanced.html`](dashboard-enhanced.html))
- **Purpose:** Comprehensive analytics with charts
- **Features:** Live charts, smart alerts, trend analysis
- **Use Case:** Daily monitoring and deep analysis
- **Size:** 982 lines
- **Badge:** `RECOMMENDED`

### 4. **AI Intelligence Hub** ([`dashboard-pro.html`](dashboard-pro.html))
- **Purpose:** AI-powered insights and automation
- **Features:** Claude AI integration, intelligent insights
- **Use Case:** Advanced analysis and AI-driven recommendations
- **Size:** 1171 lines
- **Badge:** `PRO`

### 5. **Position & Risk Tracker** ([`dashboard-positions.html`](dashboard-positions.html))
- **Purpose:** Real-time position and risk management
- **Features:** Exposure monitoring, risk analysis, agent tracking
- **Use Case:** Risk management and position oversight
- **Size:** 865 lines
- **Badge:** `ADVANCED`

### 6. **Basic Monitoring Dashboard** ([`dashboard.html`](dashboard.html))
- **Purpose:** Simple, clean monitoring view
- **Features:** Real-time data display, basic filtering
- **Use Case:** Quick checks and simple monitoring
- **Size:** 442 lines
- **Badge:** `BASIC`

### 7. **Analytics Enhanced** ([`analytics-enhanced.html`](analytics-enhanced.html))
- **Purpose:** Advanced analytics with enhanced features
- **Features:** Enhanced charts, detailed analytics, performance metrics
- **Use Case:** Advanced analytics and performance monitoring
- **Size:** ~800 lines
- **Badge:** `ENHANCED`

### 8. **Analytics Live** ([`analytics-live.html`](analytics-live.html))
- **Purpose:** Live analytics and real-time monitoring
- **Features:** Live data feeds, real-time updates, streaming analytics
- **Use Case:** Real-time monitoring and live analytics
- **Size:** ~600 lines
- **Badge:** `LIVE`

### 9. **Agent Performance Dashboard** ([`dashboard-agent-performance.html`](dashboard-agent-performance.html))
- **Purpose:** Agent performance monitoring and analysis
- **Features:** Agent metrics, performance tracking, PnL analysis
- **Use Case:** Agent management and performance oversight
- **Size:** ~700 lines
- **Badge:** `AGENT`

### 10. **Sports Dashboard** ([`sports.html`](sports.html))
- **Purpose:** Sports-specific analytics and monitoring
- **Features:** Sports data, live scores, sports analytics
- **Use Case:** Sports betting analytics and monitoring
- **Size:** ~500 lines
- **Badge:** `SPORTS`

---

## 📂 Directory Structure

```
dashboards/
├── index.html                      # Dashboard hub (entry point)
├── floor-control.html              # Floor Control Dashboard ⭐ NEW RECOMMENDED
├── dashboard-enhanced.html          # Enhanced analytics
├── dashboard-pro.html              # AI Intelligence Hub
├── dashboard-positions.html        # Position & Risk Tracker
├── dashboard.html                  # Basic monitoring
├── analytics-enhanced.html         # Analytics Enhanced
├── analytics-live.html             # Analytics Live
├── dashboard-agent-performance.html # Agent Performance Dashboard
├── sports.html                     # Sports Dashboard
├── shared/                         # Shared utilities
│   ├── config.js                   # Central configuration
│   ├── utils.js                    # Common utilities
│   ├── styles.css                  # Shared styles
│   └── charts.js                   # Chart.js helpers
└── README.md                       # This file
```

---

## 🔧 Shared Utilities (NEW)

### **config.js** (300+ lines)
Central configuration for all dashboards:
- `WORKER_URL` - API base URL
- `API_ENDPOINTS` - All endpoint paths
- `REFRESH_INTERVALS` - Auto-refresh settings
- `CHART_COLORS` - Consistent color palette
- `FORMATTERS` - Data formatting functions
- `DEFAULT_CHART_CONFIG` - Chart.js defaults

**Usage:**
```javascript
import { WORKER_URL, API_ENDPOINTS, FORMATTERS } from './shared/config.js';

const url = `${WORKER_URL}${API_ENDPOINTS.health}`;
const formatted = FORMATTERS.currency(123.45); // "$123.45"
```

### **utils.js** (350+ lines)
Common utility functions:
- `fetchWithTimeout()` - Fetch with timeout & error handling
- `checkSystemHealth()` - Health check wrapper
- `fetchInterceptorHistory()` - Get interceptor data
- `fetchAPI()` - Generic API fetcher
- `showToast()` - Toast notifications
- `setupAutoRefresh()` - Auto-refresh with pause/resume
- `storage` - localStorage wrapper

**Usage:**
```javascript
import { fetchAPI, showToast, setupAutoRefresh } from './shared/utils.js';

// Fetch API data
const events = await fetchAPI('apiEvents', { sport: 'NFL', limit: 10 });

// Show notification
showToast('Data loaded successfully', 'success');

// Setup auto-refresh
const refresh = setupAutoRefresh(loadData, 10000);
```

### **styles.css** (400+ lines)
Shared CSS styles:
- Glass morphism effects
- Animation keyframes (pulse, flash, slide-in, fade-in)
- Status colors (success, error, warning, info)
- Card hover effects
- Scrollbar styling
- Responsive utilities

**Usage:**
```html
<link rel="stylesheet" href="./shared/styles.css">

<div class="glass card-hover">
  <span class="status-success">✅ Online</span>
  <div class="pulse">Live</div>
</div>
```

### **charts.js** (300+ lines)
Chart.js configuration and helpers:
- `createLineChart()` - Line chart helper
- `createBarChart()` - Bar chart helper
- `createDoughnutChart()` - Doughnut chart helper
- `createTimeSeriesChart()` - Time series chart
- `createMultiLineChart()` - Multi-line chart
- `addChartDataPoint()` - Add data to existing chart
- `updateChartData()` - Update chart data

**Usage:**
```javascript
import { createLineChart, addChartDataPoint } from './shared/charts.js';

// Create chart
const chart = createLineChart('myChart', {
  labels: ['Jan', 'Feb', 'Mar'],
  datasets: [{
    label: 'Sales',
    data: [100, 200, 150]
  }]
});

// Add new data point
addChartDataPoint(chart, 'Apr', [175], 50);
```

---

## 📊 Features Comparison

| Feature | Floor Control | Enhanced | Pro | Positions | Basic |
|---------|-------------|----------|-----|-----------|-------|
| Real-time Data | ✅ | ✅ | ✅ | ✅ | ✅ |
| Charts & Graphs | ✅ | ✅ | ✅ | ✅ | ❌ |
| Alerts & Notifications | ✅ | ✅ | ✅ | ✅ | ❌ |
| AI Analysis | ❌ | ❌ | ✅ | ❌ | ❌ |
| Risk Management | ✅ | ⚠️ | ✅ | ✅ | ❌ |
| Position Tracking | ✅ | ❌ | ⚠️ | ✅ | ❌ |
| Auto-refresh | ✅ | ✅ | ✅ | ✅ | ✅ |
| Floor Health | ✅ | ❌ | ❌ | ❌ | ❌ |
| Forest Grove | ✅ | ❌ | ❌ | ❌ | ❌ |
| MCP Tools | ✅ | ❌ | ❌ | ❌ | ❌ |
| Fantasy402 Integration | ✅ | ❌ | ❌ | ❌ | ❌ |
| Agent Tree Visualization | ✅ | ❌ | ❌ | ❌ | ❌ |
| Cache Performance | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 🚀 Getting Started

### Quick Start

1. **Open the dashboard hub:**
   ```
   open dashboards/index.html
   ```

2. **Select a dashboard** based on your needs:
   - **System monitoring:** Start with `floor-control.html` (NEW RECOMMENDED)
   - **Analytics & charts:** Use `dashboard-enhanced.html` (recommended)
   - **Quick checks:** Use `dashboard.html` (basic)
   - **Advanced analysis:** Use `dashboard-pro.html` (AI-powered)
   - **Risk management:** Use `dashboard-positions.html`

### Using Shared Utilities

All new dashboards should import from `shared/` to avoid duplication:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <title>My Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="./shared/styles.css">
</head>
<body>
  <!-- Your content -->
  
  <script type="module">
    import { WORKER_URL, API_ENDPOINTS } from './shared/config.js';
    import { fetchAPI, showToast } from './shared/utils.js';
    import { createLineChart } from './shared/charts.js';
    
    // Your code here
  </script>
</body>
</html>
```

---

## 🔗 Integration Points

### Worker API Endpoints

All dashboards connect to these endpoints:

- `GET /health` - System health check
- `GET /interceptor/history` - Intercepted data history
- `GET /interceptor/stats` - Statistics
- `GET /tools/*` - Intelligence tools (exposure, CLV, etc.)
- `GET /api/*` - REST API endpoints (new)
- `POST /mcp` - MCP JSON-RPC endpoint

**Base URL:** `https://betting-brain-v3-prod.nolarose1968-806.workers.dev`

### Auto-Refresh

All dashboards support auto-refresh with configurable intervals:
- Fast: 5 seconds
- Normal: 10 seconds (default)
- Slow: 30 seconds

---

## 📈 Performance

### Code Reduction

**Before refactoring:**
- Total lines: 3,776
- Duplicated code: ~40%
- WORKER_URL instances: 5
- Function declarations: 97

**After refactoring:**
- Total lines: ~2,500 (estimated)
- Duplicated code: < 5%
- WORKER_URL instances: 1 (in `config.js`)
- Shared functions: ~30 (in `utils.js`)

**Reduction:** ~60% less duplicate code 🎉

### Loading Performance

- Shared files are cached by browser
- Modular imports reduce initial load
- ES6 modules enable tree-shaking

---

## 🛠️ Development

### Adding a New Dashboard

1. **Create HTML file:**
   ```html
   <!-- dashboards/dashboard-new.html -->
   <!DOCTYPE html>
   <html lang="en">
   <head>
     <link rel="stylesheet" href="./shared/styles.css">
   </head>
   <body>
     <script type="module">
       import config from './shared/config.js';
       import utils from './shared/utils.js';
       import charts from './shared/charts.js';
       
       // Your code
     </script>
   </body>
   </html>
   ```

2. **Add to hub (`index.html`):**
   ```html
   <div onclick="window.location.href='dashboard-new.html'" class="dashboard-card">
     <h3>New Dashboard</h3>
     <p>Description...</p>
   </div>
   ```

3. **Update this README** with the new dashboard details.

### Modifying Shared Utilities

When editing `shared/` files:
1. Update the file with your changes
2. Test across ALL dashboards
3. Update version numbers
4. Document breaking changes

---

## 📚 Related Documentation

- **[Worker Endpoints](../docs/ENDPOINT_DASHBOARD_INTEGRATION.md)** - Complete endpoint reference
- **[REST API](../docs/REST_API_REFERENCE.md)** - REST API documentation
- **[MCP Endpoints](../docs/MCP_ENDPOINTS.md)** - MCP tools reference
- **[System Integration](../docs/SYSTEM_INTEGRATION_MAP.md)** - Architecture overview

---

## ⚡ Quick Links

- **[Dashboard Hub](index.html)** - Main entry point
- **[System Health Monitor](../tools/system-health-monitor.html)** - Health checker
- **[Extension Checker](../tools/extension-checker.html)** - Extension diagnostics
- **[Documentation Index](../docs/INDEX.md)** - Complete docs

---

## 🐛 Troubleshooting

### Dashboard Not Loading Data

1. Check system status: [/health](https://betting-brain-v3-prod.nolarose1968-806.workers.dev/health)
2. Verify network tab in DevTools for API responses
3. Check console for errors
4. Verify `WORKER_URL` in `shared/config.js`

### Charts Not Rendering

1. Ensure Chart.js is loaded: `<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>`
2. Check canvas element ID matches chart creation
3. Verify data format matches Chart.js expectations
4. Check console for Chart.js errors

### Auto-Refresh Not Working

1. Verify `setupAutoRefresh()` is called
2. Check interval value (must be > 0)
3. Ensure callback function is defined
4. Check for JavaScript errors blocking execution

---

**Maintained by:** Betting-Brain Team  
**Last Updated:** October 7, 2025  
**Status:** ✅ Production Ready

