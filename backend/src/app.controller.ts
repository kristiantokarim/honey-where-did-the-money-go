import { 
  Controller, Post, Get, UploadedFile, UseInterceptors, Query,
  Body, BadRequestException, Logger, Inject 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ParserService } from './parser.service';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { transactions } from './db/schema';
import * as schema from './db/schema';
import { and, eq, desc, gte, lte } from 'drizzle-orm';

@Controller('transactions')
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly parser: ParserService,
    @Inject('DATABASE') private readonly db: BetterSQLite3Database<typeof schema>
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File is missing.');
    try {
      return await this.parser.parseImage(file.buffer, file.mimetype);
    } catch (e) {
      this.logger.error(e);
      throw new BadRequestException(`AI Parsing failed: ${e.message}`);
    }
  }

  @Post('check-duplicates')
  async checkDuplicates(@Body() payload: any[]) {
    const results = await Promise.all(payload.map(async (item) => {
      // UPGRADE: Check Date + Total + Merchant (To) for better accuracy
      const match = await this.db.select()
        .from(transactions)
        .where(
          and(
            eq(transactions.date, item.date),
            eq(transactions.total, item.total), // Changed from 'amount' to 'total'
            eq(transactions.to, item.to)        // Added Merchant check
          )
        ).execute();
      
      return { exists: match.length > 0 };
    }));
    return results;
  }

  @Post('confirm')
  async confirm(@Body() payload: any[]) {
    if (!payload.length) return { success: true, count: 0 };
    
    // The payload keys must match the schema (date, expense, to, total, etc.)
    // Drizzle will handle the mapping automatically if the JSON is correct.
    try {
      const res = await this.db.insert(transactions).values(payload.map(v => ({...v, price: v.total}))).returning();
      return { success: true, count: res.length };
    } catch (e) {
      this.logger.error(e);
      throw new BadRequestException(`Database save failed: ${e.message}`);
    }
  }

  @Get()
  async list() {
    // Simple list for debugging, ordered by date desc
    return this.db.query.transactions.findMany({
      orderBy: (transactions, { desc }) => [desc(transactions.date)],
      limit: 50,
    });
  }

  @Get('history')
  async getHistory(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    // Default to current month if no dates provided
    const now = new Date();
    const start = startDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const end = endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const data = await this.db.select()
      .from(transactions)
      .where(
        and(
          gte(transactions.date, start),
          lte(transactions.date, end)
        )
      )
      .orderBy(desc(transactions.date)) // Newest first
      .execute();

    return data;
  }

  @Get('dashboard')
  async getDashboard(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    const data = await this.db.select()
      .from(transactions)
      .where(
        and(
          gte(transactions.date, startDate),
          lte(transactions.date, endDate)
        )
      ).execute();

    // Aggregate by category
    const categories = data.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.total;
      return acc;
    }, {} as Record<string, number>);

    // Sort by highest spending
    return Object.entries(categories)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }
}