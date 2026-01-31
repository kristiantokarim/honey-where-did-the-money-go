import { useState } from 'react';
import { Trash2, Tag, Store, FolderOpen, XCircle, Copy, Link2, ChevronDown, ChevronUp, Image, ArrowUpRight, ArrowDownLeft, CreditCard, AlertCircle } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { formatIDR } from '../../utils/format';
import { getTypeBadge } from '../../utils/transactionBadge';
import type { ParsedTransaction } from '../../types';

interface TransactionItemProps {
  transaction: ParsedTransaction;
  index: number;
  onUpdate: (index: number, field: keyof ParsedTransaction, value: string | number) => void;
  onRemove: (index: number) => void;
  onToggleDuplicate: (index: number) => void;
  onToggleKeepSeparate?: (index: number) => void;
  onSelectForwardedMatch?: (index: number, matchId: number | null) => void;
  onToggleSkipForwardedMatch?: (index: number) => void;
  onSelectReverseCcMatch?: (index: number, matchId: number | null) => void;
  onToggleSkipReverseCcMatch?: (index: number) => void;
  onViewImage?: (url: string) => void;
}

function isCancelledOrFailed(tx: ParsedTransaction): boolean {
  if (tx.isValid === false) return true;
  if (!tx.status) return false;
  const status = tx.status.toLowerCase();
  return status.includes('fail') || status.includes('cancel') || status.includes('reject');
}

export function TransactionItem({
  transaction,
  index,
  onUpdate,
  onRemove,
  onToggleDuplicate,
  onToggleKeepSeparate,
  onSelectForwardedMatch,
  onToggleSkipForwardedMatch,
  onSelectReverseCcMatch,
  onToggleSkipReverseCcMatch,
  onViewImage,
}: TransactionItemProps) {
  const { config } = useAppContext();
  const isFailed = isCancelledOrFailed(transaction);
  const [matchExpanded, setMatchExpanded] = useState(false);
  const [forwardedExpanded, setForwardedExpanded] = useState(false);
  const [reverseCcExpanded, setReverseCcExpanded] = useState(false);
  const typeBadge = getTypeBadge(transaction.transactionType);
  const hasForwardedFromApp = !!transaction.forwardedFromApp;
  const hasForwardedCandidates = transaction.forwardedMatchCandidates && transaction.forwardedMatchCandidates.length > 0;
  const hasReverseCcCandidates = transaction.reverseCcMatchCandidates && transaction.reverseCcMatchCandidates.length > 0;

  return (
    <div className={`rounded-[2rem] p-5 border shadow-sm space-y-4 ${
      isFailed ? 'bg-red-50 border-red-200' : 'bg-white border-slate-100'
    }`}>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="text-sm font-bold bg-slate-50 p-2 rounded-lg min-h-[44px]"
            value={transaction.date}
            onChange={(e) => onUpdate(index, 'date', e.target.value)}
          />
          {typeBadge && (
            <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${typeBadge.bgColor} ${typeBadge.textColor}`}>
              <typeBadge.icon size={12} />
              {typeBadge.label}
            </span>
          )}
          {hasForwardedFromApp && (
            <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
              transaction.forwardedMatch
                ? 'bg-purple-100 text-purple-700'
                : 'bg-amber-100 text-amber-700'
            }`}>
              {transaction.forwardedMatch ? <CreditCard size={12} /> : <AlertCircle size={12} />}
              {transaction.forwardedMatch ? 'CC Matched' : `From ${transaction.forwardedFromApp}`}
            </span>
          )}
        </div>
        <button
          onClick={() => onRemove(index)}
          className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <Trash2 size={16} className="text-slate-300" />
        </button>
      </div>

      <div className="flex items-center text-3xl font-mono font-bold text-slate-800 tracking-tighter">
        <span className="text-lg text-slate-300 mr-1 font-sans">Rp</span>
        <input
          type="number"
          inputMode="numeric"
          className="bg-transparent outline-none w-full min-h-[48px]"
          value={transaction.total}
          onChange={(e) => onUpdate(index, 'total', Number(e.target.value))}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center bg-slate-50 rounded-xl px-3 py-3 min-h-[48px]">
          <Tag size={14} className="text-slate-400 mr-3" />
          <input
            className="bg-transparent text-sm font-bold w-full outline-none"
            value={transaction.expense}
            onChange={(e) => onUpdate(index, 'expense', e.target.value)}
            placeholder="Expense name"
          />
        </div>
        <div className="flex items-center bg-slate-50 rounded-xl px-3 py-3 min-h-[48px]">
          <Store size={14} className="text-slate-400 mr-3" />
          <input
            className="bg-transparent text-sm font-bold w-full outline-none"
            value={transaction.to}
            onChange={(e) => onUpdate(index, 'to', e.target.value)}
            placeholder="Merchant"
          />
        </div>
        <div className="flex items-center bg-slate-50 rounded-xl px-3 py-3 min-h-[48px]">
          <FolderOpen size={14} className="text-slate-400 mr-3" />
          <select
            className="bg-transparent font-bold w-full outline-none appearance-none"
            style={{ fontSize: '16px' }}
            value={transaction.category}
            onChange={(e) => onUpdate(index, 'category', e.target.value)}
          >
            {config?.categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isFailed && (
        <div className="flex items-center gap-2 text-xs text-red-600 font-bold bg-red-100 p-2 rounded-lg">
          <XCircle size={14} />
          <span>Failed/Cancelled - will be skipped</span>
        </div>
      )}

      {transaction.isDuplicate && !isFailed && (
        <button
          onClick={() => onToggleDuplicate(index)}
          className="w-full flex items-center justify-between text-xs text-orange-600 font-bold bg-orange-50 p-3 rounded-lg min-h-[44px]"
        >
          <div className="flex items-center gap-2">
            <Copy size={14} />
            <span>Duplicate - will be skipped</span>
          </div>
          <span className="text-orange-400 underline">Keep anyway</span>
        </button>
      )}

      {/* Transfer Match Section */}
      {transaction.transferMatch && !isFailed && (
        <div className="space-y-2">
          <button
            onClick={() => setMatchExpanded(!matchExpanded)}
            className={`w-full flex items-center justify-between text-xs font-bold p-3 rounded-lg min-h-[44px] ${
              transaction.keepSeparate
                ? 'bg-slate-100 text-slate-600'
                : 'bg-blue-50 text-blue-600'
            }`}
          >
            <div className="flex items-center gap-2">
              <Link2 size={14} />
              <span>
                {transaction.keepSeparate
                  ? 'Match ignored - will save separately'
                  : 'Potential transfer match found'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {!transaction.keepSeparate && (
                <span className="text-blue-400">View</span>
              )}
              {matchExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
          </button>

          {matchExpanded && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 animate-fade-in">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span className="font-bold">{transaction.transferMatch.payment}</span>
                    <span>•</span>
                    <span>{transaction.transferMatch.date}</span>
                  </div>
                  <div className="text-base font-bold text-slate-800 mt-1">
                    {transaction.transferMatch.expense || transaction.transferMatch.to}
                  </div>
                  <div className="text-lg font-mono font-bold text-slate-700">
                    {formatIDR(transaction.transferMatch.total)}
                  </div>
                  {transaction.transferMatch.transactionType && (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold mt-2 ${
                      transaction.transferMatch.transactionType === 'transfer_in'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}>
                      {transaction.transferMatch.transactionType === 'transfer_in' ? (
                        <>
                          <ArrowDownLeft size={10} />
                          In
                        </>
                      ) : (
                        <>
                          <ArrowUpRight size={10} />
                          Out
                        </>
                      )}
                    </span>
                  )}
                </div>
                {transaction.transferMatch.imageUrl && onViewImage && (
                  <button
                    onClick={() => onViewImage(transaction.transferMatch!.imageUrl!)}
                    className="p-2 bg-white rounded-lg border border-slate-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
                  >
                    <Image size={16} className="text-slate-400" />
                  </button>
                )}
              </div>

              <button
                onClick={() => onToggleKeepSeparate?.(index)}
                className={`w-full py-2 px-4 rounded-lg font-bold text-sm min-h-[44px] ${
                  transaction.keepSeparate
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {transaction.keepSeparate ? 'Link These Transfers' : 'Keep Separate'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Forwarded CC Match Section */}
      {hasForwardedFromApp && hasForwardedCandidates && !isFailed && (
        <div className="space-y-2">
          <button
            onClick={() => setForwardedExpanded(!forwardedExpanded)}
            className={`w-full flex items-center justify-between text-xs font-bold p-3 rounded-lg min-h-[44px] ${
              transaction.skipForwardedMatch
                ? 'bg-slate-100 text-slate-600'
                : transaction.forwardedMatch
                  ? 'bg-purple-50 text-purple-600'
                  : 'bg-amber-50 text-amber-600'
            }`}
          >
            <div className="flex items-center gap-2">
              <CreditCard size={14} />
              <span>
                {transaction.skipForwardedMatch
                  ? 'No link - CC will count in totals'
                  : transaction.forwardedMatch
                    ? `Will link to ${transaction.forwardedFromApp} transaction`
                    : `${transaction.forwardedMatchCandidates!.length} potential ${transaction.forwardedFromApp} match(es)`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {forwardedExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
          </button>

          {forwardedExpanded && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 animate-fade-in">
              <p className="text-xs text-slate-500">
                This CC transaction appears to be a {transaction.forwardedFromApp} purchase.
                Select the matching {transaction.forwardedFromApp} transaction to exclude this CC entry from totals.
              </p>

              <div className="space-y-2">
                {transaction.forwardedMatchCandidates!.map((candidate) => (
                  <button
                    key={candidate.id}
                    onClick={() => onSelectForwardedMatch?.(index, candidate.id)}
                    className={`w-full flex justify-between items-start p-3 rounded-lg border ${
                      transaction.forwardedMatch?.id === candidate.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="text-left">
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <span className="font-bold">{candidate.payment}</span>
                        <span>•</span>
                        <span>{candidate.date}</span>
                      </div>
                      <div className="text-base font-bold text-slate-800 mt-1">
                        {candidate.expense || candidate.to}
                      </div>
                      <div className="text-sm text-slate-500">{candidate.to}</div>
                    </div>
                    <div className="text-right flex items-start gap-2">
                      <div>
                        <div className="font-mono font-bold text-slate-700">
                          {formatIDR(candidate.total)}
                        </div>
                        {transaction.forwardedMatch?.id === candidate.id && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700 mt-1">
                            Selected
                          </span>
                        )}
                      </div>
                      {candidate.imageUrl && onViewImage && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewImage(candidate.imageUrl!);
                          }}
                          className="p-2 bg-white rounded-lg border border-slate-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
                        >
                          <Image size={16} className="text-slate-400" />
                        </button>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={() => onToggleSkipForwardedMatch?.(index)}
                className={`w-full py-2 px-4 rounded-lg font-bold text-sm min-h-[44px] ${
                  transaction.skipForwardedMatch
                    ? 'bg-purple-500 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {transaction.skipForwardedMatch ? 'Find Match' : 'Skip / No Match'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Awaiting forwarded match warning (no candidates found) */}
      {hasForwardedFromApp && !hasForwardedCandidates && !isFailed && (
        <div className="flex items-center gap-2 text-xs text-amber-600 font-bold bg-amber-50 p-3 rounded-lg">
          <AlertCircle size={14} />
          <span>
            This CC transaction is from {transaction.forwardedFromApp} but no matching transactions found.
            Upload {transaction.forwardedFromApp} first or this will count in totals.
          </span>
        </div>
      )}

      {/* Reverse CC Match Section - for source apps (Grab/Gojek) finding existing CC transactions */}
      {hasReverseCcCandidates && !isFailed && (
        <div className="space-y-2">
          <button
            onClick={() => setReverseCcExpanded(!reverseCcExpanded)}
            className={`w-full flex items-center justify-between text-xs font-bold p-3 rounded-lg min-h-[44px] ${
              transaction.skipReverseCcMatch
                ? 'bg-slate-100 text-slate-600'
                : transaction.reverseCcMatch
                  ? 'bg-purple-50 text-purple-600'
                  : 'bg-amber-50 text-amber-600'
            }`}
          >
            <div className="flex items-center gap-2">
              <CreditCard size={14} />
              <span>
                {transaction.skipReverseCcMatch
                  ? 'No link - both will count in totals'
                  : transaction.reverseCcMatch
                    ? 'Will link to CC transaction'
                    : `${transaction.reverseCcMatchCandidates!.length} CC transaction(s) found`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {reverseCcExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
          </button>

          {reverseCcExpanded && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 animate-fade-in">
              <p className="text-xs text-slate-500">
                Found existing CC transaction(s) that appear to be forwarded from this app.
                Select a CC transaction to link and exclude the CC entry from totals.
              </p>

              <div className="space-y-2">
                {transaction.reverseCcMatchCandidates!.map((candidate) => (
                  <button
                    key={candidate.id}
                    onClick={() => onSelectReverseCcMatch?.(index, candidate.id)}
                    className={`w-full flex justify-between items-start p-3 rounded-lg border ${
                      transaction.reverseCcMatch?.id === candidate.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="text-left">
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <span className="font-bold">{candidate.payment}</span>
                        <span>•</span>
                        <span>{candidate.date}</span>
                      </div>
                      <div className="text-base font-bold text-slate-800 mt-1">
                        {candidate.expense || candidate.to}
                      </div>
                      <div className="text-sm text-slate-500">{candidate.to}</div>
                    </div>
                    <div className="text-right flex items-start gap-2">
                      <div>
                        <div className="font-mono font-bold text-slate-700">
                          {formatIDR(candidate.total)}
                        </div>
                        {transaction.reverseCcMatch?.id === candidate.id && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700 mt-1">
                            Selected
                          </span>
                        )}
                      </div>
                      {candidate.imageUrl && onViewImage && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewImage(candidate.imageUrl!);
                          }}
                          className="p-2 bg-white rounded-lg border border-slate-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
                        >
                          <Image size={16} className="text-slate-400" />
                        </button>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={() => onToggleSkipReverseCcMatch?.(index)}
                className={`w-full py-2 px-4 rounded-lg font-bold text-sm min-h-[44px] ${
                  transaction.skipReverseCcMatch
                    ? 'bg-purple-500 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {transaction.skipReverseCcMatch ? 'Find Match' : 'Skip / No Match'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
