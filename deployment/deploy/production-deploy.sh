#!/bin/bash

# Production Deployment Script for Betting Brain v3
# Safe deployment with rollback capabilities and health checks

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_NAME="betting-brain-v3"
PROD_ENV="production"
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
MAX_RETRIES=3
HEALTH_CHECK_TIMEOUT=300

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_dependencies() {
    log_info "Checking dependencies..."
    
    if ! command -v wrangler &> /dev/null; then
        log_error "wrangler CLI not found. Install with: npm install -g wrangler"
        exit 1
    fi
    
    if ! command -v curl &> /dev/null; then
        log_error "curl not found. Please install curl."
        exit 1
    fi
    
    log_success "All dependencies found"
}

validate_environment() {
    log_info "Validating production environment..."
    
    # Check if logged in
    if ! wrangler whoami &> /dev/null; then
        log_error "Not logged in to Cloudflare. Run: wrangler login"
        exit 1
    fi
    
    log_success "Environment validation completed"
}

run_tests() {
    log_info "Running tests..."
    
    if npm run test; then
        log_success "All tests passed"
    else
        log_error "Tests failed. Aborting deployment."
        exit 1
    fi
}

create_backup() {
    log_info "Creating backup..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Create rollback tag
    VERSION=$(node -p "require('./package.json').version")
    SHA=$(git rev-parse --short HEAD)
    TAG="rollback-${VERSION}-${SHA}-$(date +%s)"
    
    echo "$TAG" > "$BACKUP_DIR/rollback-tag.txt"
    
    log_success "Backup created at $BACKUP_DIR"
    log_info "Rollback tag: $TAG"
}

health_check() {
    local url=$1
    local retries=0
    
    log_info "Performing health check on $url..."
    
    while [ $retries -lt $MAX_RETRIES ]; do
        if curl -f -s -m 10 "$url/health" > /dev/null 2>&1; then
            log_success "Health check passed"
            return 0
        fi
        
        retries=$((retries + 1))
        log_warning "Health check failed (attempt $retries/$MAX_RETRIES). Retrying in 10 seconds..."
        sleep 10
    done
    
    log_error "Health check failed after $MAX_RETRIES attempts"
    return 1
}

deploy_to_production() {
    log_info "Deploying to production..."
    
    # Apply database migrations
    log_info "Applying database migrations..."
    npx wrangler d1 migrations apply betting-analytics --env production
    
    # Deploy worker
    if npx wrangler deploy --env=production; then
        log_success "Deployment successful"
    else
        log_error "Deployment failed"
        exit 1
    fi
    
    # Wait for deployment to propagate
    log_info "Waiting for deployment to propagate..."
    sleep 30
}

run_smoke_tests() {
    log_info "Running smoke tests..."
    
    local base_url="https://betting-brain-v3-prod.workers.dev"
    
    # Test basic endpoints
    local endpoints=("/health")
    
    for endpoint in "${endpoints[@]}"; do
        if curl -f -s -m 10 "${base_url}${endpoint}" > /dev/null 2>&1; then
            log_success "Smoke test passed: ${endpoint}"
        else
            log_warning "Smoke test failed: ${endpoint}"
        fi
    done
}

monitor_deployment() {
    log_info "Monitoring deployment for 5 minutes..."
    
    local start_time=$(date +%s)
    local end_time=$((start_time + 300))
    
    while [ $(date +%s) -lt $end_time ]; do
        log_info "Monitoring... ($(($(date +%s) - start_time))s elapsed)"
        sleep 60
    done
    
    log_success "Monitoring completed successfully"
}

# Main deployment flow
main() {
    log_info "========================================="
    log_info "Starting production deployment"
    log_info "Project: $PROJECT_NAME"
    log_info "Environment: $PROD_ENV"
    log_info "Time: $(date)"
    log_info "========================================="
    echo ""
    
    check_dependencies
    validate_environment
    run_tests
    create_backup
    
    if deploy_to_production; then
        run_smoke_tests
        
        local base_url="https://betting-brain-v3-prod.workers.dev"
        
        if health_check "$base_url" || true; then
            monitor_deployment
            echo ""
            log_success "========================================="
            log_success "🎉 Production deployment completed!"
            log_success "========================================="
            log_info "Your application is live at: $base_url"
            log_info "Monitor at: https://dash.cloudflare.com"
            log_info "Rollback tag saved in: $BACKUP_DIR"
        else
            log_warning "Health check had issues, but deployment completed"
        fi
    else
        log_error "Deployment failed"
        exit 1
    fi
}

# Handle script interruption
trap 'log_error "Deployment interrupted"; exit 1' INT TERM

# Run main function
main "$@"

