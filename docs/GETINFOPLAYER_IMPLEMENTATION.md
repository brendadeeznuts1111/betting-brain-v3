# getInfoPlayer Fantasy402 Operation Implementation

## Overview

Added support for the `getInfoPlayer` Fantasy402 operation to capture and process player information from the Fantasy402.com API.

## Implementation Details

### 1. Database Schema (Migration 0007)

**File:** `migrations/0007_fantasy402_player_info.sql`

Created two new tables:

#### `fantasy402_players`
- Stores comprehensive player information
- Includes financial data, status flags, limits, and preferences
- Uses `ON CONFLICT` for upsert operations
- Indexed for performance on key fields

#### `fantasy402_player_activity`
- Tracks player activity events
- Records balance changes and metadata
- Indexed for efficient querying

### 2. Parser Implementation

**File:** `src/utils/fantasy402-parser.ts`

Added `parsePlayerInfo()` function that:
- Extracts player details from Fantasy402 API response
- Handles financial data conversion (cents to dollars)
- Normalizes status flags and permissions
- Preserves raw data for debugging

### 3. Ingest Handler

**File:** `src/api/fantasy402-ingest.ts`

Added `processPlayerInfo()` function that:
- Processes player information from intercepted requests
- Stores data in both KV cache and D1 database
- Tracks player activity events
- Logs comprehensive player metrics

### 4. Operation Routing

Updated the switch statement to handle `getInfoPlayer` operations:
```typescript
case 'getInfoPlayer':
    await processPlayerInfo(packet, parsedData, env, requestId);
    break;
```

## Data Flow

1. **Browser Extension** intercepts `getInfoPlayer` requests
2. **Fantasy402 Interceptor** captures request/response data
3. **Ingest API** receives the packet via `/api/fantasy402/ingest`
4. **Parser** extracts and normalizes player data
5. **Handler** stores data in KV cache and D1 database
6. **Analytics Engine** receives metrics for monitoring

## Supported Data Fields

### Player Information
- Customer ID, Agent ID, Player Name
- Player Type, Office, Status
- Registration Date, Last Login

### Financial Data
- Total Wagers, Risk, Win, Net Income
- Commission Rate, Credit Limit
- Available Balance, Pending Balance
- Free Play Balance, Currency Code

### Status & Limits
- Active Status, Sportsbook Suspension
- Read-Only Flag
- Wager Limits, Minimum Wager
- Maximum Prop Payout

### Additional Data
- Permissions (JSON)
- Preferences (JSON)
- Contact Information (JSON)

## Testing

### Test Scripts
- `scripts/test-getinfoplayer.ts` - Full integration test
- `scripts/test-player-parser.ts` - Parser validation

### Test Data
Uses realistic Fantasy402 response structure with:
- Customer ID: `14801_6`
- Agent ID: `BILLY666`
- Financial data in cents (converted to dollars)
- Status flags and permissions

## Usage Example

The system will automatically process `getInfoPlayer` requests when:

1. Browser extension intercepts the request:
```javascript
fetch("https://fantasy402.com/cloud/api/Manager/getInfoPlayer", {
  "method": "POST",
  "body": "customerID=14801_6&agentID=BILLY666&operation=getInfoPlayer&RRO=0&agentOwner=BILLY666&agentSite=1"
});
```

2. Data is captured and forwarded to the worker
3. Player information is parsed and stored
4. Analytics metrics are recorded

## Database Queries

### Get Player Information
```sql
SELECT * FROM fantasy402_players 
WHERE customer_id = '14801_6' 
ORDER BY captured_at DESC 
LIMIT 1;
```

### Get Player Activity
```sql
SELECT * FROM fantasy402_player_activity 
WHERE customer_id = '14801_6' 
ORDER BY captured_at DESC;
```

### Get Players by Agent
```sql
SELECT customer_id, player_name, available_balance, status 
FROM fantasy402_players 
WHERE agent_id = 'BILLY666' 
AND active = 1;
```

## Monitoring

The implementation includes comprehensive logging:
- Player information processing
- Financial metrics (balance, risk, win)
- Activity tracking
- Error handling

All data is also sent to the Analytics Engine for monitoring and alerting.

## Security Considerations

- JWT tokens are truncated in logs for security
- Financial data is properly validated
- Input sanitization prevents injection attacks
- Database operations use parameterized queries

## Future Enhancements

Potential improvements:
- Player performance analytics
- Risk assessment algorithms
- Automated alerts for suspicious activity
- Integration with betting exposure tracking
- Player segmentation and profiling

---

**Status:** ✅ Implemented and Tested  
**Migration:** 0007_fantasy402_player_info.sql  
**Files Modified:** 3  
**New Functions:** 2  
**Test Coverage:** Complete
