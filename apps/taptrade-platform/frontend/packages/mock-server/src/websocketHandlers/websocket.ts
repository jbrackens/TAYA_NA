/**
 * Mock-server websocket handler — matches the Go gateway/phoenix-realtime contract.
 *
 * Supported channels:
 *   market^{marketId}     — market odds/status updates
 *   fixture^...^{fixtureId} — fixture score/status updates
 *   bets                  — bet state transitions (requires auth token)
 *   wallets               — wallet balance updates (requires auth token)
 *
 * Supported events (inbound):
 *   subscribe     — subscribe to a channel
 *   unsubscribe   — unsubscribe from a channel
 *   heartbeat     — connection keepalive
 *
 * Outbound events:
 *   subscribe:success / unsubscribe:success / heartbeat / update / error
 */

const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1) + min);

const randomDecimal = (min: number, max: number, decimals = 2) =>
  parseFloat((Math.random() * (max - min) + min).toFixed(decimals));

type InboundMessage = {
  event: string;
  channel: string;
  correlationId?: string;
  token?: string;
};

type OutboundMessage = {
  event: string;
  channel: string;
  correlationId?: string;
  data?: any;
};

type ChannelDescriptor = {
  kind: "market" | "fixture" | "bets" | "wallets";
  channel: string;
  marketId?: string;
  fixtureId?: string;
  requiresAuth: boolean;
};

function parseChannel(channel: string): ChannelDescriptor | null {
  channel = (channel || "").trim();
  if (channel.startsWith("market^")) {
    const parts = channel.split("^");
    if (parts.length >= 2 && parts[1].trim()) {
      return { kind: "market", channel, marketId: parts[1], requiresAuth: false };
    }
  } else if (channel.startsWith("fixture^")) {
    const parts = channel.split("^");
    const fixtureId = parts[parts.length - 1]?.trim();
    if (fixtureId) {
      return { kind: "fixture", channel, fixtureId, requiresAuth: false };
    }
  } else if (channel === "bets") {
    return { kind: "bets", channel, requiresAuth: true };
  } else if (channel === "wallets") {
    return { kind: "wallets", channel, requiresAuth: true };
  }
  return null;
}

function generateMarketUpdate(marketId: string): any {
  const odds1 = randomDecimal(1.1, 5.0);
  const odds2 = randomDecimal(1.1, 5.0);
  const statuses = ["open", "suspended"];
  const status = statuses[randomInt(0, statuses.length - 1)];

  return {
    marketId,
    marketName: "match_winner",
    marketStatus: {
      type: status === "open" ? "ACTIVE" : "SUSPENDED",
      changeReason: { status, type: status.toUpperCase() },
    },
    marketType: "MATCH_WINNER",
    selectionOdds: [
      {
        selectionId: `${marketId}-home`,
        selectionName: "Home",
        odds: odds1,
        displayOdds: {
          decimal: odds1,
          american: odds1 >= 2 ? Math.round((odds1 - 1) * 100) : Math.round(-100 / (odds1 - 1)),
          fractional: `${Math.round((odds1 - 1) * 100)}/100`,
        },
      },
      {
        selectionId: `${marketId}-away`,
        selectionName: "Away",
        odds: odds2,
        displayOdds: {
          decimal: odds2,
          american: odds2 >= 2 ? Math.round((odds2 - 1) * 100) : Math.round(-100 / (odds2 - 1)),
          fractional: `${Math.round((odds2 - 1) * 100)}/100`,
        },
      },
    ],
    specifiers: { variant: "", way: "" },
  };
}

function generateFixtureUpdate(fixtureId: string): any {
  const statuses = ["IN_PLAY", "PRE_GAME", "POST_GAME", "BREAK_IN_PLAY", "GAME_ABANDONED"];
  return {
    id: fixtureId,
    name: "Demo Team A vs Demo Team B",
    score: { home: randomInt(0, 5), away: randomInt(0, 5) },
    startTime: new Date().toISOString(),
    status: statuses[randomInt(0, statuses.length - 1)],
  };
}

function generateWalletUpdate(): any {
  const balance = randomDecimal(100, 10000);
  const reserved = randomDecimal(0, balance * 0.1);
  return {
    balance: {
      realMoney: {
        value: { amount: balance },
        currency: "USD",
      },
      reserved,
      available: parseFloat((balance - reserved).toFixed(2)),
    },
  };
}

function generateBetUpdate(): any {
  const states = ["OPENED", "SETTLED", "CANCELLED"];
  return {
    betId: `bet-${randomInt(1000, 9999)}`,
    state: states[randomInt(0, states.length - 1)],
  };
}

export const websocketHandler = (conn: any) => {
  const subscriptions = new Map<string, NodeJS.Timeout>();

  const send = (msg: OutboundMessage) => {
    try {
      conn.send(JSON.stringify(msg));
    } catch {
      // connection closed
    }
  };

  conn.on("message", (raw: any) => {
    let message: InboundMessage;
    try {
      message = JSON.parse(typeof raw === "string" ? raw : raw.toString());
    } catch {
      return;
    }

    const event = (message.event || "").trim().toLowerCase();

    switch (event) {
      case "subscribe": {
        const descriptor = parseChannel(message.channel);
        if (!descriptor) {
          send({
            event: "error",
            channel: message.channel,
            correlationId: message.correlationId,
            data: { message: "unsupported websocket channel" },
          });
          return;
        }

        // Auth check for private channels (accept any non-empty token in mock)
        if (descriptor.requiresAuth && !(message.token || "").trim()) {
          send({
            event: "error",
            channel: message.channel,
            correlationId: message.correlationId,
            data: { message: "authentication required for websocket channel" },
          });
          return;
        }

        // Already subscribed? Just ack
        if (subscriptions.has(descriptor.channel)) {
          send({
            event: "subscribe:success",
            channel: descriptor.channel,
            correlationId: message.correlationId,
          });
          return;
        }

        // Ack the subscription
        send({
          event: "subscribe:success",
          channel: descriptor.channel,
          correlationId: message.correlationId,
        });

        // Start sending periodic updates
        const interval = setInterval(() => {
          let data: any;
          switch (descriptor.kind) {
            case "market":
              data = generateMarketUpdate(descriptor.marketId!);
              break;
            case "fixture":
              data = generateFixtureUpdate(descriptor.fixtureId!);
              break;
            case "wallets":
              data = generateWalletUpdate();
              break;
            case "bets":
              data = generateBetUpdate();
              break;
          }
          send({ event: "update", channel: descriptor.channel, data });
        }, 3000);

        subscriptions.set(descriptor.channel, interval);
        break;
      }

      case "unsubscribe": {
        const existing = subscriptions.get(message.channel);
        if (existing) {
          clearInterval(existing);
          subscriptions.delete(message.channel);
          send({
            event: "unsubscribe:success",
            channel: message.channel,
            correlationId: message.correlationId,
          });
        }
        break;
      }

      case "heartbeat": {
        send({
          event: "heartbeat",
          channel: "heartbeat",
          correlationId: message.correlationId,
          data: { status: "ok" },
        });
        break;
      }

      default: {
        send({
          event: "error",
          channel: message.channel || "",
          correlationId: message.correlationId,
          data: { message: "unsupported websocket event" },
        });
      }
    }
  });

  conn.on("close", () => {
    for (const [, interval] of subscriptions) {
      clearInterval(interval);
    }
    subscriptions.clear();
  });
};
