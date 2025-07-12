import { Request, Response } from 'express';
import { OAuthService } from '../services/OAuthService';
import { TransactionService } from '../services/TransactionService';
import { AccountService } from '../services/AccountService';
import { AnalyticsService } from '../services/AnalyticsService';

interface McpTool {
  name: string;
  description: string;
  inputSchema: object;
}

interface McpRequest {
  method: string;
  params: {
    name: string;
    arguments?: any;
  };
}

export class McpController {
  private oauthService: OAuthService;
  private transactionService: TransactionService;
  private accountService: AccountService;
  private analyticsService: AnalyticsService;

  constructor() {
    this.oauthService = new OAuthService();
    this.transactionService = new TransactionService();
    this.accountService = new AccountService();
    this.analyticsService = new AnalyticsService();
  }

  /**
   * List available MCP tools
   */
  listTools = async (req: Request, res: Response): Promise<void> => {
    try {
      const token = this.extractToken(req);
      if (!token) {
        res.status(401).json({ error: 'unauthorized', error_description: 'No access token provided' });
        return;
      }

      const tokenInfo = await this.oauthService.validateAccessToken(token);
      if (!tokenInfo) {
        res.status(401).json({ error: 'invalid_token', error_description: 'Invalid or expired access token' });
        return;
      }

      const tools: McpTool[] = [
        {
          name: 'addTransaction',
          description: 'Add a new financial transaction',
          inputSchema: {
            type: 'object',
            properties: {
              accountId: { type: 'number', description: 'Account ID' },
              amount: { type: 'number', description: 'Transaction amount' },
              description: { type: 'string', description: 'Transaction description' },
              category: { type: 'string', description: 'Transaction category' },
              type: { type: 'string', enum: ['income', 'expense'], description: 'Transaction type' }
            },
            required: ['accountId', 'amount', 'description', 'type']
          }
        },
        {
          name: 'getAccountBalance',
          description: 'Get the current balance of an account',
          inputSchema: {
            type: 'object',
            properties: {
              accountId: { type: 'number', description: 'Account ID' }
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
              accountId: { type: 'number', description: 'Account ID' },
              limit: { type: 'number', description: 'Number of transactions to retrieve', default: 10 },
              offset: { type: 'number', description: 'Number of transactions to skip', default: 0 }
            },
            required: ['accountId']
          }
        },
        {
          name: 'getSpendingAnalysis',
          description: 'Get spending analysis and insights',
          inputSchema: {
            type: 'object',
            properties: {
              userId: { type: 'number', description: 'User ID' },
              period: { type: 'string', enum: ['week', 'month', 'year'], description: 'Analysis period', default: 'month' }
            },
            required: ['userId']
          }
        },
        {
          name: 'getAllAccounts',
          description: 'Get all accounts for the user',
          inputSchema: {
            type: 'object',
            properties: {
              userId: { type: 'number', description: 'User ID' }
            },
            required: ['userId']
          }
        },
        {
          name: 'createAccount',
          description: 'Create a new account',
          inputSchema: {
            type: 'object',
            properties: {
              userId: { type: 'number', description: 'User ID' },
              name: { type: 'string', description: 'Account name' },
              type: { type: 'string', description: 'Account type' },
              initialBalance: { type: 'number', description: 'Initial account balance', default: 0 }
            },
            required: ['userId', 'name', 'type']
          }
        }
      ];

      res.json({
        tools: tools.filter(tool => this.hasRequiredScope(tokenInfo.scope, tool.name))
      });
    } catch (error) {
      console.error('List tools error:', error);
      res.status(500).json({ error: 'server_error', error_description: 'Unable to list tools' });
    }
  };

  /**
   * Execute an MCP tool
   */
  callTool = async (req: Request, res: Response): Promise<void> => {
    try {
      const token = this.extractToken(req);
      if (!token) {
        res.status(401).json({ error: 'unauthorized', error_description: 'No access token provided' });
        return;
      }

      const tokenInfo = await this.oauthService.validateAccessToken(token);
      if (!tokenInfo) {
        res.status(401).json({ error: 'invalid_token', error_description: 'Invalid or expired access token' });
        return;
      }

      const { method, params } = req.body as McpRequest;
      
      if (method !== 'tools/call') {
        res.status(400).json({ error: 'invalid_request', error_description: 'Only tools/call method is supported' });
        return;
      }

      const toolName = params.name;
      const toolArgs = params.arguments || {};

      // Check if user has required scope for this tool
      if (!this.hasRequiredScope(tokenInfo.scope, toolName)) {
        res.status(403).json({ error: 'insufficient_scope', error_description: `Insufficient scope for tool ${toolName}` });
        return;
      }

      const result = await this.executeTool(toolName, toolArgs, tokenInfo.user_id);
      res.json({ content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] });
    } catch (error) {
      console.error('Call tool error:', error);
      res.status(500).json({ error: 'server_error', error_description: 'Unable to execute tool' });
    }
  };

  private extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  private hasRequiredScope(tokenScope: string, toolName: string): boolean {
    const scopes = tokenScope.split(' ');
    
    // Check for general MCP scopes
    if (scopes.includes('mcp:tools:call')) {
      return true;
    }

    // Check for specific tool scopes
    const toolScopeMap: { [key: string]: string[] } = {
      'addTransaction': ['wallet:transactions:write'],
      'getAccountBalance': ['wallet:accounts:read'],
      'getTransactionHistory': ['wallet:transactions:read'],
      'getSpendingAnalysis': ['wallet:analytics:read'],
      'getAllAccounts': ['wallet:accounts:read'],
      'createAccount': ['wallet:accounts:write']
    };

    const requiredScopes = toolScopeMap[toolName];
    if (!requiredScopes) {
      return false;
    }

    return requiredScopes.some(scope => scopes.includes(scope));
  }

  private async executeTool(toolName: string, args: any, userId?: number): Promise<any> {
    switch (toolName) {
      case 'addTransaction':
        if (!userId) {
          throw new Error('User ID is required for addTransaction');
        }
        return await this.transactionService.createTransaction(userId, {
          accountId: args.accountId,
          amount: args.amount,
          description: args.description,
          type: args.type
        });

      case 'getAccountBalance':
        if (!userId) {
          throw new Error('User ID is required for getAccountBalance');
        }
        return await this.accountService.getAccountBalance(args.accountId, userId);

      case 'getTransactionHistory':
        if (!userId) {
          throw new Error('User ID is required for getTransactionHistory');
        }
        return await this.transactionService.getTransactionsByAccount(
          args.accountId,
          userId,
          { limit: args.limit || 10, page: Math.floor((args.offset || 0) / (args.limit || 10)) + 1 }
        );

      case 'getSpendingAnalysis':
        if (!userId) {
          throw new Error('User ID is required for getSpendingAnalysis');
        }
        // Use spending patterns since there's no exact getSpendingAnalysis method
        return await this.analyticsService.getSpendingPatterns(userId, args.period === 'year' ? 12 : args.period === 'week' ? 1 : 6);

      case 'getAllAccounts':
        if (!userId) {
          throw new Error('User ID is required for getAllAccounts');
        }
        return await this.accountService.getUserAccounts(userId);

      case 'createAccount':
        return await this.accountService.createAccount(args.userId, {
          name: args.name,
          balance: args.initialBalance || 0
        });

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }
} 