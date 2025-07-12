import { Router } from 'express';
import { McpController } from '../controllers/McpController';

const router = Router();
const mcpController = new McpController();

// MCP Protocol endpoints
router.get('/tools', mcpController.listTools);
router.post('/call', mcpController.callTool);

// Modern StreamableHTTP endpoint for MCP - правильная реализация
router.all('/sse', async (req, res): Promise<void> => {
  console.log('📡 MCP connection attempt from:', req.get('User-Agent'));
  console.log('📡 Method:', req.method);
  console.log('📡 Headers:', JSON.stringify(req.headers, null, 2));
  console.log('📡 Body:', JSON.stringify(req.body, null, 2));
  
  try {
    if (req.method === 'GET') {
      // GET request - start SSE stream for server-to-client communication
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Accept, Authorization, Content-Type',
      });
      
      // Keep the connection alive
      const keepAlive = setInterval(() => {
        res.write('data: {}\n\n');
      }, 30000);
      
      req.on('close', () => {
        clearInterval(keepAlive);
      });
      
      console.log('✅ SSE stream established for GET request');
      return;
    }
    
    if (req.method === 'POST') {
      // POST request - handle JSON-RPC message
      const jsonRpcMessage = req.body;
      
      if (!jsonRpcMessage || typeof jsonRpcMessage !== 'object') {
        res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32700,
            message: 'Parse error'
          },
          id: null
        });
        return;
      }
      
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