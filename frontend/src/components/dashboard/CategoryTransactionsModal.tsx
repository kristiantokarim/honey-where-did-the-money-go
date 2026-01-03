import { X } from 'lucide-react';
import { TransactionCard } from '../ledger/TransactionCard';
import { formatIDR } from '../../utils/format';
import type { Transaction } from '../../types';

interface CategoryTransactionsModalProps {
  isOpen: boolean;
  categoryName: string;
  transactions: Transaction[];
  loading: boolean;
  onClose: () => void;
}

export function CategoryTransactionsModal({
  isOpen,
  categoryName,
  transactions,
  loading,
  onClose,
}: CategoryTransactionsModalProps) {
  if (!isOpen) return null;

  const total = transactions.reduce((sum, tx) => sum + tx.total, 0);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h3 className="font-black text-lg text-slate-800 uppercase tracking-wide">
              {categoryName}
            </h3>
            <p className="text-xs text-slate-400 font-mono mt-1">
              {transactions.length} transactions • {formatIDR(total)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-slate-400">Loading...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p className="font-bold">No transactions</p>
              <p className="text-sm mt-1">No transactions in this category</p>
            </div>
          ) : (
            transactions.map((tx) => (
              <TransactionCard key={tx.id} transaction={tx} readonly />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
