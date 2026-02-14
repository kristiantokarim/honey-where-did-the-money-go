import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { configService } from '../services/config';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';
import { useHousehold } from './HouseholdContext';
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
  const { isAuthenticated, user } = useAuth();
  const { activeHouseholdId } = useHousehold();

  const loadConfig = useCallback(async () => {
    if (!isAuthenticated || !activeHouseholdId) {
      setConfigLoading(false);
      return;
    }

    setConfigLoading(true);
    setConfigError(false);
    try {
      const data = await configService.getConfig();
      setConfig(data);
      // Default to the authenticated user's name if available in the member list
      const currentUserName = data.users.find((u) => u === user?.name);
      if (currentUserName) {
        setDefaultUser(currentUserName);
      } else if (data.users.length > 0) {
        setDefaultUser(data.users[0]);
      }
    } catch (error) {
      console.error('Failed to load config:', error);
      setConfigError(true);
      showToast('Failed to connect to server', 'error');
    } finally {
      setConfigLoading(false);
    }
  }, [isAuthenticated, activeHouseholdId, user?.name, showToast]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

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
