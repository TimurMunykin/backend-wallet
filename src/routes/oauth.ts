import { Router } from 'express';
import { OAuthController } from '../controllers/OAuthController';
import { AuthMiddleware } from '../middleware/auth';

const router = Router();
const oauthController = new OAuthController();
const authMiddleware = new AuthMiddleware();

// Authorization Server Metadata endpoint (RFC 8414)
router.get('/oauth-authorization-server', oauthController.getAuthorizationServerMetadata);

// MCP Discovery endpoint
router.get('/mcp', async (req, res) => {
  try {
    // Force https for production domains
    const host = req.get('host');
    const baseUrl = `https://${host}`;
    
    // Add ngrok bypass header
    res.header('ngrok-skip-browser-warning', 'true');
    
    const mcpSpec = {
      schemaVersion: "2024-11-05",
      name: "Personal Finance Assistant",
      description: "MCP server for personal finance management with account tracking, transaction analysis, and financial analytics",
      version: "1.0.0",
      author: {
        name: "Personal Finance Team",
        email: "support@personalfinance.com"
      },
      mcp: {
        mcpVersion: "2024-11-05",
        capabilities: {
          tools: {},
          resources: {},
          prompts: {}
        }
      },
      oauth: {
        authorizationUrl: `${baseUrl}/oauth/authorize`,
        tokenUrl: `${baseUrl}/oauth/token`,
        scope: "mcp:tools:list mcp:tools:call wallet:accounts:read wallet:accounts:write wallet:transactions:read wallet:transactions:write wallet:analytics:read"
      },
      transports: {
        sse: {
          url: `${baseUrl}/mcp/sse`
        }
      }
    };

    res.json(mcpSpec);
  } catch (error) {
    console.error('MCP discovery error:', error);
    res.status(500).json({
      error: 'server_error',
      error_description: 'Unable to retrieve MCP server metadata'
    });
  }
});

// OAuth 2.1 endpoints
router.get('/authorize', oauthController.authorize);
router.post('/authorize', authMiddleware.authenticate, oauthController.handleConsent);
router.post('/token', oauthController.token);
router.post('/register', oauthController.register);

// Additional OAuth endpoints
router.get('/jwks', async (_req, res) => {
  // JWKS endpoint for public keys (needed for JWT validation)
  // For now, return empty set as we're using shared secret
  res.json({
    keys: []
  });
});

router.get('/userinfo', async (_req, res) => {
  // User info endpoint
  res.json({
    sub: 'demo-user',
    name: 'Demo User',
    email: 'demo@example.com'
  });
});

router.post('/revoke', async (_req, res) => {
  // Token revocation endpoint
  res.json({ success: true });
});

router.post('/introspect', async (_req, res) => {
  // Token introspection endpoint
  res.json({ active: false });
});

export default router; 