# Backend Wallet MCP Server

A Model Context Protocol (MCP) server that exposes simple functions from the existing backend wallet API.

## Overview

This MCP server provides a standardized interface for AI applications to interact with the backend wallet API. It exposes three main tools:

1. **getTotalBalance** - Get the total balance across all user accounts
2. **getRecentTransactions** - Get recent transactions with optional filtering
3. **getUserAccounts** - Get all user accounts with their balances

## MCP Tools

### getTotalBalance
- **Description**: Get the total balance across all user accounts
- **Input**: `userId` (string) - User ID for authentication
- **Output**: Total balance formatted as text

### getRecentTransactions
- **Description**: Get recent transactions with optional filtering
- **Input**: 
  - `userId` (string) - User ID for authentication
  - `limit` (number, optional) - Number of transactions to retrieve (default: 10)
  - `accountId` (number, optional) - Filter by specific account ID
  - `type` (string, optional) - Filter by transaction type ("income" or "expense")
- **Output**: List of recent transactions formatted as text

### getUserAccounts
- **Description**: Get all user accounts with their balances
- **Input**: `userId` (string) - User ID for authentication
- **Output**: List of accounts with balances formatted as text

## Architecture

The MCP server acts as a bridge between AI applications and the backend wallet API:

```
AI Application → MCP Client → MCP Server → Backend Wallet API
```

## Configuration

Environment variables:
- `BACKEND_API_URL` - URL of the backend API (default: http://app:3000/api)
- `DEMO_AUTH_TOKEN` - Demo authentication token (replace with proper JWT in production)

## Development

### Local Development
```bash
cd mcp-server
npm install
npm run dev
```

### Docker Development
The MCP server is included in the main docker-compose.dev.yml file and runs as a separate container.

```bash
# From project root
npm run docker:dev
```

## Usage with MCP Clients

This server communicates using the stdio transport. To use with an MCP client:

1. Build the server: `npm run build`
2. Run the server: `npm start`
3. Connect your MCP client to the server process

## Security Notes

- This is a demo implementation with simplified authentication
- In production, implement proper JWT token validation
- Consider rate limiting and input validation
- Ensure proper access controls for sensitive financial data

## API Endpoints Used

The MCP server makes requests to these backend endpoints:
- `GET /api/accounts/total-balance` - For getTotalBalance tool
- `GET /api/transactions` - For getRecentTransactions tool
- `GET /api/accounts` - For getUserAccounts tool

## Future Enhancements

- Add more sophisticated tools (goal tracking, analytics, etc.)
- Implement proper authentication and authorization
- Add resource types for dynamic data access
- Add prompts for guided financial workflows
- Implement caching for better performance 