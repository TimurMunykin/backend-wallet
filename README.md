# Personal Finance Management Backend

A comprehensive TypeScript backend for personal finance management with advanced daily spending calculations, goal tracking, and financial analytics.

## Features

### Core Features
- 🔐 **JWT Authentication** - Secure user authentication and authorization
- 💰 **Account Management** - Multiple accounts with balance tracking
- 📊 **Transaction Management** - Income/expense tracking with categorization
- 🔄 **Recurring Payments** - Automated recurring income/expense tracking
- 💼 **Salary Management** - Flexible salary tracking with date ranges
- 🎯 **Goals System** - Hierarchical goal structure with progress tracking
- 📈 **Daily Spending Calculator** - Advanced configurable spending limits
- 📸 **Snapshots** - Historical balance and transaction summaries
- 📊 **Analytics & Reporting** - Comprehensive financial insights

### Key Highlights
- **Daily Spending Engine**: Highly configurable calculation system considering goals, recurring payments, and salary expectations
- **Flexible Configuration**: Multiple calculation scenarios and period types
- **Caching System**: Optimized performance for complex calculations
- **Comprehensive API**: RESTful endpoints with full CRUD operations
- **Type Safety**: Full TypeScript implementation with strict typing
- **Database Optimization**: Efficient queries with TypeORM

## Tech Stack

- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT
- **Validation**: Zod
- **Documentation**: Swagger/OpenAPI 3.0
- **Testing**: Jest
- **Containerization**: Docker & Docker Compose
- **Security**: Helmet, CORS, Rate Limiting

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Redis (optional, for caching)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend-wallet
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Database setup**
   ```bash
   # Using Docker (recommended)
   docker-compose up -d db redis
   
   # Or setup PostgreSQL manually and update .env
   ```

5. **Run database migrations**
   ```bash
   npm run db:migrate
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Access the API**
   - API: http://localhost:3000
   - Documentation: http://localhost:3000/api-docs
   - Health Check: http://localhost:3000/health

### Docker Development

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh-token` - Refresh access token
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/change-password` - Change password

### Account Management
- `POST /api/accounts` - Create account
- `GET /api/accounts` - List user accounts
- `GET /api/accounts/:id` - Get account details
- `PUT /api/accounts/:id` - Update account
- `DELETE /api/accounts/:id` - Delete account
- `GET /api/accounts/:id/summary` - Account transaction summary
- `GET /api/accounts/total-balance` - Total balance across accounts

### Daily Spending (Core Feature)
- `GET /api/daily-spending/calculate` - Calculate daily spending limit
- `POST /api/daily-spending/configs` - Create calculation configuration
- `GET /api/daily-spending/configs` - List configurations
- `GET /api/daily-spending/configs/:id` - Get configuration
- `PUT /api/daily-spending/configs/:id` - Update configuration
- `DELETE /api/daily-spending/configs/:id` - Delete configuration
- `POST /api/daily-spending/configs/:id/activate` - Activate configuration

## Daily Spending Calculator

The core feature of this system is the highly configurable daily spending calculator that helps users understand how much they can spend daily based on:

### Calculation Factors
- **Current Balance**: Total balance across all accounts
- **Expected Salary**: Pending salary payments within the period
- **Recurring Income**: Expected recurring income (subscriptions, freelance, etc.)
- **Recurring Expenses**: Expected recurring expenses (bills, subscriptions)
- **Goal Allocations**: Money reserved for achieving financial goals
- **Emergency Buffer**: Safety buffer amount
- **Time Period**: Flexible period calculation (to salary, month end, custom days, specific date)

### Configuration Options
- **Period Types**: 
  - To next salary date
  - To month end
  - Custom number of days
  - Specific end date
- **Toggles**: Include/exclude salary, recurring payments, specific goals
- **Goal Priorities**: Weighted allocation for multiple goals
- **Emergency Buffer**: Configurable safety amount

### Example Calculation
```
Starting Balance: $2,000
+ Expected Salary: $3,000
+ Expected Recurring Income: $200
- Expected Recurring Expenses: $800
- Goals Reserved: $500
- Emergency Buffer: $300
= Available Amount: $3,600

Days Remaining: 15
Daily Limit: $3,600 ÷ 15 = $240/day
```

## Database Schema

The system uses a comprehensive relational database schema with the following main entities:

- **Users**: User accounts and authentication
- **Accounts**: User's financial accounts (cards, cash, etc.)
- **Transactions**: All financial transactions
- **Recurring Payments**: Automated recurring income/expenses
- **Salary Payments**: Salary configuration and tracking
- **Goals**: Financial goals with hierarchical structure
- **Daily Spending Configs**: Calculation configurations
- **Snapshots**: Historical data points
- **Caching**: Performance optimization

## Development

### Scripts
```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run format       # Format code with Prettier
npm run typecheck    # TypeScript type checking

# Testing
npm test             # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage

# Database
npm run db:migrate   # Run migrations
npm run db:seed      # Seed database
```

### Project Structure
```
src/
├── config/          # Configuration files
├── controllers/     # Request handlers
├── entities/        # TypeORM entities
├── middleware/      # Express middleware
├── routes/          # API route definitions
├── services/        # Business logic
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
├── migrations/      # Database migrations
└── seeds/           # Database seeds

tests/
├── unit/            # Unit tests
├── integration/     # Integration tests
└── setup.ts         # Test setup
```

## Production Deployment

### Environment Variables
Ensure all required environment variables are set:
- Database connection details
- JWT secrets (use strong, unique keys)
- Redis connection (if using caching)
- CORS and security settings

### Security Considerations
- Use strong JWT secrets
- Enable HTTPS in production
- Configure proper CORS origins
- Set up rate limiting
- Use environment-specific database credentials
- Enable database connection pooling

### Performance Optimization
- Enable caching for daily spending calculations
- Use database connection pooling
- Implement proper database indexing
- Monitor query performance
- Set up database read replicas if needed

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## License

MIT License - see LICENSE file for details.