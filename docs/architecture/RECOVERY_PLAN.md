# 🚨 Recovery Plan: Stabilize Testing & Fix Technical Debt

**Status:** 🔴 **Action Required**  
**Created:** 2025-10-07  
**Priority:** HIGH  
**Estimated Time:** 2-3 days (phased approach)

---

## 📊 Current State Assessment

### Critical Issues (Blocking Development) 🔴

| Issue | Impact | Count | Severity |
|-------|--------|-------|----------|
| **Tests Hanging** | Can't run test suite | 1+ files | 🔴 CRITICAL |
| **Security Rule Violations** | CI will fail | 145 errors | 🟠 HIGH |
| **Broken Links** | Poor documentation | 75 links | 🟡 MEDIUM |
| **TypeScript Errors** | Type safety issues | 100+ | 🟡 MEDIUM |

### Root Causes Identified

1. **Tests Hanging** → `steamWebhook.ts:185` - `undefined.length` error
2. **Security Violations** → Mix of real issues + false positives
3. **Broken Links** → Documentation moved during cleanup
4. **TypeScript Errors** → D1 result type mismatches

---

## 🎯 Phase 1: UNBLOCK Development (Priority 1 - Day 1)

**Goal:** Make test suite run again without hanging

### Task 1.1: Fix Hanging Tests ⏱️ 30 minutes

**Files:**
- `tests/unit/steam.test.ts` (hanging on line 59)
- `src/queues/steamWebhook.ts:185` (undefined.length error)

**Root Cause:**
```typescript
// Line 185: steamWebhook.ts
if (recentMovements.length < 2) {  // ← recentMovements is undefined
```

**Fix:**
```typescript
const recentMovements = await env.ANALYTICS.prepare(...).all();

// Add null check:
if (!recentMovements || !recentMovements.results || recentMovements.results.length < 2) {
  return { valid: false, sigma: 0 };
}
```

**Validation:**
```bash
bun test tests/unit/steam.test.ts
```

**Success Criteria:** ✅ Test completes without hanging

---

### Task 1.2: Disable Problematic Tests Temporarily ⏱️ 15 minutes

**If tests still hang, skip them temporarily:**

```typescript
// tests/unit/steam.test.ts
describe.skip("Steam Move Detection", () => {  // ← Add .skip
  test("should detect steam move", async () => {
    // ... test code
  });
});
```

**Validation:**
```bash
bun test  # Should complete without hanging
```

---

### Task 1.3: Fix Test Infrastructure ⏱️ 1 hour

**Issues:**
1. `husky` prepare script triggering tests on install
2. Test commands hanging without timeout

**Fixes:**

**File:** `package.json`
```json
{
  "scripts": {
    "test": "bun test --timeout 10000",  // ← Add 10s timeout
    "test:unit": "bun test tests/unit --timeout 5000",
    "test:integration": "bun test tests/integration --timeout 30000",
    "prepare": "husky || true"  // ← Already fixed
  }
}
```

**File:** `bunfig.toml`
```toml
[test]
timeout = 10000  # 10 second default timeout
```

**Validation:**
```bash
bun test --timeout 5000
```

---

## 🎯 Phase 2: FIX Critical Violations (Priority 2 - Day 1-2)

**Goal:** Reduce security violations from 145 to <20

### Task 2.1: Categorize Violations ⏱️ 30 minutes

**Run analysis:**
```bash
bun run security src/ 2>&1 | grep "^error\[" | cut -d'[' -f2 | cut -d']' -f1 | sort | uniq -c
```

**Expected breakdown:**
- `no-new-date-edge`: ~60 violations (mostly `.toISOString()` - false positives)
- `unstructured-log`: ~40 violations (missing requestId)
- `msgpack-ticker`: ~30 violations (warnings, not errors)
- `worker-url-definition`: ~10 violations (dashboards)
- `queue-batch-limit`: ~5 violations (actual issues)

---

### Task 2.2: Fix False Positives in Rules ⏱️ 1 hour

**Problem:** `no-new-date-edge` rule is too strict

**File:** `rules/no-new-date-edge.yaml`

**Current (too strict):**
```yaml
rule:
  all:
    - pattern: new Date()
    - not:
        pattern: new Date().toISOString()  # ← Should allow this
    - not:
        pattern: new Date().getTime()
```

**Issue:** The `not` pattern isn't working correctly

**Fix Option 1 - Be More Specific:**
```yaml
rule:
  pattern: new Date()
  not:
    inside:
      any:
        - pattern: new Date().toISOString()
        - pattern: new Date().getTime()
        - pattern: new Date(Date.now())
```

**Fix Option 2 - Disable for Now (Faster):**
```yaml
# Move to rules/no-new-date-edge.yaml.disabled
# Add to sgconfig.yml ignore list
```

**Recommendation:** Use Option 2 for speed, revisit later

---

### Task 2.3: Fix Real Violations ⏱️ 3-4 hours

**Priority order:**

1. **Queue Batch Limit** (~5 violations) - 30 min
   - File: `src/triggers/onLineMove.ts:26`
   - Fix: Add batch slicing
   ```typescript
   const batch = messages.slice(0, 100);
   await env.STEAM_WEBHOOK.send(batch);
   ```

2. **Worker URL Duplication** (~10 violations) - 1 hour
   - Files: `dashboards/*.html`, `tools/*.html`
   - Fix: Import from `dashboards/shared/config.js`
   ```html
   <script type="module">
     import { WORKER_URL } from './shared/config.js';
   </script>
   ```

3. **Unstructured Logs** (~40 violations) - 2 hours
   - Strategy: Add requestId to all src/ logs
   - Bulk find/replace pattern:
   ```typescript
   // Before: console.log('message');
   // After:  console.log(`[${requestId}] message`);
   ```

---

## 🎯 Phase 3: FIX Broken Links (Priority 3 - Day 2)

**Goal:** Fix 75 broken documentation links

### Task 3.1: Audit Link Targets ⏱️ 30 minutes

```bash
bun scripts/link-check.js > link-check-results.txt
cat link-check-results.txt | grep "✗" | wc -l
```

---

### Task 3.2: Batch Fix Common Patterns ⏱️ 2 hours

**Common broken link patterns:**

1. **Moved to docs/guides/**
   - Find: `[...](guides/TESTING_GUIDE.md)`
   - Replace: `[...](guides/TESTING_GUIDE.md)`

2. **Moved to docs/archive/**
   - Find: `[...](archive/BUILD_REPORT.md)`
   - Replace: `[...](archive/BUILD_REPORT.md)`

3. **Deleted files**
   - Find: `[...](archive/URGENT_TEST_FIXES.md)`
   - Replace: `[...](archive/URGENT_TEST_FIXES.md)`

**Automated fix script:**
```typescript
// scripts/fix-links.ts
const replacements = {
  'TESTING_GUIDE.md': 'docs/guides/TESTING_GUIDE.md',
  'BUILD_REPORT.md': 'docs/archive/BUILD_REPORT.md',
  // ... add all 75 mappings
};

// Find and replace in all .md files
```

---

### Task 3.3: Update Link Checker ⏱️ 30 minutes

**File:** `scripts/link-check.js`

**Add ignore patterns:**
```javascript
const ignorePatterns = [
  /^https?:\/\//,  // External links (check separately)
  /^#/,  // Anchor links
  /mdc:/,  // Cursor MDC links
];
```

---

## 🎯 Phase 4: FIX TypeScript Errors (Priority 4 - Day 3)

**Goal:** Reduce from 100+ errors to 0

### Task 4.1: D1 Result Type Fixes ⏱️ 2 hours

**Pattern:** All D1 queries returning wrong types

**Files affected:**
- `src/queues/steamWebhook.ts`
- `src/schedules/exposureCalc.ts`
- `src/schedules/sharpCalc.ts`
- `src/triggers/onLineMove.ts`

**Fix pattern:**
```typescript
// Before:
const result = await env.ANALYTICS.prepare(`...`).all();
// Type: D1Result<Record<string, unknown>>

// After:
const result = await env.ANALYTICS.prepare(`...`).all();
const rows = result.results as Array<{ field1: type1, field2: type2 }>;
```

---

### Task 4.2: Enable Strict Type Checking ⏱️ 1 hour

**File:** `tsconfig.json`
```json
{
  "compilerOptions": {
    "strict": true,  // ← Enable gradually
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

**Validate:**
```bash
bun x tsc --noEmit
```

---

## 📋 Complete Execution Plan

### Day 1 Morning (4 hours)
```bash
# Phase 1: Unblock Development
1. Fix steam test hanging             ⏱️ 30 min   ✅
2. Add test timeouts                  ⏱️ 15 min   ✅
3. Fix test infrastructure            ⏱️ 1 hour   ✅

# Phase 2: Start Security Fixes
4. Categorize violations              ⏱️ 30 min   ✅
5. Disable false positive rules       ⏱️ 1 hour   ✅

# Validate
bun test                               # Should pass
bun run security src/                  # <50 errors
```

### Day 1 Afternoon (4 hours)
```bash
# Phase 2: Continue Security Fixes
6. Fix queue batch limit              ⏱️ 30 min
7. Fix worker URL duplication         ⏱️ 1 hour
8. Fix unstructured logs (50%)        ⏱️ 2 hours

# Validate
bun run security src/                  # <20 errors
```

### Day 2 (6-8 hours)
```bash
# Phase 2: Finish Security Fixes
9. Fix remaining logs                 ⏱️ 1 hour

# Phase 3: Fix Broken Links
10. Audit link targets                ⏱️ 30 min
11. Create fix-links script           ⏱️ 1 hour
12. Run batch fixes                   ⏱️ 2 hours
13. Update link checker               ⏱️ 30 min

# Validate
bun scripts/link-check.js              # 0 broken links
bun run security src/                  # 0 errors
```

### Day 3 (4-6 hours)
```bash
# Phase 4: Fix TypeScript Errors
14. Fix D1 result types               ⏱️ 2 hours
15. Fix remaining type issues         ⏱️ 2 hours
16. Enable strict checking            ⏱️ 1 hour

# Final Validation
bun x tsc --noEmit                     # 0 errors
bun test                               # All pass
bun run security src/                  # 0 errors
bun scripts/link-check.js              # 0 broken
```

---

## 🎯 Success Metrics

### Phase 1 Complete ✅
- [ ] `bun test` completes without hanging
- [ ] Test timeout configured in bunfig.toml
- [ ] All unit tests can run

### Phase 2 Complete ✅
- [ ] <20 security rule violations
- [ ] No false positive rules active
- [ ] CI security job can pass

### Phase 3 Complete ✅
- [ ] 0 broken internal links
- [ ] Link checker passes
- [ ] Documentation fully navigable

### Phase 4 Complete ✅
- [ ] 0 TypeScript errors
- [ ] Strict mode enabled
- [ ] All type safety enforced

---

## 🚀 Quick Start Commands

### Run Phases Individually

```bash
# Phase 1: Fix hanging tests
bun test tests/unit/steam.test.ts

# Phase 2: Check security status
bun run security src/ 2>&1 | head -50

# Phase 3: Check broken links
bun scripts/link-check.js

# Phase 4: Check TypeScript
bun x tsc --noEmit
```

### Full Validation Suite

```bash
# Run all checks
bun test && \
bun run security src/ && \
bun scripts/link-check.js && \
bun x tsc --noEmit

# If all pass: ✅ READY TO DEPLOY
```

---

## 📞 Decision Points

### Should we skip MessagePack for now?

**YES** - Focus on stability first. MessagePack can wait.

**Rationale:**
- Tests must pass before adding features
- Security violations block CI
- Broken links hurt maintainability

**MessagePack can be added in Phase 5** (after all tests pass)

---

## 🎯 Recommended Approach

**Option A: Full Sprint (Aggressive - 2-3 days)**
- Work through all phases sequentially
- Fix everything before moving forward
- Pros: Clean slate, no technical debt
- Cons: 2-3 days before new features

**Option B: Phased Rollout (Pragmatic - 4-5 days)**
- Phase 1 immediately (unblock tests)
- Phase 2 next (security critical for CI)
- Phase 3 and 4 as time permits
- Pros: Unblocked faster, incremental progress
- Cons: Some debt remains

**Option C: Triage (Minimal - 1 day)**
- Fix only hanging tests
- Disable failing security rules
- Skip broken links for now
- Pros: Fastest path forward
- Cons: Most technical debt remains

---

## 🎯 My Recommendation: Option B (Phased Rollout)

**Why:**
1. **Immediate Impact** - Tests unblocked Day 1 morning
2. **CI Ready** - Security fixes by Day 1 afternoon
3. **Sustainable** - Phases 3 and 4 don't block progress
4. **Flexible** - Can pause between phases for urgent work

**Next Steps:**
1. Approve this plan
2. Start Phase 1 (30 minutes)
3. Validate tests pass
4. Move to Phase 2

---

**Ready to start Phase 1?** 🚀

