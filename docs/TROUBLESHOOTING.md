# 🔧 Troubleshooting Guide

**Betting-Brain v3** - Common issues and solutions

---

## 📦 Dependency Installation Issues

### Issue: Cannot find type definition for '@cloudflare/workers-types'

**Symptoms:**
```
Cannot find type definition file for '@cloudflare/workers-types'.
The file is in the program because:
  Entry point of type library '@cloudflare/workers-types' specified in compilerOptions
```

**Cause:**
The Bun package manager is configured to use a private registry (`packages.apexodds.net`) which doesn't have all public npm packages.

**Solution 1: Override Registry for Installation (Recommended)**
```bash
# Unset private registry environment variables
env -u BUN_REGISTRY -u npm_config_registry bun install

# This works because:
# - BUN_REGISTRY env var forces Bun to use private registry
# - npm_config_registry also affects Bun's registry selection
# - Unsetting both allows bunfig.toml to use public registry
```

**Solution 2: Install Specific Packages**
```bash
# Install missing type definitions
env -u BUN_REGISTRY -u npm_config_registry bun add -d @types/bun
env -u BUN_REGISTRY -u npm_config_registry bun add -d @cloudflare/workers-types
```

**Solution 3: Ignore Type Errors During Development**
The TypeScript error is a linter warning and won't block:
- ✅ Development (`bun run dev`)
- ✅ Deployment (`wrangler deploy`)
- ✅ Runtime execution

The `.vscode/settings.json` file has been configured to minimize these warnings.

---

## 🌐 Wrangler/Cloudflare Issues

### Issue: D1 Database Not Found

**Symptoms:**
```
Error: Database 'betting-analytics' not found
```

**Solution:**
```bash
# Create the D1 database
wrangler d1 create betting-analytics

# Update wrangler.toml with the database_id
# Then run migrations
bun run db:apply
```

---

### Issue: Queue Not Found

**Symptoms:**
```
Error: Queue 'line-ingress' not found
```

**Solution:**
```bash
# Create the queues
wrangler queues create line-ingress
wrangler queues create steam-webhook

# Update wrangler.toml with the queue bindings
```

---

## 🧪 Testing Issues

### Issue: Vitest Pool Workers Not Found

**Symptoms:**
```
error: @cloudflare/vitest-pool-workers@^0.1.0 failed to resolve
```

**Solution:**
```bash
# Use public registry for dev dependencies
BUN_REGISTRY=https://registry.npmjs.org bun install --dev

# Or use npm
npm install --save-dev @cloudflare/vitest-pool-workers @vitest/coverage-v8
```

---

## 🔗 Link Checker Issues

### Issue: Link Checker Requires npm Packages

**Symptoms:**
```
error: Cannot find module 'glob'
```

**Solution:**
Use the standalone shell script instead:
```bash
# Use the simple version (no dependencies)
bash scripts/link-check-simple.sh

# Or install glob from public registry
BUN_REGISTRY=https://registry.npmjs.org bun add -d glob
npm run link-check
```

---

## 🚀 Deployment Issues

### Issue: Environment Variables Not Set

**Symptoms:**
```
Error: Missing required environment variable
```

**Solution:**
```bash
# Copy example env file
cp .env.example .env

# Edit with your values
# Then set in Wrangler secrets
wrangler secret put MY_SECRET
```

---

### Issue: Migration Failures

**Symptoms:**
```
Error applying migration: table already exists
```

**Solution:**
```bash
# Check current migration status
wrangler d1 migrations list betting-analytics

# If needed, manually drop and recreate
wrangler d1 execute betting-analytics --command "DROP TABLE IF EXISTS line_movements;"

# Re-run migrations
bun run db:apply
```

---

## 🐛 Development Issues

### Issue: Worker Not Reloading

**Symptoms:**
Changes to code don't appear in local development.

**Solution:**
```bash
# Kill any running wrangler processes
pkill -f wrangler

# Clear .wrangler directory
rm -rf .wrangler

# Restart dev server
bun run dev
```

---

### Issue: Port Already in Use

**Symptoms:**
```
Error: listen EADDRINUSE: address already in use :::8787
```

**Solution:**
```bash
# Find and kill process on port 8787
lsof -ti:8787 | xargs kill -9

# Or use a different port
wrangler dev --port 8788
```

---

## 📊 Monitoring Issues

### Issue: Grafana Dashboard Not Loading

**Symptoms:**
Dashboard shows "No data" or fails to load.

**Solution:**
```bash
# Verify Analytics Engine is configured
# Check wrangler.toml for analytics_engine_datasets binding

# Verify data is being written
# Check worker logs for analytics writes
wrangler tail
```

---

## 🔒 Security Issues

### Issue: Rate Limit Memory Cleanup

**Symptoms:**
Memory grows over time in rate limiter.

**Solution:**
The rate limiter uses probabilistic cleanup (1% chance per request).
For high-traffic scenarios, consider:
- Using Durable Objects for persistent rate limiting
- Using KV with TTL for distributed rate limiting
- Increasing cleanup probability

---

## 📝 Documentation Issues

### Issue: Broken Links in Documentation

**Symptoms:**
Link checker reports broken links.

**Solution:**
```bash
# Run link checker
bash scripts/link-check-simple.sh

# Fix reported links
# Common issues:
# - Relative paths (use ../ for parent directory)
# - Files moved to docs/ (update paths)
# - Missing files (create or remove link)
```

---

## 🆘 Getting Help

### Quick Checks

1. **Check Environment:**
   ```bash
   # Verify Node/Bun version
   node --version  # Should be 18+
   bun --version   # Should be 1.0+
   
   # Verify Wrangler
   wrangler --version  # Should be 3.0+
   ```

2. **Check Configuration:**
   ```bash
   # Verify wrangler.toml is valid
   wrangler whoami
   
   # Check TypeScript config
   bun run lint
   ```

3. **Check Logs:**
   ```bash
   # Local development logs
   bun run dev
   
   # Production logs
   wrangler tail
   
   # Deployment logs
   wrangler deployments list
   ```

### Still Stuck?

1. Check the [QUICKSTART.md](QUICKSTART.md) for setup instructions
2. Review [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) for architecture details
3. Check [INDEX.md](INDEX.md) for complete documentation map
4. Review [CHANGELOG.md](../CHANGELOG.md) for recent changes

---

## 🔄 Common Workflows

### Clean Slate Setup
```bash
# 1. Clean everything
rm -rf node_modules .wrangler dist coverage
rm -f bun.lockb package-lock.json

# 2. Reinstall with public registry
env -u BUN_REGISTRY -u npm_config_registry bun install

# 3. Install Bun types if needed
env -u BUN_REGISTRY -u npm_config_registry bun add -d @types/bun

# 4. Bootstrap environment
bun run bootstrap

# 5. Run migrations
bun run db:apply

# 6. Start dev server
bun run dev
```

### Pre-Deployment Checklist
```bash
# 1. Run linter
bun run lint

# 2. Run tests
bun run test

# 3. Check links
bash scripts/link-check-simple.sh

# 4. Build
bun run build

# 5. Deploy to staging first
wrangler deploy --env staging

# 6. Test staging
curl https://betting-brain-staging.workers.dev/health

# 7. Deploy to production
bun run deploy:prod
```

---

**Last Updated:** October 7, 2025  
**Version:** 3.1.0  
**Maintainer:** Betting-Brain Team

