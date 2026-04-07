'use client';

import { logger } from '../logger';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:18080/ws';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';
const MAX_RECONNECT_ATTEMPTS = 5;
const HEARTBEAT_INTERVAL = 50000; // 50 seconds
const POLL_INTERVAL = 5000; // 5 seconds — fallback polling rate

export type WsEventType = 'subscribe' | 'unsubscribe' | 'subscribe:success' | 'unsubscribe:success' | 'update' | 'error';

export interface WsMessage {
  event: WsEventType;
  channel: string;
  data?: Record<string, unknown>;
  correlationId?: string;
}

export type MessageHandler = (message: WsMessage) => void;

/**
 * Channel → REST endpoint mapping for polling fallback.
 * Each channel maps to a GET endpoint that returns the same shape
 * as its WebSocket "update" messages.
 */
const POLL_ENDPOINTS: Record<string, string> = {
  market: '/api/v1/markets/live',
  fixture: '/api/v1/fixtures/live',
  bets: '/api/v1/bets/active',
  wallets: '/api/v1/wallets/me',
};

class WebSocketService {
  private ws: WebSocket | null = null;
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private globalHandlers: Set<MessageHandler> = new Set();
  private reconnectAttempts = 0;
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private _isConnected = false;
  private _isPolling = false;
  private pollTimer: number | null = null;
  private subscribedChannels: Set<string> = new Set();
  private channelRefCounts: Map<string, number> = new Map();
  private authToken?: string;

  get isConnected(): boolean { return this._isConnected; }
  get isPolling(): boolean { return this._isPolling; }

  connect(token?: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    this.authToken = token;

    // Stop polling if we're retrying WS
    this.stopPolling();

    const url = token ? `${WS_URL}?token=${token}` : WS_URL;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this._isConnected = true;
        this._isPolling = false;
        this.reconnectAttempts = 0;
        this.stopPolling();
        this.startHeartbeat();
        // Re-subscribe to previously subscribed channels
        this.subscribedChannels.forEach(channel => {
          this.send({ event: 'subscribe', channel });
        });
        logger.info('WS', 'Connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WsMessage = JSON.parse(event.data);
          this.dispatch(message);
        } catch (err) {
          logger.error('WS', 'Parse error', err);
        }
      };

      this.ws.onclose = () => {
        this._isConnected = false;
        this.stopHeartbeat();
        this.attemptReconnect(token);
      };

      this.ws.onerror = (error) => {
        logger.error('WS', 'Connection error', error);
      };
    } catch (err) {
      logger.error('WS', 'Connection failed', err);
      this.attemptReconnect(token);
    }
  }

  disconnect(): void {
    this.reconnectAttempts = MAX_RECONNECT_ATTEMPTS; // Prevent reconnect
    this.stopHeartbeat();
    this.stopPolling();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this._isConnected = false;
    this._isPolling = false;
    this.subscribedChannels.clear();
    this.channelRefCounts.clear();
  }

  subscribe(channel: string): void {
    const nextCount = (this.channelRefCounts.get(channel) || 0) + 1;
    this.channelRefCounts.set(channel, nextCount);

    const isNewChannel = !this.subscribedChannels.has(channel);
    this.subscribedChannels.add(channel);
    if (this._isConnected && isNewChannel) {
      this.send({ event: 'subscribe', channel });
    }
    // If already in polling mode, the next poll cycle picks up the new channel
  }

  unsubscribe(channel: string): void {
    const currentCount = this.channelRefCounts.get(channel) || 0;
    if (currentCount <= 1) {
      this.channelRefCounts.delete(channel);
      this.subscribedChannels.delete(channel);
    } else {
      this.channelRefCounts.set(channel, currentCount - 1);
      return;
    }

    if (this._isConnected) {
      this.send({ event: 'unsubscribe', channel });
    }
  }

  on(channel: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, new Set());
    }
    this.handlers.get(channel)!.add(handler);
    return () => { this.handlers.get(channel)?.delete(handler); };
  }

  onAny(handler: MessageHandler): () => void {
    this.globalHandlers.add(handler);
    return () => { this.globalHandlers.delete(handler); };
  }

  /** Manually trigger a WS reconnect attempt (e.g. when network returns) */
  retryConnection(): void {
    this.reconnectAttempts = 0;
    this.stopPolling();
    this.connect(this.authToken);
  }

  private send(message: Partial<WsMessage>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private dispatch(message: WsMessage): void {
    // Channel-specific handlers
    const channelHandlers = this.handlers.get(message.channel);
    if (channelHandlers) {
      channelHandlers.forEach(handler => handler(message));
    }
    // Global handlers
    this.globalHandlers.forEach(handler => handler(message));
  }

  private attemptReconnect(token?: string): void {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      // All WS attempts exhausted — switch to HTTP polling fallback
      logger.warn('WS', 'Max reconnect attempts reached, falling back to HTTP polling');
      this.startPolling();
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    this.reconnectTimer = window.setTimeout(() => {
      this.connect(token);
    }, delay);
  }

  // ─── HTTP Polling Fallback ───────────────────────────────────

  private startPolling(): void {
    if (this._isPolling) return;
    this._isPolling = true;
    logger.info('WS', 'Polling fallback started');

    // Immediate first poll
    this.pollOnce();

    this.pollTimer = window.setInterval(() => {
      this.pollOnce();
    }, POLL_INTERVAL);

    // Periodically try to restore WS (every 30s)
    this.reconnectTimer = window.setInterval(() => {
      logger.info('WS', 'Attempting WS restore from polling mode');
      this.reconnectAttempts = 0;
      this.connect(this.authToken);
    }, 30000);
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this._isPolling) {
      logger.info('WS', 'Polling fallback stopped');
    }
    this._isPolling = false;
  }

  private async pollOnce(): Promise<void> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    for (const channel of this.subscribedChannels) {
      const endpoint = POLL_ENDPOINTS[channel];
      if (!endpoint) continue;

      try {
        const res = await fetch(`${API_BASE}${endpoint}`, { headers });
        if (!res.ok) continue;

        const data = await res.json();

        // Wrap the REST response as a WsMessage and dispatch it
        // If the response is an array, dispatch one update per item
        const items = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [data];
        for (const item of items) {
          this.dispatch({
            event: 'update',
            channel,
            data: item,
          });
        }
      } catch (err) {
        logger.warn('WS', 'Poll failed', { channel, error: err });
      }
    }
  }

  // ─── Heartbeat ───────────────────────────────────────────────

  private startHeartbeat(): void {
    this.heartbeatTimer = window.setInterval(() => {
      this.send({ event: 'subscribe', channel: 'heartbeat' });
    }, HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}

// Singleton instance
export const wsService = new WebSocketService();
export default wsService;
