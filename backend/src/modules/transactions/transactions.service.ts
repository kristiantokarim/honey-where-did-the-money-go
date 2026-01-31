import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { TransactionsRepository } from './transactions.repository';
import { ParserService } from '../parser/parser.service';
import { StorageService } from '../storage/storage.service';
import { CreateTransactionDto, UpdateTransactionDto, DateRangeQueryDto, LedgerTotalQueryDto } from '../../common/dtos/transaction.dto';
import { ParsedTransaction } from '../../common/dtos/parse-result.dto';
import { Transaction, NewTransaction } from '../../database/schema';
import { PaymentApp, TransactionType } from '../../common/enums';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  private async findByIdOrThrow(id: number): Promise<Transaction> {
    const transaction = await this.repository.findById(id);
    if (!transaction) {
      throw new NotFoundException(`Transaction with id ${id} not found`);
    }
    return transaction;
  }

  constructor(
    private readonly repository: TransactionsRepository,
    private readonly parserService: ParserService,
    private readonly storageService: StorageService,
  ) {}

  async parseReceipt(
    file: Buffer,
    mimeType: string,
    originalFilename: string,
    appType?: PaymentApp,
  ): Promise<{
    appType: PaymentApp;
    transactions: ParsedTransaction[];
    imageUrl: string;
  }> {
    // Upload image to MinIO
    const imageFilename = await this.storageService.upload(file, originalFilename, mimeType);
    const imageUrl = await this.storageService.getUrl(imageFilename);

    // Parse the image (pass appType to skip AI detection if provided)
    const result = await this.parserService.parseImage(file, mimeType, appType);

    return {
      ...result,
      imageUrl,
    };
  }

  async checkDuplicates(
    items: Array<{ date: string; total: number; to: string; expense?: string }>,
  ): Promise<Array<{ exists: boolean; matchedId?: number }>> {
    return this.repository.checkDuplicates(items);
  }

  async checkTransferMatches(
    items: Array<{ transactionType: TransactionType; total: number; date: string; payment: PaymentApp }>,
  ): Promise<Array<{ index: number; match: Transaction | null }>> {
    return this.repository.findPotentialTransferMatches(items);
  }

  async confirmTransactions(
    items: CreateTransactionDto[],
  ): Promise<{ success: boolean; count: number }> {
    const transactionsToInsert: NewTransaction[] = items.map((item) => {
      const { matchedTransactionId, ...rest } = item;
      return {
        ...rest,
        price: item.total, // Sync price with total
        quantity: item.quantity || 1,
      };
    });

    const result = await this.repository.createMany(transactionsToInsert);
    this.logger.log(`Confirmed ${result.length} transactions`);

    // Link transfers if matchedTransactionId was provided
    for (let i = 0; i < items.length; i++) {
      if (items[i].matchedTransactionId && result[i]) {
        await this.repository.linkTransfers(result[i].id, items[i].matchedTransactionId);
        this.logger.log(`Linked transaction ${result[i].id} with ${items[i].matchedTransactionId}`);
      }
    }

    return { success: true, count: result.length };
  }

  async getHistory(
    query: DateRangeQueryDto,
  ): Promise<Array<Transaction & { linkedTransaction?: Transaction }>> {
    const { startDate, endDate, category, by, sortBy } = query;
    const transactions = await this.repository.findByDateRange(startDate, endDate, category, by, sortBy);

    // Collect all linked transaction IDs that need to be fetched
    const linkedIds = transactions
      .filter((t) => t.linkedTransferId)
      .map((t) => t.linkedTransferId as number);

    if (linkedIds.length === 0) {
      return transactions;
    }

    // Fetch all linked transactions in one query
    const linkedTransactions = await this.repository.findByIds(linkedIds);
    const linkedMap = new Map(linkedTransactions.map((t) => [t.id, t]));

    // Enrich transactions with their linked counterparts
    return transactions.map((t) => ({
      ...t,
      linkedTransaction: t.linkedTransferId ? linkedMap.get(t.linkedTransferId) : undefined,
    }));
  }

  async getDashboard(
    startDate: string,
    endDate: string,
  ): Promise<Array<{ name: string; total: number }>> {
    return this.repository.getDashboardData(startDate, endDate);
  }

  async getLedgerTotal(
    query: LedgerTotalQueryDto,
  ): Promise<{ total: number }> {
    const { startDate, endDate, mode, category, by } = query;
    return this.repository.getLedgerTotal(startDate, endDate, mode, category, by);
  }

  async update(id: number, data: UpdateTransactionDto): Promise<Transaction> {
    const existing = await this.findByIdOrThrow(id);

    // Sync total to price for consistency
    const updateData: Partial<NewTransaction> = { ...data };
    if (data.total !== undefined) {
      updateData.price = data.total;
    }

    const result = await this.repository.update(id, updateData);
    if (!result) {
      throw new BadRequestException('Failed to update transaction');
    }

    return result;
  }

  async delete(id: number): Promise<void> {
    const existing = await this.findByIdOrThrow(id);

    // Clear partner's link if this transaction was linked
    if (existing.linkedTransferId) {
      await this.repository.unlinkTransfer(id);
    }

    await this.repository.delete(id);
  }

  async unlinkTransfer(id: number): Promise<void> {
    const existing = await this.findByIdOrThrow(id);

    if (!existing.linkedTransferId) {
      throw new BadRequestException('Transaction is not linked to any transfer');
    }

    await this.repository.unlinkTransfer(id);
    this.logger.log(`Unlinked transaction ${id} from ${existing.linkedTransferId}`);
  }
}
