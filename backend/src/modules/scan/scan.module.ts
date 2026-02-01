import { Module } from '@nestjs/common';
import { ScanController } from './scan.controller';
import { ScanService } from './scan.service';
import { ScanRepository } from './scan.repository';
import { ParseQueueService } from './parse-queue.service';
import { ScanCleanupService } from './scan-cleanup.service';
import { ParserModule } from '../parser/parser.module';
import { StorageModule } from '../storage/storage.module';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
  imports: [ParserModule, StorageModule, TransactionsModule],
  controllers: [ScanController],
  providers: [
    ScanService,
    ScanRepository,
    ParseQueueService,
    ScanCleanupService,
  ],
  exports: [ScanService],
})
export class ScanModule {}
