package ws

import "encoding/json"

// MessageType represents the type of WebSocket message
type MessageType string

const (
	// Client -> Server
	MessageTypeSubscribe   MessageType = "subscribe"
	MessageTypeUnsubscribe MessageType = "unsubscribe"

	// Server -> Client
	MessageTypeEvent MessageType = "event"
)

// SubscribeMessage represents a subscription request from the client
type SubscribeMessage struct {
	Type     MessageType `json:"type"`
	Channels []string    `json:"channels"`
}

// UnsubscribeMessage represents an unsubscription request from the client
type UnsubscribeMessage struct {
	Type     MessageType `json:"type"`
	Channels []string    `json:"channels"`
}

// Event represents a broadcasted event sent to clients
type Event struct {
	Type    MessageType `json:"type"`
	Channel string      `json:"channel"`
	EventID string      `json:"eventId"`
	Data    json.RawMessage `json:"data"`
}

// ClientMessage is a union type for all possible client messages
type ClientMessage struct {
	Type     MessageType     `json:"type"`
	Channels []string        `json:"channels,omitempty"`
	RawBody  json.RawMessage `json:"-"`
}

// ParseClientMessage parses a JSON message from a client
func ParseClientMessage(data []byte) (*ClientMessage, error) {
	var msg ClientMessage
	if err := json.Unmarshal(data, &msg); err != nil {
		return nil, err
	}
	msg.RawBody = data
	return &msg, nil
}

// ToJSON serializes the Event to JSON
func (e *Event) ToJSON() []byte {
	data, _ := json.Marshal(e)
	return data
}
