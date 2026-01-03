import { ArrowRight } from 'lucide-react';
import { useTransactionContext } from '../../context/TransactionContext';
import { useAppContext } from '../../context/AppContext';

export function LedgerFilters() {
  const { dateFilter, setDateFilter, ledgerFilters, setLedgerFilters } = useTransactionContext();
  const { config } = useAppContext();

  return (
    <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 mb-4 sticky top-[72px] z-20 space-y-3">
      <div className="flex items-center gap-2">
        <input
          type="date"
          className="flex-1 font-bold bg-slate-50 rounded-xl p-2.5 outline-none min-h-[44px]"
          style={{ fontSize: '16px' }}
          value={dateFilter.start}
          onChange={(e) => setDateFilter({ ...dateFilter, start: e.target.value })}
        />
        <ArrowRight size={14} className="text-slate-300" />
        <input
          type="date"
          className="flex-1 font-bold bg-slate-50 rounded-xl p-2.5 outline-none min-h-[44px]"
          style={{ fontSize: '16px' }}
          value={dateFilter.end}
          onChange={(e) => setDateFilter({ ...dateFilter, end: e.target.value })}
        />
      </div>
      <div className="flex items-center gap-2">
        <select
          className="flex-1 font-bold bg-slate-50 rounded-xl p-2.5 outline-none min-h-[44px]"
          style={{ fontSize: '16px' }}
          value={ledgerFilters.category}
          onChange={(e) => setLedgerFilters({ ...ledgerFilters, category: e.target.value })}
        >
          <option value="">All Categories</option>
          {config?.categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <select
          className="flex-1 font-bold bg-slate-50 rounded-xl p-2.5 outline-none min-h-[44px]"
          style={{ fontSize: '16px' }}
          value={ledgerFilters.by}
          onChange={(e) => setLedgerFilters({ ...ledgerFilters, by: e.target.value })}
        >
          <option value="">All Users</option>
          {config?.users.map((user) => (
            <option key={user} value={user}>
              {user}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
