# 📁 Root Directory Structure

**Last Updated:** 2025-10-07  
**Status:** ✅ CLEAN & ORGANIZED

---

## 🎯 Current Root Structure

### Files (9 essential files only)
```
CLAUDE.md                 # AI assistant guidance (14KB)
LICENSE                   # MIT License (1KB)
README.md                 # Main documentation (12KB)
package.json              # Dependencies (3KB)
package-lock.json         # NPM lock file (58KB)
bun.lock                  # Bun lock file (5KB)
tsconfig.json             # TypeScript configuration
wrangler.toml             # Cloudflare base config
wrangler.staging.toml     # Cloudflare staging config
wrangler.production.toml  # Cloudflare production config
```

### Directories (17 directories)
```
src/                  # Source code (268KB, 29 files)
tests/                # Test suite (252KB, 28 files)
docs/                 # Documentation (628KB, 60+ files)
scripts/              # Automation scripts (128KB, 15+ files)
tools/                # HTML diagnostic tools (376KB, 18 files)
dashboards/           # HTML dashboards (188KB, 5 files)
browser-extension/    # Chrome extension (72KB, 12 files)
migrations/           # Database migrations (24KB, 4 files)
monitoring/           # Grafana configs (40KB)
deployment/           # Deployment scripts (24KB)
config/               # Additional configs (28KB, 2 files)
node_modules/         # Dependencies (440MB, gitignored)
dist/                 # Build output (132KB, gitignored)
coverage/             # Test coverage (18MB, gitignored)
.git/                 # Git repository data
.github/              # GitHub Actions workflows
.wrangler/            # Wrangler cache (gitignored)
```

---

## 🚫 What's NOT in Root

### Removed/Cleaned Up
- ❌ `~/` directory (240MB tilde directory - REMOVED)
- ❌ `vitest.config.ts` (obsolete - using Bun Test)
- ❌ `test-results.json` (CI artifact)
- ❌ 5 additional markdown files (moved to `docs/`)
- ❌ 17 `.backup` test files (removed)
- ❌ 4 vitest config files from `config/` (obsolete)

### Properly Gitignored
- ✅ `node_modules/` (440MB)
- ✅ `dist/` (build output)
- ✅ `coverage/` (test coverage)
- ✅ `.wrangler/` (Wrangler cache)
- ✅ `.env*` files (secrets)
- ✅ `test-results.json` (CI artifacts)
- ✅ `*.backup` files
- ✅ `~` and `~/` (tilde directories)

---

## 📋 File Organization Rules

### Root Files Policy
**ONLY these file types allowed in root:**
1. **README.md** - Main documentation (standard)
2. **LICENSE** - Project license (standard)
3. **CLAUDE.md** - AI assistant guidance (like CONTRIBUTING.md)
4. **package.json** - Dependencies (required)
5. **package-lock.json** - NPM lock (auto-generated)
6. **bun.lock** - Bun lock (auto-generated)
7. **tsconfig.json** - TypeScript config (standard)
8. **wrangler.toml** - Cloudflare config (required)
9. **wrangler.*.toml** - Environment configs (required)

### Where Things Go
```
Documentation → docs/
Status files → docs/
Testing guides → docs/testing/ or docs/guides/
Scripts → scripts/
Tools → tools/
Configs → config/ (if not standard root configs)
Archive → docs/archive/
```

### Forbidden in Root
- ❌ Markdown files (except README.md, LICENSE, CLAUDE.md)
- ❌ Test results / CI artifacts
- ❌ Backup files
- ❌ Temporary files
- ❌ Build output
- ❌ Coverage reports
- ❌ Tilde directories (~, ~/)

---

## 🔍 Directory Purposes

### `/src` (Source Code)
```
src/
├── index.ts              # Main entry point
├── mcp/                  # MCP server (13 files)
├── tools/                # Intelligence APIs (4 files)
├── queues/               # Queue consumers (2 files)
├── schedules/            # Cron jobs (2 files)
├── triggers/             # Database triggers (1 file)
├── interceptors/         # API interception (1 file)
├── guards/               # Rate limits & cost caps (2 files)
├── types/                # TypeScript definitions (3 files)
└── utils/                # Shared utilities (3 files)
```

### `/tests` (Test Suite)
```
tests/
├── unit/                 # Unit tests (9 files)
├── integration/          # Integration tests (8 files)
├── e2e/                  # End-to-end tests
├── mocks/                # Test mocks (2 files)
├── setup/                # Test configuration (4 files)
└── utils/                # Test utilities (1 file)
```

### `/docs` (Documentation)
```
docs/
├── guides/               # User guides (9 files)
├── testing/              # Testing docs (3 files)
├── deployment/           # Deployment docs (9 files)
├── dashboards/           # Dashboard docs
├── debug/                # Debug guides
├── implementation/       # Technical docs
├── archive/              # Historical docs (18 files)
└── [status files]        # MCP, Testing, Automation, etc.
```

### `/scripts` (Automation)
```
scripts/
├── automation/           # Build & test scripts
├── testing/              # Test runners
├── test-mcp.ts           # MCP testing
├── test-handlers-direct.ts # Direct handler tests
├── format.ts             # Code formatting
├── lint.ts               # Linting
└── [deploy scripts]      # Deployment automation
```

### `/tools` (HTML Tools)
```
tools/
├── index.html            # Tools hub
├── extension-checker.html
├── extension-test-suite.html
├── flow-tester.html
├── system-health-monitor.html
├── troubleshooting-guide.html
└── [additional tools]
```

### `/dashboards` (HTML Dashboards)
```
dashboards/
├── index.html            # Dashboard hub
├── dashboard.html        # Basic
├── dashboard-enhanced.html # Advanced
├── dashboard-pro.html    # AI-powered
└── dashboard-positions.html # Risk tracking
```

### `/config` (Additional Configs)
```
config/
├── bunfig.toml           # Bun configuration
└── tsconfig.json         # TypeScript config (extends root)
```

---

## 📊 Size Analysis

### Total Project Size
```
Source code:       268KB
Tests:            252KB
Documentation:    628KB
Scripts:          128KB
Tools:            376KB
Dashboards:       188KB
Extension:         72KB
Configs:           28KB
---
Active codebase: ~2MB

Ignored:
node_modules:    440MB
coverage:         18MB
---
Total:          ~460MB
```

### Cleanup Impact
```
Before Cleanup:
- Root files: 15+
- Tilde directory: 240MB
- Obsolete configs: 5 files
- Total size: ~700MB

After Cleanup:
- Root files: 9 (essential only)
- Tilde directory: 0MB
- Obsolete configs: 0
- Total size: ~460MB

Space saved: 240MB
Organization: ✅ CLEAN
```

---

## ✅ Verification Commands

### Check Root Cleanliness
```bash
# List root files only
ls -1 *.{md,json,toml,ts} 2>/dev/null

# Should show exactly:
# CLAUDE.md
# README.md
# package.json
# package-lock.json
# tsconfig.json
# wrangler.toml
# wrangler.production.toml
# wrangler.staging.toml
```

### Verify Gitignore
```bash
# Check ignored files
git status --ignored

# Should NOT show:
# - node_modules/
# - dist/
# - coverage/
# - test-results.json
# - ~/
```

### Count Files
```bash
# Root files only (should be ~9)
ls -1 | grep -E "\.(md|json|toml|ts)$" | wc -l

# All directories (should be ~17)
ls -d */ | wc -l
```

---

## 🔒 Maintenance Rules

### Before Creating Any File in Root
**Ask yourself:**
1. Is this a standard project file? (package.json, README.md, etc.)
2. Is this a required configuration? (tsconfig.json, wrangler.toml)
3. Can this go in a subdirectory instead? (**YES → Move it to docs/ or appropriate dir**)

### Regular Cleanup Checklist
- [ ] No temporary files in root
- [ ] No test artifacts in root
- [ ] No backup files anywhere
- [ ] All docs in `docs/`
- [ ] All scripts in `scripts/`
- [ ] All tools in `tools/`
- [ ] Git status is clean

---

## 📚 Related Documentation

- **[docs/CLEANUP_PLAN.md](./CLEANUP_PLAN.md)** - Detailed cleanup plan & decisions
- **[docs/CODEBASE_REVIEW.md](./CODEBASE_REVIEW.md)** - Full codebase review
- **[docs/PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)** - Project architecture

---

**Maintained By:** AI Assistant (Claude)  
**Last Review:** 2025-10-07  
**Status:** ✅ CLEAN & ORGANIZED

---

*This document is auto-generated and should be updated whenever root structure changes.*

