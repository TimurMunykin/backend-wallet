import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

class BackendWalletMcpServer {
  private server: any;
  private apiBaseUrl: string;
  private authToken: string = "";

  constructor() {
    this.apiBaseUrl = process.env.BACKEND_API_URL || "http://localhost:3000/api";
    // For STDIO transport, get auth token from environment
    this.authToken = process.env.BACKEND_AUTH_TOKEN || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjIsImVtYWlsIjoiYWFhYXRlc3QyQGdtYWlsLmNvbSIsImlhdCI6MTc1MjA3ODgwMSwiZXhwIjoxNzUyMDgyNDAxLCJhdWQiOiJmaW5hbmNlLWFwcC11c2VycyIsImlzcyI6ImZpbmFuY2UtYXBwIn0.lPvNPYea9wePQgVwOHgn-kik0DdXvY0jTiULotDoqMo";
  }

  async initialize() {
    // Dynamic import for ES modules
    const { Server } = await import("@modelcontextprotocol/sdk/server/index.js");
    const { StdioServerTransport } = await import("@modelcontextprotocol/sdk/server/stdio.js");
    const {
      ListToolsRequestSchema,
      CallToolRequestSchema,
      ErrorCode,
      McpError,
    } = await import("@modelcontextprotocol/sdk/types.js");

    this.server = new Server({
      name: "backend-wallet-mcp-server",
      version: "1.0.0",
    }, {
      capabilities: {
        tools: {},
      },
    });

    // Store the imported classes for later use
    this.setupHandlers(ListToolsRequestSchema, CallToolRequestSchema, ErrorCode, McpError);
    
    return { StdioServerTransport };
  }

  private setupHandlers(ListToolsRequestSchema: any, CallToolRequestSchema: any, ErrorCode: any, McpError: any): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "ping",
            description: "Test API connection with a simple ping",
            inputSchema: {
              type: "object",
              properties: {},
              required: [],
            },
          },
          {
            name: "getTotalBalance",
            description: "Get the total balance across all user accounts",
            inputSchema: {
              type: "object",
              properties: {
                userId: {
                  type: "string",
                  description: "User ID for authentication (will be replaced with JWT token)",
                },
              },
              required: ["userId"],
            },
          },
          {
            name: "getRecentTransactions",
            description: "Get recent transactions with optional filtering",
            inputSchema: {
              type: "object",
              properties: {
                userId: {
                  type: "string",
                  description: "User ID for authentication (will be replaced with JWT token)",
                },
                limit: {
                  type: "number",
                  description: "Number of transactions to retrieve (default: 10)",
                  default: 10,
                },
                accountId: {
                  type: "number",
                  description: "Filter by specific account ID",
                },
                type: {
                  type: "string",
                  enum: ["income", "expense"],
                  description: "Filter by transaction type",
                },
              },
              required: ["userId"],
            },
          },
          {
            name: "getUserAccounts",
            description: "Get all user accounts with their balances",
            inputSchema: {
              type: "object",
              properties: {
                userId: {
                  type: "string",
                  description: "User ID for authentication (will be replaced with JWT token)",
                },
              },
              required: ["userId"],
            },
          },
          {
            name: "createAccount",
            description: "Create a new account",
            inputSchema: {
              type: "object",
              properties: {
                userId: {
                  type: "string",
                  description: "User ID for authentication (will be replaced with JWT token)",
                },
                name: {
                  type: "string",
                  description: "Account name",
                },
                balance: {
                  type: "number",
                  description: "Initial balance (default: 0)",
                  default: 0,
                },
                currency: {
                  type: "string",
                  description: "Currency code (default: USD)",
                  default: "USD",
                },
              },
              required: ["userId", "name"],
            },
          },
          {
            name: "getAccountById",
            description: "Get account details by ID",
            inputSchema: {
              type: "object",
              properties: {
                userId: {
                  type: "string",
                  description: "User ID for authentication (will be replaced with JWT token)",
                },
                accountId: {
                  type: "number",
                  description: "Account ID to retrieve",
                },
              },
              required: ["userId", "accountId"],
            },
          },
          {
            name: "updateAccount",
            description: "Update an existing account",
            inputSchema: {
              type: "object",
              properties: {
                userId: {
                  type: "string",
                  description: "User ID for authentication (will be replaced with JWT token)",
                },
                accountId: {
                  type: "number",
                  description: "Account ID to update",
                },
                name: {
                  type: "string",
                  description: "New account name",
                },
                currency: {
                  type: "string",
                  description: "New currency code",
                },
              },
              required: ["userId", "accountId"],
            },
          },
          {
            name: "deleteAccount",
            description: "Delete an account",
            inputSchema: {
              type: "object",
              properties: {
                userId: {
                  type: "string",
                  description: "User ID for authentication (will be replaced with JWT token)",
                },
                accountId: {
                  type: "number",
                  description: "Account ID to delete",
                },
              },
              required: ["userId", "accountId"],
            },
          },
          {
            name: "createTransaction",
            description: "Create a new transaction",
            inputSchema: {
              type: "object",
              properties: {
                userId: {
                  type: "string",
                  description: "User ID for authentication (will be replaced with JWT token)",
                },
                accountId: {
                  type: "number",
                  description: "Account ID for the transaction",
                },
                amount: {
                  type: "number",
                  description: "Transaction amount",
                },
                type: {
                  type: "string",
                  enum: ["income", "expense"],
                  description: "Transaction type",
                },
                description: {
                  type: "string",
                  description: "Transaction description",
                },
                transactionDate: {
                  type: "string",
                  description: "Transaction date (ISO format, defaults to current date)",
                },
              },
              required: ["userId", "accountId", "amount", "type", "description"],
            },
          },
          {
            name: "getTransactionById",
            description: "Get transaction details by ID",
            inputSchema: {
              type: "object",
              properties: {
                userId: {
                  type: "string",
                  description: "User ID for authentication (will be replaced with JWT token)",
                },
                transactionId: {
                  type: "number",
                  description: "Transaction ID to retrieve",
                },
              },
              required: ["userId", "transactionId"],
            },
          },
          {
            name: "updateTransaction",
            description: "Update an existing transaction",
            inputSchema: {
              type: "object",
              properties: {
                userId: {
                  type: "string",
                  description: "User ID for authentication (will be replaced with JWT token)",
                },
                transactionId: {
                  type: "number",
                  description: "Transaction ID to update",
                },
                accountId: {
                  type: "number",
                  description: "New account ID",
                },
                amount: {
                  type: "number",
                  description: "New amount",
                },
                type: {
                  type: "string",
                  enum: ["income", "expense"],
                  description: "New transaction type",
                },
                description: {
                  type: "string",
                  description: "New description",
                },
                transactionDate: {
                  type: "string",
                  description: "New transaction date (ISO format)",
                },
              },
              required: ["userId", "transactionId"],
            },
          },
          {
            name: "deleteTransaction",
            description: "Delete a transaction",
            inputSchema: {
              type: "object",
              properties: {
                userId: {
                  type: "string",
                  description: "User ID for authentication (will be replaced with JWT token)",
                },
                transactionId: {
                  type: "number",
                  description: "Transaction ID to delete",
                },
              },
              required: ["userId", "transactionId"],
            },
          },
          {
            name: "getRecurringPayments",
            description: "Get user's recurring payments",
            inputSchema: {
              type: "object",
              properties: {
                userId: {
                  type: "string",
                  description: "User ID for authentication (will be replaced with JWT token)",
                },
              },
              required: ["userId"],
            },
          },
          {
            name: "createRecurringPayment",
            description: "Create a new recurring payment",
            inputSchema: {
              type: "object",
              properties: {
                userId: {
                  type: "string",
                  description: "User ID for authentication (will be replaced with JWT token)",
                },
                accountId: {
                  type: "number",
                  description: "Account ID for the recurring payment",
                },
                amount: {
                  type: "number",
                  description: "Payment amount",
                },
                type: {
                  type: "string",
                  enum: ["income", "expense"],
                  description: "Payment type",
                },
                description: {
                  type: "string",
                  description: "Payment description",
                },
                frequency: {
                  type: "string",
                  enum: ["daily", "weekly", "monthly"],
                  description: "Payment frequency",
                },
                startDate: {
                  type: "string",
                  description: "Start date (ISO format)",
                },
                endDate: {
                  type: "string",
                  description: "End date (ISO format, optional)",
                },
                dayOfMonth: {
                  type: "number",
                  description: "Day of month (1-31, for monthly frequency)",
                },
                dayOfWeek: {
                  type: "number",
                  description: "Day of week (0-6, for weekly frequency)",
                },
              },
              required: ["userId", "accountId", "amount", "type", "description", "frequency", "startDate"],
            },
          },
          {
            name: "updateRecurringPayment",
            description: "Update an existing recurring payment",
            inputSchema: {
              type: "object",
              properties: {
                userId: {
                  type: "string",
                  description: "User ID for authentication (will be replaced with JWT token)",
                },
                recurringPaymentId: {
                  type: "number",
                  description: "Recurring payment ID to update",
                },
                accountId: {
                  type: "number",
                  description: "New account ID",
                },
                amount: {
                  type: "number",
                  description: "New amount",
                },
                type: {
                  type: "string",
                  enum: ["income", "expense"],
                  description: "New payment type",
                },
                description: {
                  type: "string",
                  description: "New description",
                },
                frequency: {
                  type: "string",
                  enum: ["daily", "weekly", "monthly"],
                  description: "New frequency",
                },
                startDate: {
                  type: "string",
                  description: "New start date (ISO format)",
                },
                endDate: {
                  type: "string",
                  description: "New end date (ISO format)",
                },
                dayOfMonth: {
                  type: "number",
                  description: "New day of month (1-31)",
                },
                dayOfWeek: {
                  type: "number",
                  description: "New day of week (0-6)",
                },
              },
              required: ["userId", "recurringPaymentId"],
            },
          },
          {
            name: "deleteRecurringPayment",
            description: "Delete a recurring payment",
            inputSchema: {
              type: "object",
              properties: {
                userId: {
                  type: "string",
                  description: "User ID for authentication (will be replaced with JWT token)",
                },
                recurringPaymentId: {
                  type: "number",
                  description: "Recurring payment ID to delete",
                },
              },
              required: ["userId", "recurringPaymentId"],
            },
          },
          {
            name: "getGoals",
            description: "Get user's goals",
            inputSchema: {
              type: "object",
              properties: {
                userId: {
                  type: "string",
                  description: "User ID for authentication (will be replaced with JWT token)",
                },
                hierarchical: {
                  type: "boolean",
                  description: "Return hierarchical goals with children nested",
                  default: false,
                },
              },
              required: ["userId"],
            },
          },
          {
            name: "createGoal",
            description: "Create a new goal",
            inputSchema: {
              type: "object",
              properties: {
                userId: {
                  type: "string",
                  description: "User ID for authentication (will be replaced with JWT token)",
                },
                title: {
                  type: "string",
                  description: "Goal title",
                },
                targetAmount: {
                  type: "number",
                  description: "Target amount for the goal",
                },
                minBalance: {
                  type: "number",
                  description: "Minimum balance required",
                  default: 0,
                },
                targetDate: {
                  type: "string",
                  description: "Target date (ISO format)",
                },
                description: {
                  type: "string",
                  description: "Goal description",
                },
                parentGoalId: {
                  type: "number",
                  description: "Parent goal ID (for sub-goals)",
                },
              },
              required: ["userId", "title", "targetAmount", "targetDate"],
            },
          },
          {
            name: "updateGoal",
            description: "Update an existing goal",
            inputSchema: {
              type: "object",
              properties: {
                userId: {
                  type: "string",
                  description: "User ID for authentication (will be replaced with JWT token)",
                },
                goalId: {
                  type: "number",
                  description: "Goal ID to update",
                },
                title: {
                  type: "string",
                  description: "New title",
                },
                targetAmount: {
                  type: "number",
                  description: "New target amount",
                },
                minBalance: {
                  type: "number",
                  description: "New minimum balance",
                },
                targetDate: {
                  type: "string",
                  description: "New target date (ISO format)",
                },
                description: {
                  type: "string",
                  description: "New description",
                },
                parentGoalId: {
                  type: "number",
                  description: "New parent goal ID",
                },
              },
              required: ["userId", "goalId"],
            },
          },
          {
            name: "deleteGoal",
            description: "Delete a goal",
            inputSchema: {
              type: "object",
              properties: {
                userId: {
                  type: "string",
                  description: "User ID for authentication (will be replaced with JWT token)",
                },
                goalId: {
                  type: "number",
                  description: "Goal ID to delete",
                },
              },
              required: ["userId", "goalId"],
            },
          },
          {
            name: "getGoalProgress",
            description: "Get goal progress information",
            inputSchema: {
              type: "object",
              properties: {
                userId: {
                  type: "string",
                  description: "User ID for authentication (will be replaced with JWT token)",
                },
                goalId: {
                  type: "number",
                  description: "Goal ID to get progress for",
                },
              },
              required: ["userId", "goalId"],
            },
          },
          {
            name: "getDailySpendingConfigs",
            description: "Get user's daily spending configurations",
            inputSchema: {
              type: "object",
              properties: {
                userId: {
                  type: "string",
                  description: "User ID for authentication (will be replaced with JWT token)",
                },
              },
              required: ["userId"],
            },
          },
          {
            name: "createDailySpendingConfig",
            description: "Create a daily spending configuration",
            inputSchema: {
              type: "object",
              properties: {
                userId: {
                  type: "string",
                  description: "User ID for authentication (will be replaced with JWT token)",
                },
                name: {
                  type: "string",
                  description: "Configuration name",
                },
                periodType: {
                  type: "string",
                  enum: ["toSalary", "toMonthEnd", "customDays", "toSpecificDate"],
                  description: "Period type",
                },
                periodValue: {
                  type: "number",
                  description: "Period value (days or specific date)",
                },
                includeSalary: {
                  type: "boolean",
                  description: "Include salary in calculations",
                  default: true,
                },
                includeRecurringIncome: {
                  type: "boolean",
                  description: "Include recurring income",
                  default: true,
                },
                includeRecurringExpenses: {
                  type: "boolean",
                  description: "Include recurring expenses",
                  default: true,
                },
                selectedGoalIds: {
                  type: "array",
                  items: { type: "number" },
                  description: "Array of goal IDs to include",
                },
                emergencyBuffer: {
                  type: "number",
                  description: "Emergency buffer amount",
                  default: 0,
                },
              },
              required: ["userId", "name", "periodType"],
            },
          },
          {
            name: "updateDailySpendingConfig",
            description: "Update a daily spending configuration",
            inputSchema: {
              type: "object",
              properties: {
                userId: {
                  type: "string",
                  description: "User ID for authentication (will be replaced with JWT token)",
                },
                configId: {
                  type: "number",
                  description: "Configuration ID to update",
                },
                name: {
                  type: "string",
                  description: "New configuration name",
                },
                periodType: {
                  type: "string",
                  enum: ["to_salary", "to_month_end", "custom_days", "to_date"],
                  description: "New period type",
                },
                periodValue: {
                  type: "number",
                  description: "New period value",
                },
                includeSalary: {
                  type: "boolean",
                  description: "Include salary in calculations",
                },
                includeRecurringIncome: {
                  type: "boolean",
                  description: "Include recurring income",
                },
                includeRecurringExpenses: {
                  type: "boolean",
                  description: "Include recurring expenses",
                },
                selectedGoalIds: {
                  type: "array",
                  items: { type: "number" },
                  description: "Array of goal IDs to include",
                },
                emergencyBuffer: {
                  type: "number",
                  description: "Emergency buffer amount",
                },
              },
              required: ["userId", "configId"],
            },
          },
          {
            name: "deleteDailySpendingConfig",
            description: "Delete a daily spending configuration",
            inputSchema: {
              type: "object",
              properties: {
                userId: {
                  type: "string",
                  description: "User ID for authentication (will be replaced with JWT token)",
                },
                configId: {
                  type: "number",
                  description: "Configuration ID to delete",
                },
              },
              required: ["userId", "configId"],
            },
          },
          {
            name: "calculateDailySpending",
            description: "Calculate daily spending limit",
            inputSchema: {
              type: "object",
              properties: {
                userId: {
                  type: "string",
                  description: "User ID for authentication (will be replaced with JWT token)",
                },
                configId: {
                  type: "number",
                  description: "Configuration ID to use for calculation (optional, uses active config if not provided)",
                },
              },
              required: ["userId"],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "ping":
            return await this.ping(args);
          case "getTotalBalance":
            return await this.getTotalBalance(args);
          case "getRecentTransactions":
            return await this.getRecentTransactions(args);
          case "getUserAccounts":
            return await this.getUserAccounts(args);
          case "createAccount":
            return await this.createAccount(args);
          case "getAccountById":
            return await this.getAccountById(args);
          case "updateAccount":
            return await this.updateAccount(args);
          case "deleteAccount":
            return await this.deleteAccount(args);
          case "createTransaction":
            return await this.createTransaction(args);
          case "getTransactionById":
            return await this.getTransactionById(args);
          case "updateTransaction":
            return await this.updateTransaction(args);
          case "deleteTransaction":
            return await this.deleteTransaction(args);
          case "getRecurringPayments":
            return await this.getRecurringPayments(args);
          case "createRecurringPayment":
            return await this.createRecurringPayment(args);
          case "updateRecurringPayment":
            return await this.updateRecurringPayment(args);
          case "deleteRecurringPayment":
            return await this.deleteRecurringPayment(args);
          case "getGoals":
            return await this.getGoals(args);
          case "createGoal":
            return await this.createGoal(args);
          case "updateGoal":
            return await this.updateGoal(args);
          case "deleteGoal":
            return await this.deleteGoal(args);
          case "getGoalProgress":
            return await this.getGoalProgress(args);
          case "getDailySpendingConfigs":
            return await this.getDailySpendingConfigs(args);
          case "createDailySpendingConfig":
            return await this.createDailySpendingConfig(args);
          case "updateDailySpendingConfig":
            return await this.updateDailySpendingConfig(args);
          case "deleteDailySpendingConfig":
            return await this.deleteDailySpendingConfig(args);
          case "calculateDailySpending":
            return await this.calculateDailySpending(args);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  private async makeApiRequest(endpoint: string, params?: any): Promise<any> {
    try {
      const headers: any = {
        'Content-Type': 'application/json',
      };
      
      // Don't add Authorization header for ping endpoint
      if (endpoint !== '/ping') {
        if (!this.authToken) {
          throw new Error('No authentication token available. Please set BACKEND_AUTH_TOKEN environment variable.');
        }
        headers['Authorization'] = `Bearer ${this.authToken}`;
      }
      
      const response = await axios.get(`${this.apiBaseUrl}${endpoint}`, {
        params,
        headers,
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const { ErrorCode, McpError } = await import("@modelcontextprotocol/sdk/types.js");
        throw new McpError(
          ErrorCode.InternalError,
          `API request failed: ${error.response?.data?.message || error.message}`
        );
      }
      throw error;
    }
  }

  private async makeApiRequestWithBody(endpoint: string, method: 'POST' | 'PUT' | 'DELETE', body?: any): Promise<any> {
    try {
      const headers: any = {
        'Content-Type': 'application/json',
      };
      
      if (!this.authToken) {
        throw new Error('No authentication token available. Please set BACKEND_AUTH_TOKEN environment variable.');
      }
      headers['Authorization'] = `Bearer ${this.authToken}`;
      
      const response = await axios({
        method,
        url: `${this.apiBaseUrl}${endpoint}`,
        data: body,
        headers,
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const { ErrorCode, McpError } = await import("@modelcontextprotocol/sdk/types.js");
        throw new McpError(
          ErrorCode.InternalError,
          `API request failed: ${error.response?.data?.message || error.message}`
        );
      }
      throw error;
    }
  }

  private async ping(args: any): Promise<any> {
    try {
      const response = await this.makeApiRequest('/ping');
      
      return {
        content: [
          {
            type: "text",
            text: `API Ping Success: ${response.message}\nTimestamp: ${response.timestamp}\nServer: ${response.server}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `API Ping Failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }

  private async getTotalBalance(args: any): Promise<any> {
    const result = await this.makeApiRequest('/accounts/total-balance');
    
    return {
      content: [
        {
          type: "text",
          text: `Total Balance: $${(parseFloat(result.data.totalBalance) || 0).toFixed(2)}`,
        },
      ],
    };
  }

  private async getRecentTransactions(args: any): Promise<any> {
    const params: any = {
      limit: args.limit || 10,
      sortBy: 'transaction_date',
      sortOrder: 'DESC',
    };

    if (args.accountId) {
      params.accountId = args.accountId;
    }

    if (args.type) {
      params.type = args.type;
    }

    const result = await this.makeApiRequest('/transactions', params);
    
    const transactions = result.data.transactions || [];
    const transactionList = transactions.map((tx: any) => 
      `${tx.transaction_date}: ${tx.type === 'income' ? '+' : '-'}$${(parseFloat(tx.amount) || 0).toFixed(2)} - ${tx.description}`
    ).join('\n');

    return {
      content: [
        {
          type: "text",
          text: `Recent Transactions (${transactions.length} results):\n${transactionList}`,
        },
      ],
    };
  }

  private async getUserAccounts(args: any): Promise<any> {
    const result = await this.makeApiRequest('/accounts');
    
    const accounts = result.data || [];
    const accountList = accounts.map((acc: any) => {
      const balance = parseFloat(acc.balance) || 0;
      return `${acc.name}: $${balance.toFixed(2)} ${acc.currency}`;
    }).join('\n');

    return {
      content: [
        {
          type: "text",
          text: `User Accounts (${accounts.length} accounts):\n${accountList}`,
        },
      ],
    };
  }

  private async createAccount(args: any): Promise<any> {
    const { name, balance, currency } = args;
    const result = await this.makeApiRequestWithBody('/accounts', 'POST', {
      name,
      balance: balance || 0,
      currency: currency || 'USD',
    });
    
    const account = result.data;
    return {
      content: [
        {
          type: "text",
          text: `Account created successfully!\nName: ${account.name}\nBalance: $${(parseFloat(account.balance) || 0).toFixed(2)} ${account.currency}\nID: ${account.id}`,
        },
      ],
    };
  }

  private async getAccountById(args: any): Promise<any> {
    const { accountId } = args;
    const result = await this.makeApiRequest(`/accounts/${accountId}`);
    
    const account = result.data;
    return {
      content: [
        {
          type: "text",
          text: `Account Details:\nName: ${account.name}\nBalance: $${(parseFloat(account.balance) || 0).toFixed(2)} ${account.currency}\nID: ${account.id}\nCreated: ${account.created_at}`,
        },
      ],
    };
  }

  private async updateAccount(args: any): Promise<any> {
    const { accountId, name, currency } = args;
    const updateData: any = {};
    
    if (name) updateData.name = name;
    if (currency) updateData.currency = currency;
    
    const result = await this.makeApiRequestWithBody(`/accounts/${accountId}`, 'PUT', updateData);
    
    const account = result.data;
    return {
      content: [
        {
          type: "text",
          text: `Account updated successfully!\nName: ${account.name}\nBalance: $${(parseFloat(account.balance) || 0).toFixed(2)} ${account.currency}\nID: ${account.id}`,
        },
      ],
    };
  }

  private async deleteAccount(args: any): Promise<any> {
    const { accountId } = args;
    const result = await this.makeApiRequestWithBody(`/accounts/${accountId}`, 'DELETE');
    
    return {
      content: [
        {
          type: "text",
          text: result.message || `Account ${accountId} deleted successfully!`,
        },
      ],
    };
  }

  private async createTransaction(args: any): Promise<any> {
    const { accountId, amount, type, description, transactionDate } = args;
    const result = await this.makeApiRequestWithBody('/transactions', 'POST', {
      accountId,
      amount,
      type,
      description,
      transactionDate: transactionDate || new Date().toISOString(),
    });
    
    const transaction = result.data;
    return {
      content: [
        {
          type: "text",
          text: `Transaction created successfully!\nType: ${transaction.type}\nAmount: $${(parseFloat(transaction.amount) || 0).toFixed(2)}\nDescription: ${transaction.description}\nDate: ${transaction.transaction_date}\nID: ${transaction.id}`,
        },
      ],
    };
  }

  private async getTransactionById(args: any): Promise<any> {
    const { transactionId } = args;
    const result = await this.makeApiRequest(`/transactions/${transactionId}`);
    
    const transaction = result.data;
    return {
      content: [
        {
          type: "text",
          text: `Transaction Details:\nType: ${transaction.type}\nAmount: ${transaction.type === 'income' ? '+' : '-'}$${(parseFloat(transaction.amount) || 0).toFixed(2)}\nDescription: ${transaction.description}\nDate: ${transaction.transaction_date}\nAccount ID: ${transaction.account_id}\nID: ${transaction.id}`,
        },
      ],
    };
  }

  private async updateTransaction(args: any): Promise<any> {
    const { transactionId, accountId, amount, type, description, transactionDate } = args;
    const updateData: any = {};
    
    if (accountId) updateData.accountId = accountId;
    if (amount) updateData.amount = amount;
    if (type) updateData.type = type;
    if (description) updateData.description = description;
    if (transactionDate) updateData.transactionDate = transactionDate;
    
    const result = await this.makeApiRequestWithBody(`/transactions/${transactionId}`, 'PUT', updateData);
    
    const transaction = result.data;
    return {
      content: [
        {
          type: "text",
          text: `Transaction updated successfully!\nType: ${transaction.type}\nAmount: $${(parseFloat(transaction.amount) || 0).toFixed(2)}\nDescription: ${transaction.description}\nDate: ${transaction.transaction_date}\nID: ${transaction.id}`,
        },
      ],
    };
  }

  private async deleteTransaction(args: any): Promise<any> {
    const { transactionId } = args;
    const result = await this.makeApiRequestWithBody(`/transactions/${transactionId}`, 'DELETE');
    
    return {
      content: [
        {
          type: "text",
          text: result.message || `Transaction ${transactionId} deleted successfully!`,
        },
      ],
    };
  }

  private async getRecurringPayments(args: any): Promise<any> {
    const result = await this.makeApiRequest('/recurring-payments');
    
    const payments = result.data || [];
    const paymentList = payments.map((payment: any) => 
      `${payment.description}: ${payment.type === 'income' ? '+' : '-'}$${(parseFloat(payment.amount) || 0).toFixed(2)} (${payment.frequency})`
    ).join('\n');

    return {
      content: [
        {
          type: "text",
          text: `Recurring Payments (${payments.length} payments):\n${paymentList}`,
        },
      ],
    };
  }

  private async createRecurringPayment(args: any): Promise<any> {
    const { accountId, amount, type, description, frequency, startDate, endDate, dayOfMonth, dayOfWeek } = args;
    const paymentData: any = {
      accountId,
      amount,
      type,
      description,
      frequency,
      startDate,
    };
    
    if (endDate) paymentData.endDate = endDate;
    if (dayOfMonth) paymentData.dayOfMonth = dayOfMonth;
    if (dayOfWeek) paymentData.dayOfWeek = dayOfWeek;
    
    const result = await this.makeApiRequestWithBody('/recurring-payments', 'POST', paymentData);
    
    const payment = result.data;
    return {
      content: [
        {
          type: "text",
          text: `Recurring payment created successfully!\nDescription: ${payment.description}\nType: ${payment.type}\nAmount: $${(parseFloat(payment.amount) || 0).toFixed(2)}\nFrequency: ${payment.frequency}\nStart Date: ${payment.start_date}\nID: ${payment.id}`,
        },
      ],
    };
  }

  private async updateRecurringPayment(args: any): Promise<any> {
    const { recurringPaymentId, accountId, amount, type, description, frequency, startDate, endDate, dayOfMonth, dayOfWeek } = args;
    const updateData: any = {};
    
    if (accountId) updateData.accountId = accountId;
    if (amount) updateData.amount = amount;
    if (type) updateData.type = type;
    if (description) updateData.description = description;
    if (frequency) updateData.frequency = frequency;
    if (startDate) updateData.startDate = startDate;
    if (endDate) updateData.endDate = endDate;
    if (dayOfMonth) updateData.dayOfMonth = dayOfMonth;
    if (dayOfWeek) updateData.dayOfWeek = dayOfWeek;
    
    const result = await this.makeApiRequestWithBody(`/recurring-payments/${recurringPaymentId}`, 'PUT', updateData);
    
    const payment = result.data;
    return {
      content: [
        {
          type: "text",
          text: `Recurring payment updated successfully!\nDescription: ${payment.description}\nType: ${payment.type}\nAmount: $${(parseFloat(payment.amount) || 0).toFixed(2)}\nFrequency: ${payment.frequency}\nID: ${payment.id}`,
        },
      ],
    };
  }

  private async deleteRecurringPayment(args: any): Promise<any> {
    const { recurringPaymentId } = args;
    const result = await this.makeApiRequestWithBody(`/recurring-payments/${recurringPaymentId}`, 'DELETE');
    
    return {
      content: [
        {
          type: "text",
          text: result.message || `Recurring payment ${recurringPaymentId} deleted successfully!`,
        },
      ],
    };
  }

  private async getGoals(args: any): Promise<any> {
    const { hierarchical } = args;
    const params = hierarchical ? { hierarchical: true } : {};
    const result = await this.makeApiRequest('/goals', params);
    
    const goals = result.data || [];
    const goalList = goals.map((goal: any) => 
      `${goal.title}: $${(parseFloat(goal.target_amount) || 0).toFixed(2)} by ${goal.target_date} ${goal.achieved ? '(Achieved)' : ''}`
    ).join('\n');

    return {
      content: [
        {
          type: "text",
          text: `Goals (${goals.length} goals):\n${goalList}`,
        },
      ],
    };
  }

  private async createGoal(args: any): Promise<any> {
    const { title, targetAmount, minBalance, targetDate, description, parentGoalId } = args;
    const goalData: any = {
      title,
      targetAmount,
      minBalance: minBalance || 0,
      targetDate,
    };
    
    if (description) goalData.description = description;
    if (parentGoalId) goalData.parentGoalId = parentGoalId;
    
    const result = await this.makeApiRequestWithBody('/goals', 'POST', goalData);
    
    const goal = result.data;
    return {
      content: [
        {
          type: "text",
          text: `Goal created successfully!\nTitle: ${goal.title}\nTarget Amount: $${(parseFloat(goal.target_amount) || 0).toFixed(2)}\nTarget Date: ${goal.target_date}\nID: ${goal.id}`,
        },
      ],
    };
  }

  private async updateGoal(args: any): Promise<any> {
    const { goalId, title, targetAmount, minBalance, targetDate, description, parentGoalId } = args;
    const updateData: any = {};
    
    if (title) updateData.title = title;
    if (targetAmount) updateData.targetAmount = targetAmount;
    if (minBalance !== undefined) updateData.minBalance = minBalance;
    if (targetDate) updateData.targetDate = targetDate;
    if (description) updateData.description = description;
    if (parentGoalId) updateData.parentGoalId = parentGoalId;
    
    const result = await this.makeApiRequestWithBody(`/goals/${goalId}`, 'PUT', updateData);
    
    const goal = result.data;
    return {
      content: [
        {
          type: "text",
          text: `Goal updated successfully!\nTitle: ${goal.title}\nTarget Amount: $${(parseFloat(goal.target_amount) || 0).toFixed(2)}\nTarget Date: ${goal.target_date}\nID: ${goal.id}`,
        },
      ],
    };
  }

  private async deleteGoal(args: any): Promise<any> {
    const { goalId } = args;
    const result = await this.makeApiRequestWithBody(`/goals/${goalId}`, 'DELETE');
    
    return {
      content: [
        {
          type: "text",
          text: result.message || `Goal ${goalId} deleted successfully!`,
        },
      ],
    };
  }

  private async getGoalProgress(args: any): Promise<any> {
    const { goalId } = args;
    const result = await this.makeApiRequest(`/goals/${goalId}/progress`);
    
    const progress = result.data;
    return {
      content: [
        {
          type: "text",
          text: `Goal Progress:\nTitle: ${progress.goal.title}\nProgress: ${(parseFloat(progress.progress) || 0).toFixed(1)}%\nRemaining: $${(parseFloat(progress.remainingAmount) || 0).toFixed(2)}\nDays Remaining: ${progress.daysRemaining}\nDaily Target: $${(parseFloat(progress.dailyTargetAmount) || 0).toFixed(2)}`,
        },
      ],
    };
  }

  private async getDailySpendingConfigs(args: any): Promise<any> {
    const result = await this.makeApiRequest('/daily-spending/configs');
    
    const configs = result.data || [];
    const configList = configs.map((config: any) => 
      `${config.name} (${config.periodType}) ${config.isActive ? '(Active)' : ''}`
    ).join('\n');

    return {
      content: [
        {
          type: "text",
          text: `Daily Spending Configs (${configs.length} configs):\n${configList}`,
        },
      ],
    };
  }

  private async createDailySpendingConfig(args: any): Promise<any> {
    const { name, periodType, periodValue, includeSalary, includeRecurringIncome, includeRecurringExpenses, selectedGoalIds, emergencyBuffer } = args;
    const configData: any = {
      name,
      periodType,
      periodValue,
      includeSalary: includeSalary ?? true,
      includeRecurringIncome: includeRecurringIncome ?? true,
      includeRecurringExpenses: includeRecurringExpenses ?? true,
      emergencyBuffer: emergencyBuffer || 0,
    };
    
    if (selectedGoalIds) configData.selectedGoalIds = selectedGoalIds;
    
    const result = await this.makeApiRequestWithBody('/daily-spending/configs', 'POST', configData);
    
    const config = result.data;
    return {
      content: [
        {
          type: "text",
          text: `Daily spending config created successfully!\nName: ${config.name}\nPeriod Type: ${config.periodType}\nEmergency Buffer: $${(parseFloat(config.emergencyBuffer) || 0).toFixed(2)}\nID: ${config.id}`,
        },
      ],
    };
  }

  private async updateDailySpendingConfig(args: any): Promise<any> {
    const { configId, name, periodType, periodValue, includeSalary, includeRecurringIncome, includeRecurringExpenses, selectedGoalIds, emergencyBuffer } = args;
    const updateData: any = {};
    
    if (name) updateData.name = name;
    if (periodType) updateData.periodType = periodType;
    if (periodValue) updateData.periodValue = periodValue;
    if (includeSalary !== undefined) updateData.includeSalary = includeSalary;
    if (includeRecurringIncome !== undefined) updateData.includeRecurringIncome = includeRecurringIncome;
    if (includeRecurringExpenses !== undefined) updateData.includeRecurringExpenses = includeRecurringExpenses;
    if (selectedGoalIds) updateData.selectedGoalIds = selectedGoalIds;
    if (emergencyBuffer !== undefined) updateData.emergencyBuffer = emergencyBuffer;
    
    const result = await this.makeApiRequestWithBody(`/daily-spending/configs/${configId}`, 'PUT', updateData);
    
    const config = result.data;
    return {
      content: [
        {
          type: "text",
          text: `Daily spending config updated successfully!\nName: ${config.name}\nPeriod Type: ${config.periodType}\nEmergency Buffer: $${(parseFloat(config.emergencyBuffer) || 0).toFixed(2)}\nID: ${config.id}`,
        },
      ],
    };
  }

  private async deleteDailySpendingConfig(args: any): Promise<any> {
    const { configId } = args;
    const result = await this.makeApiRequestWithBody(`/daily-spending/configs/${configId}`, 'DELETE');
    
    return {
      content: [
        {
          type: "text",
          text: result.message || `Daily spending config ${configId} deleted successfully!`,
        },
      ],
    };
  }

  private async calculateDailySpending(args: any): Promise<any> {
    const { configId } = args;
    const params = configId ? { configId } : {};
    const result = await this.makeApiRequest('/daily-spending/calculate', params);
    
    const calculation = result.data;
    return {
      content: [
        {
          type: "text",
          text: `Daily Spending Calculation:\nDaily Limit: $${(parseFloat(calculation.dailyLimit) || 0).toFixed(2)}\nCurrent Balance: $${(parseFloat(calculation.currentBalance) || 0).toFixed(2)}\nAvailable for Goals: $${(parseFloat(calculation.availableForGoals) || 0).toFixed(2)}\nDays Remaining: ${calculation.daysRemaining}`,
        },
      ],
    };
  }

  async run(): Promise<void> {
    const { StdioServerTransport } = await this.initialize();
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.error("Backend Wallet MCP Server running on stdio");
  }
}

// Run the server
const server = new BackendWalletMcpServer();
server.run().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
}); 