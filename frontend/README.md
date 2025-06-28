# Finance Manager Frontend

A simple React frontend for the Personal Finance Manager built with Material-UI.

## Features

- **Authentication**: Login and registration
- **Dashboard**: Overview of accounts, recent transactions, and goals
- **Account Management**: Create, edit, and manage financial accounts
- **Transaction Tracking**: Record income and expenses (placeholder)
- **Recurring Payments**: Manage automatic payments (placeholder)
- **Goals**: Set and track financial goals (placeholder)
- **Daily Spending**: Calculate daily spending limits (placeholder)
- **Analytics**: Financial insights and charts (placeholder)
- **Snapshots**: Financial progress tracking (placeholder)

## Tech Stack

- React 18 with TypeScript
- Material-UI (MUI) for components
- React Router for navigation
- Axios for API calls
- Vite for build tooling

## Getting Started

### Local Development

```bash
cd frontend
npm install
npm run dev
```

The app will be available at http://localhost:3001

### Docker Development

```bash
# Run the entire stack in development mode
docker compose -f docker-compose.dev.yml up --build
```

- Frontend: http://localhost:3001
- Backend API: http://localhost:3000

### Production

```bash
# Run the entire stack in production mode
docker compose up --build
```

- Frontend: http://localhost (port 80)
- Backend API: http://localhost:3000

## Project Structure

```
frontend/
├── src/
│   ├── components/          # React components
│   ├── context/            # React context providers
│   ├── services/           # API service layer
│   ├── App.tsx             # Main app component
│   └── main.tsx            # App entry point
├── public/                 # Static assets
├── Dockerfile              # Production container
├── Dockerfile.dev          # Development container
├── nginx.conf              # Nginx configuration
└── package.json            # Dependencies and scripts
```

## Current Implementation Status

✅ **Completed:**
- Authentication system (login/register)
- Dashboard with key metrics
- Account management (full CRUD)
- Navigation and layout
- Docker configuration

🚧 **In Progress/Placeholder:**
- Transaction management (basic structure)
- Recurring payments (basic structure)
- Goals tracking (basic structure)
- Daily spending calculator (basic structure)
- Analytics and charts (basic structure)
- Financial snapshots (basic structure)

## API Integration

The frontend communicates with the backend API through:
- Base URL: `/api` (proxied in development)
- Authentication: JWT tokens stored in localStorage
- Automatic token refresh and error handling

## API Configuration

The frontend automatically handles API endpoints for different environments:

### Development Scenarios:

1. **Docker Development** (`docker-compose -f docker-compose.dev.yml up`)
   - Frontend: http://localhost:3001  
   - Backend: http://localhost:3000
   - API calls: Frontend → Backend (automatically configured)

2. **Local Development** (running frontend and backend separately)
   - Copy `.env.local.example` to `.env.local` 
   - Frontend uses `VITE_API_URL=http://localhost:3000/api`

3. **Production** (`docker-compose up`)
   - Frontend: http://localhost (port 80)
   - Backend: http://localhost:3000
   - API calls: Proxied through Nginx

### Environment Files:
- `.env.development` - Development environment settings
- `.env.local` - Local development overrides (create from `.env.local.example`)
- Production uses Nginx proxy (no environment variables needed)

## Development Notes

- Uses TypeScript for type safety
- Material-UI components follow Material Design principles
- Responsive design for mobile and desktop
- Error handling and loading states
- Simple state management with React hooks

## Next Steps

1. Implement transaction management with filtering and search
2. Add charts and analytics using MUI X Charts
3. Complete recurring payments functionality
4. Build goals tracking with progress visualization
5. Add daily spending calculator
6. Implement financial snapshots
7. Add data export/import features
8. Improve error handling and user feedback
