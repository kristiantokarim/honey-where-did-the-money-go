import { useState, useCallback, type ChangeEvent } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTransactionContext } from '../../context/TransactionContext';
import { useAppContext } from '../../context/AppContext';
import { useImagePreview } from '../../hooks/useImagePreview';
import { transactionService } from '../../services/transactions';
import { FileUpload } from './FileUpload';
import { ImagePreview } from './ImagePreview';
import { TransactionItem } from './TransactionItem';
import type { ParsedTransaction } from '../../types';

export function ScanPage() {
  const navigate = useNavigate();
  const { defaultUser } = useAppContext();
  const { scanData, setScanData } = useTransactionContext();
  const [loading, setLoading] = useState(false);
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
        const result = await transactionService.upload(file);
        const duplicateCheck = await transactionService.checkDuplicates(
          result.transactions.map((t) => ({
            date: t.date,
            total: t.total,
            to: t.to,
          }))
        );

        const transactionsWithDuplicates: ParsedTransaction[] = result.transactions.map(
          (item, idx) => ({
            ...item,
            by: defaultUser,
            remarks: '',
            isExcluded: false,
            isDuplicate: duplicateCheck[idx].exists,
          })
        );

        setScanData(transactionsWithDuplicates);
      } catch (error) {
        console.error('Error processing image:', error);
        alert('Error processing image.');
      } finally {
        setLoading(false);
      }
    },
    [defaultUser, setScanData, setPreviewFromFile]
  );

  const handleUpdateTransaction = useCallback(
    (index: number, field: keyof ParsedTransaction, value: string | number) => {
      setScanData(
        scanData.map((tx, i) => (i === index ? { ...tx, [field]: value } : tx))
      );
    },
    [scanData, setScanData]
  );

  const handleRemoveTransaction = useCallback(
    (index: number) => {
      setScanData(scanData.filter((_, i) => i !== index));
    },
    [scanData, setScanData]
  );

  const handleSave = useCallback(async () => {
    const itemsToSave = scanData.filter((tx) => !tx.isDuplicate);
    if (!itemsToSave.length) return;

    try {
      setLoading(true);
      await transactionService.confirm(itemsToSave);
      setScanData([]);
      clearPreview();
      navigate({ to: '/ledger' });
    } catch (error) {
      console.error('Save failed:', error);
      alert('Save failed.');
    } finally {
      setLoading(false);
    }
  }, [scanData, setScanData, clearPreview, navigate]);

  const validCount = scanData.filter((tx) => !tx.isDuplicate).length;

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
          onRemove={handleRemoveTransaction}
        />
      ))}

      {scanData.length === 0 ? (
        <FileUpload loading={loading} onFileSelect={handleFileUpload} />
      ) : (
        <button
          onClick={handleSave}
          disabled={loading || validCount === 0}
          className="w-full bg-slate-900 py-4 rounded-2xl font-bold text-white shadow-xl min-h-[56px] disabled:opacity-50"
        >
          {loading ? 'Saving...' : `Record ${validCount} Items`}
        </button>
      )}
    </div>
  );
}
