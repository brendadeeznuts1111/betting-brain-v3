# 📊 Dashboard Documentation

**Version:** 3.2.0  
**Last Updated:** 2025-10-08  
**Status:** ✅ Production Ready

---

## 🌲 Floor Control Dashboard (NEW RECOMMENDED)

### Overview
The **Floor Control Dashboard** (`dashboards/floor-control.html`) is the comprehensive system monitoring and control center for the Betting-Brain v3 platform. It provides real-time monitoring of all system components, Fantasy402 integration, and advanced analytics.

### Key Features

#### 🤖 Floor Health Monitoring
- **Overall Status**: Real-time system health with color-coded indicators
- **Version Tracking**: Current system version and build information
- **Test Status**: Test suite results and coverage metrics
- **Performance Metrics**: Response times and error rates

#### 🌲 Forest Grove System Status
- **Worker Status**: Cloudflare Worker health and performance
- **Database Status**: D1 database connectivity and performance
- **Queue Status**: Message queue health and processing status
- **Overall Health**: Aggregated system health score

#### 🛠️ MCP Tools Integration
- **Tool Count**: Available MCP tools (24 total)
- **Tool List**: Real-time list of available tools
- **Tool Status**: Individual tool health and availability
- **Tool Performance**: Response times and success rates

#### 📊 Live Data Feeds
- **Live Odds**: Real-time sports betting odds (NBA, NFL, MLB, NHL)
- **Live Scores**: Current game scores and status
- **Database Metrics**: Record counts and performance metrics
- **Infrastructure Status**: KV, Queues, Analytics Engine, D1 status

#### 🎲 Fantasy402 Integration
- **Live Bets**: Real-time betting activity and volume
- **Agent Performance**: PnL tracking and performance metrics
- **Customer Pulse**: Active customers and staking activity
- **Transaction Ticker**: Real-time transaction feed
- **Player Analytics**: Individual player performance and analysis

#### ⚡ Cache Performance
- **Hit Rate**: Cache performance metrics with color indicators
- **D1 Savings**: Database write reduction percentage
- **Cache Warming**: Manual cache warming functionality
- **Export Options**: JSON and CSV export capabilities

#### 🌳 Agent Tree Visualization
- **ASCII Tree**: Text-based agent hierarchy display
- **D3 Interactive**: Interactive force-layout graph visualization
- **Agent Metadata**: Request counts, types, and relationships
- **Real-time Updates**: Live agent relationship updates

#### 📡 Real-time Analytics
- **Steam Move Alerts**: 3-sigma steam move detection
- **Risk Analysis**: Agent risk concentration and exposure
- **Transaction Analytics**: Volume, frequency, and patterns
- **Performance Metrics**: System performance and response times

### Technical Specifications

#### File Size: 1,750 lines
#### Auto-refresh: 30 seconds
#### Dependencies:
- Chart.js 4.4.1 (charts and graphs)
- D3.js v7 (interactive visualizations)
- Modern CSS (glass morphism, animations)

#### API Endpoints Used:
- `/floor/status` - Floor health and system status
- `/health` - Basic health check
- `/mcp` - MCP tools and capabilities
- `/api/live-odds` - Live sports odds
- `/api/live-scores` - Live game scores
- `/api/database-metrics` - Database performance
- `/api/infrastructure-status` - Infrastructure health
- `/api/analytics/metrics` - Real-time analytics
- `/api/f402/mission-control` - Fantasy402 data
- `/api/f402/graph` - Agent tree data
- `/api/f402/cache/metrics` - Cache performance

#### Security Features:
- **X-Extension-Secret**: Production authentication header
- **CORS Support**: Cross-origin request handling
- **Error Handling**: Comprehensive error management
- **Input Validation**: All inputs validated and sanitized

---

## 📈 Enhanced Analytics Dashboard

### Overview
The **Enhanced Analytics Dashboard** (`dashboards/dashboard-enhanced.html`) provides comprehensive analytics with charts, alerts, and trend analysis.

### Key Features
- **Live Charts**: Real-time data visualization
- **Smart Alerts**: Intelligent alerting system
- **Trend Analysis**: Historical trend analysis
- **Performance Monitoring**: System performance tracking

### File Size: 982 lines
### Badge: `RECOMMENDED`

---

## 🤖 AI Intelligence Hub

### Overview
The **AI Intelligence Hub** (`dashboards/dashboard-pro.html`) provides AI-powered insights and automation with Claude AI integration.

### Key Features
- **Claude AI Integration**: AI-powered analysis and recommendations
- **Intelligent Insights**: Automated insight generation
- **Smart Recommendations**: AI-driven recommendations
- **Advanced Analytics**: Deep analytical capabilities

### File Size: 1,171 lines
### Badge: `PRO`

---

## 📍 Position & Risk Tracker

### Overview
The **Position & Risk Tracker** (`dashboards/dashboard-positions.html`) provides real-time position tracking, exposure monitoring, and risk analysis.

### Key Features
- **Position Tracking**: Real-time position monitoring
- **Exposure Monitoring**: Risk exposure analysis
- **Risk Analysis**: Comprehensive risk assessment
- **Agent Tracking**: Agent performance and risk metrics

### File Size: 865 lines
### Badge: `ADVANCED`

---

## 📊 Basic Monitoring Dashboard

### Overview
The **Basic Monitoring Dashboard** (`dashboards/dashboard.html`) provides simple, clean monitoring for quick checks and overview.

### Key Features
- **Clean UI**: Simple, intuitive interface
- **Fast Loading**: Optimized for quick access
- **Basic Monitoring**: Essential monitoring features
- **Real-time Data**: Live data updates

### File Size: 442 lines
### Badge: `BASIC`

---

## 🔧 Shared Utilities

### Configuration (`shared/config.js`)
- **WORKER_URL**: API base URL configuration
- **API_ENDPOINTS**: All endpoint paths
- **REFRESH_INTERVALS**: Auto-refresh settings
- **CHART_COLORS**: Consistent color palette
- **FORMATTERS**: Data formatting functions

### Utilities (`shared/utils.js`)
- **fetchWithTimeout()**: Fetch with timeout & error handling
- **checkSystemHealth()**: Health check wrapper
- **fetchAPI()**: Generic API fetcher
- **showToast()**: Toast notifications
- **setupAutoRefresh()**: Auto-refresh with pause/resume

### Styles (`shared/styles.css`)
- **Glass Morphism**: Modern glass effects
- **Animations**: Pulse, flash, slide-in, fade-in
- **Status Colors**: Success, error, warning, info
- **Responsive Design**: Mobile-friendly layouts

### Charts (`shared/charts.js`)
- **createLineChart()**: Line chart helper
- **createBarChart()**: Bar chart helper
- **createDoughnutChart()**: Doughnut chart helper
- **createTimeSeriesChart()**: Time series chart
- **addChartDataPoint()**: Add data to existing chart

---

## 🚀 Getting Started

### Quick Start
1. **Open Dashboard Hub**: `dashboards/index.html`
2. **Select Dashboard**: Choose based on your needs
3. **Configure Worker URL**: Set your Cloudflare Worker URL
4. **Start Monitoring**: Begin real-time monitoring

### Recommended Workflow
1. **Start with Floor Control**: Primary monitoring dashboard
2. **Use Enhanced Analytics**: For detailed analysis
3. **Leverage AI Hub**: For advanced insights
4. **Monitor Positions**: For risk management

---

## 🔗 Integration Points

### Worker API Endpoints
- **Base URL**: `https://betting-brain-v3-prod.nolarose1968-806.workers.dev`
- **Health Check**: `/health`
- **MCP Tools**: `/mcp`
- **Analytics**: `/api/analytics/metrics`
- **Fantasy402**: `/api/f402/*`

### Auto-Refresh Intervals
- **Fast**: 5 seconds
- **Normal**: 10 seconds (default)
- **Slow**: 30 seconds
- **Floor Control**: 30 seconds

---

## 📈 Performance Metrics

### Code Reduction
- **Before**: 3,776 lines total
- **After**: ~2,500 lines total
- **Reduction**: ~60% less duplicate code

### Loading Performance
- **Shared Files**: Cached by browser
- **Modular Imports**: Reduced initial load
- **ES6 Modules**: Tree-shaking enabled
- **Optimized Assets**: Minified and compressed

---

## 🛠️ Development

### Adding New Dashboards
1. **Create HTML File**: Follow shared utility pattern
2. **Import Shared Modules**: Use `shared/` utilities
3. **Add to Hub**: Update `index.html`
4. **Update Documentation**: Document new features

### Modifying Shared Utilities
1. **Update File**: Make changes to `shared/` files
2. **Test All Dashboards**: Verify compatibility
3. **Update Version**: Increment version numbers
4. **Document Changes**: Note breaking changes

---

## 🐛 Troubleshooting

### Common Issues
1. **Dashboard Not Loading**: Check Worker URL configuration
2. **Charts Not Rendering**: Verify Chart.js loading
3. **Auto-refresh Not Working**: Check JavaScript errors
4. **Data Not Updating**: Verify API endpoint responses

### Debug Steps
1. **Check Console**: Look for JavaScript errors
2. **Verify Network**: Check API response status
3. **Test Endpoints**: Manually test API calls
4. **Check Configuration**: Verify Worker URL and settings

---

## 📚 Related Documentation

- **[Dashboard Hub](dashboards/index.html)** - Main entry point
- **[Floor Control](dashboards/floor-control.html)** - Primary dashboard
- **[Enhanced Analytics](dashboards/dashboard-enhanced.html)** - Analytics dashboard
- **[AI Intelligence Hub](dashboards/dashboard-pro.html)** - AI-powered dashboard
- **[Position Tracker](dashboards/dashboard-positions.html)** - Risk management
- **[Basic Monitoring](dashboards/dashboard.html)** - Simple monitoring

---

## ⚡ Quick Links

- **[📊 Dashboard Hub](dashboards/index.html)** - All dashboards
- **[🌲 Floor Control](dashboards/floor-control.html)** - System monitoring
- **[📈 Enhanced Analytics](dashboards/dashboard-enhanced.html)** - Analytics
- **[🤖 AI Hub](dashboards/dashboard-pro.html)** - AI insights
- **[📍 Position Tracker](dashboards/dashboard-positions.html)** - Risk management
- **[📊 Basic Monitoring](dashboards/dashboard.html)** - Simple monitoring

---

**Maintained by:** Betting-Brain Team  
**Last Updated:** October 8, 2025  
**Status:** ✅ Production Ready
