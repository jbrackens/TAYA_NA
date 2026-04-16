# WebSocket Examples

## Client Examples

### JavaScript/Browser

```javascript
// Connect to WebSocket with authentication
const token = localStorage.getItem('auth_token');
const ws = new WebSocket(`ws://localhost:18080/ws?token=${token}`);

// Handle connection open
ws.onopen = function(event) {
    console.log('Connected to WebSocket');

    // Subscribe to multiple channels
    ws.send(JSON.stringify({
        type: 'subscribe',
        channels: [
            'bets:user123',
            'wallet:user123',
            'markets:fixture456',
            'fixtures:soccer'
        ]
    }));
};

// Handle incoming events
ws.onmessage = function(event) {
    const message = JSON.parse(event.data);

    if (message.type === 'event') {
        const [namespace, id] = message.channel.split(':');

        switch(namespace) {
            case 'bets':
                handleBetUpdate(message.data);
                break;
            case 'wallet':
                handleWalletUpdate(message.data);
                break;
            case 'markets':
                handleMarketUpdate(message.data);
                break;
            case 'fixtures':
                handleFixtureUpdate(message.data);
                break;
        }
    }
};

// Handle errors
ws.onerror = function(event) {
    console.error('WebSocket error:', event);
};

// Handle disconnection
ws.onclose = function(event) {
    console.log('WebSocket closed');
    // Attempt to reconnect
};

// Helper functions
function handleBetUpdate(data) {
    console.log('Bet update:', data);
    // Update UI with bet data
    if (data.status === 'won') {
        showNotification(`Bet won! Prize: ${data.winnings}`);
    }
}

function handleWalletUpdate(data) {
    console.log('Wallet update:', data);
    updateWalletBalance(data.balance);
}

function handleMarketUpdate(data) {
    console.log('Market update:', data);
    updateOdds(data);
}

function handleFixtureUpdate(data) {
    console.log('Fixture update:', data);
    updateFixtureStatus(data);
}

// Unsubscribe from a channel
function unsubscribeFromMarket(fixtureId) {
    ws.send(JSON.stringify({
        type: 'unsubscribe',
        channels: [`markets:${fixtureId}`]
    }));
}

// Graceful disconnect
function disconnect() {
    ws.close();
}
```

### Python Client

```python
import asyncio
import websockets
import json

async def connect_websocket(token):
    uri = f"ws://localhost:18080/ws?token={token}"

    async with websockets.connect(uri) as websocket:
        # Subscribe to channels
        subscribe_msg = {
            "type": "subscribe",
            "channels": [
                "bets:user123",
                "wallet:user123",
                "markets:fixture456"
            ]
        }
        await websocket.send(json.dumps(subscribe_msg))

        # Receive messages
        async for message in websocket:
            event = json.loads(message)

            if event['type'] == 'event':
                handle_event(event['channel'], event['data'])

def handle_event(channel, data):
    namespace, resource_id = channel.split(':')

    if namespace == 'bets':
        print(f"Bet update for {resource_id}: {data}")
    elif namespace == 'wallet':
        print(f"Wallet update: {data}")
    elif namespace == 'markets':
        print(f"Market update for {resource_id}: {data}")

# Run the client
asyncio.run(connect_websocket("my_token"))
```

### cURL (for testing)

```bash
# Basic connection with authentication
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: x3JJHMbDL1EzLkh9GBhXDw==" \
  -H "Authorization: Bearer user123" \
  http://localhost:18080/ws

# With query parameter
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: x3JJHMbDL1EzLkh9GBhXDw==" \
  'http://localhost:18080/ws?token=user123'
```

## Service Integration Examples

### Bet Service

```go
package bets

import (
    "context"
    "phoenix-revival/gateway/internal/ws"
)

type Service struct {
    repository domain.BetRepository
    wallet     *wallet.Service
    notifier   ws.Notifier
}

func NewService(repo domain.BetRepository, walletSvc *wallet.Service, notifier ws.Notifier) *Service {
    return &Service{
        repository: repo,
        wallet:     walletSvc,
        notifier:   notifier,
    }
}

// PlaceBet places a new bet and notifies the user
func (s *Service) PlaceBet(ctx context.Context, req *PlaceBetRequest) (*Bet, error) {
    // Validate request
    if err := req.Validate(); err != nil {
        return nil, err
    }

    // Create the bet
    bet := &Bet{
        UserID:    req.UserID,
        FixtureID: req.FixtureID,
        Stake:     req.Stake,
        Odds:      req.Odds,
        Status:    "placed",
        CreatedAt: time.Now(),
    }

    // Save to repository
    if err := s.repository.Save(ctx, bet); err != nil {
        return nil, err
    }

    // Debit from user wallet
    _, err := s.wallet.Debit(wallet.MutationRequest{
        UserID:         req.UserID,
        AmountCents:    req.Stake,
        IdempotencyKey: bet.ID,
        Reason:         "bet_placed",
    })
    if err != nil {
        return nil, err
    }

    // Notify user via WebSocket
    s.notifier.NotifyBetUpdate(req.UserID, map[string]interface{}{
        "betId":      bet.ID,
        "fixtureId":  bet.FixtureID,
        "status":     "placed",
        "stake":      bet.Stake,
        "odds":       bet.Odds,
        "createdAt":  bet.CreatedAt.Unix(),
    })

    return bet, nil
}

// SettleBet settles a bet and notifies the user
func (s *Service) SettleBet(ctx context.Context, betID string, result string) error {
    // Get bet
    bet, err := s.repository.GetByID(ctx, betID)
    if err != nil {
        return err
    }

    // Calculate result
    var winnings int64
    if result == "won" {
        winnings = int64(float64(bet.Stake) * bet.Odds)
        bet.Status = "won"
    } else {
        bet.Status = result // lost, void, etc.
    }

    // Update repository
    if err := s.repository.Update(ctx, bet); err != nil {
        return err
    }

    // Credit winnings if won
    if result == "won" {
        _, err := s.wallet.Credit(wallet.MutationRequest{
            UserID:         bet.UserID,
            AmountCents:    winnings,
            IdempotencyKey: betID + "_settlement",
            Reason:         "bet_won",
        })
        if err != nil {
            return err
        }
    }

    // Notify user via WebSocket
    s.notifier.NotifyBetUpdate(bet.UserID, map[string]interface{}{
        "betId":    bet.ID,
        "status":   bet.Status,
        "result":   result,
        "winnings": winnings,
    })

    return nil
}
```

### Market Service

```go
package market

import (
    "context"
    "phoenix-revival/gateway/internal/ws"
)

type Service struct {
    repository domain.MarketRepository
    notifier   ws.Notifier
}

func NewService(repo domain.MarketRepository, notifier ws.Notifier) *Service {
    return &Service{
        repository: repo,
        notifier:   notifier,
    }
}

// UpdateOdds updates market odds and notifies subscribers
func (s *Service) UpdateOdds(ctx context.Context, fixtureID string, newOdds float64) error {
    // Update in repository
    market, err := s.repository.GetByFixtureID(ctx, fixtureID)
    if err != nil {
        return err
    }

    market.Odds = newOdds
    if err := s.repository.Update(ctx, market); err != nil {
        return err
    }

    // Notify all subscribers
    s.notifier.NotifyMarketUpdate(fixtureID, map[string]interface{}{
        "fixtureId": fixtureID,
        "odds":      newOdds,
        "timestamp": time.Now().Unix(),
    })

    return nil
}

// UpdateMarketStatus updates market status
func (s *Service) UpdateMarketStatus(ctx context.Context, fixtureID string, status string) error {
    market, err := s.repository.GetByFixtureID(ctx, fixtureID)
    if err != nil {
        return err
    }

    market.Status = status
    if err := s.repository.Update(ctx, market); err != nil {
        return err
    }

    // Notify subscribers
    s.notifier.NotifyMarketUpdate(fixtureID, map[string]interface{}{
        "fixtureId": fixtureID,
        "status":    status,
        "timestamp": time.Now().Unix(),
    })

    return nil
}
```

### Wallet Service

```go
package wallet

import (
    "phoenix-revival/gateway/internal/ws"
)

type Service struct {
    repository WalletRepository
    notifier   ws.Notifier
}

func (s *Service) SetNotifier(notifier ws.Notifier) {
    s.notifier = notifier
}

// Credit adds funds to a user's wallet
func (s *Service) Credit(req MutationRequest) (*Entry, error) {
    entry, err := s.repository.Credit(req)
    if err != nil {
        return nil, err
    }

    // Notify user of wallet update
    if s.notifier != nil {
        s.notifier.NotifyWalletUpdate(req.UserID, map[string]interface{}{
            "action":      "credit",
            "amount":      req.AmountCents,
            "balance":     entry.BalanceCents,
            "reason":      req.Reason,
            "timestamp":   time.Now().Unix(),
        })
    }

    return entry, nil
}

// Debit removes funds from a user's wallet
func (s *Service) Debit(req MutationRequest) (*Entry, error) {
    entry, err := s.repository.Debit(req)
    if err != nil {
        return nil, err
    }

    // Notify user of wallet update
    if s.notifier != nil {
        s.notifier.NotifyWalletUpdate(req.UserID, map[string]interface{}{
            "action":      "debit",
            "amount":      req.AmountCents,
            "balance":     entry.BalanceCents,
            "reason":      req.Reason,
            "timestamp":   time.Now().Unix(),
        })
    }

    return entry, nil
}
```

### Match Tracker Service

```go
package matchtracker

import (
    "context"
    "phoenix-revival/gateway/internal/ws"
)

type Service struct {
    repository domain.MatchRepository
    notifier   ws.Notifier
}

func (s *Service) SetNotifier(notifier ws.Notifier) {
    s.notifier = notifier
}

// UpdateFixture updates a fixture and notifies subscribers
func (s *Service) UpdateFixture(ctx context.Context, fixture *Fixture) error {
    if err := s.repository.SaveFixture(ctx, fixture); err != nil {
        return err
    }

    // Notify subscribers
    if s.notifier != nil {
        s.notifier.NotifyFixtureUpdate(fixture.SportKey, map[string]interface{}{
            "fixtureId":   fixture.ID,
            "status":      fixture.Status,
            "currentTime": fixture.CurrentTime,
            "score":       fixture.Score,
            "timestamp":   time.Now().Unix(),
        })
    }

    return nil
}

// UpdateTimeline updates the match timeline
func (s *Service) UpdateTimeline(ctx context.Context, fixtureID string, event *TimelineEvent) error {
    if err := s.repository.AddTimelineEvent(ctx, fixtureID, event); err != nil {
        return err
    }

    // Get updated fixture for notification
    fixture, err := s.repository.GetFixture(ctx, fixtureID)
    if err != nil {
        return err
    }

    // Notify about the timeline event
    if s.notifier != nil {
        s.notifier.NotifyFixtureUpdate(fixture.SportKey, map[string]interface{}{
            "fixtureId":      fixture.ID,
            "event":          event.Type,
            "eventTime":      event.Time,
            "description":    event.Description,
            "currentScore":   fixture.Score,
            "timestamp":      time.Now().Unix(),
        })
    }

    return nil
}
```

## Testing Examples

### Unit Test with Mock Notifier

```go
package bets

import (
    "context"
    "testing"
    "phoenix-revival/gateway/internal/ws"
)

type MockNotifier struct {
    notifications []MockNotification
}

type MockNotification struct {
    Channel string
    Data    interface{}
}

func (m *MockNotifier) NotifyMarketUpdate(fixtureID string, data interface{}) {
    m.notifications = append(m.notifications, MockNotification{
        Channel: "markets:" + fixtureID,
        Data:    data,
    })
}

func (m *MockNotifier) NotifyFixtureUpdate(sportKey string, data interface{}) {
    m.notifications = append(m.notifications, MockNotification{
        Channel: "fixtures:" + sportKey,
        Data:    data,
    })
}

func (m *MockNotifier) NotifyBetUpdate(userID string, data interface{}) {
    m.notifications = append(m.notifications, MockNotification{
        Channel: "bets:" + userID,
        Data:    data,
    })
}

func (m *MockNotifier) NotifyWalletUpdate(userID string, data interface{}) {
    m.notifications = append(m.notifications, MockNotification{
        Channel: "wallet:" + userID,
        Data:    data,
    })
}

func TestBetServiceNotifiesOnPlace(t *testing.T) {
    // Setup
    mockNotifier := &MockNotifier{}
    repo := &MockBetRepository{}
    walletService := &MockWalletService{}

    service := NewService(repo, walletService, mockNotifier)

    // Execute
    bet, err := service.PlaceBet(context.Background(), &PlaceBetRequest{
        UserID:    "user_123",
        FixtureID: "fixture_456",
        Stake:     1000,
        Odds:      2.5,
    })

    // Assert
    if err != nil {
        t.Fatalf("PlaceBet failed: %v", err)
    }

    if len(mockNotifier.notifications) != 1 {
        t.Fatalf("expected 1 notification, got %d", len(mockNotifier.notifications))
    }

    notif := mockNotifier.notifications[0]
    if notif.Channel != "bets:user_123" {
        t.Errorf("expected channel bets:user_123, got %s", notif.Channel)
    }

    data := notif.Data.(map[string]interface{})
    if data["betId"] != bet.ID {
        t.Error("notification missing bet ID")
    }
    if data["status"] != "placed" {
        t.Error("notification missing status")
    }
}
```

## Advanced Patterns

### Batched Updates

```go
// Update multiple markets efficiently
func (s *Service) UpdateMultipleMarkets(ctx context.Context, updates map[string]float64) error {
    for fixtureID, odds := range updates {
        market, err := s.repository.GetByFixtureID(ctx, fixtureID)
        if err != nil {
            continue
        }

        market.Odds = odds
        if err := s.repository.Update(ctx, market); err != nil {
            continue
        }

        // Notify each market update
        s.notifier.NotifyMarketUpdate(fixtureID, map[string]interface{}{
            "odds":      odds,
            "timestamp": time.Now().Unix(),
        })
    }
    return nil
}
```

### Conditional Notifications

```go
// Only notify if significant change
func (s *Service) UpdateOddsIfSignificant(ctx context.Context, fixtureID string, newOdds float64) error {
    market, err := s.repository.GetByFixtureID(ctx, fixtureID)
    if err != nil {
        return err
    }

    // Only notify if change is > 0.1
    if diff := math.Abs(market.Odds - newOdds); diff < 0.1 {
        return nil
    }

    market.Odds = newOdds
    if err := s.repository.Update(ctx, market); err != nil {
        return err
    }

    s.notifier.NotifyMarketUpdate(fixtureID, map[string]interface{}{
        "oldOdds": market.Odds,
        "newOdds": newOdds,
        "change":  newOdds - market.Odds,
    })

    return nil
}
```

## Troubleshooting

### Connection Issues

```javascript
// Auto-reconnect with exponential backoff
class WebSocketClient {
    constructor(url) {
        this.url = url;
        this.maxRetries = 5;
        this.retryCount = 0;
        this.retryDelay = 1000;
        this.connect();
    }

    connect() {
        try {
            this.ws = new WebSocket(this.url);

            this.ws.onopen = () => {
                console.log('Connected');
                this.retryCount = 0;
                this.retryDelay = 1000;
            };

            this.ws.onclose = () => {
                this.reconnect();
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
        } catch (error) {
            this.reconnect();
        }
    }

    reconnect() {
        if (this.retryCount >= this.maxRetries) {
            console.error('Max reconnection attempts reached');
            return;
        }

        this.retryCount++;
        const delay = this.retryDelay * Math.pow(2, this.retryCount - 1);
        console.log(`Reconnecting in ${delay}ms...`);

        setTimeout(() => this.connect(), delay);
    }
}

// Usage
const client = new WebSocketClient(
    `ws://localhost:18080/ws?token=${token}`
);
```
