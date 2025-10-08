# AI-Friendly Test Output 🤖

**Status:** ✅ Active  
**Last Updated:** 2025-10-08  
**Bun Version:** ≥1.0.0

---

## Overview

This project integrates with Bun's AI-friendly test output feature to provide quieter, more readable test results when working with AI coding assistants like Claude Code, Replit AI, and other agents.

### What It Does

When AI environments are detected, test output is automatically minimized to:
- ✅ Show **only test failures** in detail
- ✅ Hide passing test indicators
- ✅ Hide skipped/todo test noise
- ✅ Preserve summary statistics
- ✅ Improve context efficiency in AI sessions

---

## Quick Start

### Automatic Detection

The CI scripts automatically detect AI environments and enable quiet mode:

```bash
# Run CI - auto-detects AI environment
bun run ci:local

# Run tests - auto-detects AI environment
bun run ci:bun
```

**Detected environments:**
- `CLAUDECODE=1` - Claude Code
- `REPL_ID=1` - Replit AI
- `AGENT=1` - Generic AI agent

### Manual Activation

Enable AI-friendly output explicitly:

```bash
# Dedicated AI command
bun run test:ai

# Or set environment variable
CLAUDECODE=1 bun test

# Works with any test command
CLAUDECODE=1 bun test tests/unit
CLAUDECODE=1 bun test --coverage
```

---

## Configuration

### Environment Variables

Set any of these to enable quiet mode:

| Variable | Use Case |
|---|---|
| `CLAUDECODE=1` | Claude Code sessions |
| `REPL_ID=1` | Replit AI environments |
| `AGENT=1` | Generic AI agent flag |

### Package Scripts

Available in `package.json`:

```json
{
  "scripts": {
    "test:ai": "CLAUDECODE=1 bun test",
    "test": "bun test",
    "test:unit": "bun test tests/unit",
    "test:integration": "bun test tests/integration"
  }
}
```

---

## Behavior Examples

### Normal Output (Verbose)

```bash
$ bun test

✓ validateBetslipShape > validates correct shape [0.45ms]
✓ validateBetslipShape > rejects missing fields [0.32ms]
✓ calculateCLV > calculates positive CLV [0.28ms]
✓ calculateCLV > calculates negative CLV [0.21ms]
✓ getSharpScore > returns score for events [2.15ms]
✓ getSharpScore > handles missing data [1.89ms]
✓ getSteamMoves > detects steam moves [3.45ms]
✓ getSteamMoves > filters by threshold [2.76ms]

 8 pass
 0 fail
```

### AI-Friendly Output (Quiet)

```bash
$ CLAUDECODE=1 bun test

# Only shows if there are failures:
✗ getSharpScore > returns score for events [2.15ms]
  Expected: 75
  Received: 0

 7 pass
 1 fail
```

---

## Integration

### CI Scripts

Both CI scripts auto-detect AI environments:

#### `scripts/bun-ci.ts`

```typescript
private isAIEnvironment(): boolean {
  return !!(
    process.env.CLAUDECODE || 
    process.env.REPL_ID || 
    process.env.AGENT
  );
}

private async runTests(): Promise<boolean> {
  if (this.isAIEnvironment()) {
    console.log('  🤖 AI environment detected - enabling quiet mode');
    process.env.CLAUDECODE = '1';
  }
  
  return await this.runStep('Tests', 'bun', ['test', '--concurrent']);
}
```

#### `scripts/ci-local.ts`

```typescript
async run(): Promise<boolean> {
  // Enable AI-friendly output if in AI environment
  if (this.isAIEnvironment()) {
    console.log('🤖 AI Environment: Quiet test output enabled');
    process.env.CLAUDECODE = '1';
  }
  
  // ... rest of pipeline
}
```

---

## Use Cases

### 1. Claude Code Sessions

When using Cursor with Claude Code, tests automatically run in quiet mode:

```bash
# In your AI session
$ bun run ci:local
🤖 AI Environment: Quiet test output enabled
# Only failures shown
```

### 2. Replit AI

For Replit-based development:

```bash
# Automatically detected via REPL_ID
$ bun test
# Quiet output automatically enabled
```

### 3. Generic AI Agents

For other AI coding assistants:

```bash
# Set generic flag
export AGENT=1
bun test
```

---

## Benefits

### For AI Context Windows

| Feature | Without AI Mode | With AI Mode |
|---|---|---|
| Token usage per test run | ~5,000 tokens | ~500 tokens |
| Context efficiency | Low | High |
| Failure visibility | Buried in output | Prominent |
| Summary clarity | Mixed with noise | Clean |

### For Developers

- ✅ **Less scrolling** - Only failures need attention
- ✅ **Faster debugging** - Jump straight to errors
- ✅ **Better focus** - No distraction from passing tests
- ✅ **Clean logs** - Ideal for CI/CD environments

---

## Testing the Feature

### Verify Auto-Detection

```bash
# Set AI environment
export CLAUDECODE=1

# Run CI - should show detection message
bun run ci:local

# Expected output:
# 🤖 AI Environment: Quiet test output enabled
```

### Compare Outputs

```bash
# Normal output
bun test tests/unit/clv.test.ts

# AI-friendly output
CLAUDECODE=1 bun test tests/unit/clv.test.ts
```

### Force Disable

```bash
# Even in AI environment, disable by unsetting
unset CLAUDECODE
unset REPL_ID
unset AGENT

bun test  # Normal verbose output
```

---

## Related Files

- **[package.json](../../package.json)** - Test scripts
- **[bun-ci.ts](../../scripts/bun-ci.ts)** - CI integration with auto-detection
- **[ci-local.ts](../../scripts/ci-local.ts)** - Local CI with auto-detection
- **[TESTING_STATUS.md](../TESTING_STATUS.md)** - Overall test status
- **[TESTING_GUIDE.md](../guides/TESTING_GUIDE.md)** - Complete testing guide

---

## Troubleshooting

### Issue: Quiet mode not activating

**Check environment variables:**
```bash
echo $CLAUDECODE
echo $REPL_ID
echo $AGENT
```

**Solution:**
```bash
# Manually set
export CLAUDECODE=1

# Or use dedicated command
bun run test:ai
```

### Issue: Still seeing verbose output

**Check if running through CI:**
```bash
# CI scripts should auto-detect
bun run ci:local   # ✅ Auto-detects
bun test           # ❌ Needs manual env var
```

**Solution:**
```bash
# Use CI commands or set env var
CLAUDECODE=1 bun test
```

### Issue: Want verbose output in AI session

**Temporarily disable:**
```bash
# Unset variables
unset CLAUDECODE
unset REPL_ID
unset AGENT

# Run tests
bun test
```

---

## Best Practices

### ✅ Do

- Use `bun run test:ai` for explicit AI mode
- Let CI scripts auto-detect environment
- Use quiet mode in AI pair programming sessions
- Document expected test behavior for AI context

### ❌ Don't

- Manually parse test output in scripts (use exit codes)
- Assume quiet mode hides all information (failures are shown)
- Set AI env vars in production (CI only)
- Forget to check logs when tests pass (summary is shown)

---

## Future Enhancements

Potential improvements being considered:

- [ ] Custom quiet mode levels (minimal, standard, verbose)
- [ ] AI-friendly coverage reports
- [ ] Structured JSON output for AI parsing
- [ ] Integration with GitHub Copilot
- [ ] Smart failure grouping for AI context

---

## References

- **[Bun Test Documentation](https://bun.sh/docs/cli/test)** - Official Bun test docs
- **[Cursor Rules](.cursor/rules/testing-patterns.mdc)** - Testing patterns
- **[CI/CD Guide](../guides/CI_CD_GUIDE.md)** - Continuous integration

---

**Status:** Production-Ready ✅  
**Maintenance:** Automated via CI  
**Support:** Check [TESTING_STATUS.md](../TESTING_STATUS.md) for issues

