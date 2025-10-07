#!/bin/bash

# Production Environment Setup Script
# One-time setup of all required Cloudflare resources

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
ACCOUNT_ID=$(wrangler whoami 2>/dev/null | grep "Account ID" | awk '{print $3}' || echo "")

check_authentication() {
    log_info "Checking Cloudflare authentication..."
    
    if [ -z "$ACCOUNT_ID" ]; then
        log_error "Not authenticated with Cloudflare. Please run: wrangler login"
        exit 1
    fi
    
    log_success "Authenticated with account: $ACCOUNT_ID"
}

create_database() {
    log_info "Creating production D1 database..."
    
    if ! wrangler d1 list | grep -q "betting-analytics"; then
        wrangler d1 create betting-analytics
        log_success "Production D1 database created"
    else
        log_warning "Production D1 database already exists"
    fi
}

create_queues() {
    log_info "Creating production queues..."
    
    local queues=("line-ingress" "steam-webhook" "line-ingress-dlq" "steam-webhook-dlq")
    
    for queue in "${queues[@]}"; do
        if ! wrangler queues list | grep -q "$queue"; then
            log_info "Creating queue: $queue"
            wrangler queues create "$queue" || log_warning "Queue $queue may already exist"
            log_success "Queue $queue created"
        else
            log_warning "Queue $queue already exists"
        fi
    done
}

setup_secrets() {
    log_info "Setting up production secrets..."
    log_warning "You will be prompted to enter each secret value"
    echo ""
    
    local secrets=(
        "SPORTSBET_IO_API_KEY:SportsbetIO API Key"
        "PINNACLE_API_KEY:Pinnacle API Key"
        "ODDS_API_KEY:Odds API Key"
        "BET_MGM_API_KEY:BetMGM API Key"
        "CLONE_BOTANICA_API_KEY:Clone Botanica API Key"
    )
    
    for secret_info in "${secrets[@]}"; do
        IFS=':' read -r secret_name secret_desc <<< "$secret_info"
        log_info "Setting up: $secret_desc"
        echo "Enter value for $secret_name (or press Enter to skip):"
        read -s value
        echo ""
        if [ -n "$value" ]; then
            echo "$value" | wrangler secret put "$secret_name" --env=production
            log_success "Secret $secret_name configured"
        else
            log_warning "Skipped $secret_name"
        fi
    done
}

display_next_steps() {
    echo ""
    log_success "========================================="
    log_success "🎉 Production environment setup complete!"
    log_success "========================================="
    echo ""
    log_info "📋 Next steps:"
    echo "  1. Update wrangler.toml with your database ID"
    echo "  2. Review and update environment variables"
    echo "  3. Test deployment with: ./deploy/staging-deploy.sh"
    echo "  4. Deploy to production with: ./deploy/production-deploy.sh"
    echo ""
    log_info "📊 View your resources:"
    echo "  • Dashboard: https://dash.cloudflare.com"
    echo "  • D1 Databases: wrangler d1 list"
    echo "  • Queues: wrangler queues list"
    echo ""
}

main() {
    log_info "========================================="
    log_info "Setting up production environment"
    log_info "Project: Betting Brain v3"
    log_info "========================================="
    echo ""
    
    check_authentication
    create_database
    create_queues
    setup_secrets
    display_next_steps
}

main "$@"

