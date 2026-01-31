import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { TransactionsRepository } from './transactions.repository';
import { ParserService } from '../parser/parser.service';
import { StorageService } from '../storage/storage.service';
import { CreateTransactionDto, UpdateTransactionDto, DateRangeQueryDto, LedgerTotalQueryDto } from '../../common/dtos/transaction.dto';
import { ParsedTransaction } from '../../common/dtos/parse-result.dto';
import { Transaction, NewTransaction } from '../../database/schema';
import { Category, PaymentApp, TransactionType } from '../../common/enums';

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

    // Enrich transactions with match info
    const enriched = await this.enrichTransactions(result.transactions, result.appType);

    return {
      appType: result.appType,
      transactions: enriched,
      imageUrl,
    };
  }

  private async enrichTransactions(
    rawTransactions: RawParsedTransaction[],
    appType: PaymentApp,
  ): Promise<ParsedTransaction[]> {
    // Prepare data for parallel checks
    const duplicateCheckItems = rawTransactions.map(t => ({
      date: t.date,
      total: t.total,
      to: t.to,
      expense: t.expense,
      payment: t.payment,
    }));

    const transferCheckItems = rawTransactions.map(t => ({
      transactionType: t.transactionType,
      total: t.total,
      date: t.date,
      payment: t.payment,
    }));

    // Items that have forwardedFromApp (CC transactions looking for app transactions)
    const forwardedItems = rawTransactions
      .map((t, idx) => ({ ...t, originalIndex: idx }))
      .filter(t => t.forwardedFromApp);

    const forwardedCheckItems = forwardedItems.map(t => ({
      forwardedFromApp: t.forwardedFromApp!,
      total: t.total,
      date: t.date,
    }));

    // Check if this is a source app (Grab/Gojek) that needs reverse CC matching
    const isSourceApp = appType === PaymentApp.Grab || appType === PaymentApp.Gojek;
    const reverseCcCheckItems = isSourceApp
      ? rawTransactions.map(t => ({
          payment: t.payment,
          total: t.total,
          date: t.date,
        }))
      : [];

    // Run all checks in parallel
    const [duplicates, transferMatches, forwardedMatches, reverseCcMatches] = await Promise.all([
      this.repository.checkDuplicates(duplicateCheckItems),
      this.repository.findPotentialTransferMatches(transferCheckItems),
      forwardedCheckItems.length > 0
        ? this.repository.findForwardedMatchCandidates(forwardedCheckItems)
        : [],
      reverseCcCheckItems.length > 0
        ? this.repository.findReverseForwardedMatchCandidates(reverseCcCheckItems)
        : [],
    ]);

    // Build a map from forwardedItems index to candidates
    const forwardedMatchMap = new Map<number, Transaction[]>();
    for (const match of forwardedMatches) {
      const originalIndex = forwardedItems[match.index]?.originalIndex;
      if (originalIndex !== undefined) {
        forwardedMatchMap.set(originalIndex, match.candidates);
      }
    }

    return rawTransactions.map((t, idx): ParsedTransaction => ({
      ...t,
      isDuplicate: duplicates[idx].exists,
      duplicateMatchedId: duplicates[idx].matchedId,
      transferMatch: transferMatches.find(m => m.index === idx)?.match ?? null,
      forwardedMatchCandidates: forwardedMatchMap.get(idx) ?? [],
      reverseCcMatchCandidates: isSourceApp
        ? (reverseCcMatches.find(m => m.index === idx)?.candidates ?? [])
        : [],
    }));
  }

  async confirmTransactions(
    items: CreateTransactionDto[],
  ): Promise<{ success: boolean; count: number; createdIds: number[] }> {
    // Prepare transactions for insert
    const transactionsToInsert: NewTransaction[] = items.map((item) => {
      const { matchedTransactionId, forwardedTransactionId, reverseCcMatchId, ...rest } = item;
      return {
        ...rest,
        price: item.total, // Sync price with total
        quantity: item.quantity || 1,
        // Include forwardedTransactionId directly when saving (for CC→App linking set at scan time)
        forwardedTransactionId: forwardedTransactionId,
      };
    });

    // Prepare link instructions
    const links = items.map((item, index) => ({
      index,
      matchedTransactionId: item.matchedTransactionId,
      reverseCcMatchId: item.reverseCcMatchId,
    }));

    // Execute transactionally in repository
    const { created, createdIds } = await this.repository.createManyWithLinks(
      transactionsToInsert,
      links,
    );

    this.logger.log(`Confirmed ${created.length} transactions with links`);
    return { success: true, count: created.length, createdIds };
  }

  async getHistory(
    query: DateRangeQueryDto,
  ): Promise<Array<Transaction & { linkedTransaction?: Transaction; forwardedTransaction?: Transaction; forwardedCcTransactions?: Transaction[] }>> {
    const { startDate, endDate, category, by, sortBy } = query;
    const transactions = await this.repository.findByDateRange(startDate, endDate, category, by, sortBy);

    // Collect all linked transfer IDs that need to be fetched
    const linkedIds = transactions
      .filter((t) => t.linkedTransferId)
      .map((t) => t.linkedTransferId as number);

    // Collect all forwarded transaction IDs that need to be fetched
    const forwardedIds = transactions
      .filter((t) => t.forwardedTransactionId)
      .map((t) => t.forwardedTransactionId as number);

    // Collect IDs of transactions that might have CC transactions linked to them
    const transactionIds = transactions.map((t) => t.id);

    // Fetch all linked and forwarded transactions in parallel
    const [linkedTransactions, forwardedTransactions, ccTransactions] = await Promise.all([
      linkedIds.length > 0 ? this.repository.findByIds(linkedIds) : [],
      forwardedIds.length > 0 ? this.repository.findByIds(forwardedIds) : [],
      transactionIds.length > 0 ? this.repository.findTransactionsWithForwardedLink(transactionIds) : [],
    ]);

    const linkedMap = new Map<number, Transaction>(
      linkedTransactions.map((t): [number, Transaction] => [t.id, t])
    );
    const forwardedMap = new Map<number, Transaction>(
      forwardedTransactions.map((t): [number, Transaction] => [t.id, t])
    );

    // Group CC transactions by their forwarded source
    const ccTransactionsBySource = new Map<number, Transaction[]>();
    for (const cc of ccTransactions) {
      if (cc.forwardedTransactionId) {
        const existing = ccTransactionsBySource.get(cc.forwardedTransactionId) || [];
        existing.push(cc);
        ccTransactionsBySource.set(cc.forwardedTransactionId, existing);
      }
    }

    // Enrich transactions with their linked counterparts
    return transactions.map((t) => ({
      ...t,
      linkedTransaction: t.linkedTransferId ? linkedMap.get(t.linkedTransferId) : undefined,
      forwardedTransaction: t.forwardedTransactionId ? forwardedMap.get(t.forwardedTransactionId) : undefined,
      forwardedCcTransactions: ccTransactionsBySource.get(t.id),
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

    // Sync category to linked forwarded transactions
    if (data.category !== undefined) {
      await this.syncForwardedCategory(id, data.category);
    }

    return result;
  }

  private async syncForwardedCategory(transactionId: number, category: Category): Promise<void> {
    const transaction = await this.repository.findById(transactionId);
    if (!transaction) return;

    // If this is a CC transaction linked to an app transaction, update the app transaction
    if (transaction.forwardedTransactionId) {
      await this.repository.update(transaction.forwardedTransactionId, { category });
      this.logger.log(`Synced category to app transaction ${transaction.forwardedTransactionId}`);
    }

    // If this is an app transaction with linked CC transactions, update them all
    const linkedCcTransactions = await this.repository.findTransactionsWithForwardedLink([transactionId]);
    for (const ccTx of linkedCcTransactions) {
      await this.repository.update(ccTx.id, { category });
      this.logger.log(`Synced category to CC transaction ${ccTx.id}`);
    }
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

  async linkForwarded(ccTransactionId: number, appTransactionId: number): Promise<void> {
    const ccTransaction = await this.findByIdOrThrow(ccTransactionId);
    const appTransaction = await this.findByIdOrThrow(appTransactionId);

    if (ccTransaction.forwardedTransactionId) {
      throw new BadRequestException('CC transaction is already linked to another transaction');
    }

    // Link and sync category from app to CC
    await this.repository.linkForwarded(ccTransactionId, appTransactionId);
    await this.repository.update(ccTransactionId, { category: appTransaction.category });

    this.logger.log(`Linked CC transaction ${ccTransactionId} to app transaction ${appTransactionId}, synced category`);
  }

  async unlinkForwarded(id: number): Promise<void> {
    const existing = await this.findByIdOrThrow(id);

    if (!existing.forwardedTransactionId) {
      throw new BadRequestException('Transaction is not linked as forwarded');
    }

    await this.repository.unlinkForwarded(id);
    this.logger.log(`Unlinked forwarded transaction ${id} from ${existing.forwardedTransactionId}`);
  }
}
