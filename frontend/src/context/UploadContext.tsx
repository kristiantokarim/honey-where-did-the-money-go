import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { transactionService } from '../services/transactions';
import { useToast } from './ToastContext';
import type { ParsedTransaction } from '../types';

type UploadStep = 'idle' | 'uploading' | 'detecting' | 'extracting' | 'checking' | 'complete' | 'error';

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
  startUpload: (file: File, appType: string | undefined, defaultUser: string) => Promise<void>;
  clearResults: () => void;
  updateResult: (index: number, field: keyof ParsedTransaction, value: string | number | boolean) => void;
  removeResult: (index: number) => void;
  toggleDuplicate: (index: number) => void;
}

const PROGRESS_MESSAGES: Record<UploadStep, string> = {
  idle: '',
  uploading: 'Uploading image...',
  detecting: 'Detecting app type...',
  extracting: 'Extracting transactions...',
  checking: 'Checking for duplicates...',
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
  const abortControllerRef = useRef<AbortController | null>(null);

  const isUploading = ['uploading', 'detecting', 'extracting', 'checking'].includes(step);

  const progress: UploadProgress = {
    step,
    message: PROGRESS_MESSAGES[step],
  };

  const startUpload = useCallback(
    async (file: File, appType: string | undefined, defaultUser: string) => {
      // Clean up previous preview URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      // Create new preview URL
      const newPreviewUrl = URL.createObjectURL(file);
      setPreviewUrl(newPreviewUrl);
      setError(null);
      setResults([]);

      // Create abort controller for potential cancellation
      abortControllerRef.current = new AbortController();

      try {
        // Step 1: Upload
        setStep('uploading');

        // Step 2: Detecting (part of upload API call)
        setStep('detecting');

        // Step 3: Extracting
        setStep('extracting');
        const result = await transactionService.upload(file, appType);

        // Step 4: Check duplicates
        setStep('checking');
        const duplicateCheck = await transactionService.checkDuplicates(
          result.transactions.map((t) => ({
            date: t.date,
            total: t.total,
            to: t.to,
            expense: t.expense,
          }))
        );

        // Process results
        const transactionsWithMeta: ParsedTransaction[] = result.transactions.map(
          (item, idx) => ({
            ...item,
            by: defaultUser,
            remarks: '',
            isExcluded: false,
            isDuplicate: duplicateCheck[idx].exists,
            imageUrl: result.imageUrl,
          })
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
