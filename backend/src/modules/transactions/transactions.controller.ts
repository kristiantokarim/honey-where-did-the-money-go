import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TransactionsService } from './transactions.service';
import {
  CreateTransactionDto,
  UpdateTransactionDto,
  DateRangeQueryDto,
  DuplicateCheckItemDto,
} from '../../common/dtos/transaction.dto';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('appType') appType?: string,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return this.transactionsService.parseReceipt(
      file.buffer,
      file.mimetype,
      file.originalname,
      appType,
    );
  }

  @Post('check-duplicates')
  async checkDuplicates(@Body() payload: DuplicateCheckItemDto[]) {
    return this.transactionsService.checkDuplicates(payload);
  }

  @Post('confirm')
  async confirm(@Body() payload: CreateTransactionDto[]) {
    return this.transactionsService.confirmTransactions(payload);
  }

  @Get('history')
  async getHistory(@Query() query: DateRangeQueryDto) {
    return this.transactionsService.getHistory(
      query.startDate,
      query.endDate,
      query.category,
      query.by,
      query.sortBy,
    );
  }

  @Get('dashboard')
  async getDashboard(@Query() query: DateRangeQueryDto) {
    return this.transactionsService.getDashboard(query.startDate, query.endDate);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateTransactionDto,
  ) {
    return this.transactionsService.update(id, body);
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.transactionsService.delete(id);
    return { success: true };
  }
}
