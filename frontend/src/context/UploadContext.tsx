import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { transactionService } from '../services/transactions';
import { useToast } from './ToastContext';
import type { ParsedTransaction, Transaction } from '../types';
import { TransactionType, PaymentApp } from '../types/enums';

type UploadStep = 'idle' | 'uploading' | 'detecting' | 'extracting' | 'checking' | 'checking_forwarded' | 'checking_reverse' | 'complete' | 'error';

interface UploadProgress {
  step: UploadStep;
  message: string;
}

interface UploadContextValue {
  // State
  isUploading: boolean;
  progress: UploadProgress;
  results: ParsedTransaction[];
  previewUrl: string | null;
  error: string | null;

  // Actions
  startUpload: (file: File, appType: PaymentApp | undefined, defaultUser: string) => Promise<void>;
  clearResults: () => void;
  updateResult: (index: number, field: keyof ParsedTransaction, value: string | number | boolean) => void;
  removeResult: (index: number) => void;
  toggleDuplicate: (index: number) => void;
  toggleKeepSeparate: (index: number) => void;
  selectForwardedMatch: (index: number, matchId: number | null) => void;
  toggleSkipForwardedMatch: (index: number) => void;
  selectReverseCcMatch: (index: number, matchId: number | null) => void;
  toggleSkipReverseCcMatch: (index: number) => void;
}

const PROGRESS_MESSAGES: Record<UploadStep, string> = {
  idle: '',
  uploading: 'Uploading image...',
  detecting: 'Detecting app type...',
  extracting: 'Extracting transactions...',
  checking: 'Checking for duplicates...',
  checking_forwarded: 'Finding CC matches...',
  checking_reverse: 'Finding existing CC transactions...',
  complete: 'Done!',
  error: 'Something went wrong',
};

const UploadContext = createContext<UploadContextValue | null>(null);

export function UploadProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast();
  const [step, setStep] = useState<UploadStep>('idle');
  const [results, setResults] = useState<ParsedTransaction[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isUploading = ['uploading', 'detecting', 'extracting', 'checking'].includes(step);

  const progress: UploadProgress = {
    step,
    message: PROGRESS_MESSAGES[step],
  };

  const startUpload = useCallback(
    async (file: File, appType: PaymentApp | undefined, defaultUser: string) => {
      // Clean up previous preview URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      // Create new preview URL
      const newPreviewUrl = URL.createObjectURL(file);
      setPreviewUrl(newPreviewUrl);
      setError(null);
      setResults([]);

      try {
        // Step 1: Upload
        setStep('uploading');

        // Step 2: Detecting (part of upload API call)
        setStep('detecting');

        // Step 3: Extracting
        setStep('extracting');
        const result = await transactionService.upload(file, appType);

        // Step 4: Check duplicates and transfer matches
        setStep('checking');
        const [duplicateCheck, transferMatches] = await Promise.all([
          transactionService.checkDuplicates(
            result.transactions.map((t) => ({
              date: t.date,
              total: t.total,
              to: t.to,
              expense: t.expense,
              payment: t.payment,
            }))
          ),
          transactionService.checkTransferMatches(
            result.transactions.map((t) => ({
              transactionType: t.transactionType,
              total: t.total,
              date: t.date,
              payment: t.payment,
            }))
          ),
        ]);

        // Step 5: Check for forwarded CC matches (for CC statements looking for source app transactions)
        const forwardedItems = result.transactions
          .map((t, idx) => ({ ...t, originalIndex: idx }))
          .filter((t) => t.forwardedFromApp);

        let forwardedMatches: Array<{ index: number; candidates: Transaction[] }> = [];
        if (forwardedItems.length > 0) {
          setStep('checking_forwarded');
          forwardedMatches = await transactionService.findForwardedMatches(
            forwardedItems.map((t) => ({
              forwardedFromApp: t.forwardedFromApp!,
              total: t.total,
              date: t.date,
            }))
          );
        }

        // Step 6: Check for reverse forwarded matches (for source apps like Grab/Gojek looking for CC transactions)
        const isSourceApp = result.appType === PaymentApp.Grab || result.appType === PaymentApp.Gojek;
        let reverseForwardedMatches: Array<{ index: number; candidates: Transaction[] }> = [];

        if (isSourceApp) {
          setStep('checking_reverse');
          reverseForwardedMatches = await transactionService.findReverseForwardedMatches(
            result.transactions.map((t) => ({
              payment: t.payment,
              total: t.total,
              date: t.date,
            }))
          );
        }

        // Process results
        const transactionsWithMeta: ParsedTransaction[] = result.transactions.map(
          (item, idx) => {
            const transferMatch = transferMatches.find((m) => m.index === idx)?.match;

            // Find forwarded match candidates for this transaction
            const forwardedItemIndex = forwardedItems.findIndex((f) => f.originalIndex === idx);
            const forwardedMatchData = forwardedItemIndex >= 0
              ? forwardedMatches.find((m) => m.index === forwardedItemIndex)
              : undefined;
            const candidates = forwardedMatchData?.candidates || [];

            // Find reverse CC match candidates (for source apps like Grab/Gojek)
            const reverseCandidates = reverseForwardedMatches.find((m) => m.index === idx)?.candidates || [];

            return {
              ...item,
              by: defaultUser,
              remarks: '',
              isExcluded: false,
              isDuplicate: duplicateCheck[idx].exists,
              imageUrl: result.imageUrl,
              transferMatch: transferMatch || undefined,
              matchedTransactionId: transferMatch?.id,
              keepSeparate: false,
              forwardedMatchCandidates: candidates,
              forwardedMatch: candidates.length === 1 ? candidates[0] : undefined,
              skipForwardedMatch: false,
              reverseCcMatchCandidates: reverseCandidates,
              reverseCcMatch: reverseCandidates.length === 1 ? reverseCandidates[0] : undefined,
              skipReverseCcMatch: false,
            };
          }
        );

        setResults(transactionsWithMeta);
        setStep('complete');
        showToast(`Found ${transactionsWithMeta.length} transaction(s)`, 'success');
      } catch (err) {
        console.error('Upload failed:', err);
        setError(err instanceof Error ? err.message : 'Upload failed');
        setStep('error');
        showToast('Failed to process image. Please try again.', 'error');
      }
    },
    [previewUrl, showToast]
  );

  const clearResults = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setResults([]);
    setPreviewUrl(null);
    setStep('idle');
    setError(null);
  }, [previewUrl]);

  const updateResult = useCallback(
    (index: number, field: keyof ParsedTransaction, value: string | number | boolean) => {
      setResults((prev) =>
        prev.map((tx, i) => (i === index ? { ...tx, [field]: value } : tx))
      );
    },
    []
  );

  const removeResult = useCallback((index: number) => {
    setResults((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const toggleDuplicate = useCallback((index: number) => {
    setResults((prev) =>
      prev.map((tx, i) =>
        i === index ? { ...tx, isDuplicate: !tx.isDuplicate } : tx
      )
    );
  }, []);

  const toggleKeepSeparate = useCallback((index: number) => {
    setResults((prev) =>
      prev.map((tx, i) => {
        if (i !== index) return tx;
        const keepSeparate = !tx.keepSeparate;
        return {
          ...tx,
          keepSeparate,
          // Clear matchedTransactionId if keeping separate
          matchedTransactionId: keepSeparate ? undefined : tx.transferMatch?.id,
        };
      })
    );
  }, []);

  const selectForwardedMatch = useCallback((index: number, matchId: number | null) => {
    setResults((prev) =>
      prev.map((tx, i) => {
        if (i !== index) return tx;
        const match = matchId
          ? tx.forwardedMatchCandidates?.find((c) => c.id === matchId)
          : undefined;
        return {
          ...tx,
          forwardedMatch: match,
          forwardedTransactionId: match?.id,
          skipForwardedMatch: false,
        };
      })
    );
  }, []);

  const toggleSkipForwardedMatch = useCallback((index: number) => {
    setResults((prev) =>
      prev.map((tx, i) => {
        if (i !== index) return tx;
        const skipForwardedMatch = !tx.skipForwardedMatch;
        return {
          ...tx,
          skipForwardedMatch,
          forwardedMatch: skipForwardedMatch ? undefined : tx.forwardedMatch,
          forwardedTransactionId: skipForwardedMatch ? undefined : tx.forwardedMatch?.id,
        };
      })
    );
  }, []);

  const selectReverseCcMatch = useCallback((index: number, matchId: number | null) => {
    setResults((prev) =>
      prev.map((tx, i) => {
        if (i !== index) return tx;
        const match = matchId
          ? tx.reverseCcMatchCandidates?.find((c) => c.id === matchId)
          : undefined;
        return {
          ...tx,
          reverseCcMatch: match,
          skipReverseCcMatch: false,
        };
      })
    );
  }, []);

  const toggleSkipReverseCcMatch = useCallback((index: number) => {
    setResults((prev) =>
      prev.map((tx, i) => {
        if (i !== index) return tx;
        const skip = !tx.skipReverseCcMatch;
        return {
          ...tx,
          skipReverseCcMatch: skip,
          reverseCcMatch: skip ? undefined : tx.reverseCcMatch,
        };
      })
    );
  }, []);

  return (
    <UploadContext.Provider
      value={{
        isUploading,
        progress,
        results,
        previewUrl,
        error,
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
      }}
    >
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error('useUpload must be used within an UploadProvider');
  }
  return context;
}
