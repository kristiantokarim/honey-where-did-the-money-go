import { 
  Controller, Post, Get, Put, UploadedFile, UseInterceptors, Query,
  Body, BadRequestException, Logger, Inject, Param 
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

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    try {
      // Sync total to price to maintain schema consistency
      const updateData = { ...body };
      if (body.total !== undefined) updateData.price = body.total;

      return await this.db.update(transactions)
        .set(updateData)
        .where(eq(transactions.id, parseInt(id)))
        .returning();
    } catch (e) {
      throw new BadRequestException(`Update failed: ${e.message}`);
    }
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File is missing.');
    return await this.parser.parseImage(file.buffer, file.mimetype);
  }

  @Post('check-duplicates')
  async checkDuplicates(@Body() payload: any[]) {
    return await Promise.all(payload.map(async (item) => {
      const match = await this.db.select().from(transactions)
        .where(and(eq(transactions.date, item.date), eq(transactions.total, item.total), eq(transactions.to, item.to))).execute();
      return { exists: match.length > 0 };
    }));
  }

  @Post('confirm')
  async confirm(@Body() payload: any[]) {
    const res = await this.db.insert(transactions).values(payload.map(v => ({...v, price: v.total}))).returning();
    return { success: true, count: res.length };
  }

  @Get('history')
  async getHistory(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return await this.db.select().from(transactions)
      .where(and(gte(transactions.date, startDate), lte(transactions.date, endDate)))
      .orderBy(desc(transactions.date)).execute();
  }

  @Get('dashboard')
  async getDashboard(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    const data = await this.db.select().from(transactions)
      .where(and(eq(transactions.isExcluded, false), gte(transactions.date, startDate), lte(transactions.date, endDate))).execute();

    const categories = data.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.total;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(categories).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);
  }
}