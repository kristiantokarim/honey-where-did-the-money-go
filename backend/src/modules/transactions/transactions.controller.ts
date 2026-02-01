import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import {
  UpdateTransactionDto,
  DateRangeQueryDto,
  LedgerTotalQueryDto,
  LinkForwardedDto,
} from '../../common/dtos/transaction.dto';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get('history')
  async getHistory(@Query() query: DateRangeQueryDto) {
    return this.transactionsService.getHistory(query);
  }

  @Get('dashboard')
  async getDashboard(@Query() query: DateRangeQueryDto) {
    return this.transactionsService.getDashboard(query.startDate, query.endDate, query.by, query.payment);
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

  @Get(':id/find-transfer-match')
  async findTransferMatch(@Param('id', ParseIntPipe) id: number) {
    const match = await this.transactionsService.findTransferMatchForTransaction(id);
    return { match };
  }

  @Get(':id/find-forwarded-match')
  async findForwardedMatch(@Param('id', ParseIntPipe) id: number) {
    const candidates = await this.transactionsService.findForwardedMatchForTransaction(id);
    return { candidates };
  }

  @Get(':id/find-reverse-cc-match')
  async findReverseCcMatch(@Param('id', ParseIntPipe) id: number) {
    const candidates = await this.transactionsService.findReverseCcMatchForTransaction(id);
    return { candidates };
  }

  @Post(':id/link-transfer')
  async linkTransfer(
    @Param('id', ParseIntPipe) id: number,
    @Body('matchedId', ParseIntPipe) matchedId: number,
  ) {
    await this.transactionsService.linkTransfer(id, matchedId);
    return { success: true };
  }
}
