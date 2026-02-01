import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
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
  ScanSessionResponseDto,
  ScanSessionStatusDto,
  PageReviewDto,
  ConfirmPageDto,
  ConfirmPageResponseDto,
  RetryParseResponseDto,
} from '../../common/dtos/scan-session.dto';
import { PaymentApp } from '../../common/enums';

@Controller('scan/sessions')
export class ScanController {
  constructor(private readonly scanService: ScanService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('files'))
  async createSession(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: CreateScanSessionDto,
  ): Promise<ScanSessionResponseDto> {
    if (!files || files.length === 0) {
      throw new Error('At least one file is required');
    }

    let appTypes: PaymentApp[] | undefined;
    if (body.appTypes) {
      appTypes = Array.isArray(body.appTypes)
        ? body.appTypes
        : [body.appTypes];
    }

    return this.scanService.createSession(body.defaultUser, files, appTypes);
  }

  @Get('active')
  async getActiveSession(
    @Query('user') userId: string,
  ): Promise<ScanSessionStatusDto | null> {
    if (!userId) {
      throw new Error('User ID is required');
    }
    return this.scanService.getActiveSession(userId);
  }

  @Get(':sessionId')
  async getSession(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ): Promise<ScanSessionStatusDto> {
    return this.scanService.getSession(sessionId);
  }

  @Get(':sessionId/pages/:pageIndex')
  async getPageForReview(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Param('pageIndex', ParseIntPipe) pageIndex: number,
  ): Promise<PageReviewDto> {
    return this.scanService.getPageForReview(sessionId, pageIndex);
  }

  @Post(':sessionId/pages/:pageIndex/confirm')
  async confirmPage(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Param('pageIndex', ParseIntPipe) pageIndex: number,
    @Body() body: ConfirmPageDto,
  ): Promise<ConfirmPageResponseDto> {
    return this.scanService.confirmPage(sessionId, pageIndex, body.transactions);
  }

  @Post(':sessionId/retry-parse')
  @HttpCode(HttpStatus.OK)
  async retryParse(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ): Promise<RetryParseResponseDto> {
    return this.scanService.retryParse(sessionId);
  }

  @Delete(':sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelSession(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ): Promise<void> {
    await this.scanService.cancelSession(sessionId);
  }
}
