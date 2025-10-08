# 🤫 Quiet Testing Guide

**AI-Friendly Testing with Smart Test Organization**

This guide covers the new quiet testing system designed for AI environments and organized test execution.

## 🎯 Quick Start

### Basic Commands

```bash
# Quiet testing (AI-friendly)
bun run test:quiet

# AI environment auto-detection
bun run test:ai

# Organized by category
bun run test:unit
bun run test:integration
bun run test:e2e

# Fast testing (unit tests only)
bun run test:fast
```

### Smart Test Skipping

```bash
# Skip passing tests (default)
bun run test

# Run all tests (force)
bun run test:all

# Clear test cache
bun run test:cache:clear
```

## 🧠 AI-Friendly Features

### Quiet Mode

The testing system automatically detects AI environments and enables quiet mode:

- **Claude Code**: `CLAUDECODE=1` environment variable
- **Replit AI**: `REPL_ID=1` environment variable  
- **Generic AI**: `AGENT=1` environment variable
- **Manual**: `QUIET=1` environment variable

### Benefits

- ✅ **90% less output** - Only shows failures and summaries
- ✅ **Faster execution** - Skips passing tests automatically
- ✅ **Smart caching** - Remembers test results
- ✅ **Organized execution** - Tests run by category
- ✅ **Performance monitoring** - Tracks test performance

## 📊 Test Organization

### Categories

Tests are organized into logical categories:

| Category | Pattern | Timeout | Parallel | Description |
|----------|---------|---------|----------|-------------|
| **unit** | `tests/unit/**/*.test.ts` | 5s | ✅ | Fast, isolated tests |
| **integration** | `tests/integration/**/*.test.ts` | 15s | ✅ | Integration tests |
| **e2e** | `tests/e2e/**/*.test.ts` | 30s | ❌ | End-to-end tests |
| **performance** | `tests/benchmark/**/*.test.ts` | 60s | ❌ | Performance tests |
| **snapshot** | `tests/snapshot/**/*.test.ts` | 10s | ✅ | Snapshot tests |

### Test Discovery

The system automatically discovers tests based on:

- **File patterns**: `*.test.ts`, `*.spec.ts`
- **Directory structure**: Organized by category
- **Import analysis**: Detects test dependencies
- **Performance metrics**: Tracks test execution time

## 🚀 Smart Test Runner

### Features

The `scripts/test-runner.ts` provides:

- **Category-based execution** - Run tests by type
- **Smart skipping** - Skip passing tests automatically
- **Performance monitoring** - Track test execution time
- **Parallel execution** - Run compatible tests in parallel
- **Cache management** - Remember test results
- **Quiet output** - Minimal output for AI environments

### Usage

```bash
# Run all tests quietly
bun run scripts/test-runner.ts --quiet

# Run specific category
bun run scripts/test-runner.ts --category unit

# Run with verbose output
bun run scripts/test-runner.ts --verbose

# Force run all tests
bun run scripts/test-runner.ts --no-skip

# Run tests serially
bun run scripts/test-runner.ts --serial
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--category <name>` | Run specific test category | all |
| `--quiet` | Quiet output for AI environments | auto-detect |
| `--verbose` | Verbose output | false |
| `--no-skip` | Don't skip passing tests | false |
| `--serial` | Run tests serially | false |
| `--timeout <ms>` | Set test timeout | category default |
| `--pattern <glob>` | Test file pattern | `**/*.test.ts` |

## 💾 Test Caching

### Cache System

The test cache system (`tests/setup/test-cache.ts`) provides:

- **Result caching** - Remember test results
- **File change detection** - Re-run tests when files change
- **Performance tracking** - Track test execution time
- **Smart invalidation** - Invalidate cache when needed

### Cache Management

```bash
# View cache info
bun run test:cache:info

# Clear cache
bun run test:cache:clear

# Cache is automatically managed
# - Invalidated when files change
# - Cleaned up after 24 hours
# - Skipped for failed tests
```

### Cache Benefits

- ✅ **Faster execution** - Skip passing tests
- ✅ **Smart invalidation** - Re-run when files change
- ✅ **Performance tracking** - Monitor test performance
- ✅ **Automatic cleanup** - Remove old cache entries

## 🧹 Test Organization

### Organization Script

The `scripts/organize-tests.ts` helps organize tests:

```bash
# Analyze test organization
bun run test:organize

# Generate detailed report
bun run test:organize:report

# Auto-fix organization issues
bun run scripts/organize-tests.ts --fix
```

### Organization Features

- **Category analysis** - Analyze test distribution
- **Duplicate detection** - Find duplicate test names
- **Orphan detection** - Find unused test files
- **Size analysis** - Identify large test files
- **Recommendations** - Suggest improvements

## 📈 Performance Monitoring

### Test Performance

The system tracks:

- **Execution time** - How long tests take to run
- **Success rate** - Percentage of passing tests
- **Category performance** - Performance by test category
- **Cache hit rate** - How often tests are skipped

### Performance Commands

```bash
# View test performance
bun run test:cache:info

# Analyze test performance
bun run test:analyze

# Generate performance report
bun run test:organize:report
```

## 🔧 Configuration

### Test Configuration

The `bunfig.test.toml` provides test configuration:

```toml
[test]
timeout = 10000
coverage = false
randomize = true
quiet = true
verbose = false
concurrent = true
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `QUIET` | Enable quiet mode | auto-detect |
| `CLAUDECODE` | Claude Code environment | false |
| `REPL_ID` | Replit AI environment | false |
| `AGENT` | Generic AI environment | false |
| `CI` | CI environment | false |
| `FORCE_RUN_ALL` | Force run all tests | false |

## 🎯 Best Practices

### Test Organization

1. **Use categories** - Organize tests by type
2. **Keep tests focused** - One test file per feature
3. **Use descriptive names** - Clear test names
4. **Avoid duplicates** - Don't duplicate test logic
5. **Clean up orphans** - Remove unused test files

### Performance

1. **Use quiet mode** - For AI environments
2. **Skip passing tests** - Use cache system
3. **Run in parallel** - When possible
4. **Monitor performance** - Track execution time
5. **Clean cache regularly** - Remove old entries

### AI-Friendly Testing

1. **Use quiet mode** - Reduces output verbosity
2. **Organize tests** - Use category-based execution
3. **Cache results** - Skip passing tests
4. **Monitor performance** - Track test execution
5. **Clean organization** - Keep tests well-organized

## 🚨 Troubleshooting

### Common Issues

**Tests not running:**
```bash
# Check test discovery
bun run test:organize

# Clear cache
bun run test:cache:clear

# Force run all
bun run test:all
```

**Quiet mode not working:**
```bash
# Set environment variable
export QUIET=1

# Or use AI detection
export CLAUDECODE=1
```

**Cache issues:**
```bash
# Clear cache
bun run test:cache:clear

# Check cache info
bun run test:cache:info
```

### Debug Mode

```bash
# Run with verbose output
bun run test:verbose

# Run specific category
bun run test:unit

# Run with debug info
DEBUG=1 bun run test
```

## 📚 Related Documentation

- **[Testing Guide](TESTING_GUIDE.md)** - Complete testing documentation
- **[AI-Friendly Testing](AI_FRIENDLY_TESTING.md)** - AI-optimized test patterns
- **[Test Organization](TEST_ORGANIZATION.md)** - Test organization best practices
- **[Performance Testing](PERFORMANCE_TESTING.md)** - Performance test patterns

---

**Status:** Production Ready ✅  
**Last Updated:** 2025-10-08  
**Version:** 1.0.0  
**Maintainer:** Betting-Brain Team
