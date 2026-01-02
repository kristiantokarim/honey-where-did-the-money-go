import { Trash2, Tag, Store } from 'lucide-react';
import type { ParsedTransaction } from '../../types';

interface TransactionItemProps {
  transaction: ParsedTransaction;
  index: number;
  onUpdate: (index: number, field: keyof ParsedTransaction, value: string | number) => void;
  onRemove: (index: number) => void;
}

export function TransactionItem({
  transaction,
  index,
  onUpdate,
  onRemove,
}: TransactionItemProps) {
  return (
    <div className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm space-y-4">
      <div className="flex justify-between items-center">
        <input
          type="date"
          className="text-xs font-bold bg-slate-50 p-2 rounded-lg min-h-[44px]"
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
      </div>

      {transaction.isDuplicate && (
        <div className="text-xs text-orange-600 font-bold bg-orange-50 p-2 rounded-lg">
          ⚠️ Duplicate - will be skipped
        </div>
      )}
    </div>
  );
}
