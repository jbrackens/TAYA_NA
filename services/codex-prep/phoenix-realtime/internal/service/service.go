package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/websocket"
	commonkafka "github.com/phoenixbot/phoenix-common/pkg/kafka"
	"github.com/shopspring/decimal"
	"go.uber.org/zap"

	"github.com/phoenixbot/phoenix-realtime/internal/config"
)

type Claims struct {
	UserID string `json:"user_id,omitempty"`
	Role   string `json:"role,omitempty"`
	jwt.RegisteredClaims
}

type InboundMessage struct {
	Event         string `json:"event"`
	Channel       string `json:"channel"`
	CorrelationID string `json:"correlationId,omitempty"`
	Token         string `json:"token,omitempty"`
}

type OutboundMessage struct {
	Event         string `json:"event"`
	Channel       string `json:"channel"`
	CorrelationID string `json:"correlationId,omitempty"`
	Data          any    `json:"data,omitempty"`
}

type channelDescriptor struct {
	kind         string
	channel      string
	marketID     string
	fixtureID    string
	requiresAuth bool
}

type subscription struct {
	descriptor  channelDescriptor
	userID      string
	bearerToken string
	lastHash    string
	betStates   map[string]string
}

type Client struct {
	logger        *slog.Logger
	conn          *websocket.Conn
	send          chan OutboundMessage
	subscriptions map[string]*subscription
	mu            sync.RWMutex
}

func (c *Client) Send() chan<- OutboundMessage {
	return c.send
}

type RealtimeService struct {
	logger     *slog.Logger
	cfg        *config.Config
	httpClient *http.Client
	clients    map[*Client]struct{}
	mu         sync.RWMutex
}

type marketSnapshot struct {
	MarketID   string                     `json:"market_id"`
	MarketType string                     `json:"market_type"`
	Status     string                     `json:"status"`
	Outcomes   []marketOutcome            `json:"outcomes"`
	Odds       map[string]decimal.Decimal `json:"odds"`
}

type marketOutcome struct {
	OutcomeID string          `json:"outcome_id"`
	Name      string          `json:"name"`
	Odds      decimal.Decimal `json:"odds"`
}

type fixtureSnapshot struct {
	EventID        string            `json:"event_id"`
	HomeTeam       string            `json:"home_team"`
	AwayTeam       string            `json:"away_team"`
	Status         string            `json:"status"`
	ScheduledStart time.Time         `json:"scheduled_start"`
	LiveScore      *fixtureLiveScore `json:"live_score,omitempty"`
	Result         *fixtureResult    `json:"result,omitempty"`
}

type fixtureLiveScore struct {
	HomeScore int `json:"home_score"`
	AwayScore int `json:"away_score"`
}

type fixtureResult struct {
	HomeScore int `json:"home_score"`
	AwayScore int `json:"away_score"`
}

type walletSummary struct {
	UserID    string          `json:"user_id"`
	Balance   decimal.Decimal `json:"balance"`
	Currency  string          `json:"currency"`
	Reserved  decimal.Decimal `json:"reserved"`
	Available decimal.Decimal `json:"available"`
}

func NewRealtimeService(logger *slog.Logger, cfg *config.Config) *RealtimeService {
	return &RealtimeService{
		logger: logger,
		cfg:    cfg,
		httpClient: &http.Client{
			Timeout: 1500 * time.Millisecond,
		},
		clients: make(map[*Client]struct{}),
	}
}

func (s *RealtimeService) NewClient(conn *websocket.Conn) *Client {
	return &Client{
		logger:        s.logger,
		conn:          conn,
		send:          make(chan OutboundMessage, 32),
		subscriptions: make(map[string]*subscription),
	}
}

func (s *RealtimeService) RegisterClient(client *Client) {
	s.mu.Lock()
	s.clients[client] = struct{}{}
	s.mu.Unlock()
}

func (s *RealtimeService) UnregisterClient(client *Client) {
	s.mu.Lock()
	delete(s.clients, client)
	s.mu.Unlock()
	client.mu.Lock()
	client.subscriptions = map[string]*subscription{}
	client.mu.Unlock()
	close(client.send)
}

func (s *RealtimeService) RunWriter(client *Client) {
	for msg := range client.send {
		_ = client.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
		if err := client.conn.WriteJSON(msg); err != nil {
			return
		}
	}
}

func (s *RealtimeService) Subscribe(ctx context.Context, client *Client, message InboundMessage) error {
	descriptor, err := parseChannel(message.Channel)
	if err != nil {
		return err
	}
	client.mu.Lock()
	if _, exists := client.subscriptions[descriptor.channel]; exists {
		client.mu.Unlock()
		return nil
	}
	client.mu.Unlock()

	sub := &subscription{descriptor: descriptor, betStates: map[string]string{}}
	if descriptor.requiresAuth {
		claims, err := parseToken(s.cfg.JWTSecret, s.cfg.JWTIssuer, s.cfg.JWTAudience, message.Token)
		if err != nil {
			return fmt.Errorf("authentication required for websocket channel")
		}
		sub.userID = claims.UserID
		sub.bearerToken = "Bearer " + strings.TrimSpace(message.Token)
	}

	switch descriptor.kind {
	case "market":
		_, hash, err := s.fetchMarketSnapshot(ctx, descriptor.marketID)
		if err != nil {
			return err
		}
		sub.lastHash = hash
	case "fixture":
		_, hash, err := s.fetchFixtureSnapshot(ctx, descriptor.fixtureID)
		if err != nil {
			return err
		}
		sub.lastHash = hash
	case "wallets":
		_, hash, err := s.fetchWalletSnapshot(ctx, sub.userID, sub.bearerToken)
		if err != nil {
			return err
		}
		sub.lastHash = hash
	}

	client.mu.Lock()
	client.subscriptions[descriptor.channel] = sub
	client.mu.Unlock()
	return nil
}

func (s *RealtimeService) Unsubscribe(client *Client, channel string) bool {
	client.mu.Lock()
	defer client.mu.Unlock()
	if _, ok := client.subscriptions[channel]; !ok {
		return false
	}
	delete(client.subscriptions, channel)
	return true
}

func (s *RealtimeService) StartConsumers(ctx context.Context) error {
	topics := []string{
		"phoenix.market.created",
		"phoenix.market.provider-synced",
		"phoenix.market.odds-updated",
		"phoenix.market.status-changed",
		"phoenix.market.settled",
		"phoenix.event.created",
		"phoenix.event.upserted",
		"phoenix.event.live-score-updated",
		"phoenix.event.completed",
		"phoenix.bet.placed",
		"phoenix.bet.updated",
		"phoenix.bet.cashed-out",
		"phoenix.bet.settled",
		"phoenix.wallet.balance-updated",
		"phoenix.wallet.transactions",
	}
	zapLogger, err := newZapLogger(s.cfg.Environment)
	if err != nil {
		return err
	}
	consumer, err := commonkafka.NewConsumer(strings.Join(s.cfg.KafkaBrokers, ","), s.cfg.KafkaGroupID, topics, &commonkafka.ConsumerConfig{Logger: zapLogger, GroupID: s.cfg.KafkaGroupID})
	if err != nil {
		return err
	}
	go func() {
		defer consumer.Close()
		if err := consumer.Subscribe(ctx, s.handleKafkaMessage); err != nil && !errors.Is(err, context.Canceled) {
			s.logger.Error("realtime consumer stopped", slog.Any("error", err))
		}
	}()
	return nil
}

func (s *RealtimeService) handleKafkaMessage(ctx context.Context, topic string, key, value []byte) error {
	var payload map[string]any
	if err := json.Unmarshal(value, &payload); err != nil {
		return err
	}
	switch {
	case strings.HasPrefix(topic, "phoenix.market."):
		marketID := stringField(payload, "market_id")
		if marketID == "" {
			marketID = strings.TrimSpace(string(key))
		}
		if marketID == "" {
			return nil
		}
		return s.broadcastMarket(ctx, marketID)
	case strings.HasPrefix(topic, "phoenix.event."):
		fixtureID := stringField(payload, "event_id")
		if fixtureID == "" {
			fixtureID = strings.TrimSpace(string(key))
		}
		if fixtureID == "" {
			return nil
		}
		return s.broadcastFixture(ctx, fixtureID)
	case strings.HasPrefix(topic, "phoenix.wallet."):
		return s.broadcastWallets(ctx)
	case strings.HasPrefix(topic, "phoenix.bet."):
		userID := stringField(payload, "user_id")
		betID := stringField(payload, "bet_id")
		state, ok := mapBetTopicToState(topic, payload)
		if !ok || userID == "" || betID == "" {
			return nil
		}
		s.broadcastBet(userID, betID, state)
	}
	return nil
}

func (s *RealtimeService) broadcastMarket(ctx context.Context, marketID string) error {
	payload, hash, err := s.fetchMarketSnapshot(ctx, marketID)
	if err != nil {
		return err
	}
	s.withClients(func(client *Client) {
		client.mu.Lock()
		defer client.mu.Unlock()
		for _, sub := range client.subscriptions {
			if sub.descriptor.kind != "market" || sub.descriptor.marketID != marketID {
				continue
			}
			if sub.lastHash == hash {
				continue
			}
			sub.lastHash = hash
			s.send(client, OutboundMessage{Event: "update", Channel: sub.descriptor.channel, Data: payload})
		}
	})
	return nil
}

func (s *RealtimeService) broadcastFixture(ctx context.Context, fixtureID string) error {
	payload, hash, err := s.fetchFixtureSnapshot(ctx, fixtureID)
	if err != nil {
		return err
	}
	s.withClients(func(client *Client) {
		client.mu.Lock()
		defer client.mu.Unlock()
		for _, sub := range client.subscriptions {
			if sub.descriptor.kind != "fixture" || sub.descriptor.fixtureID != fixtureID {
				continue
			}
			if sub.lastHash == hash {
				continue
			}
			sub.lastHash = hash
			s.send(client, OutboundMessage{Event: "update", Channel: sub.descriptor.channel, Data: payload})
		}
	})
	return nil
}

func (s *RealtimeService) broadcastWallets(ctx context.Context) error {
	var firstErr error
	s.withClients(func(client *Client) {
		client.mu.Lock()
		defer client.mu.Unlock()
		for _, sub := range client.subscriptions {
			if sub.descriptor.kind != "wallets" {
				continue
			}
			payload, hash, err := s.fetchWalletSnapshot(ctx, sub.userID, sub.bearerToken)
			if err != nil {
				if firstErr == nil {
					firstErr = err
				}
				continue
			}
			if sub.lastHash == hash {
				continue
			}
			sub.lastHash = hash
			s.send(client, OutboundMessage{Event: "update", Channel: sub.descriptor.channel, Data: payload})
		}
	})
	return firstErr
}

func (s *RealtimeService) broadcastBet(userID, betID, state string) {
	s.withClients(func(client *Client) {
		client.mu.Lock()
		defer client.mu.Unlock()
		for _, sub := range client.subscriptions {
			if sub.descriptor.kind != "bets" || sub.userID != userID {
				continue
			}
			if sub.betStates[betID] == state {
				continue
			}
			sub.betStates[betID] = state
			s.send(client, OutboundMessage{Event: "update", Channel: sub.descriptor.channel, Data: map[string]any{"betId": betID, "state": state}})
		}
	})
}

func (s *RealtimeService) withClients(fn func(*Client)) {
	s.mu.RLock()
	clients := make([]*Client, 0, len(s.clients))
	for client := range s.clients {
		clients = append(clients, client)
	}
	s.mu.RUnlock()
	for _, client := range clients {
		fn(client)
	}
}

func (s *RealtimeService) send(client *Client, msg OutboundMessage) {
	select {
	case client.send <- msg:
	default:
		s.logger.Warn("dropping realtime message", slog.String("channel", msg.Channel), slog.String("event", msg.Event))
	}
}

func (s *RealtimeService) fetchMarketSnapshot(ctx context.Context, marketID string) (map[string]any, string, error) {
	var market marketSnapshot
	if err := s.getJSON(ctx, s.cfg.MarketURL+"/api/v1/markets/"+url.PathEscape(marketID), "", &market); err != nil {
		return nil, "", err
	}
	payload := mapMarketUpdate(&market)
	return payload, snapshotHash(payload), nil
}

func (s *RealtimeService) fetchFixtureSnapshot(ctx context.Context, fixtureID string) (map[string]any, string, error) {
	var fixture fixtureSnapshot
	if err := s.getJSON(ctx, s.cfg.EventsURL+"/api/v1/events/"+url.PathEscape(fixtureID), "", &fixture); err != nil {
		return nil, "", err
	}
	payload := mapFixtureUpdate(&fixture)
	return payload, snapshotHash(payload), nil
}

func (s *RealtimeService) fetchWalletSnapshot(ctx context.Context, userID, bearerToken string) (map[string]any, string, error) {
	var wallet walletSummary
	if err := s.getJSON(ctx, s.cfg.WalletURL+"/api/v1/wallets/"+url.PathEscape(userID), bearerToken, &wallet); err != nil {
		return nil, "", err
	}
	amount, _ := wallet.Balance.Float64()
	payload := map[string]any{
		"balance": map[string]any{
			"realMoney": map[string]any{
				"value":    map[string]any{"amount": amount},
				"currency": wallet.Currency,
			},
			"reserved":  mustFloat(wallet.Reserved),
			"available": mustFloat(wallet.Available),
		},
	}
	return payload, snapshotHash(payload), nil
}

func (s *RealtimeService) getJSON(ctx context.Context, targetURL, bearerToken string, dest any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, targetURL, nil)
	if err != nil {
		return err
	}
	if bearerToken != "" {
		req.Header.Set("Authorization", bearerToken)
	}
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= http.StatusBadRequest {
		return fmt.Errorf("downstream status %d", resp.StatusCode)
	}
	return json.NewDecoder(resp.Body).Decode(dest)
}

func parseChannel(channel string) (channelDescriptor, error) {
	channel = strings.TrimSpace(channel)
	switch {
	case strings.HasPrefix(channel, "market^"):
		parts := strings.Split(channel, "^")
		if len(parts) != 2 || strings.TrimSpace(parts[1]) == "" {
			return channelDescriptor{}, fmt.Errorf("invalid market websocket channel")
		}
		return channelDescriptor{kind: "market", channel: channel, marketID: parts[1]}, nil
	case strings.HasPrefix(channel, "fixture^"):
		parts := strings.Split(channel, "^")
		if len(parts) < 2 {
			return channelDescriptor{}, fmt.Errorf("invalid fixture websocket channel")
		}
		fixtureID := parts[len(parts)-1]
		if strings.TrimSpace(fixtureID) == "" {
			return channelDescriptor{}, fmt.Errorf("invalid fixture websocket channel")
		}
		return channelDescriptor{kind: "fixture", channel: channel, fixtureID: fixtureID}, nil
	case channel == "bets":
		return channelDescriptor{kind: "bets", channel: channel, requiresAuth: true}, nil
	case channel == "wallets":
		return channelDescriptor{kind: "wallets", channel: channel, requiresAuth: true}, nil
	default:
		return channelDescriptor{}, fmt.Errorf("unsupported websocket channel")
	}
}

func parseToken(secret, issuer, audience, raw string) (*Claims, error) {
	tokenValue := strings.TrimSpace(raw)
	if tokenValue == "" {
		return nil, fmt.Errorf("missing authorization token")
	}
	if strings.Contains(tokenValue, " ") {
		parts := strings.SplitN(tokenValue, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			return nil, fmt.Errorf("invalid authorization header format")
		}
		tokenValue = strings.TrimSpace(parts[1])
	}
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenValue, claims, func(token *jwt.Token) (interface{}, error) {
		return []byte(secret), nil
	})
	if err != nil || !token.Valid {
		return nil, fmt.Errorf("invalid or expired token")
	}
	if issuer != "" && claims.Issuer != "" && claims.Issuer != issuer {
		return nil, fmt.Errorf("token issuer mismatch")
	}
	if audience != "" && len(claims.Audience) > 0 {
		matched := false
		for _, candidate := range claims.Audience {
			if candidate == audience {
				matched = true
				break
			}
		}
		if !matched {
			return nil, fmt.Errorf("token audience mismatch")
		}
	}
	if strings.TrimSpace(claims.UserID) == "" {
		return nil, fmt.Errorf("token missing user_id")
	}
	return claims, nil
}

func mapBetTopicToState(topic string, payload map[string]any) (string, bool) {
	switch topic {
	case "phoenix.bet.placed":
		return "OPENED", true
	case "phoenix.bet.cashed-out", "phoenix.bet.settled":
		result := strings.ToLower(strings.TrimSpace(stringField(payload, "result")))
		if result == "cancelled" {
			return "CANCELLED", true
		}
		if result == "failed" {
			return "FAILED", true
		}
		return "SETTLED", true
	case "phoenix.bet.updated":
		status := strings.ToLower(strings.TrimSpace(stringField(payload, "status")))
		switch status {
		case "pending":
			return "OPENED", true
		case "cancelled":
			return "CANCELLED", true
		case "failed":
			return "FAILED", true
		case "won", "lost", "voided", "pushed", "cashed_out", "settled":
			return "SETTLED", true
		default:
			return "", false
		}
	default:
		return "", false
	}
}

func mapMarketUpdate(market *marketSnapshot) map[string]any {
	selectionOdds := make([]map[string]any, 0, len(market.Outcomes))
	for _, outcome := range market.Outcomes {
		odds := outcome.Odds
		if odds.IsZero() {
			if mapped, ok := market.Odds[outcome.OutcomeID]; ok {
				odds = mapped
			}
		}
		selectionOdds = append(selectionOdds, map[string]any{
			"selectionId":   outcome.OutcomeID,
			"selectionName": outcome.Name,
			"odds":          mustFloat(odds),
			"displayOdds": map[string]any{
				"decimal":    mustFloat(odds),
				"american":   decimalToAmerican(mustFloat(odds)),
				"fractional": decimalToFractional(mustFloat(odds)),
			},
		})
	}
	status := strings.ToLower(strings.TrimSpace(market.Status))
	state := "SUSPENDED"
	if status == "open" {
		state = "ACTIVE"
	}
	return map[string]any{
		"marketId":   market.MarketID,
		"marketName": market.MarketType,
		"marketStatus": map[string]any{
			"type": state,
			"changeReason": map[string]any{
				"status": market.Status,
				"type":   strings.ToUpper(status),
			},
		},
		"marketType":    strings.ToUpper(strings.TrimSpace(market.MarketType)),
		"selectionOdds": selectionOdds,
		"specifiers": map[string]any{
			"variant": "",
			"way":     "",
		},
	}
}

func mapFixtureUpdate(event *fixtureSnapshot) map[string]any {
	homeScore := 0
	awayScore := 0
	if event.LiveScore != nil {
		homeScore = event.LiveScore.HomeScore
		awayScore = event.LiveScore.AwayScore
	} else if event.Result != nil {
		homeScore = event.Result.HomeScore
		awayScore = event.Result.AwayScore
	}
	name := strings.TrimSpace(strings.Join([]string{event.HomeTeam, "vs", event.AwayTeam}, " "))
	name = strings.Join(strings.Fields(name), " ")
	return map[string]any{
		"id":        event.EventID,
		"name":      name,
		"startTime": event.ScheduledStart.Format(time.RFC3339),
		"status":    mapFixtureStatus(event.Status),
		"score": map[string]any{
			"home": homeScore,
			"away": awayScore,
		},
	}
}

func mapFixtureStatus(status string) string {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case "live", "in_play":
		return "IN_PLAY"
	case "scheduled", "upcoming", "pre_game":
		return "PRE_GAME"
	case "completed", "finished", "post_game":
		return "POST_GAME"
	case "cancelled", "abandoned":
		return "GAME_ABANDONED"
	case "paused", "break":
		return "BREAK_IN_PLAY"
	default:
		return strings.ToUpper(strings.TrimSpace(status))
	}
}

func snapshotHash(payload any) string {
	raw, err := json.Marshal(payload)
	if err != nil {
		return ""
	}
	sum := sha256.Sum256(raw)
	return hex.EncodeToString(sum[:])
}

func stringField(payload map[string]any, key string) string {
	if value, ok := payload[key]; ok {
		switch typed := value.(type) {
		case string:
			return strings.TrimSpace(typed)
		}
	}
	return ""
}

func mustFloat(value decimal.Decimal) float64 {
	number, _ := value.Float64()
	return number
}

func decimalToAmerican(decimalOdds float64) int {
	if decimalOdds <= 1 {
		return 0
	}
	if decimalOdds >= 2 {
		return int((decimalOdds - 1) * 100)
	}
	return int(-100 / (decimalOdds - 1))
}

func decimalToFractional(decimalOdds float64) string {
	if decimalOdds <= 1 {
		return "0/1"
	}
	numerator := int((decimalOdds - 1) * 100)
	denominator := 100
	divisor := greatestCommonDivisor(numerator, denominator)
	return fmt.Sprintf("%d/%d", numerator/divisor, denominator/divisor)
}

func greatestCommonDivisor(a, b int) int {
	for b != 0 {
		a, b = b, a%b
	}
	if a == 0 {
		return 1
	}
	return a
}

func newZapLogger(environment string) (*zap.Logger, error) {
	if environment == "development" {
		return zap.NewDevelopment()
	}
	return zap.NewProduction()
}
