import {
  Injectable,
  Inject,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { randomUUID, createHash } from 'crypto';
import { DATABASE_TOKEN } from '../../database/database.provider';
import { Database } from '../../database/base.repository';
import { households, householdMembers } from '../../database/schema';
import { AuthRepository } from './auth.repository';
import { EmailService } from './email.service';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  VerifyEmailDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './auth.dto';

@Injectable()
export class AuthService {
  private readonly accessSecret: string;
  private readonly accessExpiresIn: string;

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    @Inject(DATABASE_TOKEN) private readonly db: Database,
  ) {
    this.accessSecret = this.configService.get<string>('jwt.accessSecret', 'access-secret');
    this.accessExpiresIn = this.configService.get<string>('jwt.accessExpiresIn', '15m');
  }

  async register(dto: RegisterDto) {
    const existingUser = await this.authRepository.findUserByEmail(dto.email);
    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const emailVerificationToken = randomUUID();
    const emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    let user;
    await this.db.transaction(async (tx) => {
      const txRepo = this.authRepository.withTx(tx);

      user = await txRepo.createUser({
        email: dto.email,
        passwordHash,
        name: dto.name,
        emailVerificationToken,
        emailVerificationExpiresAt,
      });

      const [household] = await tx
        .insert(households)
        .values({ name: `${dto.name}'s Household` })
        .returning();

      await tx.insert(householdMembers).values({
        householdId: household.id,
        userId: user.id,
        role: 'owner',
      });
    });

    await this.emailService.sendVerificationEmail(dto.email, emailVerificationToken);

    return { message: 'Registration successful. Please verify your email.' };
  }

  async login(dto: LoginDto) {
    const user = await this.authRepository.findUserByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException('Please verify your email');
    }

    return this.generateTokens(user.id, user.email, user.name);
  }

  async refresh(dto: RefreshTokenDto) {
    const tokenHash = this.hashToken(dto.refreshToken);
    const storedToken = await this.authRepository.findRefreshTokenByHash(tokenHash);

    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.authRepository.deleteRefreshToken(storedToken.id);

    const user = await this.authRepository.findUserById(storedToken.userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.generateTokens(user.id, user.email, user.name);
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const user = await this.authRepository.findUserByEmailVerificationToken(dto.token);

    if (!user || !user.emailVerificationExpiresAt || user.emailVerificationExpiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.authRepository.updateUser(user.id, {
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpiresAt: null,
    });

    return { message: 'Email verified successfully' };
  }

  async resendVerificationEmail(dto: ForgotPasswordDto) {
    const genericResponse = {
      message: 'If an unverified account exists, a verification email has been sent.',
    };

    const user = await this.authRepository.findUserByEmail(dto.email);

    if (!user || user.emailVerified) {
      return genericResponse;
    }

    const cooldownMs = 60 * 1000;
    if (
      user.lastVerificationEmailSentAt &&
      Date.now() - user.lastVerificationEmailSentAt.getTime() < cooldownMs
    ) {
      return genericResponse;
    }

    const emailVerificationToken = randomUUID();
    const emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.authRepository.updateUser(user.id, {
      emailVerificationToken,
      emailVerificationExpiresAt,
      lastVerificationEmailSentAt: new Date(),
    });

    await this.emailService.sendVerificationEmail(dto.email, emailVerificationToken);

    return genericResponse;
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.authRepository.findUserByEmail(dto.email);

    if (user) {
      const passwordResetToken = randomUUID();
      const passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await this.authRepository.updateUser(user.id, {
        passwordResetToken,
        passwordResetExpiresAt,
      });

      await this.emailService.sendPasswordResetEmail(dto.email, passwordResetToken);
    }

    return { message: 'If an account exists, a reset email has been sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.authRepository.findUserByPasswordResetToken(dto.token);

    if (!user || !user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);

    await this.authRepository.updateUser(user.id, {
      passwordHash,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
    });

    await this.authRepository.deleteRefreshTokensByUserId(user.id);

    return { message: 'Password reset successfully' };
  }

  async logout(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const storedToken = await this.authRepository.findRefreshTokenByHash(tokenHash);

    if (storedToken) {
      await this.authRepository.deleteRefreshToken(storedToken.id);
    }

    return { message: 'Logged out' };
  }

  async getMe(userId: string) {
    const user = await this.authRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return { id: user.id, email: user.email, name: user.name };
  }

  private async generateTokens(userId: string, email: string, name: string) {
    const accessToken = jwt.sign(
      { sub: userId, email },
      this.accessSecret,
      { expiresIn: this.accessExpiresIn as jwt.SignOptions['expiresIn'] },
    );

    const rawRefreshToken = randomUUID();
    const tokenHash = this.hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.authRepository.createRefreshToken({
      userId,
      tokenHash,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: { id: userId, email, name },
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
