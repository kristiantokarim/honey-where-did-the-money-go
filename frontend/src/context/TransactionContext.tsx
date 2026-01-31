import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { transactionService } from '../services/transactions';
import { useToast } from './ToastContext';
import { getMonthRange } from '../utils/format';
import type { Transaction, ParsedTransaction, DashboardItem } from '../types';
import { Category } from '../types/enums';

interface DateFilter {
  start: string;
  end: string;
}

interface LedgerFilters {
  category: Category | '';
  by: string;
}

interface TransactionContextValue {
  // Scan state
  scanData: ParsedTransaction[];
  setScanData: (data: ParsedTransaction[]) => void;

  // History state
  historyData: Transaction[];
  setHistoryData: (data: Transaction[]) => void;
  historyLoading: boolean;
  refreshHistory: () => Promise<void>;

  // Dashboard state
  dashData: DashboardItem[];
  dashLoading: boolean;
  refreshDashboard: () => Promise<void>;

  // Date filter (shared between ledger and dashboard)
  dateFilter: DateFilter;
  setDateFilter: (filter: DateFilter) => void;

  // Ledger filters (category and by)
  ledgerFilters: LedgerFilters;
  setLedgerFilters: (filters: LedgerFilters) => void;
}

const TransactionContext = createContext<TransactionContextValue | null>(null);

export function TransactionProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast();

  // Scan state
  const [scanData, setScanData] = useState<ParsedTransaction[]>([]);

  // History state
  const [historyData, setHistoryData] = useState<Transaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Dashboard state
  const [dashData, setDashData] = useState<DashboardItem[]>([]);
  const [dashLoading, setDashLoading] = useState(false);

  // Date filter
  const [dateFilter, setDateFilter] = useState<DateFilter>(getMonthRange());

  // Ledger filters
  const [ledgerFilters, setLedgerFilters] = useState<LedgerFilters>({
    category: '',
    by: '',
  });

  const refreshHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const data = await transactionService.getHistory(
        dateFilter.start,
        dateFilter.end,
        ledgerFilters.category || undefined,
        ledgerFilters.by || undefined,
      );
      setHistoryData(data);
    } catch (error) {
      console.error('Failed to fetch history:', error);
      showToast('Failed to load transactions', 'error');
    } finally {
      setHistoryLoading(false);
    }
  }, [dateFilter.start, dateFilter.end, ledgerFilters.category, ledgerFilters.by, showToast]);

  const refreshDashboard = useCallback(async () => {
    setDashLoading(true);
    try {
      const data = await transactionService.getDashboard(dateFilter.start, dateFilter.end);
      setDashData(data);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
      showToast('Failed to load dashboard', 'error');
    } finally {
      setDashLoading(false);
    }
  }, [dateFilter.start, dateFilter.end, showToast]);

  return (
    <TransactionContext.Provider
      value={{
        scanData,
        setScanData,
        historyData,
        setHistoryData,
        historyLoading,
        refreshHistory,
        dashData,
        dashLoading,
        refreshDashboard,
        dateFilter,
        setDateFilter,
        ledgerFilters,
        setLedgerFilters,
      }}
    >
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransactionContext() {
  const context = useContext(TransactionContext);
  if (!context) {
    throw new Error('useTransactionContext must be used within a TransactionProvider');
  }
  return context;
}
