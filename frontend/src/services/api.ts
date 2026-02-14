import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://192.168.1.10:3000',
  headers: {
    skip_zrok_interstitial: 1,
  },
});

// These are set by the contexts after initialization
let getAccessTokenFn: (() => string | null) | null = null;
let getHouseholdIdFn: (() => string | null) | null = null;
let onUnauthorizedFn: (() => void) | null = null;

export function setApiAuthProvider(fn: () => string | null) {
  getAccessTokenFn = fn;
}

export function setApiHouseholdProvider(fn: () => string | null) {
  getHouseholdIdFn = fn;
}

export function setApiUnauthorizedHandler(fn: () => void) {
  onUnauthorizedFn = fn;
}

api.interceptors.request.use((config) => {
  const token = getAccessTokenFn?.();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const householdId = getHouseholdIdFn?.();
  if (householdId) {
    config.headers['X-Household-Id'] = householdId;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      onUnauthorizedFn?.();
    }
    return Promise.reject(error);
  },
);
