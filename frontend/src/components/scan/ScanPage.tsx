import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft, RefreshCw, Loader2 } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useScanSession } from '../../context/ScanSessionContext';
import { useImagePreview } from '../../hooks/useImagePreview';
import { MultiFileUpload } from './MultiFileUpload';
import { ImagePreview } from './ImagePreview';
import { TransactionItem } from './TransactionItem';
import { PageNavigation } from './PageNavigation';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ImageLightbox } from '../common/ImageLightbox';
import type { ParsedTransaction } from '../../types';
import { ParseStatus } from '../../types/enums';

export function ScanPage() {
  const navigate = useNavigate();
  const { config, defaultUser, setDefaultUser } = useAppContext();
  const {
    step,
    session,
    currentPage,
    transactions,
    error,
    createSession,
    loadActiveSession,
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
  } = useScanSession();

  const [removingIndex, setRemovingIndex] = useState<number | null>(null);
  const [matchImageUrl, setMatchImageUrl] = useState<string | null>(null);
  const [matchImageZoomed, setMatchImageZoomed] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const initializedForUser = useRef<string | null>(null);

  const {
    showImage,
    isZoomed,
    toggleImage,
    openZoom,
    closeZoom,
  } = useImagePreview();

  useEffect(() => {
    if (!defaultUser) return;
    if (initializedForUser.current === defaultUser) return;
    initializedForUser.current = defaultUser;

    const checkActiveSession = async () => {
      setIsLoadingSession(true);
      await loadActiveSession(defaultUser);
      setIsLoadingSession(false);
    };
    checkActiveSession();
  }, [defaultUser, loadActiveSession]);

  const handleFilesSelect = useCallback(
    async (files: File[]) => {
      await createSession(files);
    },
    [createSession],
  );

  const handleRemoveConfirm = useCallback(() => {
    if (removingIndex === null) return;
    removeTransaction(removingIndex);
    setRemovingIndex(null);
  }, [removingIndex, removeTransaction]);

  const isSaveable = (tx: ParsedTransaction) => {
    if (tx.isDuplicate) return false;
    if (tx.isValid === false) return false;
    return true;
  };

  const handleConfirmPage = useCallback(async () => {
    await confirmCurrentPage();
    if (step === 'completed') {
      navigate({ to: '/ledger' });
    }
  }, [confirmCurrentPage, step, navigate]);

  const validCount = transactions.filter(isSaveable).length;

  if (isLoadingSession) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  if (step === 'uploading') {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="animate-spin text-blue-500" size={32} />
        <p className="text-slate-600 font-medium">Uploading images...</p>
      </div>
    );
  }

  if (step === 'parsing' && session) {
    const hasFailedPages = session.pages.some(
      (p) => p.parseStatus === ParseStatus.Failed,
    );

    return (
      <div className="space-y-4">
        <PageNavigation
          pages={session.pages}
          currentPageIndex={session.currentPageIndex}
          totalPages={session.totalPages}
          parsedPages={session.parsedPages}
          defaultUser={defaultUser}
        />

        <div className="flex flex-col items-center justify-center h-48 space-y-4">
          <Loader2 className="animate-spin text-blue-500" size={32} />
          <p className="text-slate-600 font-medium">
            Processing {session.totalPages} page(s)...
          </p>
          <p className="text-slate-500 text-sm">
            {session.parsedPages} of {session.totalPages} parsed
          </p>
          <p className="text-slate-500 text-sm">
            Recording as: {defaultUser}
          </p>
        </div>

        <button
          onClick={retryParse}
          className="w-full flex items-center justify-center gap-2 bg-amber-100 text-amber-800 py-3 rounded-xl font-medium"
        >
          <RefreshCw size={16} />
          {hasFailedPages ? 'Retry Failed Pages' : 'Retry Parsing'}
        </button>

        <button
          onClick={cancelSession}
          className="w-full py-3 rounded-xl font-medium text-slate-500 hover:text-slate-700"
        >
          Cancel Session
        </button>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
          <p className="text-red-700 font-medium">
            {error || 'Something went wrong'}
          </p>
        </div>

        {session && (
          <button
            onClick={retryParse}
            className="w-full flex items-center justify-center gap-2 bg-amber-100 text-amber-800 py-3 rounded-xl font-medium"
          >
            <RefreshCw size={16} />
            Retry Parsing
          </button>
        )}

        <button
          onClick={cancelSession}
          className="w-full py-3 rounded-xl font-medium text-slate-500 hover:text-slate-700"
        >
          Cancel Session
        </button>
      </div>
    );
  }

  if (step === 'reviewing' && session && currentPage) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <button
            onClick={cancelSession}
            className="flex items-center gap-2 text-slate-500 font-semibold hover:text-slate-700 transition-colors"
          >
            <ArrowLeft size={16} />
            Cancel
          </button>
        </div>

        <PageNavigation
          pages={session.pages}
          currentPageIndex={currentPage.pageIndex}
          totalPages={session.totalPages}
          parsedPages={session.parsedPages}
          defaultUser={defaultUser}
        />

        <ImagePreview
          imageUrl={currentPage.imageUrl}
          showImage={showImage}
          isZoomed={isZoomed}
          onToggle={toggleImage}
          onZoom={openZoom}
          onCloseZoom={closeZoom}
        />

        {transactions.map((tx, i) => (
          <TransactionItem
            key={i}
            transaction={tx}
            index={i}
            onUpdate={updateTransaction}
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

        <button
          onClick={handleConfirmPage}
          disabled={step === 'confirming'}
          className="w-full bg-slate-900 py-4 rounded-2xl font-bold text-white shadow-xl min-h-[56px] disabled:opacity-50"
        >
          {step === 'confirming'
            ? 'Saving...'
            : validCount === 0
              ? currentPage.pageIndex < session.totalPages - 1
                ? 'Skip & Next (All Duplicates)'
                : 'Skip & Finish (All Duplicates)'
              : currentPage.pageIndex < session.totalPages - 1
                ? `Confirm & Next (${validCount} items)`
                : `Confirm & Finish (${validCount} items)`}
        </button>

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

  if (step === 'completed') {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-6xl">✓</div>
        <p className="text-slate-600 font-medium">All pages confirmed!</p>
        <button
          onClick={() => navigate({ to: '/ledger' })}
          className="bg-slate-900 px-6 py-3 rounded-xl font-bold text-white"
        >
          View in Ledger
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
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
      </div>

      <MultiFileUpload
        loading={step === 'uploading'}
        onFilesSelect={handleFilesSelect}
      />
    </div>
  );
}
