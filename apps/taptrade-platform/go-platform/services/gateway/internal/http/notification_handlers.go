package http

// Per-user notifications: the inbox behind the top-bar bell, and the
// settlement-payouts seam implementation that writes to it.
//
// Delivery is three-channel per position holder, all post-commit and
// best-effort (payouts are already committed; portfolio history is the
// recovery path for any lost notification):
//
//	portfolio:<uid> WS  — live: the toast for users connected right now
//	user_notifications  — durable: the bell badge on the next visit
//	notify.Notifier     — off-app: email when SMTP is configured, log otherwise
//
// The store follows the watchlist pattern: SQL-backed when a DB is present,
// in-memory otherwise (dev memory mode + handler tests).

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log/slog"
	stdhttp "net/http"
	"strings"
	"sync"
	"time"

	"github.com/lib/pq"

	"taptrade/gateway/internal/prediction"
	"taptrade/gateway/internal/ws"
	"taptrade/platform/transport/httpx"
)

type userNotification struct {
	ID        int64          `json:"id"`
	UserID    string         `json:"-"`
	Kind      string         `json:"kind"`
	Title     string         `json:"title"`
	Body      string         `json:"body"`
	MarketID  *string        `json:"marketId,omitempty"`
	Payload   map[string]any `json:"payload"`
	CreatedAt time.Time      `json:"createdAt"`
	ReadAt    *time.Time     `json:"readAt,omitempty"`
}

type notificationStore interface {
	InsertBatch(ctx context.Context, items []userNotification) error
	List(ctx context.Context, userID string, limit int) ([]userNotification, error)
	UnreadCount(ctx context.Context, userID string) (int, error)
	// MarkRead marks the given ids (or every unread row when all=true) read
	// for userID and returns how many rows changed. Ids belonging to other
	// users never match — the WHERE clause is ownership-scoped.
	MarkRead(ctx context.Context, userID string, ids []int64, all bool) (int, error)
}

func newNotificationStore(db *sql.DB) notificationStore {
	if db != nil {
		return &sqlNotificationStore{db: db}
	}
	return &memoryNotificationStore{}
}

type sqlNotificationStore struct{ db *sql.DB }

func (s *sqlNotificationStore) InsertBatch(ctx context.Context, items []userNotification) error {
	if len(items) == 0 {
		return nil
	}
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	stmt, err := tx.PrepareContext(ctx,
		`INSERT INTO user_notifications (user_id, kind, title, body, market_id, payload)
		 VALUES ($1, $2, $3, $4, $5, $6)`)
	if err != nil {
		return err
	}
	defer stmt.Close()
	for _, n := range items {
		payload, jerr := json.Marshal(n.Payload)
		if jerr != nil {
			payload = []byte("{}")
		}
		if _, err := stmt.ExecContext(ctx, n.UserID, n.Kind, n.Title, n.Body, n.MarketID, payload); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (s *sqlNotificationStore) List(ctx context.Context, userID string, limit int) ([]userNotification, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, kind, title, body, market_id, payload, created_at, read_at
		   FROM user_notifications
		  WHERE user_id = $1
		  ORDER BY created_at DESC, id DESC
		  LIMIT $2`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []userNotification{}
	for rows.Next() {
		var (
			n       userNotification
			payload []byte
		)
		if err := rows.Scan(&n.ID, &n.Kind, &n.Title, &n.Body, &n.MarketID, &payload, &n.CreatedAt, &n.ReadAt); err != nil {
			return nil, err
		}
		if len(payload) > 0 {
			_ = json.Unmarshal(payload, &n.Payload)
		}
		if n.Payload == nil {
			n.Payload = map[string]any{}
		}
		out = append(out, n)
	}
	return out, rows.Err()
}

func (s *sqlNotificationStore) UnreadCount(ctx context.Context, userID string) (int, error) {
	var count int
	err := s.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM user_notifications WHERE user_id = $1 AND read_at IS NULL`,
		userID).Scan(&count)
	return count, err
}

func (s *sqlNotificationStore) MarkRead(ctx context.Context, userID string, ids []int64, all bool) (int, error) {
	var (
		res sql.Result
		err error
	)
	if all {
		res, err = s.db.ExecContext(ctx,
			`UPDATE user_notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL`,
			userID)
	} else {
		if len(ids) == 0 {
			return 0, nil
		}
		res, err = s.db.ExecContext(ctx,
			`UPDATE user_notifications SET read_at = NOW()
			  WHERE user_id = $1 AND read_at IS NULL AND id = ANY($2)`,
			userID, pq.Array(ids))
	}
	if err != nil {
		return 0, err
	}
	n, _ := res.RowsAffected()
	return int(n), nil
}

type memoryNotificationStore struct {
	mu    sync.Mutex
	seq   int64
	items []userNotification
}

func (s *memoryNotificationStore) InsertBatch(_ context.Context, items []userNotification) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now().UTC()
	for _, n := range items {
		s.seq++
		n.ID = s.seq
		n.CreatedAt = now
		if n.Payload == nil {
			n.Payload = map[string]any{}
		}
		// Prepend: newest first, matching the SQL ORDER BY.
		s.items = append([]userNotification{n}, s.items...)
	}
	return nil
}

func (s *memoryNotificationStore) List(_ context.Context, userID string, limit int) ([]userNotification, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := []userNotification{}
	for _, n := range s.items {
		if n.UserID != userID {
			continue
		}
		out = append(out, n)
		if len(out) >= limit {
			break
		}
	}
	return out, nil
}

func (s *memoryNotificationStore) UnreadCount(_ context.Context, userID string) (int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	count := 0
	for _, n := range s.items {
		if n.UserID == userID && n.ReadAt == nil {
			count++
		}
	}
	return count, nil
}

func (s *memoryNotificationStore) MarkRead(_ context.Context, userID string, ids []int64, all bool) (int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	wanted := map[int64]bool{}
	for _, id := range ids {
		wanted[id] = true
	}
	now := time.Now().UTC()
	changed := 0
	for i := range s.items {
		n := &s.items[i]
		if n.UserID != userID || n.ReadAt != nil {
			continue
		}
		if all || wanted[n.ID] {
			t := now
			n.ReadAt = &t
			changed++
		}
	}
	return changed, nil
}

// registerNotificationRoutes mounts the authenticated inbox API.
//
//	GET  /api/v1/notifications        → {items, unreadCount}
//	POST /api/v1/notifications/read   → {"ids":[...]} or {"all":true} → {markedRead}
func registerNotificationRoutes(mux *stdhttp.ServeMux, store notificationStore) {
	mux.Handle("/api/v1/notifications", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		userID := userIDFromRequest(r)
		if userID == "" {
			return httpx.Unauthorized("authentication required")
		}
		limit := clampedQueryParam(r, "limit", 20, 100)
		items, err := store.List(r.Context(), userID, limit)
		if err != nil {
			return httpx.Internal("failed to fetch notifications", err)
		}
		unread, err := store.UnreadCount(r.Context(), userID)
		if err != nil {
			return httpx.Internal("failed to count notifications", err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"items":       items,
			"unreadCount": unread,
		})
	}))

	mux.Handle("/api/v1/notifications/read", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}
		userID := userIDFromRequest(r)
		if userID == "" {
			return httpx.Unauthorized("authentication required")
		}
		var req struct {
			IDs []int64 `json:"ids"`
			All bool    `json:"all"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			return httpx.BadRequest("invalid request body", nil)
		}
		if !req.All && len(req.IDs) == 0 {
			return httpx.BadRequest("ids or all required", nil)
		}
		changed, err := store.MarkRead(r.Context(), userID, req.IDs, req.All)
		if err != nil {
			return httpx.Internal("failed to mark notifications read", err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"markedRead": changed})
	}))

	slog.Info("notification routes registered")
}

// userEmailLookup resolves notification email addresses for a set of user
// ids from auth_users (same database; the RBAC admin login already crosses
// this seam in the other direction). Username doubles as the address for
// email-registered accounts; the email column wins when set. Ids without a
// plausible address are simply absent from the result.
func userEmailLookup(ctx context.Context, db *sql.DB, userIDs []string) map[string]string {
	out := map[string]string{}
	if db == nil || len(userIDs) == 0 {
		return out
	}
	rows, err := db.QueryContext(ctx,
		`SELECT id, COALESCE(NULLIF(email, ''), username) FROM auth_users WHERE id = ANY($1)`,
		pq.Array(userIDs))
	if err != nil {
		slog.Warn("notifications: email lookup failed", "error", err)
		return out
	}
	defer rows.Close()
	for rows.Next() {
		var id, addr string
		if err := rows.Scan(&id, &addr); err != nil {
			continue
		}
		if strings.Contains(addr, "@") {
			out[id] = addr
		}
	}
	return out
}

// settlementNotificationText renders the per-user title/body for one payout.
// Points-only language throughout (launch boundary): points are "paid out"
// or "returned", never won money.
func settlementNotificationText(market *prediction.Market, kind string, p prediction.Payout) (notifKind, title, body string) {
	side := strings.ToUpper(string(p.Side))
	if kind == "voided" {
		return "market_voided",
			fmt.Sprintf("Market voided: %s", market.Ticker),
			fmt.Sprintf("%q was voided — your %s position (%d shares) is refunded %d PTS at entry cost.",
				market.Title, side, p.Quantity, p.PayoutPoints)
	}
	result := "—"
	if market.Result != nil {
		result = strings.ToUpper(string(*market.Result))
	}
	if p.PayoutPoints > 0 {
		return "settlement_paid",
			fmt.Sprintf("Settled %s: +%d PTS", result, p.PayoutPoints),
			fmt.Sprintf("%q settled %s — your %s position (%d shares) paid out %d PTS.",
				market.Title, result, side, p.Quantity, p.PayoutPoints)
	}
	return "settlement_closed",
		fmt.Sprintf("Settled %s: %s", result, market.Ticker),
		fmt.Sprintf("%q settled %s — your %s position (%d shares) closed at 0 PTS.",
			market.Title, result, side, p.Quantity)
}

// makeSettlementPayoutsHandler builds the prediction.SettlementPayoutsHandler
// wired in registerHandlers. Fired post-commit in a goroutine; every channel
// below is best-effort.
func makeSettlementPayoutsHandler(
	store notificationStore,
	hub *ws.Hub,
	walletBalance func(ctx context.Context, userID string) int64,
	notifier interface {
		Notify(ctx context.Context, to []string, subject, body string) error
	},
	authDB *sql.DB,
) prediction.SettlementPayoutsHandler {
	return func(market *prediction.Market, kind string, payouts []prediction.Payout) {
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		rows := make([]userNotification, 0, len(payouts))
		userIDs := make([]string, 0, len(payouts))
		for _, p := range payouts {
			notifKind, title, body := settlementNotificationText(market, kind, p)
			marketID := market.ID
			payload := map[string]any{
				"type":         "settlement",
				"kind":         notifKind,
				"marketId":     market.ID,
				"ticker":       market.Ticker,
				"title":        market.Title,
				"side":         p.Side,
				"quantity":     p.Quantity,
				"payoutPoints": p.PayoutPoints,
				"pnlPoints":    p.PnlPoints,
				"unit":         "PTS",
				"ts":           wsEventTS(),
			}
			if market.Result != nil {
				payload["result"] = *market.Result
			}
			rows = append(rows, userNotification{
				UserID:   p.UserID,
				Kind:     notifKind,
				Title:    title,
				Body:     body,
				MarketID: &marketID,
				Payload:  payload,
			})
			userIDs = append(userIDs, p.UserID)

			// Live channel: the connected user's toast + portfolio refresh.
			if hub != nil {
				hub.NotifyPortfolioUpdate(p.UserID, payload)
				hub.NotifyWalletUpdate(p.UserID, map[string]any{
					"userId":        p.UserID,
					"balancePoints": walletBalance(ctx, p.UserID),
					"unit":          "PTS",
					"reason":        "settlement",
					"marketId":      market.ID,
					"ts":            wsEventTS(),
				})
			}
		}

		// Durable channel: the bell.
		if err := store.InsertBatch(ctx, rows); err != nil {
			slog.Warn("notifications: settlement insert failed",
				"market_id", market.ID, "count", len(rows), "error", err)
		}

		// Off-app channel: per-user email (log transport until SMTP_HOST).
		if notifier != nil {
			emails := userEmailLookup(ctx, authDB, userIDs)
			for _, n := range rows {
				addr, ok := emails[n.UserID]
				if !ok {
					continue
				}
				if err := notifier.Notify(ctx, []string{addr}, n.Title, n.Body); err != nil {
					slog.Warn("notifications: settlement email failed",
						"user_id", n.UserID, "error", err)
				}
			}
		}
	}
}
