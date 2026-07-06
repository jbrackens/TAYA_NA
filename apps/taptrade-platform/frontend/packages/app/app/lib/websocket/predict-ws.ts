// Predict-native WebSocket client. Wire format matches the Go
// internal/ws/hub.go server — deliberately separate from the sportsbook-era
// websocket-service.ts (which uses a different envelope and was never
// rewritten for the Predict gateway).
//
// Client → Server (subscribe): {"type":"subscribe","channels":["ch1","ch2"]}
// Client → Server (unsubscribe): {"type":"unsubscribe","channels":[...]}
// Server → Client (event): {"type":"event","channel":"...","eventId":"...","data":{...}}
//
// Single shared connection is reused across hooks/components (module-level
// state). Reconnect uses capped exponential backoff. Handlers receive the
// parsed data payload directly — no ceremony in the call site.

import { logger } from "../logger";

type RawEvent = {
  type: "event";
  channel: string;
  eventId: string;
  data: unknown;
};

type EventHandler = (eventId: string, data: unknown) => void;

const WS_URL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_WS_URL) ||
  "ws://localhost:18080/ws";

const MAX_RECONNECT_DELAY_MS = 15_000;
const HEARTBEAT_MS = 25_000;

class PredictWsClient {
  private ws: WebSocket | null = null;
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private wantedChannels: Set<string> = new Set();
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  private connect(): void {
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }
    try {
      this.ws = new WebSocket(WS_URL);
    } catch (err) {
      logger.warn("PredictWs", "connection attempt threw", err);
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      // Re-subscribe everything the app wants after a reconnect.
      if (this.wantedChannels.size > 0) {
        this.send({ type: "subscribe", channels: [...this.wantedChannels] });
      }
      this.startHeartbeat();
    };

    this.ws.onmessage = (raw) => {
      let msg: RawEvent;
      try {
        msg = JSON.parse(raw.data);
      } catch (err) {
        logger.warn("PredictWs", "parse error", err);
        return;
      }
      if (msg?.type !== "event" || !msg.channel) return;
      const handlers = this.handlers.get(msg.channel);
      if (!handlers) return;
      for (const handler of handlers) {
        try {
          handler(msg.eventId, msg.data);
        } catch (err) {
          logger.warn("PredictWs", "handler threw", err);
        }
      }
    };

    this.ws.onerror = (evt) => {
      logger.warn("PredictWs", "socket error", evt);
    };

    this.ws.onclose = () => {
      this.stopHeartbeat();
      this.ws = null;
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.wantedChannels.size === 0) return;
    this.reconnectAttempts += 1;
    const delay = Math.min(
      MAX_RECONNECT_DELAY_MS,
      500 * 2 ** Math.min(this.reconnectAttempts - 1, 5),
    );
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        // No app-level ping frame in the Go hub's wire format — sending a
        // harmless subscribe to the empty channel set is a no-op the server
        // tolerates, and keeps the connection from idling out of proxies.
        this.send({ type: "subscribe", channels: [] });
      }
    }, HEARTBEAT_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private send(payload: unknown): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      this.ws.send(JSON.stringify(payload));
    } catch (err) {
      logger.warn("PredictWs", "send failed", err);
    }
  }

  // subscribe registers a handler for `channel` and returns an unsubscribe fn.
  // The first subscriber per channel triggers a server-side subscribe; the
  // last unsubscriber triggers a server-side unsubscribe.
  subscribe(channel: string, handler: EventHandler): () => void {
    if (!channel) return () => {};
    const existing = this.handlers.get(channel);
    if (existing) {
      existing.add(handler);
    } else {
      this.handlers.set(channel, new Set([handler]));
      this.wantedChannels.add(channel);
      this.connect();
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: "subscribe", channels: [channel] });
      }
    }
    return () => {
      const set = this.handlers.get(channel);
      if (!set) return;
      set.delete(handler);
      if (set.size === 0) {
        this.handlers.delete(channel);
        this.wantedChannels.delete(channel);
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.send({ type: "unsubscribe", channels: [channel] });
        }
      }
    };
  }
}

let shared: PredictWsClient | null = null;

function client(): PredictWsClient {
  if (!shared) shared = new PredictWsClient();
  return shared;
}

// subscribePredictWs is the public API. Only call from useEffect (browser-side).
export function subscribePredictWs(
  channel: string,
  handler: EventHandler,
): () => void {
  if (typeof window === "undefined") return () => {};
  return client().subscribe(channel, handler);
}
