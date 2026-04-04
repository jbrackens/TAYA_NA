package handlers

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/shopspring/decimal"

	"github.com/phoenixbot/phoenix-gateway/internal/config"
	"github.com/phoenixbot/phoenix-gateway/internal/middleware"
	"github.com/phoenixbot/phoenix-gateway/internal/service"
)

const sportsbookWSPollInterval = 2 * time.Second

type sportsbookWSInbound struct {
	Event         string `json:"event"`
	Channel       string `json:"channel"`
	CorrelationID string `json:"correlationId,omitempty"`
	Token         string `json:"token,omitempty"`
}

type sportsbookWSOutbound struct {
	Event         string `json:"event"`
	Channel       string `json:"channel"`
	CorrelationID string `json:"correlationId,omitempty"`
	Data          any    `json:"data,omitempty"`
}

type sportsbookWSChannel struct {
	kind         string
	channel      string
	marketID     string
	fixtureID    string
	requiresAuth bool
}

type sportsbookWSClient struct {
	logger        *slog.Logger
	service       *service.GatewayService
	conn          *websocket.Conn
	httpClient    *http.Client
	authConfig    config.AuthConfig
	writeMu       sync.Mutex
	subscriptions map[string]context.CancelFunc
	subMu         sync.Mutex
}

type goMarketResponse struct {
	MarketID   string                     `json:"market_id"`
	MarketType string                     `json:"market_type"`
	Status     string                     `json:"status"`
	Outcomes   []goMarketOutcome          `json:"outcomes"`
	Odds       map[string]decimal.Decimal `json:"odds"`
}

type goMarketOutcome struct {
	OutcomeID string          `json:"outcome_id"`
	Name      string          `json:"name"`
	Odds      decimal.Decimal `json:"odds"`
}

type goEventResponse struct {
	EventID        string             `json:"event_id"`
	HomeTeam       string             `json:"home_team"`
	AwayTeam       string             `json:"away_team"`
	Status         string             `json:"status"`
	ScheduledStart time.Time          `json:"scheduled_start"`
	LiveScore      *goEventLiveScore  `json:"live_score,omitempty"`
	Result         *goEventResultInfo `json:"result,omitempty"`
}

type goEventLiveScore struct {
	HomeScore int `json:"home_score"`
	AwayScore int `json:"away_score"`
}

type goEventResultInfo struct {
	HomeScore int `json:"home_score"`
	AwayScore int `json:"away_score"`
}

type goWalletSummaryResponse struct {
	UserID    string          `json:"user_id"`
	Balance   decimal.Decimal `json:"balance"`
	Currency  string          `json:"currency"`
	Reserved  decimal.Decimal `json:"reserved"`
	Available decimal.Decimal `json:"available"`
}

type goListBetsResponse struct {
	Data []goBetResponse `json:"data"`
}

type goBetResponse struct {
	BetID  string `json:"bet_id"`
	Status string `json:"status"`
}

func (h *Handlers) SportsbookWebSocket(w http.ResponseWriter, r *http.Request) {
	if h.service.WebsocketRealtimeProxyEnabled() {
		if realtimeURL, ok := h.service.RealtimeServiceURL(); ok && strings.TrimSpace(realtimeURL) != "" {
			h.proxySportsbookWebSocket(w, r, realtimeURL)
			return
		}
	}
	upgrader := websocket.Upgrader{
		ReadBufferSize:  4096,
		WriteBufferSize: 4096,
		CheckOrigin:     websocketOriginChecker(h.service.WebsocketAllowedOrigins(), h.service.Environment()),
	}
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		h.logger.Warn("websocket upgrade failed", slog.Any("error", err))
		return
	}

	authCfg := h.service.AuthConfig()
	client := &sportsbookWSClient{
		logger:        h.logger,
		service:       h.service,
		conn:          conn,
		httpClient:    &http.Client{Timeout: 1500 * time.Millisecond},
		authConfig:    authCfg,
		subscriptions: make(map[string]context.CancelFunc),
	}
	defer client.close()

	_ = conn.SetReadDeadline(time.Now().Add(90 * time.Second))
	conn.SetPongHandler(func(string) error {
		return conn.SetReadDeadline(time.Now().Add(90 * time.Second))
	})

	for {
		var message sportsbookWSInbound
		if err := conn.ReadJSON(&message); err != nil {
			h.logger.Debug("websocket connection closed", slog.Any("error", err))
			return
		}
		switch strings.ToLower(strings.TrimSpace(message.Event)) {
		case "subscribe":
			client.subscribe(r.Context(), message)
		case "unsubscribe":
			client.unsubscribe(message)
		case "heartbeat":
			_ = client.writeJSON(sportsbookWSOutbound{
				Event:         "heartbeat",
				Channel:       "heartbeat",
				CorrelationID: message.CorrelationID,
				Data:          map[string]any{"status": "ok"},
			})
		default:
			client.writeError(message.Channel, message.CorrelationID, "unsupported websocket event")
		}
	}
}

func (h *Handlers) proxySportsbookWebSocket(w http.ResponseWriter, r *http.Request, realtimeURL string) {
	upgrader := websocket.Upgrader{
		ReadBufferSize:  4096,
		WriteBufferSize: 4096,
		CheckOrigin:     websocketOriginChecker(h.service.WebsocketAllowedOrigins(), h.service.Environment()),
	}
	clientConn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		h.logger.Warn("websocket upgrade failed", slog.Any("error", err))
		return
	}
	defer clientConn.Close()

	target, err := buildRealtimeWebSocketURL(realtimeURL, r.URL.RawQuery)
	if err != nil {
		h.logger.Error("invalid realtime websocket target", slog.Any("error", err))
		_ = clientConn.WriteControl(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseInternalServerErr, "invalid realtime target"), time.Now().Add(5*time.Second))
		return
	}

	headers := http.Header{}
	if requestID := w.Header().Get("X-Request-ID"); requestID != "" {
		headers.Set("X-Request-ID", requestID)
	}
	if correlationID := w.Header().Get("X-Correlation-ID"); correlationID != "" {
		headers.Set("X-Correlation-ID", correlationID)
	}
	if forwardedHost := r.Host; forwardedHost != "" {
		headers.Set("X-Forwarded-Host", forwardedHost)
	}
	headers.Set("X-Forwarded-Proto", forwardedProto(r))

	backendConn, _, err := websocket.DefaultDialer.Dial(target, headers)
	if err != nil {
		h.logger.Error("realtime websocket dial failed", slog.Any("error", err), slog.String("target", target))
		_ = clientConn.WriteControl(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseTryAgainLater, "realtime unavailable"), time.Now().Add(5*time.Second))
		return
	}
	defer backendConn.Close()

	done := make(chan struct{}, 2)
	go proxyWebSocketMessages(clientConn, backendConn, done)
	go proxyWebSocketMessages(backendConn, clientConn, done)
	<-done
}

func buildRealtimeWebSocketURL(baseURL, rawQuery string) (string, error) {
	target, err := url.Parse(strings.TrimSpace(baseURL))
	if err != nil {
		return "", err
	}
	switch target.Scheme {
	case "http":
		target.Scheme = "ws"
	case "https":
		target.Scheme = "wss"
	case "ws", "wss":
	default:
		return "", fmt.Errorf("unsupported realtime scheme")
	}
	target.Path = singleJoiningSlash(target.Path, "/api/v1/ws/web-socket")
	target.RawQuery = rawQuery
	return target.String(), nil
}

func proxyWebSocketMessages(src, dst *websocket.Conn, done chan<- struct{}) {
	defer func() {
		done <- struct{}{}
	}()
	for {
		messageType, payload, err := src.ReadMessage()
		if err != nil {
			_ = dst.WriteControl(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseNormalClosure, ""), time.Now().Add(5*time.Second))
			return
		}
		_ = dst.SetWriteDeadline(time.Now().Add(10 * time.Second))
		if err := dst.WriteMessage(messageType, payload); err != nil {
			return
		}
	}
}

func (c *sportsbookWSClient) close() {
	c.subMu.Lock()
	for _, cancel := range c.subscriptions {
		cancel()
	}
	c.subscriptions = map[string]context.CancelFunc{}
	c.subMu.Unlock()
	_ = c.conn.Close()
}

func (c *sportsbookWSClient) subscribe(parent context.Context, message sportsbookWSInbound) {
	channel, err := parseSportsbookWSChannel(message.Channel)
	if err != nil {
		c.writeError(message.Channel, message.CorrelationID, err.Error())
		return
	}

	var claims *middleware.Claims
	token := strings.TrimSpace(message.Token)
	if channel.requiresAuth {
		parsed, err := middleware.ParseToken(c.authConfig.JWTSecretKey, c.authConfig.JWTIssuer, c.authConfig.JWTAudience, token)
		if err != nil {
			c.writeError(channel.channel, message.CorrelationID, "authentication required for websocket channel")
			return
		}
		claims = parsed
		token = "Bearer " + strings.TrimSpace(token)
	}

	c.subMu.Lock()
	if _, exists := c.subscriptions[channel.channel]; exists {
		c.subMu.Unlock()
		_ = c.writeJSON(sportsbookWSOutbound{
			Event:         "subscribe:success",
			Channel:       channel.channel,
			CorrelationID: message.CorrelationID,
		})
		return
	}
	ctx, cancel := context.WithCancel(parent)
	c.subscriptions[channel.channel] = cancel
	c.subMu.Unlock()

	_ = c.writeJSON(sportsbookWSOutbound{
		Event:         "subscribe:success",
		Channel:       channel.channel,
		CorrelationID: message.CorrelationID,
	})

	go c.runSubscription(ctx, channel, claims, token)
}

func (c *sportsbookWSClient) unsubscribe(message sportsbookWSInbound) {
	c.subMu.Lock()
	cancel, exists := c.subscriptions[message.Channel]
	if exists {
		cancel()
		delete(c.subscriptions, message.Channel)
	}
	c.subMu.Unlock()

	if exists {
		_ = c.writeJSON(sportsbookWSOutbound{
			Event:         "unsubscribe:success",
			Channel:       message.Channel,
			CorrelationID: message.CorrelationID,
		})
	}
}

func (c *sportsbookWSClient) runSubscription(ctx context.Context, channel sportsbookWSChannel, claims *middleware.Claims, bearerToken string) {
	ticker := time.NewTicker(sportsbookWSPollInterval)
	defer ticker.Stop()

	initialized := false
	previousHash := ""
	betStates := map[string]string{}

	for {
		select {
		case <-ctx.Done():
			return
		default:
		}

		switch channel.kind {
		case "market":
			payload, hash, err := c.fetchMarketUpdate(ctx, channel.marketID)
			if err == nil {
				if initialized && previousHash != hash {
					_ = c.writeJSON(sportsbookWSOutbound{Event: "update", Channel: channel.channel, Data: payload})
				}
				previousHash = hash
				initialized = true
			}
		case "fixture":
			payload, hash, err := c.fetchFixtureUpdate(ctx, channel.fixtureID)
			if err == nil {
				if initialized && previousHash != hash {
					_ = c.writeJSON(sportsbookWSOutbound{Event: "update", Channel: channel.channel, Data: payload})
				}
				previousHash = hash
				initialized = true
			}
		case "wallets":
			payload, hash, err := c.fetchWalletUpdate(ctx, claims.UserID, bearerToken)
			if err == nil {
				if initialized && previousHash != hash {
					_ = c.writeJSON(sportsbookWSOutbound{Event: "update", Channel: channel.channel, Data: payload})
				}
				previousHash = hash
				initialized = true
			}
		case "bets":
			updates, nextStates, err := c.fetchBetUpdates(ctx, claims.UserID, bearerToken, betStates, initialized)
			if err == nil {
				if initialized {
					for _, update := range updates {
						_ = c.writeJSON(sportsbookWSOutbound{Event: "update", Channel: channel.channel, Data: update})
					}
				}
				betStates = nextStates
				initialized = true
			}
		}

		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}

func (c *sportsbookWSClient) fetchMarketUpdate(ctx context.Context, marketID string) (map[string]any, string, error) {
	serviceURL, ok := c.service.ServiceURL("phoenix-market-engine")
	if !ok {
		return nil, "", fmt.Errorf("market service unavailable")
	}
	var market goMarketResponse
	if err := c.getJSON(ctx, strings.TrimRight(serviceURL, "/")+"/api/v1/markets/"+url.PathEscape(marketID), "", &market); err != nil {
		return nil, "", err
	}
	payload := mapMarketUpdate(&market)
	return payload, snapshotHash(payload), nil
}

func (c *sportsbookWSClient) fetchFixtureUpdate(ctx context.Context, fixtureID string) (map[string]any, string, error) {
	serviceURL, ok := c.service.ServiceURL("phoenix-events")
	if !ok {
		return nil, "", fmt.Errorf("events service unavailable")
	}
	var event goEventResponse
	if err := c.getJSON(ctx, strings.TrimRight(serviceURL, "/")+"/api/v1/events/"+url.PathEscape(fixtureID), "", &event); err != nil {
		return nil, "", err
	}
	payload := mapFixtureUpdate(&event)
	return payload, snapshotHash(payload), nil
}

func (c *sportsbookWSClient) fetchWalletUpdate(ctx context.Context, userID, bearerToken string) (map[string]any, string, error) {
	serviceURL, ok := c.service.ServiceURL("phoenix-wallet")
	if !ok {
		return nil, "", fmt.Errorf("wallet service unavailable")
	}
	var wallet goWalletSummaryResponse
	if err := c.getJSON(ctx, strings.TrimRight(serviceURL, "/")+"/api/v1/wallets/"+url.PathEscape(userID), bearerToken, &wallet); err != nil {
		return nil, "", err
	}
	amount, _ := wallet.Balance.Float64()
	payload := map[string]any{
		"balance": map[string]any{
			"realMoney": map[string]any{
				"value": map[string]any{
					"amount": amount,
				},
				"currency": wallet.Currency,
			},
			"reserved":  mustFloat(wallet.Reserved),
			"available": mustFloat(wallet.Available),
		},
	}
	return payload, snapshotHash(payload), nil
}

func (c *sportsbookWSClient) fetchBetUpdates(ctx context.Context, userID, bearerToken string, previous map[string]string, initialized bool) ([]map[string]any, map[string]string, error) {
	serviceURL, ok := c.service.ServiceURL("phoenix-betting-engine")
	if !ok {
		return nil, nil, fmt.Errorf("betting service unavailable")
	}
	var response goListBetsResponse
	if err := c.getJSON(ctx, strings.TrimRight(serviceURL, "/")+"/api/v1/users/"+url.PathEscape(userID)+"/bets?page=1&limit=100", bearerToken, &response); err != nil {
		return nil, nil, err
	}

	nextStates := make(map[string]string, len(response.Data))
	updates := make([]map[string]any, 0)
	for _, bet := range response.Data {
		state, ok := mapBetStatusToWSState(bet.Status)
		if !ok {
			continue
		}
		nextStates[bet.BetID] = state
		if !initialized {
			continue
		}
		if previousState, exists := previous[bet.BetID]; !exists || previousState != state {
			updates = append(updates, map[string]any{
				"betId": bet.BetID,
				"state": state,
			})
		}
	}
	return updates, nextStates, nil
}

func (c *sportsbookWSClient) getJSON(ctx context.Context, targetURL, bearerToken string, dest any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, targetURL, nil)
	if err != nil {
		return err
	}
	if bearerToken != "" {
		req.Header.Set("Authorization", bearerToken)
	}
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= http.StatusBadRequest {
		return fmt.Errorf("downstream status %d", resp.StatusCode)
	}
	return json.NewDecoder(resp.Body).Decode(dest)
}

func (c *sportsbookWSClient) writeError(channel, correlationID, message string) {
	_ = c.writeJSON(sportsbookWSOutbound{
		Event:         "error",
		Channel:       channel,
		CorrelationID: correlationID,
		Data: map[string]any{
			"message": message,
		},
	})
}

func (c *sportsbookWSClient) writeJSON(payload sportsbookWSOutbound) error {
	c.writeMu.Lock()
	defer c.writeMu.Unlock()
	_ = c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
	return c.conn.WriteJSON(payload)
}

func parseSportsbookWSChannel(channel string) (sportsbookWSChannel, error) {
	channel = strings.TrimSpace(channel)
	switch {
	case strings.HasPrefix(channel, "market^"):
		parts := strings.Split(channel, "^")
		if len(parts) != 2 || strings.TrimSpace(parts[1]) == "" {
			return sportsbookWSChannel{}, fmt.Errorf("invalid market websocket channel")
		}
		return sportsbookWSChannel{kind: "market", channel: channel, marketID: parts[1]}, nil
	case strings.HasPrefix(channel, "fixture^"):
		parts := strings.Split(channel, "^")
		if len(parts) < 2 {
			return sportsbookWSChannel{}, fmt.Errorf("invalid fixture websocket channel")
		}
		fixtureID := parts[len(parts)-1]
		if strings.TrimSpace(fixtureID) == "" {
			return sportsbookWSChannel{}, fmt.Errorf("invalid fixture websocket channel")
		}
		return sportsbookWSChannel{kind: "fixture", channel: channel, fixtureID: fixtureID}, nil
	case channel == "bets":
		return sportsbookWSChannel{kind: "bets", channel: channel, requiresAuth: true}, nil
	case channel == "wallets":
		return sportsbookWSChannel{kind: "wallets", channel: channel, requiresAuth: true}, nil
	default:
		return sportsbookWSChannel{}, fmt.Errorf("unsupported websocket channel")
	}
}

func mapMarketUpdate(market *goMarketResponse) map[string]any {
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

func mapFixtureUpdate(event *goEventResponse) map[string]any {
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

func mapBetStatusToWSState(status string) (string, bool) {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case "pending":
		return "OPENED", true
	case "won", "lost", "voided", "pushed", "cashed_out", "settled":
		return "SETTLED", true
	case "cancelled":
		return "CANCELLED", true
	case "failed":
		return "FAILED", true
	default:
		return "", false
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

func websocketOriginChecker(allowedOrigins []string, environment string) func(*http.Request) bool {
	normalizedAllowed := make(map[string]struct{}, len(allowedOrigins))
	for _, origin := range allowedOrigins {
		if normalized, ok := normalizeOrigin(origin); ok {
			normalizedAllowed[normalized] = struct{}{}
		}
	}
	return func(r *http.Request) bool {
		originHeader := strings.TrimSpace(r.Header.Get("Origin"))
		if originHeader == "" {
			return true
		}
		normalizedOrigin, ok := normalizeOrigin(originHeader)
		if !ok {
			return false
		}
		if len(normalizedAllowed) > 0 {
			_, ok := normalizedAllowed[normalizedOrigin]
			return ok
		}
		if strings.EqualFold(strings.TrimSpace(environment), "development") {
			return true
		}
		requestOrigin, ok := requestOrigin(r)
		if !ok {
			return false
		}
		return normalizedOrigin == requestOrigin
	}
}

func normalizeOrigin(raw string) (string, bool) {
	parsed, err := url.Parse(strings.TrimSpace(raw))
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return "", false
	}
	return strings.ToLower(parsed.Scheme) + "://" + strings.ToLower(parsed.Host), true
}

func requestOrigin(r *http.Request) (string, bool) {
	scheme := strings.TrimSpace(r.Header.Get("X-Forwarded-Proto"))
	if scheme == "" {
		if r.TLS != nil {
			scheme = "https"
		} else {
			scheme = "http"
		}
	} else if strings.Contains(scheme, ",") {
		scheme = strings.TrimSpace(strings.SplitN(scheme, ",", 2)[0])
	}
	host := strings.TrimSpace(r.Host)
	if scheme == "" || host == "" {
		return "", false
	}
	return strings.ToLower(scheme) + "://" + strings.ToLower(host), true
}
