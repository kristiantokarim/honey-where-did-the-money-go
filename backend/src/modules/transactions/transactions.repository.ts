import { Injectable, Inject, Logger } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, eq, gte, lte, desc, sql, inArray } from 'drizzle-orm';
import { DATABASE_TOKEN } from '../../database/database.provider';
import * as schema from '../../database/schema';
import { transactions, Transaction, NewTransaction } from '../../database/schema';
import { EXPENSE_TYPES, INCOME_TYPES, TransactionType, LedgerMode, SortBy, PaymentApp } from '../../common/enums';

@Injectable()
export class TransactionsRepository {
  private readonly logger = new Logger(TransactionsRepository.name);

  constructor(
    @Inject(DATABASE_TOKEN)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(data: NewTransaction): Promise<Transaction> {
    const [result] = await this.db.insert(transactions).values(data).returning();
    return result;
  }

  async createMany(data: NewTransaction[]): Promise<Transaction[]> {
    return await this.db.insert(transactions).values(data).returning();
  }

  async findById(id: number): Promise<Transaction | undefined> {
    const [result] = await this.db
      .select()
      .from(transactions)
      .where(eq(transactions.id, id));
    return result;
  }

  async findByIds(ids: number[]): Promise<Transaction[]> {
    if (ids.length === 0) return [];
    return await this.db
      .select()
      .from(transactions)
      .where(inArray(transactions.id, ids));
  }

  async findByDateRange(
    startDate: string,
    endDate: string,
    category?: string,
    by?: string,
    sortBy?: SortBy,
  ): Promise<Transaction[]> {
    const conditions = [
      gte(transactions.date, startDate),
      lte(transactions.date, endDate),
    ];

    if (category) {
      conditions.push(eq(transactions.category, category));
    }
    if (by) {
      conditions.push(eq(transactions.by, by));
    }

    const orderByColumn =
      sortBy === SortBy.Total ? desc(transactions.total) : desc(transactions.date);

    return await this.db
      .select()
      .from(transactions)
      .where(and(...conditions))
      .orderBy(orderByColumn);
  }

  async update(id: number, data: Partial<NewTransaction>): Promise<Transaction | undefined> {
    const [result] = await this.db
      .update(transactions)
      .set(data)
      .where(eq(transactions.id, id))
      .returning();
    return result;
  }

  async delete(id: number): Promise<void> {
    await this.db.delete(transactions).where(eq(transactions.id, id));
  }

  async checkDuplicates(
    items: Array<{ date: string; total: number; to: string; expense?: string; payment: PaymentApp }>,
  ): Promise<Array<{ exists: boolean; matchedId?: number }>> {
    this.logger.debug(`Checking duplicates for ${items.length} items`);

    return await Promise.all(
      items.map(async (item) => {
        this.logger.debug(
          `Checking: date=${item.date}, total=${item.total}, to=${item.to}, expense=${item.expense}, payment=${item.payment}`,
        );

        // Find candidates with same date, total, and payment app (duplicates only happen within same app)
        const candidates = await this.db
          .select()
          .from(transactions)
          .where(
            and(
              eq(transactions.date, item.date),
              eq(transactions.total, item.total),
              eq(transactions.payment, item.payment),
            ),
          );

        if (candidates.length === 0) {
          this.logger.debug('No candidates found with same date, total, and payment app');
          return { exists: false };
        }

        // Then, check fuzzy match on "to" and "expense"
        const match = candidates.find((candidate) => {
          const toMatch = this.fuzzyMatch(candidate.to, item.to);
          const expenseMatch = item.expense
            ? this.fuzzyMatch(candidate.expense, item.expense)
            : true;

          this.logger.debug(
            `Candidate ${candidate.id}: toMatch=${toMatch}, expenseMatch=${expenseMatch}`,
          );
          return toMatch || expenseMatch;
        });

        if (match) {
          this.logger.debug(`Found duplicate: id=${match.id}`);
          return { exists: true, matchedId: match.id };
        }

        this.logger.debug('No fuzzy match found');
        return { exists: false };
      }),
    );
  }

  private fuzzyMatch(a: string, b: string): boolean {
    if (!a || !b) return false;

    const normalize = (s: string) =>
      s
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]/g, '');

    const normA = normalize(a);
    const normB = normalize(b);

    // Exact match after normalization
    if (normA === normB) return true;

    // One contains the other
    if (normA.includes(normB) || normB.includes(normA)) return true;

    // Check similarity (simple Jaccard-like on words)
    const wordsA = new Set(a.toLowerCase().split(/\s+/));
    const wordsB = new Set(b.toLowerCase().split(/\s+/));
    const intersection = [...wordsA].filter((w) => wordsB.has(w));
    const union = new Set([...wordsA, ...wordsB]);
    const similarity = intersection.length / union.size;

    return similarity >= 0.5;
  }

  async getDashboardData(
    startDate: string,
    endDate: string,
  ): Promise<Array<{ name: string; total: number }>> {
    const data = await this.db
      .select()
      .from(transactions)
      .where(
        and(
          sql`${transactions.isExcluded} = false`,
          sql`${transactions.linkedTransferId} IS NULL`,
          sql`${transactions.forwardedTransactionId} IS NULL`,
          inArray(transactions.transactionType, [...EXPENSE_TYPES]),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate),
        ),
      );

    const categories = data.reduce(
      (acc, curr) => {
        acc[curr.category] = (acc[curr.category] || 0) + curr.total;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(categories)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }

  async getLedgerTotal(
    startDate: string,
    endDate: string,
    mode: LedgerMode,
    category?: string,
    by?: string,
  ): Promise<{ total: number }> {
    const conditions = [
      sql`${transactions.isExcluded} = false`,
      sql`${transactions.linkedTransferId} IS NULL`,
      sql`${transactions.forwardedTransactionId} IS NULL`,
      gte(transactions.date, startDate),
      lte(transactions.date, endDate),
    ];

    if (category) {
      conditions.push(eq(transactions.category, category));
    }
    if (by) {
      conditions.push(eq(transactions.by, by));
    }

    if (mode === LedgerMode.ExpensesOnly) {
      conditions.push(inArray(transactions.transactionType, [...EXPENSE_TYPES]));

      const result = await this.db
        .select({ total: sql<number>`COALESCE(SUM(${transactions.total}), 0)` })
        .from(transactions)
        .where(and(...conditions));

      return { total: Number(result[0]?.total ?? 0) };
    }

    // net_total mode: expenses - income
    // Fetch both expense and income transactions and compute in code
    const expenseConditions = [...conditions, inArray(transactions.transactionType, [...EXPENSE_TYPES])];
    const incomeConditions = [...conditions, inArray(transactions.transactionType, [...INCOME_TYPES])];

    const [expenseResult, incomeResult] = await Promise.all([
      this.db
        .select({ total: sql<number>`COALESCE(SUM(${transactions.total}), 0)` })
        .from(transactions)
        .where(and(...expenseConditions)),
      this.db
        .select({ total: sql<number>`COALESCE(SUM(${transactions.total}), 0)` })
        .from(transactions)
        .where(and(...incomeConditions)),
    ]);

    const expenseTotal = Number(expenseResult[0]?.total ?? 0);
    const incomeTotal = Number(incomeResult[0]?.total ?? 0);

    return { total: expenseTotal - incomeTotal };
  }

  async findPotentialTransferMatches(
    items: Array<{ transactionType: TransactionType; total: number; date: string; payment: PaymentApp }>,
  ): Promise<Array<{ index: number; match: Transaction | null }>> {
    return await Promise.all(
      items.map(async (item, index) => {
        // Only check for transfers
        if (item.transactionType !== TransactionType.TransferOut && item.transactionType !== TransactionType.TransferIn) {
          return { index, match: null };
        }

        const oppositeType = item.transactionType === TransactionType.TransferOut ? TransactionType.TransferIn : TransactionType.TransferOut;

        // Parse the date to check ±1 day
        const itemDate = new Date(item.date);
        const dayBefore = new Date(itemDate);
        dayBefore.setDate(dayBefore.getDate() - 1);
        const dayAfter = new Date(itemDate);
        dayAfter.setDate(dayAfter.getDate() + 1);

        const formatDate = (d: Date) => d.toISOString().split('T')[0];

        // Find candidates: opposite type, same amount, within ±1 day, different app, not already linked
        const candidates = await this.db
          .select()
          .from(transactions)
          .where(
            and(
              eq(transactions.transactionType, oppositeType),
              eq(transactions.total, item.total),
              gte(transactions.date, formatDate(dayBefore)),
              lte(transactions.date, formatDate(dayAfter)),
              sql`${transactions.payment} != ${item.payment}`,
              sql`${transactions.linkedTransferId} IS NULL`,
            ),
          );

        if (candidates.length === 0) {
          return { index, match: null };
        }

        // Return the first match (closest by date would be ideal, but for now return first)
        // Could improve by sorting by date proximity
        return { index, match: candidates[0] };
      }),
    );
  }

  async linkTransfers(id1: number, id2: number): Promise<void> {
    await this.db
      .update(transactions)
      .set({
        linkedTransferId: sql`CASE
          WHEN ${transactions.id} = ${id1} THEN ${id2}
          ELSE ${id1}
        END`,
      })
      .where(inArray(transactions.id, [id1, id2]));
  }

  async unlinkTransfer(id: number): Promise<void> {
    const transaction = await this.findById(id);
    if (!transaction?.linkedTransferId) return;

    await this.db
      .update(transactions)
      .set({ linkedTransferId: null })
      .where(inArray(transactions.id, [id, transaction.linkedTransferId]));
  }

  async findForwardedMatchCandidates(
    items: Array<{ forwardedFromApp: PaymentApp; total: number; date: string }>,
  ): Promise<Array<{ index: number; candidates: Transaction[] }>> {
    return await Promise.all(
      items.map(async (item, index) => {
        // Parse the date to check ±2 days
        const itemDate = new Date(item.date);
        const daysBefore = new Date(itemDate);
        daysBefore.setDate(daysBefore.getDate() - 2);
        const daysAfter = new Date(itemDate);
        daysAfter.setDate(daysAfter.getDate() + 2);

        const formatDate = (d: Date) => d.toISOString().split('T')[0];

        // Find candidates: same app, same amount, within ±2 days, not already linked as forwarded
        const candidates = await this.db
          .select()
          .from(transactions)
          .where(
            and(
              eq(transactions.payment, item.forwardedFromApp),
              eq(transactions.total, item.total),
              gte(transactions.date, formatDate(daysBefore)),
              lte(transactions.date, formatDate(daysAfter)),
            ),
          );

        // Filter out transactions that are already linked as the source of another forwarded transaction
        const linkedAsForwardedIds = await this.db
          .select({ forwardedTransactionId: transactions.forwardedTransactionId })
          .from(transactions)
          .where(sql`${transactions.forwardedTransactionId} IS NOT NULL`);

        const linkedIds = new Set(
          linkedAsForwardedIds.map((t) => t.forwardedTransactionId),
        );

        const filteredCandidates = candidates.filter((c) => !linkedIds.has(c.id));

        // For Gojek transactions, filter to only CC-paid ones (those with "xx-XXXX" in remarks)
        const filteredByPaymentMethod =
          item.forwardedFromApp === PaymentApp.Gojek
            ? filteredCandidates.filter((c) => c.remarks && /xx-\d{4}/i.test(c.remarks))
            : filteredCandidates;

        return { index, candidates: filteredByPaymentMethod };
      }),
    );
  }

  async linkForwarded(ccTransactionId: number, appTransactionId: number): Promise<void> {
    await this.db
      .update(transactions)
      .set({ forwardedTransactionId: appTransactionId })
      .where(eq(transactions.id, ccTransactionId));
  }

  async unlinkForwarded(id: number): Promise<void> {
    await this.db
      .update(transactions)
      .set({ forwardedTransactionId: null })
      .where(eq(transactions.id, id));
  }

  async findTransactionsWithForwardedLink(ids: number[]): Promise<Transaction[]> {
    if (ids.length === 0) return [];
    return await this.db
      .select()
      .from(transactions)
      .where(inArray(transactions.forwardedTransactionId, ids));
  }

  async findReverseForwardedMatchCandidates(
    items: Array<{ payment: PaymentApp; total: number; date: string }>,
  ): Promise<Array<{ index: number; candidates: Transaction[] }>> {
    return await Promise.all(
      items.map(async (item, index) => {
        const itemDate = new Date(item.date);
        const daysBefore = new Date(itemDate);
        daysBefore.setDate(daysBefore.getDate() - 2);
        const daysAfter = new Date(itemDate);
        daysAfter.setDate(daysAfter.getDate() + 2);

        const formatDate = (d: Date) => d.toISOString().split('T')[0];

        // Find CC transactions that:
        // - Have forwardedFromApp === this app (e.g., Grab)
        // - Have same total amount
        // - Are within ±2 days
        // - Don't already have forwardedTransactionId set (not yet linked)
        const candidates = await this.db
          .select()
          .from(transactions)
          .where(
            and(
              eq(transactions.forwardedFromApp, item.payment),
              eq(transactions.total, item.total),
              gte(transactions.date, formatDate(daysBefore)),
              lte(transactions.date, formatDate(daysAfter)),
              sql`${transactions.forwardedTransactionId} IS NULL`,
            ),
          );

        return { index, candidates };
      }),
    );
  }
}
