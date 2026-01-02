import { IsString, IsNumber, IsOptional, IsBoolean, Min, IsDateString, IsArray, ValidateNested } from 'class-validator';
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
