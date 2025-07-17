import { Request, Response } from 'express';
import { OAuthService } from '../services/OAuthService';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * OAuth 2.1 Controller for MCP Authorization
 * Implements MCP Authorization Specification based on OAuth 2.1
 */
export class OAuthController {
  private oauthService: OAuthService;

  constructor() {
    this.oauthService = OAuthService.getInstance();
  }

  /**
   * Authorization Server Metadata endpoint
   * RFC 8414 - OAuth 2.0 Authorization Server Metadata
   */
  getAuthorizationServerMetadata = async (req: Request, res: Response): Promise<void> => {
    try {
      // Force https for production domains
      const host = req.get('host');
      const baseUrl = `https://${host}`;
      
      const metadata = {
        issuer: baseUrl,
        authorization_endpoint: `${baseUrl}/oauth/authorize`,
        token_endpoint: `${baseUrl}/oauth/token`,
        registration_endpoint: `${baseUrl}/oauth/register`,
        jwks_uri: `${baseUrl}/oauth/jwks`,
        scopes_supported: [
          // MCP tool scopes
          'mcp:tools:list',
          'mcp:tools:call',
          'mcp:resources:read',
          'mcp:resources:write',
          // Wallet-specific scopes
          'wallet:accounts:read',
          'wallet:accounts:write',
          'wallet:transactions:read',
          'wallet:transactions:write',
          'wallet:analytics:read'
        ],
        response_types_supported: ['code'],
        grant_types_supported: ['authorization_code', 'refresh_token', 'client_credentials'],
        token_endpoint_auth_methods_supported: ['client_secret_basic', 'none'],
        code_challenge_methods_supported: ['S256'],
        subject_types_supported: ['public'],
        id_token_signing_alg_values_supported: ['RS256'],
        userinfo_endpoint: `${baseUrl}/oauth/userinfo`,
        revocation_endpoint: `${baseUrl}/oauth/revoke`,
        introspection_endpoint: `${baseUrl}/oauth/introspect`
      };

      res.json(metadata);
    } catch (error) {
      console.error('Authorization server metadata error:', error);
      res.status(500).json({
        error: 'server_error',
        error_description: 'Unable to retrieve authorization server metadata'
      });
    }
  };

  /**
   * Authorization endpoint
   * OAuth 2.1 Authorization Code flow with mandatory PKCE
   */
  authorize = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        response_type,
        client_id,
        redirect_uri,
        scope,
        state,
        code_challenge,
        code_challenge_method
      } = req.query;

      // Validate required parameters
      if (!response_type || response_type !== 'code') {
        return this.redirectWithError(res, redirect_uri as string, 'unsupported_response_type', state as string);
      }

      if (!client_id) {
        return this.redirectWithError(res, redirect_uri as string, 'invalid_request', state as string, 'client_id is required');
      }

      // PKCE is mandatory for OAuth 2.1
      if (!code_challenge || !code_challenge_method) {
        return this.redirectWithError(res, redirect_uri as string, 'invalid_request', state as string, 'PKCE parameters are required');
      }

      if (code_challenge_method !== 'S256') {
        return this.redirectWithError(res, redirect_uri as string, 'invalid_request', state as string, 'Only S256 code challenge method is supported');
      }

      // Validate client
      const client = await this.oauthService.validateClient(client_id as string, redirect_uri as string);
      if (!client) {
        return this.redirectWithError(res, redirect_uri as string, 'invalid_client', state as string);
      }

      // Redirect to consent page instead of auto-approving
      const consentUrl = new URL('/claude/authorize', req.get('origin') || `${req.protocol}://${req.get('host')}`);
      
      // Pass all OAuth parameters to the consent page
      consentUrl.searchParams.set('client_id', client_id as string);
      consentUrl.searchParams.set('redirect_uri', redirect_uri as string);
      consentUrl.searchParams.set('scope', scope as string || 'mcp:tools:list mcp:tools:call');
      if (state) {
        consentUrl.searchParams.set('state', state as string);
      }
      consentUrl.searchParams.set('code_challenge', code_challenge as string);
      consentUrl.searchParams.set('code_challenge_method', code_challenge_method as string);

      res.redirect(consentUrl.toString());
    } catch (error) {
      console.error('Authorization error:', error);
      this.redirectWithError(res, req.query.redirect_uri as string, 'server_error', req.query.state as string);
    }
  };

  /**
   * Handle user consent POST request
   * This endpoint is called when user approves/denies Claude access
   */
  handleConsent = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        client_id,
        redirect_uri,
        scope,
        state,
        code_challenge,
        code_challenge_method,
        approved
      } = req.body;

      if (!approved) {
        // User denied access - redirect with error
        const redirectUrl = new URL(redirect_uri);
        redirectUrl.searchParams.set('error', 'access_denied');
        redirectUrl.searchParams.set('error_description', 'User denied the request');
        if (state) {
          redirectUrl.searchParams.set('state', state);
        }
        res.json({ redirect_url: redirectUrl.toString() });
        return;
      }

      // User approved - generate authorization code
      const authCode = await this.oauthService.generateAuthorizationCode({
        client_id,
        redirect_uri,
        scope: scope || 'mcp:tools:list mcp:tools:call',
        code_challenge,
        code_challenge_method,
        user_id: (req as AuthenticatedRequest).user!.userId // User is guaranteed to exist due to auth middleware
      });

      // Return success with authorization code
      res.json({ 
        code: authCode,
        redirect_uri 
      });
    } catch (error) {
      console.error('Consent handling error:', error);
      res.status(500).json({
        error: 'server_error',
        error_description: 'Unable to process consent'
      });
    }
  };

  /**
   * Token endpoint
   * Exchange authorization code for access token
   */
  token = async (req: Request, res: Response): Promise<void> => {
    try {
      const { grant_type } = req.body;

      if (grant_type === 'authorization_code') {
        return this.handleAuthorizationCodeGrant(req, res);
      } else if (grant_type === 'client_credentials') {
        return this.handleClientCredentialsGrant(req, res);
      } else if (grant_type === 'refresh_token') {
        return this.handleRefreshTokenGrant(req, res);
      } else {
        res.status(400).json({
          error: 'unsupported_grant_type',
          error_description: 'Supported grant types: authorization_code, client_credentials, refresh_token'
        });
      }
    } catch (error) {
      console.error('Token error:', error);
      res.status(500).json({
        error: 'server_error',
        error_description: 'Unable to process token request'
      });
    }
  };

  /**
   * Dynamic Client Registration endpoint
   * RFC 7591 - OAuth 2.0 Dynamic Client Registration Protocol
   */
  register = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        client_name,
        redirect_uris,
        grant_types = ['authorization_code', 'refresh_token'],
        scope,
        application_type = 'web'
      } = req.body;

      if (!client_name || !redirect_uris || !Array.isArray(redirect_uris)) {
        res.status(400).json({
          error: 'invalid_request',
          error_description: 'client_name and redirect_uris are required'
        });
        return;
      }

      // Validate redirect URIs (must be HTTPS or localhost)
      for (const uri of redirect_uris) {
        const url = new URL(uri);
        if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
          res.status(400).json({
            error: 'invalid_redirect_uri',
            error_description: 'Redirect URIs must be HTTPS or localhost'
          });
          return;
        }
      }

      const client = await this.oauthService.registerClient({
        client_name,
        redirect_uris,
        grant_types,
        scope: scope || 'mcp:tools:list mcp:tools:call',
        application_type
      });

      res.status(201).json({
        client_id: client.client_id,
        client_secret: client.client_secret,
        client_name: client.client_name,
        redirect_uris: client.redirect_uris,
        grant_types: client.grant_types,
        scope: client.scope,
        application_type: client.application_type,
        client_id_issued_at: client.client_id_issued_at,
        client_secret_expires_at: client.client_secret_expires_at
      });
    } catch (error) {
      console.error('Client registration error:', error);
      res.status(500).json({
        error: 'server_error',
        error_description: 'Unable to register client'
      });
    }
  };

  private async handleAuthorizationCodeGrant(req: Request, res: Response): Promise<void> {
    const { code, redirect_uri, client_id, code_verifier } = req.body;

    if (!code || !redirect_uri || !client_id || !code_verifier) {
      res.status(400).json({
        error: 'invalid_request',
        error_description: 'Missing required parameters'
      });
      return;
    }

    // Validate client credentials
    const client = await this.oauthService.validateClient(client_id, redirect_uri);
    if (!client) {
      res.status(400).json({
        error: 'invalid_client',
        error_description: 'Invalid client credentials'
      });
      return;
    }

    // Exchange authorization code for tokens
    const tokens = await this.oauthService.exchangeAuthorizationCode({
      code,
      redirect_uri,
      client_id,
      code_verifier
    });

    if (!tokens) {
      res.status(400).json({
        error: 'invalid_grant',
        error_description: 'Invalid authorization code'
      });
      return;
    }

    res.json({
      access_token: tokens.access_token,
      token_type: 'Bearer',
      expires_in: tokens.expires_in,
      refresh_token: tokens.refresh_token,
      scope: tokens.scope
    });
  }

  private async handleClientCredentialsGrant(req: Request, res: Response): Promise<void> {
    const { client_id, client_secret, scope } = req.body;

    if (!client_id || !client_secret) {
      res.status(400).json({
        error: 'invalid_request',
        error_description: 'client_id and client_secret are required'
      });
      return;
    }

    const tokens = await this.oauthService.clientCredentialsGrant({
      client_id,
      client_secret,
      scope: scope || 'mcp:tools:list mcp:tools:call'
    });

    if (!tokens) {
      res.status(401).json({
        error: 'invalid_client',
        error_description: 'Invalid client credentials'
      });
      return;
    }

    res.json({
      access_token: tokens.access_token,
      token_type: 'Bearer',
      expires_in: tokens.expires_in,
      scope: tokens.scope
    });
  }

  private async handleRefreshTokenGrant(req: Request, res: Response): Promise<void> {
    const { refresh_token, client_id, client_secret } = req.body;

    if (!refresh_token) {
      res.status(400).json({
        error: 'invalid_request',
        error_description: 'refresh_token is required'
      });
      return;
    }

    const tokens = await this.oauthService.refreshToken({
      refresh_token,
      client_id,
      client_secret
    });

    if (!tokens) {
      res.status(400).json({
        error: 'invalid_grant',
        error_description: 'Invalid refresh token'
      });
      return;
    }

    res.json({
      access_token: tokens.access_token,
      token_type: 'Bearer',
      expires_in: tokens.expires_in,
      scope: tokens.scope
    });
  }

  private redirectWithError(res: Response, redirectUri: string, error: string, state?: string, description?: string): void {
    if (!redirectUri) {
      res.status(400).json({ error, error_description: description });
      return;
    }

    const url = new URL(redirectUri);
    url.searchParams.set('error', error);
    if (description) {
      url.searchParams.set('error_description', description);
    }
    if (state) {
      url.searchParams.set('state', state);
    }

    res.redirect(url.toString());
  }
} 