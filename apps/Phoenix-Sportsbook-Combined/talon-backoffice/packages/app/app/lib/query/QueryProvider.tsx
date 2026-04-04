'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const DEFAULT_OPTIONS = {
  queries: {
    /** How long fetched data stays "fresh" before refetching on mount (5 min) */
    staleTime: 5 * 60 * 1000,
    /** Keep unused cache entries for 10 min before garbage-collecting */
    gcTime: 10 * 60 * 1000,
    /** Retry failed requests once */
    retry: 1,
    /** Refetch when window regains focus */
    refetchOnWindowFocus: true,
  },
};

interface QueryProviderProps {
  children: React.ReactNode;
}

/**
 * App-wide React Query provider.
 * Uses `useState` so each SSR request gets its own client (no cross-request leakage).
 */
export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: DEFAULT_OPTIONS }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

export default QueryProvider;
