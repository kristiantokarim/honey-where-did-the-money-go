import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { transactionService } from '../services/transactions';
import { useToast } from './ToastContext';
import type { ParsedTransaction } from '../types';
import { PaymentApp } from '../types/enums';

type UploadStep = 'idle' | 'uploading' | 'extracting' | 'review' | 'error';

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
  extracting: 'Extracting transactions...',
  review: 'Done!',
  error: 'Something went wrong',
};

const UploadContext = createContext<UploadContextValue | null>(null);

export function UploadProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast();
  const [step, setStep] = useState<UploadStep>('idle');
  const [results, setResults] = useState<ParsedTransaction[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isUploading = ['uploading', 'extracting'].includes(step);

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
        setStep('uploading');
        setStep('extracting');

        // Single API call - backend returns fully enriched transactions
        const result = await transactionService.upload(file, appType);

        // Transform backend response to frontend state
        const transactionsWithMeta: ParsedTransaction[] = result.transactions.map(
          (item) => {
            const candidates = item.forwardedMatchCandidates ?? [];
            const reverseCandidates = item.reverseCcMatchCandidates ?? [];

            return {
              ...item,
              by: defaultUser,
              remarks: item.remarks ?? '',
              isExcluded: false,
              isDuplicate: item.isDuplicate ?? false,
              imageUrl: result.imageUrl,
              // Transfer match comes from backend
              transferMatch: item.transferMatch ?? undefined,
              matchedTransactionId: item.transferMatch?.id,
              keepSeparate: false,
              // Forwarded match candidates come from backend
              forwardedMatchCandidates: candidates,
              forwardedMatch: candidates.length === 1 ? candidates[0] : undefined,
              skipForwardedMatch: false,
              // Reverse CC match candidates come from backend
              reverseCcMatchCandidates: reverseCandidates,
              reverseCcMatch: reverseCandidates.length === 1 ? reverseCandidates[0] : undefined,
              skipReverseCcMatch: false,
            };
          }
        );

        setResults(transactionsWithMeta);
        setStep('review');
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
