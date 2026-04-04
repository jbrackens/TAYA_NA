package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gorilla/websocket"
)

const (
	defaultGatewayBase = "http://localhost:8080"
	defaultTimeout     = 12 * time.Second
)

type config struct {
	GatewayBase   string
	PlayerUser    string
	AdminUser     string
	Password      string
	ArtifactPath  string
	RequestTimout time.Duration
}

type loginResponse struct {
	AccessToken string `json:"access_token"`
	User        struct {
		UserID string `json:"user_id"`
	} `json:"user"`
	UserID string `json:"-"`
}

type marketListResponse struct {
	Data []market `json:"data"`
}

type market struct {
	MarketID string                 `json:"market_id"`
	EventID  string                 `json:"event_id"`
	Outcomes []marketOutcome        `json:"outcomes"`
	Odds     map[string]json.Number `json:"odds"`
	Status   string                 `json:"status"`
}

type marketOutcome struct {
	OutcomeID string      `json:"outcome_id"`
	Name      string      `json:"name"`
	Odds      json.Number `json:"odds"`
}

type event struct {
	EventID   string     `json:"event_id"`
	Status    string     `json:"status"`
	LiveScore *liveScore `json:"live_score,omitempty"`
}

type liveScore struct {
	HomeScore int `json:"home_score"`
	AwayScore int `json:"away_score"`
}

type walletSummary struct {
	UserID    string      `json:"user_id"`
	Balance   json.Number `json:"balance"`
	Currency  string      `json:"currency"`
	Reserved  json.Number `json:"reserved"`
	Available json.Number `json:"available"`
}

type bet struct {
	BetID string `json:"bet_id"`
}

type wsMessage struct {
	Event         string          `json:"event"`
	Channel       string          `json:"channel"`
	CorrelationID string          `json:"correlationId,omitempty"`
	Data          json.RawMessage `json:"data,omitempty"`
}

type report struct {
	StartedAt   time.Time
	FinishedAt  time.Time
	GatewayBase string
	WSURL       string
	PlayerUser  string
	AdminUser   string
	MarketID    string
	EventID     string
	Channels    []string
	Steps       []stepResult
	Passed      bool
	Failure     string
}

type stepResult struct {
	Name    string
	Trigger string
	Channel string
	Result  string
	Detail  string
}

func main() {
	cfg := loadConfig()
	rep := &report{
		StartedAt:   cfgNow(),
		GatewayBase: cfg.GatewayBase,
		PlayerUser:  cfg.PlayerUser,
		AdminUser:   cfg.AdminUser,
	}
	err := run(cfg, rep)
	rep.FinishedAt = cfgNow()
	rep.Passed = err == nil
	if err != nil {
		rep.Failure = err.Error()
	}
	if cfg.ArtifactPath != "" {
		if writeErr := writeArtifact(cfg.ArtifactPath, rep); writeErr != nil {
			fmt.Fprintf(os.Stderr, "failed to write artifact: %v\n", writeErr)
			if err == nil {
				err = writeErr
			}
		}
	}
	if err != nil {
		fmt.Fprintf(os.Stderr, "realtime rehearsal failed: %v\n", err)
		if cfg.ArtifactPath != "" {
			fmt.Fprintf(os.Stderr, "artifact: %s\n", cfg.ArtifactPath)
		}
		os.Exit(1)
	}
	fmt.Printf("Realtime rehearsal passed.\n")
	if cfg.ArtifactPath != "" {
		fmt.Printf("Artifact: %s\n", cfg.ArtifactPath)
	}
}

func run(cfg config, rep *report) error {
	client := &http.Client{Timeout: cfg.RequestTimout}

	adminAuth, err := login(client, cfg.GatewayBase, cfg.AdminUser, cfg.Password)
	if err != nil {
		return fmt.Errorf("admin login failed: %w", err)
	}
	playerAuth, err := login(client, cfg.GatewayBase, cfg.PlayerUser, cfg.Password)
	if err != nil {
		return fmt.Errorf("player login failed: %w", err)
	}

	currentWallet, err := getJSON[walletSummary](client, http.MethodGet, cfg.GatewayBase+"/api/v1/wallets/"+url.PathEscape(playerAuth.UserID), bearer(playerAuth.AccessToken), nil, http.StatusOK)
	if err != nil {
		return fmt.Errorf("wallet summary lookup failed: %w", err)
	}

	marketList, err := getJSON[marketListResponse](client, http.MethodGet, cfg.GatewayBase+"/api/v1/markets?page=1&limit=1", "", nil, http.StatusOK)
	if err != nil {
		return fmt.Errorf("market lookup failed: %w", err)
	}
	if len(marketList.Data) == 0 {
		return errors.New("no markets found for realtime rehearsal")
	}
	selectedMarket := marketList.Data[0]
	selectedEvent, err := getJSON[event](client, http.MethodGet, cfg.GatewayBase+"/api/v1/events/"+url.PathEscape(selectedMarket.EventID), "", nil, http.StatusOK)
	if err != nil {
		return fmt.Errorf("event lookup failed: %w", err)
	}
	if len(selectedMarket.Outcomes) == 0 {
		return errors.New("selected market has no outcomes")
	}
	rep.MarketID = selectedMarket.MarketID
	rep.EventID = selectedEvent.EventID

	wsURL, err := websocketURL(cfg.GatewayBase)
	if err != nil {
		return err
	}
	rep.WSURL = wsURL
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		return fmt.Errorf("websocket dial failed: %w", err)
	}
	defer conn.Close()
	_ = conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	conn.SetPongHandler(func(string) error {
		return conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	})

	messages := make(chan wsMessage, 64)
	readErrs := make(chan error, 1)
	go readLoop(conn, messages, readErrs)

	marketChannel := "market^" + selectedMarket.MarketID
	fixtureChannel := "fixture^demo^" + selectedEvent.EventID
	rep.Channels = []string{marketChannel, fixtureChannel, "bets", "wallets"}

	subscriptions := []struct {
		channel string
		token   string
		corrID  string
	}{
		{channel: marketChannel, corrID: "sub-market"},
		{channel: fixtureChannel, corrID: "sub-fixture"},
		{channel: "bets", token: playerAuth.AccessToken, corrID: "sub-bets"},
		{channel: "wallets", token: playerAuth.AccessToken, corrID: "sub-wallets"},
	}
	for _, sub := range subscriptions {
		payload := map[string]any{
			"event":         "subscribe",
			"channel":       sub.channel,
			"correlationId": sub.corrID,
		}
		if sub.token != "" {
			payload["token"] = sub.token
		}
		if err := conn.WriteJSON(payload); err != nil {
			return fmt.Errorf("websocket subscribe failed for %s: %w", sub.channel, err)
		}
		if _, err := waitForMessage(messages, readErrs, cfg.RequestTimout, func(msg wsMessage) bool {
			return msg.Event == "subscribe:success" && msg.Channel == sub.channel && msg.CorrelationID == sub.corrID
		}); err != nil {
			return fmt.Errorf("subscribe ack failed for %s: %w", sub.channel, err)
		}
	}

	updatedMarket, err := triggerMarketUpdate(client, cfg.GatewayBase, adminAuth.AccessToken, selectedMarket)
	rep.Steps = append(rep.Steps, stepResult{
		Name:    "market",
		Trigger: "PUT /api/v1/markets/{marketID}/odds",
		Channel: marketChannel,
	})
	if err != nil {
		rep.Steps[len(rep.Steps)-1].Result = "FAIL"
		rep.Steps[len(rep.Steps)-1].Detail = err.Error()
		return err
	}
	if _, err := waitForMessage(messages, readErrs, cfg.RequestTimout, func(msg wsMessage) bool {
		return msg.Event == "update" && msg.Channel == marketChannel && bytes.Contains(msg.Data, []byte(updatedMarket.MarketID))
	}); err != nil {
		rep.Steps[len(rep.Steps)-1].Result = "FAIL"
		rep.Steps[len(rep.Steps)-1].Detail = err.Error()
		return fmt.Errorf("market update not observed: %w", err)
	}
	rep.Steps[len(rep.Steps)-1].Result = "PASS"
	rep.Steps[len(rep.Steps)-1].Detail = fmt.Sprintf("market %s odds updated", updatedMarket.MarketID)

	updatedEvent, err := triggerFixtureUpdate(client, cfg.GatewayBase, adminAuth.AccessToken, selectedEvent)
	rep.Steps = append(rep.Steps, stepResult{
		Name:    "fixture",
		Trigger: "PUT /api/v1/events/{eventID}/live-score",
		Channel: fixtureChannel,
	})
	if err != nil {
		rep.Steps[len(rep.Steps)-1].Result = "FAIL"
		rep.Steps[len(rep.Steps)-1].Detail = err.Error()
		return err
	}
	if _, err := waitForMessage(messages, readErrs, cfg.RequestTimout, func(msg wsMessage) bool {
		return msg.Event == "update" && msg.Channel == fixtureChannel && bytes.Contains(msg.Data, []byte(updatedEvent.EventID))
	}); err != nil {
		rep.Steps[len(rep.Steps)-1].Result = "FAIL"
		rep.Steps[len(rep.Steps)-1].Detail = err.Error()
		return fmt.Errorf("fixture update not observed: %w", err)
	}
	rep.Steps[len(rep.Steps)-1].Result = "PASS"
	rep.Steps[len(rep.Steps)-1].Detail = fmt.Sprintf("fixture %s live-score updated", updatedEvent.EventID)

	updatedWallet, err := triggerWalletDeposit(client, cfg.GatewayBase, playerAuth.AccessToken, playerAuth.UserID)
	rep.Steps = append(rep.Steps, stepResult{
		Name:    "wallet",
		Trigger: "POST /api/v1/wallets/{userID}/deposits",
		Channel: "wallets",
	})
	if err != nil {
		rep.Steps[len(rep.Steps)-1].Result = "FAIL"
		rep.Steps[len(rep.Steps)-1].Detail = err.Error()
		return err
	}
	if _, err := waitForMessage(messages, readErrs, cfg.RequestTimout, func(msg wsMessage) bool {
		return msg.Event == "update" && msg.Channel == "wallets" && walletMessageChanged(msg.Data, currentWallet.Balance)
	}); err != nil {
		rep.Steps[len(rep.Steps)-1].Result = "FAIL"
		rep.Steps[len(rep.Steps)-1].Detail = err.Error()
		return fmt.Errorf("wallet update not observed: %w", err)
	}
	rep.Steps[len(rep.Steps)-1].Result = "PASS"
	rep.Steps[len(rep.Steps)-1].Detail = fmt.Sprintf("wallet balance moved to %s %s", updatedWallet.Balance, updatedWallet.Currency)

	newBet, err := triggerBetPlacement(client, cfg.GatewayBase, playerAuth.AccessToken, playerAuth.UserID, *updatedMarket)
	rep.Steps = append(rep.Steps, stepResult{
		Name:    "bet",
		Trigger: "POST /api/v1/bets",
		Channel: "bets",
	})
	if err != nil {
		rep.Steps[len(rep.Steps)-1].Result = "FAIL"
		rep.Steps[len(rep.Steps)-1].Detail = err.Error()
		return err
	}
	if _, err := waitForMessage(messages, readErrs, cfg.RequestTimout, func(msg wsMessage) bool {
		return msg.Event == "update" && msg.Channel == "bets" && betMessageMatches(msg.Data, newBet.BetID, "OPENED")
	}); err != nil {
		rep.Steps[len(rep.Steps)-1].Result = "FAIL"
		rep.Steps[len(rep.Steps)-1].Detail = err.Error()
		return fmt.Errorf("bet update not observed: %w", err)
	}
	rep.Steps[len(rep.Steps)-1].Result = "PASS"
	rep.Steps[len(rep.Steps)-1].Detail = fmt.Sprintf("bet %s opened", newBet.BetID)

	return nil
}

func loadConfig() config {
	artifactPath := flag.String("artifact-path", strings.TrimSpace(os.Getenv("ARTIFACT_PATH")), "optional markdown artifact path")
	timeout := flag.Duration("timeout", defaultTimeout, "timeout per websocket assertion")
	flag.Parse()

	base := strings.TrimSpace(os.Getenv("API_BASE"))
	if base == "" {
		base = strings.TrimSpace(os.Getenv("GATEWAY_BASE"))
	}
	if base == "" {
		base = defaultGatewayBase
	}
	return config{
		GatewayBase:   strings.TrimRight(base, "/"),
		PlayerUser:    envOrDefault("DEMO_PLAYER_USERNAME", "demoplayer"),
		AdminUser:     envOrDefault("DEMO_ADMIN_USERNAME", "demoadmin"),
		Password:      envOrDefault("DEMO_PASSWORD", "Password123!"),
		ArtifactPath:  strings.TrimSpace(*artifactPath),
		RequestTimout: *timeout,
	}
}

func login(client *http.Client, gatewayBase, identifier, password string) (*loginResponse, error) {
	body := map[string]string{
		"identifier": identifier,
		"password":   password,
	}
	resp, err := getJSON[loginResponse](client, http.MethodPost, gatewayBase+"/auth/login", "", body, http.StatusOK)
	if err != nil {
		return nil, err
	}
	resp.UserID = resp.User.UserID
	if resp.UserID == "" {
		return nil, errors.New("login response did not include user_id")
	}
	return &resp, nil
}

func triggerMarketUpdate(client *http.Client, gatewayBase, token string, selected market) (*market, error) {
	outcome := selected.Outcomes[0]
	currentOdds := numberFloat(outcome.Odds)
	if currentOdds <= 0 {
		currentOdds = numberFloat(selected.Odds[outcome.OutcomeID])
	}
	if currentOdds <= 0 {
		return nil, errors.New("selected market outcome has no odds")
	}
	newOdds := round2(currentOdds + 0.05)
	payload := map[string]any{
		"odds": map[string]float64{
			outcome.OutcomeID: newOdds,
		},
		"reason": "investor_demo_rehearsal",
	}
	updated, err := getJSON[market](client, http.MethodPut, gatewayBase+"/api/v1/markets/"+url.PathEscape(selected.MarketID)+"/odds", bearer(token), payload, http.StatusOK)
	if err != nil {
		return nil, fmt.Errorf("market odds update failed: %w", err)
	}
	return &updated, nil
}

func triggerFixtureUpdate(client *http.Client, gatewayBase, token string, selected event) (*event, error) {
	homeScore := 1
	awayScore := 0
	if selected.LiveScore != nil {
		homeScore = selected.LiveScore.HomeScore + 1
		awayScore = selected.LiveScore.AwayScore
	}
	payload := map[string]any{
		"status":          "live",
		"home_score":      homeScore,
		"away_score":      awayScore,
		"elapsed_minutes": 5,
		"last_update":     time.Now().UTC().Format(time.RFC3339),
		"period":          "Q1",
	}
	updated, err := getJSON[event](client, http.MethodPut, gatewayBase+"/api/v1/events/"+url.PathEscape(selected.EventID)+"/live-score", bearer(token), payload, http.StatusOK)
	if err != nil {
		return nil, fmt.Errorf("fixture live-score update failed: %w", err)
	}
	return &updated, nil
}

func triggerWalletDeposit(client *http.Client, gatewayBase, token, userID string) (*walletSummary, error) {
	payload := map[string]any{
		"amount":         5.00,
		"payment_method": "card",
		"payment_token":  "demo_rehearsal_card",
		"currency":       "USD",
	}
	if _, err := getJSON[map[string]any](client, http.MethodPost, gatewayBase+"/api/v1/wallets/"+url.PathEscape(userID)+"/deposits", bearer(token), payload, http.StatusAccepted); err != nil {
		return nil, fmt.Errorf("wallet deposit failed: %w", err)
	}
	updated, err := getJSON[walletSummary](client, http.MethodGet, gatewayBase+"/api/v1/wallets/"+url.PathEscape(userID), bearer(token), nil, http.StatusOK)
	if err != nil {
		return nil, fmt.Errorf("wallet refresh failed: %w", err)
	}
	return &updated, nil
}

func triggerBetPlacement(client *http.Client, gatewayBase, token, userID string, selected market) (*bet, error) {
	outcome := selected.Outcomes[0]
	currentOdds := numberFloat(outcome.Odds)
	if currentOdds <= 0 {
		currentOdds = numberFloat(selected.Odds[outcome.OutcomeID])
	}
	if currentOdds <= 0 {
		return nil, errors.New("selected market outcome has no odds for bet placement")
	}
	payload := map[string]any{
		"user_id":    userID,
		"market_id":  selected.MarketID,
		"outcome_id": outcome.OutcomeID,
		"stake":      2.00,
		"odds_type":  "decimal",
		"acceptance": "auto",
		"odds":       round2(currentOdds),
	}
	placed, err := getJSON[bet](client, http.MethodPost, gatewayBase+"/api/v1/bets", bearer(token), payload, http.StatusCreated)
	if err != nil {
		return nil, fmt.Errorf("bet placement failed: %w", err)
	}
	return &placed, nil
}

func readLoop(conn *websocket.Conn, out chan<- wsMessage, errs chan<- error) {
	defer close(out)
	for {
		var msg wsMessage
		if err := conn.ReadJSON(&msg); err != nil {
			select {
			case errs <- err:
			default:
			}
			return
		}
		out <- msg
	}
}

func waitForMessage(messages <-chan wsMessage, errs <-chan error, timeout time.Duration, predicate func(wsMessage) bool) (wsMessage, error) {
	timer := time.NewTimer(timeout)
	defer timer.Stop()
	for {
		select {
		case err := <-errs:
			if err != nil {
				return wsMessage{}, err
			}
		case msg, ok := <-messages:
			if !ok {
				return wsMessage{}, errors.New("websocket stream closed")
			}
			if predicate(msg) {
				return msg, nil
			}
		case <-timer.C:
			return wsMessage{}, errors.New("timed out waiting for websocket message")
		}
	}
}

func walletMessageChanged(raw json.RawMessage, previousBalance json.Number) bool {
	var payload struct {
		Balance struct {
			RealMoney struct {
				Value struct {
					Amount float64 `json:"amount"`
				} `json:"value"`
			} `json:"realMoney"`
		} `json:"balance"`
	}
	if err := json.Unmarshal(raw, &payload); err != nil {
		return false
	}
	prev, _ := previousBalance.Float64()
	return payload.Balance.RealMoney.Value.Amount > prev
}

func betMessageMatches(raw json.RawMessage, betID, state string) bool {
	var payload struct {
		BetID string `json:"betId"`
		State string `json:"state"`
	}
	if err := json.Unmarshal(raw, &payload); err != nil {
		return false
	}
	return payload.BetID == betID && payload.State == state
}

func websocketURL(gatewayBase string) (string, error) {
	parsed, err := url.Parse(strings.TrimSpace(gatewayBase))
	if err != nil {
		return "", err
	}
	switch parsed.Scheme {
	case "http":
		parsed.Scheme = "ws"
	case "https":
		parsed.Scheme = "wss"
	case "ws", "wss":
	default:
		return "", fmt.Errorf("unsupported gateway scheme: %s", parsed.Scheme)
	}
	parsed.Path = joinURLPath(parsed.Path, "/api/v1/ws/web-socket")
	return parsed.String(), nil
}

func joinURLPath(basePath, child string) string {
	if strings.HasSuffix(basePath, "/") {
		basePath = strings.TrimSuffix(basePath, "/")
	}
	if !strings.HasPrefix(child, "/") {
		child = "/" + child
	}
	if basePath == "" {
		return child
	}
	return basePath + child
}

func writeArtifact(path string, rep *report) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	var buf bytes.Buffer
	status := "PASS"
	if !rep.Passed {
		status = "FAIL"
	}
	fmt.Fprintf(&buf, "# Realtime Rehearsal\n\n")
	fmt.Fprintf(&buf, "- Started: `%s`\n", rep.StartedAt.UTC().Format(time.RFC3339))
	fmt.Fprintf(&buf, "- Finished: `%s`\n", rep.FinishedAt.UTC().Format(time.RFC3339))
	fmt.Fprintf(&buf, "- Status: `%s`\n", status)
	fmt.Fprintf(&buf, "- Gateway: `%s`\n", rep.GatewayBase)
	fmt.Fprintf(&buf, "- Websocket: `%s`\n", rep.WSURL)
	fmt.Fprintf(&buf, "- Market ID: `%s`\n", rep.MarketID)
	fmt.Fprintf(&buf, "- Event ID: `%s`\n", rep.EventID)
	fmt.Fprintf(&buf, "- Channels: `%s`\n\n", strings.Join(rep.Channels, "`, `"))
	if rep.Failure != "" {
		fmt.Fprintf(&buf, "## Failure\n\n`%s`\n\n", rep.Failure)
	}
	fmt.Fprintf(&buf, "## Steps\n\n")
	fmt.Fprintf(&buf, "| Domain | Trigger | Channel | Result | Detail |\n")
	fmt.Fprintf(&buf, "| --- | --- | --- | --- | --- |\n")
	for _, step := range rep.Steps {
		fmt.Fprintf(&buf, "| %s | `%s` | `%s` | %s | %s |\n", step.Name, step.Trigger, step.Channel, step.Result, escapePipes(step.Detail))
	}
	return os.WriteFile(path, buf.Bytes(), 0o644)
}

func escapePipes(value string) string {
	return strings.ReplaceAll(value, "|", "\\|")
}

func getJSON[T any](client *http.Client, method, targetURL, authHeader string, body any, wantStatus int) (T, error) {
	var zero T
	var reader *bytes.Reader
	if body == nil {
		reader = bytes.NewReader(nil)
	} else {
		payload, err := json.Marshal(body)
		if err != nil {
			return zero, err
		}
		reader = bytes.NewReader(payload)
	}
	req, err := http.NewRequestWithContext(context.Background(), method, targetURL, reader)
	if err != nil {
		return zero, err
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if authHeader != "" {
		req.Header.Set("Authorization", authHeader)
	}
	resp, err := client.Do(req)
	if err != nil {
		return zero, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != wantStatus {
		var raw map[string]any
		_ = json.NewDecoder(resp.Body).Decode(&raw)
		return zero, fmt.Errorf("unexpected status %d for %s %s", resp.StatusCode, method, targetURL)
	}
	if err := json.NewDecoder(resp.Body).Decode(&zero); err != nil {
		return zero, err
	}
	return zero, nil
}

func bearer(token string) string {
	if strings.HasPrefix(strings.ToLower(strings.TrimSpace(token)), "bearer ") {
		return strings.TrimSpace(token)
	}
	return "Bearer " + strings.TrimSpace(token)
}

func envOrDefault(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func cfgNow() time.Time {
	return time.Now().UTC()
}

func numberFloat(n json.Number) float64 {
	v, _ := n.Float64()
	return v
}

func round2(value float64) float64 {
	return float64(int(value*100+0.5)) / 100
}
