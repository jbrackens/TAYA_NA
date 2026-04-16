'use client';

import { useState, useCallback } from 'react';
import { PhoenixApiClient } from '@phoenix-ui/api-client';

export interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export const useApi = <T,>(apiClient: PhoenixApiClient) => {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const request = useCallback(
    async (fn: (client: PhoenixApiClient) => Promise<T>) => {
      setState({ data: null, loading: true, error: null });
      try {
        const result = await fn(apiClient);
        setState({ data: result, loading: false, error: null });
        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        setState({ data: null, loading: false, error: err });
        throw err;
      }
    },
    [apiClient]
  );

  return {
    ...state,
    request,
  };
};
