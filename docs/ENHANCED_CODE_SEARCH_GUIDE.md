# 🔍 Enhanced Code Search Guide

**Version:** 3.0.0  
**Last Updated:** 2025-10-08  
**Account:** nolarose1968-806

## Overview

The Enhanced Code Search system provides comprehensive code searchability for the Betting-Brain v3 platform using **ast-grep** (semantic search) and **ripgrep** (text search) integration.

## Quick Start

### Installation

```bash
# Install ast-grep
cargo install ast-grep
# or
npm install -g @ast-grep/cli

# Install ripgrep
brew install ripgrep
# or
cargo install ripgrep
```

### Basic Usage

```bash
# Run all rules
sg scan

# Search for specific patterns
sg search endpoint-handlers
sg search fantasy402-endpoints
sg search analytics-writes

# Use ripgrep for text search
rg "fantasy402" --type ts
rg "MCP" --type ts
rg "analytics" --type ts
```

## Search Patterns

### API Endpoints

#### Endpoint Handlers
```bash
# Find all API endpoint handler functions
sg search endpoint-handlers
rg "async function.*Request.*Env.*requestId.*Response" --type ts
```

#### API Routes
```bash
# Find all API route definitions
sg search api-routes
rg "case '/" --type ts
```

#### Route Handlers
```bash
# Find route handler invocations
sg search route-handlers
rg "return await.*Handler.*request.*env.*requestId" --type ts
```

### MCP Integration

#### MCP Tool Handlers
```bash
# Find all MCP tool handler functions
sg search mcp-handlers
rg "export async function.*MCPToolResult" --type ts
```

#### MCP Tool Calls
```bash
# Find MCP tool invocations
sg search mcp-tool-calls
rg "callTool\\(" --type ts
```

#### MCP Responses
```bash
# Find MCP response formatting
sg search mcp-responses
rg "content.*type.*text" --type ts
```

### Database Patterns

#### Database Queries
```bash
# Find all database query operations
sg search database-queries
rg "\\.prepare\\(|\\.bind\\(|\\.all\\(|\\.first\\(|\\.run\\(" --type ts
```

#### SQL Operations
```bash
# Find SELECT statements
sg search sql-select
rg "SELECT.*FROM.*WHERE" --type ts

# Find INSERT statements
sg search sql-insert
rg "INSERT INTO" --type ts

# Find UPDATE statements
sg search sql-update
rg "UPDATE.*SET.*WHERE" --type ts
```

#### Database Results
```bash
# Find D1 result normalization
sg search database-results
rg "normalizeD1Result" --type ts
```

### Fantasy402 Integration

#### Fantasy402 Endpoints
```bash
# Find all Fantasy402 API endpoints
sg search fantasy402-endpoints
rg "/api/fantasy402/" --type ts
```

#### Fantasy402 Operations
```bash
# Find Fantasy402 operation calls
sg search fantasy402-operations
rg "getInfoPlayer|getPerformancePlayer|getTransactionList|getPending|getReportPlayerAnalysis" --type ts
```

#### Fantasy402 Tables
```bash
# Find Fantasy402 table references
sg search fantasy402-tables
rg "fantasy402_" --type ts
```

### Analytics Engine

#### Analytics Writes
```bash
# Find all Analytics Engine write operations
sg search analytics-writes
rg "ANALYTICS_ENGINE\\.writeDataPoint" --type ts
```

#### Analytics Data
```bash
# Find Analytics Engine blob data
sg search analytics-blobs
rg "blobs:\\s*\\[" --type ts

# Find Analytics Engine double data
sg search analytics-doubles
rg "doubles:\\s*\\[" --type ts

# Find Analytics Engine index data
sg search analytics-indexes
rg "indexes:\\s*\\[" --type ts
```

### KV Cache Patterns

#### KV Operations
```bash
# Find KV cache get operations
sg search kv-get
rg "\\.get\\(" --type ts

# Find KV cache put operations
sg search kv-put
rg "\\.put\\(" --type ts

# Find KV cache delete operations
sg search kv-delete
rg "\\.delete\\(" --type ts
```

#### Cache Patterns
```bash
# Find cache usage patterns
sg search cache-patterns
rg "const cached.*await.*get" --type ts
```

### Queue Patterns

#### Queue Operations
```bash
# Find queue send operations
sg search queue-send
rg "\\.send\\(" --type ts

# Find queue consumer functions
sg search queue-consumer
rg "async queue\\(batch: MessageBatch" --type ts

# Find queue processing loops
sg search queue-processing
rg "for.*message.*batch\\.messages" --type ts
```

### Scheduled Tasks

#### Scheduled Handlers
```bash
# Find scheduled task handlers
sg search scheduled-handler
rg "async scheduled\\(event: ScheduledEvent" --type ts
```

#### Cron Patterns
```bash
# Find cron schedule checks
sg search cron-patterns
rg "event\\.cron.*===" --type ts
```

### Worker Patterns

#### Worker Handlers
```bash
# Find main worker handler
sg search worker-handler
rg "export default.*async fetch" --type ts
```

#### CORS Headers
```bash
# Find CORS header usage
sg search cors-headers
rg "Access-Control-Allow-Origin" --type ts
```

#### JSON Responses
```bash
# Find JSON response creation
sg search json-responses
rg "createJSONResponse" --type ts
```

### Validation & Error Handling

#### Validators
```bash
# Find validation calls
sg search validators
rg "Validators\\." --type ts
```

#### Error Responses
```bash
# Find error response creation
sg search error-responses
rg "createErrorResponse" --type ts
```

#### Error Throws
```bash
# Find error throwing
sg search error-throws
rg "throw Errors\\." --type ts
```

#### Try-Catch Blocks
```bash
# Find try-catch error handling
sg search try-catch-blocks
rg "try.*catch" --type ts
```

### Security Patterns

#### JWT Patterns
```bash
# Find JWT-related code
sg search jwt-patterns
rg "Bun\\.jwt\\.|jwt|JWT" --type ts
```

#### Authentication Headers
```bash
# Find authentication header usage
sg search auth-headers
rg "X-Extension-Secret|Authorization" --type ts
```

### Testing Patterns

#### Test Functions
```bash
# Find all test functions
sg search test-functions
rg "test\\('|describe\\('|it\\('" --type ts
```

#### Mock Patterns
```bash
# Find mock and stub usage
sg search mock-patterns
rg "vi\\.fn\\(\\)|mock|stub" --type ts
```

### Performance Patterns

#### Performance Timing
```bash
# Find performance timing code
sg search performance-timing
rg "Date\\.now\\(\\)|performance\\.now\\(\\)" --type ts
```

#### Timeout Patterns
```bash
# Find timeout usage
sg search timeout-patterns
rg "setTimeout" --type ts
```

### Monitoring Patterns

#### Logger Patterns
```bash
# Find logging code
sg search logger-patterns
rg "createLogger|logger\\.|log\\." --type ts
```

### Utility Patterns

#### Request ID
```bash
# Find request ID generation
sg search request-id
rg "generateRequestId|requestId" --type ts
```

#### Formatters
```bash
# Find formatter function usage
sg search formatters
rg "fmt\\(|fmtNum\\(" --type ts
```

### Configuration Patterns

#### Environment Bindings
```bash
# Find environment variable usage
sg search env-bindings
rg "env\\." --type ts
```

#### Constants Usage
```bash
# Find constants import/usage
sg search constants-usage
rg "from.*shared/constants" --type ts
```

### Dashboard Patterns

#### Chart Creation
```bash
# Find Chart.js usage
sg search chart-creation
rg "new Chart\\(" --type ts
```

#### D3 Patterns
```bash
# Find D3.js usage
sg search d3-patterns
rg "d3\\.select" --type ts
```

#### Worker URL
```bash
# Find WORKER_URL definitions
sg search worker-url
rg "const WORKER_URL" --type ts
```

## Ripgrep Integration

### Basic Text Search Patterns

#### TODO Comments
```bash
rg "TODO|FIXME|HACK|XXX" --type ts
```

#### Console Statements
```bash
rg "console\\.(log|error|warn|debug|info)" --type ts
```

#### Fetch Calls
```bash
rg "fetch\\(" --type ts
```

#### Async/Await Usage
```bash
rg "async |await " --type ts
```

#### Error Handling
```bash
rg "throw |catch |Error\\(" --type ts
```

#### Database Operations
```bash
rg "\\.prepare\\(|\\.bind\\(|\\.all\\(|\\.first\\(|\\.run\\(" --type ts
```

#### API Endpoints
```bash
rg "/api/|/mcp|/health|/metrics" --type ts
```

#### Environment Variables
```bash
rg "env\\.|process\\.env\\." --type ts
```

#### Imports/Exports
```bash
rg "^import |^export " --type ts
```

#### Function Declarations
```bash
rg "^function |^const.*=.*=>|^async function" --type ts
```

#### Class Declarations
```bash
rg "^class " --type ts
```

#### Interface Declarations
```bash
rg "^interface " --type ts
```

#### Type Declarations
```bash
rg "^type " --type ts
```

#### Constants
```bash
rg "^const |^let |^var " --type ts
```

### Domain-Specific Patterns

#### Fantasy402 Patterns
```bash
rg "fantasy402|Fantasy402|FANTASY402" --type ts
```

#### MCP Patterns
```bash
rg "\\bMCP\\b|mcp|Model Context Protocol" --type ts
```

#### Analytics Patterns
```bash
rg "analytics|Analytics|ANALYTICS" --type ts
```

#### Betting Patterns
```bash
rg "bet|Bet|BET|wager|Wager|WAGER|odds|Odds|ODDS" --type ts
```

#### Sports Patterns
```bash
rg "\\b(NBA|NFL|MLB|NHL|nba|nfl|mlb|nhl)\\b" --type ts
```

#### Market Patterns
```bash
rg "\\b(moneyline|spread|total|prop|over|under)\\b" --type ts
```

#### Agent Patterns
```bash
rg "agent|Agent|AGENT|customer|Customer|CUSTOMER" --type ts
```

#### Risk Patterns
```bash
rg "risk|Risk|RISK|exposure|Exposure|EXPOSURE" --type ts
```

#### Steam Patterns
```bash
rg "steam|Steam|STEAM|move|Move|MOVE" --type ts
```

#### Sharp Patterns
```bash
rg "sharp|Sharp|SHARP|clv|CLV|closing" --type ts
```

#### Hold Patterns
```bash
rg "hold|Hold|HOLD|percentage|Percentage|PERCENTAGE" --type ts
```

#### Queue Patterns
```bash
rg "queue|Queue|QUEUE|message|Message|MESSAGE" --type ts
```

#### Cache Patterns
```bash
rg "cache|Cache|CACHE|kv|KV|namespace|Namespace" --type ts
```

#### Worker Patterns
```bash
rg "worker|Worker|WORKER|cloudflare|Cloudflare|CLOUDFLARE" --type ts
```

#### Test Patterns
```bash
rg "test|Test|TEST|spec|Spec|SPEC|describe|it|expect" --type ts
```

#### Mock Patterns
```bash
rg "mock|Mock|MOCK|stub|Stub|STUB|fake|Fake|FAKE" --type ts
```

#### Performance Patterns
```bash
rg "performance|Performance|PERFORMANCE|timing|Timing|TIMING" --type ts
```

#### Security Patterns
```bash
rg "security|Security|SECURITY|auth|Auth|AUTH|jwt|JWT|secret|Secret" --type ts
```

#### Monitoring Patterns
```bash
rg "monitor|Monitor|MONITOR|log|Log|LOG|metric|Metric|METRIC" --type ts
```

#### Deployment Patterns
```bash
rg "deploy|Deploy|DEPLOY|build|Build|BUILD|release|Release|RELEASE" --type ts
```

## Combined Search Examples

### Fantasy402 + Analytics
```bash
sg search fantasy402-endpoints | rg "analytics"
sg search analytics-writes | rg "fantasy402"
```

### MCP + Database
```bash
sg search mcp-handlers | rg "prepare"
sg search database-queries | rg "MCP"
```

### Security + Performance
```bash
sg search security-patterns | rg "performance"
sg search performance-patterns | rg "security"
```

### Testing + Mocking
```bash
sg search test-functions | rg "mock"
sg search mock-patterns | rg "test"
```

## File-Specific Searches

### Include Specific Directories
```bash
sg search endpoint-handlers --include "src/api/**"
sg search mcp-handlers --include "src/mcp/**"
sg search database-queries --include "src/**"
sg search fantasy402-endpoints --include "src/**"
sg search analytics-writes --include "src/**"
sg search kv-get --include "src/**"
sg search queue-send --include "src/queues/**"
sg search test-functions --include "tests/**"
```

### Exclude Specific Directories
```bash
sg search endpoint-handlers --exclude "tests/**"
sg search mcp-handlers --exclude "docs/**"
sg search database-queries --exclude "*.test.ts"
sg search fantasy402-endpoints --exclude "node_modules/**"
sg search analytics-writes --exclude "dist/**"
sg search kv-get --exclude "coverage/**"
sg search queue-send --exclude ".git/**"
sg search test-functions --exclude "scripts/**"
```

## Advanced Usage

### Custom Search Script

Use the enhanced search script for interactive pattern discovery:

```bash
# Show all available patterns
bun run scripts/enhanced-code-search.ts

# Search for specific pattern
bun run scripts/enhanced-code-search.ts endpoint-handlers

# Use specific search tool
bun run scripts/enhanced-code-search.ts fantasy402 ripgrep
bun run scripts/enhanced-code-search.ts analytics ast-grep
```

### Integration with CI/CD

Add to your CI pipeline:

```yaml
# .github/workflows/code-quality.yml
- name: Code Search Quality Check
  run: |
    sg scan --error
    rg "TODO|FIXME" --type ts --count
    rg "console\\." --type ts --count
```

### IDE Integration

#### VS Code
```json
{
  "ast-grep.enabled": true,
  "ast-grep.configPath": ".ast-grep.yml"
}
```

#### Cursor
The enhanced patterns work seamlessly with Cursor's built-in search.

## Performance Tips

### Optimize Search Speed
```bash
# Use specific file types
rg "pattern" --type ts

# Limit search scope
rg "pattern" src/

# Use case-insensitive search
rg -i "pattern" --type ts

# Use word boundaries
rg "\\bpattern\\b" --type ts
```

### Reduce Noise
```bash
# Exclude common directories
rg "pattern" --type ts --glob '!node_modules/**' --glob '!dist/**'

# Use context lines
rg "pattern" --type ts -C 3

# Show only filenames
rg "pattern" --type ts -l
```

## Troubleshooting

### Common Issues

#### ast-grep Not Found
```bash
# Install ast-grep
cargo install ast-grep
# or
npm install -g @ast-grep/cli
```

#### ripgrep Not Found
```bash
# Install ripgrep
brew install ripgrep
# or
cargo install ripgrep
```

#### Pattern Not Found
```bash
# Check pattern syntax
sg search --help

# Verify pattern exists
sg search pattern-name
```

#### Too Many Results
```bash
# Use more specific patterns
sg search specific-pattern

# Filter by file type
rg "pattern" --type ts

# Use word boundaries
rg "\\bpattern\\b" --type ts
```

## Best Practices

### 1. Use Semantic Search First
```bash
# Prefer ast-grep for semantic patterns
sg search endpoint-handlers
sg search mcp-handlers
sg search database-queries
```

### 2. Use Text Search for Specific Terms
```bash
# Use ripgrep for specific text patterns
rg "fantasy402" --type ts
rg "MCP" --type ts
rg "analytics" --type ts
```

### 3. Combine Both Tools
```bash
# Use both tools for comprehensive search
sg search endpoint-handlers | rg "fantasy402"
sg search mcp-handlers | rg "analytics"
```

### 4. Use File-Specific Searches
```bash
# Limit scope to relevant directories
sg search endpoint-handlers --include "src/api/**"
rg "pattern" src/api/
```

### 5. Exclude Irrelevant Files
```bash
# Exclude test files, docs, etc.
sg search pattern --exclude "tests/**"
rg "pattern" --type ts --glob '!tests/**'
```

## Related Documentation

- **[Architecture Diagrams](ARCHITECTURE_DIAGRAMS.md)** - System architecture overview
- **[Quality Standards](QUALITY_STANDARDS.md)** - Code quality guidelines
- **[Testing Guide](TESTING_GUIDE.md)** - Testing patterns and practices
- **[MCP Integration](MCP_INTEGRATION_STATUS.md)** - MCP server documentation

## Support

- **Issues**: GitHub Issues
- **Documentation**: [ast-grep Documentation](https://ast-grep.github.io/)
- **Ripgrep**: [ripgrep Documentation](https://github.com/BurntSushi/ripgrep)

---

**Status:** Production Ready ✅  
**Last Updated:** 2025-10-08  
**Account:** nolarose1968-806
