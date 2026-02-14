import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UploadedFiles,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ScanService } from './scan.service';
import {
  CreateScanSessionDto,
  ScanSessionStatusDto,
  PageReviewDto,
  ConfirmPageDto,
  ConfirmPageResponseDto,
  RetryParseResponseDto,
} from '../../common/dtos/scan-session.dto';
import { PaymentApp } from '../../common/enums';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentHousehold } from '../auth/decorators/current-household.decorator';

@Controller('scan/sessions')
export class ScanController {
  constructor(private readonly scanService: ScanService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('files'))
  async createSession(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: CreateScanSessionDto,
    @CurrentUser('sub') userId: string,
    @CurrentHousehold() householdId: string,
  ): Promise<ScanSessionStatusDto> {
    if (!files || files.length === 0) {
      throw new Error('At least one file is required');
    }

    let appTypes: PaymentApp[] | undefined;
    if (body.appTypes) {
      appTypes = Array.isArray(body.appTypes)
        ? body.appTypes
        : [body.appTypes];
    }

    return this.scanService.createSession(userId, files, appTypes, householdId);
  }

  @Get('active')
  async getActiveSession(
    @CurrentUser('sub') userId: string,
    @CurrentHousehold() householdId: string,
  ): Promise<ScanSessionStatusDto | null> {
    return this.scanService.getActiveSession(userId, householdId);
  }

  @Get(':sessionId')
  async getSession(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @CurrentHousehold() householdId: string,
  ): Promise<ScanSessionStatusDto> {
    return this.scanService.getSession(sessionId, householdId);
  }

  @Get(':sessionId/pages/:pageIndex')
  async getPageForReview(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Param('pageIndex', ParseIntPipe) pageIndex: number,
    @CurrentHousehold() householdId: string,
  ): Promise<PageReviewDto> {
    return this.scanService.getPageForReview(sessionId, pageIndex, householdId);
  }

  @Post(':sessionId/pages/:pageIndex/confirm')
  async confirmPage(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Param('pageIndex', ParseIntPipe) pageIndex: number,
    @Body() body: ConfirmPageDto,
    @CurrentUser('sub') userId: string,
    @CurrentHousehold() householdId: string,
  ): Promise<ConfirmPageResponseDto> {
    return this.scanService.confirmPage(sessionId, pageIndex, body.transactions, userId, householdId);
  }

  @Post(':sessionId/retry-parse')
  @HttpCode(HttpStatus.OK)
  async retryParse(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @CurrentHousehold() householdId: string,
  ): Promise<RetryParseResponseDto> {
    return this.scanService.retryParse(sessionId, householdId);
  }

  @Delete(':sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelSession(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @CurrentHousehold() householdId: string,
  ): Promise<void> {
    await this.scanService.cancelSession(sessionId, householdId);
  }
}
