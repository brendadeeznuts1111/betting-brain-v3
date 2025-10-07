#!/bin/bash
# 🧠 Betting-Brain v3 - Environment Setup Script

set -e

echo "🚀 Setting up Betting-Brain v3 environments..."

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

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js >= 18.0.0"
        exit 1
    fi
    
    # Check Bun
    if ! command -v bun &> /dev/null; then
        print_error "Bun is not installed. Please install Bun >= 1.2.0"
        exit 1
    fi
    
    # Check Wrangler
    if ! command -v wrangler &> /dev/null; then
        print_error "Wrangler is not installed. Please install Wrangler >= 3.20.0"
        exit 1
    fi
    
    print_success "All prerequisites are installed"
}

# Setup local environment
setup_local() {
    print_status "Setting up local environment..."
    
    # Copy environment template
    if [ ! -f .env.local ]; then
        cp env.example .env.local
        print_success "Created .env.local from template"
    else
        print_warning ".env.local already exists, skipping..."
    fi
    
    # Install dependencies
    bun install
    
    # Setup local database
    wrangler d1 create betting-analytics-local
    print_success "Created local D1 database"
    
    # Apply migrations
    wrangler d1 migrations apply betting-analytics-local --local
    print_success "Applied database migrations"
    
    print_success "Local environment setup complete"
}

# Setup staging environment
setup_staging() {
    print_status "Setting up staging environment..."
    
    # Check if logged in to Cloudflare
    if ! wrangler whoami &> /dev/null; then
        print_error "Not logged in to Cloudflare. Please run 'wrangler login' first"
        exit 1
    fi
    
    # Create staging database
    wrangler d1 create betting-analytics-staging
    print_success "Created staging D1 database"
    
    # Apply migrations
    wrangler d1 migrations apply betting-analytics-staging
    print_success "Applied database migrations"
    
    # Create KV namespace
    wrangler kv:namespace create "CACHE" --env staging
    print_success "Created staging KV namespace"
    
    # Create R2 bucket
    wrangler r2 bucket create betting-brain-staging
    print_success "Created staging R2 bucket"
    
    print_success "Staging environment setup complete"
}

# Setup production environment
setup_production() {
    print_status "Setting up production environment..."
    
    # Check if logged in to Cloudflare
    if ! wrangler whoami &> /dev/null; then
        print_error "Not logged in to Cloudflare. Please run 'wrangler login' first"
        exit 1
    fi
    
    # Create production database
    wrangler d1 create betting-analytics-prod
    print_success "Created production D1 database"
    
    # Apply migrations
    wrangler d1 migrations apply betting-analytics-prod
    print_success "Applied database migrations"
    
    # Create KV namespace
    wrangler kv:namespace create "CACHE" --env production
    print_success "Created production KV namespace"
    
    # Create R2 bucket
    wrangler r2 bucket create betting-brain-prod
    print_success "Created production R2 bucket"
    
    print_success "Production environment setup complete"
}

# Deploy to staging
deploy_staging() {
    print_status "Deploying to staging..."
    
    # Run tests
    bun run test
    
    # Deploy
    wrangler deploy --env staging
    
    print_success "Staging deployment complete"
}

# Deploy to production
deploy_production() {
    print_status "Deploying to production..."
    
    # Run tests
    bun run test
    
    # Deploy
    wrangler deploy --env production
    
    print_success "Production deployment complete"
}

# Main menu
show_menu() {
    echo ""
    echo "🧠 Betting-Brain v3 - Environment Setup"
    echo "======================================"
    echo "1. Setup local environment"
    echo "2. Setup staging environment"
    echo "3. Setup production environment"
    echo "4. Deploy to staging"
    echo "5. Deploy to production"
    echo "6. Setup all environments"
    echo "7. Exit"
    echo ""
}

# Main script
main() {
    check_prerequisites
    
    while true; do
        show_menu
        read -p "Select an option (1-7): " choice
        
        case $choice in
            1)
                setup_local
                ;;
            2)
                setup_staging
                ;;
            3)
                setup_production
                ;;
            4)
                deploy_staging
                ;;
            5)
                deploy_production
                ;;
            6)
                setup_local
                setup_staging
                setup_production
                print_success "All environments setup complete"
                ;;
            7)
                print_success "Goodbye!"
                exit 0
                ;;
            *)
                print_error "Invalid option. Please select 1-7."
                ;;
        esac
        
        echo ""
        read -p "Press Enter to continue..."
    done
}

# Run main function
main "$@"
