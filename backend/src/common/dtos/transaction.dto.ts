import { IsString, IsNumber, IsOptional, IsBoolean, Min, IsDateString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType, OmitType } from '@nestjs/mapped-types';
import { Category } from '../enums/category.enum';
import { PaymentApp } from '../enums/payment-app.enum';
import { TransactionType } from '../enums/transaction-type.enum';
import { LedgerMode } from '../enums/ledger-mode.enum';
import { SortBy } from '../enums/sort-by.enum';

export class CreateTransactionDto {
  @IsDateString()
  date: string;

  @IsEnum(Category)
  category: Category;

  @IsString()
  expense: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @IsOptional()
  quantity?: number;

  @IsNumber()
  @Min(0)
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

  @IsEnum(TransactionType)
  @IsOptional()
  transactionType?: TransactionType;

  @IsNumber()
  @IsOptional()
  linkedTransferId?: number;

  @IsNumber()
  @IsOptional()
  matchedTransactionId?: number;
}

export class UpdateTransactionDto extends PartialType(
  OmitType(CreateTransactionDto, ['matchedTransactionId', 'imageUrl', 'linkedTransferId'] as const)
) {
  @IsBoolean()
  @IsOptional()
  isExcluded?: boolean;
}

export class DateRangeQueryDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsEnum(Category)
  @IsOptional()
  category?: Category;

  @IsString()
  @IsOptional()
  by?: string;

  @IsEnum(SortBy)
  @IsOptional()
  sortBy?: SortBy;
}

export class DuplicateCheckItemDto {
  @IsString()
  date: string;

  @IsNumber()
  @Type(() => Number)
  total: number;

  @IsString()
  to: string;

  @IsString()
  @IsOptional()
  expense?: string;
}

export class CheckTransferMatchDto {
  @IsEnum(TransactionType)
  transactionType: TransactionType;

  @IsNumber()
  @Type(() => Number)
  total: number;

  @IsString()
  date: string;

  @IsEnum(PaymentApp)
  payment: PaymentApp;
}

export class LedgerTotalQueryDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsEnum(LedgerMode)
  mode: LedgerMode;

  @IsEnum(Category)
  @IsOptional()
  category?: Category;

  @IsString()
  @IsOptional()
  by?: string;
}
