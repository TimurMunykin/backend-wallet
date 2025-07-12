import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { ListToolsRequestSchema, CallToolRequestSchema, ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import axios from "axios";
import { createHash } from "crypto";
import crypto from "crypto";

// OAuth configuration interface
interface OAuthConfig {
  client_id: string;
  client_secret?: string;
  authorization_server_url: string;
  redirect_uri: string;
  scope: string;
}

// Access token response interface
interface AccessTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

/**
 * HTTP MCP Server with OAuth 2.1 support
 */
class HttpOAuthMcpServer {
  private server: Server;
  private apiBaseUrl: string;
  private oauthConfig: OAuthConfig;
  private accessToken: string = "";
  private refreshToken: string = "";
  private tokenExpiresAt: number = 0;
  private transports: Record<string, SSEServerTransport> = {};

  constructor() {
    this.server = new Server({
      name: "backend-wallet-oauth-http",
      version: "1.0.0",
      capabilities: {
        tools: {}
      }
    }, {
      capabilities: {
        experimental: {
          authorization: {
            flows: ["client_credentials", "authorization_code"]
          }
        }
      }
    });

    this.apiBaseUrl = process.env.BACKEND_API_URL || "http://localhost:3000/api";
    this.oauthConfig = {
      client_id: process.env.OAUTH_CLIENT_ID || "mcp_default_client",
      client_secret: process.env.OAUTH_CLIENT_SECRET || "default_secret_for_development_only",
      authorization_server_url: process.env.OAUTH_AUTHORIZATION_SERVER || "http://localhost:3000",
      redirect_uri: process.env.OAUTH_REDIRECT_URI || "http://localhost:3333/callback",
      scope: process.env.OAUTH_SCOPE || "mcp:tools:list mcp:tools:call wallet:accounts:read wallet:transactions:read"
    };

    this.setupHandlers();
  }

  /**
   * Initialize OAuth flow
   */
  private async initializeOAuthFlow(): Promise<void> {
    try {
      // Try to get access token using client credentials flow
      await this.clientCredentialsFlow();
    } catch (error) {
      console.error("OAuth initialization failed, falling back to environment token:", error);
      // Fallback to environment token
      this.accessToken = process.env.BACKEND_AUTH_TOKEN || "";
      if (this.accessToken) {
        console.error("Using fallback token from environment");
      }
    }
  }

  /**
   * Client credentials flow for server-to-server authentication
   */
  private async clientCredentialsFlow(): Promise<void> {
    try {
      const tokenEndpoint = `${this.oauthConfig.authorization_server_url}/oauth/token`;
      
      const params = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.oauthConfig.client_id,
        client_secret: this.oauthConfig.client_secret || '',
        scope: this.oauthConfig.scope
      });

      const response = await axios.post(tokenEndpoint, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const tokenData: AccessTokenResponse = response.data;
      this.accessToken = tokenData.access_token;
      this.refreshToken = tokenData.refresh_token || "";
      this.tokenExpiresAt = Date.now() + (tokenData.expires_in * 1000);

      console.error("OAuth token obtained successfully");
      console.error(`Token expires at: ${new Date(this.tokenExpiresAt)}`);
    } catch (error) {
      console.error("Client credentials flow failed:", error);
      throw error;
    }
  }

  /**
   * Refresh access token when it expires
   */
  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      // Re-run client credentials flow
      await this.clientCredentialsFlow();
      return;
    }

    try {
      const tokenEndpoint = `${this.oauthConfig.authorization_server_url}/oauth/token`;
      
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        client_id: this.oauthConfig.client_id,
        client_secret: this.oauthConfig.client_secret || ''
      });

      const response = await axios.post(tokenEndpoint, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const tokenData: AccessTokenResponse = response.data;
      this.accessToken = tokenData.access_token;
      this.refreshToken = tokenData.refresh_token || this.refreshToken;
      this.tokenExpiresAt = Date.now() + (tokenData.expires_in * 1000);

      console.error("Access token refreshed successfully");
    } catch (error) {
      console.error("Token refresh failed:", error);
      // Fall back to client credentials flow
      await this.clientCredentialsFlow();
    }
  }

  /**
   * Ensure we have a valid access token
   */
  private async ensureValidToken(): Promise<void> {
    if (!this.accessToken || Date.now() >= this.tokenExpiresAt - 60000) { // Refresh 1 minute before expiry
      await this.refreshAccessToken();
    }
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "ping",
            description: "Test API connection with OAuth authentication",
            inputSchema: {
              type: "object",
              properties: {},
              required: [],
            },
          },
          {
            name: "getTotalBalance",
            description: "Get the total balance across all user accounts (requires wallet:accounts:read scope)",
            inputSchema: {
              type: "object",
              properties: {},
              required: [],
            },
          },
          {
            name: "getRecentTransactions",
            description: "Get recent transactions with optional filtering (requires wallet:transactions:read scope)",
            inputSchema: {
              type: "object",
              properties: {
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
              required: [],
            },
          },
          {
            name: "getUserAccounts",
            description: "Get all user accounts (requires wallet:accounts:read scope)",
            inputSchema: {
              type: "object",
              properties: {},
              required: [],
            },
          },
          {
            name: "createAccount",
            description: "Create a new account (requires wallet:accounts:write scope)",
            inputSchema: {
              type: "object",
              properties: {
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
              required: ["name"],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        await this.ensureValidToken();

        switch (name) {
          case "ping":
            return await this.ping();
          case "getTotalBalance":
            return await this.getTotalBalance();
          case "getRecentTransactions":
            return await this.getRecentTransactions(args);
          case "getUserAccounts":
            return await this.getUserAccounts();
          case "createAccount":
            return await this.createAccount(args);
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error: any) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${error.message}`);
      }
    });
  }

  private async makeApiRequest(endpoint: string, params?: any): Promise<any> {
    const url = `${this.apiBaseUrl}${endpoint}`;
    const config: any = {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    };

    if (params) {
      config.params = params;
    }

    const response = await axios.get(url, config);
    return response.data;
  }

  private async makeApiRequestWithBody(endpoint: string, method: 'POST' | 'PUT' | 'DELETE', body?: any): Promise<any> {
    const url = `${this.apiBaseUrl}${endpoint}`;
    const config: any = {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    };

    const response = await axios[method.toLowerCase() as 'post' | 'put' | 'delete'](url, body, config);
    return response.data;
  }

  private async ping(): Promise<any> {
    try {
      const data = await this.makeApiRequest('/ping');
      return {
        content: [
          {
            type: "text",
            text: `🏓 API Ping successful!\n` +
                  `Server: ${data.server || 'backend-wallet-api'}\n` +
                  `Timestamp: ${data.timestamp}\n` +
                  `OAuth: ${this.accessToken ? 'Authenticated' : 'Not authenticated'}\n` +
                  `Scope: ${this.oauthConfig.scope}`
          }
        ]
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `❌ API connection failed: ${error.message}\n` +
                  `OAuth status: ${this.accessToken ? 'Token available' : 'No token'}\n` +
                  `Please check your OAuth configuration.`
          }
        ]
      };
    }
  }

  private async getTotalBalance(): Promise<any> {
    try {
      const data = await this.makeApiRequest('/accounts');
      
      if (!data.success || !data.data) {
        throw new Error(data.message || 'Failed to fetch accounts');
      }

      const totalBalance = data.data.reduce((sum: number, account: any) => sum + account.balance, 0);
      
      return {
        content: [
          {
            type: "text",
            text: `💰 Total Balance: $${totalBalance.toFixed(2)}\n` +
                  `Accounts: ${data.data.length}\n` +
                  `Retrieved with OAuth scope: ${this.oauthConfig.scope}`
          }
        ]
      };
    } catch (error: any) {
      if (error.response?.status === 403) {
        return {
          content: [
            {
              type: "text",
              text: `❌ Access denied: Insufficient OAuth scope\n` +
                    `Required scope: wallet:accounts:read\n` +
                    `Current scope: ${this.oauthConfig.scope}`
            }
          ]
        };
      }
      throw error;
    }
  }

  private async getRecentTransactions(args: any): Promise<any> {
    try {
      const params: any = {};
      if (args.limit) params.limit = args.limit;
      if (args.accountId) params.accountId = args.accountId;
      if (args.type) params.type = args.type;

      const data = await this.makeApiRequest('/transactions', params);
      
      if (!data.success || !data.data) {
        throw new Error(data.message || 'Failed to fetch transactions');
      }

      const transactions = data.data;
      let result = `📊 Recent Transactions (${transactions.length})\n\n`;
      
      transactions.forEach((tx: any) => {
        const amount = tx.type === 'income' ? `+$${tx.amount}` : `-$${tx.amount}`;
        result += `${tx.type === 'income' ? '💰' : '💸'} ${amount} - ${tx.description}\n`;
        result += `   Date: ${new Date(tx.date).toLocaleDateString()}\n`;
        if (tx.account) result += `   Account: ${tx.account.name}\n`;
        result += '\n';
      });

      return {
        content: [
          {
            type: "text",
            text: result
          }
        ]
      };
    } catch (error: any) {
      if (error.response?.status === 403) {
        return {
          content: [
            {
              type: "text",
              text: `❌ Access denied: Insufficient OAuth scope\n` +
                    `Required scope: wallet:transactions:read\n` +
                    `Current scope: ${this.oauthConfig.scope}`
            }
          ]
        };
      }
      throw error;
    }
  }

  private async getUserAccounts(): Promise<any> {
    try {
      const data = await this.makeApiRequest('/accounts');
      
      if (!data.success || !data.data) {
        throw new Error(data.message || 'Failed to fetch accounts');
      }

      let result = `🏦 User Accounts (${data.data.length})\n\n`;
      
      data.data.forEach((account: any) => {
        result += `💳 ${account.name}\n`;
        result += `   Balance: $${account.balance.toFixed(2)} ${account.currency}\n`;
        result += `   ID: ${account.id}\n\n`;
      });

      return {
        content: [
          {
            type: "text",
            text: result
          }
        ]
      };
    } catch (error: any) {
      if (error.response?.status === 403) {
        return {
          content: [
            {
              type: "text",
              text: `❌ Access denied: Insufficient OAuth scope\n` +
                    `Required scope: wallet:accounts:read\n` +
                    `Current scope: ${this.oauthConfig.scope}`
            }
          ]
        };
      }
      throw error;
    }
  }

  private async createAccount(args: any): Promise<any> {
    try {
      const accountData = {
        name: args.name,
        balance: args.balance || 0,
        currency: args.currency || 'USD'
      };

      const data = await this.makeApiRequestWithBody('/accounts', 'POST', accountData);
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to create account');
      }

      return {
        content: [
          {
            type: "text",
            text: `✅ Account created successfully!\n` +
                  `Name: ${data.data.name}\n` +
                  `Balance: $${data.data.balance.toFixed(2)} ${data.data.currency}\n` +
                  `ID: ${data.data.id}`
          }
        ]
      };
    } catch (error: any) {
      if (error.response?.status === 403) {
        return {
          content: [
            {
              type: "text",
              text: `❌ Access denied: Insufficient OAuth scope\n` +
                    `Required scope: wallet:accounts:write\n` +
                    `Current scope: ${this.oauthConfig.scope}`
            }
          ]
        };
      }
      throw error;
    }
  }

  async startHttpServer(): Promise<void> {
    await this.initializeOAuthFlow();

    const app = express();
    app.use(express.json());

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        server: 'backend-wallet-oauth-mcp',
        oauth: {
          client_id: this.oauthConfig.client_id,
          authorization_server: this.oauthConfig.authorization_server_url,
          scope: this.oauthConfig.scope,
          token_available: !!this.accessToken
        }
      });
    });

    // MCP over SSE endpoint
    app.get('/mcp/sse', async (req, res) => {
      const transport = new SSEServerTransport('/mcp/sse', res);
      await this.server.connect(transport);
    });

    const port = process.env.PORT || 3333;
    app.listen(port, () => {
      console.error(`🚀 HTTP OAuth MCP Server running on port ${port}`);
      console.error(`🌐 MCP endpoint: http://localhost:${port}/mcp`);
      console.error(`❤️  Health check: http://localhost:${port}/health`);
      console.error(`🔐 OAuth Client ID: ${this.oauthConfig.client_id}`);
      console.error(`🔗 Authorization Server: ${this.oauthConfig.authorization_server_url}`);
      console.error(`📝 Scopes: ${this.oauthConfig.scope}`);
    });
  }
}

// Run the server
const server = new HttpOAuthMcpServer();
server.startHttpServer().catch(console.error); 