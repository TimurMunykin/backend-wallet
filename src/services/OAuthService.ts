import { JwtService } from '../utils/jwt';
import crypto from 'crypto';
import { createHash } from 'crypto';

// Entity interfaces for OAuth data
interface OAuthClient {
  id: number;
  client_id: string;
  client_secret?: string;
  client_name: string;
  redirect_uris: string[];
  grant_types: string[];
  scope: string;
  application_type: string;
  client_id_issued_at: number;
  client_secret_expires_at: number;
  created_at: Date;
}

interface AuthorizationCode {
  id: number;
  code: string;
  client_id: string;
  user_id: number;
  redirect_uri: string;
  scope: string;
  code_challenge: string;
  code_challenge_method: string;
  expires_at: Date;
  used: boolean;
  created_at: Date;
}

interface AccessToken {
  id: number;
  token: string;
  client_id: string;
  user_id?: number;
  scope: string;
  expires_at: Date;
  created_at: Date;
}

interface RefreshToken {
  id: number;
  token: string;
  client_id: string;
  user_id?: number;
  scope: string;
  access_token_id: number;
  expires_at: Date;
  used: boolean;
  created_at: Date;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

export class OAuthService {
  private jwtService: JwtService;
  
  // In-memory storage for demo purposes
  // In production, use proper database entities
  private clients: Map<string, OAuthClient> = new Map();
  private authCodes: Map<string, AuthorizationCode> = new Map();
  private accessTokens: Map<string, AccessToken> = new Map();
  private refreshTokens: Map<string, RefreshToken> = new Map();

  constructor() {
    this.jwtService = new JwtService();
    this.initializeDefaultClient();
  }

  private initializeDefaultClient(): void {
    // Create a default client for testing
    const defaultClient: OAuthClient = {
      id: 1,
      client_id: 'mcp-demo-client',
      client_secret: 'demo-secret-123',
      client_name: 'MCP Demo Client',
      redirect_uris: ['http://localhost:3001/callback', 'http://localhost:8080/callback'],
      grant_types: ['authorization_code', 'refresh_token', 'client_credentials'],
      scope: 'mcp:tools:list mcp:tools:call wallet:accounts:read wallet:transactions:read',
      application_type: 'web',
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_secret_expires_at: 0, // Never expires
      created_at: new Date()
    };
    
    this.clients.set(defaultClient.client_id, defaultClient);
  }

  async validateClient(clientId: string, redirectUri?: string): Promise<OAuthClient | null> {
    let client = this.clients.get(clientId);
    
    // Auto-register Claude.ai clients
    if (!client && clientId.startsWith('mcp_') && redirectUri?.includes('claude.ai')) {
      console.log(`Auto-registering Claude.ai client: ${clientId}`);
      client = await this.registerClient({
        client_name: 'Claude.ai MCP Client',
        redirect_uris: ['https://claude.ai/api/mcp/auth_callback'],
        grant_types: ['authorization_code', 'refresh_token'],
        scope: 'mcp:tools:list mcp:tools:call wallet:accounts:read wallet:accounts:write wallet:transactions:read wallet:transactions:write wallet:analytics:read',
        application_type: 'web'
      });
      
      // Override the generated client_id with Claude.ai's client_id
      this.clients.delete(client.client_id);
      client.client_id = clientId;
      this.clients.set(clientId, client);
    }

    if (!client) {
      return null;
    }

    // If redirect URI is provided, validate it
    if (redirectUri && !client.redirect_uris.includes(redirectUri)) {
      return null;
    }

    return client;
  }

  async registerClient(registration: {
    client_name: string;
    redirect_uris: string[];
    grant_types: string[];
    scope: string;
    application_type: string;
  }): Promise<OAuthClient> {
    const clientId = 'mcp_' + crypto.randomBytes(16).toString('hex');
    const clientSecret = crypto.randomBytes(32).toString('hex');
    
    const client: OAuthClient = {
      id: this.clients.size + 1,
      client_id: clientId,
      client_secret: clientSecret,
      client_name: registration.client_name,
      redirect_uris: registration.redirect_uris,
      grant_types: registration.grant_types,
      scope: registration.scope,
      application_type: registration.application_type,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_secret_expires_at: 0, // Never expires for demo
      created_at: new Date()
    };

    this.clients.set(clientId, client);
    return client;
  }

  async generateAuthorizationCode(params: {
    client_id: string;
    user_id: number;
    redirect_uri: string;
    scope: string;
    code_challenge: string;
    code_challenge_method: string;
  }): Promise<string> {
    const code = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const authCode: AuthorizationCode = {
      id: this.authCodes.size + 1,
      code,
      client_id: params.client_id,
      user_id: params.user_id,
      redirect_uri: params.redirect_uri,
      scope: params.scope,
      code_challenge: params.code_challenge,
      code_challenge_method: params.code_challenge_method,
      expires_at: expiresAt,
      used: false,
      created_at: new Date()
    };

    this.authCodes.set(code, authCode);

    // Clean up expired codes
    this.cleanupExpiredAuthCodes();

    return code;
  }

  async exchangeAuthorizationCode(params: {
    code: string;
    redirect_uri: string;
    client_id: string;
    code_verifier: string;
  }): Promise<TokenResponse | null> {
    const authCode = this.authCodes.get(params.code);
    
    if (!authCode || authCode.used || authCode.expires_at < new Date()) {
      return null;
    }

    if (authCode.client_id !== params.client_id || authCode.redirect_uri !== params.redirect_uri) {
      return null;
    }

    // Verify PKCE
    const challengeFromVerifier = createHash('sha256')
      .update(params.code_verifier)
      .digest('base64url');

    if (challengeFromVerifier !== authCode.code_challenge) {
      return null;
    }

    // Mark code as used
    authCode.used = true;

    // Generate tokens
    return this.generateTokens({
      client_id: params.client_id,
      user_id: authCode.user_id,
      scope: authCode.scope
    });
  }

  async clientCredentialsGrant(params: {
    client_id: string;
    client_secret: string;
    scope: string;
  }): Promise<TokenResponse | null> {
    const client = this.clients.get(params.client_id);
    
    if (!client || client.client_secret !== params.client_secret) {
      return null;
    }

    if (!client.grant_types.includes('client_credentials')) {
      return null;
    }

    // Validate scope
    const requestedScopes = params.scope.split(' ');
    const allowedScopes = client.scope.split(' ');
    
    for (const scope of requestedScopes) {
      if (!allowedScopes.includes(scope)) {
        return null; // Scope not allowed
      }
    }

    return this.generateTokens({
      client_id: params.client_id,
      scope: params.scope
    });
  }

  async refreshToken(params: {
    refresh_token: string;
    client_id: string;
    client_secret?: string;
  }): Promise<TokenResponse | null> {
    const refreshToken = this.refreshTokens.get(params.refresh_token);
    
    if (!refreshToken || refreshToken.used || refreshToken.expires_at < new Date()) {
      return null;
    }

    if (refreshToken.client_id !== params.client_id) {
      return null;
    }

    // Validate client credentials if provided
    if (params.client_secret) {
      const client = this.clients.get(params.client_id);
      if (!client || client.client_secret !== params.client_secret) {
        return null;
      }
    }

    // Mark old refresh token as used
    refreshToken.used = true;

    // Generate new tokens
    return this.generateTokens({
      client_id: params.client_id,
      user_id: refreshToken.user_id,
      scope: refreshToken.scope
    });
  }

  async validateAccessToken(token: string): Promise<{
    client_id: string;
    user_id?: number;
    scope: string;
    expires_at: Date;
  } | null> {
    try {
      // Try to decode as JWT first
      const payload = this.jwtService.verifyToken(token) as any;
      return {
        client_id: payload.client_id || 'jwt-client',
        user_id: payload.userId,
        scope: payload.scope || 'mcp:tools:list mcp:tools:call',
        expires_at: new Date(payload.exp * 1000)
      };
    } catch (error) {
      // If not JWT, check in-memory tokens
      const accessToken = this.accessTokens.get(token);
      
      if (!accessToken || accessToken.expires_at < new Date()) {
        return null;
      }

      return {
        client_id: accessToken.client_id,
        user_id: accessToken.user_id,
        scope: accessToken.scope,
        expires_at: accessToken.expires_at
      };
    }
  }

  async validateScope(token: string, requiredScopes: string[]): Promise<boolean> {
    const tokenData = await this.validateAccessToken(token);
    if (!tokenData) {
      return false;
    }

    const tokenScopes = tokenData.scope.split(' ');
    
    // Check if all required scopes are present
    return requiredScopes.every(scope => tokenScopes.includes(scope));
  }

  private async generateTokens(params: {
    client_id: string;
    user_id?: number;
    scope: string;
  }): Promise<TokenResponse> {
    const accessTokenValue = crypto.randomBytes(32).toString('hex');
    const refreshTokenValue = crypto.randomBytes(32).toString('hex');
    
    const accessTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    const refreshTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Store access token
    const accessToken: AccessToken = {
      id: this.accessTokens.size + 1,
      token: accessTokenValue,
      client_id: params.client_id,
      user_id: params.user_id,
      scope: params.scope,
      expires_at: accessTokenExpiresAt,
      created_at: new Date()
    };

    this.accessTokens.set(accessTokenValue, accessToken);

    // Store refresh token
    const refreshToken: RefreshToken = {
      id: this.refreshTokens.size + 1,
      token: refreshTokenValue,
      client_id: params.client_id,
      user_id: params.user_id,
      scope: params.scope,
      access_token_id: accessToken.id,
      expires_at: refreshTokenExpiresAt,
      used: false,
      created_at: new Date()
    };

    this.refreshTokens.set(refreshTokenValue, refreshToken);

    return {
      access_token: accessTokenValue,
      token_type: 'Bearer',
      expires_in: 3600, // 1 hour in seconds
      refresh_token: refreshTokenValue,
      scope: params.scope
    };
  }

  private cleanupExpiredAuthCodes(): void {
    const now = new Date();
    for (const [code, authCode] of this.authCodes.entries()) {
      if (authCode.expires_at < now || authCode.used) {
        this.authCodes.delete(code);
      }
    }
  }

  // Get all supported scopes for MCP tools
  getSupportedScopes(): string[] {
    return [
      'mcp:tools:list',
      'mcp:tools:call',
      'mcp:resources:read',
      'mcp:resources:write',
      'wallet:accounts:read',
      'wallet:accounts:write',
      'wallet:transactions:read',
      'wallet:transactions:write',
      'wallet:analytics:read'
    ];
  }

  // Validate if a scope is valid for MCP tools
  isMcpToolScope(scope: string): boolean {
    return scope.startsWith('mcp:') || scope.startsWith('wallet:');
  }
} 