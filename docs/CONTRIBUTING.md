# Contributing to Betting-Brain v3

Thank you for your interest in contributing! 🎉

## Quick Start

1. Fork the repository
2. Clone your fork
3. Install dependencies: `npm install`
4. Run bootstrap: `npm run bootstrap`
5. Start development: `npm run dev`

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
