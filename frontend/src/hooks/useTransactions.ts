import { useCallback } from 'react';
import { useTransactionContext } from '../context/TransactionContext';
import { transactionService } from '../services/transactions';
import type { Transaction } from '../types';

export function useTransactions() {
  const { historyData, setHistoryData, refreshHistory } = useTransactionContext();

  const updateTransaction = useCallback(
    async (id: number, data: Partial<Transaction>) => {
      try {
        await transactionService.update(id, data);
        await refreshHistory();
        return true;
      } catch (error) {
        console.error('Failed to update transaction:', error);
        return false;
      }
    },
    [refreshHistory]
  );

  const toggleExclude = useCallback(
    async (id: number) => {
      const transaction = historyData.find((t) => t.id === id);
      if (!transaction) return false;

      return updateTransaction(id, { isExcluded: !transaction.isExcluded });
    },
    [historyData, updateTransaction]
  );

  const updateLocalTransaction = useCallback(
    (id: number, field: keyof Transaction, value: Transaction[keyof Transaction]) => {
      setHistoryData(
        historyData.map((t) => (t.id === id ? { ...t, [field]: value } : t))
      );
    },
    [historyData, setHistoryData]
  );

  const deleteTransaction = useCallback(
    async (id: number): Promise<{ success: boolean; error?: string }> => {
      try {
        await transactionService.delete(id);
        await refreshHistory();
        return { success: true };
      } catch (error) {
        console.error('Failed to delete transaction:', error);
        const message =
          error instanceof Error && 'response' in error
            ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
            : undefined;
        return { success: false, error: message };
      }
    },
    [refreshHistory]
  );

  return {
    updateTransaction,
    toggleExclude,
    updateLocalTransaction,
    deleteTransaction,
  };
}
