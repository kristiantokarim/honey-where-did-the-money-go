import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { configService } from '../services/config';
import { useToast } from './ToastContext';
import type { AppConfig } from '../types';

interface AppContextValue {
  config: AppConfig | null;
  configLoading: boolean;
  configError: boolean;
  defaultUser: string;
  setDefaultUser: (user: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState(false);
  const [defaultUser, setDefaultUser] = useState('');
  const { showToast } = useToast();

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const data = await configService.getConfig();
        setConfig(data);
        if (data.users.length > 0) {
          setDefaultUser(data.users[0]);
        }
      } catch (error) {
        console.error('Failed to load config:', error);
        setConfigError(true);
        showToast('Failed to connect to server', 'error');
      } finally {
        setConfigLoading(false);
      }
    };

    loadConfig();
  }, [showToast]);

  return (
    <AppContext.Provider
      value={{
        config,
        configLoading,
        configError,
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
