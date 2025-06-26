import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { JwtService } from '../utils/jwt';
import { PasswordService } from '../utils/password';

export interface RegisterUserDto {
  email: string;
  password: string;
  name: string;
}

export interface LoginUserDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: number;
    email: string;
    name: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export class AuthService {
  private userRepository: Repository<User>;
  private jwtService: JwtService;
  private passwordService: PasswordService;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
    this.jwtService = new JwtService();
    this.passwordService = new PasswordService();
  }

  async register(userData: RegisterUserDto): Promise<AuthResponse> {
    const existingUser = await this.userRepository.findOne({
      where: { email: userData.email },
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    const passwordValidation = this.passwordService.validatePasswordStrength(userData.password);
    if (!passwordValidation.isValid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    const hashedPassword = await this.passwordService.hashPassword(userData.password);

    const user = this.userRepository.create({
      email: userData.email,
      password_hash: hashedPassword,
      name: userData.name,
    });

    const savedUser = await this.userRepository.save(user);

    const tokens = this.jwtService.generateTokens({
      userId: savedUser.id,
      email: savedUser.email,
    });

    return {
      user: {
        id: savedUser.id,
        email: savedUser.email,
        name: savedUser.name,
      },
      tokens,
    };
  }

  async login(loginData: LoginUserDto): Promise<AuthResponse> {
    const user = await this.userRepository.findOne({
      where: { email: loginData.email },
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isPasswordValid = await this.passwordService.comparePassword(
      loginData.password,
      user.password_hash
    );

    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    const tokens = this.jwtService.generateTokens({
      userId: user.id,
      email: user.email,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      tokens,
    };
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const payload = this.jwtService.verifyToken(refreshToken);
      
      const user = await this.userRepository.findOne({
        where: { id: payload.userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const accessToken = this.jwtService.generateAccessToken({
        userId: user.id,
        email: user.email,
      });

      return { accessToken };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  async getUserById(userId: number): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id: userId },
    });
  }

  async updateUserProfile(userId: number, updateData: Partial<{ name: string; email: string }>): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (updateData.email && updateData.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateData.email },
      });

      if (existingUser) {
        throw new Error('Email already in use');
      }
    }

    Object.assign(user, updateData);
    return this.userRepository.save(user);
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const isCurrentPasswordValid = await this.passwordService.comparePassword(
      currentPassword,
      user.password_hash
    );

    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    const passwordValidation = this.passwordService.validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    const hashedNewPassword = await this.passwordService.hashPassword(newPassword);
    user.password_hash = hashedNewPassword;
    await this.userRepository.save(user);
  }
}