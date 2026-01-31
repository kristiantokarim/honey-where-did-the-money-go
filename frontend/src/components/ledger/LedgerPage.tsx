import { useEffect, useState, useCallback } from 'react';
import { useTransactionContext } from '../../context/TransactionContext';
import { useToast } from '../../context/ToastContext';
import { useTransactions } from '../../hooks/useTransactions';
import { transactionService } from '../../services/transactions';
import { formatIDR } from '../../utils/format';
import { LedgerFilters } from './LedgerFilters';
import { TransactionCard } from './TransactionCard';
import { TransactionEditForm } from './TransactionEditForm';
import { RelinkDialog } from './RelinkDialog';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ImageLightbox } from '../common/ImageLightbox';
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
  const [unlinkingForwardedId, setUnlinkingForwardedId] = useState<number | null>(null);
  const [showNetTotal, setShowNetTotal] = useState(false);
  const [ledgerTotal, setLedgerTotal] = useState<number>(0);
  const [totalLoading, setTotalLoading] = useState(false);

  const [relinkingTxId, setRelinkingTxId] = useState<number | null>(null);
  const [relinkCandidates, setRelinkCandidates] = useState<Transaction[]>([]);
  const [relinkType, setRelinkType] = useState<'transfer' | 'forwarded' | 'reverseCc' | null>(null);
  const [relinkLoading, setRelinkLoading] = useState(false);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory, dateFilter.start, dateFilter.end, ledgerFilters.category, ledgerFilters.by, ledgerFilters.payment]);

  useEffect(() => {
    const fetchTotal = async () => {
      setTotalLoading(true);
      try {
        const mode = showNetTotal ? 'net_total' : 'expenses_only';
        const result = await transactionService.getLedgerTotal(
          dateFilter.start,
          dateFilter.end,
          mode,
          ledgerFilters.category || undefined,
          ledgerFilters.by || undefined,
          ledgerFilters.payment || undefined
        );
        setLedgerTotal(result.total);
      } catch (error) {
        console.error('Failed to fetch ledger total:', error);
      } finally {
        setTotalLoading(false);
      }
    };

    fetchTotal();
  }, [dateFilter.start, dateFilter.end, ledgerFilters.category, ledgerFilters.by, ledgerFilters.payment, showNetTotal, historyData]);

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
    const result = await deleteTransaction(deletingId);
    if (result.success) {
      showToast('Transaction deleted', 'success');
    } else {
      showToast(result.error || 'Failed to delete transaction', 'error');
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

  const handleUnlinkForwardedConfirm = useCallback(async () => {
    if (unlinkingForwardedId === null) return;
    try {
      await transactionService.unlinkForwarded(unlinkingForwardedId);
      showToast('CC link removed', 'success');
      refreshHistory();
    } catch {
      showToast('Failed to unlink CC transaction', 'error');
    }
    setUnlinkingForwardedId(null);
  }, [unlinkingForwardedId, showToast, refreshHistory]);

  const handleLocalChange = useCallback(
    (id: number, field: keyof Transaction, value: Transaction[keyof Transaction]) => {
      updateLocalTransaction(id, field, value);
    },
    [updateLocalTransaction]
  );

  const handleFindTransferMatch = useCallback(async (id: number) => {
    setRelinkLoading(true);
    try {
      const { match } = await transactionService.findTransferMatch(id);
      if (match) {
        await transactionService.linkTransfer(id, match.id);
        showToast('Transfer linked', 'success');
        refreshHistory();
      } else {
        showToast('No transfer match found', 'info');
      }
    } catch (error) {
      console.error('Failed to find transfer match:', error);
      showToast('Failed to find match', 'error');
    } finally {
      setRelinkLoading(false);
    }
  }, [showToast, refreshHistory]);

  const handleFindForwardedMatch = useCallback(async (id: number) => {
    setRelinkLoading(true);
    try {
      const { candidates } = await transactionService.findForwardedMatch(id);
      if (candidates.length === 0) {
        showToast('No app transaction matches found', 'info');
      } else if (candidates.length === 1) {
        await transactionService.linkForwarded(id, candidates[0].id);
        showToast('Linked to app transaction', 'success');
        refreshHistory();
      } else {
        setRelinkingTxId(id);
        setRelinkCandidates(candidates);
        setRelinkType('forwarded');
      }
    } catch (error) {
      console.error('Failed to find forwarded match:', error);
      showToast('Failed to find match', 'error');
    } finally {
      setRelinkLoading(false);
    }
  }, [showToast, refreshHistory]);

  const handleFindReverseCcMatch = useCallback(async (id: number) => {
    setRelinkLoading(true);
    try {
      const { candidates } = await transactionService.findReverseCcMatch(id);
      if (candidates.length === 0) {
        showToast('No CC transaction matches found', 'info');
      } else if (candidates.length === 1) {
        await transactionService.linkForwarded(candidates[0].id, id);
        showToast('CC transaction linked', 'success');
        refreshHistory();
      } else {
        setRelinkingTxId(id);
        setRelinkCandidates(candidates);
        setRelinkType('reverseCc');
      }
    } catch (error) {
      console.error('Failed to find reverse CC match:', error);
      showToast('Failed to find match', 'error');
    } finally {
      setRelinkLoading(false);
    }
  }, [showToast, refreshHistory]);

  const handleRelinkSelect = useCallback(async (selectedId: number) => {
    if (relinkingTxId === null || relinkType === null) return;

    try {
      if (relinkType === 'forwarded') {
        await transactionService.linkForwarded(relinkingTxId, selectedId);
        showToast('Linked to app transaction', 'success');
      } else if (relinkType === 'reverseCc') {
        await transactionService.linkForwarded(selectedId, relinkingTxId);
        showToast('CC transaction linked', 'success');
      }
      refreshHistory();
    } catch (error) {
      console.error('Failed to link:', error);
      showToast('Failed to link transactions', 'error');
    } finally {
      setRelinkingTxId(null);
      setRelinkCandidates([]);
      setRelinkType(null);
    }
  }, [relinkingTxId, relinkType, showToast, refreshHistory]);

  const handleRelinkCancel = useCallback(() => {
    setRelinkingTxId(null);
    setRelinkCandidates([]);
    setRelinkType(null);
  }, []);

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
          <span className={`font-black text-lg ml-1 ${ledgerTotal < 0 ? 'text-green-600' : 'text-slate-800'}`}>
            {totalLoading ? '...' : `${ledgerTotal < 0 ? '+' : ''}${formatIDR(Math.abs(ledgerTotal))}`}
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
            forwardedCcTransactions={tx.forwardedCcTransactions}
            onEdit={() => setEditingId(tx.id)}
            onToggleExclude={() => handleToggleExclude(tx.id)}
            onDelete={() => setDeletingId(tx.id)}
            onViewImage={tx.imageUrl ? () => setViewingImageUrl(tx.imageUrl!) : undefined}
            onUnlink={tx.linkedTransferId ? () => setUnlinkingId(tx.id) : undefined}
            onUnlinkForwarded={(ccTransactionId) => setUnlinkingForwardedId(ccTransactionId)}
            onViewCcImage={(imageUrl) => setViewingImageUrl(imageUrl)}
            onViewLinkedImage={
              tx.linkedTransaction?.imageUrl
                ? () => setViewingImageUrl(tx.linkedTransaction!.imageUrl!)
                : undefined
            }
            onViewForwardedImage={
              tx.forwardedTransaction?.imageUrl
                ? () => setViewingImageUrl(tx.forwardedTransaction!.imageUrl!)
                : undefined
            }
            onFindTransferMatch={() => handleFindTransferMatch(tx.id)}
            onFindForwardedMatch={() => handleFindForwardedMatch(tx.id)}
            onFindReverseCcMatch={() => handleFindReverseCcMatch(tx.id)}
          />
        )
      )}

      {historyData.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <p className="font-bold">No transactions found</p>
          <p className="text-sm mt-1">Try adjusting the filters</p>
        </div>
      )}

      {viewingImageUrl && (
        <ImageLightbox
          imageUrl={viewingImageUrl}
          alt="Transaction Screenshot"
          onClose={() => setViewingImageUrl(null)}
        />
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

      <ConfirmDialog
        isOpen={unlinkingForwardedId !== null}
        title="Unlink CC Transaction"
        message="Are you sure you want to unlink this CC transaction? It will be counted separately in totals."
        confirmLabel="Unlink"
        onConfirm={handleUnlinkForwardedConfirm}
        onCancel={() => setUnlinkingForwardedId(null)}
      />

      <RelinkDialog
        isOpen={relinkingTxId !== null && relinkCandidates.length > 0}
        title={relinkType === 'forwarded' ? 'Select App Transaction' : 'Select CC Transaction'}
        candidates={relinkCandidates}
        onSelect={handleRelinkSelect}
        onCancel={handleRelinkCancel}
      />

      {relinkLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl p-4 shadow-lg">
            <p className="text-slate-600 font-medium">Finding matches...</p>
          </div>
        </div>
      )}
    </div>
  );
}
