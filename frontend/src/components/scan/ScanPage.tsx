import { useState, useCallback, type ChangeEvent } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAppContext } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { useUpload } from '../../context/UploadContext';
import { useImagePreview } from '../../hooks/useImagePreview';
import { transactionService } from '../../services/transactions';
import { FileUpload } from './FileUpload';
import { ImagePreview } from './ImagePreview';
import { TransactionItem } from './TransactionItem';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ImageLightbox } from '../common/ImageLightbox';
import { UploadProgress } from './UploadProgress';
import type { ParsedTransaction } from '../../types';

export function ScanPage() {
  const navigate = useNavigate();
  const { config, defaultUser, setDefaultUser } = useAppContext();
  const { showToast } = useToast();
  const {
    isUploading,
    progress,
    results,
    previewUrl,
    startUpload,
    clearResults,
    updateResult,
    removeResult,
    toggleDuplicate,
    toggleKeepSeparate,
    selectForwardedMatch,
    toggleSkipForwardedMatch,
    selectReverseCcMatch,
    toggleSkipReverseCcMatch,
  } = useUpload();

  const [selectedApp, setSelectedApp] = useState('auto');
  const [removingIndex, setRemovingIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [matchImageUrl, setMatchImageUrl] = useState<string | null>(null);

  const {
    showImage,
    isZoomed,
    toggleImage,
    openZoom,
    closeZoom,
  } = useImagePreview();

  // Separate state for viewing matched transaction's image
  const [matchImageZoomed, setMatchImageZoomed] = useState(false);

  const handleFileUpload = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const appType = selectedApp === 'auto' ? undefined : selectedApp;
      await startUpload(file, appType, defaultUser);
    },
    [defaultUser, selectedApp, startUpload]
  );

  const handleRemoveConfirm = useCallback(() => {
    if (removingIndex === null) return;
    removeResult(removingIndex);
    setRemovingIndex(null);
  }, [removingIndex, removeResult]);

  const isSaveable = (tx: ParsedTransaction) => {
    if (tx.isDuplicate) return false;
    if (tx.isValid === false) return false;
    return true;
  };

  const handleSave = useCallback(async () => {
    const itemsToSave = results.filter(isSaveable);
    if (!itemsToSave.length) return;

    try {
      setSaving(true);

      // Save all transactions
      await transactionService.confirm(itemsToSave);

      // Link reverse CC matches (CC transactions that need to point to newly saved app transactions)
      // We need to fetch the newly saved transactions to get their IDs
      // For now, we'll re-link using the CC transaction IDs and the app transaction info
      const reverseCcLinks = itemsToSave
        .map((item, idx) => ({ item, originalIdx: results.findIndex(r => r === item) }))
        .filter(({ item }) => item.reverseCcMatch && !item.skipReverseCcMatch);

      if (reverseCcLinks.length > 0) {
        // Fetch recently saved transactions to find the newly created IDs
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentTransactions = await transactionService.getHistory(
          thirtyDaysAgo.toISOString().split('T')[0],
          today.toISOString().split('T')[0]
        );

        // Match saved items with their new IDs by finding exact matches
        for (const { item } of reverseCcLinks) {
          const savedTransaction = recentTransactions.find(
            (t) =>
              t.date === item.date &&
              t.total === item.total &&
              t.expense === item.expense &&
              t.to === item.to &&
              t.payment === item.payment
          );

          if (savedTransaction && item.reverseCcMatch) {
            try {
              await transactionService.linkForwarded(item.reverseCcMatch.id, savedTransaction.id);
            } catch (linkError) {
              console.error('Failed to link CC transaction:', linkError);
            }
          }
        }
      }

      showToast(`Saved ${itemsToSave.length} transaction(s)`, 'success');
      clearResults();
      navigate({ to: '/ledger' });
    } catch (error) {
      console.error('Save failed:', error);
      showToast('Failed to save transactions. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  }, [results, clearResults, navigate, showToast]);

  const validCount = results.filter(isSaveable).length;

  // Show upload progress when uploading
  if (isUploading) {
    return <UploadProgress step={progress.step} message={progress.message} />;
  }

  return (
    <div className="space-y-4">
      {previewUrl && results.length > 0 && (
        <ImagePreview
          imageUrl={previewUrl}
          showImage={showImage}
          isZoomed={isZoomed}
          onToggle={toggleImage}
          onZoom={openZoom}
          onCloseZoom={closeZoom}
        />
      )}

      {results.map((tx, i) => (
        <TransactionItem
          key={i}
          transaction={tx}
          index={i}
          onUpdate={updateResult}
          onRemove={setRemovingIndex}
          onToggleDuplicate={toggleDuplicate}
          onToggleKeepSeparate={toggleKeepSeparate}
          onSelectForwardedMatch={selectForwardedMatch}
          onToggleSkipForwardedMatch={toggleSkipForwardedMatch}
          onSelectReverseCcMatch={selectReverseCcMatch}
          onToggleSkipReverseCcMatch={toggleSkipReverseCcMatch}
          onViewImage={(url) => {
            setMatchImageUrl(url);
            setMatchImageZoomed(true);
          }}
        />
      ))}

      {results.length === 0 ? (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">
                Record as
              </label>
              <select
                className="w-full bg-slate-50 text-base font-bold p-3 rounded-xl border-none outline-none min-h-[48px]"
                style={{ fontSize: '16px' }}
                value={defaultUser}
                onChange={(e) => setDefaultUser(e.target.value)}
              >
                {config?.users.map((user) => (
                  <option key={user} value={user}>
                    {user}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">
                Payment App
              </label>
              <select
                className="w-full bg-slate-50 text-base font-bold p-3 rounded-xl border-none outline-none min-h-[48px]"
                style={{ fontSize: '16px' }}
                value={selectedApp}
                onChange={(e) => setSelectedApp(e.target.value)}
              >
                <option value="auto">Auto-detect</option>
                {config?.paymentMethods.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <FileUpload loading={false} onFileSelect={handleFileUpload} />
        </div>
      ) : (
        <button
          onClick={handleSave}
          disabled={saving || validCount === 0}
          className="w-full bg-slate-900 py-4 rounded-2xl font-bold text-white shadow-xl min-h-[56px] disabled:opacity-50"
        >
          {saving ? 'Saving...' : `Record ${validCount} Items`}
        </button>
      )}

      <ConfirmDialog
        isOpen={removingIndex !== null}
        title="Remove Transaction"
        message="Are you sure you want to remove this transaction from the scan results?"
        confirmLabel="Remove"
        onConfirm={handleRemoveConfirm}
        onCancel={() => setRemovingIndex(null)}
      />

      {matchImageZoomed && matchImageUrl && (
        <ImageLightbox
          imageUrl={matchImageUrl}
          alt="Matched transaction screenshot"
          onClose={() => {
            setMatchImageZoomed(false);
            setMatchImageUrl(null);
          }}
        />
      )}
    </div>
  );
}
