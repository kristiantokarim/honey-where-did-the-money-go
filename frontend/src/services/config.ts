import { api } from './api';
import type { AppConfig } from '../types';

export const configService = {
  getConfig: async (): Promise<AppConfig> => {
    const response = await api.get<AppConfig>('/config');
    return response.data;
  },
};
