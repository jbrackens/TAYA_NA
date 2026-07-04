package http

import (
	"context"
	stdhttp "net/http"
	"strconv"
	"strings"

	"phoenix-revival/gateway/internal/communications"
	"phoenix-revival/platform/transport/httpx"
)

// communicationsLister is the read seam the history route needs; *communications.Store
// satisfies it. Kept as an interface so the RBAC/method/path gates can be tested
// without a live database.
type communicationsLister interface {
	ListForUser(ctx context.Context, userID string, limit, offset int) ([]communications.Communication, error)
}

// registerCommunicationsAdminRoutes wires the per-player sent-communication
// history (GAP-43, PAM spec §20 Notes, Documents, and Communication History;
// Scenario 12):
//
//	GET /api/v1/admin/communications/{userId}  (users:read)
//
// Read-only over its own player_communications table — no prediction/wallet
// core. Registered under its own /communications/ prefix (not the /punters/
// subtree, which is owned by the manual-dispatch punter-detail router). Slice 2
// adds POST to record + dispatch an agent-initiated templated message.
func registerCommunicationsAdminRoutes(mux *stdhttp.ServeMux, store communicationsLister) {
	if store == nil {
		return
	}
	handler := httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if err := requireAdminPermission(r, "users:read"); err != nil {
			return err
		}
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		userID := ""
		for _, prefix := range []string{"/api/v1/admin/communications/", "/admin/communications/"} {
			if strings.HasPrefix(r.URL.Path, prefix) {
				userID = strings.Trim(strings.TrimPrefix(r.URL.Path, prefix), "/")
				break
			}
		}
		if userID == "" || strings.Contains(userID, "/") {
			return httpx.NotFound("communications require a user id")
		}

		limit := 0
		if v := strings.TrimSpace(r.URL.Query().Get("limit")); v != "" {
			if n, err := strconv.Atoi(v); err == nil {
				limit = n
			}
		}
		offset := 0
		if v := strings.TrimSpace(r.URL.Query().Get("offset")); v != "" {
			if n, err := strconv.Atoi(v); err == nil {
				offset = n
			}
		}

		items, err := store.ListForUser(r.Context(), userID, limit, offset)
		if err != nil {
			return httpx.Internal("failed to load communication history", err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"items": items})
	})
	mux.Handle("/api/v1/admin/communications/", handler)
	mux.Handle("/admin/communications/", handler)
}
