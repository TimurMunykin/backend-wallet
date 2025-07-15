import { Router } from 'express';
import { McpController } from '../controllers/McpController';
import { AuthenticatedRequest } from '../middleware/auth';
import { OAuthService } from '../services/OAuthService';
import { AuthService } from '../services/AuthService';

const router = Router();
const mcpController = new McpController();
const oauthService = OAuthService.getInstance();
const authService = new AuthService();

// Helper function to authenticate MCP requests
async function authenticateRequest(req: AuthenticatedRequest): Promise<{ userId: number; email: string } | null> {
  try {
    const authHeader = req.headers.authorization;
    console.log('🔍 Auth header:', authHeader);
    if (!authHeader) {
      console.log('❌ No auth header found');
      return null;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      console.log('❌ No token found in auth header');
      return null;
    }

    console.log('🔍 Extracted token:', token.substring(0, 20) + '...');

    // Try OAuth token first
    const oauthToken = await oauthService.validateAccessToken(token);
    console.log('🔍 OAuth token validation result:', {
      isValid: !!oauthToken,
      client_id: oauthToken?.client_id,
      user_id: oauthToken?.user_id,
      scope: oauthToken?.scope,
      expires_at: oauthToken?.expires_at
    });

    if (oauthToken && oauthToken.user_id) {
      console.log('🔍 Fetching user by ID:', oauthToken.user_id);
      // Fetch real user data
      const user = await authService.getUserById(oauthToken.user_id);
      console.log('🔍 User lookup result:', {
        found: !!user,
        userId: user?.id,
        email: user?.email
      });
      
      if (user) {
        console.log('✅ Authentication successful for user:', user.id, user.email);
        return {
          userId: user.id,
          email: user.email
        };
      } else {
        console.log('❌ User not found in database for user_id:', oauthToken.user_id);
      }
    } else {
      if (!oauthToken) {
        console.log('❌ OAuth token validation failed');
      } else {
        console.log('❌ OAuth token has no user_id:', oauthToken);
      }
    }

    return null;
  } catch (error) {
    console.error('❌ Authentication error:', error);
    return null;
  }
}

// MCP Protocol endpoints
router.get('/tools', mcpController.listTools);
router.post('/call', mcpController.callTool);

// Add request timeout middleware for MCP endpoint
router.use('/sse', (req, res, next) => {
  // Set timeout for each request
  req.setTimeout(60000, () => {
    console.error('⏰ MCP request timeout');
    if (!res.headersSent) {
      res.status(408).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Request timeout'
        },
        id: null
      });
    }
  });
  next();
});

// Modern StreamableHTTP endpoint for MCP - правильная реализация
router.all('/sse', async (req: AuthenticatedRequest, res): Promise<void> => {
  console.log('📡 MCP connection attempt from:', req.get('User-Agent'));
  console.log('📡 Method:', req.method);
  console.log('📡 Headers:', JSON.stringify(req.headers, null, 2));
  console.log('📡 Body:', JSON.stringify(req.body, null, 2));
  
  // Authenticate the request first
  const user = await authenticateRequest(req);
  if (!user) {
    console.log('❌ Unauthorized MCP connection attempt');
    res.status(401).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Authentication required'
      },
      id: null
    });
    return;
  }

  console.log(`✅ Authenticated MCP connection for user: ${user.userId} (${user.email})`);
  req.user = user; // Attach user to request
  
  try {
    if (req.method === 'GET') {
      // GET request - start SSE stream for server-to-client communication
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Accept, Authorization, Content-Type',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      });
      
      // Send initial connection message
      res.write('data: {"type":"connection","status":"connected"}\n\n');
      
      // Keep the connection alive with more frequent heartbeats
      const keepAlive = setInterval(() => {
        if (!res.destroyed) {
          res.write('data: {"type":"heartbeat","timestamp":"' + new Date().toISOString() + '"}\n\n');
        }
      }, 15000); // Every 15 seconds instead of 30
      
      // Handle connection cleanup
      const cleanup = () => {
        clearInterval(keepAlive);
        if (!res.destroyed) {
          res.end();
        }
      };
      
      req.on('close', cleanup);
      req.on('error', cleanup);
      res.on('error', cleanup);
      
      // Set a longer timeout
      req.setTimeout(300000); // 5 minutes
      
      console.log('✅ SSE stream established for GET request with enhanced keep-alive');
      return;
    }
    
    if (req.method === 'POST') {
      // POST request - handle JSON-RPC message
      const jsonRpcMessage = req.body;
      
      // More robust validation
      if (!jsonRpcMessage || typeof jsonRpcMessage !== 'object' || !jsonRpcMessage.jsonrpc || !jsonRpcMessage.method) {
        console.error('❌ Invalid JSON-RPC message:', jsonRpcMessage);
        res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32700,
            message: 'Parse error - Invalid JSON-RPC format'
          },
          id: jsonRpcMessage?.id || null
        });
        return;
      }
      
      console.log(`📨 Processing JSON-RPC method: ${jsonRpcMessage.method} with ID: ${jsonRpcMessage.id}`);
      
      // Set response headers to prevent connection issues
      res.set({
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });
      
      // Handle initialize request
      if (jsonRpcMessage.method === 'initialize') {
        console.log('🚀 Handling initialize request');
        
        const initializeResponse = {
          jsonrpc: '2.0',
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {
                listChanged: true
              }
            },
            serverInfo: {
              name: 'personal-finance-assistant',
              version: '1.0.0'
            }
          },
          id: jsonRpcMessage.id
        };
        
        console.log('✅ Sending initialize response:', JSON.stringify(initializeResponse, null, 2));
        res.json(initializeResponse);
        return;
      }
      
      // Handle tools/list request
      if (jsonRpcMessage.method === 'tools/list') {
        console.log('🔧 Handling tools/list request');
        
        const toolsResponse = {
          jsonrpc: '2.0',
          result: {
            tools: [
              {
                name: 'ping',
                description: 'Simple ping test to verify MCP connection is working',
                inputSchema: {
                  type: 'object',
                  properties: {
                    message: { 
                      type: 'string', 
                      description: 'Optional message to echo back',
                      default: 'Hello from MCP!' 
                    }
                  }
                }
              },
              {
                name: 'addTransaction',
                description: 'Add a new transaction to the wallet',
                inputSchema: {
                  type: 'object',
                  properties: {
                    accountId: {
                      type: 'number',
                      description: 'Account ID for the transaction'
                    },
                    amount: {
                      type: 'number',
                      description: 'Transaction amount (positive for income, negative for expense)'
                    },
                    description: {
                      type: 'string',
                      description: 'Transaction description'
                    },
                    type: {
                      type: 'string',
                      enum: ['income', 'expense'],
                      description: 'Transaction type'
                    }
                  },
                  required: ['accountId', 'amount', 'description', 'type']
                }
              },
              {
                name: 'getAccountBalance',
                description: 'Get balance for a specific account',
                inputSchema: {
                  type: 'object',
                  properties: {
                    accountId: {
                      type: 'number',
                      description: 'Account ID to get balance for'
                    }
                  },
                  required: ['accountId']
                }
              },
              {
                name: 'getTransactionHistory',
                description: 'Get transaction history for an account',
                inputSchema: {
                  type: 'object',
                  properties: {
                    accountId: {
                      type: 'number',
                      description: 'Account ID to get history for'
                    },
                    limit: {
                      type: 'number',
                      description: 'Number of transactions to retrieve (default: 10)',
                      default: 10
                    }
                  },
                  required: ['accountId']
                }
              },
              {
                name: 'getTotalBalance',
                description: 'Get total balance across all accounts',
                inputSchema: {
                  type: 'object',
                  properties: {},
                  required: []
                }
              },
              {
                name: 'getRecentTransactions',
                description: 'Get recent transactions across all accounts',
                inputSchema: {
                  type: 'object',
                  properties: {
                    limit: {
                      type: 'number',
                      description: 'Number of transactions to retrieve (default: 10)',
                      default: 10
                    },
                    type: {
                      type: 'string',
                      enum: ['income', 'expense'],
                      description: 'Filter by transaction type'
                    }
                  },
                  required: []
                }
              },
              {
                name: 'getUserAccounts',
                description: 'Get all user accounts',
                inputSchema: {
                  type: 'object',
                  properties: {},
                  required: []
                }
              }
            ]
          },
          id: jsonRpcMessage.id
        };
        
        console.log('✅ Sending tools/list response:', JSON.stringify(toolsResponse, null, 2));
        res.json(toolsResponse);
        return;
      }
      
      // Handle resources/list request
      if (jsonRpcMessage.method === 'resources/list') {
        console.log('📚 Handling resources/list request');
        
        const resourcesResponse = {
          jsonrpc: '2.0',
          result: {
            resources: []
          },
          id: jsonRpcMessage.id
        };
        
        console.log('✅ Sending resources/list response (empty)');
        res.json(resourcesResponse);
        return;
      }
      
      // Handle prompts/list request
      if (jsonRpcMessage.method === 'prompts/list') {
        console.log('💭 Handling prompts/list request');
        
        const promptsResponse = {
          jsonrpc: '2.0',
          result: {
            prompts: []
          },
          id: jsonRpcMessage.id
        };
        
        console.log('✅ Sending prompts/list response (empty)');
        res.json(promptsResponse);
        return;
      }
      
      // Handle notifications/initialized request
      if (jsonRpcMessage.method === 'notifications/initialized') {
        console.log('🔔 Handling notifications/initialized request');
        
        // For notifications, return 202 Accepted with no body
        res.status(202).send();
        return;
      }
      
      // Handle tools/call request
      if (jsonRpcMessage.method === 'tools/call') {
        console.log('🚀 Handling tools/call request');
        const { name, arguments: args } = jsonRpcMessage.params;
        
        try {
          let toolResponse;
          
          switch (name) {
            case 'ping':
              const message = args?.message || 'Hello from MCP!';
              toolResponse = {
                jsonrpc: '2.0',
                result: {
                  content: [
                    {
                      type: 'text',
                      text: `🏓 Pong! Message: "${message}" | Timestamp: ${new Date().toISOString()} | Server: MCP Backend Wallet`
                    }
                  ]
                },
                id: jsonRpcMessage.id
              };
              break;
              
            case 'addTransaction':
              toolResponse = {
                jsonrpc: '2.0',
                result: {
                  content: [
                    {
                      type: 'text',
                      text: `💰 Transaction added: ${args.amount} ${args.type} for account ${args.accountId} - ${args.description}`
                    }
                  ]
                },
                id: jsonRpcMessage.id
              };
              break;
              
            case 'getAccountBalance':
              toolResponse = {
                jsonrpc: '2.0',
                result: {
                  content: [
                    {
                      type: 'text',
                      text: `💳 Account ${args.accountId} balance: $1,234.56 (Demo data)`
                    }
                  ]
                },
                id: jsonRpcMessage.id
              };
              break;
              
            case 'getTransactionHistory':
              toolResponse = {
                jsonrpc: '2.0',
                result: {
                  content: [
                    {
                      type: 'text',
                      text: `📊 Transaction history for account ${args.accountId}:\n- 2024-01-10: -$50.00 Grocery shopping\n- 2024-01-09: +$500.00 Salary\n- 2024-01-08: -$25.00 Coffee (Demo data)`
                    }
                  ]
                },
                id: jsonRpcMessage.id
              };
              break;
              
            case 'getTotalBalance':
              toolResponse = {
                jsonrpc: '2.0',
                result: {
                  content: [
                    {
                      type: 'text',
                      text: `💰 Total balance across all accounts: $5,678.90 (Demo data)`
                    }
                  ]
                },
                id: jsonRpcMessage.id
              };
              break;
              
            case 'getRecentTransactions':
              const limit = args?.limit || 10;
              const typeFilter = args?.type || 'all';
              toolResponse = {
                jsonrpc: '2.0',
                result: {
                  content: [
                    {
                      type: 'text',
                      text: `📋 Recent ${limit} transactions (${typeFilter}):\n- 2024-01-10: -$50.00 Grocery shopping\n- 2024-01-09: +$500.00 Salary\n- 2024-01-08: -$25.00 Coffee\n- 2024-01-07: -$100.00 Utilities (Demo data)`
                    }
                  ]
                },
                id: jsonRpcMessage.id
              };
              break;
              
            case 'getUserAccounts':
              toolResponse = {
                jsonrpc: '2.0',
                result: {
                  content: [
                    {
                      type: 'text',
                      text: `🏦 User accounts:\n- Account 1: Checking - $1,234.56\n- Account 2: Savings - $4,444.34\n- Account 3: Credit Card - -$0.00 (Demo data)`
                    }
                  ]
                },
                id: jsonRpcMessage.id
              };
              break;
              
            default:
              toolResponse = {
                jsonrpc: '2.0',
                error: {
                  code: -32601,
                  message: `Unknown tool: ${name}`
                },
                id: jsonRpcMessage.id
              };
          }
          
          console.log('✅ Sending tools/call response:', JSON.stringify(toolResponse, null, 2));
          res.json(toolResponse);
          return;
          
        } catch (error: any) {
          console.error('Tool execution error:', error);
          res.status(500).json({
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: `Tool execution failed: ${error.message}`
            },
            id: jsonRpcMessage.id
          });
          return;
        }
      }
      
      // Unknown method
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32601,
          message: `Method not found: ${jsonRpcMessage.method}`
        },
        id: jsonRpcMessage.id
      });
      return;
    }
    
    // Unsupported method
    res.status(405).json({
      error: 'method_not_allowed',
      error_description: 'Only GET and POST methods are supported'
    });

  } catch (error: any) {
    console.error('MCP endpoint error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal error'
        },
        id: null
      });
    }
  }
});

export default router; 