/**
 * Phoenix Sportsbook WebSocket Client Singleton
 * Manages WebSocket connections for real-time updates (fixtures, odds changes, match tracker)
 */

/**
 * WebSocket client for real-time updates
 */
export class PhoenixWebSocketClient {
  private url: string;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageHandlers: Map<string, Function[]> = new Map();
  private connectionPromise: Promise<void> | null = null;

  constructor(url: string) {
    this.url = url;
  }

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('[WebSocket] Connected to', this.url);
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          console.error('[WebSocket] Error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('[WebSocket] Disconnected');
          this.connectionPromise = null;
          this.attemptReconnect();
        };
      } catch (error) {
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.connectionPromise = null;
    }
  }

  /**
   * Send message to WebSocket server
   */
  send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('[WebSocket] Not connected, message not sent');
    }
  }

  /**
   * Subscribe to a message type
   */
  on(type: string, handler: Function): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type)!.push(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.messageHandlers.get(type);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      const { type, payload } = message;

      if (!type) {
        console.warn('[WebSocket] Message without type:', message);
        return;
      }

      const handlers = this.messageHandlers.get(type);
      if (handlers) {
        handlers.forEach((handler) => {
          try {
            handler(payload, message);
          } catch (error) {
            console.error(`[WebSocket] Error in handler for ${type}:`, error);
          }
        });
      }
    } catch (error) {
      console.error('[WebSocket] Error parsing message:', error);
    }
  }

  /**
   * Attempt to reconnect to WebSocket server
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

      setTimeout(() => {
        this.connectionPromise = null;
        this.connect().catch((error) => {
          console.error('[WebSocket] Reconnection failed:', error);
        });
      }, delay);
    } else {
      console.error('[WebSocket] Max reconnection attempts reached');
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// Initialize singleton instance
let wsClientInstance: PhoenixWebSocketClient | null = null;

/**
 * Get or create the WebSocket client singleton
 */
export function getWebSocketClient(): PhoenixWebSocketClient {
  if (!wsClientInstance) {
    const url = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:18080/ws';
    wsClientInstance = new PhoenixWebSocketClient(url);
  }
  return wsClientInstance;
}

/**
 * Export the WebSocket client singleton instance
 */
export const wsClient = getWebSocketClient();

/**
 * Reset WebSocket client instance (mainly for testing)
 */
export function resetWebSocketClient(): void {
  if (wsClientInstance) {
    wsClientInstance.disconnect();
    wsClientInstance = null;
  }
}
