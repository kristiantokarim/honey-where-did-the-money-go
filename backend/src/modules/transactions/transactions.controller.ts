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
  CheckTransferMatchDto,
  LedgerTotalQueryDto,
  FindForwardedMatchItemDto,
  LinkForwardedDto,
  CheckReverseForwardedMatchDto,
} from '../../common/dtos/transaction.dto';
import { PaymentApp } from '../../common/enums';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('appType') appType?: PaymentApp,
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

  @Post('check-transfer-matches')
  async checkTransferMatches(@Body() payload: CheckTransferMatchDto[]) {
    return this.transactionsService.checkTransferMatches(payload);
  }

  @Post('confirm')
  async confirm(@Body() payload: CreateTransactionDto[]) {
    return this.transactionsService.confirmTransactions(payload);
  }

  @Get('history')
  async getHistory(@Query() query: DateRangeQueryDto) {
    return this.transactionsService.getHistory(query);
  }

  @Get('dashboard')
  async getDashboard(@Query() query: DateRangeQueryDto) {
    return this.transactionsService.getDashboard(query.startDate, query.endDate);
  }

  @Get('ledger-total')
  async getLedgerTotal(@Query() query: LedgerTotalQueryDto) {
    return this.transactionsService.getLedgerTotal(query);
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

  @Delete(':id/link')
  async unlinkTransfer(@Param('id', ParseIntPipe) id: number) {
    await this.transactionsService.unlinkTransfer(id);
    return { success: true };
  }

  @Post('find-forwarded-matches')
  async findForwardedMatches(@Body() payload: FindForwardedMatchItemDto[]) {
    return this.transactionsService.findForwardedMatches(payload);
  }

  @Post('link-forwarded')
  async linkForwarded(@Body() payload: LinkForwardedDto) {
    await this.transactionsService.linkForwarded(
      payload.ccTransactionId,
      payload.appTransactionId,
    );
    return { success: true };
  }

  @Delete(':id/forwarded-link')
  async unlinkForwarded(@Param('id', ParseIntPipe) id: number) {
    await this.transactionsService.unlinkForwarded(id);
    return { success: true };
  }

  @Post('find-reverse-forwarded-matches')
  async findReverseForwardedMatches(@Body() payload: CheckReverseForwardedMatchDto[]) {
    return this.transactionsService.findReverseForwardedMatches(payload);
  }
}
