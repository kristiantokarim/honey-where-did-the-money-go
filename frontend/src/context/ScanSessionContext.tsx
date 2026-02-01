import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { scanSessionService } from '../services/scanSession';
import { useToast } from './ToastContext';
import { useAppContext } from './AppContext';
import type {
  ScanSession,
  PageReview,
  ParsedTransaction,
  EnrichedParsedTransaction,
} from '../types';
import { ParseStatus } from '../types/enums';

type SessionStep =
  | 'idle'
  | 'uploading'
  | 'parsing'
  | 'reviewing'
  | 'confirming'
  | 'completed'
  | 'error';

interface ScanSessionContextValue {
  step: SessionStep;
  session: ScanSession | null;
  currentPage: PageReview | null;
  transactions: ParsedTransaction[];
  error: string | null;

  createSession: (files: File[]) => Promise<void>;
  loadActiveSession: (userId?: string) => Promise<boolean>;
  loadPageForReview: (pageIndex: number) => Promise<void>;
  confirmCurrentPage: () => Promise<void>;
  retryParse: () => Promise<void>;
  cancelSession: () => Promise<void>;

  updateTransaction: (
    index: number,
    field: keyof ParsedTransaction,
    value: string | number | boolean,
  ) => void;
  removeTransaction: (index: number) => void;
  toggleDuplicate: (index: number) => void;
  toggleKeepSeparate: (index: number) => void;
  selectForwardedMatch: (index: number, matchId: number | null) => void;
  toggleSkipForwardedMatch: (index: number) => void;
  selectReverseCcMatch: (index: number, matchId: number | null) => void;
  toggleSkipReverseCcMatch: (index: number) => void;
}

const ScanSessionContext = createContext<ScanSessionContextValue | null>(null);

const POLL_INTERVAL_MS = 3000;

export function ScanSessionProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast();
  const { defaultUser } = useAppContext();
  const [step, setStep] = useState<SessionStep>('idle');
  const [session, setSession] = useState<ScanSession | null>(null);
  const [currentPage, setCurrentPage] = useState<PageReview | null>(null);
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const enrichTransactions = useCallback(
    (rawTransactions: EnrichedParsedTransaction[], imageUrl: string): ParsedTransaction[] => {
      return rawTransactions.map((item) => {
        const candidates = item.forwardedMatchCandidates ?? [];
        const reverseCandidates = item.reverseCcMatchCandidates ?? [];

        return {
          ...item,
          by: defaultUser,
          remarks: item.remarks ?? '',
          isExcluded: false,
          isDuplicate: item.isDuplicate ?? false,
          imageUrl,
          transferMatch: item.transferMatch ?? undefined,
          matchedTransactionId: item.transferMatch?.id,
          keepSeparate: false,
          forwardedMatchCandidates: candidates,
          forwardedMatch: candidates.length === 1 ? candidates[0] : undefined,
          skipForwardedMatch: false,
          reverseCcMatchCandidates: reverseCandidates,
          reverseCcMatch:
            reverseCandidates.length === 1 ? reverseCandidates[0] : undefined,
          skipReverseCcMatch: false,
        };
      });
    },
    [defaultUser],
  );

  const pollSession = useCallback(async () => {
    if (!session) return;

    try {
      const updatedSession = await scanSessionService.getSession(session.sessionId);
      setSession(updatedSession);

      const allParsed = updatedSession.pages.every(
        (p) =>
          p.parseStatus === ParseStatus.Completed ||
          p.parseStatus === ParseStatus.Failed,
      );

      if (allParsed) {
        stopPolling();

        const currentIdx = updatedSession.currentPageIndex;
        const currentPageStatus = updatedSession.pages[currentIdx];

        if (currentPageStatus?.parseStatus === ParseStatus.Completed) {
          setStep('reviewing');
          const pageData = await scanSessionService.getPageForReview(
            updatedSession.sessionId,
            currentIdx,
          );
          setCurrentPage(pageData);
          setTransactions(
            enrichTransactions(pageData.transactions, pageData.imageUrl),
          );
        } else if (currentPageStatus?.parseStatus === ParseStatus.Failed) {
          setError(
            currentPageStatus.parseError || 'Failed to parse current page',
          );
          setStep('error');
        }
      }
    } catch (err) {
      console.error('Poll failed:', err);
    }
  }, [session, stopPolling, enrichTransactions]);

  const startPolling = useCallback(() => {
    stopPolling();
    pollIntervalRef.current = setInterval(pollSession, POLL_INTERVAL_MS);
  }, [pollSession, stopPolling]);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const createSession = useCallback(
    async (files: File[]) => {
      setError(null);
      setStep('uploading');

      try {
        const newSession = await scanSessionService.createSession(
          files,
          defaultUser,
        );

        setSession(newSession);
        setStep('parsing');
        showToast(`Uploading ${files.length} image(s)...`, 'success');

        startPolling();
      } catch (err) {
        console.error('Create session failed:', err);
        setError(err instanceof Error ? err.message : 'Failed to create session');
        setStep('error');
        showToast('Failed to start scan session', 'error');
      }
    },
    [defaultUser, showToast, startPolling],
  );

  const loadActiveSession = useCallback(async (userId?: string): Promise<boolean> => {
    const userToLoad = userId || defaultUser;
    if (!userToLoad) {
      return false;
    }

    try {
      const activeSession = await scanSessionService.getActiveSession(userToLoad);

      if (!activeSession) {
        return false;
      }

      setSession(activeSession);

      const hasPendingParsing = activeSession.pages.some(
        (p) =>
          p.parseStatus === ParseStatus.Pending ||
          p.parseStatus === ParseStatus.Processing,
      );

      if (hasPendingParsing) {
        setStep('parsing');
        startPolling();
      } else {
        const currentIdx = activeSession.currentPageIndex;
        const currentPageStatus = activeSession.pages[currentIdx];

        if (currentPageStatus?.parseStatus === ParseStatus.Completed) {
          setStep('reviewing');
          const pageData = await scanSessionService.getPageForReview(
            activeSession.sessionId,
            currentIdx,
          );
          setCurrentPage(pageData);
          setTransactions(
            enrichTransactions(pageData.transactions, pageData.imageUrl),
          );
        } else if (currentPageStatus?.parseStatus === ParseStatus.Failed) {
          setError(currentPageStatus.parseError || 'Failed to parse page');
          setStep('error');
        }
      }

      return true;
    } catch (err) {
      console.error('Load active session failed:', err);
      return false;
    }
  }, [defaultUser, startPolling, enrichTransactions]);

  const loadPageForReview = useCallback(
    async (pageIndex: number) => {
      if (!session) return;

      try {
        const pageData = await scanSessionService.getPageForReview(
          session.sessionId,
          pageIndex,
        );
        setCurrentPage(pageData);
        setTransactions(
          enrichTransactions(pageData.transactions, pageData.imageUrl),
        );
        setStep('reviewing');
      } catch (err) {
        console.error('Load page failed:', err);
        setError(err instanceof Error ? err.message : 'Failed to load page');
        setStep('error');
      }
    },
    [session, enrichTransactions],
  );

  const isSaveable = (tx: ParsedTransaction) => {
    if (tx.isDuplicate) return false;
    if (tx.isValid === false) return false;
    return true;
  };

  const confirmCurrentPage = useCallback(async () => {
    if (!session || !currentPage) return;

    const itemsToSave = transactions.filter(isSaveable).map((item) => ({
      ...item,
      reverseCcMatchId:
        item.reverseCcMatch && !item.skipReverseCcMatch
          ? item.reverseCcMatch.id
          : undefined,
    }));

    try {
      setStep('confirming');
      const result = await scanSessionService.confirmPage(
        session.sessionId,
        currentPage.pageIndex,
        itemsToSave,
      );

      if (result.createdCount > 0) {
        showToast(
          `Saved ${result.createdCount} transaction(s). You can edit them in the Ledger.`,
          'success',
        );
      } else {
        showToast('Page skipped (no transactions to save)', 'success');
      }

      if (result.sessionCompleted) {
        setStep('completed');
        setSession(null);
        setCurrentPage(null);
        setTransactions([]);
      } else if (result.nextPageIndex !== null) {
        const updatedSession = await scanSessionService.getSession(
          session.sessionId,
        );
        setSession(updatedSession);
        await loadPageForReview(result.nextPageIndex);
      }
    } catch (err) {
      console.error('Confirm page failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to confirm page');
      setStep('error');
      showToast('Failed to save transactions', 'error');
    }
  }, [session, currentPage, transactions, showToast, loadPageForReview]);

  const retryParse = useCallback(async () => {
    if (!session) return;

    try {
      const result = await scanSessionService.retryParse(session.sessionId);
      showToast(result.message, 'success');
      setStep('parsing');
      startPolling();
    } catch (err) {
      console.error('Retry parse failed:', err);
      const message =
        err instanceof Error ? err.message : 'Failed to retry parsing';
      showToast(message, 'error');
    }
  }, [session, showToast, startPolling]);

  const cancelSession = useCallback(async () => {
    if (!session) return;

    try {
      stopPolling();
      await scanSessionService.cancelSession(session.sessionId);
      setSession(null);
      setCurrentPage(null);
      setTransactions([]);
      setStep('idle');
      setError(null);
      showToast('Session cancelled', 'success');
    } catch (err) {
      console.error('Cancel session failed:', err);
      showToast('Failed to cancel session', 'error');
    }
  }, [session, stopPolling, showToast]);

  const updateTransaction = useCallback(
    (
      index: number,
      field: keyof ParsedTransaction,
      value: string | number | boolean,
    ) => {
      setTransactions((prev) =>
        prev.map((tx, i) => (i === index ? { ...tx, [field]: value } : tx)),
      );
    },
    [],
  );

  const removeTransaction = useCallback((index: number) => {
    setTransactions((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const toggleDuplicate = useCallback((index: number) => {
    setTransactions((prev) =>
      prev.map((tx, i) =>
        i === index ? { ...tx, isDuplicate: !tx.isDuplicate } : tx,
      ),
    );
  }, []);

  const toggleKeepSeparate = useCallback((index: number) => {
    setTransactions((prev) =>
      prev.map((tx, i) => {
        if (i !== index) return tx;
        const keepSeparate = !tx.keepSeparate;
        return {
          ...tx,
          keepSeparate,
          matchedTransactionId: keepSeparate ? undefined : tx.transferMatch?.id,
        };
      }),
    );
  }, []);

  const selectForwardedMatch = useCallback(
    (index: number, matchId: number | null) => {
      setTransactions((prev) =>
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
        }),
      );
    },
    [],
  );

  const toggleSkipForwardedMatch = useCallback((index: number) => {
    setTransactions((prev) =>
      prev.map((tx, i) => {
        if (i !== index) return tx;
        const skipForwardedMatch = !tx.skipForwardedMatch;
        return {
          ...tx,
          skipForwardedMatch,
          forwardedMatch: skipForwardedMatch ? undefined : tx.forwardedMatch,
          forwardedTransactionId: skipForwardedMatch
            ? undefined
            : tx.forwardedMatch?.id,
        };
      }),
    );
  }, []);

  const selectReverseCcMatch = useCallback(
    (index: number, matchId: number | null) => {
      setTransactions((prev) =>
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
        }),
      );
    },
    [],
  );

  const toggleSkipReverseCcMatch = useCallback((index: number) => {
    setTransactions((prev) =>
      prev.map((tx, i) => {
        if (i !== index) return tx;
        const skip = !tx.skipReverseCcMatch;
        return {
          ...tx,
          skipReverseCcMatch: skip,
          reverseCcMatch: skip ? undefined : tx.reverseCcMatch,
        };
      }),
    );
  }, []);

  return (
    <ScanSessionContext.Provider
      value={{
        step,
        session,
        currentPage,
        transactions,
        error,
        createSession,
        loadActiveSession,
        loadPageForReview,
        confirmCurrentPage,
        retryParse,
        cancelSession,
        updateTransaction,
        removeTransaction,
        toggleDuplicate,
        toggleKeepSeparate,
        selectForwardedMatch,
        toggleSkipForwardedMatch,
        selectReverseCcMatch,
        toggleSkipReverseCcMatch,
      }}
    >
      {children}
    </ScanSessionContext.Provider>
  );
}

export function useScanSession() {
  const context = useContext(ScanSessionContext);
  if (!context) {
    throw new Error('useScanSession must be used within a ScanSessionProvider');
  }
  return context;
}
