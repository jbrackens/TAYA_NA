package ws

import (
	"context"
	"encoding/json"
	"log/slog"
	"sync"
)

// Hub manages WebSocket client connections and channel subscriptions
type Hub struct {
	// clients maps from channel name to set of subscribed clients
	channels map[string]map[*Client]bool
	mu       sync.RWMutex

	// commands for thread-safe operations
	subscribe   chan *subscribeCmd
	unsubscribe chan *unsubscribeCmd
	disconnect  chan *Client
	broadcast   chan *broadcastCmd

	ctx    context.Context
	cancel context.CancelFunc
	done   chan struct{}
}

type subscribeCmd struct {
	client  *Client
	channel string
}

type unsubscribeCmd struct {
	client  *Client
	channel string
}

type broadcastCmd struct {
	channel string
	message []byte
}

// NewHub creates a new WebSocket Hub
func NewHub() *Hub {
	ctx, cancel := context.WithCancel(context.Background())
	return &Hub{
		channels:    make(map[string]map[*Client]bool),
		subscribe:   make(chan *subscribeCmd, 100),
		unsubscribe: make(chan *unsubscribeCmd, 100),
		disconnect:  make(chan *Client, 100),
		broadcast:   make(chan *broadcastCmd, 100),
		ctx:         ctx,
		cancel:      cancel,
		done:        make(chan struct{}),
	}
}

// Run starts the hub's event loop. Must be called in a separate goroutine.
func (h *Hub) Run(ctx context.Context) {
	defer close(h.done)

	for {
		select {
		case <-ctx.Done():
			h.closeAll()
			return
		case <-h.ctx.Done():
			h.closeAll()
			return

		case cmd := <-h.subscribe:
			h.handleSubscribe(cmd)

		case cmd := <-h.unsubscribe:
			h.handleUnsubscribe(cmd)

		case client := <-h.disconnect:
			h.handleDisconnect(client)

		case cmd := <-h.broadcast:
			h.handleBroadcast(cmd)
		}
	}
}

// handleSubscribe adds a client to a channel
func (h *Hub) handleSubscribe(cmd *subscribeCmd) {
	h.mu.Lock()
	if h.channels[cmd.channel] == nil {
		h.channels[cmd.channel] = make(map[*Client]bool)
	}
	h.channels[cmd.channel][cmd.client] = true
	h.mu.Unlock()
	slog.Info("ws client subscribed", "user_id", cmd.client.userID, "channel", cmd.channel)
}

// handleUnsubscribe removes a client from a channel
func (h *Hub) handleUnsubscribe(cmd *unsubscribeCmd) {
	h.mu.Lock()
	if clients, exists := h.channels[cmd.channel]; exists {
		delete(clients, cmd.client)
		if len(clients) == 0 {
			delete(h.channels, cmd.channel)
		}
	}
	h.mu.Unlock()
	slog.Info("ws client unsubscribed", "user_id", cmd.client.userID, "channel", cmd.channel)
}

// handleDisconnect removes a client from all channels
func (h *Hub) handleDisconnect(client *Client) {
	h.mu.Lock()
	for channel := range client.channels {
		if clients, exists := h.channels[channel]; exists {
			delete(clients, client)
			if len(clients) == 0 {
				delete(h.channels, channel)
			}
		}
	}
	h.mu.Unlock()
	slog.Info("ws client disconnected", "user_id", client.userID)
}

// handleBroadcast sends a message to all clients subscribed to a channel
func (h *Hub) handleBroadcast(cmd *broadcastCmd) {
	h.mu.RLock()
	clients, exists := h.channels[cmd.channel]
	if !exists {
		h.mu.RUnlock()
		return
	}
	targets := make([]*Client, 0, len(clients))
	for client := range clients {
		targets = append(targets, client)
	}
	h.mu.RUnlock()
	for _, client := range targets {
		client.SendMessage(cmd.message)
	}
}

// Subscribe is called by a client to subscribe to a channel
func (h *Hub) Subscribe(client *Client, channel string) {
	select {
	case h.subscribe <- &subscribeCmd{client: client, channel: channel}:
	case <-h.ctx.Done():
	}
}

// Unsubscribe is called by a client to unsubscribe from a channel
func (h *Hub) Unsubscribe(client *Client, channel string) {
	select {
	case h.unsubscribe <- &unsubscribeCmd{client: client, channel: channel}:
	case <-h.ctx.Done():
	}
}

// Disconnect is called when a client disconnects
func (h *Hub) Disconnect(client *Client) {
	select {
	case h.disconnect <- client:
	case <-h.ctx.Done():
	}
}

// Broadcast sends a message to all clients subscribed to a channel
func (h *Hub) Broadcast(channel string, message []byte) {
	select {
	case h.broadcast <- &broadcastCmd{channel: channel, message: message}:
	case <-h.ctx.Done():
	}
}

// BroadcastEvent broadcasts a typed event to a channel
func (h *Hub) BroadcastEvent(channel string, eventID string, eventType string, data interface{}) {
	rawData, err := json.Marshal(data)
	if err != nil {
		slog.Error("ws failed to marshal event data", "channel", channel, "error", err)
		return
	}

	event := &Event{
		Type:    MessageTypeEvent,
		Channel: channel,
		EventID: eventID,
		Data:    rawData,
	}

	h.Broadcast(channel, event.ToJSON())
}

// ClientCount returns the total number of connected clients
func (h *Hub) ClientCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()

	total := 0
	for _, clients := range h.channels {
		total += len(clients)
	}
	return total
}

// ChannelCount returns the number of active channels
func (h *Hub) ChannelCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.channels)
}

// GetChannelSubscribers returns all clients subscribed to a channel
func (h *Hub) GetChannelSubscribers(channel string) []*Client {
	h.mu.RLock()
	defer h.mu.RUnlock()

	clients, exists := h.channels[channel]
	if !exists {
		return nil
	}

	result := make([]*Client, 0, len(clients))
	for client := range clients {
		result = append(result, client)
	}
	return result
}

// Close gracefully shuts down the hub
func (h *Hub) Close() error {
	h.cancel()
	<-h.done
	return nil
}

// closeAll closes all client connections
func (h *Hub) closeAll() {
	for channel := range h.channels {
		clients := h.channels[channel]
		for client := range clients {
			client.close()
		}
		delete(h.channels, channel)
	}
}

// Notifier interface — prediction platform channels

// NotifyPredictionMarketUpdate broadcasts a prediction market price/status change
func (h *Hub) NotifyPredictionMarketUpdate(marketID string, data interface{}) {
	h.BroadcastEvent("market:"+marketID, "market_update", "price_update", data)
}

// NotifyPredictionTrade broadcasts a trade fill on a market
func (h *Hub) NotifyPredictionTrade(marketID string, data interface{}) {
	h.BroadcastEvent("trades:"+marketID, "trade", "trade_fill", data)
}

// NotifyPortfolioUpdate broadcasts a position change for a user
func (h *Hub) NotifyPortfolioUpdate(userID string, data interface{}) {
	h.BroadcastEvent("portfolio:"+userID, "portfolio_update", "position_update", data)
}

// NotifyWalletUpdate broadcasts a wallet balance change for a user
func (h *Hub) NotifyWalletUpdate(userID string, data interface{}) {
	h.BroadcastEvent("wallet:"+userID, "wallet_update", "wallet_update", data)
}

// NotifyEventUpdate broadcasts an event status change
func (h *Hub) NotifyEventUpdate(eventID string, data interface{}) {
	h.BroadcastEvent("event:"+eventID, "event_update", "status_change", data)
}

// NotifyCategoryUpdate broadcasts a new market in a category
func (h *Hub) NotifyCategoryUpdate(categorySlug string, data interface{}) {
	h.BroadcastEvent("category:"+categorySlug, "category_update", "new_market", data)
}

// NotifyLeaderboardUpdate broadcasts an accuracy leaderboard change
func (h *Hub) NotifyLeaderboardUpdate(data interface{}) {
	h.BroadcastEvent("leaderboard:accuracy", "leaderboard_update", "ranking_change", data)
}

// NotifyLoyaltyTierPromoted broadcasts a tier-up to the user's loyalty
// channel so the frontend tier pill can bloom immediately. See plan §8.
func (h *Hub) NotifyLoyaltyTierPromoted(userID string, data interface{}) {
	h.BroadcastEvent("loyalty:"+userID, "tier_promoted", "tier_promoted", data)
}
