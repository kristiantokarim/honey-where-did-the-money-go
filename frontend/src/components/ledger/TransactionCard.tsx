import { useState } from 'react';
import { Edit3, Ban, Trash2, Image, Link2, ChevronDown, ChevronUp } from 'lucide-react';
import { formatIDR, formatDate } from '../../utils/format';
import { getTypeBadge } from '../../utils/transactionBadge';
import type { Transaction } from '../../types';

interface TransactionCardProps {
  transaction: Transaction;
  linkedTransaction?: Transaction;
  onEdit?: () => void;
  onToggleExclude?: () => void;
  onDelete?: () => void;
  onViewImage?: () => void;
  onUnlink?: () => void;
  onViewLinkedImage?: () => void;
  readonly?: boolean;
}

function getCardClassName(isExcluded: boolean, isLinked: boolean): string {
  if (isExcluded) return 'border-red-100 bg-red-50/20 grayscale';
  if (isLinked) return 'border-blue-100 bg-blue-50/20';
  return 'border-slate-100 shadow-sm';
}

export function TransactionCard({
  transaction,
  linkedTransaction,
  onEdit,
  onToggleExclude,
  onDelete,
  onViewImage,
  onUnlink,
  onViewLinkedImage,
  readonly,
}: TransactionCardProps) {
  const tx = transaction;
  const typeBadge = getTypeBadge(tx.transactionType);
  const isLinked = !!tx.linkedTransferId;
  const [linkExpanded, setLinkExpanded] = useState(false);

  return (
    <div
      className={`bg-white p-5 rounded-[2rem] border transition-all ${getCardClassName(!!tx.isExcluded, isLinked)}`}
    >
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1 flex-wrap">
              {formatDate(tx.date)}
              {tx.isExcluded && <span className="text-red-500">• EXCLUDED</span>}
              {typeBadge && (
                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${typeBadge.bgColor} ${typeBadge.textColor}`}>
                  <typeBadge.icon size={10} />
                  {typeBadge.label}
                </span>
              )}
              {isLinked && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 text-blue-700">
                  <Link2 size={10} />
                  Matched
                </span>
              )}
            </p>
            <h3 className="font-bold text-slate-800 leading-tight">{tx.expense}</h3>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              {tx.to} •{' '}
              <span className="text-blue-500 uppercase font-black text-[9px]">
                {tx.category}
              </span>
            </p>
          </div>
          <div className="text-right">
            <p
              className={`font-mono font-bold tracking-tighter ${
                tx.isExcluded ? 'text-slate-400 line-through' : 'text-slate-900'
              }`}
            >
              {formatIDR(tx.total)}
            </p>
            {!readonly && (
              <div className="flex justify-end gap-1 mt-2 items-center">
                {tx.imageUrl && onViewImage && (
                  <button
                    onClick={onViewImage}
                    className="text-slate-300 hover:text-blue-500 p-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
                  >
                    <Image size={14} />
                  </button>
                )}
                <button
                  onClick={onEdit}
                  className="text-slate-300 hover:text-blue-500 p-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  onClick={onToggleExclude}
                  className={`${
                    tx.isExcluded ? 'text-red-500' : 'text-slate-300'
                  } hover:text-red-400 p-1 min-w-[44px] min-h-[44px] flex items-center justify-center`}
                >
                  <Ban size={14} />
                </button>
                <button
                  onClick={onDelete}
                  className="text-slate-300 hover:text-red-500 p-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <Trash2 size={14} />
                </button>
                {isLinked && onUnlink && (
                  <button
                    onClick={onUnlink}
                    className="text-blue-400 hover:text-blue-600 p-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    title="Unlink transfer"
                  >
                    <Link2 size={14} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center mt-1">
          <p className="text-[9px] font-black text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded uppercase">
            {tx.by} • {tx.payment}
          </p>
        </div>

        {tx.remarks && (
          <p className="text-[10px] text-slate-400 italic bg-slate-50/50 p-2 rounded-lg mt-1">
            "{tx.remarks}"
          </p>
        )}

        {/* Expandable Linked Transaction */}
        {isLinked && linkedTransaction && (
          <div className="mt-2">
            <button
              onClick={() => setLinkExpanded(!linkExpanded)}
              className="w-full flex items-center justify-between text-xs font-bold p-2 rounded-lg bg-blue-50 text-blue-600 min-h-[36px]"
            >
              <div className="flex items-center gap-2">
                <Link2 size={12} />
                <span>Linked with {linkedTransaction.payment} transaction</span>
              </div>
              {linkExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {linkExpanded && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mt-2 space-y-2 animate-fade-in">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 flex-wrap">
                      {formatDate(linkedTransaction.date)}
                      {linkedTransaction.transactionType && getTypeBadge(linkedTransaction.transactionType) && (
                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${getTypeBadge(linkedTransaction.transactionType)!.bgColor} ${getTypeBadge(linkedTransaction.transactionType)!.textColor}`}>
                          {(() => {
                            const badge = getTypeBadge(linkedTransaction.transactionType);
                            const Icon = badge!.icon;
                            return <><Icon size={10} />{badge!.label}</>;
                          })()}
                        </span>
                      )}
                    </p>
                    <h4 className="font-bold text-slate-700 text-sm mt-1">{linkedTransaction.expense}</h4>
                    <p className="text-[10px] text-slate-500">{linkedTransaction.to}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-slate-700 text-sm">
                      {formatIDR(linkedTransaction.total)}
                    </p>
                    {linkedTransaction.imageUrl && onViewLinkedImage && (
                      <button
                        onClick={onViewLinkedImage}
                        className="text-slate-400 hover:text-blue-500 p-1 mt-1"
                      >
                        <Image size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-[9px] font-black text-slate-400 bg-white px-1.5 py-0.5 rounded inline-block">
                  {linkedTransaction.by} • {linkedTransaction.payment}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
