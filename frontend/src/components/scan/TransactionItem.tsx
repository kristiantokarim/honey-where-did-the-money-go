import { Trash2, Tag, Store, FolderOpen, XCircle, Copy } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import type { ParsedTransaction } from '../../types';

interface TransactionItemProps {
  transaction: ParsedTransaction;
  index: number;
  onUpdate: (index: number, field: keyof ParsedTransaction, value: string | number) => void;
  onRemove: (index: number) => void;
  onToggleDuplicate: (index: number) => void;
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
}: TransactionItemProps) {
  const { config } = useAppContext();
  const isFailed = isCancelledOrFailed(transaction);

  return (
    <div className={`rounded-[2rem] p-5 border shadow-sm space-y-4 ${
      isFailed ? 'bg-red-50 border-red-200' : 'bg-white border-slate-100'
    }`}>
      <div className="flex justify-between items-center">
        <input
          type="date"
          className="text-sm font-bold bg-slate-50 p-2 rounded-lg min-h-[44px]"
          value={transaction.date}
          onChange={(e) => onUpdate(index, 'date', e.target.value)}
        />
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
    </div>
  );
}
