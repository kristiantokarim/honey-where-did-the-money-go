import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ScanRepository } from './scan.repository';
import { ParserService } from '../parser/parser.service';
import { StorageService } from '../storage/storage.service';
import { ParseStatus, PaymentApp } from '../../common/enums';

interface ParseJob {
  sessionId: string;
  pageIndex: number;
  pageId: number;
  imageKey: string;
  appType?: PaymentApp;
}

@Injectable()
export class ParseQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ParseQueueService.name);
  private readonly queue: ParseJob[] = [];
  private readonly processing = new Set<string>();
  private readonly concurrencyLimit = 3;
  private isRunning = false;
  private processingPromise: Promise<void> | null = null;

  constructor(
    private readonly repository: ScanRepository,
    private readonly parserService: ParserService,
    private readonly storageService: StorageService,
  ) {}

  async onModuleInit() {
    await this.recoverPendingPages();
    this.startProcessing();
  }

  onModuleDestroy() {
    this.stopProcessing();
  }

  private async recoverPendingPages() {
    try {
      const pendingPages = await this.repository.findPagesNeedingParse();
      for (const page of pendingPages) {
        this.enqueue({
          sessionId: page.sessionId,
          pageIndex: page.pageIndex,
          pageId: page.id,
          imageKey: page.imageKey,
          appType: page.appType as PaymentApp | undefined,
        });
      }
      if (pendingPages.length > 0) {
        this.logger.log(`Recovered ${pendingPages.length} pages for parsing`);
      }
    } catch (error) {
      this.logger.error('Failed to recover pending pages:', error);
    }
  }

  enqueue(job: ParseJob) {
    const jobKey = `${job.sessionId}:${job.pageIndex}`;
    if (this.processing.has(jobKey)) {
      this.logger.debug(`Job ${jobKey} is already being processed, skipping`);
      return;
    }
    if (this.queue.some((j) => j.sessionId === job.sessionId && j.pageIndex === job.pageIndex)) {
      this.logger.debug(`Job ${jobKey} is already in queue, skipping`);
      return;
    }
    this.queue.push(job);
    this.logger.debug(`Enqueued job for session ${job.sessionId}, page ${job.pageIndex}`);
  }

  enqueueWithDelay(job: ParseJob, delayMs: number) {
    setTimeout(() => {
      this.enqueue(job);
    }, delayMs);
  }

  private startProcessing() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.processingPromise = this.processLoop();
  }

  private stopProcessing() {
    this.isRunning = false;
  }

  private async processLoop() {
    while (this.isRunning) {
      const activeCount = this.processing.size;
      const availableSlots = this.concurrencyLimit - activeCount;

      if (availableSlots > 0 && this.queue.length > 0) {
        const jobsToProcess = this.queue.splice(0, availableSlots);
        for (const job of jobsToProcess) {
          const jobKey = `${job.sessionId}:${job.pageIndex}`;
          this.processing.add(jobKey);
          this.processJob(job).finally(() => {
            this.processing.delete(jobKey);
          });
        }
      }

      await this.sleep(100);
    }
  }

  private async processJob(job: ParseJob) {
    const { sessionId, pageIndex, pageId, imageKey, appType } = job;
    this.logger.log(`Processing page ${pageIndex} for session ${sessionId}`);

    try {
      const page = await this.repository.findPageBySessionAndIndex(sessionId, pageIndex);
      if (!page) {
        this.logger.warn(`Page ${pageIndex} not found for session ${sessionId}`);
        return;
      }

      if (page.parseStatus === ParseStatus.Completed) {
        this.logger.debug(`Page ${pageIndex} already completed, skipping`);
        return;
      }

      await this.repository.updatePage(pageId, { parseStatus: ParseStatus.Processing });

      const imageBuffer = await this.downloadImage(imageKey);
      const mimeType = this.getMimeType(imageKey);

      const result = await this.parserService.parseImage(
        imageBuffer,
        mimeType,
        appType,
      );

      await this.repository.updatePageIfPending(pageId, {
        parseStatus: ParseStatus.Completed,
        parseResult: result.transactions as unknown as Record<string, unknown>,
        appType: result.appType,
      });

      this.logger.log(
        `Successfully parsed page ${pageIndex} for session ${sessionId}: ${result.transactions.length} transactions`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to parse page ${pageIndex} for session ${sessionId}:`,
        error,
      );

      const page = await this.repository.findPageBySessionAndIndex(sessionId, pageIndex);
      if (!page) return;

      const newRetryCount = (page.retryCount || 0) + 1;
      const maxRetries = 3;

      if (newRetryCount >= maxRetries) {
        await this.repository.updatePageParseStatus(
          pageId,
          ParseStatus.Failed,
          error instanceof Error ? error.message : 'Unknown error',
        );
        this.logger.warn(
          `Page ${pageIndex} for session ${sessionId} failed after ${maxRetries} attempts`,
        );
      } else {
        await this.repository.updatePageForRetry(pageId, newRetryCount);
        const delayMs = 5000 * newRetryCount;
        this.enqueueWithDelay(
          { sessionId, pageIndex, pageId, imageKey, appType },
          delayMs,
        );
        this.logger.log(
          `Page ${pageIndex} retry ${newRetryCount} scheduled in ${delayMs}ms`,
        );
      }
    }
  }

  private async downloadImage(imageKey: string): Promise<Buffer> {
    const url = await this.storageService.getUrl(imageKey);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  private getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      default:
        return 'image/jpeg';
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getQueueStatus(): { queueLength: number; processing: number } {
    return {
      queueLength: this.queue.length,
      processing: this.processing.size,
    };
  }
}
