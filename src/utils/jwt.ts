import jwt from 'jsonwebtoken';

export interface JwtPayload {
  userId: number;
  email: string;
}

export class JwtService {
  private readonly secret: string;
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;

  constructor() {
    this.secret = process.env['JWT_SECRET'] || 'your-secret-key';
    this.accessTokenExpiry = process.env['JWT_ACCESS_EXPIRY'] || '1h';
    this.refreshTokenExpiry = process.env['JWT_REFRESH_EXPIRY'] || '7d';
  }

  generateAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, this.secret, {
      expiresIn: this.accessTokenExpiry,
      issuer: 'finance-app',
      audience: 'finance-app-users',
    } as jwt.SignOptions);
  }

  generateRefreshToken(payload: JwtPayload): string {
    return jwt.sign(payload, this.secret, {
      expiresIn: this.refreshTokenExpiry,
      issuer: 'finance-app',
      audience: 'finance-app-users',
    } as jwt.SignOptions);
  }

  verifyToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, this.secret, {
        issuer: 'finance-app',
        audience: 'finance-app-users',
      } as jwt.VerifyOptions) as JwtPayload;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  generateTokens(payload: JwtPayload): { accessToken: string; refreshToken: string } {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload),
    };
  }
}