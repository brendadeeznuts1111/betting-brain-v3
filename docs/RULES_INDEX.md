# 🎯 Rules Index

<div align="center">

**Complete rules reference** • **AI-native development** • **Quality enforcement** • **Production-ready patterns**

</div>

## 📋 **Rules Overview**

This document provides a comprehensive index of all Cursor rules and their relationships, making it easy to find the right rule for any development task.

## 🤖 **AI Development Rules**

| Rule | Purpose | Key Features | Dependencies |
|------|---------|--------------|--------------|
| **[99-floor.mdc](.cursor/rules/99-floor.mdc)** | Autonomous operations layer | Self-documenting, self-healing, self-deploying | All rules |
| **[ai-friendly-testing.mdc](.cursor/rules/ai-friendly-testing.mdc)** | AI-optimized testing patterns | Quiet output, smart caching, environment detection | testing-patterns, quality-standards |
| **[mcp-integration.mdc](.cursor/rules/mcp-integration.mdc)** | MCP server patterns | JSON-RPC 2.0, tool registry, validation | api-patterns, quality-standards |

## 📏 **Quality & Standards Rules**

| Rule | Purpose | Key Features | Dependencies |
|------|---------|--------------|--------------|
| **[quality-standards.mdc](.cursor/rules/quality-standards.mdc)** | Code quality enforcement | Type safety, constants, utilities, error handling | All rules |
| **[testing-patterns.mdc](.cursor/rules/testing-patterns.mdc)** | Comprehensive testing standards | Forest Grove system, AI-friendly output, analytics stub | quality-standards, analytics-testing |
| **[analytics-testing.mdc](.cursor/rules/analytics-testing.mdc)** | Analytics testing patterns | AnalyticsEngineStub, first-class assertions | testing-patterns, quality-standards |
| **[test-setup-patterns.mdc](.cursor/rules/test-setup-patterns.mdc)** | Test configuration patterns | Setup, mocks, environment management | testing-patterns, quality-standards |

## 🔐 **Security & Production Rules**

| Rule | Purpose | Key Features | Dependencies |
|------|---------|--------------|--------------|
| **[security-patterns.mdc](.cursor/rules/security-patterns.mdc)** | Production security patterns | Input validation, SQL injection prevention, rate limiting | quality-standards, api-patterns |
| **[production-security.mdc](.cursor/rules/production-security.mdc)** | Production security enforcement | ast-grep rules, cost controls, scale testing | security-patterns, quality-standards |
| **[bun-runtime.mdc](.cursor/rules/bun-runtime.mdc)** | Bun runtime patterns | Process management, file operations, native APIs | quality-standards, process-management |

## 🏗️ **Architecture & API Rules**

| Rule | Purpose | Key Features | Dependencies |
|------|---------|--------------|--------------|
| **[api-patterns.mdc](.cursor/rules/api-patterns.mdc)** | API design patterns | Request handling, error responses, validation | quality-standards, security-patterns |
| **[endpoint-routing.mdc](.cursor/rules/endpoint-routing.mdc)** | Endpoint routing patterns | Request flow, CORS, logging | api-patterns, cloudflare-workers |
| **[database-patterns.mdc](.cursor/rules/database-patterns.mdc)** | Database best practices | D1 queries, type safety, performance | quality-standards, security-patterns |
| **[cloudflare-workers.mdc](.cursor/rules/cloudflare-workers.mdc)** | Workers patterns | Environment bindings, routing, performance | api-patterns, database-patterns |

## 🧪 **Testing & CI Rules**

| Rule | Purpose | Key Features | Dependencies |
|------|---------|--------------|--------------|
| **[testing.mdc](.cursor/rules/testing.mdc)** | Testing conventions | Bun test, test organization, coverage | quality-standards, testing-patterns |
| **[ci-integration.mdc](.cursor/rules/ci-integration.mdc)** | CI/CD automation | Process management, timeout handling, reporting | testing-patterns, process-management |
| **[ci-patterns.mdc](.cursor/rules/ci-patterns.mdc)** | CI/CD patterns | Automation, process management, zombie prevention | ci-integration, process-management |

## 📝 **Documentation & Organization Rules**

| Rule | Purpose | Key Features | Dependencies |
|------|---------|--------------|--------------|
| **[documentation.mdc](.cursor/rules/documentation.mdc)** | Documentation standards | File naming, organization, cross-linking | quality-standards, file-naming |
| **[file-naming.mdc](.cursor/rules/file-naming.mdc)** | File naming conventions | kebab-case, extensions, organization | documentation, quality-standards |
| **[root-organization.mdc](.cursor/rules/root-organization.mdc)** | Root directory organization | Clean root, proper file placement | documentation, file-naming |
| **[code-searchability.mdc](.cursor/rules/code-searchability.mdc)** | Code search patterns | ast-grep integration, pattern discovery | quality-standards, documentation |

## 🔧 **Infrastructure & Performance Rules**

| Rule | Purpose | Key Features | Dependencies |
|------|---------|--------------|--------------|
| **[cloudflare-infrastructure.mdc](.cursor/rules/cloudflare-infrastructure.mdc)** | Cloudflare infrastructure patterns | Edge deployment, performance, scaling | cloudflare-workers, quality-standards |
| **[cache-optimization.mdc](.cursor/rules/cache-optimization.mdc)** | Cache optimization patterns | Performance, cost reduction, caching strategies | quality-standards, cloudflare-infrastructure |
| **[process-management.mdc](.cursor/rules/process-management.mdc)** | Process management patterns | Zombie prevention, cleanup, signal handling | bun-runtime, ci-integration |

## 🎯 **Specialized Rules**

| Rule | Purpose | Key Features | Dependencies |
|------|---------|--------------|--------------|
| **[browser-extension.mdc](.cursor/rules/browser-extension.mdc)** | Browser extension patterns | Manifest v3, security, storage | security-patterns, quality-standards |
| **[coverage-thresholds.mdc](.cursor/rules/coverage-thresholds.mdc)** | Coverage threshold configuration | Dual thresholds, analytics testing | testing-patterns, analytics-testing |
| **[analytics-stub-api.mdc](.cursor/rules/analytics-stub-api.mdc)** | AnalyticsEngineStub API patterns | Mock analytics, testing utilities | analytics-testing, testing-patterns |

## 🔗 **Rule Relationships**

### **Core Dependencies**
- **quality-standards.mdc** - Foundation for all other rules
- **99-floor.mdc** - Autonomous operations layer that depends on all rules
- **api-patterns.mdc** - Core API patterns used by many rules

### **Rule Hierarchies**

#### **Testing Hierarchy**
```
testing-patterns.mdc
├── analytics-testing.mdc
├── test-setup-patterns.mdc
├── testing.mdc
└── coverage-thresholds.mdc
```

#### **Security Hierarchy**
```
security-patterns.mdc
├── production-security.mdc
├── api-patterns.mdc
└── database-patterns.mdc
```

#### **Architecture Hierarchy**
```
api-patterns.mdc
├── endpoint-routing.mdc
├── database-patterns.mdc
├── cloudflare-workers.mdc
└── mcp-integration.mdc
```

## 📚 **Quick Reference**

### **For New Developers**
1. Start with **[quality-standards.mdc](.cursor/rules/quality-standards.mdc)** - Foundation rules
2. Read **[api-patterns.mdc](.cursor/rules/api-patterns.mdc)** - Core API patterns
3. Review **[testing-patterns.mdc](.cursor/rules/testing-patterns.mdc)** - Testing standards
4. Check **[security-patterns.mdc](.cursor/rules/security-patterns.mdc)** - Security requirements

### **For AI Development**
1. **[ai-friendly-testing.mdc](.cursor/rules/ai-friendly-testing.mdc)** - AI-optimized testing
2. **[mcp-integration.mdc](.cursor/rules/mcp-integration.mdc)** - MCP server patterns
3. **[99-floor.mdc](.cursor/rules/99-floor.mdc)** - Autonomous operations

### **For Production Deployment**
1. **[production-security.mdc](.cursor/rules/production-security.mdc)** - Production security
2. **[cloudflare-workers.mdc](.cursor/rules/cloudflare-workers.mdc)** - Workers deployment
3. **[ci-integration.mdc](.cursor/rules/ci-integration.mdc)** - CI/CD automation

## 🎯 **Rule Usage Patterns**

### **Development Workflow**
1. **Code Quality**: quality-standards.mdc
2. **API Development**: api-patterns.mdc
3. **Testing**: testing-patterns.mdc
4. **Security**: security-patterns.mdc
5. **Deployment**: cloudflare-workers.mdc

### **AI Development Workflow**
1. **AI Testing**: ai-friendly-testing.mdc
2. **MCP Integration**: mcp-integration.mdc
3. **Autonomous Operations**: 99-floor.mdc
4. **Quality Assurance**: quality-standards.mdc

## 📖 **Related Documentation**

- **[Cursor Rules Guide](docs/CURSOR_RULES.md)** - Complete rules documentation
- **[Quality Standards](docs/QUALITY_STANDARDS.md)** - Code quality enforcement
- **[Testing Guide](docs/testing/INTEGRATED_TESTING_SYSTEM.md)** - Forest Grove testing
- **[MCP Integration](docs/MCP_INTEGRATION_STATUS.md)** - MCP server status

---

**Status:** Complete rules index with relationships and usage patterns
**Last Updated:** 2025-10-08
**Total Rules:** 25 rules across 6 categories
