import { Edit3, Ban, Trash2, Image } from 'lucide-react';
import { formatIDR, formatDate } from '../../utils/format';
import type { Transaction } from '../../types';

interface TransactionCardProps {
  transaction: Transaction;
  onEdit: () => void;
  onToggleExclude: () => void;
  onDelete: () => void;
  onViewImage?: () => void;
}

export function TransactionCard({
  transaction,
  onEdit,
  onToggleExclude,
  onDelete,
  onViewImage,
}: TransactionCardProps) {
  const tx = transaction;

  return (
    <div
      className={`bg-white p-5 rounded-[2rem] border transition-all ${
        tx.isExcluded
          ? 'border-red-100 bg-red-50/20 grayscale'
          : 'border-slate-100 shadow-sm'
      }`}
    >
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
              {formatDate(tx.date)}
              {tx.isExcluded && <span className="text-red-500">• EXCLUDED</span>}
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
            </div>
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
      </div>
    </div>
  );
}
