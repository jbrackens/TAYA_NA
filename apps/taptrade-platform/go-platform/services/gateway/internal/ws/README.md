# `internal/ws` — WebSocket hub

Real-time fan-out for the prediction-market gateway. One hub per gateway
process, channel-based subscriptions, one WebSocket endpoint at `GET /ws`.

This file is the only doc for the package. Everything below was checked against
`hub.go`, `client.go`, `handler.go`, `message.go`, `backbone.go` and
`notifier.go`; when they disagree, the code wins.

## Endpoint and authentication

`GET /ws` is registered in `internal/http/handlers.go` and listed in
`cmd/gateway/main.go`'s `publicPrefixes` — not because it is public, but because
it authenticates itself rather than through `httpx.Auth`.

`handler.go` resolves a token in this order:

1. the `access_token` cookie (preferred — no token in the URL),
2. an `Authorization: Bearer <token>` header.

Query-parameter auth was removed. The token is validated by calling the auth
service at `${AUTH_SERVICE_URL}/api/v1/auth/session` (default
`http://localhost:18081`, 5s timeout); the `userId` from that response becomes
the client identity. Anything else returns HTTP 401 before the upgrade.

Origin checking is driven by `WS_ALLOWED_ORIGINS` (comma-separated, exact
case-insensitive match). If it is unset the upgrade is allowed in dev and
**rejected** when `ENVIRONMENT` is `production` or `staging`.

## Channels

Channels are `<prefix>:<identifier>` strings. `client.go`'s
`authorizeChannelAccess` decides who may subscribe:

| Prefix | Access | Broadcast by |
|---|---|---|
| `market:<marketID>` | any authenticated user | `NotifyPredictionMarketUpdate`, `NotifyResolutionUpdate`, `NotifyDisputeFiled` |
| `trades:<marketID>` | any authenticated user | `NotifyPredictionTrade` |
| `orderbook:<marketID>` | any authenticated user | `NotifyPredictionOrderBookUpdate` |
| `event:<eventID>` | any authenticated user | `NotifyEventUpdate` |
| `category:<categorySlug>` | any authenticated user | `NotifyCategoryUpdate` |
| `leaderboard:accuracy` | any authenticated user | `NotifyLeaderboardUpdate` |
| `portfolio:<userID>` | owner only | `NotifyPortfolioUpdate` |
| `wallet:<userID>` | owner only | `NotifyWalletUpdate` |
| `loyalty:<userID>` | owner only | `NotifyLoyaltyTierPromoted` |

Owner-only means the channel's identifier must equal the authenticated user id
(case-insensitive). Unknown prefixes are rejected fail-closed; a name with no
colon at all is treated as public and accepted. A rejected subscribe is logged
but does not close the connection — the client simply never receives anything on
that channel.

Two things the table does not show:

- The hub also broadcasts to `admin:resolutions` and `admin:disputes`
  (`NotifyResolutionUpdate` / `NotifyDisputeFiled`), but `admin` is not an
  allowed prefix in `authorizeChannelAccess`, so no client can currently
  subscribe to them. Those two broadcasts go nowhere today.
- `authorizeChannelAccess` still lists four prefixes left over from the
  sportsbook fork — `markets`, `fixture` and `fixtures` as public, `bets` as
  owner-only. Nothing broadcasts to any of them, so subscribing succeeds and
  yields silence. In particular `markets:<id>` (plural) is not the market
  channel; the real one is `market:<id>`.

`NotifyEventUpdate`, `NotifyCategoryUpdate` and `NotifyLeaderboardUpdate` are
implemented but have no caller outside this package — the channels exist, the
producers do not yet.

## Wire protocol

Client → server (`message.go`):

```json
{"type": "subscribe",   "channels": ["market:m_123", "orderbook:m_123"]}
{"type": "unsubscribe", "channels": ["orderbook:m_123"]}
```

Server → client:

```json
{
  "type": "event",
  "channel": "market:m_123",
  "eventId": "market_update",
  "data": { }
}
```

`eventId` is a fixed per-method label (`market_update`, `trade`,
`orderbook_update`, `portfolio_update`, `wallet_update`, `event_update`,
`category_update`, `leaderboard_update`, `tier_promoted`, `resolution_update`,
`dispute_filed`), not a unique id. `BroadcastEvent` also takes an event-type
argument, but it is not serialised into the frame — clients key off `channel`
plus `eventId`.

Payload shapes are built by the producing handler, not by this package. The
order-path payloads live in `internal/http/prediction_handlers.go`
(`buildMarketUpdatePayload`, `buildTradeFillPayload`, `buildOrderBookHintPayload`,
`buildPortfolioUpdatePayload`, `buildWalletUpdatePayload`). They are
point-denominated — fields such as `yesPricePoints`, `pricePoints`,
`balancePoints`, with `"unit": "PTS"`. There are no cents and no odds.

## Go API

```go
hub := ws.NewHub()
go hub.Run(ctx)
mux.HandleFunc("/ws", ws.NewHandler(hub))
```

`*Hub` satisfies `ws.Notifier` (`notifier.go`), which is the interface handlers
should depend on:

```go
NotifyPredictionMarketUpdate(marketID string, data interface{})
NotifyPredictionTrade(marketID string, data interface{})
NotifyPredictionOrderBookUpdate(marketID string, data interface{})
NotifyPortfolioUpdate(userID string, data interface{})
NotifyWalletUpdate(userID string, data interface{})
NotifyEventUpdate(eventID string, data interface{})
NotifyCategoryUpdate(categorySlug string, data interface{})
NotifyLeaderboardUpdate(data interface{})
NotifyLoyaltyTierPromoted(userID string, data interface{})
```

`*Hub` additionally has `NotifyResolutionUpdate(marketID, phase string, data interface{})`
and `NotifyDisputeFiled(marketID string, data interface{})`. These are not on
`ws.Notifier`: the market-lifecycle handler in `internal/http/handlers.go` calls
the hub directly, and the dispute API depends on a one-method local interface
(`disputeNotifier` in `internal/http/dispute_handlers.go`).

Lower-level entry points: `Broadcast(channel string, message []byte)`,
`BroadcastEvent(channel, eventID, eventType string, data interface{})`,
`SetBackbone(Backbone)` (before `Run`), `ClientCount()`, `ChannelCount()`,
`GetChannelSubscribers(channel)`, `BackboneHealthy()`, `Close()`.

## Backpressure

Nothing in the broadcast path blocks its caller — the HTTP order and settlement
handlers publish on the request path, so a stalled hub would stall trading.

- `Hub.Broadcast` drops the message if the hub command queue (100) is full and
  increments `gateway_ws_broadcasts_dropped_total`.
- `Client.SendMessage` drops the message if the client's send buffer (256) is
  full, increments `gateway_ws_messages_dropped_total`, and disconnects that
  client (`gateway_ws_slow_clients_disconnected_total`).
- `gateway_ws_disconnects_dropped_total` counts slow-client disconnects that
  could not be enqueued; cleanup still happens through the client's own close
  path.

WebSocket here is a cache-invalidation channel: a dropped frame is recoverable
because clients refetch on the next event or on reconnect. Counters are rendered
by `RenderMetrics()` and folded into the gateway `/metrics` endpoint.

## Cross-instance delivery

`backbone.go` fans broadcasts to other gateway instances so a trade matched on
instance A reaches a subscriber connected to instance B.

- Default `LocalBackbone`: no-op, single instance.
- `RedisBackbone`: one Redis pub/sub channel (`ws:events`), messages tagged with
  a random instance id so a publisher skips its own echo.

Wiring is in `internal/http/handlers.go` and is opt-in: `WS_BACKBONE=redis` plus
a `REDIS_URL` that `redis.ParseURL` accepts — it needs a scheme, e.g.
`redis://localhost:6380/0`. A bare `host:port` fails to parse and the gateway
falls back to the local backbone with an error log.

Local fan-out never goes through the backbone, so a Redis outage degrades
delivery to local-only rather than stopping it. `/readyz` reports it as
`ws_backbone: ok | degraded`, informationally — a degraded backbone does not fail
readiness.

## Limits and timeouts

| Setting | Value | Source |
|---|---|---|
| Max inbound message | 512 KB | `client.go` `maxMessageSize` |
| Per-client send buffer | 256 messages | `client.go` `NewClient` |
| Hub command buffers | 100 (subscribe/unsubscribe/disconnect/broadcast) | `hub.go` `NewHub` |
| Backbone outbound queue | 256 | `hub.go` `NewHub` |
| Ping interval | 30s | `client.go` `pingInterval` |
| Pong deadline / read deadline | 60s | `client.go` `pongWait` |
| Write timeout | 10s | `client.go` `writeWait` |

## Concurrency

One hub goroutine owns the subscription map and processes subscribe,
unsubscribe, disconnect, broadcast and inbound-backbone commands; a second hub
goroutine drains outbound broadcasts to the backbone. Each client runs a read
pump and a write pump. `Broadcast`, `BroadcastEvent` and every `Notify*` method
are safe to call from any goroutine.

## Files

| File | Purpose |
|---|---|
| `hub.go` | Subscription map, event loop, broadcast + `Notify*` methods |
| `client.go` | Per-connection pumps, channel authorization, drop counters, metrics text |
| `handler.go` | HTTP upgrade, origin check, auth-service token validation |
| `message.go` | Frame types and JSON (de)serialisation |
| `notifier.go` | `Notifier` interface |
| `backbone.go` | Local and Redis cross-instance backbones |
| `hub_test.go`, `slow_client_test.go`, `channels_race_test.go`, `backbone_test.go` | Tests |

Run the tests from `services/gateway`:

```bash
go test ./internal/ws/...
```
