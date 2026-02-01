import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ScanRepository } from './scan.repository';
import { ParseQueueService } from './parse-queue.service';
import { TransactionsRepository } from '../transactions/transactions.repository';
import { StorageService } from '../storage/storage.service';
import { DATABASE_TOKEN } from '../../database/database.provider';
import { Database } from '../../database/base.repository';
import {
  SessionStatus,
  ParseStatus,
  ReviewStatus,
  PaymentApp,
  TransactionType,
  Category,
} from '../../common/enums';
import { NewTransaction, Transaction } from '../../database/schema';
import {
  ScanSessionResponseDto,
  ScanSessionStatusDto,
  PageStatusDto,
  PageReviewDto,
  ConfirmPageResponseDto,
  RetryParseResponseDto,
  ConfirmTransactionItemDto,
} from '../../common/dtos/scan-session.dto';
import { ParsedTransaction } from '../../common/dtos/parse-result.dto';

interface RawParsedTransaction {
  date: string;
  category: Category;
  expense: string;
  price: number;
  quantity: number;
  total: number;
  payment: PaymentApp;
  to: string;
  remarks?: string;
  status: string;
  isValid: boolean;
  transactionType: TransactionType;
  forwardedFromApp?: PaymentApp;
}

@Injectable()
export class ScanService {
  private readonly logger = new Logger(ScanService.name);
  private readonly sessionExpiryHours = 48;
  private readonly retryThrottleMs = 30000;

  constructor(
    private readonly repository: ScanRepository,
    private readonly parseQueue: ParseQueueService,
    private readonly transactionsRepository: TransactionsRepository,
    private readonly storageService: StorageService,
    @Inject(DATABASE_TOKEN)
    private readonly db: Database,
  ) {}

  async createSession(
    userId: string,
    files: Express.Multer.File[],
    appTypes?: PaymentApp[],
  ): Promise<ScanSessionStatusDto> {
    const existingSession = await this.repository.findActiveSessionByUser(userId);
    if (existingSession) {
      throw new ConflictException(
        'An active scan session already exists. Complete or cancel the existing session first.',
      );
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.sessionExpiryHours);

    const session = await this.repository.createSession({
      userId,
      status: SessionStatus.InProgress,
      currentPageIndex: 0,
      expiresAt,
    });

    const uploadResults = await Promise.all(
      files.map(async (file, index) => {
        const imageKey = await this.storageService.upload(
          file.buffer,
          file.originalname,
          file.mimetype,
        );
        const imageUrl = await this.storageService.getUrl(imageKey);
        return {
          pageIndex: index,
          imageKey,
          imageUrl,
          appType: appTypes?.[index],
        };
      }),
    );

    const pages = await this.repository.createPages(
      uploadResults.map((result) => ({
        sessionId: session.id,
        pageIndex: result.pageIndex,
        imageKey: result.imageKey,
        imageUrl: result.imageUrl,
        appType: result.appType,
        parseStatus: ParseStatus.Pending,
        reviewStatus: ReviewStatus.Pending,
        retryCount: 0,
      })),
    );

    for (const page of pages) {
      this.parseQueue.enqueue({
        sessionId: session.id,
        pageIndex: page.pageIndex,
        pageId: page.id,
        imageKey: page.imageKey,
        appType: page.appType as PaymentApp | undefined,
      });
    }

    this.logger.log(
      `Created session ${session.id} with ${files.length} pages for user ${userId}`,
    );

    return {
      sessionId: session.id,
      totalPages: files.length,
      parsedPages: 0,
      status: SessionStatus.InProgress,
      currentPageIndex: 0,
      createdAt: session.createdAt!,
      expiresAt: session.expiresAt,
      pages: pages.map((p) => ({
        pageIndex: p.pageIndex,
        parseStatus: p.parseStatus as ParseStatus,
        reviewStatus: p.reviewStatus as ReviewStatus,
        appType: p.appType as PaymentApp | null,
        parseError: p.parseError,
      })),
    };
  }

  async getSession(sessionId: string): Promise<ScanSessionStatusDto> {
    const session = await this.repository.findSessionById(sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    await this.checkAndCleanExpiredSession(session);

    const pages = await this.repository.findPagesBySessionId(sessionId);
    const parsedPages = pages.filter(
      (p) => p.parseStatus === ParseStatus.Completed,
    ).length;

    return {
      sessionId: session.id,
      totalPages: pages.length,
      parsedPages,
      status: session.status as SessionStatus,
      currentPageIndex: session.currentPageIndex,
      createdAt: session.createdAt!,
      expiresAt: session.expiresAt,
      pages: pages.map(
        (p): PageStatusDto => ({
          pageIndex: p.pageIndex,
          parseStatus: p.parseStatus as ParseStatus,
          reviewStatus: p.reviewStatus as ReviewStatus,
          appType: p.appType as PaymentApp | null,
          parseError: p.parseError,
        }),
      ),
    };
  }

  async getActiveSession(userId: string): Promise<ScanSessionStatusDto | null> {
    const session = await this.repository.findActiveSessionByUser(userId);
    if (!session) {
      return null;
    }

    if (new Date() > session.expiresAt) {
      await this.cleanupSession(session.id);
      return null;
    }

    return this.getSession(session.id);
  }

  async getPageForReview(
    sessionId: string,
    pageIndex: number,
  ): Promise<PageReviewDto> {
    const session = await this.repository.findSessionById(sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    await this.checkAndCleanExpiredSession(session);

    const page = await this.repository.findPageBySessionAndIndex(
      sessionId,
      pageIndex,
    );
    if (!page) {
      throw new NotFoundException('Page not found');
    }

    if (page.parseStatus !== ParseStatus.Completed) {
      throw new BadRequestException(
        `Page ${pageIndex} is not ready for review. Parse status: ${page.parseStatus}`,
      );
    }

    const rawTransactions = page.parseResult as unknown as RawParsedTransaction[];
    const appType = page.appType as PaymentApp;

    const enrichedTransactions = await this.enrichTransactions(
      rawTransactions,
      appType,
    );

    const imageUrl = await this.storageService.getUrl(page.imageKey);

    return {
      pageIndex: page.pageIndex,
      imageUrl,
      appType: page.appType as PaymentApp | null,
      transactions: enrichedTransactions.map((t) => ({
        ...t,
        isDuplicate: t.isDuplicate ?? false,
        duplicateMatchedId: t.duplicateMatchedId,
        transferMatch: t.transferMatch ?? null,
        forwardedMatchCandidates: t.forwardedMatchCandidates ?? [],
        reverseCcMatchCandidates: t.reverseCcMatchCandidates ?? [],
      })),
    };
  }

  private async enrichTransactions(
    rawTransactions: RawParsedTransaction[],
    appType: PaymentApp,
  ): Promise<ParsedTransaction[]> {
    const duplicateCheckItems = rawTransactions.map((t) => ({
      date: t.date,
      total: t.total,
      to: t.to,
      expense: t.expense,
      payment: t.payment,
    }));

    const transferCheckItems = rawTransactions.map((t) => ({
      transactionType: t.transactionType,
      total: t.total,
      date: t.date,
      payment: t.payment,
    }));

    const forwardedItems = rawTransactions
      .map((t, idx) => ({ ...t, originalIndex: idx }))
      .filter((t) => t.forwardedFromApp);

    const forwardedCheckItems = forwardedItems.map((t) => ({
      forwardedFromApp: t.forwardedFromApp!,
      total: t.total,
      date: t.date,
    }));

    const isSourceApp =
      appType === PaymentApp.Grab || appType === PaymentApp.Gojek;
    const reverseCcCheckItems = isSourceApp
      ? rawTransactions.map((t) => ({
          payment: t.payment,
          total: t.total,
          date: t.date,
        }))
      : [];

    const [duplicates, transferMatches, forwardedMatches, reverseCcMatches] =
      await Promise.all([
        this.transactionsRepository.checkDuplicates(duplicateCheckItems),
        this.transactionsRepository.findPotentialTransferMatches(transferCheckItems),
        forwardedCheckItems.length > 0
          ? this.transactionsRepository.findForwardedMatchCandidates(forwardedCheckItems)
          : [],
        reverseCcCheckItems.length > 0
          ? this.transactionsRepository.findReverseForwardedMatchCandidates(reverseCcCheckItems)
          : [],
      ]);

    const forwardedMatchMap = new Map<number, Transaction[]>();
    for (const match of forwardedMatches) {
      const originalIndex = forwardedItems[match.index]?.originalIndex;
      if (originalIndex !== undefined) {
        forwardedMatchMap.set(originalIndex, match.candidates);
      }
    }

    return rawTransactions.map(
      (t, idx): ParsedTransaction => ({
        ...t,
        isDuplicate: duplicates[idx].exists,
        duplicateMatchedId: duplicates[idx].matchedId,
        transferMatch: transferMatches.find((m) => m.index === idx)?.match ?? null,
        forwardedMatchCandidates: forwardedMatchMap.get(idx) ?? [],
        reverseCcMatchCandidates: isSourceApp
          ? (reverseCcMatches.find((m) => m.index === idx)?.candidates ?? [])
          : [],
      }),
    );
  }

  async confirmPage(
    sessionId: string,
    pageIndex: number,
    transactions: ConfirmTransactionItemDto[],
  ): Promise<ConfirmPageResponseDto> {
    const result = await this.db.transaction(async (tx) => {
      const txRepo = this.repository.withTx(tx);

      const session = await txRepo.findSessionByIdForUpdate(sessionId);
      if (!session) {
        throw new NotFoundException('Session not found');
      }

      if (new Date() > session.expiresAt) {
        throw new BadRequestException('Session expired');
      }

      if (pageIndex !== session.currentPageIndex) {
        throw new BadRequestException(
          `Cannot confirm page ${pageIndex}. Current page is ${session.currentPageIndex}.`,
        );
      }

      const page = await txRepo.findPageBySessionAndIndexForUpdate(
        sessionId,
        pageIndex,
      );
      if (!page) {
        throw new NotFoundException('Page not found');
      }

      if (page.reviewStatus === ReviewStatus.Confirmed) {
        throw new BadRequestException('Page is already confirmed');
      }

      const imageUrl = await this.storageService.getUrl(page.imageKey);

      const transactionsToInsert: NewTransaction[] = transactions.map((item) => {
        const { matchedTransactionId, forwardedTransactionId, reverseCcMatchId, ...rest } = item;
        return {
          ...rest,
          price: item.total,
          quantity: item.quantity || 1,
          imageUrl,
          forwardedTransactionId: forwardedTransactionId,
        };
      });

      const links = transactions.map((item, index) => ({
        index,
        matchedTransactionId: item.matchedTransactionId,
        reverseCcMatchId: item.reverseCcMatchId,
      }));

      const totalPages = await txRepo.countTotalPages(sessionId);
      const nextPageIndex = pageIndex + 1;
      const sessionCompleted = nextPageIndex >= totalPages;

      let created: { id: number }[] = [];
      if (transactionsToInsert.length > 0) {
        const insertResult = await this.transactionsRepository
          .withTx(tx)
          .createManyWithLinks(transactionsToInsert, links);
        created = insertResult.created;
      }

      await txRepo.markPageConfirmed(page.id);

      if (sessionCompleted) {
        await txRepo.updateSession(sessionId, {
          status: SessionStatus.Completed,
          currentPageIndex: pageIndex,
        });
      } else {
        await txRepo.updateSession(sessionId, {
          currentPageIndex: nextPageIndex,
        });
      }

      return { created, sessionCompleted, nextPageIndex };
    });

    this.logger.log(
      `Confirmed page ${pageIndex} for session ${sessionId}: ${result.created.length} transactions`,
    );

    return {
      success: true,
      createdCount: result.created.length,
      nextPageIndex: result.sessionCompleted ? null : result.nextPageIndex,
      sessionCompleted: result.sessionCompleted,
    };
  }

  async retryParse(sessionId: string): Promise<RetryParseResponseDto> {
    const session = await this.repository.findSessionById(sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const throttleResult = await this.repository.checkAndUpdateRetryThrottle(
      sessionId,
      this.retryThrottleMs,
    );

    if (!throttleResult.allowed) {
      throw new BadRequestException(
        `Please wait ${throttleResult.waitSeconds} seconds before retrying again.`,
      );
    }

    const staleThresholdMs = 60000;
    const requeuedCount = await this.repository.requeueStuckPages(
      sessionId,
      staleThresholdMs,
    );

    const staleDate = new Date(Date.now() - staleThresholdMs);
    const pages = await this.repository.findPagesBySessionId(sessionId);
    for (const page of pages) {
      const isStaleProcessing =
        page.parseStatus === ParseStatus.Processing &&
        page.updatedAt &&
        page.updatedAt < staleDate;

      if (
        page.parseStatus === ParseStatus.Pending ||
        page.parseStatus === ParseStatus.Failed ||
        isStaleProcessing
      ) {
        this.parseQueue.enqueue({
          sessionId: session.id,
          pageIndex: page.pageIndex,
          pageId: page.id,
          imageKey: page.imageKey,
          appType: page.appType as PaymentApp | undefined,
        });
      }
    }

    return {
      requeuedCount,
      message: `${requeuedCount} page(s) re-queued for parsing`,
    };
  }

  async cancelSession(sessionId: string): Promise<void> {
    const session = await this.repository.findSessionById(sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    await this.cleanupSession(sessionId);
    this.logger.log(`Cancelled session ${sessionId}`);
  }

  private async cleanupSession(sessionId: string): Promise<void> {
    const pages = await this.repository.findPagesBySessionId(sessionId);
    const imageKeys = pages.map((page) => page.imageKey);

    await this.repository.deleteSession(sessionId);

    await Promise.all(
      imageKeys.map((imageKey) =>
        this.storageService.delete(imageKey).catch((err) => {
          this.logger.warn(`Failed to delete image ${imageKey}: ${err.message}`);
        }),
      ),
    );
  }

  private async checkAndCleanExpiredSession(session: { id: string; expiresAt: Date }): Promise<void> {
    if (new Date() > session.expiresAt) {
      await this.cleanupSession(session.id);
      throw new NotFoundException('Session expired');
    }
  }
}
