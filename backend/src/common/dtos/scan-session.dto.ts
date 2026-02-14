import { IsString, IsOptional, IsArray, IsNumber, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentApp } from '../enums/payment-app.enum';
import { SessionStatus, ParseStatus, ReviewStatus } from '../enums/scan-status.enum';

export class CreateScanSessionDto {
  @IsArray()
  @IsOptional()
  @IsEnum(PaymentApp, { each: true })
  appTypes?: PaymentApp[];
}

export class ScanSessionResponseDto {
  sessionId: string;
  totalPages: number;
  parsedPages: number;
  status: SessionStatus;
  currentPageIndex: number;
  createdAt: Date;
  expiresAt: Date;
}

export class PageStatusDto {
  pageIndex: number;
  parseStatus: ParseStatus;
  reviewStatus: ReviewStatus;
  appType: PaymentApp | null;
  parseError: string | null;
}

export class ScanSessionStatusDto extends ScanSessionResponseDto {
  pages: PageStatusDto[];
}

export class PageReviewDto {
  pageIndex: number;
  imageUrl: string;
  appType: PaymentApp | null;
  transactions: ParsedTransactionWithEnrichmentDto[];
}

export class ParsedTransactionWithEnrichmentDto {
  date: string;
  category: string;
  expense: string;
  price: number;
  quantity: number;
  total: number;
  payment: PaymentApp;
  to: string;
  remarks?: string;
  status: string;
  isValid: boolean;
  transactionType: string;
  forwardedFromApp?: PaymentApp;
  isDuplicate: boolean;
  duplicateMatchedId?: number;
  transferMatch?: object | null;
  forwardedMatchCandidates: object[];
  reverseCcMatchCandidates: object[];
}

export class ConfirmPageDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConfirmTransactionItemDto)
  transactions: ConfirmTransactionItemDto[];
}

export class ConfirmTransactionItemDto {
  @IsString()
  date: string;

  @IsString()
  category: string;

  @IsString()
  expense: string;

  @IsNumber()
  price: number;

  @IsNumber()
  @IsOptional()
  quantity?: number;

  @IsNumber()
  total: number;

  @IsEnum(PaymentApp)
  payment: PaymentApp;

  @IsString()
  by: string;

  @IsString()
  to: string;

  @IsString()
  @IsOptional()
  remarks?: string;

  @IsString()
  @IsOptional()
  paymentCorrection?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  transactionType?: string;

  @IsNumber()
  @IsOptional()
  matchedTransactionId?: number;

  @IsNumber()
  @IsOptional()
  forwardedTransactionId?: number;

  @IsEnum(PaymentApp)
  @IsOptional()
  forwardedFromApp?: PaymentApp;

  @IsNumber()
  @IsOptional()
  reverseCcMatchId?: number;
}

export class ConfirmPageResponseDto {
  success: boolean;
  createdCount: number;
  nextPageIndex: number | null;
  sessionCompleted: boolean;
}

export class RetryParseResponseDto {
  requeuedCount: number;
  message: string;
}
