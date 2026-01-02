import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { configService } from '../services/config';
import type { AppConfig } from '../types';

interface AppContextValue {
  config: AppConfig | null;
  configLoading: boolean;
  defaultUser: string;
  setDefaultUser: (user: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

// Default config as fallback
const DEFAULT_CONFIG: AppConfig = {
  categories: ['Food', 'Transport', 'Wifi', 'Insurance', 'Rent', 'Top-up', 'Bills', 'Others'],
  users: ['Kris', 'Iven'],
  paymentMethods: ['Gojek', 'OVO', 'BCA', 'Grab'],
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [defaultUser, setDefaultUser] = useState('Kris');

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const data = await configService.getConfig();
        setConfig(data);
        if (data.users.length > 0) {
          setDefaultUser(data.users[0]);
        }
      } catch (error) {
        console.warn('Failed to load config, using defaults:', error);
        setConfig(DEFAULT_CONFIG);
      } finally {
        setConfigLoading(false);
      }
    };

    loadConfig();
  }, []);

  return (
    <AppContext.Provider
      value={{
        config: config || DEFAULT_CONFIG,
        configLoading,
        defaultUser,
        setDefaultUser,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
