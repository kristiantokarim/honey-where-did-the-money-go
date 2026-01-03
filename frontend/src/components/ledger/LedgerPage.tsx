import { useEffect, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { useTransactionContext } from '../../context/TransactionContext';
import { useToast } from '../../context/ToastContext';
import { useTransactions } from '../../hooks/useTransactions';
import { formatIDR } from '../../utils/format';
import { LedgerFilters } from './LedgerFilters';
import { TransactionCard } from './TransactionCard';
import { TransactionEditForm } from './TransactionEditForm';
import { ConfirmDialog } from '../common/ConfirmDialog';
import type { Transaction } from '../../types';

export function LedgerPage() {
  const {
    historyData,
    historyLoading,
    refreshHistory,
    dateFilter,
    ledgerFilters,
  } = useTransactionContext();
  const { showToast } = useToast();
  const { updateTransaction, toggleExclude, updateLocalTransaction, deleteTransaction } =
    useTransactions();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory, dateFilter.start, dateFilter.end, ledgerFilters.category, ledgerFilters.by]);

  const handleSave = useCallback(
    async (tx: Transaction) => {
      const success = await updateTransaction(tx.id, tx);
      if (success) {
        showToast('Transaction updated', 'success');
        setEditingId(null);
      } else {
        showToast('Failed to update transaction', 'error');
      }
    },
    [updateTransaction, showToast]
  );

  const handleToggleExclude = useCallback(
    async (id: number) => {
      await toggleExclude(id);
    },
    [toggleExclude]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (deletingId === null) return;
    const success = await deleteTransaction(deletingId);
    if (success) {
      showToast('Transaction deleted', 'success');
    } else {
      showToast('Failed to delete transaction', 'error');
    }
    setDeletingId(null);
  }, [deletingId, deleteTransaction, showToast]);

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
      <LedgerFilters />

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
            onDelete={() => setDeletingId(tx.id)}
            onViewImage={tx.imageUrl ? () => setViewingImageUrl(tx.imageUrl!) : undefined}
          />
        )
      )}

      {historyData.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <p className="font-bold">No transactions found</p>
          <p className="text-sm mt-1">Try adjusting the filters</p>
        </div>
      )}

      {/* Image Lightbox */}
      {viewingImageUrl && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4"
          onClick={() => setViewingImageUrl(null)}
        >
          <button
            onClick={() => setViewingImageUrl(null)}
            className="absolute top-6 right-6 bg-white/10 text-white p-3 rounded-full backdrop-blur-md active:scale-90 min-w-[44px] min-h-[44px]"
          >
            <X size={24} />
          </button>
          <img
            src={viewingImageUrl}
            alt="Transaction Receipt"
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <ConfirmDialog
        isOpen={deletingId !== null}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? This action cannot be undone."
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
