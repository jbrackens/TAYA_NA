'use client';

import { useEffect, useRef, useCallback } from 'react';
import { PhoenixWebSocketClient } from '@phoenix-ui/api-client';

export interface UseLiveDataConfig {
  channel: string;
  enabled?: boolean;
  onMessage?: (data: Record<string, unknown>) => void;
  onError?: (error: Error) => void;
  token?: string;
}

export const useLiveData = (config: UseLiveDataConfig) => {
  const clientRef = useRef<PhoenixWebSocketClient | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const connect = useCallback(async () => {
    if (!config.enabled) return;

    try {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:18080/ws';
      const client = new PhoenixWebSocketClient({
        url: wsUrl,
        token: config.token,
        reconnectAttempts: 5,
        initialBackoffMs: 1000,
        maxBackoffMs: 30000,
      });

      await client.connect();
      clientRef.current = client;

      unsubscribeRef.current = client.subscribe(config.channel, (message) => {
        config.onMessage?.(message.data);
      });

      client.onError((error) => {
        config.onError?.(error);
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      config.onError?.(err);
    }
  }, [config]);

  const disconnect = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    if (clientRef.current) {
      clientRef.current.close();
      clientRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (config.enabled !== false) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [config.enabled, connect, disconnect]);

  return {
    isConnected: clientRef.current?.isConnected() ?? false,
    disconnect,
  };
};
