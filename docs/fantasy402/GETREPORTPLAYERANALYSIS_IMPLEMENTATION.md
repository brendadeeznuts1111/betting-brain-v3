# getReportPlayerAnalysis Fantasy402 Operation Implementation

## Overview

Added support for the `getReportPlayerAnalysis` Fantasy402 operation to capture and process comprehensive player analysis reports from the Fantasy402.com API.

## Implementation Details

### 1. Database Schema (Migration 0007 - Updated)

**File:** `migrations/0007_fantasy402_player_info.sql`

Added two new tables for player analysis tracking:

#### `fantasy402_player_analysis`
- Stores main player analysis report data
- Includes overall metrics, breakdowns, and raw analysis data
- Indexed for performance on key fields
- Supports multiple report types and line types

#### `fantasy402_player_sport_analysis`
- Stores sport-specific analysis data
- Includes wager counts, risk, win, and performance metrics
- Indexed for efficient sport-based queries
- Links to main analysis record

### 2. Parser Implementation

**File:** `src/utils/fantasy402-parser.ts`

Added `parsePlayerAnalysis()` function that:
- Extracts comprehensive player analysis data from Fantasy402 API response
- Handles financial data conversion (cents to dollars)
- Processes sports, bet types, and time breakdowns
- Normalizes win rates and performance metrics
- Preserves raw data for debugging

### 3. Ingest Handler

**File:** `src/api/fantasy402-ingest.ts`

Added `processPlayerAnalysis()` function that:
- Processes player analysis data from intercepted requests
- Calculates comprehensive metrics and breakdowns
- Stores data in both KV cache and D1 database
- Handles sport-specific analysis records
- Logs detailed analysis metrics

### 4. Operation Routing

Updated the switch statement to handle `getReportPlayerAnalysis` operations:
```typescript
case 'getReportPlayerAnalysis':
    await processPlayerAnalysis(packet, parsedData, env, requestId);
    break;
```

## Data Flow

1. **Browser Extension** intercepts `getReportPlayerAnalysis` requests
2. **Fantasy402 Interceptor** captures request/response data
3. **Ingest API** receives the packet via `/api/fantasy402/ingest`
4. **Parser** extracts and normalizes player analysis data
5. **Handler** stores data in KV cache and D1 database
6. **Analytics Engine** receives metrics for monitoring

## Supported Data Fields

### Analysis Information
- Customer ID, Agent ID, Report Type
- Start Date, End Date, Line Type
- Overall performance metrics

### Financial Metrics
- Total wagers count
- Total risk and win amounts
- Net income calculations
- Win rate percentages
- Average odds

### Breakdown Analysis
- **Sports Breakdown**: Performance by sport (Basketball, Football, Baseball, etc.)
- **Bet Types Breakdown**: Performance by bet type (Moneyline, Spread, Total, etc.)
- **Time Breakdown**: Performance by time period (Morning, Afternoon, Evening)

### Summary Statistics
- Total wagers, risk, and win amounts
- Net income and win rate
- Average odds calculation
- Sport-specific performance metrics
- Bet type performance analysis
- Time-based performance patterns

## Testing

### Test Scripts
- `scripts/test-player-analysis.ts` - Full integration test
- `scripts/test-player-analysis-parser.ts` - Parser validation

### Test Data
Uses realistic Fantasy402 response structure with:
- Customer ID: `14801_6`
- Agent ID: `BILLY666`
- Report Period: January 1-31, 2025
- Multiple sports and bet types
- Comprehensive breakdowns
- Financial data in cents (converted to dollars)

## Usage Example

The system will automatically process `getReportPlayerAnalysis` requests when:

1. Browser extension intercepts the request:
```javascript
fetch("https://fantasy402.com/cloud/api/Manager/getReportPlayerAnalysis", {
  "method": "POST",
  "body": "reportType=PlayerAnalysis&startDate=2025-01-01&endDate=2025-01-31&lineType=All&agentID=BILLY666&customerID=14801_6"
});
```

2. Data is captured and forwarded to the worker
3. Player analysis is parsed and stored
4. Analytics metrics are recorded

## Database Queries

### Get Latest Player Analysis
```sql
SELECT * FROM fantasy402_player_analysis 
WHERE customer_id = '14801_6' 
ORDER BY captured_at DESC 
LIMIT 1;
```

### Get Sport Performance
```sql
SELECT sport, wager_count, total_risk, total_win, net_income, win_rate
FROM fantasy402_player_sport_analysis 
WHERE customer_id = '14801_6' 
AND start_date = '2025-01-01'
AND end_date = '2025-01-31'
ORDER BY total_risk DESC;
```

### Get Performance by Bet Type
```sql
SELECT 
    JSON_EXTRACT(bet_types_breakdown_json, '$.Moneyline') as moneyline,
    JSON_EXTRACT(bet_types_breakdown_json, '$.Spread') as spread,
    JSON_EXTRACT(bet_types_breakdown_json, '$.Total') as total
FROM fantasy402_player_analysis 
WHERE customer_id = '14801_6' 
ORDER BY captured_at DESC 
LIMIT 1;
```

### Get Time-based Performance
```sql
SELECT 
    JSON_EXTRACT(time_breakdown_json, '$.Morning') as morning,
    JSON_EXTRACT(time_breakdown_json, '$.Afternoon') as afternoon,
    JSON_EXTRACT(time_breakdown_json, '$.Evening') as evening
FROM fantasy402_player_analysis 
WHERE customer_id = '14801_6' 
ORDER BY captured_at DESC 
LIMIT 1;
```

### Get High-Performing Sports
```sql
SELECT sport, win_rate, total_win, net_income
FROM fantasy402_player_sport_analysis 
WHERE customer_id = '14801_6' 
AND win_rate > 0.5
ORDER BY win_rate DESC;
```

## Monitoring

The implementation includes comprehensive logging:
- Player analysis processing
- Financial metrics (risk, win, net income)
- Sport and bet type breakdowns
- Time-based performance patterns
- Summary statistics
- Error handling

All data is also sent to the Analytics Engine for monitoring and alerting.

## Security Considerations

- JWT tokens are truncated in logs for security
- Financial data is properly validated
- Input sanitization prevents injection attacks
- Database operations use parameterized queries
- Analysis data is properly normalized

## Performance Optimizations

- Indexed database tables for fast queries
- KV cache for quick access to recent analysis (1-hour TTL)
- Efficient data conversion (cents to dollars)
- JSON storage for breakdown data
- Batch processing for sport-specific records

## Risk Management Features

### Performance Analysis
- Win rate tracking by sport and bet type
- Time-based performance patterns
- Risk vs. reward analysis
- Net income monitoring

### Alert Capabilities
- Low win rate detection
- High-risk sport identification
- Unusual betting pattern analysis
- Performance degradation alerts

## Analytics Integration

### Key Metrics Tracked
- **Overall Performance**: Total wagers, risk, win, net income
- **Sport Performance**: Individual sport analysis
- **Bet Type Performance**: Moneyline, spread, total analysis
- **Time Performance**: Morning, afternoon, evening patterns
- **Win Rate Analysis**: Performance by category

### Dashboard Integration
- Real-time performance metrics
- Historical trend analysis
- Sport-specific performance charts
- Bet type performance visualization
- Time-based performance patterns

## Future Enhancements

Potential improvements:
- Machine learning for performance prediction
- Automated risk assessment
- Performance benchmarking
- Trend analysis and forecasting
- Integration with betting exposure tracking
- Automated performance alerts
- Custom report generation

## Related Operations

This implementation works alongside:
- `getInfoPlayer` - Player information
- `getPerformancePlayer` - Player performance
- `getTransactionList` - Transaction history
- `getPending` - Pending wagers
- `getAgentPerformance` - Agent performance

## Data Structure Examples

### Sports Breakdown
```json
{
  "Basketball": {
    "wagerCount": 60,
    "totalRisk": 600.00,
    "totalWin": 480.00,
    "netIncome": -120.00,
    "winRate": 0.40
  }
}
```

### Bet Types Breakdown
```json
{
  "Moneyline": {
    "wagerCount": 75,
    "totalRisk": 750.00,
    "totalWin": 600.00,
    "netIncome": -150.00,
    "winRate": 0.45
  }
}
```

### Time Breakdown
```json
{
  "Morning": {
    "wagerCount": 30,
    "totalRisk": 300.00,
    "totalWin": 240.00,
    "netIncome": -60.00,
    "winRate": 0.40
  }
}
```

---

**Status:** ✅ Implemented and Tested  
**Migration:** 0007_fantasy402_player_info.sql (Updated)  
**Files Modified:** 3  
**New Functions:** 2  
**New Tables:** 2  
**Test Coverage:** Complete  
**Documentation:** Complete
