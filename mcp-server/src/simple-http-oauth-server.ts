import express, { Request, Response } from "express";
import axios from "axios";
import crypto from "crypto";

// OAuth configuration interface
interface OAuthConfig {
  client_id: string;
  client_secret?: string;
  authorization_server_url: string;
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
 * Simple HTTP Server with OAuth 2.1 support for MCP functionality
 */
class SimpleHttpOAuthServer {
  private app: express.Application;
  private apiBaseUrl: string;
  private oauthConfig: OAuthConfig;
  private accessToken: string = "";
  private refreshToken: string = "";
  private tokenExpiresAt: number = 0;

  constructor() {
    this.app = express();
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Enable CORS for Claude Desktop
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    this.apiBaseUrl = process.env.BACKEND_API_URL || "http://localhost:3000/api";
    this.oauthConfig = {
      client_id: process.env.OAUTH_CLIENT_ID || "mcp_default_client",
      client_secret: process.env.OAUTH_CLIENT_SECRET || "default_secret_for_development_only",
      authorization_server_url: process.env.OAUTH_AUTHORIZATION_SERVER || "http://localhost:3000",
      scope: process.env.OAUTH_SCOPE || "mcp:tools:list mcp:tools:call wallet:accounts:read wallet:transactions:read"
    };

    this.setupRoutes();
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

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        server: 'backend-wallet-oauth-http',
        oauth: {
          client_id: this.oauthConfig.client_id,
          authorization_server: this.oauthConfig.authorization_server_url,
          scope: this.oauthConfig.scope,
          token_available: !!this.accessToken
        }
      });
    });

    // MCP Tools list endpoint
    this.app.get('/tools', (req: Request, res: Response) => {
      res.json({
        tools: [
          {
            name: "ping",
            description: "Test API connection with OAuth authentication"
          },
          {
            name: "getTotalBalance",
            description: "Get the total balance across all user accounts (requires wallet:accounts:read scope)"
          },
          {
            name: "getRecentTransactions",
            description: "Get recent transactions with optional filtering (requires wallet:transactions:read scope)"
          },
          {
            name: "getUserAccounts",
            description: "Get all user accounts (requires wallet:accounts:read scope)"
          },
          {
            name: "createAccount",
            description: "Create a new account (requires wallet:accounts:write scope)"
          }
        ]
      });
    });

    // MCP Tool execution endpoint
    this.app.post('/tools/:toolName', async (req: Request, res: Response) => {
      const { toolName } = req.params;
      const args = req.body;

      try {
        await this.ensureValidToken();

        let result;
        switch (toolName) {
          case "ping":
            result = await this.ping();
            break;
          case "getTotalBalance":
            result = await this.getTotalBalance();
            break;
          case "getRecentTransactions":
            result = await this.getRecentTransactions(args);
            break;
          case "getUserAccounts":
            result = await this.getUserAccounts();
            break;
          case "createAccount":
            result = await this.createAccount(args);
            break;
          default:
            res.status(404).json({ error: `Unknown tool: ${toolName}` });
            return;
        }

        res.json(result);
      } catch (error: any) {
        res.status(500).json({ error: `Tool execution failed: ${error.message}` });
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
        success: true,
        data: {
          message: `🏓 API Ping successful!`,
          server: data.server || 'backend-wallet-api',
          timestamp: data.timestamp,
          oauth: this.accessToken ? 'Authenticated' : 'Not authenticated',
          scope: this.oauthConfig.scope
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          message: `❌ API connection failed: ${error.message}`,
          oauth_status: this.accessToken ? 'Token available' : 'No token',
          note: 'Please check your OAuth configuration.'
        }
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
        success: true,
        data: {
          total_balance: totalBalance,
          accounts_count: data.data.length,
          message: `💰 Total Balance: $${totalBalance.toFixed(2)}`,
          oauth_scope: this.oauthConfig.scope
        }
      };
    } catch (error: any) {
      if (error.response?.status === 403) {
        return {
          success: false,
          error: {
            message: `❌ Access denied: Insufficient OAuth scope`,
            required_scope: 'wallet:accounts:read',
            current_scope: this.oauthConfig.scope
          }
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

      return {
        success: true,
        data: {
          transactions: data.data,
          count: data.data.length,
          message: `📊 Recent Transactions (${data.data.length})`
        }
      };
    } catch (error: any) {
      if (error.response?.status === 403) {
        return {
          success: false,
          error: {
            message: `❌ Access denied: Insufficient OAuth scope`,
            required_scope: 'wallet:transactions:read',
            current_scope: this.oauthConfig.scope
          }
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

      return {
        success: true,
        data: {
          accounts: data.data,
          count: data.data.length,
          message: `🏦 User Accounts (${data.data.length})`
        }
      };
    } catch (error: any) {
      if (error.response?.status === 403) {
        return {
          success: false,
          error: {
            message: `❌ Access denied: Insufficient OAuth scope`,
            required_scope: 'wallet:accounts:read',
            current_scope: this.oauthConfig.scope
          }
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
        success: true,
        data: {
          account: data.data,
          message: `✅ Account created successfully!`
        }
      };
    } catch (error: any) {
      if (error.response?.status === 403) {
        return {
          success: false,
          error: {
            message: `❌ Access denied: Insufficient OAuth scope`,
            required_scope: 'wallet:accounts:write',
            current_scope: this.oauthConfig.scope
          }
        };
      }
      throw error;
    }
  }

  async startServer(): Promise<void> {
    await this.initializeOAuthFlow();

    const port = process.env.PORT || 3333;
    this.app.listen(port, () => {
      console.error(`🚀 Simple HTTP OAuth Server running on port ${port}`);
      console.error(`❤️  Health check: http://localhost:${port}/health`);
      console.error(`🔧 Tools list: http://localhost:${port}/tools`);
      console.error(`⚙️  Tool execution: POST http://localhost:${port}/tools/{toolName}`);
      console.error(`🔐 OAuth Client ID: ${this.oauthConfig.client_id}`);
      console.error(`🔗 Authorization Server: ${this.oauthConfig.authorization_server_url}`);
      console.error(`📝 Scopes: ${this.oauthConfig.scope}`);
    });
  }
}

// Run the server
const server = new SimpleHttpOAuthServer();
server.startServer().catch(console.error); 