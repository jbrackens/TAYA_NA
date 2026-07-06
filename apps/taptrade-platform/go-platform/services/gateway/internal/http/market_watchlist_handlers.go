package http

import (
	"context"
	"database/sql"
	stdhttp "net/http"
	"strings"
	"sync"

	"taptrade/platform/transport/httpx"
)

type marketWatchlistStore interface {
	List(ctx context.Context, userID string) ([]string, error)
	Add(ctx context.Context, userID, marketID string) error
	Remove(ctx context.Context, userID, marketID string) error
}

type memoryMarketWatchlistStore struct {
	mu    sync.Mutex
	items map[string]map[string]struct{}
}

func newMarketWatchlistStore(db *sql.DB) marketWatchlistStore {
	if db != nil {
		return &sqlMarketWatchlistStore{db: db}
	}
	return &memoryMarketWatchlistStore{items: map[string]map[string]struct{}{}}
}

func (s *memoryMarketWatchlistStore) List(_ context.Context, userID string) ([]string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	rows := []string{}
	for marketID := range s.items[userID] {
		rows = append(rows, marketID)
	}
	return rows, nil
}

func (s *memoryMarketWatchlistStore) Add(_ context.Context, userID, marketID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.items[userID] == nil {
		s.items[userID] = map[string]struct{}{}
	}
	s.items[userID][marketID] = struct{}{}
	return nil
}

func (s *memoryMarketWatchlistStore) Remove(_ context.Context, userID, marketID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.items[userID], marketID)
	return nil
}

type sqlMarketWatchlistStore struct {
	db *sql.DB
}

func (s *sqlMarketWatchlistStore) List(ctx context.Context, userID string) ([]string, error) {
	if err := s.ensureSchema(ctx); err != nil {
		return nil, err
	}
	rows, err := s.db.QueryContext(ctx, `
SELECT market_id
FROM prediction_market_watchlist
WHERE user_id = $1
ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []string{}
	for rows.Next() {
		var marketID string
		if err := rows.Scan(&marketID); err != nil {
			return nil, err
		}
		items = append(items, marketID)
	}
	return items, rows.Err()
}

func (s *sqlMarketWatchlistStore) Add(ctx context.Context, userID, marketID string) error {
	if err := s.ensureSchema(ctx); err != nil {
		return err
	}
	_, err := s.db.ExecContext(ctx, `
INSERT INTO prediction_market_watchlist (user_id, market_id)
VALUES ($1, $2)
ON CONFLICT (user_id, market_id) DO NOTHING`, userID, marketID)
	return err
}

func (s *sqlMarketWatchlistStore) Remove(ctx context.Context, userID, marketID string) error {
	if err := s.ensureSchema(ctx); err != nil {
		return err
	}
	_, err := s.db.ExecContext(ctx, `
DELETE FROM prediction_market_watchlist
WHERE user_id = $1 AND market_id = $2`, userID, marketID)
	return err
}

func (s *sqlMarketWatchlistStore) ensureSchema(ctx context.Context) error {
	_, err := s.db.ExecContext(ctx, `
CREATE TABLE IF NOT EXISTS prediction_market_watchlist (
  user_id TEXT NOT NULL,
  market_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, market_id)
);
CREATE INDEX IF NOT EXISTS idx_prediction_market_watchlist_user_created
  ON prediction_market_watchlist (user_id, created_at DESC);`)
	return err
}

func registerMarketWatchlistRoutes(mux *stdhttp.ServeMux, store marketWatchlistStore) {
	mux.Handle("/api/v1/watchlist/markets", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		userID := httpx.UserIDFromContext(r.Context())
		if userID == "" {
			return httpx.Forbidden("authentication required")
		}
		items, err := store.List(r.Context(), userID)
		if err != nil {
			return httpx.Internal("failed to load watchlist", err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"items": items, "total": len(items)})
	}))

	mux.Handle("/api/v1/watchlist/markets/", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		userID := httpx.UserIDFromContext(r.Context())
		if userID == "" {
			return httpx.Forbidden("authentication required")
		}
		marketID := strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/v1/watchlist/markets/"), "/")
		if marketID == "" || strings.Contains(marketID, "/") {
			return httpx.NotFound("watchlist market resource not found")
		}
		switch r.Method {
		case stdhttp.MethodPut, stdhttp.MethodPost:
			if err := store.Add(r.Context(), userID, marketID); err != nil {
				return httpx.Internal("failed to add watchlist market", err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"marketId": marketID, "watched": true})
		case stdhttp.MethodDelete:
			if err := store.Remove(r.Context(), userID, marketID); err != nil {
				return httpx.Internal("failed to remove watchlist market", err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"marketId": marketID, "watched": false})
		default:
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPut, stdhttp.MethodPost, stdhttp.MethodDelete)
		}
	}))
}
