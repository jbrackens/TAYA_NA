package http

import (
	"context"
	stdhttp "net/http"
	"strconv"
	"strings"

	"phoenix-revival/gateway/internal/prediction"
	"phoenix-revival/platform/transport/httpx"
)

// predictionAdminReader is the narrow slice of *prediction.SQLRepository that
// the admin user/audit routes need. Defining it here (interface segregation)
// avoids touching the large prediction.Repository interface — which has a
// caching decorator in internal/cache and several worker consumers — just to
// add two read methods.
type predictionAdminReader interface {
	ListPuntersAdmin(ctx context.Context, filter prediction.AdminPunterFilter, page, pageSize int) ([]prediction.AdminPunter, prediction.PageMeta, error)
	ListAuditLogsAdmin(ctx context.Context, filter prediction.AdminAuditLogFilter, page, pageSize int) ([]prediction.AdminAuditLog, prediction.PageMeta, error)
}

// registerPredictionAdminRoutes wires the prediction-native admin read APIs
// the office App-Router consumes:
//
//	GET /api/v1/admin/punters?page=&pageSize=&status=&search=
//	GET /api/v1/admin/audit-logs?page=&pageSize=&action=&resourceType=&actorId=
//
// These replace the never-wired sportsbook handlers in admin_handlers.go
// (registerAdminRoutes / registerAdminPunterRoutes), which depend on the
// legacy `domain` package and would reintroduce fixtures/bets surfaces.
// Both no-slash and trailing-slash forms are registered because the office's
// next.config.js rewrite + skipTrailingSlashRedirect can send either.
func registerPredictionAdminRoutes(mux *stdhttp.ServeMux, repo predictionAdminReader) {
	registerAdminPuntersList(mux, "/api/v1/admin/punters", repo)
	registerAdminPuntersList(mux, "/admin/punters", repo)
	registerAdminAuditLogsList(mux, "/api/v1/admin/audit-logs", repo)
	registerAdminAuditLogsList(mux, "/admin/audit-logs", repo)
}

func registerAdminPuntersList(mux *stdhttp.ServeMux, path string, repo predictionAdminReader) {
	mux.Handle(path, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		if err := requireAdminRole(r); err != nil {
			return err
		}

		page, pageSize := parseAdminPaging(r)
		filter := prediction.AdminPunterFilter{
			Status: strings.TrimSpace(r.URL.Query().Get("status")),
			Search: strings.TrimSpace(r.URL.Query().Get("search")),
		}

		items, meta, err := repo.ListPuntersAdmin(r.Context(), filter, page, pageSize)
		if err != nil {
			return httpx.Internal("failed to list punters", err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"items":      items,
			"pagination": meta,
		})
	}))
}

func registerAdminAuditLogsList(mux *stdhttp.ServeMux, path string, repo predictionAdminReader) {
	mux.Handle(path, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		if err := requireAdminRole(r); err != nil {
			return err
		}

		page, pageSize := parseAdminPaging(r)
		filter := prediction.AdminAuditLogFilter{
			Action:       strings.TrimSpace(r.URL.Query().Get("action")),
			ResourceType: strings.TrimSpace(r.URL.Query().Get("resourceType")),
			ActorID:      strings.TrimSpace(r.URL.Query().Get("actorId")),
		}

		items, meta, err := repo.ListAuditLogsAdmin(r.Context(), filter, page, pageSize)
		if err != nil {
			return httpx.Internal("failed to list audit logs", err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"items":      items,
			"pagination": meta,
		})
	}))
}

// parseAdminPaging reads page + pageSize query params with safe defaults.
// The repository clamps bounds; this just parses.
func parseAdminPaging(r *stdhttp.Request) (page, pageSize int) {
	page = 1
	pageSize = 50
	if v := strings.TrimSpace(r.URL.Query().Get("page")); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			page = n
		}
	}
	if v := strings.TrimSpace(r.URL.Query().Get("pageSize")); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			pageSize = n
		}
	}
	return page, pageSize
}
