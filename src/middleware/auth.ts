import { Request, Response, NextFunction } from 'express';
import { JwtService } from '../utils/jwt';
import { OAuthService } from '../services/OAuthService';
import { AuthService } from '../services/AuthService';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    email: string;
  };
}

export class AuthMiddleware {
  private jwtService: JwtService;
  private oauthService: OAuthService;
  private authService: AuthService;

  constructor() {
    this.jwtService = new JwtService();
    this.oauthService = OAuthService.getInstance();
    this.authService = new AuthService();
  }

  authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        res.status(401).json({
          success: false,
          message: 'Authorization header is required',
        });
        return;
      }

      const token = authHeader.split(' ')[1];

      if (!token) {
        res.status(401).json({
          success: false,
          message: 'Token is required',
        });
        return;
      }

      // Try JWT first, then OAuth
      try {
        const payload = this.jwtService.verifyToken(token);
        req.user = payload;
        next();
      } catch (jwtError) {
        // Try OAuth token
        const oauthToken = await this.oauthService.validateAccessToken(token);
        if (oauthToken && oauthToken.user_id) {
          // Fetch real user data
          const user = await this.authService.getUserById(oauthToken.user_id);
          if (user) {
            req.user = {
              userId: user.id,
              email: user.email
            };
            next();
          } else {
            res.status(401).json({
              success: false,
              message: 'User not found',
            });
          }
        } else {
          res.status(401).json({
            success: false,
            message: 'Invalid or expired token',
          });
        }
      }
    } catch (error) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }
  };

  optionalAuth = (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    try {
      const authHeader = req.headers.authorization;

      if (authHeader) {
        const token = authHeader.split(' ')[1];
        if (token) {
          const payload = this.jwtService.verifyToken(token);
          req.user = payload;
        }
      }

      next();
    } catch (error) {
      next();
    }
  };
}

// Create and export auth middleware instance
const authMiddleware = new AuthMiddleware();
export const auth = authMiddleware.authenticate;