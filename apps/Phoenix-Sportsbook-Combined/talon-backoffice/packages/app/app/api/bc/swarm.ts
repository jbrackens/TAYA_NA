/**
 * Server-side BetConstruct Swarm client.
 * Keeps a persistent WebSocket + in-memory cache so pages load fast.
 */

import WebSocket from "ws";

const BC_SITE_ID = process.env.NEXT_PUBLIC_BC_SITE_ID || "175";
const BC_WS_URL =
  process.env.NEXT_PUBLIC_BC_WS_URL ||
  "wss://eu-swarm-springre.betconstruct.com";

// ─── Persistent WebSocket connection ────────────────────────────
let ws: WebSocket | null = null;
let wsReady = false;
let ridCounter = 1;
const pending = new Map<
  string,
  { resolve: (v: Record<string, unknown>) => void; reject: (e: Error) => void }
>();

function getWs(): Promise<WebSocket> {
  if (ws && wsReady && ws.readyState === WebSocket.OPEN) {
    return Promise.resolve(ws);
  }

  return new Promise((resolve, reject) => {
    // Close stale connection
    if (ws) {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
    }
    wsReady = false;

    const conn = new WebSocket(BC_WS_URL);
    const timeout = setTimeout(() => {
      conn.close();
      reject(new Error("WebSocket connect timeout"));
    }, 8000);

    conn.on("open", () => {
      // Request session
      const rid = String(ridCounter++);
      conn.send(
        JSON.stringify({
          command: "request_session",
          rid,
          params: { language: "eng", site_id: BC_SITE_ID, source: 42 },
        }),
      );

      // Wait for session response
      const onMsg = (raw: WebSocket.Data) => {
        const msg = JSON.parse(raw.toString());
        if (msg.code === 0 && msg.data?.sid) {
          clearTimeout(timeout);
          conn.removeListener("message", onMsg);
          ws = conn;
          wsReady = true;

          // Set up message handler for queries
          conn.on("message", (data: WebSocket.Data) => {
            const resp = JSON.parse(data.toString());
            const p = pending.get(resp.rid);
            if (p) {
              pending.delete(resp.rid);
              if (resp.code !== 0) {
                p.reject(new Error(`Swarm error: ${resp.code}`));
              } else {
                p.resolve(resp.data?.data || {});
              }
            }
          });

          conn.on("close", () => {
            wsReady = false;
            ws = null;
          });
          conn.on("error", () => {
            wsReady = false;
            ws = null;
          });

          resolve(conn);
        } else {
          clearTimeout(timeout);
          conn.close();
          reject(new Error(`Session failed: ${msg.code}`));
        }
      };
      conn.on("message", onMsg);
    });

    conn.on("error", (err: Error) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

// ─── Cache ──────────────────────────────────────────────────────
interface CacheEntry {
  data: Record<string, unknown>;
  ts: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 30_000; // 30 seconds

function cacheKey(params: Record<string, unknown>): string {
  return JSON.stringify(params);
}

// ─── Public API ─────────────────────────────────────────────────
export async function swarmQuery(
  queryParams: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const key = cacheKey(queryParams);

  // Check cache
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  // Send query over persistent WebSocket
  const conn = await getWs();
  const rid = String(ridCounter++);

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pending.delete(rid);
      reject(new Error("Swarm query timeout"));
    }, 15000);

    pending.set(rid, {
      resolve: (data) => {
        clearTimeout(timeout);
        cache.set(key, { data, ts: Date.now() });
        resolve(data);
      },
      reject: (err) => {
        clearTimeout(timeout);
        reject(err);
      },
    });

    conn.send(
      JSON.stringify({
        command: "get",
        rid,
        params: queryParams,
      }),
    );
  });
}
