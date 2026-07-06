package main

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"os"
	"strings"
	"time"

	_ "github.com/lib/pq"
)

type proofConfig struct {
	GatewayBaseURL string
	DSN            string
	MarketTicker   string
	PlayerEmail    string
	PlayerPassword string
	PlayerID       string
	Admin1Email    string
	Admin1Password string
	Admin1ID       string
	Admin2Email    string
	Admin2Password string
	Admin2ID       string
}

type session struct {
	client *http.Client
	csrf   string
}

type marketRow struct {
	ID     string
	Status string
}

func main() {
	cfg := proofConfig{
		GatewayBaseURL: envDefault("GATEWAY_BASE_URL", "http://127.0.0.1:18080"),
		DSN:            os.Getenv("GATEWAY_DB_DSN"),
		MarketTicker:   envDefault("MARKET_TICKER", "MLBB-FINAL-G1"),
		PlayerEmail:    envDefault("PLAYER_EMAIL", "demo@phoenix.local"),
		PlayerPassword: envDefault("PLAYER_PASSWORD", "demo123"),
		PlayerID:       envDefault("PLAYER_ID", "u-1"),
		Admin1Email:    envDefault("ADMIN1_EMAIL", "admin@phoenix.local"),
		Admin1Password: envDefault("ADMIN1_PASSWORD", "admin123"),
		Admin1ID:       envDefault("ADMIN1_ID", "user-admin"),
		Admin2Email:    envDefault("ADMIN2_EMAIL", "admin2@phoenix.local"),
		Admin2Password: envDefault("ADMIN2_PASSWORD", "admin123"),
		Admin2ID:       envDefault("ADMIN2_ID", "user-admin-2"),
	}
	if strings.TrimSpace(cfg.DSN) == "" {
		log.Fatal("GATEWAY_DB_DSN is required")
	}
	if err := run(context.Background(), cfg); err != nil {
		log.Fatal(err)
	}
}

func run(ctx context.Context, cfg proofConfig) error {
	db, err := sql.Open("postgres", cfg.DSN)
	if err != nil {
		return err
	}
	defer db.Close()
	if err := db.PingContext(ctx); err != nil {
		return fmt.Errorf("db ping: %w", err)
	}

	base, err := url.Parse(cfg.GatewayBaseURL)
	if err != nil {
		return fmt.Errorf("parse GATEWAY_BASE_URL: %w", err)
	}

	if err := ensureSecondAdmin(ctx, db, cfg); err != nil {
		return err
	}
	market, err := loadMarket(ctx, db, cfg.MarketTicker)
	if err != nil {
		return err
	}
	if err := ensureHolderPosition(ctx, db, cfg.PlayerID, market.ID); err != nil {
		return err
	}

	admin1, err := login(base, cfg.Admin1Email, cfg.Admin1Password)
	if err != nil {
		return fmt.Errorf("admin1 login: %w", err)
	}
	admin2, err := login(base, cfg.Admin2Email, cfg.Admin2Password)
	if err != nil {
		return fmt.Errorf("admin2 login: %w", err)
	}
	player, err := login(base, cfg.PlayerEmail, cfg.PlayerPassword)
	if err != nil {
		return fmt.Errorf("player login: %w", err)
	}

	if market.Status == "open" {
		if _, err := postJSON(base, admin1, "/api/v1/admin/markets/"+market.ID+"/lifecycle/close", map[string]any{
			"reason": "windowed resolution live proof close",
		}, http.StatusOK); err != nil {
			return fmt.Errorf("close market: %w", err)
		}
	} else if market.Status != "closed" {
		return fmt.Errorf("market %s is %s; expected open or closed for proof", cfg.MarketTicker, market.Status)
	}

	proposalRaw, err := postJSON(base, admin1, "/api/v1/admin/markets/"+market.ID+"/propose?windowHours=1", map[string]any{
		"result":            "yes",
		"attestationSource": "admin-manual",
		"reason":            "windowed resolution live proof proposal",
	}, http.StatusOK)
	if err != nil {
		return fmt.Errorf("propose: %w", err)
	}
	assertNoRetired(proposalRaw, "proposal")
	var proposal map[string]any
	if err := json.Unmarshal(proposalRaw, &proposal); err != nil {
		return fmt.Errorf("decode proposal: %w", err)
	}
	if proposal["status"] != "proposed" || proposal["proposedBy"] != cfg.Admin1ID {
		return fmt.Errorf("unexpected proposal payload: %s", proposalRaw)
	}
	if _, ok := proposal["challengeEndsAt"].(string); !ok {
		return fmt.Errorf("proposal missing challengeEndsAt: %s", proposalRaw)
	}

	if _, err := postJSON(base, admin2, "/api/v1/admin/settlements/"+market.ID, map[string]any{
		"result":            "yes",
		"attestationSource": "admin-manual",
	}, http.StatusBadRequest); err != nil {
		return fmt.Errorf("direct settle bypass check: %w", err)
	}

	disputeRaw, err := postJSON(base, player, "/api/v1/disputes", map[string]any{
		"marketId": market.ID,
		"reason":   "live proof holder challenge",
	}, http.StatusCreated)
	if err != nil {
		return fmt.Errorf("file dispute: %w", err)
	}
	assertNoRetired(disputeRaw, "dispute")
	var dispute struct {
		ID     string `json:"id"`
		Status string `json:"status"`
		UserID string `json:"userId"`
	}
	if err := json.Unmarshal(disputeRaw, &dispute); err != nil {
		return fmt.Errorf("decode dispute: %w", err)
	}
	if dispute.ID == "" || dispute.Status != "open" || dispute.UserID != cfg.PlayerID {
		return fmt.Errorf("unexpected dispute payload: %s", disputeRaw)
	}

	if err := expireChallengeWindow(ctx, db, market.ID); err != nil {
		return err
	}

	if _, err := postJSON(base, admin1, "/api/v1/admin/disputes/"+dispute.ID+"/resolve", map[string]any{
		"decision": "reject",
		"note":     "proposer must not review own proposed result",
	}, http.StatusBadRequest); err != nil {
		return fmt.Errorf("proposer dispute-review block: %w", err)
	}
	if _, err := postJSON(base, admin2, "/api/v1/admin/markets/"+market.ID+"/finalize", nil, http.StatusBadRequest); err != nil {
		return fmt.Errorf("open dispute finalize block: %w", err)
	}

	resolvedRaw, err := postJSON(base, admin2, "/api/v1/admin/disputes/"+dispute.ID+"/resolve", map[string]any{
		"decision": "reject",
		"note":     "challenge reviewed by second admin",
	}, http.StatusOK)
	if err != nil {
		return fmt.Errorf("second-admin dispute resolve: %w", err)
	}
	assertNoRetired(resolvedRaw, "resolved dispute")
	var resolved struct {
		Status     string  `json:"status"`
		ResolvedBy *string `json:"resolvedBy"`
	}
	if err := json.Unmarshal(resolvedRaw, &resolved); err != nil {
		return fmt.Errorf("decode resolved dispute: %w", err)
	}
	if resolved.Status != "rejected" || resolved.ResolvedBy == nil || *resolved.ResolvedBy != cfg.Admin2ID {
		return fmt.Errorf("unexpected resolved dispute: %s", resolvedRaw)
	}

	if _, err := postJSON(base, admin1, "/api/v1/admin/markets/"+market.ID+"/finalize", nil, http.StatusBadRequest); err != nil {
		return fmt.Errorf("same-admin finalize block: %w", err)
	}

	finalizeRaw, err := postJSON(base, admin2, "/api/v1/admin/markets/"+market.ID+"/finalize", nil, http.StatusOK)
	if err != nil {
		return fmt.Errorf("second-admin finalize: %w", err)
	}
	assertNoRetired(finalizeRaw, "finalize")
	var finalized struct {
		PointDisbursements         []any  `json:"pointDisbursements"`
		TotalSettlementPointsCents int64  `json:"totalSettlementPointsCents"`
		Unit                       string `json:"unit"`
		TapTradeLifecycle           struct {
			Stage string `json:"stage"`
		} `json:"taptradeLifecycle"`
	}
	if err := json.Unmarshal(finalizeRaw, &finalized); err != nil {
		return fmt.Errorf("decode finalize: %w", err)
	}
	if finalized.Unit != "PTS" || finalized.TotalSettlementPointsCents <= 0 || len(finalized.PointDisbursements) == 0 || finalized.TapTradeLifecycle.Stage != "settled" {
		return fmt.Errorf("unexpected finalize payload: %s", finalizeRaw)
	}

	fmt.Println("windowed resolution live proof passed")
	fmt.Printf("market=%s id=%s dispute=%s totalSettlementPointsCents=%d unit=%s\n", cfg.MarketTicker, market.ID, dispute.ID, finalized.TotalSettlementPointsCents, finalized.Unit)
	return nil
}

func ensureSecondAdmin(ctx context.Context, db *sql.DB, cfg proofConfig) error {
	var hash string
	if err := db.QueryRowContext(ctx, `SELECT password_hash FROM auth_users WHERE username = $1`, cfg.Admin1Email).Scan(&hash); err != nil {
		return fmt.Errorf("read seeded admin password hash: %w", err)
	}
	if _, err := db.ExecContext(ctx, `
INSERT INTO auth_users
  (id, username, password_hash, role, terms_accepted, terms_version, launch_disclosure_accepted, launch_disclosure_version)
VALUES ($1, $2, $3, 'admin', true, 'taptrade-launch-v1', true, 'points-no-cashout-v1')
ON CONFLICT (username) DO UPDATE SET id = EXCLUDED.id, password_hash = EXCLUDED.password_hash, role = 'admin'`,
		cfg.Admin2ID, cfg.Admin2Email, hash); err != nil {
		return fmt.Errorf("upsert second admin: %w", err)
	}
	if _, err := db.ExecContext(ctx, `
INSERT INTO admin_users (id, email, name, password_hash, status)
VALUES (md5($1)::uuid, $1, 'Live Proof Second Admin', $2, 'active')
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, status = 'active'`,
		cfg.Admin2Email, hash); err != nil {
		return fmt.Errorf("upsert second admin staff row: %w", err)
	}
	if _, err := db.ExecContext(ctx, `
INSERT INTO user_roles (user_id, role_id, granted_by)
SELECT id, 'operations-manager', 'windowed-resolution-live-proof'
FROM admin_users
WHERE email = $1
ON CONFLICT (user_id, role_id) DO NOTHING`,
		cfg.Admin2Email); err != nil {
		return fmt.Errorf("grant second admin operations role: %w", err)
	}
	return nil
}

func loadMarket(ctx context.Context, db *sql.DB, ticker string) (marketRow, error) {
	var row marketRow
	err := db.QueryRowContext(ctx, `SELECT id, status FROM prediction_markets WHERE ticker = $1`, ticker).Scan(&row.ID, &row.Status)
	if err != nil {
		return row, fmt.Errorf("load market %s: %w", ticker, err)
	}
	return row, nil
}

func ensureHolderPosition(ctx context.Context, db *sql.DB, userID, marketID string) error {
	var qty int64
	err := db.QueryRowContext(ctx, `SELECT COALESCE(SUM(quantity), 0) FROM prediction_positions WHERE user_id = $1 AND market_id = $2`, userID, marketID).Scan(&qty)
	if err != nil {
		return fmt.Errorf("check holder position: %w", err)
	}
	if qty <= 0 {
		return fmt.Errorf("user %s has no position in market %s", userID, marketID)
	}
	return nil
}

func expireChallengeWindow(ctx context.Context, db *sql.DB, marketID string) error {
	res, err := db.ExecContext(ctx, `
UPDATE prediction_resolution_proposals
SET challenge_ends_at = NOW() - INTERVAL '1 minute'
WHERE market_id = $1 AND status = 'proposed'`, marketID)
	if err != nil {
		return fmt.Errorf("expire challenge window: %w", err)
	}
	rows, _ := res.RowsAffected()
	if rows != 1 {
		return fmt.Errorf("expire challenge window affected %d rows", rows)
	}
	return nil
}

func login(base *url.URL, email, password string) (*session, error) {
	jar, _ := cookiejar.New(nil)
	s := &session{client: &http.Client{Jar: jar, Timeout: 10 * time.Second}}
	raw, err := postJSONWithClient(base, s, "/api/v1/auth/login/", map[string]any{
		"username": email,
		"password": password,
	}, http.StatusOK, false)
	if err != nil {
		return nil, err
	}
	if !bytes.Contains(raw, []byte("accessToken")) {
		return nil, fmt.Errorf("login response missing access token: %s", raw)
	}
	for _, cookie := range s.client.Jar.Cookies(base) {
		if cookie.Name == "csrf_token" {
			s.csrf = cookie.Value
		}
	}
	if s.csrf == "" {
		return nil, errors.New("login did not set csrf_token")
	}
	return s, nil
}

func postJSON(base *url.URL, s *session, path string, body any, want int) ([]byte, error) {
	return postJSONWithClient(base, s, path, body, want, true)
}

func postJSONWithClient(base *url.URL, s *session, path string, body any, want int, csrf bool) ([]byte, error) {
	var payload io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		payload = bytes.NewReader(b)
	}
	u := base.ResolveReference(&url.URL{Path: path})
	if strings.Contains(path, "?") {
		parts := strings.SplitN(path, "?", 2)
		u = base.ResolveReference(&url.URL{Path: parts[0], RawQuery: parts[1]})
	}
	req, err := http.NewRequest(http.MethodPost, u.String(), payload)
	if err != nil {
		return nil, err
	}
	req.Header.Set("content-type", "application/json")
	if csrf {
		req.Header.Set("X-CSRF-Token", s.csrf)
	}
	res, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	raw, _ := io.ReadAll(res.Body)
	if res.StatusCode != want {
		return nil, fmt.Errorf("%s returned %d, want %d body=%s", path, res.StatusCode, want, raw)
	}
	return raw, nil
}

func assertNoRetired(raw []byte, label string) {
	for _, retired := range []string{"\"payouts\"", "\"payoutCents\"", "\"pnlCents\"", "\"totalPayoutCents\"", "\"payoutsTotal\"", "\"payoutsCompleted\"", "\"currency\"", "\"bondCents\""} {
		if bytes.Contains(raw, []byte(retired)) {
			log.Fatalf("%s response emitted retired field %s: %s", label, retired, raw)
		}
	}
}

func envDefault(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}
