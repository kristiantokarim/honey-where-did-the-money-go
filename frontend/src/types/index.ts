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
  forwardedTransactionId?: number;
  forwardedFromApp?: PaymentApp;
  forwardedTransaction?: Transaction;
  forwardedCcTransactions?: Transaction[];
}

// Backend returns this enriched transaction structure
export interface EnrichedParsedTransaction extends Omit<Transaction, 'id'> {
  isValid: boolean;
  status: string;
  // Enrichment fields from backend
  isDuplicate?: boolean;
  duplicateMatchedId?: number;
  transferMatch?: Transaction | null;
  forwardedMatchCandidates?: Transaction[];
  reverseCcMatchCandidates?: Transaction[];
}

// Frontend extends with UI state
export interface ParsedTransaction extends EnrichedParsedTransaction {
  isDuplicate: boolean;  // Required in frontend (defaults false)
  keepSeparate: boolean;
  matchedTransactionId?: number;
  forwardedMatch?: Transaction;
  skipForwardedMatch?: boolean;
  reverseCcMatch?: Transaction;
  skipReverseCcMatch?: boolean;
  reverseCcMatchId?: number;  // For confirm payload
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
  transactions: EnrichedParsedTransaction[];
  imageUrl: string;
}
