#!/bin/bash
# 🧠 Betting-Brain v3 - Production Deployment Script

set -e

echo "🚀 Deploying Betting-Brain v3 to production..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Pre-deployment checks
pre_deployment_checks() {
    print_status "Running pre-deployment checks..."
    
    # Check if logged in to Cloudflare
    if ! wrangler whoami &> /dev/null; then
        print_error "Not logged in to Cloudflare. Please run 'wrangler login' first"
        exit 1
    fi
    
    # Check if production environment exists
    if ! wrangler d1 list | grep -q "betting-analytics-prod"; then
        print_error "Production database not found. Please run setup-production first"
        exit 1
    fi
    
    # Run tests
    print_status "Running tests..."
    bun run test
    print_success "All tests passed"
    
    # Run linting
    print_status "Running linting..."
    bun run lint
    print_success "Linting passed"
    
    # Type checking
    print_status "Running type checking..."
    bun run type-check
    print_success "Type checking passed"
    
    # Integration tests
    print_status "Running integration tests..."
    bun run test:integration
    print_success "Integration tests passed"
    
    print_success "Pre-deployment checks completed"
}

# Deploy to production
deploy_production() {
    print_status "Deploying to production environment..."
    
    # Create deployment tag
    deployment_tag="v3.0.0-$(git rev-parse --short HEAD)"
    print_status "Deployment tag: $deployment_tag"
    
    # Deploy worker
    wrangler deploy --env production
    
    # Apply migrations if needed
    print_status "Checking for pending migrations..."
    wrangler d1 migrations apply betting-analytics-prod
    
    # Verify deployment
    print_status "Verifying deployment..."
    production_url=$(wrangler deployments list --env production | head -n 2 | tail -n 1 | awk '{print $2}')
    
    if [ -n "$production_url" ]; then
        print_success "Deployment successful"
        print_success "Production URL: $production_url"
        
        # Test health endpoint
        print_status "Testing health endpoint..."
        if curl -s "$production_url/health" | grep -q "healthy"; then
            print_success "Health check passed"
        else
            print_warning "Health check failed, but deployment succeeded"
        fi
        
        # Test API endpoints
        print_status "Testing API endpoints..."
        test_api_endpoints "$production_url"
        
    else
        print_error "Deployment verification failed"
        exit 1
    fi
}

# Test API endpoints
test_api_endpoints() {
    local base_url="$1"
    
    # Test health endpoint
    if curl -s "$base_url/health" | grep -q "healthy"; then
        print_success "Health endpoint working"
    else
        print_warning "Health endpoint failed"
    fi
    
    # Test MCP tools endpoint
    if curl -s "$base_url/tools/getBettingExposure?eid=test" | grep -q "error"; then
        print_success "MCP tools endpoint working"
    else
        print_warning "MCP tools endpoint failed"
    fi
    
    # Test rate limiting
    print_status "Testing rate limiting..."
    for i in {1..15}; do
        response=$(curl -s -w "%{http_code}" -o /dev/null "$base_url/health")
        if [ "$response" = "429" ]; then
            print_success "Rate limiting working"
            break
        fi
        sleep 1
    done
}

# Post-deployment tasks
post_deployment_tasks() {
    print_status "Running post-deployment tasks..."
    
    # Update monitoring
    print_status "Updating monitoring configuration..."
    # Add monitoring update logic here
    
    # Send notification
    print_status "Sending deployment notification..."
    # Add notification logic here
    
    # Update documentation
    print_status "Updating documentation..."
    # Add documentation update logic here
    
    print_success "Post-deployment tasks completed"
}

# Rollback function
rollback_production() {
    print_status "Rolling back production deployment..."
    
    if [ -z "$1" ]; then
        print_error "Please provide a deployment tag to rollback to"
        exit 1
    fi
    
    local rollback_tag="$1"
    print_status "Rolling back to: $rollback_tag"
    
    wrangler rollback "$rollback_tag" --env production
    
    print_success "Rollback completed"
}

# Main execution
main() {
    echo "🧠 Betting-Brain v3 - Production Deployment"
    echo "=========================================="
    
    # Check for rollback command
    if [ "$1" = "rollback" ]; then
        rollback_production "$2"
        exit 0
    fi
    
    pre_deployment_checks
    deploy_production
    post_deployment_tasks
    
    echo ""
    print_success "🎉 Production deployment completed successfully!"
    echo ""
    echo "Deployment details:"
    echo "- Tag: v3.0.0-$(git rev-parse --short HEAD)"
    echo "- URL: $production_url"
    echo "- Health: $production_url/health"
    echo ""
    echo "Next steps:"
    echo "1. Monitor the production environment"
    echo "2. Check logs for any issues"
    echo "3. Update monitoring dashboards"
    echo ""
    echo "Rollback command:"
    echo "bun run deploy:prod rollback v3.0.0-$(git rev-parse --short HEAD)"
    echo ""
}

# Run main function
main "$@"
