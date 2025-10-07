#!/bin/bash

# Staging Deployment Script for Betting Brain v3
# Quick deployment to staging for testing

set -euo pipefail

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_info "🚀 Deploying to staging environment..."

# Run tests first
log_info "Running quick tests..."
npm test || log_warning "Some tests failed, proceeding anyway for staging"

# Apply migrations
log_info "Applying database migrations..."
npx wrangler d1 migrations apply betting-analytics --local || log_warning "Migration warning (non-blocking for staging)"

# Deploy to staging
log_info "Deploying worker..."
npx wrangler deploy --env=staging

log_success "✅ Staging deployment completed!"
log_info "Test your changes at: https://betting-brain-v3-staging.workers.dev"
log_info "Or run health check: curl https://betting-brain-v3-staging.workers.dev/health"

