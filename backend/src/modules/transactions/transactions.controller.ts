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
} from '../../common/dtos/transaction.dto';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return this.transactionsService.parseReceipt(
      file.buffer,
      file.mimetype,
      file.originalname,
    );
  }

  @Post('check-duplicates')
  async checkDuplicates(
    @Body() payload: Array<{ date: string; total: number; to: string }>,
  ) {
    return this.transactionsService.checkDuplicates(payload);
  }

  @Post('confirm')
  async confirm(@Body() payload: CreateTransactionDto[]) {
    return this.transactionsService.confirmTransactions(payload);
  }

  @Get('history')
  async getHistory(@Query() query: DateRangeQueryDto) {
    return this.transactionsService.getHistory(query.startDate, query.endDate);
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
