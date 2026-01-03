import { useEffect, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { useTransactionContext } from '../../context/TransactionContext';
import { useToast } from '../../context/ToastContext';
import { useTransactions } from '../../hooks/useTransactions';
import { transactionService } from '../../services/transactions';
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
  const [unlinkingId, setUnlinkingId] = useState<number | null>(null);
  const [showNetTotal, setShowNetTotal] = useState(false);

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

  const handleUnlinkConfirm = useCallback(async () => {
    if (unlinkingId === null) return;
    try {
      await transactionService.unlinkTransfer(unlinkingId);
      showToast('Transfer unlinked', 'success');
      refreshHistory();
    } catch {
      showToast('Failed to unlink transfer', 'error');
    }
    setUnlinkingId(null);
  }, [unlinkingId, showToast, refreshHistory]);

  const handleLocalChange = useCallback(
    (id: number, field: keyof Transaction, value: Transaction[keyof Transaction]) => {
      updateLocalTransaction(id, field, value);
    },
    [updateLocalTransaction]
  );

  // Calculate totals based on mode
  const calculateTotal = () => {
    const nonExcluded = historyData.filter((t) => !t.isExcluded);

    if (showNetTotal) {
      // Net total: expenses - income, excluding linked transfers (they cancel out)
      return nonExcluded
        .filter((t) => !t.linkedTransferId)
        .reduce((sum, t) => {
          if (t.transactionType === 'income') {
            return sum - t.total; // Subtract income
          }
          return sum + t.total; // Add expenses and unlinked transfers
        }, 0);
    } else {
      // Expense only: only count expense type, exclude linked transfers
      return nonExcluded
        .filter((t) =>
          !t.linkedTransferId &&
          (t.transactionType === 'expense' || !t.transactionType)
        )
        .reduce((sum, t) => sum + t.total, 0);
    }
  };

  const effectiveTotal = calculateTotal();

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

      <div className="flex justify-between items-center px-2 pb-2">
        <button
          onClick={() => setShowNetTotal(!showNetTotal)}
          className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full min-h-[32px]"
        >
          {showNetTotal ? 'Net Total' : 'Expenses Only'}
        </button>
        <div className="text-right text-xs font-bold text-slate-400 uppercase tracking-widest">
          Total:{' '}
          <span className={`font-black text-lg ml-1 ${effectiveTotal < 0 ? 'text-green-600' : 'text-slate-800'}`}>
            {effectiveTotal < 0 ? '+' : ''}{formatIDR(Math.abs(effectiveTotal))}
          </span>
        </div>
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
            linkedTransaction={tx.linkedTransaction}
            onEdit={() => setEditingId(tx.id)}
            onToggleExclude={() => handleToggleExclude(tx.id)}
            onDelete={() => setDeletingId(tx.id)}
            onViewImage={tx.imageUrl ? () => setViewingImageUrl(tx.imageUrl!) : undefined}
            onUnlink={tx.linkedTransferId ? () => setUnlinkingId(tx.id) : undefined}
            onViewLinkedImage={
              tx.linkedTransaction?.imageUrl
                ? () => setViewingImageUrl(tx.linkedTransaction!.imageUrl!)
                : undefined
            }
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
          className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4 animate-fade-in"
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
            alt="Transaction Screenshot"
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl animate-zoom-in"
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

      <ConfirmDialog
        isOpen={unlinkingId !== null}
        title="Unlink Transfer"
        message="Are you sure you want to unlink this transfer? Both transactions will remain but will no longer be matched."
        confirmLabel="Unlink"
        onConfirm={handleUnlinkConfirm}
        onCancel={() => setUnlinkingId(null)}
      />
    </div>
  );
}
