# WebSocket Architecture

## Design Overview

The WebSocket module implements a real-time event broadcasting system for the Phoenix Sportsbook gateway. It uses a hub-and-spoke architecture with channel-based subscriptions.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    HTTP Server                          │
│  (net/http, middleware chain)                           │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
                ┌──────────────┐
                │  Handler     │  ◄── Upgrade HTTP to WebSocket
                │  (handler.go)│      Authenticate token
                └──────┬───────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│                      Hub                                 │
│  ┌────────────────────────────────────────────────────┐  │
│  │  channels map[string]map[*Client]bool             │  │
│  │  - markets:fixture_1 -> {client1, client2}        │  │
│  │  - fixtures:soccer -> {client3}                   │  │
│  │  - bets:user_1 -> {client1}                       │  │
│  │  - wallet:user_1 -> {client1}                     │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Command Channels                                  │  │
│  │  - subscribe <-- Client operations                │  │
│  │  - unsubscribe <-- Client operations              │  │
│  │  - disconnect <-- Client cleanup                  │  │
│  │  - broadcast <-- Service notifications            │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Run() - Event loop                                │  │
│  │  Processes channel commands in sequential order    │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
    ┌────────┐           ┌────────┐          ┌────────┐
    │ Client │           │ Client │          │ Client │
    │   #1   │           │   #2   │          │   #3   │
    └────────┘           └────────┘          └────────┘
```

## Component Responsibilities

### Handler (HTTP Upgrade)

```
HTTP GET /ws
    │
    ├─ Validate HTTP method
    ├─ Extract & validate Bearer token
    ├─ Upgrade HTTP connection
    └─ Create Client
    └─ Start Client pumps
```

**File**: `handler.go`

Responsibilities:
- Receive HTTP upgrade requests
- Authenticate users via Bearer token (header or query param)
- Create WebSocket connection
- Instantiate Client and register with Hub

**Thread Safety**: Safe - only called from HTTP handler goroutine

### Hub (Central Manager)

```
Hub.Run()
    │
    ├─ Read subscribe channel
    │  └─ Add Client to channel map
    │
    ├─ Read unsubscribe channel
    │  └─ Remove Client from channel map
    │
    ├─ Read disconnect channel
    │  └─ Remove Client from all channels
    │
    └─ Read broadcast channel
       └─ Send message to all Clients in channel
```

**File**: `hub.go`

Responsibilities:
- Manage client subscriptions
- Route broadcast messages to subscribers
- Handle client lifecycle (connect/disconnect)
- Implement Notifier interface for services

**Thread Safety**:
- Uses channel-based concurrency (no mutexes in hot path)
- Single event loop in Run()
- All channel operations are atomic

**Scaling Considerations**:
- Channel buffers: 100 for commands, 256 per client for messages
- Operations are O(1) for most cases
- Broadcast is O(n) where n is subscribers to a channel
- Memory: O(c + s) where c is clients, s is subscriptions

### Client (Connection Manager)

```
Client.Start()
    │
    ├─ readPump()
    │  ├─ Parse client messages
    │  ├─ Handle subscribe
    │  └─ Handle unsubscribe
    │
    └─ writePump()
       ├─ Send hub messages
       ├─ Send periodic pings
       └─ Handle connection closure
```

**File**: `client.go`

Responsibilities:
- Read messages from WebSocket connection
- Process subscription/unsubscription requests
- Send messages to the client
- Implement heartbeat (ping/pong)
- Graceful cleanup on disconnect

**Goroutine Model**:
- Two goroutines per client (read and write pump)
- Decoupled via channel (send buffer)
- Graceful shutdown via context cancellation

**Message Flow**:
```
Network Input
    │
    ▼
readPump()
    │
    ├─ Parse message
    │  └─ type: subscribe|unsubscribe
    │
    └─ Call hub.subscribe() or hub.unsubscribe()
         (sends to channel)


Hub.Run() event loop
    │
    ├─ Processes command
    │  └─ Updates channel map
    │
    └─ (For broadcasts)
       └─ Iterates subscribers
          └─ Calls client.SendMessage()


client.send channel
    │
    ▼
writePump()
    │
    ├─ Receives message
    │  └─ conn.WriteMessage()
    │
    ├─ Periodic ping
    │  └─ conn.WriteMessage(PingMessage)
    │
    └─ Network Output
```

## Concurrency Model

### Thread-Safe Operations

1. **Hub.Broadcast()** - Safe to call from any goroutine
   ```go
   // Called from service goroutines
   go func() {
       hub.Broadcast("markets:123", data)
   }()
   ```

2. **Client.SendMessage()** - Safe to call from any goroutine
   ```go
   // Called from Hub.Run() event loop
   client.SendMessage(data)
   ```

3. **Client operations** - Only in Client's goroutines
   ```go
   // readPump - reads from network
   // writePump - writes to network
   ```

### Synchronization Points

```
Service                    Hub Event Loop             Client Goroutines
   │                             │                            │
   └─── Broadcast() ─────┐       │                            │
                         │       │                            │
                         └──► broadcast channel               │
                                 │                            │
                             Process broadcast                │
                              in event loop                   │
                                 │                            │
                                 ├─────── SendMessage() ────► send channel
                                 │                            │
                                 │                        writePump()
                                 │                            │
                                 │                        WriteMessage()
                                 │                            │
                                 │                        Network
```

## Message Flow Examples

### Client Subscribes

```
1. Client sends JSON over WebSocket
   {"type": "subscribe", "channels": ["markets:123"]}

2. readPump() receives raw bytes
   - Parses JSON
   - Calls handleSubscribe("markets:123")

3. handleSubscribe() calls hub.subscribe()
   - Sends subscribeCmd to channel

4. Hub.Run() event loop
   - Receives subscribeCmd
   - Adds client to channels["markets:123"]

5. When broadcast happens
   - Hub finds all clients in channels["markets:123"]
   - Calls client.SendMessage(event)

6. Client.SendMessage()
   - Places message in send buffer
   - (Non-blocking, returns immediately)

7. writePump()
   - Receives message from send buffer
   - Calls conn.WriteMessage()

8. Network
   - Message sent to client
```

### Hub Broadcasts to Multiple Clients

```
hub.Broadcast("markets:123", eventData)
    │
    ├─ Places broadcast command in channel (non-blocking)
    │
    ▼ (In Hub.Run() event loop)

Receives broadcast command
    │
    ├─ Looks up channels["markets:123"]
    │
    ├─ Iterates map of clients
    │
    ├─ For each client
    │  └─ client.SendMessage(message)
    │      └─ Places in send buffer (non-blocking)
    │
    ▼ (Back in clients' writePump() goroutines)

Each client independently:
    ├─ Receives message from send buffer
    ├─ WriteMessage() to network
    └─ Continues independently
```

## Performance Characteristics

### Time Complexity

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| Subscribe | O(1) | Hash map insert |
| Unsubscribe | O(1) | Hash map delete |
| Broadcast | O(n) | n = subscribers to channel |
| Client message | O(1) | Non-blocking send |
| Disconnect | O(m) | m = channels subscribed to |

### Space Complexity

| Resource | Usage | Notes |
|----------|-------|-------|
| Hub storage | O(c + s) | c = clients, s = subscriptions |
| Per-client send buffer | O(256 messages) | Configurable |
| Channel buffer | O(100 commands) | Configurable |

### Network I/O

- **Ping interval**: 30 seconds
- **Message latency**: ~1-10ms per hop (in-process)
- **Broadcast latency**: ~10-50ms to all subscribers (depends on client count)

## Failure Modes and Recovery

### Connection Drops

```
Network disconnects
    │
    ├─ readPump() error
    │  └─ Calls close()
    │
    └─ writePump() error
       └─ Defers close()

close()
    ├─ Cancels context (signals other pump)
    ├─ Unsubscribes from all channels
    ├─ Notifies hub.disconnect()
    └─ Closes send channel
```

### Slow Client

```
writePump() can't send fast enough
    │
    ├─ send buffer fills to 256
    ├─ Client.SendMessage() blocks
    │
    ▼ Hub.Run() alternative action
    - Could implement backpressure
    - Currently: blocks hub briefly
```

### Hub Shutdown

```
ctx.Done()
    │
    ├─ Hub.Run() exits event loop
    ├─ closeAll() removes all clients
    │
    ▼ Each client's close()
    - Cancels context
    - Signals goroutines to exit
    - Closes send channel
```

## Security Considerations

### Authentication

- Bearer token validation on upgrade (required)
- Currently: Token is user ID (placeholder)
- TODO: Integrate with auth service

### Channel Isolation

- Channels follow `namespace:userId` pattern
- Users can only subscribe to their own channels
- No broadcast-to-all capability

### Message Validation

- Max message size: 512 KB
- Invalid JSON is rejected
- Unknown message types are logged

### DoS Protection

- Connection limits: system TCP limit
- Message rate: per-client buffer (not global)
- Broadcast rate: depends on Hub processing
- Memory: bounded by client count

## Monitoring and Observability

### Available Metrics

```go
hub.ClientCount()     // Total connected clients
hub.ChannelCount()    // Active channels
```

### Logging

- Client connect/disconnect
- Subscribe/unsubscribe
- Upgrade errors
- Message parse errors
- Broadcast operations (via services)

### Future Enhancements

- Per-channel subscriber count
- Message delivery latency
- Client message rate
- Hub event loop latency

## Design Decisions

### Why Channel-Based Concurrency?

1. **Clarity**: Control flow is explicit
2. **Safety**: No data races (Go scheduler enforces)
3. **Fairness**: Each operation gets CPU time
4. **Simplicity**: No mutex deadlock risk

### Why Two Pumps per Client?

1. **Responsive**: Network I/O doesn't block message delivery
2. **Clean shutdown**: Each pump can exit independently
3. **Standard pattern**: Follows Go WebSocket best practices

### Why Hub Event Loop?

1. **Consistency**: All state changes in one place
2. **Ordering**: Commands processed in order
3. **No locks**: Eliminates lock contention
4. **Graceful shutdown**: Context cancellation signal

### Why Send Buffer per Client?

1. **Isolation**: Fast clients don't affect slow ones
2. **Backpressure**: Buffer fills for slow clients
3. **GC friendly**: Fixed size, reusable
4. **Bounded memory**: O(clients * buffer_size)

## Future Enhancements

1. **Presence channels**: Track active users
2. **Private channels**: Authorization per channel
3. **Acknowledgments**: Ensure message delivery
4. **Message history**: Catch-up on reconnect
5. **Metrics**: Prometheus integration
6. **Compression**: Binary messages with compression
7. **Clustering**: Hub-to-hub replication
8. **Rate limiting**: Per-client message rate
