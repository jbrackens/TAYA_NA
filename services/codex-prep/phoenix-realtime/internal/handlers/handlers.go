package handlers

import (
	"context"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/gorilla/websocket"

	"github.com/phoenixbot/phoenix-realtime/internal/service"
)

type Handlers struct {
	logger  *slog.Logger
	service *service.RealtimeService
}

func NewHandlers(logger *slog.Logger, svc *service.RealtimeService) *Handlers {
	return &Handlers{logger: logger, service: svc}
}

func (h *Handlers) HealthCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_, _ = w.Write([]byte(`{"status":"healthy","service":"phoenix-realtime"}`))
}

func (h *Handlers) ReadinessCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_, _ = w.Write([]byte(`{"status":"ready","service":"phoenix-realtime"}`))
}

func (h *Handlers) SportsbookWebSocket(w http.ResponseWriter, r *http.Request) {
	upgrader := websocket.Upgrader{ReadBufferSize: 4096, WriteBufferSize: 4096, CheckOrigin: func(r *http.Request) bool { return true }}
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		h.logger.Warn("websocket upgrade failed", slog.Any("error", err))
		return
	}
	client := h.service.NewClient(conn)
	h.service.RegisterClient(client)
	defer func() {
		h.service.UnregisterClient(client)
		_ = conn.Close()
	}()

	go h.service.RunWriter(client)

	_ = conn.SetReadDeadline(time.Now().Add(90 * time.Second))
	conn.SetPongHandler(func(string) error {
		return conn.SetReadDeadline(time.Now().Add(90 * time.Second))
	})

	for {
		var message service.InboundMessage
		if err := conn.ReadJSON(&message); err != nil {
			h.logger.Debug("websocket connection closed", slog.Any("error", err))
			return
		}
		switch strings.ToLower(strings.TrimSpace(message.Event)) {
		case "subscribe":
			if err := h.service.Subscribe(context.Background(), client, message); err != nil {
				h.write(client, service.OutboundMessage{Event: "error", Channel: message.Channel, CorrelationID: message.CorrelationID, Data: map[string]any{"message": err.Error()}})
				continue
			}
			h.write(client, service.OutboundMessage{Event: "subscribe:success", Channel: message.Channel, CorrelationID: message.CorrelationID})
		case "unsubscribe":
			if h.service.Unsubscribe(client, message.Channel) {
				h.write(client, service.OutboundMessage{Event: "unsubscribe:success", Channel: message.Channel, CorrelationID: message.CorrelationID})
			}
		case "heartbeat":
			h.write(client, service.OutboundMessage{Event: "heartbeat", Channel: "heartbeat", CorrelationID: message.CorrelationID, Data: map[string]any{"status": "ok"}})
		default:
			h.write(client, service.OutboundMessage{Event: "error", Channel: message.Channel, CorrelationID: message.CorrelationID, Data: map[string]any{"message": "unsupported websocket event"}})
		}
	}
}

func (h *Handlers) write(client *service.Client, msg service.OutboundMessage) {
	select {
	case client.Send() <- msg:
	default:
		h.logger.Warn("dropping realtime control message", slog.String("event", msg.Event), slog.String("channel", msg.Channel))
	}
}
