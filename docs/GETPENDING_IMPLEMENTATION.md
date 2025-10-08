# getPending Fantasy402 Operation Implementation

## Overview

Added support for the `getPending` Fantasy402 operation to capture and process pending wagers from the Fantasy402.com API.

## Implementation Details

### 1. Database Schema (Migration 0007 - Updated)

**File:** `migrations/0007_fantasy402_player_info.sql`

Added two new tables for pending wagers tracking:

#### `fantasy402_pending_wagers`
- Stores individual pending wager details
- Includes financial data, odds, and event information
- Uses `ON CONFLICT` for upsert operations
- Indexed for performance on key fields

#### `fantasy402_pending_summary`
- Stores summary statistics for pending wagers
- Includes risk totals, sport breakdown, and bet type analysis
- Tracks average odds and total stake
- Indexed for efficient querying

### 2. Parser Implementation

**File:** `src/utils/fantasy402-parser.ts`

Added `parsePendingWagers()` function that:
- Extracts pending wager data from Fantasy402 API response
- Handles financial data conversion (cents to dollars)
- Processes odds and risk calculations
- Normalizes wager status and event information
- Preserves raw data for debugging

### 3. Ingest Handler

**File:** `src/api/fantasy402-ingest.ts`

Added `processPendingWagers()` function that:
- Processes pending wager data from intercepted requests
- Calculates comprehensive summary statistics
- Stores data in both KV cache and D1 database
- Handles sport and bet type breakdowns
- Logs detailed wager metrics

### 4. Operation Routing

Updated the switch statement to handle `getPending` operations:
```typescript
case 'getPending':
    await processPendingWagers(packet, parsedData, env, requestId);
    break;
```

## Data Flow

1. **Browser Extension** intercepts `getPending` requests
2. **Fantasy402 Interceptor** captures request/response data
3. **Ingest API** receives the packet via `/api/fantasy402/ingest`
4. **Parser** extracts and normalizes pending wager data
5. **Handler** stores data in KV cache and D1 database
6. **Analytics Engine** receives metrics for monitoring

## Supported Data Fields

### Wager Information
- Wager ID, Customer ID, Agent ID
- Sport, Bet Type, Event ID/Name
- Wager Date, Status, Description

### Financial Data
- Stake amount (converted from cents)
- Odds and risk calculations
- Potential win amounts
- All amounts converted from cents to dollars

### Summary Statistics
- Total wagers count
- Total risk and potential win
- Average odds calculation
- Sport breakdown by risk
- Bet type breakdown by risk

## Testing

### Test Scripts
- `scripts/test-pending-wagers.ts` - Full integration test
- `scripts/test-pending-parser.ts` - Parser validation

### Test Data
Uses realistic Fantasy402 response structure with:
- Customer ID: `14801_6`
- Agent ID: `BILLY666`
- Multiple sports (Basketball, Football, Baseball)
- Various bet types (Moneyline, Spread, Total)
- Financial data in cents (converted to dollars)

## Usage Example

The system will automatically process `getPending` requests when:

1. Browser extension intercepts the request:
```javascript
fetch("https://fantasy402.com/cloud/api/Manager/getPending", {
  "method": "POST",
  "body": "agentID=BILLY666&path=%2Fqubic%2Fapi%2FManager%2FgetPending&RRO=1&date=2023-10-09&sort=5&typeSort=2&week=0&customerID=14801_6&agentOwner=DANIEL2025&agentSite=1"
});
```

2. Data is captured and forwarded to the worker
3. Pending wagers are parsed and stored
4. Analytics metrics are recorded

## Database Queries

### Get Pending Wagers
```sql
SELECT * FROM fantasy402_pending_wagers 
WHERE customer_id = '14801_6' 
AND status = 'Pending'
ORDER BY wager_date DESC;
```

### Get Pending Summary
```sql
SELECT * FROM fantasy402_pending_summary 
WHERE customer_id = '14801_6' 
ORDER BY captured_at DESC 
LIMIT 1;
```

### Get Risk by Sport
```sql
SELECT sport, SUM(risk) as total_risk, COUNT(*) as wager_count
FROM fantasy402_pending_wagers 
WHERE customer_id = '14801_6' 
AND status = 'Pending'
GROUP BY sport 
ORDER BY total_risk DESC;
```

### Get High-Risk Wagers
```sql
SELECT wager_id, sport, bet_type, risk, potential_win, odds
FROM fantasy402_pending_wagers 
WHERE customer_id = '14801_6' 
AND status = 'Pending'
AND risk > 1000
ORDER BY risk DESC;
```

## Monitoring

The implementation includes comprehensive logging:
- Pending wager processing
- Financial metrics (risk, potential win, stake)
- Sport and bet type breakdowns
- Summary statistics
- Error handling

All data is also sent to the Analytics Engine for monitoring and alerting.

## Security Considerations

- JWT tokens are truncated in logs for security
- Financial data is properly validated
- Input sanitization prevents injection attacks
- Database operations use parameterized queries
- Wager IDs are unique to prevent duplicates

## Performance Optimizations

- Indexed database tables for fast queries
- KV cache for quick access to recent data (5-minute TTL)
- Efficient data conversion (cents to dollars)
- Batch processing for multiple wagers

## Risk Management Features

### Real-time Risk Tracking
- Total risk exposure per customer
- Risk breakdown by sport and bet type
- Average odds monitoring
- Potential win calculations

### Alert Capabilities
- High-risk wager detection
- Unusual betting pattern identification
- Sport concentration analysis
- Odds variance monitoring

## Future Enhancements

Potential improvements:
- Real-time risk alerts
- Automated risk limit enforcement
- Integration with betting exposure tracking
- Machine learning for risk prediction
- Historical wager pattern analysis
- Automated hedging recommendations

## Related Operations

This implementation works alongside:
- `getInfoPlayer` - Player information
- `getPerformancePlayer` - Player performance
- `getTransactionList` - Transaction history
- `getAgentPerformance` - Agent performance

---

**Status:** ✅ Implemented and Tested  
**Migration:** 0007_fantasy402_player_info.sql (Updated)  
**Files Modified:** 3  
**New Functions:** 2  
**New Tables:** 2  
**Test Coverage:** Complete
