# Contributing to Betting-Brain v3.2.0

Thank you for your interest in contributing! 🎉

## Quick Start

1. Fork the repository
2. Clone your fork
3. Install dependencies: `bun install`
4. Run tests: `bun test`
5. Start development: `bun run dev`

## AI Development Standards

AI code must follow the **24 Cursor rules** in `.cursor/rules/*.mdc` (2,200+ lines).

See [CURSOR_RULES.md](CURSOR_RULES.md) for overview and [maintenance/CURSOR_RULES_MAINTENANCE.md](maintenance/CURSOR_RULES_MAINTENANCE.md) for versioning procedures.

Run `bun run ci` before pushing to ensure all quality checks pass.

## Coding Standards

This project follows strict coding standards to maintain quality and consistency:

- **Quality Standards**: [quality-standards.mdc](.cursor/rules/quality-standards.mdc) - Core patterns and infrastructure
- **Code Quality Audit**: [CODE_QUALITY_AUDIT.md](CODE_QUALITY_AUDIT.md) - Audit results and metrics
- **ast-grep Rules**: [.ast-grep.yml](../.ast-grep.yml) - 23 rules for pattern detection (8 quality enforcement)

All rules are enforced automatically via:
- **ast-grep scanning**: `sg scan src/` (23 rules, 2 ERROR-level blocking)
- **CI/CD pipeline**: `bun run ci` (security, lint, type-check, tests, build)
- **Pre-push hooks**: Security and migration validation

## Making Changes to Cursor Rules (`.cursor/rules/*.mdc`)

Our Cursor rules system consists of **24 MDC files** (2,200+ lines) defining coding standards. All rules use **Semantic Versioning** and have dependency relationships.

See [maintenance/CURSOR_RULES_MAINTENANCE.md](maintenance/CURSOR_RULES_MAINTENANCE.md) for complete maintenance procedures.

### Quick Reference

**Current versions (v3.2.0):**
- **v5.0.0** (3 rules): bun-runtime, file-naming, root-organization
- **v2.0.0** (5 rules): cloudflare-workers, mcp-integration, security-patterns, testing-patterns, database-patterns
- **v1.1.0** (7 rules): analytics-stub-api, analytics-testing, ci-integration, coverage-thresholds, test-setup-patterns
- **v1.0.0** (9 rules): api-patterns, endpoint-routing, quality-standards, browser-extension, ci-patterns, etc.

### The Versioning Process

When you modify any rule file, you **must** update its version number following SemVer:

#### Step 1: Make Your Changes
Edit the rule file(s) in `.cursor/rules/` as needed.

#### Step 2: Determine the Type of Change

* **MAJOR (X.0.0)**: Breaking changes (removing patterns, changing APIs)
* **MINOR (X.Y.0)**: New features (adding patterns, new dependencies, 50+ line updates)
* **PATCH (X.Y.Z)**: Bug fixes (typos, clarifications, small edits)

#### Step 3: Update Frontmatter

```yaml
---
version: "2.1.0"  # Bump appropriately
lastUpdated: "2025-10-08"
dependencies: ["quality-standards", "api-patterns"]
---
```

#### Step 4: Update Documentation

1. **CHANGELOG.md**: Add entry for rule changes
2. **package.json**: Bump project version if multiple rules changed
3. **Maintenance guide**: Update metrics if significant changes

#### Step 5: Run Quality Checks

```bash
# Verify ast-grep rules pass
sg scan src/

# Run full CI
bun run ci

# Check for duplicate metadata
grep -c "^version:" .cursor/rules/your-file.mdc  # Should be 1
```

#### Step 6: Commit and Tag

Follow conventional commits format:

```bash
git add .cursor/rules/your-file.mdc
git commit -m "chore: update your-file.mdc to v2.1.0

Description of changes...

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

For major releases affecting multiple rules, create an annotated tag:

```bash
git tag -a v3.3.0 -m "Release v3.3.0: Description

Metrics and details...

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

#### Step 7: Push and Create Pull Request

```bash
git push origin <your-branch-name> --tags
```

Open a Pull Request with:
- Summary of rule changes
- Version bumps (list all files updated)
- Impact analysis (which rules depend on your changes)
- Test results (CI output)

### Dependency Impact Analysis

Before updating a root dependency, check impact:

| Rule Updated | Direct Dependents | Total Impact |
|--------------|-------------------|--------------|
| quality-standards.mdc | 18 rules | ~23 rules |
| bun-runtime.mdc | 7 rules | ~11 rules |
| api-patterns.mdc | 5 rules | ~7 rules |

See [maintenance/CURSOR_RULES_MAINTENANCE.md](maintenance/CURSOR_RULES_MAINTENANCE.md) for complete dependency graph.

## Development Workflow

### Before You Start

- Read the [Quick Start Guide](QUICKSTART.md)
- Review the [Implementation Summary](IMPLEMENTATION_SUMMARY.md)
- Check existing [Issues](https://github.com/mybook/betting-brain-v3/issues)

### Making Changes

1. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow existing code patterns
   - Use TypeScript strict mode
   - Add Zod validation for inputs
   - Write tests for new features

3. **Test your changes**
   ```bash
   npm test              # Run all tests
   npm run lint          # Type check
   npm run test:ci       # Full test suite with coverage
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

   **Commit Message Format:**
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `test:` - Test changes
   - `refactor:` - Code refactoring
   - `chore:` - Build/tooling changes

5. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## Code Standards

### TypeScript

- ✅ Use strict mode
- ✅ No `any` types
- ✅ Proper interfaces for all data structures
- ✅ Document complex types

### Validation

- ✅ Use Zod schemas for all API inputs/outputs
- ✅ Validate database query results
- ✅ Handle validation errors gracefully

### Error Handling

- ✅ Always catch errors
- ✅ Log errors with context
- ✅ Return appropriate HTTP status codes
- ✅ Provide helpful error messages

### Testing

- ✅ Write unit tests for new features
- ✅ Mock external dependencies
- ✅ Test edge cases
- ✅ Maintain >80% coverage

### File Organization

```
src/
├── types/       # TypeScript type definitions
├── guards/      # Cost cap and rate limiting
├── queues/      # Queue consumers
├── triggers/    # D1 triggers
├── schedules/   # Cron jobs
├── tools/       # MCP intelligence APIs
└── utils/       # Shared utilities
```

### Naming Conventions

- **Files:** `kebab-case.ts`
- **Directories:** `kebab-case/`
- **Functions:** `camelCase()`
- **Classes:** `PascalCase`
- **Constants:** `UPPER_SNAKE_CASE`
- **Interfaces:** `PascalCase`

## Project-Specific Guidelines

### Use Bun APIs (Not Node.js)

❌ **Don't:**
```typescript
import { readFileSync } from 'fs';
const data = readFileSync('file.json', 'utf-8');
```

✅ **Do:**
```typescript
const data = await Bun.file('file.json').text();
```

### Avoid Stateful Operations in Edge Workers

❌ **Don't:**
```typescript
setInterval(() => {
  cleanup();
}, 5000);
```

✅ **Do:**
```typescript
// Use scheduled jobs or probabilistic cleanup
if (Math.random() < 0.01) {
  this.cleanup();
}
```

### Always Check Cost Caps

✅ **Do:**
```typescript
const costCheck = await costCapGuard.checkRequest(request, env);
if (!costCheck.allowed) {
  return costCapError();
}
```

### Validate All Inputs with Zod

✅ **Do:**
```typescript
const validation = RequestSchema.safeParse(data);
if (!validation.success) {
  return validationError(validation.error);
}
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# With coverage
npm run test:ci
```

### Writing Tests

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('Feature Name', () => {
  let mockEnv: any;

  beforeEach(() => {
    mockEnv = {
      ANALYTICS: mockD1Database(),
      // ... other mocks
    };
  });

  it('should do something', async () => {
    const result = await yourFunction(mockEnv);
    expect(result).toBe(expected);
  });
});
```

## Documentation

### Updating Documentation

- Keep README.md up to date
- Update docs/ files if architecture changes
- Add JSDoc comments to complex functions
- Update OpenAPI spec if adding/changing APIs

### Generating API Docs

```bash
npm run codegen
# Opens dist/redoc.html
```

## Pull Request Process

1. **Ensure all tests pass**
2. **Update documentation** if needed
3. **Add yourself to contributors** (if first PR)
4. **Request review** from maintainers
5. **Address feedback** promptly
6. **Squash commits** if requested

### PR Checklist

- [ ] Tests pass (`npm test`)
- [ ] No linting errors (`npm run lint`)
- [ ] Documentation updated
- [ ] Commit messages follow convention
- [ ] No breaking changes (or clearly documented)
- [ ] Added tests for new features

## Getting Help

- **Discord**: [Cloudflare Discord](https://discord.cloudflare.com/)
- **Issues**: [GitHub Issues](https://github.com/mybook/betting-brain-v3/issues)
- **Docs**: [Cloudflare Workers](https://developers.cloudflare.com/workers/)

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Help others learn and grow
- Follow project guidelines

---

**Thank you for contributing!** 🙏
