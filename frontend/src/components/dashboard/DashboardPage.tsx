import { useEffect, useState, useCallback } from 'react';
import { useTransactionContext } from '../../context/TransactionContext';
import { transactionService } from '../../services/transactions';
import { DateFilter } from '../ledger/DateFilter';
import { TotalCard } from './TotalCard';
import { CategoryChart } from './CategoryChart';
import { CategoryTransactionsModal } from './CategoryTransactionsModal';
import type { Transaction } from '../../types';

export function DashboardPage() {
  const { dashData, dashLoading, refreshDashboard, dateFilter } = useTransactionContext();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryTransactions, setCategoryTransactions] = useState<Transaction[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    refreshDashboard();
  }, [refreshDashboard, dateFilter.start, dateFilter.end]);

  const handleCategoryClick = useCallback(
    async (categoryName: string) => {
      setSelectedCategory(categoryName);
      setModalLoading(true);
      try {
        const txs = await transactionService.getHistory(
          dateFilter.start,
          dateFilter.end,
          categoryName,
          undefined,
          'date'
        );
        setCategoryTransactions(txs);
      } catch (error) {
        console.error('Failed to fetch category transactions:', error);
        setCategoryTransactions([]);
      } finally {
        setModalLoading(false);
      }
    },
    [dateFilter.start, dateFilter.end]
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
