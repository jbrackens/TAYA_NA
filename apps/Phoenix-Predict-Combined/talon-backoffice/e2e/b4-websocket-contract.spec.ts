import { test, expect } from "@playwright/test";
import WebSocket from "ws";

/**
 * B4 — WebSocket Contract Validation
 *
 * Tests the websocket endpoint against the Go gateway / phoenix-realtime
 * contract shape. Runs against mock-server (port 3010) in CI/local,
 * or against the real gateway when WS_TARGET is set.
 *
 * Contract:
 *   Inbound:  { event, channel, correlationId?, token? }
 *   Outbound: { event, channel, correlationId?, data? }
 *
 * Channels: market^{id}, fixture^...^{id}, bets (auth), wallets (auth)
 * Events:   subscribe, unsubscribe, heartbeat
 */

const WS_URL = process.env.WS_TARGET || "ws://localhost:3010";
const MOCK_TOKEN = "mock-test-token";

function connectWS(): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    ws.on("open", () => resolve(ws));
    ws.on("error", (err) => reject(err));
    setTimeout(() => reject(new Error("WS connect timeout")), 5000);
  });
}

function sendAndWait(
  ws: WebSocket,
  message: Record<string, any>,
  timeout = 5000
): Promise<Record<string, any>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`WS response timeout for event: ${message.event}`)),
      timeout
    );
    const handler = (raw: WebSocket.Data) => {
      const parsed = JSON.parse(raw.toString());
      // Match on correlationId if present, otherwise accept first response
      if (
        !message.correlationId ||
        parsed.correlationId === message.correlationId
      ) {
        clearTimeout(timer);
        ws.off("message", handler);
        resolve(parsed);
      }
    };
    ws.on("message", handler);
    ws.send(JSON.stringify(message));
  });
}

function waitForEvent(
  ws: WebSocket,
  eventName: string,
  channel: string,
  timeout = 8000
): Promise<Record<string, any>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timeout waiting for ${eventName} on ${channel}`)),
      timeout
    );
    const handler = (raw: WebSocket.Data) => {
      const parsed = JSON.parse(raw.toString());
      if (parsed.event === eventName && parsed.channel === channel) {
        clearTimeout(timer);
        ws.off("message", handler);
        resolve(parsed);
      }
    };
    ws.on("message", handler);
  });
}

test.describe("B4 — WebSocket Contract: Heartbeat", () => {
  test("heartbeat returns ok status", async () => {
    const ws = await connectWS();
    try {
      const response = await sendAndWait(ws, {
        event: "heartbeat",
        channel: "heartbeat",
        correlationId: "hb-001",
      });

      expect(response.event).toBe("heartbeat");
      expect(response.channel).toBe("heartbeat");
      expect(response.correlationId).toBe("hb-001");
      expect(response.data).toBeDefined();
      expect(response.data.status).toBe("ok");
      console.log("[WS CONTRACT] Heartbeat: PASS");
    } finally {
      ws.close();
    }
  });
});

test.describe("B4 — WebSocket Contract: Market Channel", () => {
  test("subscribe to market channel returns success + update", async () => {
    const ws = await connectWS();
    try {
      const ack = await sendAndWait(ws, {
        event: "subscribe",
        channel: "market^mkt-001",
        correlationId: "sub-mkt-001",
      });

      expect(ack.event).toBe("subscribe:success");
      expect(ack.channel).toBe("market^mkt-001");
      expect(ack.correlationId).toBe("sub-mkt-001");
      console.log("[WS CONTRACT] Market subscribe ack: PASS");

      // Wait for the first update
      const update = await waitForEvent(ws, "update", "market^mkt-001");

      expect(update.event).toBe("update");
      expect(update.channel).toBe("market^mkt-001");
      expect(update.data).toBeDefined();
      expect(update.data.marketId).toBeDefined();
      expect(update.data.marketStatus).toBeDefined();
      expect(update.data.marketStatus.type).toMatch(/^(ACTIVE|SUSPENDED)$/);
      expect(update.data.selectionOdds).toBeDefined();
      expect(Array.isArray(update.data.selectionOdds)).toBe(true);

      if (update.data.selectionOdds.length > 0) {
        const sel = update.data.selectionOdds[0];
        expect(sel.selectionId).toBeDefined();
        expect(typeof sel.odds).toBe("number");
        expect(sel.displayOdds).toBeDefined();
        expect(typeof sel.displayOdds.decimal).toBe("number");
      }
      console.log("[WS CONTRACT] Market update shape: PASS");
    } finally {
      ws.close();
    }
  });

  test("unsubscribe from market channel", async () => {
    const ws = await connectWS();
    try {
      await sendAndWait(ws, {
        event: "subscribe",
        channel: "market^mkt-002",
        correlationId: "sub-mkt-002",
      });

      const unsub = await sendAndWait(ws, {
        event: "unsubscribe",
        channel: "market^mkt-002",
        correlationId: "unsub-mkt-002",
      });

      expect(unsub.event).toBe("unsubscribe:success");
      expect(unsub.channel).toBe("market^mkt-002");
      console.log("[WS CONTRACT] Market unsubscribe: PASS");
    } finally {
      ws.close();
    }
  });
});

test.describe("B4 — WebSocket Contract: Fixture Channel", () => {
  test("subscribe to fixture channel returns success + update", async () => {
    const ws = await connectWS();
    try {
      const ack = await sendAndWait(ws, {
        event: "subscribe",
        channel: "fixture^sport^fix-001",
        correlationId: "sub-fix-001",
      });

      expect(ack.event).toBe("subscribe:success");
      expect(ack.channel).toBe("fixture^sport^fix-001");
      console.log("[WS CONTRACT] Fixture subscribe ack: PASS");

      const update = await waitForEvent(ws, "update", "fixture^sport^fix-001");

      expect(update.data).toBeDefined();
      expect(update.data.id).toBeDefined();
      expect(update.data.name).toBeDefined();
      expect(update.data.score).toBeDefined();
      expect(typeof update.data.score.home).toBe("number");
      expect(typeof update.data.score.away).toBe("number");
      expect(update.data.status).toMatch(
        /^(IN_PLAY|PRE_GAME|POST_GAME|BREAK_IN_PLAY|GAME_ABANDONED|UNKNOWN)$/
      );
      console.log("[WS CONTRACT] Fixture update shape: PASS");
    } finally {
      ws.close();
    }
  });
});

test.describe("B4 — WebSocket Contract: Wallets Channel (Auth)", () => {
  test("wallets channel requires auth token", async () => {
    const ws = await connectWS();
    try {
      const response = await sendAndWait(ws, {
        event: "subscribe",
        channel: "wallets",
        correlationId: "sub-wallet-noauth",
      });

      expect(response.event).toBe("error");
      expect(response.data.message).toContain("authentication");
      console.log("[WS CONTRACT] Wallets auth guard: PASS");
    } finally {
      ws.close();
    }
  });

  test("wallets channel with token returns update", async () => {
    const ws = await connectWS();
    try {
      const ack = await sendAndWait(ws, {
        event: "subscribe",
        channel: "wallets",
        correlationId: "sub-wallet-001",
        token: MOCK_TOKEN,
      });

      expect(ack.event).toBe("subscribe:success");
      expect(ack.channel).toBe("wallets");
      console.log("[WS CONTRACT] Wallets subscribe ack: PASS");

      const update = await waitForEvent(ws, "update", "wallets");

      expect(update.data).toBeDefined();
      expect(update.data.balance).toBeDefined();
      expect(update.data.balance.realMoney).toBeDefined();
      expect(update.data.balance.realMoney.value).toBeDefined();
      expect(typeof update.data.balance.realMoney.value.amount).toBe("number");
      console.log("[WS CONTRACT] Wallets update shape: PASS");
    } finally {
      ws.close();
    }
  });
});

test.describe("B4 — WebSocket Contract: Bets Channel (Auth)", () => {
  test("bets channel requires auth token", async () => {
    const ws = await connectWS();
    try {
      const response = await sendAndWait(ws, {
        event: "subscribe",
        channel: "bets",
        correlationId: "sub-bets-noauth",
      });

      expect(response.event).toBe("error");
      expect(response.data.message).toContain("authentication");
      console.log("[WS CONTRACT] Bets auth guard: PASS");
    } finally {
      ws.close();
    }
  });

  test("bets channel with token returns update", async () => {
    const ws = await connectWS();
    try {
      const ack = await sendAndWait(ws, {
        event: "subscribe",
        channel: "bets",
        correlationId: "sub-bets-001",
        token: MOCK_TOKEN,
      });

      expect(ack.event).toBe("subscribe:success");
      expect(ack.channel).toBe("bets");
      console.log("[WS CONTRACT] Bets subscribe ack: PASS");

      const update = await waitForEvent(ws, "update", "bets");

      expect(update.data).toBeDefined();
      expect(update.data.betId).toBeDefined();
      expect(update.data.state).toMatch(/^(OPENED|SETTLED|CANCELLED|FAILED)$/);
      console.log("[WS CONTRACT] Bets update shape: PASS");
    } finally {
      ws.close();
    }
  });
});

test.describe("B4 — WebSocket Contract: Error Handling", () => {
  test("unsupported event returns error", async () => {
    const ws = await connectWS();
    try {
      const response = await sendAndWait(ws, {
        event: "invalid_event",
        channel: "test",
        correlationId: "err-001",
      });

      expect(response.event).toBe("error");
      expect(response.data.message).toContain("unsupported");
      console.log("[WS CONTRACT] Unsupported event error: PASS");
    } finally {
      ws.close();
    }
  });

  test("unsupported channel returns error", async () => {
    const ws = await connectWS();
    try {
      const response = await sendAndWait(ws, {
        event: "subscribe",
        channel: "unknown_channel",
        correlationId: "err-002",
      });

      expect(response.event).toBe("error");
      console.log("[WS CONTRACT] Unsupported channel error: PASS");
    } finally {
      ws.close();
    }
  });
});
