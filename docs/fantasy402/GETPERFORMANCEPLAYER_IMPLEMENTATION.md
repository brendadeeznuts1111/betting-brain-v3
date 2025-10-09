# getPerformancePlayer Fantasy402 Operation Implementation

## Overview

Added support for the `getPerformancePlayer` Fantasy402 operation to capture and process player performance data from the Fantasy402.com API.

## Implementation Details

### 1. Database Schema (Migration 0007 - Updated)

**File:** `migrations/0007_fantasy402_player_info.sql`

Added two new tables for player performance tracking:

#### `fantasy402_player_performance`
- Stores comprehensive player performance metrics
- Includes financial data, wager counts, and period information
- Indexed for performance on key fields
- Tracks risk, win, commission, and net income

#### `fantasy402_player_sport_performance`
- Stores sport-specific performance breakdown
- Links to main performance record via foreign key
- Tracks risk, win, and wager count per sport
- Indexed for efficient querying by sport and period

### 2. Parser Implementation

**File:** `src/utils/fantasy402-parser.ts`

Added `parsePlayerPerformance()` function that:
- Extracts player performance data from Fantasy402 API response
- Handles financial data conversion (cents to dollars)
- Processes sport breakdown arrays
- Normalizes period information and metrics
- Preserves raw data for debugging

### 3. Ingest Handler

**File:** `src/api/fantasy402-ingest.ts`

Added `processPlayerPerformance()` function that:
- Processes player performance data from intercepted requests
- Stores data in both KV cache and D1 database
- Handles sport-specific breakdown records
- Logs comprehensive performance metrics
- Tracks performance over time periods

### 4. Operation Routing

Updated the switch statement to handle `getPerformancePlayer` operations:
```typescript
case 'getPerformancePlayer':
    await processPlayerPerformance(packet, parsedData, env, requestId);
    break;
```

## Data Flow

1. **Browser Extension** intercepts `getPerformancePlayer` requests
2. **Fantasy402 Interceptor** captures request/response data
3. **Ingest API** receives the packet via `/api/fantasy402/ingest`
4. **Parser** extracts and normalizes performance data
5. **Handler** stores data in KV cache and D1 database
6. **Analytics Engine** receives metrics for monitoring

## Supported Data Fields

### Performance Metrics
- Customer ID, Agent ID
- Period Start/End dates
- Period Type, Number, Name
- Total Risk, Win, Commission, Net Income
- Wager counts (total, pending, settled)
- Free play usage and winnings

### Sport Breakdown
- Sport name
- Risk amount per sport
- Win amount per sport
- Wager count per sport
- Period tracking

### Financial Data
- All amounts converted from cents to dollars
- Risk and win tracking
- Commission calculations
- Net income analysis

## Testing

### Test Scripts
- `scripts/test-player-performance.ts` - Full integration test
- `scripts/test-player-performance-parser.ts` - Parser validation

### Test Data
Uses realistic Fantasy402 response structure with:
- Customer ID: `14801_6`
- Agent ID: `BILLY666`
- Period: Week 1 (2025-01-01 to 2025-01-07)
- Financial data in cents (converted to dollars)
- Sport breakdown for Basketball and Football

## Usage Example

The system will automatically process `getPerformancePlayer` requests when:

1. Browser extension intercepts the request:
```javascript
fetch("https://fantasy402.com/cloud/api/Manager/getPerformancePlayer", {
  "method": "POST",
  "body": "acc=14801_6&period=0&operation=getPerformancePlayer&RRO=1&agentID=BILLY666&agentOwner=BILLY666&agentSite=1"
});
```

2. Data is captured and forwarded to the worker
3. Player performance is parsed and stored
4. Analytics metrics are recorded

## Database Queries

### Get Player Performance
```sql
SELECT * FROM fantasy402_player_performance 
WHERE customer_id = '14801_6' 
ORDER BY captured_at DESC;
```

### Get Sport Breakdown
```sql
SELECT sport, risk, win, wager_count 
FROM fantasy402_player_sport_performance 
WHERE customer_id = '14801_6' 
AND period_start = '2025-01-01';
```

### Get Performance by Period
```sql
SELECT customer_id, period_start, period_end, 
       total_risk, total_win, net_income, total_wagers
FROM fantasy402_player_performance 
WHERE period_start >= '2025-01-01' 
AND period_end <= '2025-01-07';
```

### Get Top Performing Players
```sql
SELECT customer_id, SUM(total_risk) as total_risk, 
       SUM(total_win) as total_win, SUM(net_income) as net_income
FROM fantasy402_player_performance 
WHERE captured_at >= date('now', '-30 days')
GROUP BY customer_id 
ORDER BY total_risk DESC 
LIMIT 10;
```

## Monitoring

The implementation includes comprehensive logging:
- Player performance processing
- Financial metrics (risk, win, net income)
- Sport breakdown analysis
- Period tracking
- Error handling

All data is also sent to the Analytics Engine for monitoring and alerting.

## Security Considerations

- JWT tokens are truncated in logs for security
- Financial data is properly validated
- Input sanitization prevents injection attacks
- Database operations use parameterized queries
- Foreign key constraints ensure data integrity

## Performance Optimizations

- Indexed database tables for fast queries
- KV cache for quick access to recent data
- Batch processing for sport breakdown records
- Efficient data conversion (cents to dollars)

## Future Enhancements

Potential improvements:
- Player performance analytics and trends
- Risk assessment algorithms
- Automated alerts for high-risk players
- Integration with betting exposure tracking
- Player segmentation based on performance
- Historical performance comparisons
- Sport-specific performance analysis

## Related Operations

This implementation works alongside:
- `getInfoPlayer` - Player information
- `getAgentPerformance` - Agent performance
- `getAccountInfoOwner` - Account information
- `getAuthorizations` - Player permissions

---

**Status:** ✅ Implemented and Tested  
**Migration:** 0007_fantasy402_player_info.sql (Updated)  
**Files Modified:** 3  
**New Functions:** 2  
**New Tables:** 2  
**Test Coverage:** Complete
