# WebSocket Module Usage Guide

## Overview

The WebSocket module provides real-time bidirectional communication between clients and the gateway service. It manages client connections, channel subscriptions, and event broadcasting.

## Architecture

### Core Components

1. **Hub** (`hub.go`) - Central manager for all WebSocket connections
   - Manages client subscriptions to channels
   - Broadcasts events to subscribed clients
   - Handles channel lifecycle
   - Thread-safe using Go channels

2. **Client** (`client.go`) - Represents a single WebSocket connection
   - Handles message read/write pumps
   - Manages subscriptions/unsubscriptions
   - Implements heartbeat (ping/pong)
   - Graceful cleanup on disconnect

3. **Handler** (`handler.go`) - HTTP upgrade handler
   - Authenticates connections via Bearer token
   - Upgrades HTTP connections to WebSocket
   - Creates and registers new clients

4. **Messages** (`message.go`) - Message type definitions
   - Subscribe/Unsubscribe requests
   - Event broadcasts
   - JSON serialization

5. **Notifier** (`notifier.go`) - Interface for other services
   - NotifyMarketUpdate
   - NotifyFixtureUpdate
   - NotifyBetUpdate
   - NotifyWalletUpdate

## Integration

### Route Registration

The WebSocket endpoint is automatically registered at `GET /ws` during gateway startup. See `handlers.go`:

```go
// Initialize WebSocket hub
wsHub := ws.NewHub()
go wsHub.Run(context.Background())
registerWebSocketRoutes(mux, wsHub)
```

### Authentication

Clients must provide a Bearer token to authenticate:

```bash
# Using Authorization header
curl -i -N -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: x3JJHMbDL1EzLkh9GBhXDw==" \
  -H "Authorization: Bearer user123" \
  http://localhost:18080/ws

# Or using query parameter
curl -i -N -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: x3JJHMbDL1EzLkh9GBhXDw==" \
  http://localhost:18080/ws?token=user123
```

## Client Message Protocol

### Subscribe Message

```json
{
  "type": "subscribe",
  "channels": [
    "markets:fixture_123",
    "fixtures:soccer",
    "bets:user_456",
    "wallet:user_456"
  ]
}
```

### Unsubscribe Message

```json
{
  "type": "unsubscribe",
  "channels": [
    "markets:fixture_123"
  ]
}
```

## Server Message Protocol

### Event Message

```json
{
  "type": "event",
  "channel": "markets:fixture_123",
  "eventId": "evt_abc123",
  "data": {
    "marketId": "m_123",
    "odds": 2.5,
    "status": "active"
  }
}
```

## Channel Naming

Channels follow a pattern of `{namespace}:{identifier}`:

- **Markets**: `markets:{fixtureId}` - Market updates for a specific fixture
- **Fixtures**: `fixtures:{sportKey}` - Fixture updates for a sport (e.g., `fixtures:soccer`)
- **Bets**: `bets:{userId}` - Bet updates for a specific user
- **Wallet**: `wallet:{userId}` - Wallet updates for a specific user

## Broadcasting Events

### Using the Hub Directly

```go
// Broadcast raw bytes
hub.Broadcast("markets:fixture_123", []byte(`{"type":"event","data":"..."`))

// Broadcast typed event
hub.BroadcastEvent("markets:fixture_123", "evt_123", "price_update", map[string]interface{}{
    "odds": 2.5,
})
```

### Using the Notifier Interface

```go
// Get the hub as a Notifier
var notifier ws.Notifier = hub

// Notify market updates
notifier.NotifyMarketUpdate("fixture_123", map[string]interface{}{
    "odds": 2.5,
    "status": "active",
})

// Notify fixture updates
notifier.NotifyFixtureUpdate("soccer", map[string]interface{}{
    "fixtureId": "f_123",
    "status": "live",
})

// Notify bet updates
notifier.NotifyBetUpdate("user_456", map[string]interface{}{
    "betId": "b_789",
    "status": "won",
})

// Notify wallet updates
notifier.NotifyWalletUpdate("user_456", map[string]interface{}{
    "balance": 10000,
    "currency": "GBP",
})
```

## Integration with Services

Services can access the Hub to broadcast events:

```go
// In a service handler
func (s *MyService) UpdateMarket(fixtureID string, data interface{}) {
    // ... update logic ...
    s.notifier.NotifyMarketUpdate(fixtureID, data)
}
```

The Hub implements the `Notifier` interface, so it can be injected into services.

## Heartbeat Mechanism

- **Ping Interval**: 30 seconds
- **Pong Deadline**: 60 seconds
- Automatically maintained by the Client

## Limits

- **Max Message Size**: 512 KB
- **Send Buffer**: 256 messages per client
- **Write Timeout**: 10 seconds
- **Subscription Buffer**: 100 operations per hub

## Goroutine Lifecycle

Each client spawns two goroutines:

1. **Read Pump**: Reads messages from the client, processes subscriptions
2. **Write Pump**: Sends messages from the hub, handles ping/pong

Both gracefully terminate on client disconnect or context cancellation.

## Testing

Run tests with:

```bash
go test -v ./services/gateway/internal/ws
```

Tests cover:
- Subscribe/unsubscribe operations
- Broadcasting messages
- Client disconnect cleanup
- Multi-channel operations
- Notifier interface implementation

## Error Handling

### Authentication Failures

Failed authentication returns HTTP 401 Unauthorized before upgrading to WebSocket.

### Connection Errors

- Invalid WebSocket upgrade: logged and connection rejected
- Message parsing errors: logged, connection continues
- Goroutine panics: recovered and logged

## Configuration

No environment variables required. Hub is created and started in `RegisterRoutes()`.

## Performance Notes

- Channel-based design ensures thread safety without locks in the message path
- Hub processes up to 100 operations per cycle (subscribe, unsubscribe, disconnect, broadcast)
- Each client has its own 256-message send buffer
- Graceful connection closing prevents goroutine leaks
