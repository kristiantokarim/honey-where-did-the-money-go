import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';
import { transactionService } from '../services/transactions';
import { useToast } from './ToastContext';
import { getMonthRange } from '../utils/format';
import type { Transaction, ParsedTransaction, DashboardItem } from '../types';
import { Category, PaymentApp } from '../types/enums';

interface DateFilter {
  start: string;
  end: string;
}

interface LedgerFilters {
  category: Category | '';
  by: string;
  payment: PaymentApp | '';
}

interface DashboardFilters {
  by: string;
  payment: PaymentApp | '';
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

  // Ledger filters (category, by, payment)
  ledgerFilters: LedgerFilters;
  setLedgerFilters: (filters: LedgerFilters) => void;

  // Dashboard filters (by, payment)
  dashboardFilters: DashboardFilters;
  setDashboardFilters: (filters: DashboardFilters) => void;
}

const TransactionContext = createContext<TransactionContextValue | null>(null);

export function TransactionProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast();

  // Scan state
  const [scanData, setScanData] = useState<ParsedTransaction[]>([]);

  // History state
  const [historyData, setHistoryData] = useState<Transaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const historyAbortRef = useRef<AbortController | null>(null);

  // Dashboard state
  const [dashData, setDashData] = useState<DashboardItem[]>([]);
  const [dashLoading, setDashLoading] = useState(false);
  const dashboardAbortRef = useRef<AbortController | null>(null);

  // Date filter
  const [dateFilter, setDateFilter] = useState<DateFilter>(getMonthRange());

  // Ledger filters
  const [ledgerFilters, setLedgerFilters] = useState<LedgerFilters>({
    category: '',
    by: '',
    payment: '',
  });

  // Dashboard filters
  const [dashboardFilters, setDashboardFilters] = useState<DashboardFilters>({
    by: '',
    payment: '',
  });

  const refreshHistory = useCallback(async () => {
    historyAbortRef.current?.abort();
    const controller = new AbortController();
    historyAbortRef.current = controller;

    setHistoryLoading(true);
    try {
      const data = await transactionService.getHistory(
        dateFilter.start,
        dateFilter.end,
        ledgerFilters.category || undefined,
        ledgerFilters.by || undefined,
        undefined,
        ledgerFilters.payment || undefined,
        controller.signal,
      );
      setHistoryData(data);
    } catch (error) {
      if (error instanceof Error && error.name === 'CanceledError') {
        return;
      }
      console.error('Failed to fetch history:', error);
      showToast('Failed to load transactions', 'error');
    } finally {
      setHistoryLoading(false);
    }
  }, [dateFilter.start, dateFilter.end, ledgerFilters.category, ledgerFilters.by, ledgerFilters.payment, showToast]);

  const refreshDashboard = useCallback(async () => {
    dashboardAbortRef.current?.abort();
    const controller = new AbortController();
    dashboardAbortRef.current = controller;

    setDashLoading(true);
    try {
      const data = await transactionService.getDashboard(
        dateFilter.start,
        dateFilter.end,
        dashboardFilters.by || undefined,
        dashboardFilters.payment || undefined,
        controller.signal,
      );
      setDashData(data);
    } catch (error) {
      if (error instanceof Error && error.name === 'CanceledError') {
        return;
      }
      console.error('Failed to fetch dashboard:', error);
      showToast('Failed to load dashboard', 'error');
    } finally {
      setDashLoading(false);
    }
  }, [dateFilter.start, dateFilter.end, dashboardFilters.by, dashboardFilters.payment, showToast]);

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
        dashboardFilters,
        setDashboardFilters,
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
