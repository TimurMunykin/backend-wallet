#!/bin/bash

# Let's Encrypt SSL Certificate Setup Script for Backend-Wallet
# This script sets up SSL certificates using Let's Encrypt for your domain

set -e

# Configuration
DOMAIN="your-domain.com"
EMAIL="your-email@example.com"  # Change this to your email
STAGING=1  # Set to 1 for testing, 0 for production

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        print_warning "This script is running as root. This is not recommended."
        print_warning "Consider running as a non-root user with docker permissions."
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Validate configuration
validate_config() {
    print_status "Validating configuration..."
    
    if [[ "$DOMAIN" == "your-domain.com" ]]; then
        print_error "Please set your actual domain in the DOMAIN variable"
        exit 1
    fi
    
    if [[ "$EMAIL" == "your-email@example.com" ]]; then
        print_error "Please set your actual email in the EMAIL variable"
        exit 1
    fi
    
    # Check if domain resolves to this server
    DOMAIN_IP=$(dig +short $DOMAIN)
    SERVER_IP=$(curl -s ifconfig.me)
    
    if [[ "$DOMAIN_IP" != "$SERVER_IP" ]]; then
        print_warning "Domain $DOMAIN does not resolve to this server ($SERVER_IP)"
        print_warning "Current domain IP: $DOMAIN_IP"
        print_warning "Make sure your domain's A record points to this server"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    print_success "Configuration validated"
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    mkdir -p nginx/sites-enabled
    mkdir -p nginx/ssl
    mkdir -p certbot/conf
    mkdir -p certbot/www
    
    print_success "Directories created"
}

# Update nginx configuration with actual domain
update_nginx_config() {
    print_status "Updating nginx configuration with domain: $DOMAIN"
    
    # Update the nginx site configuration
    sed -i "s/your-domain.com/$DOMAIN/g" nginx/sites-enabled/backend-wallet.conf
    
    print_success "Nginx configuration updated"
}

# Download recommended TLS parameters
download_tls_params() {
    print_status "Downloading recommended TLS parameters..."
    
    if [ ! -e "nginx/ssl/options-ssl-nginx.conf" ] || [ ! -e "nginx/ssl/ssl-dhparams.pem" ]; then
        print_status "Downloading recommended TLS parameters..."
        curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > nginx/ssl/options-ssl-nginx.conf
        curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > nginx/ssl/ssl-dhparams.pem
    fi
    
    print_success "TLS parameters ready"
}

# Create temporary nginx config for initial setup
create_temp_nginx_config() {
    print_status "Creating temporary nginx configuration for initial setup..."
    
    cat > nginx/sites-enabled/temp-backend-wallet.conf << EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Temporary: serve a simple message
    location / {
        return 200 'SSL setup in progress...';
        add_header Content-Type text/plain;
    }
}
EOF
    
    print_success "Temporary nginx configuration created"
}

# Start nginx with temporary config
start_nginx_temp() {
    print_status "Starting nginx with temporary configuration..."
    
    # Backup the main config
    if [ -f "nginx/sites-enabled/backend-wallet.conf" ]; then
        mv nginx/sites-enabled/backend-wallet.conf nginx/sites-enabled/backend-wallet.conf.backup
    fi
    
    # Start nginx
    docker compose up -d nginx
    
    # Wait for nginx to start
    sleep 5
    
    print_success "Nginx started with temporary configuration"
}

# Request SSL certificate
request_ssl_certificate() {
    print_status "Requesting SSL certificate for $DOMAIN..."
    
    # Determine if we should use staging
    if [ $STAGING != "0" ]; then
        staging_arg="--staging"
        print_warning "Using Let's Encrypt staging environment (for testing)"
    else
        staging_arg=""
        print_status "Using Let's Encrypt production environment"
    fi
    
    # Request the certificate
    docker compose run --rm certbot \
        certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        $staging_arg \
        -d $DOMAIN \
        -d www.$DOMAIN
    
    if [ $? -eq 0 ]; then
        print_success "SSL certificate obtained successfully!"
    else
        print_error "Failed to obtain SSL certificate"
        exit 1
    fi
}

# Restore final nginx configuration
restore_nginx_config() {
    print_status "Restoring final nginx configuration..."
    
    # Remove temporary config
    rm -f nginx/sites-enabled/temp-backend-wallet.conf
    
    # Restore main config
    if [ -f "nginx/sites-enabled/backend-wallet.conf.backup" ]; then
        mv nginx/sites-enabled/backend-wallet.conf.backup nginx/sites-enabled/backend-wallet.conf
    fi
    
    # Reload nginx
    docker compose exec nginx nginx -s reload
    
    print_success "Final nginx configuration restored"
}

# Test SSL certificate
test_ssl() {
    print_status "Testing SSL certificate..."
    
    # Wait a moment for nginx to reload
    sleep 3
    
    # Test HTTPS connection
    if curl -Is https://$DOMAIN | head -n 1 | grep -q "200 OK"; then
        print_success "SSL certificate is working correctly!"
        print_success "Your site is now accessible at: https://$DOMAIN"
    else
        print_warning "SSL test didn't return 200 OK, but certificate might still be working"
        print_status "You can manually test at: https://$DOMAIN"
    fi
}

# Main execution
main() {
    echo -e "${BLUE}"
    echo "=================================================="
    echo "   Backend-Wallet SSL Setup with Let's Encrypt"
    echo "=================================================="
    echo -e "${NC}"
    
    print_status "Starting SSL setup for domain: $DOMAIN"
    print_status "Email: $EMAIL"
    print_status "Staging mode: $([ $STAGING != "0" ] && echo "ON (testing)" || echo "OFF (production)")"
    echo
    
    check_root
    validate_config
    create_directories
    download_tls_params
    update_nginx_config
    create_temp_nginx_config
    start_nginx_temp
    request_ssl_certificate
    restore_nginx_config
    test_ssl
    
    echo
    print_success "SSL setup completed successfully!"
    echo
    echo -e "${GREEN}Next steps:${NC}"
    echo "1. Update your environment variables to use HTTPS URLs"
    echo "2. Test your application at https://$DOMAIN"
    echo "3. If using staging, re-run with STAGING=0 for production certificates"
    echo "4. Set up automatic certificate renewal (already configured in docker-compose.yml)"
    echo
    echo -e "${YELLOW}Important notes:${NC}"
    echo "- Certificates will auto-renew every 12 hours via the certbot container"
    echo "- Nginx will reload every 6 hours to pick up renewed certificates"
    echo "- Monitor the logs: docker-compose logs nginx certbot"
}

# Run main function
main "$@" 