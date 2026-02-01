import { api } from './api';
import type {
  ScanSession,
  PageReview,
  ConfirmPageResponse,
  RetryParseResponse,
  ParsedTransaction,
} from '../types';
import { PaymentApp } from '../types/enums';

export const scanSessionService = {
  createSession: async (
    files: File[],
    defaultUser: string,
    appTypes?: PaymentApp[],
  ): Promise<ScanSession> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    formData.append('defaultUser', defaultUser);
    if (appTypes) {
      appTypes.forEach((appType) => {
        formData.append('appTypes[]', appType);
      });
    }
    const response = await api.post<ScanSession>('/scan/sessions', formData);
    return response.data;
  },

  getSession: async (sessionId: string): Promise<ScanSession> => {
    const response = await api.get<ScanSession>(`/scan/sessions/${sessionId}`);
    return response.data;
  },

  getActiveSession: async (userId: string): Promise<ScanSession | null> => {
    const response = await api.get<ScanSession | null>('/scan/sessions/active', {
      params: { user: userId },
    });
    return response.data;
  },

  getPageForReview: async (
    sessionId: string,
    pageIndex: number,
  ): Promise<PageReview> => {
    const response = await api.get<PageReview>(
      `/scan/sessions/${sessionId}/pages/${pageIndex}`,
    );
    return response.data;
  },

  confirmPage: async (
    sessionId: string,
    pageIndex: number,
    transactions: ParsedTransaction[],
  ): Promise<ConfirmPageResponse> => {
    const response = await api.post<ConfirmPageResponse>(
      `/scan/sessions/${sessionId}/pages/${pageIndex}/confirm`,
      { transactions },
    );
    return response.data;
  },

  retryParse: async (sessionId: string): Promise<RetryParseResponse> => {
    const response = await api.post<RetryParseResponse>(
      `/scan/sessions/${sessionId}/retry-parse`,
    );
    return response.data;
  },

  cancelSession: async (sessionId: string): Promise<void> => {
    await api.delete(`/scan/sessions/${sessionId}`);
  },
};
