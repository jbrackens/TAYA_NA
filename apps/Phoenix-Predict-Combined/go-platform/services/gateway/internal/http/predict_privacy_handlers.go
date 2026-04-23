package http

import (
	"context"
	"crypto/sha1"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	stdhttp "net/http"
	"strings"

	"phoenix-revival/platform/transport/httpx"
)

// registerPredictPrivacyRoutes wires the user-scoped privacy preferences
// endpoints. Currently one knob: the "appear anonymously on leaderboards"
// opt-out documented in PLAN-loyalty-leaderboards.md (NOT in scope v1 →
// shipped post-v1). Value lives on punters.display_anonymous.
//
// Routes:
//   GET /api/v1/me/privacy → {displayAnonymous: bool}
//   PUT /api/v1/me/privacy ← {displayAnonymous: bool}
func registerPredictPrivacyRoutes(mux *stdhttp.ServeMux, db *sql.DB) {
	if db == nil {
		return
	}

	mux.Handle("/api/v1/me/privacy", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		userID := strings.TrimSpace(userIDFromRequest(r))
		if userID == "" {
			return httpx.Unauthorized("authentication required")
		}

		switch r.Method {
		case stdhttp.MethodGet:
			flag, err := getDisplayAnonymous(r.Context(), db, userID)
			if err != nil {
				return httpx.Internal("privacy lookup failed", err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
				"displayAnonymous": flag,
			})

		case stdhttp.MethodPut:
			var body struct {
				DisplayAnonymous *bool `json:"displayAnonymous"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				return httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
			}
			if body.DisplayAnonymous == nil {
				return httpx.BadRequest("displayAnonymous is required", map[string]any{"field": "displayAnonymous"})
			}
			if err := setDisplayAnonymous(r.Context(), db, userID, *body.DisplayAnonymous); err != nil {
				return httpx.Internal("privacy update failed", err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
				"displayAnonymous": *body.DisplayAnonymous,
			})

		default:
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet, stdhttp.MethodPut)
		}
	}))
}

// getDisplayAnonymous reads the opt-out flag for a user. Missing row counts
// as false (default on the column) — we don't auto-provision the punter
// from the read path; ensurePunterExistsWithExec is the write path.
func getDisplayAnonymous(ctx context.Context, db *sql.DB, userID string) (bool, error) {
	var flag bool
	err := db.QueryRowContext(ctx,
		`SELECT display_anonymous FROM punters WHERE id = $1`, userID).
		Scan(&flag)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return flag, nil
}

// setDisplayAnonymous updates the opt-out flag. Inserts a punters row if it
// doesn't exist (rare — the wallet/settlement paths usually create it first,
// but a freshly-registered user who toggles privacy before trading wouldn't
// have a row yet). Email shape matches ensurePunterExistsWithExec in
// prediction/sql_repository.go so both auto-provision paths are consistent.
func setDisplayAnonymous(ctx context.Context, db *sql.DB, userID string, flag bool) error {
	emailDigest := fmt.Sprintf("%x", sha1.Sum([]byte(userID)))
	email := fmt.Sprintf("%s@predict.local", emailDigest)
	_, err := db.ExecContext(ctx, `
		INSERT INTO punters (id, email, status, display_anonymous)
		VALUES ($1, $2, 'active', $3)
		ON CONFLICT (id) DO UPDATE
		SET display_anonymous = EXCLUDED.display_anonymous,
		    updated_at = now()`,
		userID, email, flag,
	)
	return err
}
