# 📋 Cursor Rules Versioning Guide

**Date:** 2025-10-07  
**Status:** ✅ **ACTIVE**  
**Current Version:** 4.0.0

---

## 🎯 Overview

This guide explains how to properly version and manage changes to the Cursor Rules system using **Semantic Versioning (SemVer)** and Git workflow integration.

## 📚 What is Semantic Versioning?

[Semantic Versioning (SemVer)](https://semver.org/) is a versioning scheme that uses a three-part version number: `MAJOR.MINOR.PATCH`

### Version Components

| Component | When to Increment | Example | Impact |
|-----------|-------------------|---------|---------|
| **MAJOR** (x.0.0) | Breaking changes that require code refactoring | 4.0.0 → 5.0.0 | High - may break existing code |
| **MINOR** (x.y.0) | New features, enhancements (backward compatible) | 4.0.0 → 4.1.0 | Medium - new capabilities |
| **PATCH** (x.y.z) | Bug fixes, small improvements (backward compatible) | 4.0.0 → 4.0.1 | Low - fixes and improvements |

---

## 🔄 Versioning Workflow

### 1. Making Changes to Cursor Rules

When you modify the `.cursorrules` file or any rule in `.cursor/rules/`:

#### Step 1: Determine the Change Type
```bash
# PATCH: Small fixes, typos, documentation
# Examples:
- Fix typo in rule description
- Add example to existing rule
- Improve documentation clarity
- Fix broken link

# MINOR: New features, enhancements
# Examples:
- Add new rule category (e.g., new technology patterns)
- Enhance existing rules with new capabilities
- Add new best practices or patterns
- Improve rule organization

# MAJOR: Breaking changes
# Examples:
- Remove existing rules
- Change rule syntax or format requirements
- Break backward compatibility
- Restructure rule organization fundamentally
```

#### Step 2: Update Version in .cursorrules
```yaml
---
version: 4.1.0  # Increment according to change type
scope: ["typescript", "javascript", "markdown", "sql", "html", "json", "yaml", "toml"]
---
```

#### Step 3: Update CHANGELOG.md
```markdown
## [4.1.0] - 2025-10-07

### Added
- New security patterns for API endpoints
- Enhanced database query validation

### Changed
- Updated Bun runtime patterns for better performance
- Improved error handling examples

### Fixed
- Fixed typo in production security rule description
```

#### Step 4: Create Git Tag
```bash
# Create and push the tag
git tag v4.1.0
git push origin v4.1.0
```

---

## 🤖 CI/CD Integration

### Automated Checks

The CI workflow automatically validates:

1. **SemVer Format**: Ensures version follows `MAJOR.MINOR.PATCH` format
2. **Version Increment**: Checks if version was incremented when rules change
3. **CHANGELOG Entry**: Validates changelog entry exists for new versions
4. **Git Tag**: Suggests creating Git tag for version

### CI Workflow Steps

```yaml
# .github/workflows/cursor-rules-check.yml
- name: Validate Semantic Versioning (SemVer) format
- name: Check if version was incremented (if rules changed)
- name: Validate CHANGELOG.md entry exists (if version changed)
```

### CI Error Messages

The CI provides helpful error messages:

```bash
# SemVer format error
::error::Version must follow Semantic Versioning (SemVer) format: MAJOR.MINOR.PATCH
Current version: 4.0
Expected format: 4.0.0, 4.1.0, 5.0.0, etc.

# Version increment error
::error::Version must be incremented when .cursorrules is modified
Previous: 4.0.0 → Current: 4.0.0
Please increment the version according to SemVer guidelines:
  - PATCH (x.y.z+1): Small fixes, typos, documentation
  - MINOR (x.y+1.0): New features, enhancements
  - MAJOR (x+1.0.0): Breaking changes, rule restructuring
```

---

## 📝 CHANGELOG.md Format

### Entry Structure

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- New features or capabilities

### Changed
- Changes to existing functionality

### Deprecated
- Soon-to-be removed features

### Removed
- Removed features

### Fixed
- Bug fixes

### Security
- Security-related changes
```

### Example Entry

```markdown
## [4.1.0] - 2025-10-07

### Added
- **Security Patterns**: New comprehensive security rule covering input validation, SQL injection prevention, and CORS configuration
- **Database Patterns**: Enhanced D1 query patterns with performance optimization
- **Browser Extension**: New rule for Manifest V3 development patterns

### Changed
- **API Patterns**: Enhanced error handling examples with more comprehensive patterns
- **Testing Patterns**: Updated Bun Test patterns with better cleanup examples
- **File Organization**: Improved root directory organization guidelines

### Fixed
- **Production Security**: Fixed typo in parseFloat security warning
- **Documentation**: Fixed broken link to REST API reference

### Security
- **Input Validation**: Enhanced validation patterns for all user inputs
- **SQL Injection**: Strengthened parameterized query enforcement
```

---

## 🏷️ Git Tag Management

### Creating Tags

```bash
# For PATCH version
git tag v4.0.1
git push origin v4.0.1

# For MINOR version
git tag v4.1.0
git push origin v4.1.0

# For MAJOR version
git tag v5.0.0
git push origin v5.0.0
```

### Tag Format
- **Prefix**: Always use `v` prefix (e.g., `v4.1.0`)
- **Format**: Must match SemVer format exactly
- **Immutable**: Tags create immutable records of versions

### Listing Tags
```bash
# List all tags
git tag -l

# List tags with pattern
git tag -l "v4.*"

# Show tag details
git show v4.1.0
```

---

## 🔍 Version History

### Current Version: 4.0.0

| Version | Date | Type | Description |
|---------|------|------|-------------|
| **4.0.0** | 2025-10-07 | MAJOR | Semantic Versioning implementation, enhanced CI/CD, comprehensive documentation |
| **3.0.0** | 2025-10-06 | MAJOR | MCP integration, browser extension patterns, database patterns, security consolidation |
| **2.0.0** | 2025-10-05 | MAJOR | API patterns, testing patterns, file organization, process management |
| **1.0.0** | 2025-10-04 | MAJOR | Initial cursor rules for betting brain platform |

### Version Progression

```
1.0.0 → 2.0.0 → 3.0.0 → 4.0.0
  ↓       ↓       ↓       ↓
Initial  API     MCP     SemVer
Rules    Patterns Integration Implementation
```

---

## 🚀 Best Practices

### 1. Version Increment Guidelines

#### PATCH (x.y.z+1)
- ✅ Fix typos or formatting in rule descriptions
- ✅ Add examples to existing rules
- ✅ Improve documentation clarity
- ✅ Fix broken links or references
- ✅ Small improvements to existing patterns

#### MINOR (x.y+1.0)
- ✅ Add new rule categories (e.g., new technology patterns)
- ✅ Enhance existing rules with new capabilities
- ✅ Add new best practices or patterns
- ✅ Improve rule organization or structure
- ✅ Add new examples or use cases

#### MAJOR (x+1.0.0)
- ✅ Remove or significantly change existing rules
- ✅ Change rule syntax or format requirements
- ✅ Break backward compatibility with existing code
- ✅ Restructure rule organization fundamentally
- ✅ Change core development patterns

### 2. CHANGELOG Best Practices

- ✅ **Clear Descriptions**: Use clear, concise descriptions
- ✅ **Categorized Changes**: Group changes by type (Added, Changed, Fixed, etc.)
- ✅ **Date Format**: Use YYYY-MM-DD format consistently
- ✅ **Version Links**: Link to Git tags when possible
- ✅ **Breaking Changes**: Clearly mark breaking changes

### 3. Git Workflow Best Practices

- ✅ **Atomic Commits**: Make one logical change per commit
- ✅ **Descriptive Messages**: Use clear commit messages
- ✅ **Tag After Merge**: Create tags after changes are merged
- ✅ **Version Validation**: Run CI checks before merging
- ✅ **Documentation**: Update documentation with version changes

---

## 🛠️ Tools and Commands

### Local Validation

```bash
# Check SemVer format
grep "version:" .cursorrules

# Validate CHANGELOG entry
grep "\[4.1.0\]" CHANGELOG.md

# Check Git tags
git tag -l "v4.*"

# Run CI checks locally
bun run ci
```

### Automated Tools

```bash
# Security scan
sg scan src/

# Type checking
bun run type-check

# Full CI pipeline
bun run ci
```

---

## 📚 Related Documentation

- **[Cursor Rules](.cursorrules)** - Primary rules file
- **[CHANGELOG.md](CHANGELOG.md)** - Complete version history
- **[CI Workflow](.github/workflows/cursor-rules-check.yml)** - Automated validation
- **[PR Template](.github/pull_request_template.md)** - Versioning guidelines
- **[Semantic Versioning](https://semver.org/)** - Official SemVer specification

---

## 🎯 Quick Reference

### Version Increment Decision Tree

```
Did you modify .cursorrules?
├── No → No version change needed
└── Yes → What type of change?
    ├── Small fix/typo → PATCH (x.y.z+1)
    ├── New feature/enhancement → MINOR (x.y+1.0)
    └── Breaking change → MAJOR (x+1.0.0)
```

### Required Steps Checklist

- [ ] Determine change type (PATCH/MINOR/MAJOR)
- [ ] Update version in `.cursorrules` front-matter
- [ ] Add entry to `CHANGELOG.md`
- [ ] Create Git tag (`vX.Y.Z`)
- [ ] Push tag to remote
- [ ] Update PR description if applicable

---

**Status:** ✅ **ACTIVE**  
**Current Version:** 4.0.0  
**Last Updated:** 2025-10-07  
**Next Review:** When rules are modified
