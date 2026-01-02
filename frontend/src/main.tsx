import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { AppProvider } from './context/AppContext';
import { TransactionProvider } from './context/TransactionContext';
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
    <AppProvider>
      <TransactionProvider>
        <RouterProvider router={router} />
      </TransactionProvider>
    </AppProvider>
  </StrictMode>
);
