# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build and Test
- `npm run build` - Build TypeScript to JavaScript
- `npm run typecheck` - Run TypeScript type checking without emitting
- `npm run test` - Run Jest tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report

### Linting and Formatting
- `npm run lint` - Run ESLint on TypeScript files
- `npm run lint:fix` - Run ESLint with automatic fixes
- `npm run format` - Format code with Prettier

### Development Server
- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server from built files

### Database Operations
- `npm run db:migrate` - Run TypeORM migrations
- `npm run db:migrate:revert` - Revert last migration
- `npm run db:migrate:generate` - Generate new migration
- `npm run db:seed` - Run database seeds

### Docker Operations
- `npm run docker:build` - Build Docker image
- `npm run docker:dev` - Start development environment with Docker Compose
- `npm run docker:prod` - Start production environment
- `npm run docker:up` - Start production stack
- `npm run docker:down` - Stop Docker containers

### SSL/Production
- `npm run ssl:init` - Initialize Let's Encrypt certificates
- `npm run ssl:renew` - Renew SSL certificates
- `npm run ssl:test` - Test certificate renewal

## Architecture Overview

### Core Structure
This is a full-stack personal finance management system with:
- **Backend**: Express.js + TypeScript with PostgreSQL
- **Frontend**: React 18 + TypeScript + Material-UI (in `/frontend/`)
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT + OAuth 2.1 for MCP integration
- **Deployment**: Docker with Nginx reverse proxy and Let's Encrypt SSL

### Key Features
- **Daily Spending Engine**: Complex calculation system for spending limits
- **MCP Integration**: Claude.ai integration via Model Context Protocol
- **OAuth 2.1**: Secure authorization for external integrations
- **Multi-tenant**: User isolation with proper security
- **Financial Tools**: Accounts, transactions, goals, recurring payments, analytics

### Database Architecture
**Core Entities** (all in `/src/entities/`):
- `User` - User accounts with email/password
- `Account` - Financial accounts (checking, savings, etc.)
- `Transaction` - Income/expense transactions
- `Goal` - Financial goals with progress tracking
- `RecurringPayment` - Automated recurring transactions
- `SalaryPayment` - Salary tracking with date ranges
- `Snapshot` - Historical balance snapshots
- `DailySpendingConfig` - Spending calculation configuration
- `DailySpendingCache` - Performance optimization for spending calculations

### Service Layer Pattern
Business logic is separated into services (`/src/services/`):
- Each entity has corresponding service class
- Controllers handle HTTP requests, services handle business logic
- Services interact with TypeORM repositories
- Validation handled with Zod schemas

### API Structure
**Routes** (`/src/routes/`):
- `/api/auth` - Authentication (login, register)
- `/api/accounts` - Account management
- `/api/transactions` - Transaction CRUD
- `/api/goals` - Goal management
- `/api/daily-spending` - Spending calculations
- `/api/analytics` - Financial reporting
- `/mcp` - Model Context Protocol endpoints
- `/oauth` - OAuth 2.1 authorization

### Frontend Architecture
**React Application** (`/frontend/src/`):
- `components/` - React components (Dashboard, Transactions, etc.)
- `context/` - React Context for state management
- `services/` - API client layer
- Material-UI for consistent design
- TypeScript for type safety

### MCP Integration
**Model Context Protocol** for Claude.ai:
- OAuth 2.1 authorization flow
- Server-Sent Events for real-time communication
- Financial tools exposed to Claude
- Multi-user support with proper scoping

## Code Conventions

### TypeScript Standards
- Strict TypeScript configuration
- Use interfaces for type definitions
- All functions should have proper typing
- Use `!` assertion only when necessary (TypeORM entities)

### Component Structure
- Maximum 200 lines per component/function
- Single responsibility principle
- Custom hooks for reusable logic
- Separate business logic from UI components

### Database Conventions
- Use TypeORM decorators for entity definitions
- Column names use snake_case (e.g., `created_at`)
- Entity relationships properly defined with decorators
- Indexes on frequently queried columns

### Error Handling
- Use custom error classes where appropriate
- Proper HTTP status codes
- Comprehensive error middleware
- Never expose sensitive information in errors

## Development Guidelines

### Security Requirements
- Never run the application without explicit user request
- Always validate input with Zod schemas
- Use bcrypt for password hashing
- JWT tokens with proper expiration
- Rate limiting on authentication endpoints
- CORS properly configured for frontend access

### Testing
- Jest configuration in `jest.config.js`
- Test files in `/tests/` directory
- Setup file at `/tests/setup.ts`
- Use supertest for API testing
- Coverage reports generated in `/coverage/`

### Docker Development
- **IMPORTANT**: All development is done via Docker Compose - do NOT try to run locally
- Use `docker-compose.dev.yml` for development
- Production configuration in `docker-compose.yml`
- Nginx reverse proxy with SSL termination
- Database and Redis services included

### MCP/Claude Integration
- Don't assume Claude has access to run commands
- Always read documentation for cutting-edge technologies
- Use MCP for browser automation (playwright) and documentation (context7)
- For frontend debugging, use MCP to check console logs

### Default Credentials
- Email: `aaaatest@gmail.com`
- Password: `!WSu12T7E060988!ASDSADasda456`

## Important Notes

### Database Configuration
- PostgreSQL with TypeORM
- Synchronize enabled for production (temporary)
- Connection configured via environment variables
- Supports both DATABASE_URL and individual DB_* variables

### Environment Setup
- Copy `env.example` to `.env`
- Configure DATABASE_URL for PostgreSQL
- Set JWT_SECRET for authentication
- Configure FRONTEND_URL for CORS

### Production Deployment
- **Production URL**: https://simplewallet.twc1.net/
- **Production IP**: 217.25.93.230
- **SSH Access**: Available for production work
- SSL certificates via Let's Encrypt
- Nginx reverse proxy configuration
- Docker Compose for container orchestration
- Health checks and monitoring endpoints

### Deployment Workflow
1. Make changes locally in this repository
2. Create testing branch with prefix `claude_did_this_{incremental_number}` (starting from 0)
3. Commit and push changes
4. SSH to production server and pull changes
5. Deploy via Docker Compose on production

### Known Issues
- Synchronize is enabled in production (should use migrations)
- Rate limiting removed to avoid Claude.ai interference
- ngrok headers handled for development tunneling