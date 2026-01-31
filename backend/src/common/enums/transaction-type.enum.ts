export enum TransactionType {
  Expense = 'expense',
  Income = 'income',
  TransferOut = 'transfer_out',
  TransferIn = 'transfer_in',
}

// Helper arrays for filtering
export const EXPENSE_TYPES = [TransactionType.Expense, TransactionType.TransferOut] as const;
export const INCOME_TYPES = [TransactionType.Income, TransactionType.TransferIn] as const;
