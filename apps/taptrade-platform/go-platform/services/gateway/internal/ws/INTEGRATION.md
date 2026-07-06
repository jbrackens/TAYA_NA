# WebSocket Integration Guide for Services

This document shows how to integrate the WebSocket Notifier with existing gateway services.

## Overview

The Hub implements the `Notifier` interface, which other services can use to push real-time updates to connected clients. This decouples services from the WebSocket layer while maintaining strong type safety.

## Notifier Interface

```go
type Notifier interface {
	NotifyMarketUpdate(fixtureID string, data interface{})
	NotifyFixtureUpdate(sportKey string, data interface{})
	NotifyBetUpdate(userID string, data interface{})
	NotifyWalletUpdate(userID string, data interface{})
}
```

## Service Integration Pattern

### 1. Inject Notifier into Service

```go
type MarketService struct {
	repository domain.ReadRepository
	notifier   ws.Notifier
}

func NewMarketService(repo domain.ReadRepository, notifier ws.Notifier) *MarketService {
	return &MarketService{
		repository: repo,
		notifier:   notifier,
	}
}
```

### 2. Broadcast Updates in Service Methods

```go
func (s *MarketService) UpdateMarketOdds(ctx context.Context, fixtureID string, odds float64) error {
	// Update the market in the repository
	market, err := s.repository.GetMarket(ctx, fixtureID)
	if err != nil {
		return err
	}

	market.Odds = odds
	if err := s.repository.SaveMarket(ctx, market); err != nil {
		return err
	}

	// Broadcast the update to all subscribed clients
	s.notifier.NotifyMarketUpdate(fixtureID, map[string]interface{}{
		"fixtureId": fixtureID,
		"odds": odds,
		"timestamp": time.Now().Unix(),
	})

	return nil
}
```

## Example Integrations

### Bet Service Integration

```go
// In bet_service.go
type BetService struct {
	repository domain.ReadRepository
	wallet     *wallet.Service
	notifier   ws.Notifier  // Add notifier
}

func NewBetService(repo domain.ReadRepository, walletSvc *wallet.Service, notifier ws.Notifier) *BetService {
	return &BetService{
		repository: repo,
		wallet:     walletSvc,
		notifier:   notifier,
	}
}

func (s *BetService) PlaceBet(ctx context.Context, req *BetRequest) (*Bet, error) {
	bet, err := s.createBet(ctx, req)
	if err != nil {
		return nil, err
	}

	// Notify the user that their bet was placed
	s.notifier.NotifyBetUpdate(req.UserID, map[string]interface{}{
		"betId": bet.ID,
		"status": "placed",
		"stake": bet.Stake,
		"odds": bet.Odds,
	})

	return bet, nil
}

func (s *BetService) SettleBet(ctx context.Context, betID, userID string, result string) error {
	if err := s.repository.SettleBet(ctx, betID, result); err != nil {
		return err
	}

	// Notify the user that their bet was settled
	s.notifier.NotifyBetUpdate(userID, map[string]interface{}{
		"betId": betID,
		"status": "settled",
		"result": result,
	})

	return nil
}
```

### Wallet Service Integration

```go
// In wallet_service.go
type Service struct {
	repository domain.WalletRepository
	notifier   ws.Notifier  // Add notifier
}

func (s *Service) Credit(req MutationRequest) (*WalletEntry, error) {
	entry, err := s.repository.Credit(req)
	if err != nil {
		return nil, err
	}

	// Notify the user of the wallet update
	s.notifier.NotifyWalletUpdate(req.UserID, map[string]interface{}{
		"action": "credit",
		"amount": req.AmountCents,
		"balance": entry.BalanceCents,
		"reason": req.Reason,
	})

	return entry, nil
}

func (s *Service) Debit(req MutationRequest) (*WalletEntry, error) {
	entry, err := s.repository.Debit(req)
	if err != nil {
		return nil, err
	}

	// Notify the user of the wallet update
	s.notifier.NotifyWalletUpdate(req.UserID, map[string]interface{}{
		"action": "debit",
		"amount": req.AmountCents,
		"balance": entry.BalanceCents,
		"reason": req.Reason,
	})

	return entry, nil
}
```

### Match Tracker Integration

```go
// In matchtracker/service.go
type Service struct {
	repository domain.ReadRepository
	notifier   ws.Notifier  // Add notifier
}

func (s *Service) UpdateFixture(ctx context.Context, fixture *Fixture) error {
	if err := s.repository.SaveFixture(ctx, fixture); err != nil {
		return err
	}

	// Notify all clients subscribed to this sport's fixtures
	s.notifier.NotifyFixtureUpdate(fixture.SportKey, map[string]interface{}{
		"fixtureId": fixture.ID,
		"status": fixture.Status,
		"currentTime": fixture.CurrentTime,
		"score": fixture.Score,
	})

	return nil
}
```

## Registration in handlers.go

Update the route registration to pass the notifier to services:

```go
func RegisterRoutes(mux *stdhttp.ServeMux, service string) {
	// ... existing code ...

	// Initialize WebSocket hub
	wsHub := ws.NewHub()
	go wsHub.Run(context.Background())

	// Create services with notifier
	betService := bets.NewServiceFromEnv(repository, walletService, wsHub)
	walletService.SetNotifier(wsHub)
	matchTrackerService.SetNotifier(wsHub)

	// ... rest of route registration ...
}
```

## Client-Side Subscription Example

```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:18080/ws?token=user123');

// Handle connection
ws.onopen = function(event) {
    // Subscribe to relevant channels
    ws.send(JSON.stringify({
        type: 'subscribe',
        channels: [
            'bets:user123',
            'wallet:user123',
            'markets:fixture_456'
        ]
    }));
};

// Handle events from server
ws.onmessage = function(event) {
    const message = JSON.parse(event.data);

    if (message.type === 'event') {
        switch(message.channel.split(':')[0]) {
            case 'bets':
                updateBetsUI(message.data);
                break;
            case 'wallet':
                updateWalletUI(message.data);
                break;
            case 'markets':
                updateMarketUI(message.data);
                break;
        }
    }
};

// Unsubscribe from channels
function unsubscribeFromMarket(fixtureId) {
    ws.send(JSON.stringify({
        type: 'unsubscribe',
        channels: [`markets:${fixtureId}`]
    }));
}
```

## Testing Services with WebSocket

```go
func TestBetServiceNotifiesOnPlace(t *testing.T) {
	// Create a mock notifier
	notifier := &MockNotifier{
		notifications: make([]Notification, 0),
	}

	// Create service with mock notifier
	betService := bets.NewBetService(repo, wallet, notifier)

	// Place a bet
	bet, err := betService.PlaceBet(ctx, &BetRequest{
		UserID: "user_123",
		Stake: 1000,
	})

	// Verify notification was sent
	if len(notifier.notifications) != 1 {
		t.Fatalf("expected 1 notification, got %d", len(notifier.notifications))
	}

	if notifier.notifications[0].Channel != "bets:user_123" {
		t.Errorf("expected bets:user_123 channel")
	}
}

type MockNotifier struct {
	notifications []Notification
}

func (m *MockNotifier) NotifyBetUpdate(userID string, data interface{}) {
	m.notifications = append(m.notifications, Notification{
		Channel: "bets:" + userID,
		Data: data,
	})
}

// ... implement other notifier methods ...
```

## Error Handling

Services should handle notifier errors gracefully:

```go
func (s *MyService) UpdateWithFallback(ctx context.Context, req *Request) error {
	// Update the resource
	if err := s.update(ctx, req); err != nil {
		return err
	}

	// Attempt to notify, but don't fail if notification fails
	defer func() {
		if r := recover(); r != nil {
			log.Printf("notification failed: %v", r)
		}
	}()

	s.notifier.NotifyUpdate(req.ID, req.Data)
	return nil
}
```

## Best Practices

1. **Always pass Notifier to services** - Avoid global singletons
2. **Keep notification data lightweight** - Include only essential fields
3. **Use consistent naming** - Follow the `namespace:identifier` pattern
4. **Log notification failures** - Don't silently fail
5. **Test with mock notifiers** - Keep service tests independent
6. **Broadcast after persistence** - Ensure data is saved first
7. **Consider authorization** - Include user IDs in channel names for isolation
