package ws

// Notifier defines the interface for broadcasting events to WebSocket clients
type Notifier interface {
	// NotifyMarketUpdate broadcasts a market update for a specific fixture
	NotifyMarketUpdate(fixtureID string, data interface{})

	// NotifyFixtureUpdate broadcasts a fixture update for a specific sport
	NotifyFixtureUpdate(sportKey string, data interface{})

	// NotifyBetUpdate broadcasts a bet update for a specific user
	NotifyBetUpdate(userID string, data interface{})

	// NotifyWalletUpdate broadcasts a wallet update for a specific user
	NotifyWalletUpdate(userID string, data interface{})
}
