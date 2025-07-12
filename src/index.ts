import 'reflect-metadata';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

import { AppDataSource } from './config/database';
import authRoutes from './routes/auth';
import oauthRoutes from './routes/oauth';
import mcpRoutes from './routes/mcp';
import accountRoutes from './routes/accounts';
import dailySpendingRoutes from './routes/daily-spending';
import transactionRoutes from './routes/transactions';
import recurringPaymentRoutes from './routes/recurring-payments';
import salaryRoutes from './routes/salary';
import goalRoutes from './routes/goals';
import snapshotRoutes from './routes/snapshots';
import analyticsRoutes from './routes/analytics';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Remove rate limiting - can interfere with Claude.ai requests
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Middleware to handle ngrok browser warnings
app.use((_req, res, next) => {
  res.header('ngrok-skip-browser-warning', 'true');
  next();
});

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Personal Finance Manager API',
      version: '1.0.0',
      description: 'A comprehensive personal finance management system',
    },
    servers: [
      {
        url: process.env.API_URL || `http://localhost:${PORT}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication endpoints',
      },
      {
        name: 'Accounts',
        description: 'Account management endpoints',
      },
      {
        name: 'Daily Spending',
        description: 'Daily spending calculation and configuration endpoints',
      },
      {
        name: 'Transactions',
        description: 'Transaction management endpoints',
      },
      {
        name: 'Recurring Payments',
        description: 'Recurring payment management endpoints',
      },
      {
        name: 'Salary',
        description: 'Salary management endpoints',
      },
      {
        name: 'Goals',
        description: 'Goal management endpoints',
      },
      {
        name: 'Snapshots',
        description: 'Snapshot management endpoints',
      },
      {
        name: 'Analytics',
        description: 'Analytics and reporting endpoints',
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

const specs = swaggerJsdoc(swaggerOptions);

app.use(helmet());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Root endpoint for Claude.ai verification
app.get('/', (_req, res) => {
  res.json({
    service: 'Personal Finance Assistant MCP Server',
    version: '1.0.0',
    status: 'active',
    discovery: '/.well-known/mcp',
    oauth: '/oauth/oauth-authorization-server',
    endpoints: {
      mcp: '/mcp',
      tools: '/mcp/tools',
      call: '/mcp/call',
      streamableHttp: '/mcp/sse'
    }
  });
});

app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

app.get('/api/ping', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Pong! API is reachable',
    timestamp: new Date().toISOString(),
    server: 'backend-wallet-api',
  });
});

// OAuth 2.1 routes for MCP Authorization
app.use('/oauth', oauthRoutes);
app.use('/.well-known', oauthRoutes);

// MCP Protocol routes
app.use('/mcp', mcpRoutes);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/daily-spending', dailySpendingRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/recurring-payments', recurringPaymentRoutes);
app.use('/api/salary', salaryRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/snapshots', snapshotRoutes);
app.use('/api/analytics', analyticsRoutes);

app.use('*', (_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

app.use(errorHandler);



const startServer = async (): Promise<void> => {
  try {
    await AppDataSource.initialize();
    console.log('Database connection established');

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`API Documentation available at http://localhost:${PORT}/api-docs`);
      console.log(`Health check available at http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
};

startServer().catch(console.error);