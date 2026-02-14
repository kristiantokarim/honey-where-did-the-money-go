import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { AuthProvider } from './context/AuthContext';
import { HouseholdProvider } from './context/HouseholdContext';
import { AppProvider } from './context/AppContext';
import { TransactionProvider } from './context/TransactionContext';
import { ToastProvider } from './context/ToastContext';
import { ScanSessionProvider } from './context/ScanSessionContext';
import { ToastContainer } from './components/ui/Toast';
import { routeTree } from './routeTree.gen';
import './index.css';

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <AuthProvider>
        <HouseholdProvider>
          <AppProvider>
            <TransactionProvider>
              <ScanSessionProvider>
                <RouterProvider router={router} />
              </ScanSessionProvider>
            </TransactionProvider>
          </AppProvider>
        </HouseholdProvider>
      </AuthProvider>
      <ToastContainer />
    </ToastProvider>
  </StrictMode>
);
