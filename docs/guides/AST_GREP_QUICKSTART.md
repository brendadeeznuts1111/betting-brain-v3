# 🔍 ast-grep Quick Start Guide

**Status:** ✅ Fully Functional  
**Last Updated:** 2025-10-07

---

## ✅ What's Working

### Pattern Search (FULLY FUNCTIONAL)

Search for code patterns using semantic matching:

```bash
# Find all async functions
sg -p 'async function' src/

# Find all fetch calls
sg -p 'fetch($$$)' src/

# Find console.log statements
sg -p 'console.log' src/

# Find error throws
sg -p 'throw Errors.$METHOD($$$)' src/

# Find specific patterns
ast-grep --pattern 'async function $NAME(request: Request, env: Env)' src/
```

**✨ Real Example:**
```bash
$ sg -p 'async function' src/index.ts
src/index.ts:253:async function handleMCPTools(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
src/index.ts:276:async function handleDiagnostics(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
src/index.ts:339:async function handleLogs(request: Request, env: Env): Promise<Response> {
...
```

---

## 📊 Useful Searches

### Find API Endpoints
```bash
sg -p 'async function $NAME(request: Request, env: Env, requestId: string)' src/api/
```

### Find Database Queries
```bash
sg -p 'env.$DB.prepare($QUERY)' src/
```

### Find Validation Calls
```bash
sg -p 'validateQueryParams' src/
sg -p 'Validators.$METHOD' src/
```

### Find Error Handling
```bash
sg -p 'throw Errors.$METHOD' src/
sg -p 'catch ($ERROR)' src/
```

### Find Console Logs
```bash
sg -p 'console.$METHOD' src/
sg -p 'console.log' src/
sg -p 'console.error' src/
```

### Find CORS Headers
```bash
sg -p 'Access-Control-Allow-Origin' src/
```

### Dashboard Refactoring
```bash
# Find WORKER_URL definitions
sg -p 'const WORKER_URL' dashboards/

# Find fetch calls
sg -p 'fetch(' dashboards/

# Find Chart.js usage
sg -p 'new Chart' dashboards/
```

---

## 🎯 Command Reference

### Basic Pattern Search

```bash
# Short form (recommended)
sg -p 'PATTERN' PATH

# Long form
ast-grep --pattern 'PATTERN' PATH

# Search specific file
sg -p 'async function' src/index.ts

# Search directory
sg -p 'console.log' src/

# Count matches
sg -p 'console.log' src/ | wc -l
```

### Pattern Syntax

| Pattern | Meaning |
|---------|---------|
| `$VAR` | Match single node (variable name) |
| `$$$` | Match multiple nodes (ellipsis) |
| `$_` | Match anything, don't capture |

**Examples:**
```bash
# Match any async function
sg -p 'async function $NAME'

# Match any fetch call
sg -p 'fetch($$$)'

# Match specific error type
sg -p 'throw Errors.validationError'

# Match database queries
sg -p 'env.$DB.prepare($QUERY)'
```

---

## 📁 Project Structure

```
/
├── sgconfig.yml              # ast-grep project config
├── rules/                    # Rule definitions
│   ├── sql-injection.yml     # SQL injection detection
│   ├── unstructured-log.yml  # Logging patterns
│   └── worker-url.yml        # Dashboard refactoring
└── .cursor/rules/
    └── code-searchability.mdc # Complete documentation
```

---

## 🔧 Configuration

### sgconfig.yml

```yaml
ruleDirs:
  - rules

languageGlobs:
  ts:
    - "**/*.ts"
    - "**/*.tsx"
  js:
    - "**/*.js"
    - "**/*.jsx"

ignore:
  - node_modules
  - dist
  - coverage
  - .git
```

---

## 💡 Tips & Tricks

### 1. Pipe to other commands
```bash
# Count matches
sg -p 'async function' src/ | wc -l

# View specific lines
sg -p 'console.log' src/index.ts | head -5

# Search in results
sg -p 'fetch' src/ | grep 'WORKER_URL'
```

### 2. Combine with grep
```bash
# Find then filter
sg -p 'async function' src/ | grep 'Request'
```

### 3. Search multiple patterns
```bash
# Find all error types
sg -p 'throw Errors.validationError' src/
sg -p 'throw Errors.notFound' src/
sg -p 'throw Errors.unauthorized' src/
```

### 4. Narrow down searches
```bash
# Search specific directory
sg -p 'async function' src/api/

# Search specific file
sg -p 'console.log' src/index.ts

# Search by file type (configured in sgconfig.yml)
sg -p 'async function' --lang ts
```

---

## 🚀 Quick Wins

### Find Duplicate Code in Dashboards

```bash
# Find WORKER_URL definitions (should be 1)
sg -p 'const WORKER_URL' dashboards/

# Find duplicate fetch calls
sg -p 'async function $NAME' dashboards/ | grep 'fetch'

# Find Chart.js usage
sg -p 'new Chart' dashboards/
```

**Expected Results:**
- WORKER_URL: Should find 5 instances (needs refactoring to use shared/config.js)
- Each dashboard has duplicate functions that can be extracted

### Find Security Issues

```bash
# Find potential SQL injection (string interpolation in queries)
sg -p 'prepare(`$$$${$VAR}$$$`)' src/

# Find missing CORS headers (harder with pattern matching)
sg -p 'new Response' src/ | grep -v 'Access-Control'
```

### Find Code Quality Issues

```bash
# Find unstructured logs (no requestId)
sg -p 'console.log($MSG)' src/ | grep -v 'requestId'

# Find hardcoded URLs
sg -p "const $VAR = 'https://" src/

# Find any type usage
sg -p 'any' src/
```

---

## 📚 Related Documentation

- **[.cursor/rules/code-searchability.mdc](.cursor/rules/code-searchability.mdc)** - Complete guide
- **[sgconfig.yml](sgconfig.yml)** - Project configuration  
- **[rules/](rules/)** - Rule definitions
- **[ast-grep Official Docs](https://ast-grep.github.io/)** - Official documentation

---

## 🎓 Learn More

### Official ast-grep Resources

- **Website:** https://ast-grep.github.io/
- **Playground:** https://ast-grep.github.io/playground.html (test patterns online!)
- **GitHub:** https://github.com/ast-grep/ast-grep
- **Guide:** https://ast-grep.github.io/guide/introduction.html

### Try in Playground

Visit https://ast-grep.github.io/playground.html to:
1. Test patterns before running them
2. Learn pattern syntax interactively
3. See AST structure of your code

---

## ✅ Summary

**What Works:** ✅ Pattern search (`sg -p`)  
**What's Documented:** All common use cases  
**Status:** Production ready for code search!

**Quick Test:**
```bash
sg -p 'async function' src/index.ts
```

You should see multiple async function matches! 🎉

