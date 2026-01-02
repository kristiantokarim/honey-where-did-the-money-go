import { useEffect, useState, useCallback } from 'react';
import { useTransactionContext } from '../../context/TransactionContext';
import { useTransactions } from '../../hooks/useTransactions';
import { formatIDR } from '../../utils/format';
import { DateFilter } from './DateFilter';
import { TransactionCard } from './TransactionCard';
import { TransactionEditForm } from './TransactionEditForm';
import type { Transaction } from '../../types';

export function LedgerPage() {
  const {
    historyData,
    historyLoading,
    refreshHistory,
    dateFilter,
  } = useTransactionContext();
  const { updateTransaction, toggleExclude, updateLocalTransaction } = useTransactions();
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory, dateFilter.start, dateFilter.end]);

  const handleSave = useCallback(
    async (tx: Transaction) => {
      const success = await updateTransaction(tx.id, tx);
      if (success) {
        setEditingId(null);
      } else {
        alert('Update failed');
      }
    },
    [updateTransaction]
  );

  const handleToggleExclude = useCallback(
    async (id: number) => {
      await toggleExclude(id);
    },
    [toggleExclude]
  );

  const handleLocalChange = useCallback(
    (id: number, field: keyof Transaction, value: Transaction[keyof Transaction]) => {
      updateLocalTransaction(id, field, value);
    },
    [updateLocalTransaction]
  );

  const effectiveTotal = historyData
    .filter((t) => !t.isExcluded)
    .reduce((sum, t) => sum + t.total, 0);

  if (historyLoading && historyData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <DateFilter />

      <div className="text-right px-2 pb-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
        Effective Total:{' '}
        <span className="font-black text-slate-800 text-lg ml-1">
          {formatIDR(effectiveTotal)}
        </span>
      </div>

      {historyData.map((tx) =>
        editingId === tx.id ? (
          <TransactionEditForm
            key={tx.id}
            transaction={tx}
            onChange={(field, value) => handleLocalChange(tx.id, field, value)}
            onSave={() => handleSave(tx)}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <TransactionCard
            key={tx.id}
            transaction={tx}
            onEdit={() => setEditingId(tx.id)}
            onToggleExclude={() => handleToggleExclude(tx.id)}
          />
        )
      )}

      {historyData.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <p className="font-bold">No transactions found</p>
          <p className="text-sm mt-1">Try adjusting the date range</p>
        </div>
      )}
    </div>
  );
}
