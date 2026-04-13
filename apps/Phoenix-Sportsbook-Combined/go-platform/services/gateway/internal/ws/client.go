package ws

import (
	"context"
	"log/slog"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// Conn abstracts the WebSocket connection for testing
type Conn interface {
	ReadMessage() (int, []byte, error)
	WriteMessage(messageType int, data []byte) error
	SetReadDeadline(t time.Time) error
	SetWriteDeadline(t time.Time) error
	SetReadLimit(limit int64)
	SetPongHandler(h func(string) error)
	Close() error
}

// wsConn wraps *websocket.Conn to implement the Conn interface
type wsConn struct {
	*websocket.Conn
}

func (w *wsConn) SetReadLimit(limit int64) {
	w.Conn.SetReadLimit(limit)
}

func (w *wsConn) SetPongHandler(h func(string) error) {
	w.Conn.SetPongHandler(h)
}

// Client represents a single WebSocket connection
type Client struct {
	hub       *Hub
	conn      Conn
	userID    string
	channels  map[string]bool
	send      chan []byte
	ctx       context.Context
	cancel    context.CancelFunc
	readDone  chan struct{}
	writeDone chan struct{}
	closeOnce sync.Once
}

const (
	// Time allowed to write a message to the peer.
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer.
	pongWait = 60 * time.Second

	// Send pings to peer with this period. Must be less than pongWait.
	pingInterval = 30 * time.Second

	// Maximum message size allowed from peer.
	maxMessageSize = 512 * 1024 // 512 KB
)

// NewClientFromWS creates a new WebSocket client from a real *websocket.Conn
func NewClientFromWS(hub *Hub, conn *websocket.Conn, userID string) *Client {
	return NewClient(hub, &wsConn{conn}, userID)
}

// NewClient creates a new WebSocket client
func NewClient(hub *Hub, conn Conn, userID string) *Client {
	ctx, cancel := context.WithCancel(context.Background())
	return &Client{
		hub:       hub,
		conn:      conn,
		userID:    userID,
		channels:  make(map[string]bool),
		send:      make(chan []byte, 256),
		ctx:       ctx,
		cancel:    cancel,
		readDone:  make(chan struct{}),
		writeDone: make(chan struct{}),
	}
}

// Start begins the read and write pumps for this client
func (c *Client) Start() {
	go c.readPump()
	go c.writePump()
}

// readPump reads messages from the WebSocket connection and processes subscriptions
func (c *Client) readPump() {
	defer func() {
		c.close()
		close(c.readDone)
	}()

	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		select {
		case <-c.ctx.Done():
			return
		default:
		}

		_, data, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				slog.Error("ws client error", "user_id", c.userID, "error", err)
			}
			return
		}

		msg, err := ParseClientMessage(data)
		if err != nil {
			slog.Warn("ws invalid message", "user_id", c.userID, "error", err)
			continue
		}

		switch msg.Type {
		case MessageTypeSubscribe:
			c.handleSubscribe(msg.Channels)
		case MessageTypeUnsubscribe:
			c.handleUnsubscribe(msg.Channels)
		default:
			slog.Warn("ws unknown message type", "user_id", c.userID, "type", msg.Type)
		}
	}
}

// writePump writes messages from the hub to the WebSocket connection
func (c *Client) writePump() {
	ticker := time.NewTicker(pingInterval)
	defer func() {
		ticker.Stop()
		c.conn.Close()
		close(c.writeDone)
	}()

	for {
		select {
		case <-c.ctx.Done():
			c.conn.WriteMessage(websocket.CloseMessage, []byte{})
			return

		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// Channel closed
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// handleSubscribe processes a subscription request with per-channel authorization.
// User-specific channels (bets:{userID}, wallet:{userID}) require the client's
// userID to match the channel's userID to prevent cross-user data leakage.
func (c *Client) handleSubscribe(channels []string) {
	for _, channel := range channels {
		if channel == "" {
			continue
		}
		if !authorizeChannelAccess(c.userID, channel) {
			slog.Warn("ws channel auth denied", "user_id", c.userID, "channel", channel)
			continue
		}
		if !c.channels[channel] {
			c.channels[channel] = true
			c.hub.Subscribe(c, channel)
		}
	}
}

// authorizeChannelAccess checks if a user is allowed to subscribe to a channel.
// Public channels (markets:*, fixtures:*) are open to all authenticated users.
// Private channels (bets:{userID}, wallet:{userID}) require matching userID.
func authorizeChannelAccess(userID string, channel string) bool {
	parts := strings.SplitN(channel, ":", 2)
	if len(parts) != 2 {
		return true // non-prefixed channels are public
	}
	prefix := parts[0]
	channelOwner := parts[1]

	switch prefix {
	case "bets", "wallet":
		// Private channels: must match the authenticated user
		return strings.EqualFold(userID, channelOwner)
	case "markets", "fixtures":
		// Public channels: any authenticated user can subscribe
		return true
	default:
		// Unknown prefixes: fail-closed — reject to prevent unintended data exposure
		return false
	}
}

// handleUnsubscribe processes an unsubscription request
func (c *Client) handleUnsubscribe(channels []string) {
	for _, channel := range channels {
		if channel == "" {
			continue
		}
		if c.channels[channel] {
			delete(c.channels, channel)
			c.hub.Unsubscribe(c, channel)
		}
	}
}

// SendMessage sends a message to the client
func (c *Client) SendMessage(data []byte) {
	select {
	case c.send <- data:
	case <-c.ctx.Done():
	}
}

// close closes the client connection (safe to call multiple times)
func (c *Client) close() {
	c.closeOnce.Do(func() {
		c.cancel()

		// Unsubscribe from all channels
		channels := make([]string, 0, len(c.channels))
		for ch := range c.channels {
			channels = append(channels, ch)
		}
		c.handleUnsubscribe(channels)

		// Signal the hub to remove this client
		c.hub.Disconnect(c)

		// Close the send channel
		select {
		case <-c.writeDone:
		default:
			close(c.send)
		}
	})
}

// UserID returns the authenticated user ID of this client
func (c *Client) UserID() string {
	return c.userID
}

// IsSubscribedTo checks if the client is subscribed to a channel
func (c *Client) IsSubscribedTo(channel string) bool {
	return c.channels[channel]
}
