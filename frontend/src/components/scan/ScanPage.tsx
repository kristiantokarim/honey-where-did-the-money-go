import { useState, useCallback, type ChangeEvent } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTransactionContext } from '../../context/TransactionContext';
import { useAppContext } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { useImagePreview } from '../../hooks/useImagePreview';
import { transactionService } from '../../services/transactions';
import { FileUpload } from './FileUpload';
import { ImagePreview } from './ImagePreview';
import { TransactionItem } from './TransactionItem';
import { ConfirmDialog } from '../common/ConfirmDialog';
import type { ParsedTransaction } from '../../types';

export function ScanPage() {
  const navigate = useNavigate();
  const { config, defaultUser, setDefaultUser } = useAppContext();
  const { scanData, setScanData } = useTransactionContext();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedApp, setSelectedApp] = useState('auto');
  const [removingIndex, setRemovingIndex] = useState<number | null>(null);
  const {
    previewUrl,
    showImage,
    isZoomed,
    setPreviewFromFile,
    clearPreview,
    toggleImage,
    openZoom,
    closeZoom,
  } = useImagePreview();

  const handleFileUpload = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setPreviewFromFile(file);
      setLoading(true);

      try {
        const appType = selectedApp === 'auto' ? undefined : selectedApp;
        const result = await transactionService.upload(file, appType);
        const duplicateCheck = await transactionService.checkDuplicates(
          result.transactions.map((t) => ({
            date: t.date,
            total: t.total,
            to: t.to,
            expense: t.expense,
          }))
        );

        const transactionsWithDuplicates: ParsedTransaction[] = result.transactions.map(
          (item, idx) => ({
            ...item,
            by: defaultUser,
            remarks: '',
            isExcluded: false,
            isDuplicate: duplicateCheck[idx].exists,
            imageUrl: result.imageUrl,
          })
        );

        setScanData(transactionsWithDuplicates);
        showToast(`Found ${transactionsWithDuplicates.length} transaction(s)`, 'success');
      } catch (error) {
        console.error('Error processing image:', error);
        showToast('Failed to process image. Please try again.', 'error');
      } finally {
        setLoading(false);
      }
    },
    [defaultUser, selectedApp, setScanData, setPreviewFromFile, showToast]
  );

  const handleUpdateTransaction = useCallback(
    (index: number, field: keyof ParsedTransaction, value: string | number) => {
      setScanData(
        scanData.map((tx, i) => (i === index ? { ...tx, [field]: value } : tx))
      );
    },
    [scanData, setScanData]
  );

  const handleRemoveConfirm = useCallback(() => {
    if (removingIndex === null) return;
    setScanData(scanData.filter((_, i) => i !== removingIndex));
    setRemovingIndex(null);
  }, [removingIndex, scanData, setScanData]);

  const handleToggleDuplicate = useCallback(
    (index: number) => {
      setScanData(
        scanData.map((tx, i) =>
          i === index ? { ...tx, isDuplicate: !tx.isDuplicate } : tx
        )
      );
    },
    [scanData, setScanData]
  );

  const isSaveable = (tx: ParsedTransaction) => {
    // Don't save if marked as duplicate (unless user overrides)
    if (tx.isDuplicate) return false;
    // Don't save failed/cancelled transactions
    if (tx.isValid === false) return false;
    return true;
  };

  const handleSave = useCallback(async () => {
    const itemsToSave = scanData.filter(isSaveable);
    if (!itemsToSave.length) return;

    try {
      setLoading(true);
      await transactionService.confirm(itemsToSave);
      showToast(`Saved ${itemsToSave.length} transaction(s)`, 'success');
      setScanData([]);
      clearPreview();
      navigate({ to: '/ledger' });
    } catch (error) {
      console.error('Save failed:', error);
      showToast('Failed to save transactions. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }, [scanData, setScanData, clearPreview, navigate, showToast]);

  const validCount = scanData.filter(isSaveable).length;

  return (
    <div className="space-y-4">
      {previewUrl && scanData.length > 0 && (
        <ImagePreview
          imageUrl={previewUrl}
          showImage={showImage}
          isZoomed={isZoomed}
          onToggle={toggleImage}
          onZoom={openZoom}
          onCloseZoom={closeZoom}
        />
      )}

      {scanData.map((tx, i) => (
        <TransactionItem
          key={i}
          transaction={tx}
          index={i}
          onUpdate={handleUpdateTransaction}
          onRemove={setRemovingIndex}
          onToggleDuplicate={handleToggleDuplicate}
        />
      ))}

      {scanData.length === 0 ? (
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
          <FileUpload loading={loading} onFileSelect={handleFileUpload} />
        </div>
      ) : (
        <button
          onClick={handleSave}
          disabled={loading || validCount === 0}
          className="w-full bg-slate-900 py-4 rounded-2xl font-bold text-white shadow-xl min-h-[56px] disabled:opacity-50"
        >
          {loading ? 'Saving...' : `Record ${validCount} Items`}
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
    </div>
  );
}
