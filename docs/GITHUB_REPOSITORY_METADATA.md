# GitHub Repository Metadata

**Project:** Betting-Brain v3.2.0
**Last Updated:** 2025-10-08

This document describes GitHub repository metadata including topics, tags, description, and settings that should be configured.

---

## Repository Topics

Add these topics via GitHub Settings → Topics (or click "Add topics" on repository page):

### Primary Topics (Core Technology)
```
bun
typescript
cloudflare-workers
edge-computing
serverless
d1-database
workers-analytics
mcp-server
```

### Functional Topics (What It Does)
```
betting-intelligence
sports-betting
betting-analytics
real-time-analytics
line-movements
sharp-indicators
steam-detection
risk-management
exposure-tracking
```

### Development Topics (How It's Built)
```
ai-assisted
cursor-rules
quality-standards
ast-grep
zod-validation
structured-logging
type-safety
```

### Integration Topics
```
json-rpc
mcp-protocol
model-context-protocol
cloudflare-queues
analytics-engine
browser-extension
```

### Testing & Quality
```
bun-test
code-quality
security-scanning
ci-cd
```

**Total: ~32 topics** (GitHub max is 20, prioritize top 20)

### Recommended Top 20

1. `bun`
2. `typescript`
3. `cloudflare-workers`
4. `edge-computing`
5. `betting-intelligence`
6. `mcp-server`
7. `sports-betting`
8. `real-time-analytics`
9. `d1-database`
10. `serverless`
11. `ai-assisted`
12. `cursor-rules`
13. `quality-standards`
14. `ast-grep`
15. `zod-validation`
16. `json-rpc`
17. `sharp-indicators`
18. `steam-detection`
19. `bun-test`
20. `code-quality`

---

## Repository Description

**Current Description:**
```
Enterprise-grade betting data interceptor with circuit breaker and health monitoring
```

**Updated Description (v3.2.0):**
```
🧠 Edge-native betting intelligence platform with MCP server, real-time analytics, and AI-assisted development (Bun + TypeScript + Cloudflare Workers)
```

**Alternative (Shorter):**
```
Edge-native betting intelligence with MCP server | Bun + TypeScript + Cloudflare Workers
```

---

## Repository Settings

### General Settings

**Repository Name:** `betting-brain-v3`

**Visibility:** Private (or Public depending on your needs)

**Features:**
- ✅ Issues
- ✅ Projects
- ✅ Discussions (optional)
- ✅ Wiki (optional)
- ✅ Preserve this repository (recommended)

**Pull Requests:**
- ✅ Allow squash merging
- ✅ Allow merge commits
- ✅ Automatically delete head branches
- ✅ Allow auto-merge
- ✅ Require PR reviews before merging (1 reviewer minimum)

**Merge Button:**
- ✅ Squash and merge (default)
- ❌ Rebase and merge
- ❌ Allow merge commits

### Branch Protection Rules

**Protected Branch:** `main`

**Rules:**
- ✅ Require pull request reviews before merging (1 approval)
- ✅ Require status checks to pass before merging
  - `ci` (bun run ci)
  - `security` (sg scan src/)
  - `type-check` (tsc --noEmit)
  - `tests` (bun test)
- ✅ Require branches to be up to date before merging
- ✅ Require conversation resolution before merging
- ✅ Require signed commits (recommended)
- ✅ Include administrators (enforce rules for admins too)

### About Section

**Website:** (Your deployed worker URL, if public)
```
https://betting-brain-v3.workers.dev
```

**Topics:** See "Recommended Top 20" above

**Description:** See "Updated Description" above

**Social Preview Image:** (Optional - create a banner/logo)

---

## GitHub Actions Secrets

Required secrets for CI/CD:

```
CLOUDFLARE_API_TOKEN=<your-api-token>
CLOUDFLARE_ACCOUNT_ID=<your-account-id>
```

Optional secrets:
```
SLACK_WEBHOOK_URL=<webhook-for-release-notifications>
```

---

## Release Configuration

### Release Settings

**Releases:**
- ✅ Automatically generate release notes
- ✅ Include contributors in release notes

**Release Workflow:**

1. **Create Release on GitHub:**
   - Go to Releases → Draft a new release
   - Choose tag: `v3.2.0`
   - Release title: `v3.2.0 - Comprehensive Quality Standards Rollout`
   - Description: Copy from [docs/RELEASE_NOTES.md](RELEASE_NOTES.md)

2. **Release Checklist:**
   - [ ] Tag created: `git tag -a v3.2.0`
   - [ ] Tag pushed: `git push origin v3.2.0`
   - [ ] CHANGELOG.md updated
   - [ ] README.md version bumped
   - [ ] package.json version bumped
   - [ ] CI passing on main branch
   - [ ] GitHub release created with notes

---

## Repository Badges

Add to README.md:

```markdown
[![Version](https://img.shields.io/github/v/release/nolarose1968/betting-brain-v3?label=version)](https://github.com/nolarose1968/betting-brain-v3/releases)
[![CI](https://github.com/nolarose1968/betting-brain-v3/actions/workflows/ci.yml/badge.svg)](https://github.com/nolarose1968/betting-brain-v3/actions/workflows/ci.yml)
[![Security](https://img.shields.io/badge/security-ast--grep-blue)](https://ast-grep.github.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](tsconfig.json)
[![Bun](https://img.shields.io/badge/Bun-%E2%89%A51.0.0-black)](https://bun.sh)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com/)
[![MCP Server](https://img.shields.io/badge/MCP-Server-green)](docs/MCP_INTEGRATION_STATUS.md)
```

---

## Social Preview

### Recommended Image Specs

- **Size:** 1280x640px
- **Format:** PNG or JPG
- **Content:**
  - Project name: "Betting-Brain v3"
  - Tagline: "Edge-Native Betting Intelligence"
  - Tech stack icons: Bun, TypeScript, Cloudflare
  - Key metrics: 24 rules, 23 ast-grep rules, 100% metadata

### Creating Social Preview

Use tools like:
- [Canva](https://www.canva.com/) - Free design tool
- [Figma](https://www.figma.com/) - Design platform
- [GitHub Social Preview Generator](https://github.com/pqt/github-social-preview-generator) - Automated tool

---

## GitHub CLI Commands

Set up repository metadata via GitHub CLI:

```bash
# Install GitHub CLI (if not installed)
brew install gh  # macOS
# or
curl -sS https://webi.sh/gh | sh

# Login
gh auth login

# Set repository description
gh repo edit nolarose1968/betting-brain-v3 \
  --description "🧠 Edge-native betting intelligence platform with MCP server, real-time analytics, and AI-assisted development (Bun + TypeScript + Cloudflare Workers)"

# Add topics (max 20)
gh repo edit nolarose1968/betting-brain-v3 \
  --add-topic bun,typescript,cloudflare-workers,edge-computing,betting-intelligence,mcp-server,sports-betting,real-time-analytics,d1-database,serverless,ai-assisted,cursor-rules,quality-standards,ast-grep,zod-validation,json-rpc,sharp-indicators,steam-detection,bun-test,code-quality

# Enable features
gh repo edit nolarose1968/betting-brain-v3 \
  --enable-issues \
  --enable-projects \
  --enable-wiki

# Create release (after tag is pushed)
gh release create v3.2.0 \
  --title "v3.2.0 - Comprehensive Quality Standards Rollout" \
  --notes-file docs/RELEASE_NOTES.md
```

---

## Example Repository Structure

```
nolarose1968/betting-brain-v3
├── About
│   ├── Description: Edge-native betting intelligence...
│   ├── Website: https://betting-brain-v3.workers.dev
│   └── Topics: bun, typescript, cloudflare-workers, ...
├── Code
│   ├── main (protected)
│   ├── 24 cursor rules (.cursor/rules/*.mdc)
│   ├── 23 ast-grep rules (.ast-grep.yml)
│   └── 2,200+ lines of rules
├── Releases
│   ├── v3.2.0 (Latest)
│   ├── v3.1.0
│   └── ...
├── Actions
│   ├── ci.yml (CI/CD pipeline)
│   ├── security.yml (ast-grep scanning)
│   └── deploy.yml (Cloudflare deployment)
└── Settings
    ├── Branch protection (main)
    ├── Secrets (CLOUDFLARE_API_TOKEN, etc.)
    └── Merge settings (squash & merge)
```

---

## Maintenance Checklist

### Weekly
- [ ] Check CI/CD status
- [ ] Review open PRs
- [ ] Update dependencies (bun update)

### Monthly
- [ ] Review and update topics if needed
- [ ] Check repository insights/analytics
- [ ] Update documentation for major changes

### Per Release
- [ ] Create annotated git tag
- [ ] Update version in README, package.json, CHANGELOG
- [ ] Create GitHub release with notes
- [ ] Update repository description if significant changes
- [ ] Post release announcement (if public)

---

## References

- **GitHub Topics**: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics
- **Branch Protection**: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
- **CODEOWNERS**: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
- **GitHub Releases**: https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases
- **GitHub CLI**: https://cli.github.com/

---

**Status:** Ready for implementation ✅
**Last Updated:** 2025-10-08
**Project Version:** v3.2.0
