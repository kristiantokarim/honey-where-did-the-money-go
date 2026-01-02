import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { TransactionsRepository } from './transactions.repository';
import { ParserService } from '../parser/parser.service';
import { StorageService } from '../storage/storage.service';
import { CreateTransactionDto, UpdateTransactionDto } from '../../common/dtos/transaction.dto';
import { ParsedTransaction } from '../../common/dtos/parse-result.dto';
import { Transaction, NewTransaction } from '../../database/schema';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    private readonly repository: TransactionsRepository,
    private readonly parserService: ParserService,
    private readonly storageService: StorageService,
  ) {}

  async parseReceipt(
    file: Buffer,
    mimeType: string,
    originalFilename: string,
  ): Promise<{
    appType: string;
    transactions: ParsedTransaction[];
    imageUrl: string;
  }> {
    // Upload image to MinIO
    const imageFilename = await this.storageService.upload(file, originalFilename, mimeType);
    const imageUrl = await this.storageService.getUrl(imageFilename);

    // Parse the image
    const result = await this.parserService.parseImage(file, mimeType);

    return {
      ...result,
      imageUrl,
    };
  }

  async checkDuplicates(
    items: Array<{ date: string; total: number; to: string }>,
  ): Promise<Array<{ exists: boolean }>> {
    return this.repository.checkDuplicates(items);
  }

  async confirmTransactions(
    items: CreateTransactionDto[],
  ): Promise<{ success: boolean; count: number }> {
    const transactionsToInsert: NewTransaction[] = items.map((item) => ({
      ...item,
      price: item.total, // Sync price with total
      quantity: item.quantity || 1,
    }));

    const result = await this.repository.createMany(transactionsToInsert);
    this.logger.log(`Confirmed ${result.length} transactions`);

    return { success: true, count: result.length };
  }

  async getHistory(startDate: string, endDate: string): Promise<Transaction[]> {
    return this.repository.findByDateRange(startDate, endDate);
  }

  async getDashboard(
    startDate: string,
    endDate: string,
  ): Promise<Array<{ name: string; total: number }>> {
    return this.repository.getDashboardData(startDate, endDate);
  }

  async update(id: number, data: UpdateTransactionDto): Promise<Transaction> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Transaction with id ${id} not found`);
    }

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
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Transaction with id ${id} not found`);
    }

    await this.repository.delete(id);
  }
}
