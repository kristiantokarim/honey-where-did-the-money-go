import { IsString, IsNumber, IsOptional, IsBoolean, Min, IsDateString, IsArray, ValidateNested, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTransactionDto {
  @IsDateString()
  date: string;

  @IsString()
  category: string;

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

  @IsString()
  payment: string;

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
  linkedTransferId?: number;

  @IsNumber()
  @IsOptional()
  matchedTransactionId?: number;
}

export class UpdateTransactionDto {
  @IsDateString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  expense?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @IsNumber()
  @IsOptional()
  quantity?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  total?: number;

  @IsString()
  @IsOptional()
  payment?: string;

  @IsString()
  @IsOptional()
  by?: string;

  @IsString()
  @IsOptional()
  to?: string;

  @IsString()
  @IsOptional()
  remarks?: string;

  @IsString()
  @IsOptional()
  paymentCorrection?: string;

  @IsBoolean()
  @IsOptional()
  isExcluded?: boolean;

  @IsString()
  @IsOptional()
  transactionType?: string;
}

export class DateRangeQueryDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  by?: string;

  @IsString()
  @IsOptional()
  sortBy?: string;
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
  @IsString()
  transactionType: string;

  @IsNumber()
  @Type(() => Number)
  total: number;

  @IsString()
  date: string;

  @IsString()
  payment: string;
}

export class LedgerTotalQueryDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsString()
  @IsIn(['expenses_only', 'net_total'])
  mode: 'expenses_only' | 'net_total';

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  by?: string;
}
