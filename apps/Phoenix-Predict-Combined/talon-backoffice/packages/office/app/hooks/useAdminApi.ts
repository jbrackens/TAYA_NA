'use client';

import { useState, useCallback } from 'react';

interface UseAdminApiState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

interface UseAdminApiOptions {
  baseUrl?: string;
}

export function useAdminApi<T = any>(options: UseAdminApiOptions = {}) {
  const [state, setState] = useState<UseAdminApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const baseUrl = options.baseUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

  const request = useCallback(
    async (
      endpoint: string,
      method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET',
      body?: Record<string, any>,
    ): Promise<T | null> => {
      setState({ data: null, loading: true, error: null });

      try {
        const options: RequestInit = {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
        };

        if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
          options.body = JSON.stringify(body);
        }

        const response = await fetch(`${baseUrl}${endpoint}`, options);

        if (!response.ok) {
          throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        setState({ data, loading: false, error: null });
        return data;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        setState({ data: null, loading: false, error: err });
        return null;
      }
    },
    [baseUrl],
  );

  const get = useCallback((endpoint: string) => request(endpoint, 'GET'), [request]);
  const post = useCallback((endpoint: string, body: any) => request(endpoint, 'POST', body), [request]);
  const put = useCallback((endpoint: string, body: any) => request(endpoint, 'PUT', body), [request]);
  const patch = useCallback((endpoint: string, body: any) => request(endpoint, 'PATCH', body), [request]);
  const del = useCallback((endpoint: string) => request(endpoint, 'DELETE'), [request]);

  return {
    ...state,
    request,
    get,
    post,
    put,
    patch,
    delete: del,
  };
}
