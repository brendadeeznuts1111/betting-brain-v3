# 🛠️ Maintenance Guide

**Complete guide for maintaining the Betting Brain Platform repository**

---

## 🎯 **Overview**

This guide provides systematic procedures for maintaining repository health, preventing anti-patterns, and ensuring long-term sustainability.

---

## 📋 **Daily Maintenance**

### **Automated Checks**
```bash
# Run health check
bun run scripts/health-check.ts

# Run cleanup
bun run scripts/cleanup-repo.ts

# Check for outdated dependencies
bun outdated
```

### **Manual Checks**
- [ ] Review new files in root directory
- [ ] Check for hardcoded URLs in new code
- [ ] Verify version consistency
- [ ] Update documentation as needed

---

## 📅 **Weekly Maintenance**

### **Repository Health**
```bash
# Full health check
bun run scripts/health-check.ts

# Clean up duplicates
bun run scripts/cleanup-repo.ts

# Update dependencies
bun update
```

### **Documentation Review**
- [ ] Update README.md if needed
- [ ] Review and update CHANGELOG.md
- [ ] Check for broken links
- [ ] Update documentation index

---

## 📅 **Monthly Maintenance**

### **Deep Cleanup**
```bash
# Remove duplicate files
bun run scripts/cleanup-repo.ts

# Check for unused dependencies
bun remove --unused

# Update all dependencies
bun update --all
```

### **Documentation Audit**
- [ ] Review all documentation for accuracy
- [ ] Update architecture diagrams
- [ ] Check for outdated information
- [ ] Archive old documentation

---

## 🚨 **Anti-Pattern Prevention**

### **Root Directory Rules**
**Allowed in root:**
- `README.md`, `LICENSE`, `CLAUDE.md`
- `package.json`, `package-lock.json`, `bun.lock`
- `tsconfig.json`, `wrangler.toml`, `bunfig.toml`
- `.gitignore`, `.cursorrules`, `.npmrc`

**Forbidden in root:**
- Documentation files (except README.md, LICENSE, CLAUDE.md)
- Status files, session reports, deployment summaries
- Temporary files, backup files
- Build outputs, coverage reports

### **Configuration Management**
- **Single source of truth**: Keep configs in root only
- **Environment variables**: Use `.env` files for environment-specific values
- **Centralized URLs**: Use `src/shared/config.ts` for all URLs

### **Version Management**
- **Semantic versioning**: Use `bun run scripts/bump-version.ts`
- **Consistent versions**: Keep package.json and package-lock.json in sync
- **Automated bumping**: Use CI/CD for version management

---

## 🔧 **Maintenance Scripts**

### **Health Check**
```bash
# Check repository health
bun run scripts/health-check.ts

# Output: Health score, issues, warnings, recommendations
```

### **Cleanup**
```bash
# Clean up anti-patterns
bun run scripts/cleanup-repo.ts

# Output: Duplicates removed, issues found, manual fixes needed
```

### **Version Bump**
```bash
# Bump patch version (1.0.0 -> 1.0.1)
bun run scripts/bump-version.ts patch

# Bump minor version (1.0.0 -> 1.1.0)
bun run scripts/bump-version.ts minor

# Bump major version (1.0.0 -> 2.0.0)
bun run scripts/bump-version.ts major
```

---

## 📊 **Health Metrics**

### **Repository Health Score**
- **90-100**: Excellent health
- **70-89**: Good health, minor issues
- **50-69**: Needs attention
- **0-49**: Critical issues

### **Key Metrics**
- **Duplicate files**: 0 (target)
- **Hardcoded URLs**: < 10 (target)
- **Version conflicts**: 0 (target)
- **Root violations**: 0 (target)
- **Documentation coverage**: > 90% (target)

---

## 🚀 **CI/CD Integration**

### **Pre-commit Hooks**
```bash
# Add to .git/hooks/pre-commit
#!/bin/sh
bun run scripts/health-check.ts
bun run scripts/cleanup-repo.ts
```

### **GitHub Actions**
```yaml
# .github/workflows/health-check.yml
name: Repository Health Check
on: [push, pull_request]
jobs:
  health-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun run scripts/health-check.ts
      - run: bun run scripts/cleanup-repo.ts
```

---

## 📚 **Documentation Maintenance**

### **Documentation Index**
- **Location**: `docs/DOCUMENTATION_INDEX.md`
- **Purpose**: Central navigation for all documentation
- **Update**: When adding/removing documentation

### **Link Health**
- **Check**: `bun run scripts/link-check.js`
- **Target**: > 90% working links
- **Fix**: Update broken links immediately

### **Content Review**
- **Accuracy**: Verify all information is current
- **Completeness**: Ensure all features are documented
- **Clarity**: Use clear, concise language

---

## 🔍 **Troubleshooting**

### **Common Issues**

#### **Duplicate Configuration Files**
```bash
# Remove duplicates
rm config/bunfig.toml
rm config/tsconfig.json
```

#### **Hardcoded URLs**
```bash
# Find hardcoded URLs
grep -r "workers.dev" . --include="*.ts" --include="*.js"

# Replace with centralized config
import { getWorkerUrl } from './src/shared/config.ts';
```

#### **Version Conflicts**
```bash
# Sync versions
bun install
```

#### **Root Directory Violations**
```bash
# Move files to appropriate locations
mv DEPLOYMENT_SUCCESS.md docs/
mv SESSION_COMPLETE.md docs/session-reports/
```

---

## 📈 **Improvement Roadmap**

### **Short Term (1-3 months)**
- [ ] Implement automated health checks in CI/CD
- [ ] Add pre-commit hooks for anti-pattern detection
- [ ] Create maintenance dashboard
- [ ] Standardize all file naming

### **Medium Term (3-6 months)**
- [ ] Implement automated cleanup workflows
- [ ] Add repository health monitoring
- [ ] Create maintenance documentation
- [ ] Implement CI/CD checks for anti-patterns

### **Long Term (6+ months)**
- [ ] Implement automated maintenance
- [ ] Add predictive health monitoring
- [ ] Create maintenance AI assistant
- [ ] Implement self-healing repository

---

## 🎯 **Best Practices**

### **Prevention**
- **Code reviews**: Check for anti-patterns
- **Automated checks**: Run health checks regularly
- **Documentation**: Keep docs up to date
- **Versioning**: Use semantic versioning consistently

### **Response**
- **Immediate**: Fix critical issues
- **Short term**: Address warnings
- **Long term**: Implement improvements
- **Continuous**: Monitor and maintain

---

## 📞 **Support**

### **Resources**
- **Documentation**: `docs/DOCUMENTATION_INDEX.md`
- **Health Check**: `bun run scripts/health-check.ts`
- **Cleanup**: `bun run scripts/cleanup-repo.ts`
- **Version Bump**: `bun run scripts/bump-version.ts`

### **Escalation**
- **Critical issues**: Fix immediately
- **Warnings**: Address within 1 week
- **Recommendations**: Plan for next sprint
- **Questions**: Check documentation first

---

**Status**: ✅ Complete  
**Last Updated**: 2025-10-08  
**Maintainer**: AI Assistant
