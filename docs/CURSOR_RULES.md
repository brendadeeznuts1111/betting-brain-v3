# 📋 Cursor Rules Guide

---

**Metadata:**
- **Status:** ✅ Active
- **Version:** 3.0.0
- **Last Updated:** 2025-10-07
- **Total Rules:** 10 comprehensive rules
- **Total Lines:** ~2,200+ lines of guidance
- **Location:** `.cursor/rules/*.mdc`
- **Topics:** #developer-tools #rules #automation #searchability
- **Audience:** AI Assistants, Developers, Maintainers
- **Related Docs:** [ROOT_STRUCTURE.md](ROOT_STRUCTURE.md), [CODEBASE_REVIEW.md](CODEBASE_REVIEW.md), [REST_API_REFERENCE.md](REST_API_REFERENCE.md)

---

## 📚 Available Rules

### 1. **root-organization.mdc** (Always Applied)
**Purpose:** Enforce clean root directory policy

**Key Points:**
- Only 9 essential files allowed in root
- All documentation → `docs/`
- All status files → `docs/`
- Scripts → `scripts/`
- Tools → `tools/`

**Critical Rule:** NEVER create markdown files in root except README.md, LICENSE, CLAUDE.md

### 2. **bun-runtime.mdc** (Always Applied)
**Purpose:** Enforce Bun runtime usage

**Key Points:**
- Use `bun` commands, not `npm`/`yarn`/`node`
- Use Bun Test, not Vitest/Jest
- Use Bun file APIs, not Node.js fs
- Leverage Bun native APIs (crypto, compression, etc.)

**Never:** Suggest npm/yarn or Node.js-specific packages

### 3. **documentation.mdc** (Applied to *.md files)
**Purpose:** Documentation placement and organization

**Key Points:**
- All docs in `docs/` (except README.md, LICENSE, CLAUDE.md)
- Guides → `docs/guides/`
- Testing → `docs/testing/`
- Status files → `docs/`
- Archive old docs → `docs/archive/`

### 4. **testing.mdc** (Applied to *.test.ts files)
**Purpose:** Testing conventions with Bun Test

**Key Points:**
- Use Bun Test exclusively
- File pattern: `*.test.ts` (preferred)
- Import from `bun:test`
- Never create backup files
- Mock environment properly

### 5. **mcp-integration.mdc** (Applied to src/mcp/**/*.ts)
**Purpose:** MCP server patterns and architecture

**Key Points:**
- JSON-RPC 2.0 protocol
- 13 working tools
- Handler → Registry → Tools pattern
- Database queries via D1
- Direct testing script available

### 6. **cloudflare-workers.mdc** (Applied to src/**/*.ts, wrangler*.toml)
**Purpose:** Cloudflare Workers specific patterns

**Key Points:**
- Environment bindings (D1, KV, Queues)
- CORS headers for dashboards
- Request ID tracking
- Cost guards and rate limiting
- 50ms CPU limit per request

### 7. **file-naming.mdc** (Always Applied)
**Purpose:** Consistent file naming conventions

**Key Points:**
- Lowercase kebab-case for files/directories
- Test files: `*.test.ts`
- Docs: Uppercase for major (README.md), kebab for guides
- No backup files (*.backup)
- No spaces or mixed case

### 8. **endpoint-routing.mdc** (Applied to src/index.ts, dashboards/*.html) ✨ NEW
**Purpose:** Endpoint routing patterns and request handling

**Key Points:**
- Endpoint mapping (13 routes documented)
- Dashboard integration patterns
- CORS configuration
- Request ID tracking
- Health check patterns
- MCP protocol endpoints
- BetTicker interception routes

---

## 🎯 Rule Application

### Always Applied (3 rules)
These rules apply to EVERY request:
- `root-organization.mdc` - Root directory policy
- `bun-runtime.mdc` - Bun usage requirements
- `file-naming.mdc` - Naming conventions

### Glob-based (5 rules)
These apply to specific file types:
- `documentation.mdc` → `*.md` files
- `testing.mdc` → `*.test.ts`, `*.spec.ts` files
- `mcp-integration.mdc` → `src/mcp/**/*.ts` files
- `cloudflare-workers.mdc` → `src/**/*.ts`, `wrangler*.toml` files
- `endpoint-routing.mdc` → `src/index.ts`, `dashboards/*.html` files

---

## 📖 Rule Format

Each rule file (`.mdc`) has:

### Frontmatter
```yaml
---
alwaysApply: true           # Apply to all requests
# OR
globs: *.ts,*.tsx           # Apply to specific patterns
# OR
description: "..."          # Manually applied by user
---
```

### File References
Rules reference actual project files using:
```markdown
[filename.ext](mdc:filename.ext)
[path/to/file.ts](mdc:path/to/file.ts)
```

This allows Cursor to understand relationships between rules and code.

---

## 🔍 Quick Reference

### Check Which Rules Apply

**For a TypeScript file in src/mcp/:**
1. ✅ `root-organization.mdc` (always)
2. ✅ `bun-runtime.mdc` (always)
3. ✅ `file-naming.mdc` (always)
4. ✅ `mcp-integration.mdc` (glob: src/mcp/**/*.ts)
5. ✅ `cloudflare-workers.mdc` (glob: src/**/*.ts)

**For a markdown file in docs/:**
1. ✅ `root-organization.mdc` (always)
2. ✅ `bun-runtime.mdc` (always)
3. ✅ `file-naming.mdc` (always)
4. ✅ `documentation.mdc` (glob: *.md)

**For a test file:**
1. ✅ `root-organization.mdc` (always)
2. ✅ `bun-runtime.mdc` (always)
3. ✅ `file-naming.mdc` (always)
4. ✅ `testing.mdc` (glob: *.test.ts)
5. ✅ `cloudflare-workers.mdc` (glob: src/**/*.ts)

---

## 📝 Adding New Rules

### When to Create a Rule

Create a new rule when:
- Pattern is repeated across multiple files
- Convention needs to be enforced consistently
- New technology/integration added
- Important architectural decision made
- Common mistakes need preventing

### How to Create a Rule

1. **Create file:** `.cursor/rules/my-rule.mdc`

2. **Add frontmatter:**
```yaml
---
alwaysApply: true           # For universal rules
# OR
globs: *.extension          # For file-type specific
# OR
description: "Description"  # For manual application
---
```

3. **Write content:**
- Clear explanations
- Code examples
- Reference project files with `[file](mdc:file)`
- Include dos and don'ts

4. **Commit:**
```bash
git add .cursor/rules/my-rule.mdc
git commit -m "feat: add my-rule cursor rule"
```

---

## 🎨 Rule Writing Best Practices

### DO:
✅ Reference actual project files
✅ Provide clear examples
✅ Explain the "why" not just "what"
✅ Include both correct and incorrect patterns
✅ Keep rules focused and specific
✅ Use consistent formatting
✅ Link to related documentation

### DON'T:
❌ Create overly broad rules
❌ Duplicate information across rules
❌ Include outdated patterns
❌ Make rules too long (split if needed)
❌ Forget to update when codebase changes
❌ Use hard-coded values (reference files instead)

---

## 🔄 Maintaining Rules

### When to Update

Update rules when:
- Project structure changes
- New patterns emerge
- Technologies are added/removed
- Conventions evolve
- Errors are found

### Review Schedule

- ✅ After major refactors
- ✅ When adding new features
- ✅ During onboarding feedback
- ✅ Quarterly reviews

---

## 📊 Rule Coverage

| Area | Rule | Status |
|------|------|--------|
| **Project Structure** | root-organization.mdc | ✅ |
| **Runtime** | bun-runtime.mdc | ✅ |
| **Documentation** | documentation.mdc | ✅ |
| **Testing** | testing.mdc | ✅ |
| **MCP Integration** | mcp-integration.mdc | ✅ |
| **Cloudflare Workers** | cloudflare-workers.mdc | ✅ |
| **File Naming** | file-naming.mdc | ✅ |
| **Database** | 🔲 Future | - |
| **Browser Extension** | 🔲 Future | - |
| **Security** | 🔲 Future | - |

---

## 🚀 Impact

### Code Quality
- ✅ Consistent file organization
- ✅ Proper Bun usage
- ✅ Clean root directory
- ✅ Standardized testing
- ✅ Clear documentation structure

### Developer Experience
- ✅ Clear guidance for AI assistants
- ✅ Reduced decision fatigue
- ✅ Faster onboarding
- ✅ Fewer mistakes
- ✅ Consistent patterns

### Maintenance
- ✅ Self-documenting codebase
- ✅ Easier refactoring
- ✅ Clear conventions
- ✅ Reduced technical debt

---

## 📚 Related Documentation

- **[ROOT_STRUCTURE.md](./ROOT_STRUCTURE.md)** - Root directory reference
- **[CLEANUP_PLAN.md](./CLEANUP_PLAN.md)** - Cleanup decisions
- **[CODEBASE_REVIEW.md](./CODEBASE_REVIEW.md)** - Full review
- **[CLAUDE.md](../CLAUDE.md)** - AI assistant guidance

---

**Created:** 2025-10-07  
**Last Updated:** 2025-10-07  
**Rules Count:** 7  
**Coverage:** ~850 lines of guidance

---

*These rules ensure consistent code quality and developer experience across the Betting-Brain v3 project.*

