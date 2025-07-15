import { Request, Response, NextFunction } from 'express';
import { OAuthService } from '../services/OAuthService';

export interface OAuthRequest extends Request {
  oauth?: {
    client_id: string;
    user_id?: number;
    scope: string;
    token: string;
  };
}

export class OAuthMiddleware {
  private oauthService: OAuthService;

  constructor() {
    this.oauthService = OAuthService.getInstance();
  }

  /**
   * Validate OAuth 2.1 token for MCP authorization
   */
  validateToken = (requiredScopes: string[] = []) => {
    return async (req: OAuthRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
          res.status(401).json({
            error: 'invalid_request',
            error_description: 'Authorization header is required',
            www_authenticate: 'Bearer realm="MCP API"'
          });
          return;
        }

        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
          res.status(401).json({
            error: 'invalid_request',
            error_description: 'Invalid authorization header format',
            www_authenticate: 'Bearer realm="MCP API"'
          });
          return;
        }

        const token = parts[1];
        const tokenData = await this.oauthService.validateAccessToken(token);

        if (!tokenData) {
          res.status(401).json({
            error: 'invalid_token',
            error_description: 'The access token is invalid or expired',
            www_authenticate: 'Bearer realm="MCP API"'
          });
          return;
        }

        // Check required scopes if provided
        if (requiredScopes.length > 0) {
          const hasRequiredScopes = await this.oauthService.validateScope(token, requiredScopes);
          if (!hasRequiredScopes) {
            res.status(403).json({
              error: 'insufficient_scope',
              error_description: `Required scopes: ${requiredScopes.join(', ')}`,
              www_authenticate: `Bearer realm="MCP API", scope="${requiredScopes.join(' ')}"`
            });
            return;
          }
        }

        // Attach OAuth data to request
        req.oauth = {
          client_id: tokenData.client_id,
          user_id: tokenData.user_id,
          scope: tokenData.scope,
          token
        };

        next();
      } catch (error) {
        console.error('OAuth validation error:', error);
        res.status(500).json({
          error: 'server_error',
          error_description: 'Unable to validate token'
        });
      }
    };
  };

  /**
   * Middleware for MCP tool authorization
   */
  requireMcpToolAccess = (toolName?: string) => {
    const requiredScopes = ['mcp:tools:call'];
    if (toolName) {
      // Add tool-specific scope if available
      requiredScopes.push(`mcp:tools:${toolName}`);
    }
    return this.validateToken(requiredScopes);
  };

  /**
   * Middleware for MCP resource authorization
   */
  requireMcpResourceAccess = (action: 'read' | 'write' = 'read') => {
    return this.validateToken([`mcp:resources:${action}`]);
  };

  /**
   * Middleware for wallet-specific operations
   */
  requireWalletAccess = (resource: string, action: 'read' | 'write' = 'read') => {
    return this.validateToken([`wallet:${resource}:${action}`]);
  };

  /**
   * Optional OAuth authentication (doesn't fail if no token)
   */
  optionalAuth = async (req: OAuthRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;

      if (authHeader) {
        const parts = authHeader.split(' ');
        if (parts.length === 2 && parts[0] === 'Bearer') {
          const token = parts[1];
          const tokenData = await this.oauthService.validateAccessToken(token);

          if (tokenData) {
            req.oauth = {
              client_id: tokenData.client_id,
              user_id: tokenData.user_id,
              scope: tokenData.scope,
              token
            };
          }
        }
      }

      next();
    } catch (error) {
      // Don't fail on optional auth
      next();
    }
  };
}

// Create and export OAuth middleware instance
const oauthMiddleware = new OAuthMiddleware();
export const validateOAuthToken = oauthMiddleware.validateToken;
export const requireMcpToolAccess = oauthMiddleware.requireMcpToolAccess;
export const requireMcpResourceAccess = oauthMiddleware.requireMcpResourceAccess;
export const requireWalletAccess = oauthMiddleware.requireWalletAccess;
export const optionalOAuth = oauthMiddleware.optionalAuth; 