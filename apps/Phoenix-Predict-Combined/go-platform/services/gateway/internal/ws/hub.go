package ws

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"log/slog"
	"sync"
	"time"
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

	// pubMu guards publisher. SetPublisher mutates; handleBroadcast and
	// the inbound subscribe goroutine read. A plain mutex is fine because
	// the read is one pointer load on the hot path.
	pubMu     sync.RWMutex
	publisher Publisher

	// instanceID identifies this hub uniquely so the inbound subscribe
	// loop can skip messages we sent ourselves (avoids double-delivery
	// when origin-side local fanout is enabled).
	instanceID string

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
	// local indicates this broadcast must NOT be republished to the
	// shared Publisher (it came in over the bus already). Outbound
	// broadcasts use local=false; the subscribe loop enqueues local=true.
	local bool
}

// NewHub creates a new WebSocket Hub
func NewHub() *Hub {
	ctx, cancel := context.WithCancel(context.Background())
	return &Hub{
		channels:    make(map[string]map[*Client]bool),
		subscribe:   make(chan *subscribeCmd, 100),
		unsubscribe: make(chan *unsubscribeCmd, 100),
		disconnect:  make(chan *Client, 100),
		broadcast:   make(chan *broadcastCmd, 256),
		instanceID:  newInstanceID(),
		ctx:         ctx,
		cancel:      cancel,
		done:        make(chan struct{}),
	}
}

// newInstanceID returns 16 hex chars from crypto/rand. Collision-resistant
// in practice for any plausible cluster size (2^64 instances).
func newInstanceID() string {
	var b [8]byte
	if _, err := rand.Read(b[:]); err != nil {
		// rand.Read on Linux/macOS doesn't fail in practice; fall back to
		// a process-uniqueness sentinel rather than panic.
		return "fallback-" + time.Now().Format("20060102T150405.000000000")
	}
	return hex.EncodeToString(b[:])
}

// busEnvelope is the wire format for cross-replica messages. The origin
// instance ID lets the receiver skip messages it just sent to avoid the
// duplicate fanout that would otherwise occur when origin-side local
// fanout is enabled.
type busEnvelope struct {
	Origin  string          `json:"o"`
	Channel string          `json:"c"`
	Body    json.RawMessage `json:"b"`
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

// handleBroadcast fans a message out to local subscribers and, when a
// Publisher is configured, asynchronously republishes it to the shared bus
// for the other replicas. The origin's own clients always see the update
// from this in-process fanout — independent of bus health — so a Redis
// hiccup degrades cross-replica delivery rather than dropping the origin's
// users entirely.
//
// Inbound (cmd.local == true) means the message arrived via the bus and
// was already de-duped against this hub's instanceID; we MUST NOT
// republish it.
func (h *Hub) handleBroadcast(cmd *broadcastCmd) {
	// Local fanout — always.
	h.mu.RLock()
	clients, exists := h.channels[cmd.channel]
	if exists {
		targets := make([]*Client, 0, len(clients))
		for client := range clients {
			targets = append(targets, client)
		}
		h.mu.RUnlock()
		for _, client := range targets {
			client.SendMessage(cmd.message)
		}
	} else {
		h.mu.RUnlock()
	}
	// Outbound? Send to the bus off the hub goroutine — Publish can block
	// up to 2s on a slow Redis and we don't want to stall subscribe /
	// unsubscribe / disconnect processing.
	if cmd.local {
		return
	}
	h.pubMu.RLock()
	pub := h.publisher
	h.pubMu.RUnlock()
	if pub == nil {
		return
	}
	envelope, err := json.Marshal(busEnvelope{
		Origin:  h.instanceID,
		Channel: cmd.channel,
		Body:    cmd.message,
	})
	if err != nil {
		slog.Error("ws hub: marshal envelope failed", "channel", cmd.channel, "error", err)
		return
	}
	go func() {
		ctx, cancel := context.WithTimeout(h.ctx, 2*time.Second)
		defer cancel()
		if err := pub.Publish(ctx, cmd.channel, envelope); err != nil {
			slog.Warn("ws hub: cross-replica publish failed; this replica's clients still received the message",
				"channel", cmd.channel, "error", err)
		}
	}()
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

// Broadcast sends a message to all clients subscribed to a channel.
// When a Publisher is configured, the message is shipped over the shared
// bus and every replica (including this one) fans it out via the
// subscribe loop.
func (h *Hub) Broadcast(channel string, message []byte) {
	select {
	case h.broadcast <- &broadcastCmd{channel: channel, message: message, local: false}:
	case <-h.ctx.Done():
	}
}

// SetPublisher wires the hub to a multi-replica fanout backend (Redis
// pubsub) and starts the subscriber goroutine. Pass nil to detach.
//
// Intended to be called once at startup, BEFORE Run(). Calling it more
// than once does NOT stop the prior subscriber goroutine — the previous
// publisher's Close() is the supported teardown path.
//
// Inbound messages are deduped: any envelope whose Origin matches this
// hub's instanceID is skipped, since handleBroadcast already fanned the
// message out to local clients on the publish-out path.
func (h *Hub) SetPublisher(p Publisher) {
	h.pubMu.Lock()
	h.publisher = p
	h.pubMu.Unlock()
	if p == nil {
		return
	}
	go func() {
		err := p.Subscribe(h.ctx, func(_ string, payload []byte) {
			var env busEnvelope
			if jsonErr := json.Unmarshal(payload, &env); jsonErr != nil {
				slog.Warn("ws hub: malformed bus envelope; dropping",
					"size", len(payload), "error", jsonErr)
				return
			}
			if env.Origin == h.instanceID {
				// Self-loop. Already fanned out locally on publish-out.
				return
			}
			// Drop on overflow rather than blocking — pubsub messages
			// are best-effort by design and our event types are
			// idempotent / re-emitted regularly.
			select {
			case h.broadcast <- &broadcastCmd{channel: env.Channel, message: env.Body, local: true}:
			case <-h.ctx.Done():
				return
			default:
				slog.Warn("ws hub: broadcast channel saturated; dropping inbound bus message",
					"channel", env.Channel)
			}
		})
		if err != nil && err != context.Canceled && err != context.DeadlineExceeded {
			slog.Error("ws hub: publisher Subscribe exited", "error", err)
		}
	}()
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
