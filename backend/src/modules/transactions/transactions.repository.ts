import { Injectable, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, eq, gte, lte, desc } from 'drizzle-orm';
import { DATABASE_TOKEN } from '../../database/database.provider';
import * as schema from '../../database/schema';
import { transactions, Transaction, NewTransaction } from '../../database/schema';

@Injectable()
export class TransactionsRepository {
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

  async findByDateRange(startDate: string, endDate: string): Promise<Transaction[]> {
    return await this.db
      .select()
      .from(transactions)
      .where(and(gte(transactions.date, startDate), lte(transactions.date, endDate)))
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
    items: Array<{ date: string; total: number; to: string }>,
  ): Promise<Array<{ exists: boolean }>> {
    return await Promise.all(
      items.map(async (item) => {
        const match = await this.db
          .select()
          .from(transactions)
          .where(
            and(
              eq(transactions.date, item.date),
              eq(transactions.total, item.total),
              eq(transactions.to, item.to),
            ),
          );
        return { exists: match.length > 0 };
      }),
    );
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
