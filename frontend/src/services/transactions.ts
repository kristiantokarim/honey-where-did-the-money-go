import { api } from './api';
import type { Transaction, ParsedTransaction, DashboardItem, ParseResult } from '../types';

export const transactionService = {
  upload: async (file: File): Promise<ParseResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<ParseResult>('/transactions/upload', formData);
    return response.data;
  },

  checkDuplicates: async (
    items: Array<{ date: string; total: number; to: string }>
  ): Promise<Array<{ exists: boolean }>> => {
    const response = await api.post<Array<{ exists: boolean }>>(
      '/transactions/check-duplicates',
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
    endDate: string
  ): Promise<Transaction[]> => {
    const response = await api.get<Transaction[]>('/transactions/history', {
      params: { startDate, endDate },
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
};
