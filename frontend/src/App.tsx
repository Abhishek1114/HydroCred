
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WalletProvider } from './contexts/WalletContext';
import { ToastProvider } from './components/ui/toast';
import AppRoutes from './components/AppRoutes';
import './index.css';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <WalletProvider>
          <ToastProvider>
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
              <AppRoutes />
            </div>
          </ToastProvider>
        </WalletProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;