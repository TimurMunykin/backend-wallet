import { Router } from 'express';
import { McpController } from '../controllers/McpController';
import { AuthenticatedRequest } from '../middleware/auth';
import { OAuthService } from '../services/OAuthService';
import { AuthService } from '../services/AuthService';
import { AccountService } from '../services/AccountService';
import { TransactionService } from '../services/TransactionService';

const router = Router();
const mcpController = new McpController();
const oauthService = OAuthService.getInstance();
const authService = new AuthService();
const accountService = new AccountService();
const transactionService = new TransactionService();

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
              try {
                const transaction = await transactionService.createTransaction(user.userId, {
                  accountId: args.accountId,
                  amount: args.amount,
                  type: args.type,
                  description: args.description,
                  transactionDate: new Date()
                });
                
                const account = await accountService.getAccountById(args.accountId, user.userId);
                
                toolResponse = {
                  jsonrpc: '2.0',
                  result: {
                    content: [
                      {
                        type: 'text',
                        text: `💰 Transaction added successfully!\n- Amount: ${args.type === 'expense' ? '-' : '+'}$${args.amount.toFixed(2)}\n- Description: ${args.description}\n- Account: ${account?.name || 'Unknown Account'}\n- Date: ${new Date().toLocaleDateString()}`
                      }
                    ]
                  },
                  id: jsonRpcMessage.id
                };
              } catch (error: any) {
                console.error('Error adding transaction:', error);
                toolResponse = {
                  jsonrpc: '2.0',
                  error: {
                    code: -32603,
                    message: `Failed to add transaction: ${error.message}`
                  },
                  id: jsonRpcMessage.id
                };
              }
              break;
              
            case 'getAccountBalance':
              try {
                const balance = await accountService.getAccountBalance(args.accountId, user.userId);
                const account = await accountService.getAccountById(args.accountId, user.userId);
                
                toolResponse = {
                  jsonrpc: '2.0',
                  result: {
                    content: [
                      {
                        type: 'text',
                        text: `💳 Account ${account?.name || args.accountId} balance: $${balance.toFixed(2)}`
                      }
                    ]
                  },
                  id: jsonRpcMessage.id
                };
              } catch (error: any) {
                console.error('Error getting account balance:', error);
                toolResponse = {
                  jsonrpc: '2.0',
                  error: {
                    code: -32603,
                    message: `Failed to get account balance: ${error.message}`
                  },
                  id: jsonRpcMessage.id
                };
              }
              break;
              
            case 'getTransactionHistory':
              try {
                const result = await transactionService.getTransactionsByAccount(
                  args.accountId,
                  user.userId,
                  { limit: args.limit || 10, page: 1 }
                );
                
                const account = await accountService.getAccountById(args.accountId, user.userId);
                const transactionsText = result.transactions.length > 0
                  ? result.transactions.map(t => 
                      `- ${t.transaction_date.toLocaleDateString()}: ${t.type === 'expense' ? '-' : '+'}$${t.amount.toFixed(2)} ${t.description}`
                    ).join('\n')
                  : 'No transactions found';
                
                toolResponse = {
                  jsonrpc: '2.0',
                  result: {
                    content: [
                      {
                        type: 'text',
                        text: `📊 Transaction history for account ${account?.name || args.accountId}:\n${transactionsText}`
                      }
                    ]
                  },
                  id: jsonRpcMessage.id
                };
              } catch (error: any) {
                console.error('Error getting transaction history:', error);
                toolResponse = {
                  jsonrpc: '2.0',
                  error: {
                    code: -32603,
                    message: `Failed to get transaction history: ${error.message}`
                  },
                  id: jsonRpcMessage.id
                };
              }
              break;
              
            case 'getTotalBalance':
              try {
                const totalBalance = await accountService.getTotalBalance(user.userId);
                toolResponse = {
                  jsonrpc: '2.0',
                  result: {
                    content: [
                      {
                        type: 'text',
                        text: `💰 Total balance across all accounts: $${totalBalance.toFixed(2)}`
                      }
                    ]
                  },
                  id: jsonRpcMessage.id
                };
              } catch (error: any) {
                console.error('Error getting total balance:', error);
                toolResponse = {
                  jsonrpc: '2.0',
                  error: {
                    code: -32603,
                    message: `Failed to get total balance: ${error.message}`
                  },
                  id: jsonRpcMessage.id
                };
              }
              break;
              
            case 'getRecentTransactions':
              try {
                const limit = args?.limit || 10;
                const typeFilter = args?.type;
                
                const result = await transactionService.getTransactions(
                  user.userId,
                  typeFilter ? { type: typeFilter } : {},
                  { limit, page: 1 }
                );
                
                const transactionsText = result.transactions.length > 0
                  ? result.transactions.map(t => 
                      `- ${t.transaction_date.toLocaleDateString()}: ${t.type === 'expense' ? '-' : '+'}$${t.amount.toFixed(2)} ${t.description} (${t.account?.name || 'Unknown Account'})`
                    ).join('\n')
                  : 'No transactions found';
                
                toolResponse = {
                  jsonrpc: '2.0',
                  result: {
                    content: [
                      {
                        type: 'text',
                        text: `📋 Recent ${limit} transactions${typeFilter ? ` (${typeFilter})` : ''}:\n${transactionsText}`
                      }
                    ]
                  },
                  id: jsonRpcMessage.id
                };
              } catch (error: any) {
                console.error('Error getting recent transactions:', error);
                toolResponse = {
                  jsonrpc: '2.0',
                  error: {
                    code: -32603,
                    message: `Failed to get recent transactions: ${error.message}`
                  },
                  id: jsonRpcMessage.id
                };
              }
              break;
              
            case 'getUserAccounts':
              try {
                const accounts = await accountService.getUserAccounts(user.userId);
                const accountsText = accounts.length > 0 
                  ? accounts.map(acc => `- ${acc.name}: $${acc.balance.toFixed(2)}`).join('\n')
                  : 'No accounts found';
                
                toolResponse = {
                  jsonrpc: '2.0',
                  result: {
                    content: [
                      {
                        type: 'text',
                        text: `🏦 User accounts:\n${accountsText}`
                      }
                    ]
                  },
                  id: jsonRpcMessage.id
                };
              } catch (error: any) {
                console.error('Error getting user accounts:', error);
                toolResponse = {
                  jsonrpc: '2.0',
                  error: {
                    code: -32603,
                    message: `Failed to get user accounts: ${error.message}`
                  },
                  id: jsonRpcMessage.id
                };
              }
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