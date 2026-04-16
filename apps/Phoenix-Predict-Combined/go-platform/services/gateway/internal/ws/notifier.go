package ws

// Notifier defines the interface for broadcasting events to WebSocket clients
type Notifier interface {
	// NotifyPredictionMarketUpdate broadcasts a market price/status change
	NotifyPredictionMarketUpdate(marketID string, data interface{})

	// NotifyPredictionTrade broadcasts a trade fill on a market
	NotifyPredictionTrade(marketID string, data interface{})

	// NotifyPortfolioUpdate broadcasts a position change for a user
	NotifyPortfolioUpdate(userID string, data interface{})

	// NotifyWalletUpdate broadcasts a wallet balance change for a user
	NotifyWalletUpdate(userID string, data interface{})

	// NotifyEventUpdate broadcasts an event status change
	NotifyEventUpdate(eventID string, data interface{})

	// NotifyCategoryUpdate broadcasts a new market in a category
	NotifyCategoryUpdate(categorySlug string, data interface{})

	// NotifyLeaderboardUpdate broadcasts an accuracy leaderboard change
	NotifyLeaderboardUpdate(data interface{})
}
