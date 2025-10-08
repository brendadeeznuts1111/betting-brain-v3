# 🚀 Cursor Rules Ship Checklist

**Copy-paste ready checklist for cursor rules implementation.**

---

## ✅ Ship Checklist

- [ ] `.cursorrules` in repo root, UTF-8
- [ ] README / CONTRIBUTING / PR / Issue templates link to it
- [ ] Version bumped if rules changed
- [ ] No copy-paste; use `@import`
- [ ] CI green

**Done—every human and every AI now reads the same rules, always.**

---

## 📋 Implementation Steps

### 1. One File to Rule Them All
```
.cursorrules          # repo root, UTF-8, LF
```

### 2. Add 3-Line Header
```yaml
---
version: 4.0.0
scope: [ts,tsx,js,jsx]
---
# Cursor rules – https://github.com/org/repo/blob/main/.cursorrules
```

### 3. Link It Everywhere

**README.md**
```md
AI code must follow [.cursorrules](https://github.com/org/repo/blob/main/.cursorrules).
```

**CONTRIBUTING.md**
```md
Run `cursor --check` or read [.cursorrules](.cursorrules) before pushing.
```

**PR template**
```md
- [ ] I followed [.cursorrules](https://github.com/org/repo/blob/main/.cursorrules)
```

**Issue template**
```yaml
- label: I followed the Cursor rules
  required: true
```

### 4. Re-use with `@import`
```
@import .cursor/base.rules
@import npm:@myorg/cursor-style
```

### 5. CI Gate (One-liner)
`.github/workflows/cursor-rules-check.yml`
```yaml
name: cursor-rules-check
on: pull_request
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: grep -qi cursorrules <<< "${{ github.event.pull_request.body }}" || exit 1
```

---

## 🎯 Quick Reference

| Step | Status | Location |
|------|--------|----------|
| **Canonical File** | ✅ | `.cursorrules` |
| **Version Header** | ✅ | `version: 4.0.0` |
| **Documentation Links** | ✅ | README, CONTRIBUTING, PR, Issue |
| **CI Integration** | ✅ | Automated checks |
| **Team Alignment** | ✅ | Single source of truth |

---

**Status:** ✅ **COMPLETE**  
**Version:** 4.0.0  
**Last Updated:** 2025-10-07
