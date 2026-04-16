'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import wsService, { type WsMessage } from './websocket-service';
import { ResponseDataManager } from './response-data-manager';

export interface UseWebSocketOptions {
  channels?: string[];
  enabled?: boolean;
}

export interface UseWebSocketReturn {
  isConnected: boolean;
  subscribe: (channel: string) => void;
  unsubscribe: (channel: string) => void;
}

export const useWebSocket = (options: UseWebSocketOptions = {}): UseWebSocketReturn => {
  const { channels = [], enabled = true } = options;
  const dispatch = useDispatch();
  const responseDataManagerRef = useRef<ResponseDataManager | null>(null);
  const messageHandlerRef = useRef<((message: WsMessage) => void) | null>(null);

  // Initialize response data manager and message handler
  useEffect(() => {
    responseDataManagerRef.current = new ResponseDataManager(dispatch);

    messageHandlerRef.current = (message: WsMessage) => {
      if (responseDataManagerRef.current) {
        responseDataManagerRef.current.handleMessage(message);
      }
    };
  }, [dispatch]);

  // Connect to WebSocket and set up listeners
  useEffect(() => {
    if (!enabled) return;

    // Get auth token from localStorage
    const authToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

    // Connect to WebSocket
    wsService.connect(authToken || undefined);

    // Set up global message handler
    if (messageHandlerRef.current) {
      const unsubscribeGlobal = wsService.onAny(messageHandlerRef.current);

      // Subscribe to requested channels
      channels.forEach(channel => {
        wsService.subscribe(channel);
      });

      return () => {
        unsubscribeGlobal();
        channels.forEach(channel => {
          wsService.unsubscribe(channel);
        });
      };
    }

    return () => {
      channels.forEach(channel => {
        wsService.unsubscribe(channel);
      });
    };
  }, [enabled, channels]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Note: We don't disconnect on unmount - the service persists across component lifecycle
      // Only disconnect when explicitly needed in the app
    };
  }, []);

  const subscribe = useCallback((channel: string) => {
    wsService.subscribe(channel);
  }, []);

  const unsubscribe = useCallback((channel: string) => {
    wsService.unsubscribe(channel);
  }, []);

  return {
    isConnected: wsService.isConnected,
    subscribe,
    unsubscribe
  };
};

export default useWebSocket;
