import { Injectable, Inject, Logger } from '@nestjs/common';
import { and, eq, lt, or, sql } from 'drizzle-orm';
import { DATABASE_TOKEN } from '../../database/database.provider';
import { BaseRepository, Database } from '../../database/base.repository';
import {
  scanSessions,
  scanSessionPages,
  ScanSession,
  NewScanSession,
  ScanSessionPage,
  NewScanSessionPage,
} from '../../database/schema';
import { SessionStatus, ParseStatus, ReviewStatus } from '../../common/enums';

@Injectable()
export class ScanRepository extends BaseRepository {
  private readonly logger = new Logger(ScanRepository.name);

  constructor(
    @Inject(DATABASE_TOKEN)
    db: Database,
  ) {
    super(db);
  }

  async createSession(data: NewScanSession): Promise<ScanSession> {
    const [result] = await this.getDb().insert(scanSessions).values(data).returning();
    return result;
  }

  async findSessionById(id: string): Promise<ScanSession | undefined> {
    const [result] = await this.getDb()
      .select()
      .from(scanSessions)
      .where(eq(scanSessions.id, id));
    return result;
  }

  async findActiveSessionByUser(userId: string): Promise<ScanSession | undefined> {
    const [result] = await this.getDb()
      .select()
      .from(scanSessions)
      .where(
        and(
          eq(scanSessions.userId, userId),
          eq(scanSessions.status, SessionStatus.InProgress),
        ),
      );
    return result;
  }

  async updateSession(
    id: string,
    data: Partial<NewScanSession>,
  ): Promise<ScanSession | undefined> {
    const [result] = await this.getDb()
      .update(scanSessions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(scanSessions.id, id))
      .returning();
    return result;
  }

  async deleteSession(id: string): Promise<void> {
    await this.getDb().delete(scanSessions).where(eq(scanSessions.id, id));
  }

  async createPages(pages: NewScanSessionPage[]): Promise<ScanSessionPage[]> {
    return await this.getDb().insert(scanSessionPages).values(pages).returning();
  }

  async findPagesBySessionId(sessionId: string): Promise<ScanSessionPage[]> {
    return await this.getDb()
      .select()
      .from(scanSessionPages)
      .where(eq(scanSessionPages.sessionId, sessionId))
      .orderBy(scanSessionPages.pageIndex);
  }

  async findPageBySessionAndIndex(
    sessionId: string,
    pageIndex: number,
  ): Promise<ScanSessionPage | undefined> {
    const [result] = await this.getDb()
      .select()
      .from(scanSessionPages)
      .where(
        and(
          eq(scanSessionPages.sessionId, sessionId),
          eq(scanSessionPages.pageIndex, pageIndex),
        ),
      );
    return result;
  }

  async findPageBySessionAndIndexForUpdate(
    sessionId: string,
    pageIndex: number,
  ): Promise<ScanSessionPage | undefined> {
    const [result] = await this.getDb()
      .select()
      .from(scanSessionPages)
      .where(
        and(
          eq(scanSessionPages.sessionId, sessionId),
          eq(scanSessionPages.pageIndex, pageIndex),
        ),
      )
      .for('update');
    return result;
  }

  async findSessionByIdForUpdate(id: string): Promise<ScanSession | undefined> {
    const [result] = await this.getDb()
      .select()
      .from(scanSessions)
      .where(eq(scanSessions.id, id))
      .for('update');
    return result;
  }

  async updatePage(
    id: number,
    data: Partial<ScanSessionPage>,
  ): Promise<ScanSessionPage | undefined> {
    const [result] = await this.getDb()
      .update(scanSessionPages)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(scanSessionPages.id, id))
      .returning();
    return result;
  }

  async updatePageIfPending(
    id: number,
    data: Partial<ScanSessionPage>,
  ): Promise<ScanSessionPage | undefined> {
    const [result] = await this.getDb()
      .update(scanSessionPages)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(scanSessionPages.id, id),
          or(
            eq(scanSessionPages.parseStatus, ParseStatus.Pending),
            eq(scanSessionPages.parseStatus, ParseStatus.Processing),
          ),
        ),
      )
      .returning();
    return result;
  }

  async updatePageForRetry(id: number, retryCount: number): Promise<void> {
    await this.getDb()
      .update(scanSessionPages)
      .set({
        parseStatus: ParseStatus.Pending,
        retryCount,
        parseError: null,
        updatedAt: new Date(),
      })
      .where(eq(scanSessionPages.id, id));
  }

  async updatePageParseStatus(
    id: number,
    status: ParseStatus,
    error?: string,
  ): Promise<void> {
    await this.getDb()
      .update(scanSessionPages)
      .set({
        parseStatus: status,
        parseError: error,
        updatedAt: new Date(),
      })
      .where(eq(scanSessionPages.id, id));
  }

  async markPageConfirmed(id: number): Promise<void> {
    await this.getDb()
      .update(scanSessionPages)
      .set({
        reviewStatus: ReviewStatus.Confirmed,
        confirmedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(scanSessionPages.id, id));
  }

  async findPagesNeedingParse(): Promise<ScanSessionPage[]> {
    const maxRetries = 3;
    return await this.getDb()
      .select()
      .from(scanSessionPages)
      .innerJoin(scanSessions, eq(scanSessionPages.sessionId, scanSessions.id))
      .where(
        and(
          eq(scanSessions.status, SessionStatus.InProgress),
          or(
            eq(scanSessionPages.parseStatus, ParseStatus.Pending),
            and(
              eq(scanSessionPages.parseStatus, ParseStatus.Failed),
              lt(scanSessionPages.retryCount, maxRetries),
            ),
          ),
        ),
      )
      .then((results) => results.map((r) => r.scan_session_pages));
  }

  async findExpiredSessions(): Promise<ScanSession[]> {
    return await this.getDb()
      .select()
      .from(scanSessions)
      .where(
        and(
          eq(scanSessions.status, SessionStatus.InProgress),
          lt(scanSessions.expiresAt, new Date()),
        ),
      );
  }

  async countParsedPages(sessionId: string): Promise<number> {
    const result = await this.getDb()
      .select({ count: sql<number>`count(*)` })
      .from(scanSessionPages)
      .where(
        and(
          eq(scanSessionPages.sessionId, sessionId),
          eq(scanSessionPages.parseStatus, ParseStatus.Completed),
        ),
      );
    return Number(result[0]?.count ?? 0);
  }

  async countTotalPages(sessionId: string): Promise<number> {
    const result = await this.getDb()
      .select({ count: sql<number>`count(*)` })
      .from(scanSessionPages)
      .where(eq(scanSessionPages.sessionId, sessionId));
    return Number(result[0]?.count ?? 0);
  }

  async allPagesConfirmed(sessionId: string): Promise<boolean> {
    const unconfirmed = await this.getDb()
      .select({ count: sql<number>`count(*)` })
      .from(scanSessionPages)
      .where(
        and(
          eq(scanSessionPages.sessionId, sessionId),
          eq(scanSessionPages.reviewStatus, ReviewStatus.Pending),
        ),
      );
    return Number(unconfirmed[0]?.count ?? 0) === 0;
  }

  async requeueStuckPages(
    sessionId: string,
    staleThresholdMs: number = 60000,
  ): Promise<number> {
    const staleDate = new Date(Date.now() - staleThresholdMs);

    const result = await this.getDb()
      .update(scanSessionPages)
      .set({
        parseStatus: ParseStatus.Pending,
        parseError: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(scanSessionPages.sessionId, sessionId),
          or(
            eq(scanSessionPages.parseStatus, ParseStatus.Pending),
            eq(scanSessionPages.parseStatus, ParseStatus.Failed),
            and(
              eq(scanSessionPages.parseStatus, ParseStatus.Processing),
              lt(scanSessionPages.updatedAt, staleDate),
            ),
          ),
        ),
      )
      .returning();
    return result.length;
  }

  async checkAndUpdateRetryThrottle(
    sessionId: string,
    throttleMs: number,
  ): Promise<{ allowed: boolean; waitSeconds?: number }> {
    const now = new Date();
    const throttleDate = new Date(now.getTime() - throttleMs);

    const result = await this.getDb()
      .update(scanSessions)
      .set({ lastRetryAt: now, updatedAt: now })
      .where(
        and(
          eq(scanSessions.id, sessionId),
          or(
            sql`${scanSessions.lastRetryAt} IS NULL`,
            lt(scanSessions.lastRetryAt, throttleDate),
          ),
        ),
      )
      .returning();

    if (result.length > 0) {
      return { allowed: true };
    }

    const session = await this.findSessionById(sessionId);
    if (!session?.lastRetryAt) {
      return { allowed: true };
    }

    const timeSinceLastRetry = now.getTime() - session.lastRetryAt.getTime();
    const waitSeconds = Math.ceil((throttleMs - timeSinceLastRetry) / 1000);
    return { allowed: false, waitSeconds };
  }
}
