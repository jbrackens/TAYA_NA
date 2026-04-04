# WebSocket Module

Real-time bidirectional communication for the Phoenix Sportsbook gateway service.

## Overview

This module provides WebSocket support for the gateway, enabling real-time event streaming to connected clients. The implementation uses a hub-and-spoke architecture with channel-based subscriptions.

## Quick Start

### Connect to WebSocket

```bash
# Using Authorization header
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: x3JJHMbDL1EzLkh9GBhXDw==" \
  -H "Authorization: Bearer user123" \
  http://localhost:18080/ws
```

### Subscribe to Channels

```json
{
  "type": "subscribe",
  "channels": [
    "markets:fixture_123",
    "bets:user_123",
    "wallet:user_123"
  ]
}
```

### Receive Events

```json
{
  "type": "event",
  "channel": "markets:fixture_123",
  "eventId": "evt_abc",
  "data": {
    "odds": 2.5
  }
}
```

## Files

### Core Implementation

| File | Purpose |
|------|---------|
| `hub.go` | Central hub managing connections and subscriptions |
| `client.go` | Individual WebSocket connection handler |
| `handler.go` | HTTP upgrade handler with authentication |
| `message.go` | Message type definitions and serialization |
| `notifier.go` | Service notification interface |

### Tests

| File | Purpose |
|------|---------|
| `hub_test.go` | Comprehensive hub and integration tests |

### Documentation

| File | Purpose |
|------|---------|
| `README.md` | This file - module overview |
| `USAGE.md` | Client usage guide and protocol documentation |
| `INTEGRATION.md` | Service integration examples |
| `ARCHITECTURE.md` | Design, concurrency model, and performance |

## API Reference

### Hub

```go
type Hub struct { ... }

// Create a new hub
func NewHub() *Hub

// Start the hub's event loop (call in goroutine)
func (h *Hub) Run(ctx context.Context)

// Broadcast raw bytes to a channel
func (h *Hub) Broadcast(channel string, message []byte)

// Broadcast a typed event
func (h *Hub) BroadcastEvent(channel string, eventID string, eventType string, data interface{})

// Get all clients subscribed to a channel
func (h *Hub) GetChannelSubscribers(channel string) []*Client

// Metrics
func (h *Hub) ClientCount() int
func (h *Hub) ChannelCount() int

// Graceful shutdown
func (h *Hub) Close() error

// Notifier interface
func (h *Hub) NotifyMarketUpdate(fixtureID string, data interface{})
func (h *Hub) NotifyFixtureUpdate(sportKey string, data interface{})
func (h *Hub) NotifyBetUpdate(userID string, data interface{})
func (h *Hub) NotifyWalletUpdate(userID string, data interface{})
```

### Client

```go
type Client struct { ... }

// Create a new client
func NewClient(hub *Hub, conn *websocket.Conn, userID string) *Client

// Start read/write pumps
func (c *Client) Start()

// Send message to client
func (c *Client) SendMessage(data []byte)

// Get user ID
func (c *Client) UserID() string

// Check subscription
func (c *Client) IsSubscribedTo(channel string) bool
```

### Handler

```go
// Create HTTP handler for WebSocket upgrade
func NewHandler(hub *Hub) http.HandlerFunc
```

### Messages

```go
type SubscribeMessage struct {
	Type     MessageType
	Channels []string
}

type UnsubscribeMessage struct {
	Type     MessageType
	Channels []string
}

type Event struct {
	Type    MessageType
	Channel string
	EventID string
	Data    json.RawMessage
}

// Parse client message from JSON
func ParseClientMessage(data []byte) (*ClientMessage, error)
```

### Notifier Interface

```go
type Notifier interface {
	NotifyMarketUpdate(fixtureID string, data interface{})
	NotifyFixtureUpdate(sportKey string, data interface{})
	NotifyBetUpdate(userID string, data interface{})
	NotifyWalletUpdate(userID string, data interface{})
}
```

## Channel Names

Channels follow the pattern `{namespace}:{identifier}`:

- `markets:{fixtureId}` - Market updates for a fixture
- `fixtures:{sportKey}` - Fixture updates for a sport (e.g., `fixtures:soccer`)
- `bets:{userId}` - Bet updates for a user
- `wallet:{userId}` - Wallet updates for a user

## Registration

The WebSocket endpoint is automatically registered at `GET /ws` during gateway startup:

```go
// In internal/http/handlers.go
wsHub := ws.NewHub()
go wsHub.Run(context.Background())
registerWebSocketRoutes(mux, wsHub)
```

## Authentication

Clients must provide a Bearer token to establish a WebSocket connection:

- **Authorization header**: `Authorization: Bearer {token}`
- **Query parameter**: `?token={token}`

Token validation is performed on upgrade. Failed authentication returns HTTP 401.

## Message Protocol

### Client → Server

```json
{
  "type": "subscribe",
  "channels": ["markets:123", "fixtures:soccer"]
}
```

```json
{
  "type": "unsubscribe",
  "channels": ["markets:123"]
}
```

### Server → Client

```json
{
  "type": "event",
  "channel": "markets:123",
  "eventId": "evt_abc123",
  "data": {
    "odds": 2.5,
    "status": "active"
  }
}
```

## Heartbeat

- **Ping interval**: 30 seconds
- **Pong deadline**: 60 seconds
- Automatically managed by Client

## Limits

- **Max message size**: 512 KB
- **Per-client send buffer**: 256 messages
- **Hub command buffer**: 100 commands
- **Write timeout**: 10 seconds
- **Read deadline**: 60 seconds

## Error Handling

### Authentication Failures

Failed authentication returns HTTP 401 Unauthorized before WebSocket upgrade.

### Invalid Messages

Invalid JSON or unknown message types are logged. Connection continues.

### Network Errors

Connection drops are handled gracefully with automatic cleanup.

## Testing

Run tests:

```bash
go test -v ./services/gateway/internal/ws
```

Tests cover:
- Subscribe/unsubscribe operations
- Message broadcasting
- Client disconnect cleanup
- Multi-channel operations
- Notifier interface
- Event serialization

## Dependencies

- `github.com/gorilla/websocket` (v1.5.0+)
- Standard library: `context`, `encoding/json`, `log`, `net/http`, `time`

## Performance

| Operation | Time | Space |
|-----------|------|-------|
| Subscribe | O(1) | O(1) |
| Unsubscribe | O(1) | O(1) |
| Broadcast | O(n) | O(n) |
| Message | ~1-10ms | Per-client 256 msgs |

Where n = number of subscribers to channel

## Concurrency Model

- **Hub**: Single event loop in Run()
- **Clients**: Two goroutines per client (read/write pumps)
- **Services**: Can safely call hub.Broadcast() from any goroutine
- **Thread-safety**: No shared mutable state, channel-based synchronization

## Examples

### Broadcasting from a Service

```go
notifier.NotifyMarketUpdate("fixture_123", map[string]interface{}{
    "odds": 2.5,
    "status": "active",
})
```

### Subscribing from Client

```javascript
ws.send(JSON.stringify({
    type: 'subscribe',
    channels: ['markets:fixture_123']
}));
```

### Handling Events

```javascript
ws.onmessage = function(event) {
    const msg = JSON.parse(event.data);
    if (msg.type === 'event') {
        console.log(`Event: ${msg.channel} - ${msg.eventId}`);
        console.log(msg.data);
    }
};
```

## Integration

Services can inject the Hub as a Notifier:

```go
type MyService struct {
    notifier ws.Notifier
}

func (s *MyService) UpdateMarket(id string, data interface{}) {
    s.notifier.NotifyMarketUpdate(id, data)
}
```

## Documentation

- **USAGE.md** - Complete protocol and usage guide
- **INTEGRATION.md** - Service integration patterns and examples
- **ARCHITECTURE.md** - Design decisions, concurrency model, performance analysis

## Future Enhancements

- Integration with auth service for token validation
- Presence tracking for user awareness
- Message acknowledgments for delivery guarantees
- Message history for catchup on reconnect
- Prometheus metrics export
- Message compression
- Hub clustering for multi-instance deployments
- Per-client rate limiting
