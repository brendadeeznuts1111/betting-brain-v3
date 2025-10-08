# Cursor Rules Maintenance Guide

**Version:** 1.0.0
**Last Updated:** 2025-10-08
**Status:** Production Ready

This document provides comprehensive maintenance procedures for the Cursor rules system in `.cursor/rules/`.

---

## Overview

The Cursor rules system consists of **24 MDC files** (2,200+ lines) providing AI-assisted development guidance. Each rule has:
- **Frontmatter metadata** (version, lastUpdated, dependencies)
- **Quality standards integration** (referencing infrastructure utilities)
- **Dependency relationships** (hierarchical rule dependencies)
- **ast-grep enforcement** (23 total rules, 8 quality-focused)

---

## Version Management

### Semantic Versioning

All rules follow **SemVer (X.Y.Z)**:

```
MAJOR (X): Breaking changes to rule structure or APIs
MINOR (Y): New features, patterns, or significant updates
PATCH (Z): Bug fixes, typo corrections, clarifications
```

**Current versions (as of v3.2.0):**
- **v5.0.0** (2): bun-runtime.mdc, file-naming.mdc, root-organization.mdc
- **v2.0.0** (5): cloudflare-workers.mdc, mcp-integration.mdc, security-patterns.mdc, testing-patterns.mdc, database-patterns.mdc
- **v1.1.0** (7): analytics-stub-api.mdc, analytics-testing.mdc, ci-integration.mdc, coverage-thresholds.mdc, test-setup-patterns.mdc
- **v1.0.0** (10): api-patterns.mdc, endpoint-routing.mdc, quality-standards.mdc, browser-extension.mdc, ci-patterns.mdc, code-searchability.mdc, documentation.mdc, process-management.mdc, production-security.mdc, testing.mdc

### Version Bump Guidelines

**When to bump versions:**

1. **MAJOR (X)**:
   - Removing patterns or utilities
   - Changing API contracts (e.g., function signatures)
   - Removing dependencies or breaking hierarchies

2. **MINOR (Y)**:
   - Adding new patterns or utilities
   - Adding new dependencies
   - Significant content updates (50+ lines)
   - New enforcement rules

3. **PATCH (Z)**:
   - Fixing typos or formatting
   - Clarifying existing content
   - Updating examples without changing APIs

**Procedure:**

```bash
# 1. Update version in frontmatter
version: "1.1.0"  # or 2.0.0, etc.

# 2. Update lastUpdated field
lastUpdated: "2025-10-08"

# 3. Document changes in CHANGELOG.md
## [3.2.0] - 2025-10-08
### Added
- Updated cloudflare-workers.mdc to v2.0.0 with quality standards integration

# 4. Verify with grep
grep -r "^version:" .cursor/rules/*.mdc
```

---

## Dependency Graph

Rules reference other rules via `dependencies` frontmatter field. This creates a **hierarchical dependency graph**.

### Root Dependencies (Referenced by Many)

1. **quality-standards.mdc** (v1.0.0) - Referenced by 18 rules
   - Defines: Type safety, constants, logging, error handling patterns
   - Infrastructure: src/shared/constants.ts, src/utils/request.ts, src/utils/logger.ts

2. **bun-runtime.mdc** (v5.0.0) - Referenced by 7 rules
   - Defines: Bun Test patterns, file APIs, process management

3. **api-patterns.mdc** (v1.0.0) - Referenced by 5 rules
   - Defines: Zod validation, error responses, CORS handling

### Mid-Level Dependencies

1. **testing-patterns.mdc** (v2.0.0) - Referenced by 4 rules
   - Depends on: quality-standards, bun-runtime

2. **security-patterns.mdc** (v2.0.0) - Referenced by 2 rules
   - Depends on: quality-standards, api-patterns

3. **database-patterns.mdc** (v2.0.0) - Referenced by 2 rules
   - Depends on: quality-standards

### Dependency Map

```
quality-standards.mdc (v1.0.0)
├── cloudflare-workers.mdc (v2.0.0)
├── mcp-integration.mdc (v2.0.0) [also: database-patterns, api-patterns]
├── security-patterns.mdc (v2.0.0) [also: api-patterns]
├── testing-patterns.mdc (v2.0.0) [also: bun-runtime]
├── api-patterns.mdc (v1.0.0)
│   ├── endpoint-routing.mdc (v1.0.0)
│   └── security-patterns.mdc (v2.0.0)
├── database-patterns.mdc (v2.0.0)
│   └── mcp-integration.mdc (v2.0.0)
├── ai-friendly-testing.mdc (v1.0.0) [also: testing-patterns, bun-runtime]
├── browser-extension.mdc (v1.0.0)
├── ci-patterns.mdc (v1.0.0) [also: bun-runtime]
├── code-searchability.mdc (v1.0.0)
├── production-security.mdc (v1.0.0) [also: security-patterns]
└── testing.mdc (v1.0.0) [also: testing-patterns, bun-runtime]

bun-runtime.mdc (v5.0.0)
├── process-management.mdc (v1.0.0)
├── testing-patterns.mdc (v2.0.0)
├── ai-friendly-testing.mdc (v1.0.0)
├── ci-patterns.mdc (v1.0.0)
└── testing.mdc (v1.0.0)

root-organization.mdc (v5.0.0)
└── documentation.mdc (v1.0.0)

testing-patterns.mdc (v2.0.0)
├── analytics-stub-api.mdc (v1.1.0)
├── analytics-testing.mdc (v1.1.0)
├── ai-friendly-testing.mdc (v1.0.0)
└── test-setup-patterns.mdc (v1.1.0)

coverage-thresholds.mdc (v1.1.0)
├── analytics-stub-api.mdc (v1.1.0)
├── analytics-testing.mdc (v1.1.0)
└── test-setup-patterns.mdc (v1.1.0)

file-naming.mdc (v5.0.0)
└── endpoint-routing.mdc (v1.0.0)

ci-integration.mdc (v1.1.0)
└── ci-patterns.mdc (v1.0.0)
```

### Impact Analysis

**When updating a root dependency, expect cascading updates:**

| Rule Updated | Direct Dependents | Indirect Dependents | Total Impact |
|--------------|-------------------|---------------------|--------------|
| quality-standards.mdc | 18 rules | ~5 rules | 23 rules |
| bun-runtime.mdc | 7 rules | ~4 rules | 11 rules |
| api-patterns.mdc | 5 rules | ~2 rules | 7 rules |
| testing-patterns.mdc | 4 rules | ~1 rule | 5 rules |

---

## Maintenance Schedule

### Weekly Tasks

**Every Monday morning:**

1. **Check for outdated lastUpdated fields:**
   ```bash
   cd .cursor/rules
   for f in *.mdc; do
     echo "$(grep '^lastUpdated:' $f | awk '{print $2}') - $f"
   done | sort
   ```

2. **Review ast-grep rule hits:**
   ```bash
   cd /Users/nolarose/ffffff
   sg scan --filter "detect-type-assertion-any"      # Should be 0 errors
   sg scan --filter "detect-manual-request-id"       # Track warnings
   sg scan --filter "detect-console-in-source"       # Track warnings
   ```

3. **Verify infrastructure files exist:**
   ```bash
   ls -lh src/shared/constants.ts     # Should be ~278 lines
   ls -lh src/utils/request.ts        # Should be ~371 lines
   ls -lh src/utils/logger.ts         # Should exist
   ```

### Monthly Tasks

**First week of each month:**

1. **Dependency graph audit:**
   ```bash
   # Check all dependencies resolve
   cd .cursor/rules
   for f in *.mdc; do
     echo "=== $f ==="
     grep '^dependencies:' $f
   done
   ```

2. **Version consistency check:**
   ```bash
   # Ensure all have version and lastUpdated
   grep -L "^version:" *.mdc
   grep -L "^lastUpdated:" *.mdc
   ```

3. **Cross-reference README:**
   ```bash
   # Verify README.md links to key rules
   grep -c "\.cursor/rules" /Users/nolarose/ffffff/README.md
   grep -c "quality-standards" /Users/nolarose/ffffff/README.md
   ```

4. **Update quality metrics:**
   ```bash
   # Count total rules
   ls -1 .cursor/rules/*.mdc | wc -l      # Should be 24

   # Count total lines
   cat .cursor/rules/*.mdc | wc -l        # Should be ~2,200+

   # Count ast-grep rules
   grep -c "^  - id:" /Users/nolarose/ffffff/.ast-grep.yml  # Should be 23
   ```

### Per-Release Tasks

**Before each release (e.g., v3.2.0 → v3.3.0):**

1. **Version bump all updated rules:**
   ```bash
   # Find rules updated since last release
   git diff v3.1.0..HEAD .cursor/rules/ | grep "^+++" | awk '{print $2}'

   # Bump each updated rule's version
   # Update frontmatter: version and lastUpdated
   ```

2. **Update CHANGELOG.md:**
   ```markdown
   ## [3.3.0] - 2025-10-XX
   ### Added
   - Updated X rules with new patterns
   - Added Y new quality enforcement rules

   ### Changed
   - Refactored Z patterns in quality-standards.mdc

   ### Fixed
   - Fixed typos in A, B, C rules
   ```

3. **Verify ast-grep integration:**
   ```bash
   # Run full scan
   sg scan

   # Check for new errors (should be 0)
   sg scan --filter "detect-type-assertion-any"

   # Review warnings (should be minimal)
   sg scan --filter "detect-manual-request-id" | wc -l
   ```

4. **Update package.json version:**
   ```bash
   # Bump minor version (3.2.0 → 3.3.0)
   sed -i '' 's/"version": "3.2.0"/"version": "3.3.0"/' package.json
   ```

5. **Create git commits:**
   ```bash
   git add .cursor/rules/*.mdc
   git commit -m "chore: update cursor rules for v3.3.0 release"

   git add .ast-grep.yml
   git commit -m "chore: update ast-grep rules"

   git add docs/CHANGELOG.md package.json
   git commit -m "chore: bump version to v3.3.0"
   ```

6. **Create annotated tag:**
   ```bash
   git tag -a v3.3.0 -m "Release v3.3.0: Quality standards rollout

   - Updated 5 rules with quality standards integration
   - Added 8 new ast-grep enforcement rules
   - Improved dependency graph clarity

   See CHANGELOG.md for full details."
   ```

---

## ast-grep Integration

### Current Rules (23 total)

**Security (2 errors):**
- `find-sql-injection-risk` - String interpolation in SQL queries
- `detect-type-assertion-any` - 'as any' type assertions ⚠️ **BLOCKING**

**Quality Standards (8 rules, added in v3.2.0):**
1. `detect-type-assertion-any` (ERROR) - 'as any' type assertions
2. `detect-manual-request-id` (WARNING) - Date.now().toString(36)
3. `detect-inline-cors` (WARNING) - Inline CORS headers
4. `detect-magic-numbers` (WARNING) - Magic numbers vs constants
5. `detect-unknown-as-pattern` (INFO) - 'as unknown as' casting
6. `detect-console-in-source` (WARNING) - console.log in source
7. `detect-manual-options-response` (INFO) - Manual OPTIONS responses
8. `detect-manual-json-response` (INFO) - Manual JSON responses

**Code Discovery (13 info rules):**
- API endpoints, MCP handlers, database queries, validation calls, etc.

### Running ast-grep

**Full scan:**
```bash
cd /Users/nolarose/ffffff
sg scan                          # All rules
sg scan src/                     # Specific directory
sg scan --filter "detect-*"      # Filter by pattern
```

**By severity:**
```bash
sg scan --filter "detect-type-assertion-any"  # Errors only (BLOCKING)
sg scan | grep "warning"                      # Warnings
sg scan | grep "info"                         # Info hints
```

**Count hits:**
```bash
sg scan | grep -c "error:"       # Should be 0
sg scan | grep -c "warning:"     # Track warnings
sg scan | grep -c "info:"        # Info hints
```

### Adding New Rules

**Procedure:**

1. **Edit .ast-grep.yml:**
   ```yaml
   # Add to rules section
   - id: my-new-rule
     message: "Description of what this detects"
     severity: error|warning|info
     language: TypeScript
     rule:
       pattern: $PATTERN_HERE
   ```

2. **Test the rule:**
   ```bash
   sg scan --filter "my-new-rule"
   ```

3. **Update version in .ast-grep.yml:**
   ```yaml
   # Version: 2.1.0
   # Last Updated: 2025-10-XX
   # Quality Standards Enforcement: 9 additional rules added
   ```

4. **Document in this guide:**
   - Add to "Current Rules" section above
   - Update "Quality Standards" count if applicable

5. **Update CHANGELOG.md:**
   ```markdown
   ### Added
   - ast-grep: Added `my-new-rule` to detect X pattern
   ```

### Troubleshooting ast-grep

**Issue: Rule not matching**

```bash
# Test pattern in isolation
sg -p '$PATTERN' src/

# Use ast-grep playground
open https://ast-grep.github.io/playground.html

# Check syntax
sg scan --filter "my-rule" --debug
```

**Issue: False positives**

```yaml
# Add exclusions to rule
rule:
  all:
    - pattern: $MATCH
    - not:
        pattern: $EXCEPTION
```

**Issue: Performance slow**

```yaml
# Add more specific paths to ignore
ignore:
  - "tests/**/*.test.ts"
  - "docs/**/*.md"
  - ".cursor/rules/*.mdc"
```

---

## Troubleshooting

### Common Issues

#### 1. Duplicate Metadata

**Symptom:** Multiple `version:` lines in a single .mdc file

**Fix:**
```bash
# Check for duplicates
grep -c "^version:" .cursor/rules/code-searchability.mdc

# If > 1, use fix script
awk '
  BEGIN { in_front=0; first_front_done=0; }
  /^---$/ {
    if (!first_front_done) {
      if (in_front == 0) { in_front=1; print; next }
      else { first_front_done=1; in_front=0; print; next }
    } else { next }
  }
  {
    if (/^version:|^lastUpdated:|^dependencies:/ && first_front_done) {
      next
    }
    print
  }
' .cursor/rules/code-searchability.mdc > /tmp/fixed.mdc && \
  mv /tmp/fixed.mdc .cursor/rules/code-searchability.mdc
```

#### 2. Missing Dependencies

**Symptom:** Rule references another rule but no `dependencies` field

**Fix:**
```bash
# Add dependencies to frontmatter
# Example: cloudflare-workers.mdc references quality-standards

---
version: "2.0.0"
lastUpdated: "2025-10-08"
dependencies: ["quality-standards", "api-patterns"]
---
```

#### 3. Broken Infrastructure Links

**Symptom:** Rules reference utilities that don't exist

**Check:**
```bash
# Verify infrastructure files exist
ls -lh src/shared/constants.ts
ls -lh src/utils/request.ts
ls -lh src/utils/logger.ts

# Check imports in rules
grep -r "src/shared/constants" .cursor/rules/
grep -r "src/utils/request" .cursor/rules/
grep -r "src/utils/logger" .cursor/rules/
```

**Fix:** Ensure infrastructure files exist (see docs/QUALITY_STANDARDS.md)

#### 4. Inconsistent Version Format

**Symptom:** Mix of `version: 4` and `version: "4.0.0"`

**Fix:**
```bash
# Standardize to "X.Y.Z" format
grep "^version: [0-9]$" .cursor/rules/*.mdc

# Update each file
sed -i '' 's/^version: 4$/version: "4.0.0"/' .cursor/rules/file.mdc
```

---

## Quality Metrics

### Current Status (v3.2.0)

**Rules:**
- Total rules: 24
- Total lines: 2,200+
- Versioned: 24/24 (100%)
- With dependencies: 24/24 (100%)

**Infrastructure:**
- src/shared/constants.ts: 278 lines, 12 categories
- src/utils/request.ts: 371 lines, 15+ utilities
- src/utils/logger.ts: Structured logging with StructuredLogger

**ast-grep:**
- Total rules: 23
- Quality enforcement: 8 rules
- Error-level (blocking): 2 rules
- Warning-level: 13 rules
- Info-level: 8 rules

**Dependency Graph:**
- Root dependencies: 3 (quality-standards, bun-runtime, root-organization)
- Mid-level: 5 (testing-patterns, security-patterns, database-patterns, api-patterns, endpoint-routing)
- Leaf nodes: 16

### Target Metrics (v4.0.0)

**Goals for next major version:**
- [ ] 30 total rules (add 6 new rules)
- [ ] 3,000+ total lines
- [ ] 30 ast-grep rules (add 7 new rules)
- [ ] 5 error-level rules (add 3 blocking rules)
- [ ] Zero `as any` in codebase (enforced by CI)
- [ ] 100% structured logging (replace all console.log)

---

## References

### Key Files

**Rules:**
- `.cursor/rules/*.mdc` (24 files)
- `.cursor/rules/quality-standards.mdc` (root dependency, 460 lines)

**Configuration:**
- `.ast-grep.yml` (v2.0.0, 23 rules)
- `package.json` (v3.2.0)

**Infrastructure:**
- `src/shared/constants.ts` (278 lines)
- `src/utils/request.ts` (371 lines, 15+ utilities)
- `src/utils/logger.ts` (StructuredLogger)

**Documentation:**
- `docs/QUALITY_STANDARDS.md` (571 lines, complete guide)
- `docs/CHANGELOG.md` (versioning history)
- `docs/CURSOR_RULES.md` (overview of all rules)
- `docs/CODE_QUALITY_AUDIT.md` (audit results)

### External Resources

- **ast-grep Documentation**: https://ast-grep.github.io/
- **ast-grep Playground**: https://ast-grep.github.io/playground.html
- **ast-grep CLI Reference**: https://ast-grep.github.io/reference/cli.html
- **Cursor Rules Format**: https://docs.cursor.com/context/rules
- **SemVer Specification**: https://semver.org/

---

## Changelog

### v1.0.0 (2025-10-08)
- Initial maintenance guide
- Documented version management procedures
- Created dependency graph
- Defined maintenance schedules
- Added ast-grep integration guide
- Added troubleshooting procedures

---

**Status:** Production Ready ✅
**Maintained By:** Development Team
**Review Frequency:** Monthly
