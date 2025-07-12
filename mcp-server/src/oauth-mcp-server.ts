import axios from "axios";
import crypto from "crypto";
import { createHash } from "crypto";
import dotenv from "dotenv";

dotenv.config();

interface OAuthConfig {
  client_id: string;
  client_secret?: string;
  authorization_server_url: string;
  redirect_uri: string;
  scope: string;
}

interface AccessTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

/**
 * MCP Server with OAuth 2.1 Authorization
 * Implements MCP Authorization Specification
 */
class OAuthBackendWalletMcpServer {
  private server: any;
  private apiBaseUrl: string;
  private oauthConfig: OAuthConfig;
  private accessToken: string = "";
  private refreshToken: string = "";
  private tokenExpiresAt: number = 0;

  constructor() {
    this.apiBaseUrl = process.env.BACKEND_API_URL || "http://localhost:3000";
    
    // OAuth 2.1 configuration
    this.oauthConfig = {
      client_id: process.env.MCP_CLIENT_ID || "mcp-demo-client",
      client_secret: process.env.MCP_CLIENT_SECRET || "demo-secret-123",
      authorization_server_url: process.env.AUTHORIZATION_SERVER_URL || "http://localhost:3000",
      redirect_uri: process.env.MCP_REDIRECT_URI || "http://localhost:8080/callback",
      scope: process.env.MCP_SCOPE || "mcp:tools:list mcp:tools:call wallet:accounts:read wallet:transactions:read"
    };
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
      name: "oauth-backend-wallet-mcp-server",
      version: "1.0.0",
    }, {
      capabilities: {
        tools: {},
      },
    });

    // Initialize OAuth flow
    await this.initializeOAuthFlow();

    // Store the imported classes for later use
    this.setupHandlers(ListToolsRequestSchema, CallToolRequestSchema, ErrorCode, McpError);
    
    return { StdioServerTransport };
  }

  /**
   * Initialize OAuth 2.1 flow with PKCE
   */
  private async initializeOAuthFlow(): Promise<void> {
    try {
      console.log("Initializing OAuth 2.1 flow...");
      
      // Discover authorization server metadata
      const metadata = await this.discoverAuthorizationServerMetadata();
      console.log("Authorization server metadata discovered:", metadata);

      // For client credentials flow (server-to-server)
      if (this.oauthConfig.client_secret) {
        await this.clientCredentialsFlow();
      } else {
        // For authorization code flow (would require user interaction)
        console.log("Authorization code flow requires user interaction");
        console.log(`Please visit: ${this.buildAuthorizationUrl()}`);
      }
    } catch (error) {
      console.error("OAuth initialization failed:", error);
      // Fallback to environment token if OAuth fails
      this.accessToken = process.env.BACKEND_AUTH_TOKEN || "";
      if (this.accessToken) {
        console.error("Using fallback token from environment");
      }
    }
  }

  /**
   * Discover authorization server metadata (RFC 8414)
   */
  private async discoverAuthorizationServerMetadata(): Promise<any> {
    try {
      const metadataUrl = `${this.oauthConfig.authorization_server_url}/.well-known/oauth-authorization-server`;
      const response = await axios.get(metadataUrl);
      return response.data;
    } catch (error) {
      console.warn("Metadata discovery failed, using default endpoints");
      return {
        issuer: this.oauthConfig.authorization_server_url,
        authorization_endpoint: `${this.oauthConfig.authorization_server_url}/oauth/authorize`,
        token_endpoint: `${this.oauthConfig.authorization_server_url}/oauth/token`,
        registration_endpoint: `${this.oauthConfig.authorization_server_url}/oauth/register`
      };
    }
  }

  /**
   * Client credentials flow for server-to-server authentication
   */
  private async clientCredentialsFlow(): Promise<void> {
    try {
      const tokenEndpoint = `${this.oauthConfig.authorization_server_url}/oauth/token`;
      
      const response = await axios.post(tokenEndpoint, {
        grant_type: 'client_credentials',
        client_id: this.oauthConfig.client_id,
        client_secret: this.oauthConfig.client_secret,
        scope: this.oauthConfig.scope
      }, {
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
   * Build authorization URL for authorization code flow
   */
  private buildAuthorizationUrl(): string {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
    const state = crypto.randomBytes(16).toString('hex');

    // Store PKCE parameters for later use
    process.env.CODE_VERIFIER = codeVerifier;
    process.env.OAUTH_STATE = state;

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.oauthConfig.client_id,
      redirect_uri: this.oauthConfig.redirect_uri,
      scope: this.oauthConfig.scope,
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });

    return `${this.oauthConfig.authorization_server_url}/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token (PKCE flow)
   */
  async exchangeAuthorizationCode(code: string, state: string): Promise<void> {
    const codeVerifier = process.env.CODE_VERIFIER;
    const expectedState = process.env.OAUTH_STATE;

    if (!codeVerifier || state !== expectedState) {
      throw new Error("Invalid PKCE parameters or state mismatch");
    }

    const tokenEndpoint = `${this.oauthConfig.authorization_server_url}/oauth/token`;
    
    const response = await axios.post(tokenEndpoint, {
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: this.oauthConfig.redirect_uri,
      client_id: this.oauthConfig.client_id,
      code_verifier: codeVerifier
    });

    const tokenData: AccessTokenResponse = response.data;
    this.accessToken = tokenData.access_token;
    this.refreshToken = tokenData.refresh_token || "";
    this.tokenExpiresAt = Date.now() + (tokenData.expires_in * 1000);

    console.log("Authorization code exchanged successfully");
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
      
      const response = await axios.post(tokenEndpoint, {
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        client_id: this.oauthConfig.client_id,
        client_secret: this.oauthConfig.client_secret
      });

      const tokenData: AccessTokenResponse = response.data;
      this.accessToken = tokenData.access_token;
      this.refreshToken = tokenData.refresh_token || this.refreshToken;
      this.tokenExpiresAt = Date.now() + (tokenData.expires_in * 1000);

      console.log("Access token refreshed successfully");
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

  private setupHandlers(ListToolsRequestSchema: any, CallToolRequestSchema: any, ErrorCode: any, McpError: any): void {
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
            description: "Get all user accounts with their balances (requires wallet:accounts:read scope)",
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
          // Additional tools would follow the same pattern...
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      const { name, arguments: args } = request.params;
      
      try {
        switch (name) {
          case "ping":
            return this.ping();
          case "getTotalBalance":
            return this.getTotalBalance();
          case "getRecentTransactions":
            return this.getRecentTransactions(args);
          case "getUserAccounts":
            return this.getUserAccounts();
          case "createAccount":
            return this.createAccount(args);
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Tool ${name} not found`);
        }
      } catch (error) {
        console.error(`Error calling tool ${name}:`, error);
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(ErrorCode.InternalError, `Tool ${name} failed: ${error}`);
      }
    });
  }

  private async makeApiRequest(endpoint: string, params?: any): Promise<any> {
    await this.ensureValidToken();
    
    const url = `${this.apiBaseUrl}/api${endpoint}`;
    const config: any = {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      }
    };

    if (params) {
      config.params = params;
    }

    const response = await axios.get(url, config);
    return response.data;
  }

  private async makeApiRequestWithBody(endpoint: string, method: 'POST' | 'PUT' | 'DELETE', body?: any): Promise<any> {
    await this.ensureValidToken();
    
    const url = `${this.apiBaseUrl}/api${endpoint}`;
    const config = {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      }
    };

    const response = await axios[method.toLowerCase() as 'post' | 'put' | 'delete'](url, body, config);
    return response.data;
  }

  private async ping(): Promise<any> {
    try {
      await this.ensureValidToken();
      const response = await axios.get(`${this.apiBaseUrl}/api/ping`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        }
      });

      return {
        content: [
          {
            type: "text",
            text: `✅ API connection successful!\n` +
                  `Server: ${response.data.server || 'backend-wallet-api'}\n` +
                  `Timestamp: ${response.data.timestamp}\n` +
                  `OAuth: Authenticated with scope: ${this.oauthConfig.scope}\n` +
                  `Token expires: ${new Date(this.tokenExpiresAt).toISOString()}`
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

  async run(): Promise<void> {
    const { StdioServerTransport } = await this.initialize();
    
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.log("OAuth-enabled Backend Wallet MCP Server running on stdio");
    console.log(`OAuth Client ID: ${this.oauthConfig.client_id}`);
    console.log(`Authorization Server: ${this.oauthConfig.authorization_server_url}`);
    console.log(`Scopes: ${this.oauthConfig.scope}`);
  }
}

// Run the server
const server = new OAuthBackendWalletMcpServer();
server.run().catch(console.error); 