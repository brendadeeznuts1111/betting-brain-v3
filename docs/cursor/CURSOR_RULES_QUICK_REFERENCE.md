# 🚀 Cursor Rules Quick Reference

**Copy-paste ready commands and workflows for cursor rules management.**

---

## 🔧 **One-Time Setup**

```bash
# Make version bump script executable
chmod +x scripts/bump-version.sh
```

---

## 📝 **Making Rule Changes**

### **Step 1: Edit Rules**
```bash
# Edit the main rules file
code .cursorrules

# Or edit specific rule files
code .cursor/rules/api-patterns.mdc
```

### **Step 2: Determine Change Type**
- **PATCH** (x.y.z+1): Small fixes, typos, documentation
- **MINOR** (x.y+1.0): New features, enhancements (backward compatible)
- **MAJOR** (x+1.0.0): Breaking changes, rule restructuring

### **Step 3: Run Version Bump Script**
```bash
# Patch version (4.0.0 → 4.0.1)
./scripts/bump-version.sh patch "fix(rules): Corrected typo in regex"

# Minor version (4.0.0 → 4.1.0)
./scripts/bump-version.sh minor "feat(rules): Add new rules for async/await"

# Major version (4.0.0 → 5.0.0)
./scripts/bump-version.sh major "feat(rules): Restructure rule organization"
```

### **Step 4: Push and Create PR**
```bash
# Push changes and tags
git push origin <your-branch-name> --tags

# Create pull request
# PR template will auto-populate with versioning section
```

---

## 🎯 **Quick Commands**

### **Version Bump Script**
```bash
# Usage
./scripts/bump-version.sh <major|minor|patch> "Your commit message"

# Examples
./scripts/bump-version.sh patch "fix(rules): Corrected typo"
./scripts/bump-version.sh minor "feat(rules): Add new rules"
./scripts/bump-version.sh major "feat(rules): Restructure rules"
```

### **CI Validation**
```bash
# Run local CI checks
bun run ci

# Check security patterns
sg scan src/

# Validate cursor rules compliance
cursor --check
```

### **Git Operations**
```bash
# Push changes and tags
git push origin <branch-name> --tags

# List all tags
git tag -l

# Show tag details
git show v4.1.0
```

---

## 📋 **PR Template Checklist**

### **Style Guide Rules Update**
- [ ] No changes to `.cursorrules` are included in this PR.
- [ ] This PR updates `.cursorrules`. I have incremented the version number accordingly.
  - **Old Version**: `X.Y.Z`
  - **New Version**: `X.Y.Z`
  - **Change Type**: (MAJOR/MINOR/PATCH)

### **Testing**
- [ ] All tests pass locally
- [ ] Security scan passes (`sg scan src/`)
- [ ] No TypeScript errors

---

## 🔍 **Troubleshooting**

### **Script Errors**
```bash
# Missing arguments
❌ Error: Missing arguments.
Usage: ./scripts/bump-version.sh <major|minor|patch> "Your commit message"

# Invalid version type
❌ Error: Invalid version type 'invalid'. Use 'major', 'minor', or 'patch'.

# Version not found
❌ Error: Could not find version in .cursorrules.
```

### **CI Errors**
```bash
# Version not incremented
❌ Error: The version in .cursorrules was not incremented.

# SemVer format error
❌ Error: Version must follow Semantic Versioning (SemVer) format: MAJOR.MINOR.PATCH
```

### **Git Errors**
```bash
# Not in git repository
git: 'add' is not a git command

# Tag already exists
fatal: tag 'v4.1.0' already exists
```

---

## 📚 **Related Files**

| File | Purpose |
|------|---------|
| **`.cursorrules`** | Main rules file (canonical) |
| **`scripts/bump-version.sh`** | Version bump automation |
| **`.github/workflows/rules_version_check.yml`** | CI validation |
| **`.github/pull_request_template.md`** | PR template with versioning |
| **`CHANGELOG.md`** | Version history |
| **`docs/CONTRIBUTING.md`** | Team workflow guide |

---

## 🎯 **Decision Tree**

```
Modified .cursorrules?
├── No → No version change needed
└── Yes → What type of change?
    ├── Small fix/typo → PATCH (4.0.0 → 4.0.1)
    ├── New feature → MINOR (4.0.0 → 4.1.0)
    └── Breaking change → MAJOR (4.0.0 → 5.0.0)
```

---

## 🚀 **Complete Workflow**

```bash
1. Edit .cursorrules file
2. Determine change type (PATCH/MINOR/MAJOR)
3. Run: ./scripts/bump-version.sh <type> "message"
4. Push: git push origin <branch> --tags
5. Create PR (template auto-populates)
6. CI validates version increment
```

---

**Status:** ✅ **READY**  
**Automation:** ✅ **FULLY AUTOMATED**  
**Team Adoption:** ✅ **DOCUMENTED**  
**Version:** 4.1.0
