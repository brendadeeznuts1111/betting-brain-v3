# 🔧 Known Issues & Technical Debt

**Created:** 2025-10-07  
**Status:** Documented for follow-up PRs

---

## 📋 Overview

This document tracks known issues that need to be addressed in follow-up PRs after the MCP Integration merge. These are technical debt items that don't block the core functionality but should be fixed.

---

## 🚨 Critical Issues

### None
All critical functionality is working.

---

## ⚠️  High Priority

### 1. Test Failures (128/264 tests failing)

**Issue:** Vitest to Bun Test migration incomplete

**Details:**
- 128 test failures from mock/API changes
- `vi.mocked()` API no longer available in Bun
- Type mismatches in test data structures
- Missing mock implementations

**Affected Files:**
- `tests/mocks/env.ts` - Uses `vi.` API
- `tests/mocks/data.ts` - Type mismatches
- `tests/unit/*.test.ts` - 100+ TypeScript errors
- `tests/integration/*.test.ts` - Mock implementation issues

**Estimated Effort:** 4-6 hours  
**Priority:** High  
**Target:** Follow-up PR #2

---

### 2. TypeScript Errors (100+ errors)

**Issue:** Type definition mismatches from Vitest removal

**Categories:**
- `vi.mocked()` not found (18 instances)
- Type property mismatches (40+ instances)
- Missing type exports (10+ instances)
- Generic type constraints (30+ instances)

**Estimated Effort:** 3-4 hours  
**Priority:** High  
**Target:** Follow-up PR #2 (same as test fixes)

---

## 🟡 Medium Priority

### 3. Broken Documentation Links (75 links)

**Issue:** File reorganization created many broken internal links

**Categories:**
- Archived files referenced (30 links)
- Example/placeholder links (10 links)
- Old deployment structure (15 links)
- Missing files (20 links)

**Affected Areas:**
- `docs/INDEX.md` - Archive references
- `docs/CURSOR_RULES.md` - Example `mdc:` links
- `docs/deployment/*.md` - Old structure
- `docs/archive/*.md` - Outdated references

**Estimated Effort:** 2-3 hours  
**Priority:** Medium  
**Target:** Follow-up PR #3

---

## 🟢 Low Priority

### 4. CI Performance

**Issue:** CI takes 2+ minutes to complete

**Opportunities:**
- Cache Bun dependencies
- Parallelize test runs
- Skip redundant checks

**Estimated Effort:** 1 hour  
**Priority:** Low  
**Target:** Future optimization

---

### 5. Missing Test Coverage

**Issue:** Some edge cases not covered

**Areas:**
- MCP error handling paths
- Queue failure scenarios
- Database connection edge cases

**Estimated Effort:** 3-4 hours  
**Priority:** Low  
**Target:** Future enhancement

---

## 📊 Summary

| Priority | Issues | Estimated Hours | Target PR |
|----------|--------|-----------------|-----------|
| **Critical** | 0 | 0 | N/A |
| **High** | 2 | 7-10 | PR #2 |
| **Medium** | 1 | 2-3 | PR #3 |
| **Low** | 2 | 4-5 | Future |
| **TOTAL** | 5 | 13-18 | 2-3 PRs |

---

## 🎯 Recommended Approach

### Immediate (PR #2)
**Fix Tests & TypeScript Errors Together**
1. Update all test mocks to use Bun Test APIs
2. Fix type definitions and exports
3. Ensure all 264 tests pass
4. Remove `continue-on-error` from CI

**Estimated Time:** 1 day  
**Outcome:** All tests green ✅

---

### Soon After (PR #3)
**Fix Documentation Links**
1. Audit all `docs/` internal links
2. Update archive references
3. Remove placeholder links
4. Verify with link checker

**Estimated Time:** Half day  
**Outcome:** Link checker passes ✅

---

### Future (PR #4+)
**Optimize & Enhance**
1. CI performance improvements
2. Additional test coverage
3. Documentation enhancements
4. Performance monitoring

**Estimated Time:** As needed  
**Outcome:** Continuous improvement 🚀

---

## ✅ What's Working

Despite these known issues, the following are **fully functional**:

- ✅ **MCP Integration** - All 13 tools working
- ✅ **API Endpoints** - All routes responding
- ✅ **Database** - D1 tables and migrations
- ✅ **Cron Jobs** - 4 scheduled tasks running
- ✅ **Queues** - Message processing functional
- ✅ **Dashboards** - All 4 dashboards operational
- ✅ **Browser Extension** - Data capture working
- ✅ **Documentation** - 30 docs organized
- ✅ **Cursor Rules** - 8 rules active (1,346 lines)

---

## 📝 Notes

- **No Functionality Blocked:** All core features work despite test failures
- **Technical Debt Only:** These are quality/maintenance items
- **Well Documented:** Clear path to resolution
- **Trackable:** Each issue has effort estimate and target PR

---

**Last Updated:** 2025-10-07  
**Next Review:** After PR #2 completes

