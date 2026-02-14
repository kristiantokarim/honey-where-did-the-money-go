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
import { CurrentHousehold } from '../auth/decorators/current-household.decorator';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get('history')
  async getHistory(@Query() query: DateRangeQueryDto, @CurrentHousehold() householdId: string) {
    return this.transactionsService.getHistory(query, householdId);
  }

  @Get('dashboard')
  async getDashboard(@Query() query: DateRangeQueryDto, @CurrentHousehold() householdId: string) {
    return this.transactionsService.getDashboard(query.startDate, query.endDate, query.by, query.payment, householdId);
  }

  @Get('ledger-total')
  async getLedgerTotal(@Query() query: LedgerTotalQueryDto, @CurrentHousehold() householdId: string) {
    return this.transactionsService.getLedgerTotal(query, householdId);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateTransactionDto,
    @CurrentHousehold() householdId: string,
  ) {
    return this.transactionsService.update(id, body, householdId);
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number, @CurrentHousehold() householdId: string) {
    await this.transactionsService.delete(id, householdId);
    return { success: true };
  }

  @Delete(':id/link')
  async unlinkTransfer(@Param('id', ParseIntPipe) id: number, @CurrentHousehold() householdId: string) {
    await this.transactionsService.unlinkTransfer(id, householdId);
    return { success: true };
  }

  @Post('link-forwarded')
  async linkForwarded(@Body() payload: LinkForwardedDto, @CurrentHousehold() householdId: string) {
    await this.transactionsService.linkForwarded(
      payload.ccTransactionId,
      payload.appTransactionId,
      householdId,
    );
    return { success: true };
  }

  @Delete(':id/forwarded-link')
  async unlinkForwarded(@Param('id', ParseIntPipe) id: number, @CurrentHousehold() householdId: string) {
    await this.transactionsService.unlinkForwarded(id, householdId);
    return { success: true };
  }

  @Get(':id/find-transfer-match')
  async findTransferMatch(@Param('id', ParseIntPipe) id: number, @CurrentHousehold() householdId: string) {
    const match = await this.transactionsService.findTransferMatchForTransaction(id, householdId);
    return { match };
  }

  @Get(':id/find-forwarded-match')
  async findForwardedMatch(@Param('id', ParseIntPipe) id: number, @CurrentHousehold() householdId: string) {
    const candidates = await this.transactionsService.findForwardedMatchForTransaction(id, householdId);
    return { candidates };
  }

  @Get(':id/find-reverse-cc-match')
  async findReverseCcMatch(@Param('id', ParseIntPipe) id: number, @CurrentHousehold() householdId: string) {
    const candidates = await this.transactionsService.findReverseCcMatchForTransaction(id, householdId);
    return { candidates };
  }

  @Post(':id/link-transfer')
  async linkTransfer(
    @Param('id', ParseIntPipe) id: number,
    @Body('matchedId', ParseIntPipe) matchedId: number,
    @CurrentHousehold() householdId: string,
  ) {
    await this.transactionsService.linkTransfer(id, matchedId, householdId);
    return { success: true };
  }
}
