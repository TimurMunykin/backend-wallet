import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
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

// Trust proxy headers (nginx sets X-Forwarded-Proto)
app.set('trust proxy', true);

app.use(helmet());

// CORS configuration for frontend access
app.use(cors({
  origin: [
    'http://localhost:3001', // Local frontend development
    'https://claude.ai', // Claude.ai domain
    /https:\/\/.*\.ngrok-free\.app$/, // Any ngrok domain
    /https:\/\/.*\.ngrok\.io$/, // Legacy ngrok domains
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
}));

// OAuth 2.1 well-known endpoint (RFC 8414)
app.get('/.well-known/oauth-authorization-server', async (req, res) => {
  // Force https for production domains
  const host = req.get('host');
  const baseUrl = `https://${host}`;
  
  const metadata = {
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/oauth/authorize`,
    token_endpoint: `${baseUrl}/oauth/token`,
    registration_endpoint: `${baseUrl}/oauth/register`,
    jwks_uri: `${baseUrl}/oauth/jwks`,
    scopes_supported: [
      'mcp:tools:list',
      'mcp:tools:call',
      'mcp:resources:read',
      'mcp:resources:write',
      'wallet:accounts:read',
      'wallet:accounts:write',
      'wallet:transactions:read',
      'wallet:transactions:write',
      'wallet:analytics:read'
    ],
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token', 'client_credentials'],
    token_endpoint_auth_methods_supported: ['client_secret_basic', 'none'],
    code_challenge_methods_supported: ['S256'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['RS256'],
    userinfo_endpoint: `${baseUrl}/oauth/userinfo`,
    revocation_endpoint: `${baseUrl}/oauth/revoke`,
    introspection_endpoint: `${baseUrl}/oauth/introspect`
  };

  res.json(metadata);
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Claude authorization redirect - redirect to frontend
app.get('/claude/authorize', (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
  const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
  const redirectUrl = `${frontendUrl}/claude/authorize?${queryString}`;
  
  console.log('🔀 Redirecting Claude authorization to frontend:', redirectUrl);
  res.redirect(redirectUrl);
});

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