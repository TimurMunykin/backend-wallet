import { Request, Response, NextFunction } from 'express';
import { JwtService } from '../utils/jwt';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    email: string;
  };
}

export class AuthMiddleware {
  private jwtService: JwtService;

  constructor() {
    this.jwtService = new JwtService();
  }

  authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
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

      const payload = this.jwtService.verifyToken(token);
      req.user = payload;
      next();
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