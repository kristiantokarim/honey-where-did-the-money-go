import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ScanRepository } from './scan.repository';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class ScanCleanupService implements OnModuleInit {
  private readonly logger = new Logger(ScanCleanupService.name);

  constructor(
    private readonly repository: ScanRepository,
    private readonly storageService: StorageService,
  ) {}

  async onModuleInit() {
    await this.cleanupExpiredSessions();
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredSessions() {
    this.logger.log('Running expired session cleanup...');

    try {
      const expiredSessions = await this.repository.findExpiredSessions();

      if (expiredSessions.length === 0) {
        this.logger.log('No expired sessions found');
        return;
      }

      for (const session of expiredSessions) {
        await this.cleanupSession(session.id);
      }

      this.logger.log(`Cleaned up ${expiredSessions.length} expired session(s)`);
    } catch (error) {
      this.logger.error('Failed to cleanup expired sessions:', error);
    }
  }

  private async cleanupSession(sessionId: string): Promise<void> {
    try {
      const pages = await this.repository.findPagesBySessionId(sessionId);

      await Promise.all(
        pages.map((page) =>
          this.storageService.delete(page.imageKey).catch((err) => {
            this.logger.warn(
              `Failed to delete image ${page.imageKey}: ${err.message}`,
            );
          }),
        ),
      );

      await this.repository.deleteSession(sessionId);
      this.logger.log(`Cleaned up expired session ${sessionId}`);
    } catch (error) {
      this.logger.error(`Failed to cleanup session ${sessionId}:`, error);
    }
  }
}
