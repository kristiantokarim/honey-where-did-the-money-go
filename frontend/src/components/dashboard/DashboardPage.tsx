import { useEffect } from 'react';
import { useTransactionContext } from '../../context/TransactionContext';
import { DateFilter } from '../ledger/DateFilter';
import { TotalCard } from './TotalCard';
import { CategoryChart } from './CategoryChart';

export function DashboardPage() {
  const { dashData, dashLoading, refreshDashboard, dateFilter } = useTransactionContext();

  useEffect(() => {
    refreshDashboard();
  }, [refreshDashboard, dateFilter.start, dateFilter.end]);

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
      <CategoryChart data={dashData} />
    </div>
  );
}
