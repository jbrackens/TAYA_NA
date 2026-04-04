/**
 * WebSocket client for Phoenix Sportsbook real-time features
 * Handles auto-reconnect with exponential backoff
 */

export interface WebSocketConfig {
  url: string;
  token?: string;
  reconnectAttempts?: number;
  initialBackoffMs?: number;
  maxBackoffMs?: number;
  heartbeatIntervalMs?: number;
}

export interface WebSocketMessage {
  type: string;
  channel?: string;
  data?: Record<string, any>;
  timestamp: number;
}

export type MessageHandler = (message: WebSocketMessage) => void;
export type ConnectionHandler = () => void;
export type ErrorHandler = (error: Error) => void;

export class PhoenixWebSocketClient {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private reconnectAttempt: number = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimeout: ReturnType<typeof setInterval> | null = null;
  private messageHandlers: Map<string, MessageHandler[]> = new Map();
  private connectionHandlers: ConnectionHandler[] = [];
  private errorHandlers: ErrorHandler[] = [];
  private isManualClose: boolean = false;

  constructor(config: WebSocketConfig) {
    this.config = {
      url: config.url,
      token: config.token ?? '',
      reconnectAttempts: config.reconnectAttempts ?? 5,
      initialBackoffMs: config.initialBackoffMs ?? 1000,
      maxBackoffMs: config.maxBackoffMs ?? 30000,
      heartbeatIntervalMs: config.heartbeatIntervalMs ?? 30000,
    };
  }

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const url = new URL(this.config.url);
        if (this.config.token) {
          url.searchParams.set('token', this.config.token);
        }

        this.ws = new WebSocket(url.toString());

        this.ws.onopen = () => {
          this.reconnectAttempt = 0;
          this.isManualClose = false;
          this.startHeartbeat();
          this.connectionHandlers.forEach(handler => handler());
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (event) => {
          const error = new Error('WebSocket error');
          this.errorHandlers.forEach(handler => handler(error));
          reject(error);
        };

        this.ws.onclose = () => {
          this.stopHeartbeat();
          if (!this.isManualClose) {
            this.attemptReconnect();
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Close connection gracefully
   */
  close(): void {
    this.isManualClose = true;
    this.stopHeartbeat();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Subscribe to messages on a channel
   */
  subscribe(channel: string, handler: MessageHandler): () => void {
    if (!this.messageHandlers.has(channel)) {
      this.messageHandlers.set(channel, []);
    }
    this.messageHandlers.get(channel)!.push(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.messageHandlers.get(channel);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  /**
   * Register connection handler
   */
  onConnect(handler: ConnectionHandler): () => void {
    this.connectionHandlers.push(handler);
    return () => {
      const index = this.connectionHandlers.indexOf(handler);
      if (index > -1) {
        this.connectionHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Register error handler
   */
  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.push(handler);
    return () => {
      const index = this.errorHandlers.indexOf(handler);
      if (index > -1) {
        this.errorHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Send message to server
   */
  send(message: Omit<WebSocketMessage, 'timestamp'>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }
    this.ws.send(
      JSON.stringify({
        ...message,
        timestamp: Date.now(),
      })
    );
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Get current reconnection attempt count
   */
  getReconnectAttempt(): number {
    return this.reconnectAttempt;
  }

  /**
   * Handle incoming message
   */
  private handleMessage(data: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(data);
      const channel = message.channel ?? 'default';

      const handlers = this.messageHandlers.get(channel);
      if (handlers) {
        handlers.forEach(handler => handler(message));
      }

      // Broadcast to * handlers
      const broadcastHandlers = this.messageHandlers.get('*');
      if (broadcastHandlers) {
        broadcastHandlers.forEach(handler => handler(message));
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.errorHandlers.forEach(handler => handler(err));
    }
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempt >= this.config.reconnectAttempts) {
      const error = new Error('Max reconnection attempts reached');
      this.errorHandlers.forEach(handler => handler(error));
      return;
    }

    this.reconnectAttempt++;
    const backoff = Math.min(
      this.config.initialBackoffMs * Math.pow(2, this.reconnectAttempt - 1),
      this.config.maxBackoffMs
    );

    this.reconnectTimeout = setTimeout(() => {
      this.connect().catch(error => {
        this.errorHandlers.forEach(handler => handler(error));
      });
    }, backoff);
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.heartbeatTimeout = setInterval(() => {
      if (this.isConnected()) {
        try {
          this.send({ type: 'ping' });
        } catch {
          // Connection may have closed, will be handled by onclose
        }
      }
    }, this.config.heartbeatIntervalMs);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimeout) {
      clearInterval(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }
}
