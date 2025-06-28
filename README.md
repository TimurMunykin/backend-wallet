# Personal Finance Management System

A comprehensive full-stack TypeScript application for personal finance management with advanced daily spending calculations, goal tracking, and financial analytics.

## Architecture

- **Frontend**: React 18 + TypeScript + Material-UI
- **Backend**: Express.js + TypeScript + PostgreSQL  
- **Deployment**: Docker & Docker Compose

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
- **Authentication**: JWT
- **Validation**: Zod
- **Documentation**: Swagger/OpenAPI 3.0
- **Testing**: Jest
- **Containerization**: Docker & Docker Compose
- **Security**: Helmet, CORS, Rate Limiting

## Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose (recommended)
- PostgreSQL 15+ (if not using Docker)
- Redis (optional, for caching)

### Option 1: Docker Development (Recommended)

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

### Option 2: Local Development

1. **Clone and setup backend**
   ```bash
   git clone <repository-url>
   cd backend-wallet
   
   # Install backend dependencies
   npm install
   
   # Setup environment
   cp .env.example .env
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

### Option 3: Production Deployment

```bash
# Start production environment
docker-compose up --build

# Access the applications
# Frontend: http://localhost (port 80)
# Backend API: http://localhost:3000
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
├── docker-compose.yml      # Production containers
├── docker-compose.dev.yml  # Development containers
└── package.json           # Backend dependencies
```