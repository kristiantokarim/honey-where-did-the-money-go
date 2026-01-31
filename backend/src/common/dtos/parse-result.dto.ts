import { Category } from '../enums/category.enum';
import { PaymentApp } from '../enums/payment-app.enum';
import { TransactionType } from '../enums/transaction-type.enum';

export interface ParsedTransaction {
  date: string;
  category: Category;
  expense: string;
  price: number;
  quantity: number;
  total: number;
  payment: PaymentApp;
  to: string;
  remarks?: string;
  status: string;
  isValid: boolean;
  transactionType: TransactionType;
  forwardedFromApp?: PaymentApp;
}

export interface ParseResult {
  appType: PaymentApp;
  transactions: ParsedTransaction[];
  imageUrl?: string;
}
