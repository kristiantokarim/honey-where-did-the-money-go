import { Injectable, Inject } from '@nestjs/common';
import { eq, lt } from 'drizzle-orm';
import { DATABASE_TOKEN } from '../../database/database.provider';
import { BaseRepository, Database } from '../../database/base.repository';
import {
  users,
  User,
  NewUser,
  refreshTokens,
  RefreshToken,
  NewRefreshToken,
} from '../../database/schema';

@Injectable()
export class AuthRepository extends BaseRepository {
  constructor(
    @Inject(DATABASE_TOKEN)
    db: Database,
  ) {
    super(db);
  }

  async createUser(data: NewUser): Promise<User> {
    const [result] = await this.getDb().insert(users).values(data).returning();
    return result;
  }

  async findUserByEmail(email: string): Promise<User | undefined> {
    const [result] = await this.getDb()
      .select()
      .from(users)
      .where(eq(users.email, email));
    return result;
  }

  async findUserById(id: string): Promise<User | undefined> {
    const [result] = await this.getDb()
      .select()
      .from(users)
      .where(eq(users.id, id));
    return result;
  }

  async findUserByEmailVerificationToken(token: string): Promise<User | undefined> {
    const [result] = await this.getDb()
      .select()
      .from(users)
      .where(eq(users.emailVerificationToken, token));
    return result;
  }

  async findUserByPasswordResetToken(token: string): Promise<User | undefined> {
    const [result] = await this.getDb()
      .select()
      .from(users)
      .where(eq(users.passwordResetToken, token));
    return result;
  }

  async updateUser(id: string, data: Partial<NewUser>): Promise<User | undefined> {
    const [result] = await this.getDb()
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return result;
  }

  async createRefreshToken(data: NewRefreshToken): Promise<RefreshToken> {
    const [result] = await this.getDb()
      .insert(refreshTokens)
      .values(data)
      .returning();
    return result;
  }

  async findRefreshTokenByHash(hash: string): Promise<RefreshToken | undefined> {
    const [result] = await this.getDb()
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, hash));
    return result;
  }

  async deleteRefreshToken(id: string): Promise<void> {
    await this.getDb()
      .delete(refreshTokens)
      .where(eq(refreshTokens.id, id));
  }

  async deleteRefreshTokensByUserId(userId: string): Promise<void> {
    await this.getDb()
      .delete(refreshTokens)
      .where(eq(refreshTokens.userId, userId));
  }

  async deleteExpiredRefreshTokens(): Promise<number> {
    const result = await this.getDb()
      .delete(refreshTokens)
      .where(lt(refreshTokens.expiresAt, new Date()))
      .returning();
    return result.length;
  }
}
