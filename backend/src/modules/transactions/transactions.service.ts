import { Injectable, Inject, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { TransactionsRepository } from './transactions.repository';
import { UpdateTransactionDto, DateRangeQueryDto, LedgerTotalQueryDto } from '../../common/dtos/transaction.dto';
import { Transaction, NewTransaction } from '../../database/schema';
import { Category, PaymentApp, TransactionType } from '../../common/enums';
import { DATABASE_TOKEN } from '../../database/database.provider';
import { Database } from '../../database/base.repository';

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
    @Inject(DATABASE_TOKEN)
    private readonly db: Database,
  ) {}

  async getHistory(
    query: DateRangeQueryDto,
  ): Promise<Array<Transaction & { linkedTransaction?: Transaction; forwardedTransaction?: Transaction; forwardedCcTransactions?: Transaction[] }>> {
    const { startDate, endDate, category, by, sortBy, payment } = query;
    const transactions = await this.repository.findByDateRange(startDate, endDate, category, by, sortBy, payment);

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
    by?: string,
    payment?: PaymentApp,
  ): Promise<Array<{ name: string; total: number }>> {
    return this.repository.getDashboardData(startDate, endDate, by, payment);
  }

  async getLedgerTotal(
    query: LedgerTotalQueryDto,
  ): Promise<{ total: number }> {
    const { startDate, endDate, mode, category, by, payment } = query;
    return this.repository.getLedgerTotal(startDate, endDate, mode, category, by, payment);
  }

  async update(id: number, data: UpdateTransactionDto): Promise<Transaction> {
    return await this.db.transaction(async (dbTx) => {
      const txRepo = this.repository.withTx(dbTx);

      const [locked] = await txRepo.findByIdsForUpdate([id]);
      if (!locked) {
        throw new NotFoundException(`Transaction with id ${id} not found`);
      }

      const updateData: Partial<NewTransaction> = { ...data };
      if (data.total !== undefined) {
        updateData.price = data.total;
      }

      const result = await txRepo.update(id, updateData);
      if (!result) {
        throw new BadRequestException('Failed to update transaction');
      }

      if (data.category !== undefined) {
        await this.syncForwardedCategoryWithTx(txRepo, locked, data.category);
      }

      return result;
    });
  }

  private async syncForwardedCategoryWithTx(
    txRepo: TransactionsRepository,
    transaction: Transaction,
    category: Category,
  ): Promise<void> {
    const idsToUpdate: number[] = [];

    if (transaction.forwardedTransactionId) {
      idsToUpdate.push(transaction.forwardedTransactionId);
    }

    const linkedCcTransactions = await txRepo.findTransactionsWithForwardedLink([transaction.id]);
    idsToUpdate.push(...linkedCcTransactions.map((t) => t.id));

    if (idsToUpdate.length > 0) {
      await txRepo.updateCategoryForIds(idsToUpdate, category);
      this.logger.log(`Synced category to ${idsToUpdate.length} linked transaction(s)`);
    }
  }

  async delete(id: number): Promise<void> {
    await this.db.transaction(async (dbTx) => {
      const txRepo = this.repository.withTx(dbTx);

      const [locked] = await txRepo.findByIdsForUpdate([id]);
      if (!locked) {
        throw new NotFoundException(`Transaction with id ${id} not found`);
      }

      if (locked.linkedTransferId) {
        throw new BadRequestException(
          'Cannot delete linked transfer. Unlink the transfer first.'
        );
      }

      if (locked.forwardedTransactionId) {
        throw new BadRequestException(
          'Cannot delete linked CC transaction. Unlink from app transaction first.'
        );
      }

      const [ccChildren, transferLinks] = await Promise.all([
        txRepo.findTransactionsWithForwardedLink([id]),
        txRepo.findTransactionsWithTransferLink([id]),
      ]);

      if (ccChildren.length > 0) {
        throw new BadRequestException(
          'Cannot delete transaction with linked CC payments. Unlink them first.'
        );
      }

      if (transferLinks.length > 0) {
        throw new BadRequestException(
          'Cannot delete transaction that is linked as a transfer target. Unlink the transfer first.'
        );
      }

      await txRepo.delete(id);
    });
  }

  async unlinkTransfer(id: number): Promise<void> {
    let linkedTransferId: number | null = null;

    await this.db.transaction(async (dbTx) => {
      const txRepo = this.repository.withTx(dbTx);

      const [locked] = await txRepo.findByIdsForUpdate([id]);
      if (!locked) {
        throw new NotFoundException(`Transaction with id ${id} not found`);
      }

      if (!locked.linkedTransferId) {
        throw new BadRequestException('Transaction is not linked to any transfer');
      }

      linkedTransferId = locked.linkedTransferId;
      await txRepo.unlinkTransfer(id);
    });

    this.logger.log(`Unlinked transaction ${id} from ${linkedTransferId}`);
  }

  async linkForwarded(ccTransactionId: number, appTransactionId: number): Promise<void> {
    await this.db.transaction(async (dbTx) => {
      const txRepo = this.repository.withTx(dbTx);

      const sortedIds = [ccTransactionId, appTransactionId].sort((a, b) => a - b);
      const locked = await txRepo.findByIdsForUpdate(sortedIds);

      const ccTransaction = locked.find((t) => t.id === ccTransactionId);
      const appTransaction = locked.find((t) => t.id === appTransactionId);

      if (!ccTransaction) {
        throw new NotFoundException(`Transaction with id ${ccTransactionId} not found`);
      }
      if (!appTransaction) {
        throw new NotFoundException(`Transaction with id ${appTransactionId} not found`);
      }

      if (ccTransaction.forwardedTransactionId) {
        throw new BadRequestException('CC transaction is already linked to another transaction');
      }

      await txRepo.linkForwarded(ccTransactionId, appTransactionId);
      await txRepo.update(ccTransactionId, { category: appTransaction.category });
    });

    this.logger.log(`Linked CC transaction ${ccTransactionId} to app transaction ${appTransactionId}, synced category`);
  }

  async unlinkForwarded(id: number): Promise<void> {
    let forwardedTransactionId: number | null = null;

    await this.db.transaction(async (dbTx) => {
      const txRepo = this.repository.withTx(dbTx);

      const [locked] = await txRepo.findByIdsForUpdate([id]);
      if (!locked) {
        throw new NotFoundException(`Transaction with id ${id} not found`);
      }

      if (!locked.forwardedTransactionId) {
        throw new BadRequestException('Transaction is not linked as forwarded');
      }

      forwardedTransactionId = locked.forwardedTransactionId;
      await txRepo.unlinkForwarded(id);
    });

    this.logger.log(`Unlinked forwarded transaction ${id} from ${forwardedTransactionId}`);
  }

  async findTransferMatchForTransaction(id: number): Promise<Transaction | null> {
    const tx = await this.findByIdOrThrow(id);

    if (tx.linkedTransferId) {
      throw new BadRequestException('Transaction is already linked');
    }

    if (tx.transactionType !== TransactionType.TransferIn && tx.transactionType !== TransactionType.TransferOut) {
      throw new BadRequestException('Only transfer transactions can be matched');
    }

    const matches = await this.repository.findPotentialTransferMatches([{
      transactionType: tx.transactionType,
      total: tx.total,
      date: tx.date,
      payment: tx.payment as PaymentApp,
    }]);

    return matches[0]?.match || null;
  }

  async findForwardedMatchForTransaction(id: number): Promise<Transaction[]> {
    const tx = await this.findByIdOrThrow(id);

    if (!tx.forwardedFromApp) {
      throw new BadRequestException('This transaction has no forwardedFromApp field');
    }

    if (tx.forwardedTransactionId) {
      throw new BadRequestException('Transaction is already linked to an app transaction');
    }

    const matches = await this.repository.findForwardedMatchCandidates([{
      forwardedFromApp: tx.forwardedFromApp as PaymentApp,
      total: tx.total,
      date: tx.date,
    }]);

    return matches[0]?.candidates || [];
  }

  async findReverseCcMatchForTransaction(id: number): Promise<Transaction[]> {
    const tx = await this.findByIdOrThrow(id);

    if (tx.payment !== PaymentApp.Grab && tx.payment !== PaymentApp.Gojek) {
      throw new BadRequestException('Only Grab or Gojek transactions can find CC matches');
    }

    const matches = await this.repository.findReverseForwardedMatchCandidates([{
      payment: tx.payment,
      total: tx.total,
      date: tx.date,
    }]);

    return matches[0]?.candidates || [];
  }

  async linkTransfer(id: number, matchedId: number): Promise<void> {
    await this.db.transaction(async (dbTx) => {
      const txRepo = this.repository.withTx(dbTx);

      const sortedIds = [id, matchedId].sort((a, b) => a - b);
      const locked = await txRepo.findByIdsForUpdate(sortedIds);

      const tx = locked.find((t) => t.id === id);
      const matchedTx = locked.find((t) => t.id === matchedId);

      if (!tx) {
        throw new NotFoundException(`Transaction with id ${id} not found`);
      }
      if (!matchedTx) {
        throw new NotFoundException(`Transaction with id ${matchedId} not found`);
      }

      if (tx.linkedTransferId) {
        throw new BadRequestException('Transaction is already linked');
      }
      if (matchedTx.linkedTransferId) {
        throw new BadRequestException('Matched transaction is already linked');
      }

      await txRepo.linkTransfers(id, matchedId);
    });

    this.logger.log(`Linked transactions ${id} and ${matchedId}`);
  }
}
