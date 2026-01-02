import { Save } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import type { Transaction } from '../../types';

interface TransactionEditFormProps {
  transaction: Transaction;
  onChange: (field: keyof Transaction, value: Transaction[keyof Transaction]) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function TransactionEditForm({
  transaction,
  onChange,
  onSave,
  onCancel,
}: TransactionEditFormProps) {
  const { config } = useAppContext();
  const tx = transaction;

  return (
    <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
      <div className="space-y-3">
        <div className="flex gap-2">
          <input
            className="flex-1 font-bold bg-slate-50 p-3 rounded-lg min-h-[48px]"
            style={{ fontSize: '16px' }}
            type="date"
            value={tx.date}
            onChange={(e) => onChange('date', e.target.value)}
          />
          <select
            className="flex-1 font-bold bg-slate-50 p-3 rounded-lg min-h-[48px]"
            style={{ fontSize: '16px' }}
            value={tx.category}
            onChange={(e) => onChange('category', e.target.value)}
          >
            {config?.categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center text-2xl font-mono font-bold bg-slate-50 p-3 rounded-xl min-h-[48px]">
          <span className="text-sm text-slate-300 mr-2">Rp</span>
          <input
            className="w-full bg-transparent outline-none"
            style={{ fontSize: '24px' }}
            type="number"
            inputMode="numeric"
            value={tx.total}
            onChange={(e) => onChange('total', Number(e.target.value))}
          />
        </div>

        <input
          className="w-full font-bold bg-slate-50 p-3 rounded-xl outline-none min-h-[48px]"
          style={{ fontSize: '16px' }}
          placeholder="Expense Name"
          value={tx.expense}
          onChange={(e) => onChange('expense', e.target.value)}
        />

        <input
          className="w-full font-bold bg-slate-50 p-3 rounded-xl outline-none min-h-[48px]"
          style={{ fontSize: '16px' }}
          placeholder="To (Merchant)"
          value={tx.to}
          onChange={(e) => onChange('to', e.target.value)}
        />

        <div className="flex gap-2">
          <select
            className="flex-1 font-bold bg-slate-50 p-3 rounded-xl min-h-[48px]"
            style={{ fontSize: '16px' }}
            value={tx.payment}
            onChange={(e) => onChange('payment', e.target.value)}
          >
            {config?.paymentMethods.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
          <select
            className="flex-1 font-bold bg-slate-50 p-3 rounded-xl min-h-[48px]"
            style={{ fontSize: '16px' }}
            value={tx.by}
            onChange={(e) => onChange('by', e.target.value)}
          >
            {config?.users.map((user) => (
              <option key={user} value={user}>
                {user}
              </option>
            ))}
          </select>
        </div>

        <textarea
          className="w-full bg-slate-50 p-3 rounded-xl outline-none min-h-[80px]"
          style={{ fontSize: '16px' }}
          placeholder="Remarks"
          value={tx.remarks || ''}
          onChange={(e) => onChange('remarks', e.target.value)}
        />

        <div className="flex gap-2 pt-2">
          <button
            onClick={onSave}
            className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 min-h-[48px]"
          >
            <Save size={16} /> Save
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-slate-200 font-bold py-3 rounded-xl min-h-[48px]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
