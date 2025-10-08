# 🤖 Cursor Rules Automation Guide

**Date:** 2025-10-07  
**Status:** ✅ **COMPLETE - FULLY AUTOMATED VERSIONING**  
**Version:** 4.1.0

---

## 🎯 Overview

This guide covers the **fully automated versioning system** for cursor rules, including the version bump script, CI/CD integration, and team workflow.

---

## 🚀 Automation Components

### **1. Version Bump Script** 🔧

**File:** `scripts/bump-version.sh`

**Features:**
- ✅ **Automated Version Calculation**: Handles MAJOR.MINOR.PATCH incrementing
- ✅ **File Update**: Automatically updates `.cursorrules` version
- ✅ **Git Integration**: Creates commit and tag automatically
- ✅ **Error Handling**: Validates inputs and provides clear error messages
- ✅ **Cross-Platform**: Works on macOS and Linux

**Usage:**
```bash
# Make script executable (one-time setup)
chmod +x scripts/bump-version.sh

# Patch version (4.0.0 → 4.0.1)
./scripts/bump-version.sh patch "fix(rules): Corrected typo in regex"

# Minor version (4.0.0 → 4.1.0)
./scripts/bump-version.sh minor "feat(rules): Add new rules for async/await"

# Major version (4.0.0 → 5.0.0)
./scripts/bump-version.sh major "feat(rules): Restructure rule organization"
```

### **2. Enhanced CI/CD Workflow** 🤖

**File:** `.github/workflows/rules_version_check.yml`

**Features:**
- ✅ **Path-Based Triggering**: Only runs when `.cursorrules` is modified
- ✅ **Version Comparison**: Compares old vs new versions automatically
- ✅ **Automated Validation**: Fails if version not incremented
- ✅ **Clear Feedback**: Provides success/error messages

### **3. Enhanced PR Template** 📝

**File:** `.github/pull_request_template.md`

**Features:**
- ✅ **Style Guide Rules Update Section**: Dedicated versioning section
- ✅ **Version Tracking**: Old/New version comparison
- ✅ **Change Type Classification**: MAJOR/MINOR/PATCH identification
- ✅ **Testing Documentation**: Test configuration tracking

---

## 🔄 Complete Workflow

### **Developer Workflow**

#### **Step 1: Make Changes**
```bash
# Edit the .cursorrules file
code .cursorrules

# Make your changes (add, remove, modify rules)
```

#### **Step 2: Determine Change Type**
```bash
# PATCH: Small fixes, typos, documentation
# MINOR: New features, enhancements (backward compatible)
# MAJOR: Breaking changes, rule restructuring
```

#### **Step 3: Run Version Bump Script**
```bash
# For a patch change
./scripts/bump-version.sh patch "fix(rules): Corrected typo in regex"

# For a minor change
./scripts/bump-version.sh minor "feat(rules): Add new rules for async/await"

# For a major change
./scripts/bump-version.sh major "feat(rules): Restructure rule organization"
```

**Script Output:**
```bash
Current version: 4.0.0
New version:     4.1.0
✅ Successfully bumped version to 4.1.0 and tagged as v4.1.0.
➡️  Now run 'git push origin main --tags' to push your changes.
```

#### **Step 4: Push and Create PR**
```bash
# Push changes and tags
git push origin <your-branch-name> --tags

# Create pull request
# PR template will auto-populate with versioning section
```

#### **Step 5: CI Validation**
- ✅ **Automated Check**: CI runs only if `.cursorrules` modified
- ✅ **Version Validation**: Compares old vs new versions
- ✅ **Success/Error**: Clear feedback on version increment

---

## 📊 Automation Benefits

### **1. Developer Experience**
- ✅ **One Command**: Single script handles version bump, commit, and tag
- ✅ **Error Prevention**: Script validates inputs and prevents mistakes
- ✅ **Clear Feedback**: Success/error messages guide the process
- ✅ **Cross-Platform**: Works on macOS and Linux

### **2. Team Consistency**
- ✅ **Standardized Process**: Everyone uses the same script
- ✅ **Automated Validation**: CI ensures compliance
- ✅ **Clear Documentation**: Step-by-step process guide
- ✅ **Quality Assurance**: Automated checks prevent mistakes

### **3. Professional Output**
- ✅ **Semantic Versioning**: Industry-standard versioning
- ✅ **Git Tags**: Immutable version records
- ✅ **Changelog Integration**: Automated changelog entries
- ✅ **Audit Trail**: Complete history of all changes

---

## 🛠️ Script Details

### **Version Bump Script Features**

#### **Input Validation**
```bash
if [ -z "$VERSION_TYPE" ] || [ -z "$COMMIT_MESSAGE" ]; then
  echo "❌ Error: Missing arguments."
  echo "Usage: $0 <major|minor|patch> \"Your commit message\""
  exit 1
fi
```

#### **Version Calculation**
```bash
case "$VERSION_TYPE" in
  major)
    MAJOR=$((MAJOR + 1))
    MINOR=0
    PATCH=0
    ;;
  minor)
    MINOR=$((MINOR + 1))
    PATCH=0
    ;;
  patch)
    PATCH=$((PATCH + 1))
    ;;
esac
```

#### **File Update**
```bash
# Update version in .cursorrules file
sed -i.bak "s/^version: $CURRENT_VERSION/version: $NEW_VERSION/" $RULES_FILE
rm "${RULES_FILE}.bak"
```

#### **Git Integration**
```bash
# Commit and tag
git add $RULES_FILE
git commit -m "$COMMIT_MESSAGE"
git tag "v$NEW_VERSION"
```

---

## 🎯 Usage Examples

### **Example 1: Patch Change**
```bash
# Current version: 4.0.0
./scripts/bump-version.sh patch "fix(rules): Corrected typo in regex"

# Output:
# Current version: 4.0.0
# New version:     4.0.1
# ✅ Successfully bumped version to 4.0.1 and tagged as v4.0.1.
# ➡️  Now run 'git push origin main --tags' to push your changes.
```

### **Example 2: Minor Change**
```bash
# Current version: 4.0.1
./scripts/bump-version.sh minor "feat(rules): Add new rules for async/await"

# Output:
# Current version: 4.0.1
# New version:     4.1.0
# ✅ Successfully bumped version to 4.1.0 and tagged as v4.1.0.
# ➡️  Now run 'git push origin main --tags' to push your changes.
```

### **Example 3: Major Change**
```bash
# Current version: 4.1.0
./scripts/bump-version.sh major "feat(rules): Restructure rule organization"

# Output:
# Current version: 4.1.0
# New version:     5.0.0
# ✅ Successfully bumped version to 5.0.0 and tagged as v5.0.0.
# ➡️  Now run 'git push origin main --tags' to push your changes.
```

---

## 🔍 Error Handling

### **Common Errors and Solutions**

#### **Missing Arguments**
```bash
./scripts/bump-version.sh
# ❌ Error: Missing arguments.
# Usage: ./scripts/bump-version.sh <major|minor|patch> "Your commit message"
```

#### **Invalid Version Type**
```bash
./scripts/bump-version.sh invalid "test message"
# ❌ Error: Invalid version type 'invalid'. Use 'major', 'minor', or 'patch'.
```

#### **Version Not Found**
```bash
# If .cursorrules doesn't have version field
# ❌ Error: Could not find version in .cursorrules.
```

#### **Git Issues**
```bash
# If not in a git repository
# git: 'add' is not a git command
```

---

## 📚 Related Documentation

- **[Version Bump Script](scripts/bump-version.sh)** - Automation script
- **[CI Workflow](.github/workflows/rules_version_check.yml)** - Automated validation
- **[PR Template](.github/pull_request_template.md)** - Enhanced with versioning
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Team workflow guide
- **[Versioning Guide](../CURSOR_RULES_VERSIONING.md)** - SemVer guidelines

---

## 🎯 Quick Reference

### **Script Usage**
```bash
# Make executable (one-time)
chmod +x scripts/bump-version.sh

# Usage
./scripts/bump-version.sh <major|minor|patch> "Your commit message"

# Examples
./scripts/bump-version.sh patch "fix(rules): Corrected typo"
./scripts/bump-version.sh minor "feat(rules): Add new rules"
./scripts/bump-version.sh major "feat(rules): Restructure rules"
```

### **Complete Workflow**
```bash
1. Edit .cursorrules file
2. Determine change type (PATCH/MINOR/MAJOR)
3. Run version bump script
4. Push changes and tags
5. Create pull request
6. CI validates version increment
```

---

**Status:** ✅ **COMPLETE**  
**Automation Level:** Full  
**Version:** 4.1.0  
**Team Adoption:** ✅ Ready  
**Documentation:** ✅ Comprehensive  

The cursor rules system now has **full automation** with version bump scripts, CI/CD integration, and comprehensive team documentation. Every developer can easily maintain versioned rules with a single command.
