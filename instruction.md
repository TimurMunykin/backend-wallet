# Backend Generation Prompt

Create a TypeScript backend project for a personal finance management system with the following specifications:

## Tech Stack Requirements
- **Language**: TypeScript
- **Framework**: Express.js or Fastify (your choice)
- **Database**: PostgreSQL with TypeORM or Prisma
- **API Documentation**: Swagger/OpenAPI 3.0
- **Authentication**: JWT-based authentication
- **Validation**: Input validation with Joi or Zod
- **Testing**: Jest for unit tests
- **Environment**: Docker support with docker-compose

## Database Schema
Use the provided database schema (see `dbscheme.md`). The schema includes:
- Users with multiple accounts
- Transactions with income/expense tracking
- Recurring payments with actual vs expected amounts
- Salary payments with flexible date ranges
- Goals system with hierarchical structure
- Daily spending calculation configurations
- Snapshots for historical data
- Caching system for performance

## Core Features to Implement

### 1. Authentication & User Management
- User registration and login
- JWT token management
- Password hashing with bcrypt
- User profile management

### 2. Account Management
- CRUD operations for user accounts
- Balance calculation and updates
- Account transaction history

### 3. Transaction Management
- Create, read, update, delete transactions
- Bulk transaction import
- Transaction categorization
- Search and filtering

### 4. Recurring Payments
- Setup recurring income/expense patterns
- Automatic transaction generation
- Actual vs expected amount tracking
- Deviation notifications

### 5. Salary Management
- Flexible salary date ranges (e.g., 10th-15th of each month)
- Expected vs actual salary tracking
- Salary receipt confirmation
- Historical salary data

### 6. Goals System
- Hierarchical goal structure (goals and sub-goals)
- Target amount and minimum balance tracking
- Goal progress calculation
- Goal achievement notifications

### 7. Daily Spending Calculator (KEY FEATURE)
- Highly configurable calculation engine
- Multiple calculation scenarios (with/without goals, with/without expected salary)
- Period flexibility (to salary, to month end, custom days, specific date)
- Real-time calculation with caching
- Support for negative daily limits
- Detailed calculation breakdown

### 8. Snapshots
- Automatic daily snapshots
- Manual snapshot creation
- Historical balance tracking
- Transaction summaries
- Goals progress tracking

### 9. Analytics & Reporting
- Income/expense trends
- Goal progress reports
- Spending patterns
- Forecast calculations

## API Requirements

### Structure
- RESTful API design
- Consistent response format
- Error handling with appropriate HTTP status codes
- Request/response logging
- Rate limiting

### Key Endpoints Groups
- `/auth` - Authentication endpoints
- `/users` - User management
- `/accounts` - Account management
- `/transactions` - Transaction operations
- `/recurring-payments` - Recurring payment management
- `/salary` - Salary management
- `/goals` - Goal management
- `/daily-spending` - Daily spending calculations
- `/snapshots` - Snapshot operations
- `/analytics` - Analytics and reports

### Daily Spending Endpoints (Priority)
- `GET /daily-spending/calculate` - Calculate daily spending limit
- `POST /daily-spending/configs` - Create calculation configuration
- `PUT /daily-spending/configs/:id` - Update configuration
- `GET /daily-spending/configs` - List user configurations
- `POST /daily-spending/configs/:id/activate` - Activate configuration

## Business Logic Requirements

### Daily Spending Calculation Engine
The core algorithm should:
1. Take current balance
2. Subtract/add expected recurring payments based on config
3. Subtract/add expected salary based on config
4. Subtract amounts needed for active goals
5. Consider emergency buffer
6. Calculate remaining days in period
7. Return daily limit (can be negative)
8. Cache result with appropriate expiration
9. Provide detailed breakdown of calculation

### Configuration Flexibility
- Toggle inclusion of pending salary
- Toggle inclusion of recurring income/expenses
- Select which goals to include
- Set goal priorities
- Choose calculation period
- Set emergency buffer amount

## Code Quality Requirements
- TypeScript strict mode
- ESLint and Prettier configuration
- Comprehensive error handling
- Input validation on all endpoints
- Unit tests for business logic
- Integration tests for API endpoints
- Environment variable configuration
- Logging with different levels
- Health check endpoint

## Performance Requirements
- Database query optimization
- Caching for expensive calculations
- Connection pooling
- Lazy loading where appropriate
- Pagination for list endpoints

## Security Requirements
- Input sanitization
- SQL injection prevention
- XSS protection
- CORS configuration
- Helmet.js for security headers
- Rate limiting
- JWT token expiration handling

## Project Structure
Create a well-organized project structure with:
- Controllers for request handling
- Services for business logic
- Repositories/DAOs for data access
- Middleware for common functionality
- Utils for helper functions
- Types/interfaces for TypeScript
- Database migrations
- Seeds for test data

## Documentation
- Complete Swagger/OpenAPI documentation
- README with setup instructions
- Environment variables documentation
- API usage examples
- Database schema documentation

## Special Focus Areas
1. **Daily Spending Calculator** - This is the core feature, make it robust and flexible
2. **Recurring Payment Tracking** - Actual vs expected amount comparison
3. **Goal Management** - Hierarchical structure with flexible allocation
4. **Performance** - Caching and optimization for calculations
5. **Flexibility** - Maximum configurability for different user preferences

Generate a complete, production-ready backend that can handle complex financial calculations while maintaining good performance and code quality.