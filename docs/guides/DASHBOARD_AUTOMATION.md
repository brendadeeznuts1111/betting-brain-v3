# 📊 Dashboard Automation

**Betting-Brain v3.2.0**
**Last Updated:** 2025-10-08

This document describes the **zero-touch dashboard automation** layer that deploys HTML dashboards, imports Grafana dashboards, and updates documentation on every release.

---

## 🎯 Overview

The dashboard automation layer consists of **3 focused scripts**:

1. **`scripts/deploy-dashboards.ts`** - Deploy HTML dashboards to Cloudflare Pages
2. **`scripts/push-grafana.ts`** - Auto-import Grafana dashboard via API
3. **`scripts/update-readme.ts`** - Update README.md and dashboards/README.md with version and links

**Workflow:**
- **Automatic**: Runs on every release tag push (`.github/workflows/release.yml`)
- **Manual**: Run locally via `bun run dashboard:all`

---

## 🚀 Quick Start

### Automatic (via GitHub Release)

1. **Create annotated tag:**
   ```bash
   git tag -a v3.2.1 -m "Release v3.2.1"
   git push origin v3.2.1
   ```

2. **Automation runs automatically:**
   - ✅ Dashboards deployed to Cloudflare Pages
   - ✅ Grafana dashboard imported (if secrets configured)
   - ✅ README.md updated with version and links
   - ✅ Changes committed with `[skip ci]`

### Manual (Local Testing)

```bash
# Run all automation steps
bun run dashboard:all

# Or run individual steps
bun run dashboard:deploy    # Deploy to Cloudflare Pages
bun run dashboard:grafana   # Push to Grafana (requires secrets)
bun run dashboard:bump      # Update README files
```

---

## 🔐 GitHub Secrets (Required)

Add these secrets in **GitHub Settings → Secrets and variables → Actions**:

### Required for Cloudflare Pages Deployment

Already configured (from existing Cloudflare Workers deployment):
- `CLOUDFLARE_API_TOKEN` - Cloudflare API token with Pages write permissions
- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID

### Optional for Grafana Import

- `GRAFANA_URL` - Your Grafana instance URL (e.g., `https://grafana.example.com`)
- `GRAFANA_KEY` - Grafana API key with Editor role (Dashboard write permissions)

**Note:** Grafana push step has `continue-on-error: true`, so missing secrets won't fail the release.

---

## ⚙️ One-Time Setup

### 1. Cloudflare Pages Project

Create a Cloudflare Pages project for dashboard hosting:

```bash
# Option 1: Via Wrangler CLI
wrangler pages project create betting-brain-dashboards

# Option 2: Via Cloudflare Dashboard
# 1. Go to Pages → Create a project
# 2. Name: betting-brain-dashboards
# 3. Production branch: main
# 4. Build settings: None (pre-built artifacts)
```

**Project Configuration:**
- **Project Name:** `betting-brain-dashboards`
- **Build Directory:** `dist/dashboards` (auto-deployed)
- **Framework Preset:** None (static HTML)

### 2. Grafana API Key

Generate a Grafana API key for dashboard import:

1. **Go to Grafana → Configuration → API Keys**
2. **Create new key:**
   - Name: `GitHub Actions - Dashboard Import`
   - Role: `Editor` (required for dashboard write)
   - Expiration: 1 year (or never)
3. **Copy the key** (shown only once)
4. **Add to GitHub Secrets** as `GRAFANA_KEY`

### 3. Verify Environment Variables

For local testing, create `.env.local`:

```bash
GRAFANA_URL=https://your-grafana.com
GRAFANA_KEY=your-grafana-api-key
```

**Note:** `.env.local` is git-ignored.

---

## 📦 What Gets Deployed

### HTML Dashboards (Cloudflare Pages)

**Source:** `dashboards/*.html`
**Destination:** `https://betting-brain-dashboards.pages.dev`

**Build Process:**
1. Read version from `package.json`
2. Replace `{{VERSION}}` placeholders with actual version
3. Minify HTML (strip comments, collapse whitespace)
4. Copy to `dist/dashboards/`
5. Deploy via `wrangler pages deploy`

**Example Output:**
```
📦 Building dashboards (v3.2.0)...
   Found 3 dashboard files
   ✓ Built index.html
   ✓ Built dashboard.html
   ✓ Built performance.html
✅ Dashboard build complete

🚀 Deploying to Cloudflare Pages...
✅ Dashboards deployed successfully!
   Live at: https://betting-brain-dashboards.pages.dev
```

### Grafana Dashboard (Grafana Instance)

**Source:** `monitoring/grafana/dashboard.json`
**Destination:** Your Grafana instance (via HTTP API)

**Import Process:**
1. Read `monitoring/grafana/dashboard.json`
2. POST to `${GRAFANA_URL}/api/dashboards/db`
3. Overwrite existing dashboard if present
4. Return dashboard URL and metadata

**Example Output:**
```
📊 Dashboard ID: 42
🔗 Dashboard Slug: betting-brain-intelligence
🆔 Dashboard UID: betting-brain-v3
🌐 Dashboard URL: https://grafana.example.com/d/betting-brain-v3
```

### README Updates

**Files Updated:**
1. `README.md` - Version, dashboard links, auto-deployment notice
2. `dashboards/README.md` - Version and last updated date

**Changes:**
- Version in header: `# 🧠 Betting-Brain v3.2.0`
- Dashboard link: `[📊 Dashboard](monitoring/grafana/dashboard.json)` → `[📊 Dashboards](dashboards/index.html) | [⚙️ Grafana Setup](monitoring/grafana/README.md)`
- Auto-deployment notice added (if not present)
- Dashboard README version updated

---

## 🧪 Local Testing

### Test Dashboard Build

```bash
# Build dashboards locally
bun run scripts/deploy-dashboards.ts

# Check output
ls -lh dist/dashboards/
cat dist/dashboards/index.html | head -20
```

### Test Grafana Import

```bash
# Set environment variables
export GRAFANA_URL=https://your-grafana.com
export GRAFANA_KEY=your-api-key

# Import dashboard
bun run scripts/push-grafana.ts

# Or use .env.local
echo "GRAFANA_URL=https://your-grafana.com" > .env.local
echo "GRAFANA_KEY=your-api-key" >> .env.local
bun run dashboard:grafana
```

### Test README Updates

```bash
# Update README files
bun run scripts/update-readme.ts

# Check changes
git diff README.md dashboards/README.md
```

### Test Full Workflow

```bash
# Run all automation steps
bun run dashboard:all

# Verify outputs
echo "1. Check dist/dashboards/ for built dashboards"
echo "2. Check README.md for updated version and links"
echo "3. Check dashboards/README.md for updated version"
```

---

## 🔍 Troubleshooting

### Dashboard Deployment Issues

**Error:** `wrangler: command not found`

**Solution:** Install Wrangler globally:
```bash
bun install -g wrangler
```

**Error:** `Cloudflare Pages project not found`

**Solution:** Create the project first:
```bash
wrangler pages project create betting-brain-dashboards
```

**Error:** `Invalid Cloudflare API token`

**Solution:** Verify token has Pages write permissions:
1. Go to Cloudflare → My Profile → API Tokens
2. Edit token → Add `Cloudflare Pages:Edit` permission

---

### Grafana Import Issues

**Error:** `GRAFANA_URL environment variable is required`

**Solution:** Set the environment variable:
```bash
export GRAFANA_URL=https://your-grafana.com
# Or add to .env.local
```

**Error:** `HTTP 401: Unauthorized`

**Solution:** Check API key permissions:
1. Grafana → Configuration → API Keys
2. Key must have `Editor` role (not Viewer)

**Error:** `HTTP 422: Validation Failed`

**Solution:** Dashboard JSON is invalid. Validate manually:
```bash
cat monitoring/grafana/dashboard.json | jq empty
```

---

### README Update Issues

**Error:** `README.md already up to date`

**Solution:** This is normal if the version hasn't changed. Force update by:
1. Bumping version in `package.json`
2. Running `bun run dashboard:bump` again

**Error:** `Auto-deployment notice not added`

**Solution:** Ensure the header navigation line exists in README.md:
```markdown
[📚 Documentation Index](docs/INDEX.md)
```

---

## 📁 File Structure

```
betting-brain-v3/
├── scripts/
│   ├── deploy-dashboards.ts    # Dashboard build & deploy (177 lines)
│   ├── push-grafana.ts          # Grafana API import (126 lines)
│   └── update-readme.ts         # README automation (186 lines)
├── dashboards/
│   ├── index.html               # Main dashboard
│   ├── dashboard.html           # Detailed dashboard
│   ├── performance.html         # Performance metrics
│   └── README.md                # Dashboard documentation
├── monitoring/
│   └── grafana/
│       ├── dashboard.json       # Grafana config (1,234 lines)
│       ├── README.md            # Grafana setup guide
│       └── import.sh            # Manual import script (deprecated)
├── .github/
│   └── workflows/
│       └── release.yml          # Automated release workflow
└── package.json                 # Dashboard scripts
```

---

## 🔗 Integration Points

### GitHub Workflow (.github/workflows/release.yml)

```yaml
- name: '🎨 Deploy Dashboards'
  run: bun run scripts/deploy-dashboards.ts

- name: '📊 Push Grafana Dashboard'
  env:
    GRAFANA_URL: ${{ secrets.GRAFANA_URL }}
    GRAFANA_KEY: ${{ secrets.GRAFANA_KEY }}
  run: bun run scripts/push-grafana.ts
  continue-on-error: true

- name: '📝 Update README with Links'
  run: bun run scripts/update-readme.ts

- name: '💾 Commit README Updates'
  run: |
    git config --local user.email "action@github.com"
    git config --local user.name "GitHub Action"
    git add README.md dashboards/README.md
    git diff --quiet && git diff --staged --quiet || git commit -m "chore: auto-update dashboard links [skip ci]"
    git push
```

### Package.json Scripts

```json
{
  "scripts": {
    "dashboard:deploy": "bun run scripts/deploy-dashboards.ts",
    "dashboard:grafana": "bun run scripts/push-grafana.ts",
    "dashboard:bump": "bun run scripts/update-readme.ts",
    "dashboard:all": "bun run dashboard:deploy && bun run dashboard:grafana && bun run dashboard:bump"
  }
}
```

---

## 📝 Next Steps

1. **One-time setup:**
   - Create Cloudflare Pages project (`betting-brain-dashboards`)
   - Generate Grafana API key
   - Add GitHub secrets (`GRAFANA_URL`, `GRAFANA_KEY`)

2. **First deployment:**
   - Test locally: `bun run dashboard:all`
   - Create release tag: `git tag -a v3.2.1`
   - Push tag: `git push origin v3.2.1`
   - Verify automation in GitHub Actions

3. **Ongoing:**
   - Automation runs on every release tag
   - No manual intervention required
   - Dashboards always in sync with release version

---

## 📚 Related Documentation

- **[README.md](../README.md)** - Main project documentation
- **[monitoring/grafana/README.md](../monitoring/grafana/README.md)** - Grafana setup guide
- **[dashboards/README.md](../dashboards/README.md)** - Dashboard organization
- **[docs/GITHUB_REPOSITORY_METADATA.md](GITHUB_REPOSITORY_METADATA.md)** - GitHub topics, badges

---

**Status:** ✅ Production Ready
**Automation:** Zero-Touch
**Maintenance:** Minimal (one-time setup only)

*Last Updated: 2025-10-08*
*Betting-Brain v3.2.0 - Automated Dashboard Deployment*
