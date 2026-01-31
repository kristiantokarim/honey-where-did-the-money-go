import { useEffect, useState, useCallback } from 'react';
import { useTransactionContext } from '../../context/TransactionContext';
import { useAppContext } from '../../context/AppContext';
import { transactionService } from '../../services/transactions';
import { DateFilter } from '../ledger/DateFilter';
import { TotalCard } from './TotalCard';
import { CategoryChart } from './CategoryChart';
import { CategoryTransactionsModal } from './CategoryTransactionsModal';
import { Category, PaymentApp } from '../../types/enums';
import type { Transaction } from '../../types';

export function DashboardPage() {
  const { dashData, dashLoading, refreshDashboard, dateFilter, dashboardFilters, setDashboardFilters } = useTransactionContext();
  const { config } = useAppContext();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryTransactions, setCategoryTransactions] = useState<Transaction[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    refreshDashboard();
  }, [refreshDashboard, dateFilter.start, dateFilter.end, dashboardFilters.by, dashboardFilters.payment]);

  const handleCategoryClick = useCallback(
    async (categoryName: string) => {
      setSelectedCategory(categoryName);
      setModalLoading(true);
      try {
        const txs = await transactionService.getHistory(
          dateFilter.start,
          dateFilter.end,
          categoryName as Category,
          dashboardFilters.by || undefined,
          undefined,
          dashboardFilters.payment || undefined
        );
        setCategoryTransactions(txs);
      } catch (error) {
        console.error('Failed to fetch category transactions:', error);
        setCategoryTransactions([]);
      } finally {
        setModalLoading(false);
      }
    },
    [dateFilter.start, dateFilter.end, dashboardFilters.by, dashboardFilters.payment]
  );

  const handleCloseModal = useCallback(() => {
    setSelectedCategory(null);
    setCategoryTransactions([]);
  }, []);

  const total = dashData.reduce((sum, cat) => sum + cat.total, 0);

  if (dashLoading && dashData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DateFilter />
      <div className="flex items-center gap-2">
        <select
          className="flex-1 font-bold bg-white rounded-xl p-2.5 outline-none min-h-[44px] border border-slate-100"
          style={{ fontSize: '16px' }}
          value={dashboardFilters.by}
          onChange={(e) => setDashboardFilters({ ...dashboardFilters, by: e.target.value })}
        >
          <option value="">All Users</option>
          {config?.users.map((user) => (
            <option key={user} value={user}>
              {user}
            </option>
          ))}
        </select>
        <select
          className="flex-1 font-bold bg-white rounded-xl p-2.5 outline-none min-h-[44px] border border-slate-100"
          style={{ fontSize: '16px' }}
          value={dashboardFilters.payment}
          onChange={(e) => setDashboardFilters({ ...dashboardFilters, payment: e.target.value as PaymentApp | '' })}
        >
          <option value="">All Payment Apps</option>
          {config?.paymentMethods.map((pm) => (
            <option key={pm} value={pm}>
              {pm}
            </option>
          ))}
        </select>
      </div>
      <TotalCard total={total} />
      <CategoryChart data={dashData} onCategoryClick={handleCategoryClick} />
      <CategoryTransactionsModal
        isOpen={selectedCategory !== null}
        categoryName={selectedCategory || ''}
        transactions={categoryTransactions}
        loading={modalLoading}
        onClose={handleCloseModal}
      />
    </div>
  );
}
