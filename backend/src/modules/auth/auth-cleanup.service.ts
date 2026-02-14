import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { lt } from 'drizzle-orm';
import { DATABASE_TOKEN } from '../../database/database.provider';
import { Database } from '../../database/base.repository';
import { refreshTokens, householdInvitations } from '../../database/schema';

@Injectable()
export class AuthCleanupService {
  private readonly logger = new Logger(AuthCleanupService.name);

  constructor(
    @Inject(DATABASE_TOKEN)
    private db: Database,
  ) {}

  @Cron('0 * * * *')
  async cleanupExpiredTokens(): Promise<void> {
    const now = new Date();

    const deletedTokens = await this.db
      .delete(refreshTokens)
      .where(lt(refreshTokens.expiresAt, now))
      .returning();

    const deletedInvitations = await this.db
      .delete(householdInvitations)
      .where(lt(householdInvitations.expiresAt, now))
      .returning();

    if (deletedTokens.length > 0 || deletedInvitations.length > 0) {
      this.logger.log(
        `Cleanup: removed ${deletedTokens.length} expired tokens, ${deletedInvitations.length} expired invitations`,
      );
    }
  }
}
