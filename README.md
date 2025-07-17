# Personal Finance Management System

```
ngrok http 300
```
{ngrok_adress}/mcp/sse - adress for claude web integration


A comprehensive full-stack TypeScript application for personal finance management with advanced daily spending calculations, goal tracking, and financial analytics.

## Architecture

- **Frontend**: React 18 + TypeScript + Material-UI
- **Backend**: Express.js + TypeScript + PostgreSQL  
- **Deployment**: Docker & Docker Compose
- **Security**: HTTPS with Let's Encrypt SSL certificates
- **Reverse Proxy**: Nginx with automatic SSL renewal

## Features

### Frontend Features
- 🎨 **Modern UI** - Clean Material Design interface
- 📱 **Responsive Design** - Works on desktop and mobile
- 🔐 **Authentication** - Login and registration
- 📊 **Dashboard** - Financial overview and key metrics
- 💰 **Account Management** - Create and manage accounts
- 📈 **Analytics Visualization** - Charts and financial insights
- 🎯 **Goal Tracking** - Visual progress tracking

### Backend Features
- 🔐 **JWT Authentication** - Secure user authentication and authorization
- 💰 **Account Management** - Multiple accounts with balance tracking
- 📊 **Transaction Management** - Income/expense tracking with categorization
- 🔄 **Recurring Payments** - Automated recurring income/expense tracking
- 💼 **Salary Management** - Flexible salary tracking with date ranges
- 🎯 **Goals System** - Hierarchical goal structure with progress tracking
- 📈 **Daily Spending Calculator** - Advanced configurable spending limits
- 📸 **Snapshots** - Historical balance and transaction summaries
- 📊 **Analytics & Reporting** - Comprehensive financial insights

### Security & Infrastructure
- 🔒 **HTTPS/SSL** - Automatic SSL certificates with Let's Encrypt
- 🛡️ **Security Headers** - XSS, CSRF, clickjacking protection
- ⚡ **Rate Limiting** - API and auth endpoint protection
- 🔄 **Auto SSL Renewal** - Certificates automatically renew every 3 months
- 🚀 **Production Ready** - Optimized nginx reverse proxy
- 📊 **Monitoring** - Comprehensive logging and health checks

### Key Highlights
- **Daily Spending Engine**: Highly configurable calculation system considering goals, recurring payments, and salary expectations
- **Flexible Configuration**: Multiple calculation scenarios and period types
- **Caching System**: Optimized performance for complex calculations
- **Comprehensive API**: RESTful endpoints with full CRUD operations
- **Type Safety**: Full TypeScript implementation with strict typing
- **Database Optimization**: Efficient queries with TypeORM

## Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **UI Library**: Material-UI (MUI)
- **Routing**: React Router
- **HTTP Client**: Axios
- **Build Tool**: Vite
- **Charts**: MUI X Charts

### Backend
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT + OAuth 2.1
- **Validation**: Zod
- **Documentation**: Swagger/OpenAPI 3.0
- **Testing**: Jest
- **Containerization**: Docker & Docker Compose
- **Security**: Helmet, CORS, Rate Limiting

### Infrastructure
- **Web Server**: Nginx (reverse proxy)
- **SSL/TLS**: Let's Encrypt certificates
- **Container Orchestration**: Docker Compose
- **Automatic Renewal**: Certbot
- **Monitoring**: Built-in health checks

## Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose (recommended)
- Domain name (for SSL setup)
- PostgreSQL 15+ (if not using Docker)
- Redis (optional, for caching)

### Option 1: Production Deployment with SSL

```bash
# Clone repository
git clone <repository-url>
cd backend-wallet

# Set up environment variables
cp env.example .env
nano .env  # Edit with your configuration

# Configure SSL (replace with your domain)
nano init-letsencrypt.sh
# Set DOMAIN="your-domain.com"
# Set EMAIL="your-email@example.com"

# Initialize SSL certificates
chmod +x init-letsencrypt.sh renew-ssl.sh
./init-letsencrypt.sh

# Start production environment
docker-compose up -d

# Access the applications
# Frontend: https://your-domain.com
# Backend API: https://your-domain.com/api
# API Documentation: https://your-domain.com/api-docs
```

### Option 2: Docker Development (Recommended)

```bash
# Clone repository
git clone <repository-url>
cd backend-wallet

# Start development environment
docker-compose -f docker-compose.dev.yml up --build

# Access the applications
# Frontend: http://localhost:3001
# Backend API: http://localhost:3000
# API Documentation: http://localhost:3000/api-docs
```

### Option 3: Local Development

1. **Clone and setup backend**
   ```bash
   git clone <repository-url>
   cd backend-wallet
   
   # Install backend dependencies
   npm install
   
   # Setup environment
   cp env.example .env
   # Edit .env with your configuration
   
   # Start database (using Docker)
   docker-compose up -d db redis
   
   # Run migrations
   npm run db:migrate
   
   # Start backend
   npm run dev
   ```

2. **Setup frontend**
   ```bash
   # In a new terminal
   cd frontend
   
   # Install frontend dependencies
   npm install
   
   # Start frontend development server
   npm run dev
   ```

3. **Access applications**
   - Frontend: http://localhost:3001
   - Backend API: http://localhost:3000
   - API Documentation: http://localhost:3000/api-docs

## SSL/HTTPS Setup

This project includes complete SSL setup with Let's Encrypt for production use.

### Quick SSL Setup
```bash
# 1. Configure your domain
nano init-letsencrypt.sh
# Set DOMAIN and EMAIL variables

# 2. Run SSL initialization
./init-letsencrypt.sh

# 3. Start production stack
docker-compose up -d
```

### SSL Management Commands
```bash
# Initialize SSL certificates
npm run ssl:init

# Renew certificates manually
npm run ssl:renew

# Test certificate renewal
npm run ssl:test

# View SSL logs
npm run ssl:logs

# Check certificate status
./renew-ssl.sh status
```

### Features
- ✅ **Automatic HTTPS** with HTTP to HTTPS redirect
- ✅ **Auto-renewal** every 3 months
- ✅ **A+ SSL rating** with modern TLS configuration
- ✅ **Security headers** (HSTS, CSP, XSS protection)
- ✅ **Rate limiting** and DDoS protection

For detailed SSL setup instructions, see [SSL_SETUP_GUIDE.md](SSL_SETUP_GUIDE.md).

## Docker Commands

### Development
```bash
# Start development stack
npm run docker:dev

# Stop development stack
npm run docker:dev:down

# View logs
docker-compose -f docker-compose.dev.yml logs -f
```

### Production
```bash
# Start production stack
npm run docker:prod

# Stop production stack
npm run docker:down

# View logs
docker-compose logs -f

# Restart specific service
docker-compose restart nginx
```

### SSL Management
```bash
# Initialize SSL
npm run ssl:init

# Renew certificates
npm run ssl:renew

# Test renewal
npm run ssl:test

# View SSL logs
npm run ssl:logs
```

## Project Structure

```
backend-wallet/
├── frontend/                # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── context/        # React context providers
│   │   ├── services/       # API service layer
│   │   └── ...
│   ├── Dockerfile          # Frontend production container
│   ├── Dockerfile.dev      # Frontend development container
│   └── package.json
├── src/                    # Backend source code
│   ├── controllers/        # Request handlers
│   ├── entities/          # Database entities
│   ├── services/          # Business logic
│   ├── routes/            # API routes
│   └── ...
├── nginx/                  # Nginx configuration
│   ├── nginx.conf         # Main nginx config
│   └── sites-enabled/     # Site-specific configs
├── certbot/               # SSL certificates
│   ├── conf/              # Let's Encrypt certificates
│   └── www/               # ACME challenge files
├── docker-compose.yml      # Production containers
├── docker-compose.dev.yml  # Development containers
├── init-letsencrypt.sh    # SSL initialization script
├── renew-ssl.sh          # SSL renewal script
├── SSL_SETUP_GUIDE.md    # Detailed SSL guide
└── package.json           # Backend dependencies
```

## Security Features

### SSL/TLS Security
- **TLS 1.2+ only** - Legacy protocols disabled
- **Modern cipher suites** - ECDHE, ChaCha20-Poly1305
- **HSTS headers** - Force HTTPS connections
- **OCSP stapling** - Fast certificate validation

### Application Security
- **Rate limiting** - Prevent API abuse
- **Security headers** - XSS, clickjacking, MIME sniffing protection
- **CORS configuration** - Controlled cross-origin access
- **Input validation** - Zod schema validation
- **SQL injection prevention** - TypeORM parameterized queries

### Authentication & Authorization
- **JWT tokens** - Secure stateless authentication
- **OAuth 2.1** - Modern authorization for MCP integration
- **Password hashing** - bcrypt with salt
- **Token expiration** - Configurable access/refresh tokens

## Environment Configuration

Copy `env.example` to `.env` and configure:

```bash
# Application
NODE_ENV=production
FRONTEND_URL=https://your-domain.com
API_URL=https://your-domain.com

# Database
DATABASE_URL=postgresql://user:pass@host:port/db

# Security
JWT_SECRET=your-super-secure-secret-key

# SSL
SSL_DOMAIN=your-domain.com
SSL_EMAIL=your-email@example.com
```

## Monitoring & Maintenance

### Health Checks
```bash
# Application health
curl https://your-domain.com/health

# SSL certificate status
./renew-ssl.sh status

# Container status
docker-compose ps
```

### Log Monitoring
```bash
# All logs
docker-compose logs -f

# Specific service logs
docker-compose logs -f nginx
docker-compose logs -f app
docker-compose logs -f certbot

# SSL-specific logs
npm run ssl:logs
```

### Backup Recommendations
1. **Database**: Regular PostgreSQL dumps
2. **SSL certificates**: Automatically backed up by Let's Encrypt
3. **Application data**: Regular filesystem backups
4. **Configuration**: Version control all config files

## Claude.ai Integration

This application supports integration with Claude.ai through the MCP (Model Context Protocol):

### Features
- **OAuth 2.1 authentication** for secure access
- **Financial tools** for Claude to manage your data
- **Real-time communication** via Server-Sent Events
- **Multi-user support** with proper isolation

### Setup for Claude
1. Deploy with SSL enabled
2. Configure OAuth in the application
3. Add your domain to Claude.ai integrations
4. Grant permissions for financial data access

For detailed MCP setup, see the MCP documentation files.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

If you encounter issues:

1. Check the [SSL Setup Guide](SSL_SETUP_GUIDE.md) for SSL-related problems
2. Review logs: `docker-compose logs -f`
3. Verify DNS configuration for your domain
4. Check firewall settings (ports 80, 443)
5. Ensure Docker and Docker Compose are properly installed

## Version History

- **v1.0.0** - Initial release with full feature set
- **v1.1.0** - Added SSL/HTTPS support with Let's Encrypt
- **v1.2.0** - Enhanced security headers and rate limiting
- **v1.3.0** - MCP integration for Claude.ai