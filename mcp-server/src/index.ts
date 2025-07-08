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
    this.authToken = process.env.BACKEND_AUTH_TOKEN || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjIsImVtYWlsIjoiYWFhYXRlc3QyQGdtYWlsLmNvbSIsImlhdCI6MTc1MjAwNjEwNCwiZXhwIjoxNzUyMDA5NzA0LCJhdWQiOiJmaW5hbmNlLWFwcC11c2VycyIsImlzcyI6ImZpbmFuY2UtYXBwIn0.jGXI92xXmctR0SHirXXF57aKoPPw8OoUDVb5H8yV7CE";
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
          text: `Total Balance: $${result.data.totalBalance.toFixed(2)}`,
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
      `${tx.transaction_date}: ${tx.type === 'income' ? '+' : '-'}$${tx.amount.toFixed(2)} - ${tx.description}`
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
      const balance = parseFloat(acc.balance);
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