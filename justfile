# Justfile - Single-command developer UX
# "Make the codebase feel like it's reading your mind before you finish typing."

# Default recipe - show all commands
default:
    @just --list

# 🚀 Development - clone → open → code in 30s
dev:
    @echo "🚀 Starting full development environment..."
    @just search-index &
    @wrangler dev --local &
    @cd dashboards && python3 -m http.server 8080 &
    @just docs-serve &
    @wait
    @echo "✅ Ready! Worker: http://localhost:8787 | Dashboard: http://localhost:8080 | Docs: http://localhost:3001"

# 🔍 Code Search - fuzzy-find everything
search QUERY:
    @echo "🔍 Searching for: {{QUERY}}"
    @bun scripts/search.ts "{{QUERY}}"

# 🎨 Format - formats, sorts imports, rebuilds search index
fmt:
    @echo "🎨 Formatting codebase..."
    @prettier --write "**/*.{ts,json,md}" &
    @bun scripts/organize-imports.ts &
    @bun scripts/rg-indexer.ts --rebuild &
    @wait
    @echo "✅ Formatting complete! Search index rebuilt."

# 📚 Docs - serve auto-updated markdown docs
docs:
    @echo "📚 Building and serving documentation..."
    @just docs-build
    @just docs-serve

# 📚 Build docs with live code snippets
docs-build:
    @echo "📚 Building documentation with live code snippets..."
    @bun scripts/docs-generator.ts
    @echo "✅ Documentation built!"

# 📚 Serve docs with hot-reload
docs-serve:
    @echo "📚 Serving docs at http://localhost:3001"
    @cd docs && npx vitepress dev --port 3001

# 🔍 Rebuild search index only
search-index:
    @echo "🔍 Rebuilding ripgrep search index..."
    @bun scripts/rg-indexer.ts --rebuild
    @echo "✅ Search index rebuilt: .rgindex.json"

# 🧪 Test with coverage
test:
    @echo "🧪 Running tests with coverage..."
    @bun test --coverage

# 🧪 Test in watch mode
test-watch:
    @echo "🧪 Running tests in watch mode..."
    @bun test --watch

# ✅ Type check
type-check:
    @echo "✅ Running TypeScript type check..."
    @bun run type-check

# 🔒 Security scan
security:
    @echo "🔒 Running security scan..."
    @sg scan src/

# 🚢 Deploy to production
deploy:
    @echo "🚢 Deploying to production..."
    @just fmt --check
    @just test
    @just type-check
    @wrangler deploy

# 🔍 Check formatting (CI)
fmt-check:
    @echo "🔍 Checking formatting..."
    @prettier --check "**/*.{ts,json,md}"
    @bun scripts/rg-indexer.ts --check

# 🔍 Check docs freshness (CI)
docs-check:
    @echo "🔍 Checking documentation freshness..."
    @just docs-build
    @git diff --exit-code docs/api || (echo "❌ Docs out of date. Run 'just docs' locally" && exit 1)

# 🔍 Check search index freshness (CI)
index-check:
    @echo "🔍 Checking search index freshness..."
    @bun scripts/rg-indexer.ts --rebuild
    @git diff --exit-code .rgindex.json || (echo "❌ Search index out of date. Run 'just fmt' locally" && exit 1)

# 🧹 Clean build artifacts
clean:
    @echo "🧹 Cleaning build artifacts..."
    @rm -rf dist/ .wrangler/ coverage/ .rgindex.json .rgmeta.json
    @echo "✅ Clean complete!"

# 🔄 Full CI pipeline
ci:
    @echo "🔄 Running full CI pipeline..."
    @just fmt-check
    @just index-check
    @just docs-check
    @just type-check
    @just test
    @just security
    @echo "✅ CI pipeline passed!"

# 📊 Data flow visualization
dataflow:
    @echo "📊 Generating data flow diagram..."
    @bun scripts/dataflow.ts
    @echo "✅ View at: http://localhost:8080/floor-control.html#dataflow"

# 🏥 Health check
health:
    @echo "🏥 Running health checks..."
    @curl -s http://localhost:8787/health | jq '.'

# 📦 Install dependencies
install:
    @echo "📦 Installing dependencies..."
    @bun install --frozen-lockfile
    @echo "✅ Dependencies installed!"

# 🔧 Setup development environment
setup:
    @echo "🔧 Setting up development environment..."
    @just install
    @just search-index
    @just docs-build
    @echo "✅ Setup complete! Run 'just dev' to start."
