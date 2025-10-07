# 🧹 Root Directory Cleanup Plan

**Date:** 2025-10-07  
**Priority:** HIGH - Multiple Issues Found

---

## 🚨 CRITICAL ISSUES

### 1. `~/` Symlink (IMMEDIATE ACTION REQUIRED)
**Status:** 🔴 **CRITICAL**  
**Size:** 240MB  
**Issue:** Symlink to user's home directory in project root

**Risk:**
- Exposing entire home directory structure
- Potential security/privacy issue if committed
- 240MB of unnecessary data in project tree

**Action:**
```bash
# Remove symlink immediately
rm ~/

# Add to .gitignore
echo "~/" >> .gitignore

# Verify it's gone
ls -la | grep "~"
```

---

## ⚠️ HIGH PRIORITY ISSUES

### 2. Duplicate Configuration Files
**Status:** ⚠️ **REDUNDANT**

**Duplicates Found:**
```
ROOT:
- tsconfig.json (584B)
- vitest.config.ts (667B)

config/:
- tsconfig.json (different file)
- vitest.config.ts (667B)
- vitest.integration.config.ts
- vitest.production.config.ts
- vitest.staging.config.ts
- bunfig.toml
```

**Questions:**
- Which tsconfig.json is actually used?
- Are vitest configs still needed? (project uses Bun Test)
- Should all configs live in `config/` directory?

**Recommendation:**
```bash
# Option A: Keep root configs (common practice)
rm config/tsconfig.json
rm config/vitest*.ts

# Option B: Centralize in config/ (cleaner root)
mv tsconfig.json config/
mv vitest.config.ts config/
# Update references in package.json
```

---

### 3. Vitest Configs (Obsolete?)
**Status:** ⚠️ **POTENTIALLY OBSOLETE**  
**Files:** 5 vitest config files  
**Size:** ~4KB

**Issue:**
- Project uses Bun Test (not Vitest)
- package.json has no vitest dependency
- 5 vitest config files taking up space

**Action:**
```bash
# Verify vitest is not used
grep -r "vitest" package.json  # No matches found

# Remove if confirmed obsolete
rm vitest.config.ts
rm config/vitest*.ts
```

---

### 4. `.env` Files in Root
**Status:** ⚠️ **REVIEW NEEDED**  
**Files:**
- `.env.example` (1KB) - not found?
- `.env.local` (1.7KB) - in .gitignore ✅

**Action:**
- Verify .env files are properly gitignored
- Create .env.example template if needed
- Document required env vars

---

### 5. `test-results.json` Not Ignored
**Status:** ⚠️ **SHOULD BE GITIGNORED**  
**Size:** 719B  
**Issue:** CI artifact in root

**Current .gitignore:**
```gitignore
# Test Results & CI Artifacts
test-results.json  ← Already listed!
```

**Problem:** File exists despite being in .gitignore

**Action:**
```bash
# Remove from git if tracked
git rm --cached test-results.json

# Verify it's ignored
git status
```

---

## 📋 MEDIUM PRIORITY

### 6. Large Ignored Directories
**Status:** ℹ️ **GITIGNORED BUT LARGE**

```
node_modules/  440MB  ✅ Ignored
coverage/       18MB  ✅ Ignored
dist/          132KB  ✅ Ignored
.wrangler/     ???    ✅ Ignored
```

**Action:** None needed (properly ignored)

---

### 7. Multiple Wrangler Configs
**Status:** ℹ️ **OK BUT COULD BE ORGANIZED**  
**Files:**
- `wrangler.toml` (base config)
- `wrangler.staging.toml`
- `wrangler.production.toml`

**Options:**
- Keep as-is (common practice)
- Move to `config/wrangler/` directory
- Use single wrangler.toml with env variables

---

## 🎯 RECOMMENDED ROOT STRUCTURE

### Current Root Files
```
❌ ~/                     # REMOVE IMMEDIATELY
❌ test-results.json      # Already gitignored (but tracked?)
❓ tsconfig.json          # Duplicate? Which one is used?
❓ vitest.config.ts       # Obsolete? (uses Bun Test)
✅ .gitignore
✅ CLAUDE.md
✅ LICENSE
✅ README.md
✅ package.json
✅ package-lock.json
✅ bun.lock
✅ wrangler.toml
✅ wrangler.staging.toml
✅ wrangler.production.toml
```

### Ideal Root Structure (Option A: Keep Common Configs)
```
ROOT FILES (14 files):
✅ README.md              # Documentation
✅ LICENSE                # License
✅ CLAUDE.md              # AI guidance
✅ .gitignore             # Git ignore
✅ package.json           # Dependencies
✅ package-lock.json      # NPM lock
✅ bun.lock               # Bun lock
✅ tsconfig.json          # TypeScript config
✅ wrangler.toml          # Cloudflare base
✅ wrangler.staging.toml  # Cloudflare staging
✅ wrangler.production.toml # Cloudflare prod

ROOT DIRECTORIES:
✅ src/                   # Source code
✅ tests/                 # Tests
✅ docs/                  # Documentation
✅ scripts/               # Automation
✅ tools/                 # HTML tools
✅ dashboards/            # HTML dashboards
✅ browser-extension/     # Extension
✅ migrations/            # Database
✅ monitoring/            # Grafana
✅ deployment/            # Deploy scripts
✅ config/                # Additional configs
✅ node_modules/          # Dependencies (ignored)
✅ dist/                  # Build output (ignored)
✅ coverage/              # Test coverage (ignored)
✅ .git/                  # Git data
✅ .github/               # GitHub workflows
✅ .vscode/               # VS Code
✅ .wrangler/             # Wrangler cache (ignored)
```

### Ideal Root Structure (Option B: Centralized Config)
```
Same as above but:
- Move tsconfig.json → config/
- Remove vitest configs
- Add config/README.md explaining structure
```

---

## ✅ ACTION CHECKLIST

### IMMEDIATE (Security Risk)
- [ ] Remove `~/` symlink
- [ ] Add `~/` to .gitignore
- [ ] Verify removal: `ls -la | grep ~`

### HIGH PRIORITY (Cleanup)
- [ ] Remove or untrack `test-results.json`
- [ ] Decide on vitest configs (delete if unused)
- [ ] Resolve tsconfig.json duplication
- [ ] Review .env files

### MEDIUM PRIORITY (Organization)
- [ ] Consider consolidating configs in `config/`
- [ ] Document required env variables
- [ ] Review wrangler config structure

---

## 🚀 Cleanup Commands

### Quick Cleanup Script
```bash
#!/bin/bash
# cleanup-root.sh

echo "🧹 Cleaning up root directory..."

# 1. CRITICAL: Remove home directory symlink
if [ -L "~/" ]; then
  echo "⚠️  Removing home directory symlink..."
  rm ~/
  echo "~/\n~" >> .gitignore
fi

# 2. Remove CI artifacts
echo "📊 Removing test artifacts..."
git rm --cached test-results.json 2>/dev/null || rm test-results.json

# 3. Remove obsolete vitest configs (if confirmed)
read -p "Remove vitest configs? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  rm vitest.config.ts
  rm config/vitest*.ts
  echo "✅ Vitest configs removed"
fi

# 4. Review status
echo "📊 Current root status:"
ls -1 *.{json,toml,ts,md} 2>/dev/null | wc -l
echo "files remaining"

git status --short

echo "✅ Cleanup complete!"
```

---

## 📊 Before/After Comparison

### Before
```
Root Files: 15+ config files
Symlinks: 1 (~/  - 240MB home directory)
Issues: 5 high-priority
Clutter: High
```

### After
```
Root Files: 11 essential files
Symlinks: 0
Issues: 0
Clutter: Minimal
```

---

## 🤔 Decision Needed

**Question for User:**

1. **tsconfig.json location?**
   - [ ] Keep in root (common)
   - [ ] Move to config/ (cleaner)

2. **Vitest configs?**
   - [ ] Delete all (use Bun Test)
   - [ ] Keep for future

3. **Wrangler configs?**
   - [ ] Keep in root
   - [ ] Move to config/wrangler/

4. **.env handling?**
   - [ ] Create .env.example
   - [ ] Document in README

---

**Next Actions:** Review this plan and approve immediate fixes!


