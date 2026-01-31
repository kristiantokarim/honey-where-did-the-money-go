import { api } from './api';
import type { Transaction, ParsedTransaction, DashboardItem, ParseResult } from '../types';
import { Category, PaymentApp, TransactionType, LedgerMode, SortBy } from '../types/enums';

export const transactionService = {
  upload: async (file: File, appType?: PaymentApp): Promise<ParseResult> => {
    const formData = new FormData();
    formData.append('file', file);
    if (appType) {
      formData.append('appType', appType);
    }
    const response = await api.post<ParseResult>('/transactions/upload', formData);
    return response.data;
  },

  checkDuplicates: async (
    items: Array<{ date: string; total: number; to: string; expense?: string }>
  ): Promise<Array<{ exists: boolean; matchedId?: number }>> => {
    const response = await api.post<Array<{ exists: boolean; matchedId?: number }>>(
      '/transactions/check-duplicates',
      items
    );
    return response.data;
  },

  checkTransferMatches: async (
    items: Array<{ transactionType: TransactionType; total: number; date: string; payment: PaymentApp }>
  ): Promise<Array<{ index: number; match: Transaction | null }>> => {
    const response = await api.post<Array<{ index: number; match: Transaction | null }>>(
      '/transactions/check-transfer-matches',
      items
    );
    return response.data;
  },

  confirm: async (
    items: ParsedTransaction[]
  ): Promise<{ success: boolean; count: number }> => {
    const response = await api.post<{ success: boolean; count: number }>(
      '/transactions/confirm',
      items
    );
    return response.data;
  },

  getHistory: async (
    startDate: string,
    endDate: string,
    category?: Category,
    by?: string,
    sortBy?: SortBy
  ): Promise<Transaction[]> => {
    const params: Record<string, string> = { startDate, endDate };
    if (category) params.category = category;
    if (by) params.by = by;
    if (sortBy) params.sortBy = sortBy;

    const response = await api.get<Transaction[]>('/transactions/history', {
      params
    });
    return response.data;
  },

  getDashboard: async (
    startDate: string,
    endDate: string
  ): Promise<DashboardItem[]> => {
    const response = await api.get<DashboardItem[]>('/transactions/dashboard', {
      params: { startDate, endDate },
    });
    return response.data;
  },

  getLedgerTotal: async (
    startDate: string,
    endDate: string,
    mode: LedgerMode,
    category?: Category,
    by?: string
  ): Promise<{ total: number }> => {
    const params: Record<string, string> = { startDate, endDate, mode };
    if (category) params.category = category;
    if (by) params.by = by;

    const response = await api.get<{ total: number }>('/transactions/ledger-total', {
      params,
    });
    return response.data;
  },

  update: async (
    id: number,
    data: Partial<Transaction>
  ): Promise<Transaction> => {
    const response = await api.put<Transaction>(`/transactions/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/transactions/${id}`);
  },

  unlinkTransfer: async (id: number): Promise<void> => {
    await api.delete(`/transactions/${id}/link`);
  },
};
