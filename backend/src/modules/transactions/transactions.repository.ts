import { Injectable, Inject, Logger } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, eq, gte, lte, desc, sql } from 'drizzle-orm';
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

  async findByDateRange(
    startDate: string,
    endDate: string,
    category?: string,
    by?: string,
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

    return await this.db
      .select()
      .from(transactions)
      .where(and(...conditions))
      .orderBy(desc(transactions.date));
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
          eq(transactions.isExcluded, false),
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
}
