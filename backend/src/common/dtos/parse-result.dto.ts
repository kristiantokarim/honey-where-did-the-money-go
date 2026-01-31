import { Category } from '../enums/category.enum';
import { PaymentApp } from '../enums/payment-app.enum';
import { TransactionType } from '../enums/transaction-type.enum';
import { Transaction } from '../../database/schema';

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

  // Enrichment fields (set by backend during upload)
  isDuplicate?: boolean;
  duplicateMatchedId?: number;
  transferMatch?: Transaction | null;
  forwardedMatchCandidates?: Transaction[];
  reverseCcMatchCandidates?: Transaction[];
}

export interface ParseResult {
  appType: PaymentApp;
  transactions: ParsedTransaction[];
  imageUrl?: string;
}
