export type TransactionType = 'expense' | 'income' | 'transfer_out' | 'transfer_in';

export interface ParsedTransaction {
  date: string;
  category: string;
  expense: string;
  price: number;
  quantity: number;
  total: number;
  payment: string;
  to: string;
  remarks?: string;
  status?: string;
  isValid?: boolean;
  transactionType?: TransactionType;
}

export interface ParseResult {
  appType: string;
  transactions: ParsedTransaction[];
  imageUrl?: string;
}
