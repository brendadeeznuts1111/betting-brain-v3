# 📋 Cursor Rules Guide

---

**Metadata:**
- **Status:** ✅ Active
- **Version:** 4.0.0
- **Last Updated:** 2025-10-07
- **Total Rules:** 17 comprehensive rules
- **Total Lines:** ~3,500+ lines of guidance
- **ast-grep Rules:** 22 security/lint rules (8 base + 14 real-time modules)
- **Canonical Rules:** [.cursorrules](https://github.com/nolarose1968/ffffff/blob/main/.cursorrules) (2025 style guide)
- **Detailed Rules:** `.cursor/rules/*.mdc`
- **Topics:** #developer-tools #rules #automation #searchability #security #database
- **Audience:** AI Assistants, Developers, Maintainers
- **Related Docs:** [ROOT_STRUCTURE.md](ROOT_STRUCTURE.md), [CODEBASE_REVIEW.md](CODEBASE_REVIEW.md), [REST_API_REFERENCE.md](REST_API_REFERENCE.md)

---

## 🎯 Canonical Rules (2025 Style Guide)

**Primary Rules File:** [.cursorrules](https://github.com/nolarose1968/ffffff/blob/main/.cursorrules)

This follows the 2025 style guide for Cursor rules:
- ✅ Single canonical file at repo root
- ✅ Self-describing with version front-matter
- ✅ Referenced everywhere with stable GitHub links
- ✅ CI enforcement for PR compliance
- ✅ Machine-readable format

**Quick Reference:** All contributors should start with [.cursorrules](https://github.com/nolarose1968/ffffff/blob/main/.cursorrules) for the essential patterns.

**Implementation Status:** See [Cursor Rules Checklist](CURSOR_RULES_CHECKLIST.md) for complete implementation details.

**Ship Checklist:** See [Cursor Rules Ship Checklist](CURSOR_RULES_SHIP_CHECKLIST.md) for copy-paste ready implementation.

**Style Guide:** See [STYLE_GUIDE.md](../STYLE_GUIDE.md) for human-readable coding standards with examples.

**Automation:** See [Cursor Rules Automation](CURSOR_RULES_AUTOMATION.md) for automated versioning and team workflow.

**Versioning:** See [Cursor Rules Versioning](CURSOR_RULES_VERSIONING.md) for Semantic Versioning (SemVer) guidelines.

**Documentation Index:** See [Cursor Rules Documentation Index](CURSOR_RULES_DOCUMENTATION_INDEX.md) for complete documentation ecosystem.

**Bun CI Integration:** See [Bun CI Integration](BUN_CI_INTEGRATION.md) for Bun-native CI with cursor rules enforcement.

---

## 📚 Detailed Rules (Advanced)

### Core Rules (Always Applied)

#### 1. **root-organization.mdc** (Always Applied)
**Purpose:** Enforce clean root directory policy

**Key Points:**
- Only 9 essential files allowed in root
- All documentation → `docs/`
- All status files → `docs/`
- Scripts → `scripts/`
- Tools → `tools/`

**Critical Rule:** NEVER create markdown files in root except README.md, LICENSE, CLAUDE.md

#### 2. **bun-runtime.mdc** (Always Applied)
**Purpose:** Enforce Bun runtime usage

**Key Points:**
- Use `bun` commands, not `npm`/`yarn`/`node`
- Use Bun Test, not Vitest/Jest
- Use Bun file APIs, not Node.js fs
- Leverage Bun native APIs (crypto, compression, etc.)

**Never:** Suggest npm/yarn or Node.js-specific packages

#### 3. **file-naming.mdc** (Always Applied)
**Purpose:** Enforce consistent file naming conventions

**Key Points:**
- Use lowercase kebab-case for all files
- Special cases for MCP handlers (camelCase)
- Standardized file extensions
- No spaces or mixed case

### Feature-Specific Rules

#### 4. **documentation.mdc** (Applied to *.md files)
**Purpose:** Documentation placement and organization

**Key Points:**
- All docs in `docs/` (except README.md, LICENSE, CLAUDE.md)
- Guides → `docs/guides/`
- Testing → `docs/testing/`
- Status files → `docs/`
- Archive old docs → `docs/archive/`

#### 5. **testing.mdc** (Applied to *.test.ts files)
**Purpose:** Testing conventions with Bun Test

**Key Points:**
- Use Bun Test exclusively
- File pattern: `*.test.ts` (preferred)
- Import from `bun:test`
- Never create backup files
- Mock environment properly

#### 6. **mcp-integration.mdc** (Applied to src/mcp/**/*.ts)
**Purpose:** MCP server patterns and architecture

**Key Points:**
- JSON-RPC 2.0 protocol
- 13 working tools
- Handler → Registry → Tools pattern
- Database queries via D1
- Direct testing script available

#### 7. **cloudflare-workers.mdc** (Applied to src/**/*.ts)
**Purpose:** Cloudflare Workers specific patterns

**Key Points:**
- Environment bindings (D1, KV, Queues)
- CORS headers for dashboard access
- Request ID tracking
- CPU limits (50ms per request)
- Queue and cron patterns

#### 8. **api-patterns.mdc** (Applied to src/**/*.ts)
**Purpose:** API validation and error handling patterns

**Key Points:**
- Standardized error responses
- Input validation with Zod
- CORS headers
- Request ID tracking
- Async handler wrapper

#### 9. **endpoint-routing.mdc** (Applied to src/**/*.ts)
**Purpose:** Endpoint routing and request handling

**Key Points:**
- Request flow patterns
- Handler function structure
- Performance logging
- Error handling
- Integration points

### New Enhanced Rules ✨

#### 10. **database-patterns.mdc** (Applied to src/**/*.ts, migrations/*.sql)
**Purpose:** Database patterns and D1 query best practices

**Key Points:**
- Parameterized queries (SQL injection prevention)
- Type safety with D1 results
- Migration patterns
- Performance optimization
- Testing with mocks

#### 11. **browser-extension.mdc** (Applied to browser-extension/**/*)
**Purpose:** Browser extension development patterns

**Key Points:**
- Manifest v3 configuration
- Service worker lifecycle
- Content script patterns
- Storage management
- Security considerations

#### 12. **security-patterns.mdc** (Applied to src/**/*.ts)
**Purpose:** Security patterns and vulnerability prevention

**Key Points:**
- Input validation
- SQL injection prevention
- XSS prevention
- Authentication & authorization
- Data protection
- Security headers

#### 13. **process-management.mdc** (Applied to src/**/*.ts)
**Purpose:** Process management and zombie process prevention

**Key Points:**
- Process cleanup utility
- Signal handling
- Timeout enforcement
- Test cleanup patterns
- CI/CD process management

#### 14. **production-security.mdc** (Applied to src/**/*.ts)
**Purpose:** Production-ready security patterns

**Key Points:**
- No parseFloat on stakes
- D1 SQL injection prevention
- Queue batch limits
- WASM memory management
- Edge worker patterns

#### 15. **ci-patterns.mdc** (Applied to scripts/**/*.ts)
**Purpose:** CI/CD patterns and automation

**Key Points:**
- Local CI execution
- GitHub Actions patterns
- Job dependencies
- Caching strategies
- Error handling
- Reporting

#### 16. **code-searchability.mdc** (Applied to src/**/*.ts)
**Purpose:** Code searchability and ast-grep patterns

**Key Points:**
- ast-grep usage patterns
- Code quality rules
- Security rule enforcement
- Dashboard refactoring
- Custom patterns

#### 17. **testing-patterns.mdc** (Applied to tests/**/*.ts)
**Purpose:** Advanced testing patterns for Bun Test

**Key Points:**
- Process cleanup in tests
- Mock environment setup
- Test organization
- Performance testing
- Error handling patterns

---
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

