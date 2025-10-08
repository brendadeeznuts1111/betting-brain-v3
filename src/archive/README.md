# Code Archive

This directory contains deprecated, legacy, or placeholder implementations that are candidates for removal or refactoring.

## Deprecation Status

### 1. MCP Placeholder Tools (src/mcp/toolRegistry.ts)

**Status:** Placeholders registered but not implemented
**Lines:** 155-238
**Impact:** No production usage

**Placeholders:**
- `getLiveBettingTicker` (line 156-158)
- `getClosingLineValue` (line 160-162)
- `getRawFeedSamples` (line 193-195)
- `getParsedBetData` (line 197-199)
- `getRawFeedHealth` (line 201-203)
- `searchRawFeeds` (line 205-207)
- `searchCustomers` (line 215-217)
- `getAgentProfile` (line 219-221)
- `getCommunicationMessages` (line 223-225)
- `getAccountInfoOwner` (line 233-235)
- ~18 additional management tools (line 237)

**Recommendation:** Remove placeholders in Phase 5 cleanup. Replace with on-demand registration pattern.

---

### 2. Trading Stream Stubs (src/routes/api/trading-stream.ts)

**Status:** Placeholder implementations
**Lines:** 103-113
**Impact:** Returns empty arrays, no real functionality

**Functions:**
- `getRecentSignals()` - line 103-107
- `getRecentBets()` - line 109-113

**Recommendation:** Either implement with real D1 queries or remove endpoint entirely.

---

### 3. Legacy KV Bindings (src/types/api.ts)

**Status:** Optional bindings, minimal usage
**Line:** 33
**Binding:** `TOKEN_STORE?: KVNamespace`

**Usage Analysis:**
```
✅ wrangler.toml - defined but commented "# MCP: Legacy token storage"
✅ docs/* - referenced in documentation only
❌ src/* - not actively used in production code
```

**Recommendation:** Keep as optional for backward compatibility, document as deprecated.

---

### 4. Deprecated Exports (src/shared/config.ts)

**Status:** Deprecated but still exported
**Line:** 112
**Export:** `export const WORKER_URL = getWorkerUrl();`

**Usage Analysis:**
```
✅ 72 files use WORKER_URL
✅ Still actively used across dashboards, scripts, extensions
```

**Recommendation:** NOT deprecated - this is actively used. Remove @deprecated comment.

---

## Archive Strategy

### Phase 1: Documentation (COMPLETED)
- ✅ Created this README documenting deprecation status
- ✅ Identified true vs false positives (WORKER_URL still active, TOKEN_STORE optional)
- ✅ Created directory structure for future archived code

### Phase 2: Analysis Complete (CURRENT)
**Key Findings:**
- ❌ No source code to archive yet (all active or already documented)
- ✅ CORS consolidation already removed duplicate code (Phase 1)
- ✅ MCP placeholders documented for Phase 5 removal
- ✅ docs/archive/ contains historical docs & migration scripts (appropriate location)

**Next Steps:** Proceed to Phase 3 (split large files)

### Phase 3: Safe Removal (Phase 5 of main plan)
1. Remove MCP placeholder tools (~30 functions, lines 155-238)
2. Remove trading stream stubs (2 functions, lines 103-113)
3. Add migration guide for removed tools

### Phase 4: Refactoring (Future)
1. Lazy-load MCP tools on-demand vs mass registration
2. Implement or remove trading-stream endpoint
3. Consolidate KV bindings documentation

---

## Migration Guide

### Removing MCP Placeholders

**Before:**
```typescript
function registerRawFeedTools() {
  toolRegistry.set('getRawFeedSamples', async (args, env) => {
    return createNotImplementedResult('getRawFeedSamples');
  });
  // ... 9 more placeholders
}
```

**After:**
```typescript
// Remove empty registration functions entirely
// Tools will be registered on-demand when implemented
```

### Removing Trading Stream Stubs

**Before:**
```typescript
async function getRecentSignals(env: Env): Promise<any[]> {
  // Placeholder implementation
  return [];
}
```

**After:**
```typescript
// Option 1: Implement with real queries
async function getRecentSignals(env: Env): Promise<Signal[]> {
  const result = await env.ANALYTICS.prepare(
    'SELECT * FROM signals WHERE timestamp > ? ORDER BY timestamp DESC LIMIT 10'
  ).bind(Date.now() - 3600000).all();
  return result.results as Signal[];
}

// Option 2: Remove entirely and return 501 Not Implemented
```

---

## Impact Analysis

### Low Risk Removals
- ✅ MCP placeholder tools (no production usage)
- ✅ Trading stream stubs (returns empty data)

### High Risk Changes
- ❌ WORKER_URL constant (72 files depend on it)
- ❌ TOKEN_STORE binding (keep for backward compatibility)

---

*Last Updated: 2025-10-08*
*Created during Phase 2 of codebase optimization*
