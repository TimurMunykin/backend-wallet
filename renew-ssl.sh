#!/bin/bash

# SSL Certificate Renewal Script for Backend-Wallet
# This script manually renews SSL certificates and reloads nginx

set -e

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

# Check if docker compose is available
check_docker_compose() {
    if ! command -v docker &> /dev/null; then
        print_error "docker could not be found"
        print_error "Please install docker"
        exit 1
    fi
    
    if ! docker compose version &> /dev/null; then
        print_error "docker compose could not be found"
        print_error "Please make sure docker compose is available"
        exit 1
    fi
}

# Check if containers are running
check_containers() {
    print_status "Checking if containers are running..."
    
    if ! docker compose ps | grep -q "backend-wallet-nginx.*Up"; then
        print_error "Nginx container is not running"
        print_error "Please start the containers first: docker compose up -d"
        exit 1
    fi
    
    if ! docker compose ps | grep -q "backend-wallet-certbot.*Up"; then
        print_error "Certbot container is not running" 
        print_error "Please start the containers first: docker compose up -d"
        exit 1
    fi
    
    print_success "Containers are running"
}

# Test certificate renewal (dry run)
test_renewal() {
    print_status "Testing certificate renewal (dry run)..."
    
    docker compose exec certbot certbot renew --dry-run
    
    if [ $? -eq 0 ]; then
        print_success "Dry run completed successfully"
    else
        print_error "Dry run failed"
        exit 1
    fi
}

# Renew certificates
renew_certificates() {
    print_status "Renewing SSL certificates..."
    
    docker compose exec certbot certbot renew
    
    if [ $? -eq 0 ]; then
        print_success "Certificates renewed successfully"
    else
        print_error "Certificate renewal failed"
        exit 1
    fi
}

# Reload nginx
reload_nginx() {
    print_status "Reloading nginx configuration..."
    
    docker compose exec nginx nginx -s reload
    
    if [ $? -eq 0 ]; then
        print_success "Nginx reloaded successfully"
    else
        print_warning "Nginx reload failed, but certificates may still be renewed"
        print_status "Try restarting nginx: docker compose restart nginx"
    fi
}

# Check certificate expiry dates
check_expiry() {
    print_status "Checking certificate expiry dates..."
    
    docker compose exec certbot certbot certificates
}

# Display certificate status
show_status() {
    print_status "Current certificate status:"
    echo
    
    # Show nginx status
    print_status "Nginx status:"
    docker compose ps nginx
    echo
    
    # Show certbot status  
    print_status "Certbot status:"
    docker compose ps certbot
    echo
    
    # Show certificate info
    check_expiry
}

# Show logs
show_logs() {
    print_status "Recent SSL-related logs:"
    echo
    
    print_status "Nginx logs (last 20 lines):"
    docker compose logs --tail=20 nginx
    echo
    
    print_status "Certbot logs (last 20 lines):"
    docker compose logs --tail=20 certbot
}

# Help function
show_help() {
    echo -e "${BLUE}SSL Certificate Renewal Script${NC}"
    echo
    echo "Usage: $0 [OPTION]"
    echo
    echo "Options:"
    echo "  renew      Renew SSL certificates and reload nginx"
    echo "  test       Test certificate renewal (dry run)"
    echo "  status     Show certificate and container status"
    echo "  logs       Show recent SSL-related logs"
    echo "  help       Show this help message"
    echo
    echo "Examples:"
    echo "  $0 renew              # Renew certificates"
    echo "  $0 test               # Test renewal without actually renewing"
    echo "  $0 status             # Check current status"
    echo "  $0 logs               # View recent logs"
}

# Main function
main() {
    case "${1:-renew}" in
        "renew")
            echo -e "${BLUE}"
            echo "=================================="
            echo "   SSL Certificate Renewal"
            echo "=================================="
            echo -e "${NC}"
            
            check_docker_compose
            check_containers
            renew_certificates
            reload_nginx
            
            echo
            print_success "SSL certificate renewal completed!"
            print_status "Your certificates have been renewed and nginx has been reloaded"
            ;;
            
        "test")
            echo -e "${BLUE}"
            echo "=================================="
            echo "   SSL Certificate Test Renewal"
            echo "=================================="
            echo -e "${NC}"
            
            check_docker_compose
            check_containers
            test_renewal
            
            echo
            print_success "SSL certificate test completed!"
            ;;
            
        "status")
            echo -e "${BLUE}"
            echo "=================================="
            echo "   SSL Certificate Status"
            echo "=================================="
            echo -e "${NC}"
            
            check_docker_compose
            show_status
            ;;
            
        "logs")
            echo -e "${BLUE}"
            echo "=================================="
            echo "   SSL Logs"
            echo "=================================="
            echo -e "${NC}"
            
            check_docker_compose
            show_logs
            ;;
            
        "help"|"-h"|"--help")
            show_help
            ;;
            
        *)
            print_error "Unknown option: $1"
            echo
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@" 