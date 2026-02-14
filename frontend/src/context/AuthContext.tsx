import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { authService, type AuthUser, type AuthResponse } from '../services/auth';
import { setApiAuthProvider, setApiUnauthorizedHandler } from '../services/api';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<string>;
  logout: () => Promise<void>;
  getAccessToken: () => string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const accessTokenRef = useRef<string | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAuth = useCallback(() => {
    setUser(null);
    accessTokenRef.current = null;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const setTokens = useCallback((response: AuthResponse) => {
    accessTokenRef.current = response.accessToken;
    localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
    setUser(response.user);
  }, []);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
    // Refresh 1 minute before expiry (14 min for 15 min tokens)
    refreshTimerRef.current = setTimeout(async () => {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (!refreshToken) return;
      try {
        const response = await authService.refresh(refreshToken);
        setTokens(response);
        scheduleRefresh();
      } catch {
        clearAuth();
      }
    }, 14 * 60 * 1000);
  }, [setTokens, clearAuth]);

  const getAccessToken = useCallback(() => {
    return accessTokenRef.current || localStorage.getItem(ACCESS_TOKEN_KEY);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await authService.login(email, password);
    setTokens(response);
    scheduleRefresh();
  }, [setTokens, scheduleRefresh]);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const result = await authService.register(email, password, name);
    return result.message;
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (refreshToken) {
      try {
        await authService.logout(refreshToken);
      } catch {
        // Ignore logout errors
      }
    }
    clearAuth();
  }, [clearAuth]);

  // Wire up API interceptors
  useEffect(() => {
    setApiAuthProvider(getAccessToken);
    setApiUnauthorizedHandler(() => clearAuth());
  }, [getAccessToken, clearAuth]);

  // Try to restore session on mount
  useEffect(() => {
    const init = async () => {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (!refreshToken) {
        setIsLoading(false);
        return;
      }
      try {
        const response = await authService.refresh(refreshToken);
        setTokens(response);
        scheduleRefresh();
      } catch {
        clearAuth();
      } finally {
        setIsLoading(false);
      }
    };
    init();
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        getAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
