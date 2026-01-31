import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { formatIDR, formatDate } from '../../utils/format';
import type { Transaction } from '../../types';

interface RelinkDialogProps {
  isOpen: boolean;
  title: string;
  candidates: Transaction[];
  onSelect: (id: number) => void;
  onCancel: () => void;
}

export function RelinkDialog({
  isOpen,
  title,
  candidates,
  onSelect,
  onCancel,
}: RelinkDialogProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (selectedId !== null) {
      onSelect(selectedId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-bold text-lg text-slate-800">{title}</h2>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {candidates.length === 0 ? (
            <p className="text-center text-slate-400 py-8">No matches found</p>
          ) : (
            candidates.map((tx) => (
              <button
                key={tx.id}
                onClick={() => setSelectedId(tx.id)}
                className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                  selectedId === tx.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-100 hover:border-slate-200'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {formatDate(tx.date)}
                    </p>
                    <h4 className="font-bold text-slate-800 mt-1">{tx.expense}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">{tx.to}</p>
                    <p className="text-[9px] font-black text-slate-400 mt-1">
                      {tx.by} • {tx.payment}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-slate-800">
                      {formatIDR(tx.total)}
                    </p>
                    {selectedId === tx.id && (
                      <div className="mt-2 text-blue-500">
                        <Check size={16} />
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="p-4 border-t flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors min-h-[48px]"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedId === null}
            className="flex-1 py-3 rounded-xl font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[48px]"
          >
            Link
          </button>
        </div>
      </div>
    </div>
  );
}
