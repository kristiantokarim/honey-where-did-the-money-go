export type TransactionType = 'expense' | 'income' | 'transfer_out' | 'transfer_in';

export interface Transaction {
  id: number;
  date: string;
  category: string;
  expense: string;
  price: number;
  quantity: number;
  total: number;
  payment: string;
  by: string;
  to: string;
  remarks?: string;
  imageUrl?: string;
  isExcluded?: boolean;
  transactionType?: TransactionType;
  linkedTransferId?: number;
  linkedTransaction?: Transaction;
}

export interface ParsedTransaction extends Omit<Transaction, 'id'> {
  isDuplicate?: boolean;
  isValid?: boolean;
  status?: string;
  transferMatch?: Transaction;
  keepSeparate?: boolean;
  matchedTransactionId?: number;
}

export interface DashboardItem {
  name: string;
  total: number;
}

export interface AppConfig {
  categories: string[];
  users: string[];
  paymentMethods: string[];
}

export interface ParseResult {
  appType: string;
  transactions: ParsedTransaction[];
  imageUrl?: string;
}
