import { Injectable, Inject, Logger } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, eq, gte, lte, desc, sql, inArray } from 'drizzle-orm';
import { DATABASE_TOKEN } from '../../database/database.provider';
import * as schema from '../../database/schema';
import { transactions, Transaction, NewTransaction } from '../../database/schema';

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
    sortBy?: string,
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
      sortBy === 'total' ? desc(transactions.total) : desc(transactions.date);

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
    items: Array<{ date: string; total: number; to: string; expense?: string }>,
  ): Promise<Array<{ exists: boolean; matchedId?: number }>> {
    this.logger.debug(`Checking duplicates for ${items.length} items`);

    return await Promise.all(
      items.map(async (item) => {
        this.logger.debug(
          `Checking: date=${item.date}, total=${item.total}, to=${item.to}, expense=${item.expense}`,
        );

        // First, find candidates with same date and total (exact match required)
        const candidates = await this.db
          .select()
          .from(transactions)
          .where(and(eq(transactions.date, item.date), eq(transactions.total, item.total)));

        if (candidates.length === 0) {
          this.logger.debug('No candidates found with same date and total');
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
            sql`${transactions.transactionType} IN ('expense', 'transfer_out')`,
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

  async findPotentialTransferMatches(
    items: Array<{ transactionType: string; total: number; date: string; payment: string }>,
  ): Promise<Array<{ index: number; match: Transaction | null }>> {
    return await Promise.all(
      items.map(async (item, index) => {
        // Only check for transfers
        if (!['transfer_out', 'transfer_in'].includes(item.transactionType)) {
          return { index, match: null };
        }

        const oppositeType = item.transactionType === 'transfer_out' ? 'transfer_in' : 'transfer_out';

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
      .set({ linkedTransferId: id2 })
      .where(eq(transactions.id, id1));

    await this.db
      .update(transactions)
      .set({ linkedTransferId: id1 })
      .where(eq(transactions.id, id2));
  }

  async unlinkTransfer(id: number): Promise<void> {
    const transaction = await this.findById(id);
    if (!transaction || !transaction.linkedTransferId) {
      return;
    }

    const partnerId = transaction.linkedTransferId;

    // Clear both sides
    await this.db
      .update(transactions)
      .set({ linkedTransferId: null })
      .where(eq(transactions.id, id));

    await this.db
      .update(transactions)
      .set({ linkedTransferId: null })
      .where(eq(transactions.id, partnerId));
  }
}
