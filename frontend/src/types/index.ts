import { Category, TransactionType, PaymentApp } from './enums';

export * from './enums';

export interface Transaction {
  id: number;
  date: string;
  category: Category;
  expense: string;
  price: number;
  quantity: number;
  total: number;
  payment: PaymentApp;
  by: string;
  to: string;
  remarks?: string;
  imageUrl?: string;
  isExcluded: boolean;
  transactionType: TransactionType;
  linkedTransferId?: number;
  linkedTransaction?: Transaction;
}

export interface ParsedTransaction extends Omit<Transaction, 'id'> {
  isDuplicate: boolean;
  isValid: boolean;
  status: string;
  transferMatch?: Transaction;
  keepSeparate: boolean;
  matchedTransactionId?: number;
}

export interface DashboardItem {
  name: Category;
  total: number;
}

export interface AppConfig {
  categories: Category[];
  users: string[];
  paymentMethods: PaymentApp[];
}

export interface ParseResult {
  appType: PaymentApp;
  transactions: ParsedTransaction[];
  imageUrl?: string;
}
