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

	// Cross-instance backbone (P2-07). Default LocalBackbone is a no-op
	// (single instance). `outbound` queues locally-originated broadcasts for
	// async publish so a request-path caller never blocks on a (possibly
	// Redis) Publish — local fan-out has already happened via `broadcast`.
	backbone Backbone
	outbound chan *broadcastCmd

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
		backbone:    NewLocalBackbone(),
		outbound:    make(chan *broadcastCmd, 256),
		ctx:         ctx,
		cancel:      cancel,
		done:        make(chan struct{}),
	}
}

// SetBackbone swaps the cross-instance event backbone (P2-07). Call before Run.
// Default is LocalBackbone (single-instance, no-op); pass a RedisBackbone to fan
// broadcasts across instances. A nil argument is ignored.
func (h *Hub) SetBackbone(b Backbone) {
	if b != nil {
		h.backbone = b
	}
}

// Run starts the hub's event loop. Must be called in a separate goroutine.
func (h *Hub) Run(ctx context.Context) {
	defer close(h.done)

	// Subscribe to broadcasts that originated on OTHER instances and fan them
	// out to local subscribers (P2-07). LocalBackbone never delivers; a nil
	// channel (subscribe failure) simply means cross-instance is disabled —
	// local delivery via h.broadcast is unaffected.
	backboneCh, err := h.backbone.Subscribe(ctx)
	if err != nil {
		slog.Error("ws hub: backbone subscribe failed; cross-instance delivery disabled (local-only)", "error", err)
		backboneCh = nil
	}

	// Drain locally-originated broadcasts to the backbone for other instances.
	// Async so a (possibly Redis) Publish never blocks the request-path caller;
	// the local fan-out already happened via h.broadcast.
	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			case <-h.ctx.Done():
				return
			case cmd := <-h.outbound:
				if perr := h.backbone.Publish(ctx, BackboneMessage{Channel: cmd.channel, Payload: cmd.message}); perr != nil {
					slog.Warn("ws hub: backbone publish failed (cross-instance degraded; local delivery unaffected)",
						"channel", cmd.channel, "error", perr)
				}
			}
		}
	}()

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

		case bmsg := <-backboneCh:
			// A broadcast from another instance — fan out to local subscribers.
			h.handleBroadcast(&broadcastCmd{channel: bmsg.Channel, message: bmsg.Payload})
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

// handleDisconnect removes a client from all channels. The channel set is
// snapshotted through the client's own lock — the readPump goroutine may
// still be mutating it while the hub cleans up.
func (h *Hub) handleDisconnect(client *Client) {
	channels := client.subscribedChannels()
	h.mu.Lock()
	for _, channel := range channels {
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

// Broadcast sends a message to all clients subscribed to a channel. It never
// blocks the caller: the HTTP order/settlement handlers publish through here
// on the request path, so a full hub queue must not stall them (audit
// PERF-03). On a full queue the broadcast is dropped and counted — subscribers
// resync on the next event or reconnect.
func (h *Hub) Broadcast(channel string, message []byte) {
	cmd := &broadcastCmd{channel: channel, message: message}
	// Local fan-out (unchanged): the sole delivery path for this instance's
	// own clients, independent of the backbone — so a Redis outage degrades to
	// local-only, it does not stop local delivery.
	select {
	case h.broadcast <- cmd:
	case <-h.ctx.Done():
	default:
		broadcastsDroppedTotal.Add(1)
	}
	// Cross-instance fan-out via the backbone (async drain, non-blocking). On a
	// full queue other instances may miss this event and resync on the next one
	// — same backpressure policy as the local drop above.
	select {
	case h.outbound <- cmd:
	case <-h.ctx.Done():
	default:
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

// BackboneHealthy reports whether cross-instance delivery is working (for the
// /readyz detail). Always true for the in-process default.
func (h *Hub) BackboneHealthy() bool { return h.backbone.Healthy() }

// Close gracefully shuts down the hub
func (h *Hub) Close() error {
	h.cancel()
	<-h.done
	_ = h.backbone.Close()
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

// NotifyPredictionOrderBookUpdate broadcasts a top-of-book change. Clients
// refetch /orderbook on receipt; the payload carries best bid/ask as a
// quick-look hint.
func (h *Hub) NotifyPredictionOrderBookUpdate(marketID string, data interface{}) {
	h.BroadcastEvent("orderbook:"+marketID, "orderbook_update", "book_change", data)
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

// NotifyResolutionUpdate broadcasts a resolution-lifecycle change (ADR-0004):
// phase is one of proposed_resolution | disputed | settled | voided. It fans
// out to the market channel (so a viewer sees "result proposed / under review")
// and the admin resolutions channel (so the office review queue updates live).
func (h *Hub) NotifyResolutionUpdate(marketID, phase string, data interface{}) {
	h.BroadcastEvent("market:"+marketID, "resolution_update", phase, data)
	h.BroadcastEvent("admin:resolutions", "resolution_update", phase, data)
}

// NotifyDisputeFiled broadcasts a newly-filed dispute to the admin disputes
// channel (the office review queue) and the affected market channel.
func (h *Hub) NotifyDisputeFiled(marketID string, data interface{}) {
	h.BroadcastEvent("admin:disputes", "dispute_filed", "dispute_filed", data)
	h.BroadcastEvent("market:"+marketID, "dispute_filed", "dispute_filed", data)
}
