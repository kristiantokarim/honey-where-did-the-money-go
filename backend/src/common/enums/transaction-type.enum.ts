export const EXPENSE_TYPES = ['expense', 'transfer_out'] as const;
export const INCOME_TYPES = ['income', 'transfer_in'] as const;

export type ExpenseType = (typeof EXPENSE_TYPES)[number];
export type IncomeType = (typeof INCOME_TYPES)[number];
