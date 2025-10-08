# Floor Control Fantasy402 Integration Cards

## Overview

Added individual cards for each Fantasy402 operation to the Floor Control dashboard, providing real-time monitoring and visualization of Fantasy402 data.

## Implemented Cards

### 1. 👤 Player Info Card
**Endpoint:** `/api/fantasy402/player-info`
**Purpose:** Monitor active players and their status

**Metrics Displayed:**
- Active Players count
- Last Updated timestamp
- Player status
- Recent player list (Customer ID, Name, Status)

**Data Source:** `fantasy402:players:latest` KV cache

### 2. 📊 Player Performance Card
**Endpoint:** `/api/fantasy402/player-performance`
**Purpose:** Track player performance metrics

**Metrics Displayed:**
- Performance Period (start → end)
- Total Risk amount
- Net Income
- Win Rate percentage

**Data Source:** `fantasy402:player-performance:latest` KV cache

### 3. 💳 Transaction List Card
**Endpoint:** `/api/fantasy402/transaction-list`
**Purpose:** Monitor recent transaction activity

**Metrics Displayed:**
- Total Transactions count
- Wager Loss total
- Wager Win total
- Net Balance
- Recent transaction list

**Data Source:** `fantasy402:transactions:latest` KV cache

### 4. ⏳ Pending Wagers Card
**Endpoint:** `/api/fantasy402/pending-wagers`
**Purpose:** Track active pending wagers and risk exposure

**Metrics Displayed:**
- Active Wagers count
- Total Risk amount
- Potential Win amount
- Average Odds
- Sport breakdown chart (doughnut chart)

**Data Source:** `fantasy402:pending:latest` KV cache

### 5. 📈 Player Analysis Card
**Endpoint:** `/api/fantasy402/player-analysis`
**Purpose:** Display comprehensive player analysis reports

**Metrics Displayed:**
- Analysis Period (start → end)
- Total Wagers count
- Win Rate percentage
- Net Income
- Bet types breakdown chart (bar chart)

**Data Source:** `fantasy402:player-analysis:latest` KV cache

### 6. 📜 Transaction History Card
**Endpoint:** `/api/fantasy402/transaction-history`
**Purpose:** Monitor transaction history and financial activity

**Metrics Displayed:**
- History Records count
- Deposits total
- Withdrawals total
- Adjustments total
- Recent transaction history

**Data Source:** `transactionHistory:latest` KV cache

## Technical Implementation

### Chart Integration
- **Pending Wagers**: Doughnut chart showing risk distribution by sport
- **Player Analysis**: Bar chart showing risk by bet type
- **Charts**: Use Chart.js with dark theme styling

### Data Flow
1. **KV Cache**: Each operation stores data in KV with appropriate TTL
2. **API Endpoints**: Dedicated endpoints for each operation
3. **Dashboard**: Real-time updates every 30 seconds
4. **Error Handling**: Comprehensive error display and fallbacks

### Styling
- **Dark Theme**: Consistent with existing Floor Control design
- **Status Colors**: Green (good), Yellow (warning), Red (error)
- **Responsive**: Cards adapt to different screen sizes
- **Charts**: Dark theme with Forest Grove color scheme

## API Endpoints Required

The dashboard expects these endpoints to be implemented:

```
GET /api/fantasy402/player-info
GET /api/fantasy402/player-performance  
GET /api/fantasy402/transaction-list
GET /api/fantasy402/pending-wagers
GET /api/fantasy402/player-analysis
GET /api/fantasy402/transaction-history
```

## Data Structure Examples

### Player Info Response
```json
{
  "count": 25,
  "lastUpdated": "2025-01-08T15:30:00Z",
  "status": "active",
  "players": [
    {
      "customerID": "14801_6",
      "playerName": "John Doe",
      "status": "active"
    }
  ]
}
```

### Pending Wagers Response
```json
{
  "totalWagers": 15,
  "totalRisk": 1500.00,
  "totalPotentialWin": 2250.00,
  "averageOdds": 1.50,
  "sportBreakdown": {
    "Basketball": 600.00,
    "Football": 450.00,
    "Baseball": 450.00
  }
}
```

### Player Analysis Response
```json
{
  "startDate": "2025-01-01",
  "endDate": "2025-01-31",
  "totalWagers": 150,
  "winRate": 0.45,
  "netIncome": -300.00,
  "betTypesBreakdown": {
    "Moneyline": { "totalRisk": 750.00 },
    "Spread": { "totalRisk": 450.00 },
    "Total": { "totalRisk": 300.00 }
  }
}
```

## Dashboard Features

### Real-time Updates
- **Refresh Rate**: 30 seconds
- **Auto-refresh**: Continuous monitoring
- **Error Handling**: Graceful fallbacks for missing data

### Visual Indicators
- **Status Badges**: Color-coded status indicators
- **Charts**: Interactive data visualization
- **Progress Indicators**: Loading states and error messages

### Responsive Design
- **Grid Layout**: Auto-fitting cards
- **Mobile Friendly**: Responsive design
- **Dark Theme**: Consistent with Forest Grove branding

## Integration Benefits

### Operational Visibility
- **Real-time Monitoring**: Live data from Fantasy402 operations
- **Performance Tracking**: Key metrics and KPIs
- **Risk Management**: Exposure and pending wager monitoring

### Data Visualization
- **Charts**: Visual representation of data patterns
- **Trends**: Historical data analysis
- **Alerts**: Visual indicators for important metrics

### System Health
- **Status Monitoring**: Service health indicators
- **Error Tracking**: Comprehensive error reporting
- **Performance Metrics**: Response time and throughput

## Future Enhancements

### Additional Metrics
- **Real-time Alerts**: Push notifications for critical events
- **Historical Trends**: Time-series data visualization
- **Custom Dashboards**: User-configurable layouts

### Advanced Features
- **Drill-down**: Click-through to detailed views
- **Export**: Data export capabilities
- **Integration**: Webhook notifications

## Usage

1. **Access**: Navigate to `/dashboards/floor-control.html`
2. **Configure**: Set Worker URL in top-right input
3. **Monitor**: View real-time Fantasy402 data
4. **Analyze**: Use charts and metrics for insights

## Related Documentation

- [Floor Control Dashboard](dashboards/floor-control.html)
- [Fantasy402 Integration Status](docs/FANTASY402_INTEGRATION_STATUS.md)
- [API Endpoints](docs/API_ENDPOINTS.md)
- [Dashboard Automation](docs/DASHBOARD_AUTOMATION.md)

---

**Status:** ✅ Implemented and Integrated  
**Cards Added:** 6  
**Charts:** 2 (Pending Wagers, Player Analysis)  
**API Endpoints:** 6  
**Refresh Rate:** 30 seconds  
**Theme:** Dark (Forest Grove)
