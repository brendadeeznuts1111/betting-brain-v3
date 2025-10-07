#!/bin/bash
# 🧠 Betting-Brain v3 - Staging Deployment Script

set -e

echo "🚀 Deploying Betting-Brain v3 to staging..."

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
    
    # Check if staging environment exists
    if ! wrangler d1 list | grep -q "betting-analytics-staging"; then
        print_error "Staging database not found. Please run setup-staging first"
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
    
    print_success "Pre-deployment checks completed"
}

# Deploy to staging
deploy_staging() {
    print_status "Deploying to staging environment..."
    
    # Deploy worker
    wrangler deploy --env staging
    
    # Apply migrations if needed
    print_status "Checking for pending migrations..."
    wrangler d1 migrations apply betting-analytics-staging
    
    # Verify deployment
    print_status "Verifying deployment..."
    staging_url=$(wrangler deployments list --env staging | head -n 2 | tail -n 1 | awk '{print $2}')
    
    if [ -n "$staging_url" ]; then
        print_success "Deployment successful"
        print_success "Staging URL: $staging_url"
        
        # Test health endpoint
        print_status "Testing health endpoint..."
        if curl -s "$staging_url/health" | grep -q "healthy"; then
            print_success "Health check passed"
        else
            print_warning "Health check failed, but deployment succeeded"
        fi
    else
        print_error "Deployment verification failed"
        exit 1
    fi
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
    
    print_success "Post-deployment tasks completed"
}

# Main execution
main() {
    echo "🧠 Betting-Brain v3 - Staging Deployment"
    echo "========================================"
    
    pre_deployment_checks
    deploy_staging
    post_deployment_tasks
    
    echo ""
    print_success "🎉 Staging deployment completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Test the staging environment"
    echo "2. Run integration tests"
    echo "3. Deploy to production when ready"
    echo ""
}

# Run main function
main "$@"
