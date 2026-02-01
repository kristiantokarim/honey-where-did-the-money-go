import { api } from './api';
import type { Transaction, DashboardItem } from '../types';
import { Category, PaymentApp, LedgerMode, SortBy } from '../types/enums';

export const transactionService = {
  getHistory: async (
    startDate: string,
    endDate: string,
    category?: Category,
    by?: string,
    sortBy?: SortBy,
    payment?: PaymentApp,
  ): Promise<Transaction[]> => {
    const params: Record<string, string> = { startDate, endDate };
    if (category) params.category = category;
    if (by) params.by = by;
    if (sortBy) params.sortBy = sortBy;
    if (payment) params.payment = payment;

    const response = await api.get<Transaction[]>('/transactions/history', {
      params
    });
    return response.data;
  },

  getDashboard: async (
    startDate: string,
    endDate: string,
    by?: string,
    payment?: PaymentApp,
  ): Promise<DashboardItem[]> => {
    const params: Record<string, string> = { startDate, endDate };
    if (by) params.by = by;
    if (payment) params.payment = payment;

    const response = await api.get<DashboardItem[]>('/transactions/dashboard', {
      params,
    });
    return response.data;
  },

  getLedgerTotal: async (
    startDate: string,
    endDate: string,
    mode: LedgerMode,
    category?: Category,
    by?: string,
    payment?: PaymentApp,
  ): Promise<{ total: number }> => {
    const params: Record<string, string> = { startDate, endDate, mode };
    if (category) params.category = category;
    if (by) params.by = by;
    if (payment) params.payment = payment;

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

  linkForwarded: async (ccTransactionId: number, appTransactionId: number): Promise<void> => {
    await api.post('/transactions/link-forwarded', {
      ccTransactionId,
      appTransactionId,
    });
  },

  unlinkForwarded: async (id: number): Promise<void> => {
    await api.delete(`/transactions/${id}/forwarded-link`);
  },

  findTransferMatch: async (id: number): Promise<{ match: Transaction | null }> => {
    const response = await api.get<{ match: Transaction | null }>(`/transactions/${id}/find-transfer-match`);
    return response.data;
  },

  findForwardedMatch: async (id: number): Promise<{ candidates: Transaction[] }> => {
    const response = await api.get<{ candidates: Transaction[] }>(`/transactions/${id}/find-forwarded-match`);
    return response.data;
  },

  findReverseCcMatch: async (id: number): Promise<{ candidates: Transaction[] }> => {
    const response = await api.get<{ candidates: Transaction[] }>(`/transactions/${id}/find-reverse-cc-match`);
    return response.data;
  },

  linkTransfer: async (id: number, matchedId: number): Promise<void> => {
    await api.post(`/transactions/${id}/link-transfer`, { matchedId });
  },
};
