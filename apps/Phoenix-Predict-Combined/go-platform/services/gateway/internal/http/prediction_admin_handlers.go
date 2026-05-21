package http

import (
	"context"
	"encoding/json"
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
	GetAdminPunter(ctx context.Context, id string) (*prediction.AdminPunter, error)
	UpdatePunterStatus(ctx context.Context, id, status string) (*prediction.AdminPunter, error)
	ListAuditLogsAdmin(ctx context.Context, filter prediction.AdminAuditLogFilter, page, pageSize int) ([]prediction.AdminAuditLog, prediction.PageMeta, error)
	AddPunterNote(ctx context.Context, punterID, authorID, category, content string) (*prediction.AdminPunterNote, error)
	ListPunterNotes(ctx context.Context, punterID string) ([]prediction.AdminPunterNote, error)
}

// allowedPunterAdminStatuses gates the status values the office can set.
var allowedPunterAdminStatuses = map[string]struct{}{
	"active":       {},
	"suspended":    {},
	"self_excluded": {},
	"deactivated":  {},
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
	registerAdminPunterDetail(mux, "/api/v1/admin/punters/", repo)
	registerAdminPunterDetail(mux, "/admin/punters/", repo)
	registerAdminAuditLogsList(mux, "/api/v1/admin/audit-logs", repo)
	registerAdminAuditLogsList(mux, "/admin/audit-logs", repo)
}

// registerAdminPunterDetail handles the /punters/{id} subtree for the office
// /users/[id] page:
//
//	GET  /punters/{id}          → detail
//	PUT  /punters/{id}/status   → suspend/activate
//	GET  /punters/{id}/notes    → list admin CRM notes
//	POST /punters/{id}/notes    → add an admin CRM note
//
// reset-password / risk-segment / limits still return 501: risk-segment +
// limits were sportsbook leftovers and have been removed from the office UI
// (CLAUDE.md rule #2); reset-password is deferred (it spans the auth service
// and needs a flow decision). Returning 501 beats faking success (rule #7).
func registerAdminPunterDetail(mux *stdhttp.ServeMux, prefix string, repo predictionAdminReader) {
	mux.Handle(prefix, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if err := requireAdminRole(r); err != nil {
			return err
		}
		rest := strings.Trim(strings.TrimPrefix(r.URL.Path, prefix), "/")
		if rest == "" {
			return httpx.NotFound("punter not found")
		}
		parts := strings.Split(rest, "/")
		id := parts[0]

		// /punters/{id} — detail.
		if len(parts) == 1 {
			if r.Method != stdhttp.MethodGet {
				return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
			}
			p, err := repo.GetAdminPunter(r.Context(), id)
			if err != nil {
				return httpx.Internal("failed to load punter", err)
			}
			if p == nil {
				return httpx.NotFound("punter not found")
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, p)
		}

		// /punters/{id}/{action}.
		action := parts[1]
		switch action {
		case "status":
			if r.Method != stdhttp.MethodPut {
				return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPut)
			}
			var body struct {
				Status string `json:"status"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				return httpx.BadRequest("invalid request body", nil)
			}
			status := strings.TrimSpace(strings.ToLower(body.Status))
			if _, ok := allowedPunterAdminStatuses[status]; !ok {
				return httpx.BadRequest(
					"status must be one of active, suspended, self_excluded, deactivated",
					map[string]any{"field": "status", "value": body.Status},
				)
			}
			p, err := repo.UpdatePunterStatus(r.Context(), id, status)
			if err != nil {
				return httpx.Internal("failed to update punter status", err)
			}
			if p == nil {
				return httpx.NotFound("punter not found")
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, p)
		case "notes":
			// Admin CRM notes — prediction-native (no sportsbook semantics).
			switch r.Method {
			case stdhttp.MethodGet:
				notes, err := repo.ListPunterNotes(r.Context(), id)
				if err != nil {
					return httpx.Internal("failed to list notes", err)
				}
				return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"items": notes})
			case stdhttp.MethodPost:
				var body struct {
					Content  string `json:"content"`
					Category string `json:"category"`
				}
				if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
					return httpx.BadRequest("invalid request body", nil)
				}
				content := strings.TrimSpace(body.Content)
				if content == "" {
					return httpx.BadRequest("content is required",
						map[string]any{"field": "content"})
				}
				category := strings.TrimSpace(body.Category)
				authorID := httpx.UserIDFromContext(r.Context())
				if _, err := repo.AddPunterNote(r.Context(), id, authorID, category, content); err != nil {
					return httpx.Internal("failed to add note", err)
				}
				notes, err := repo.ListPunterNotes(r.Context(), id)
				if err != nil {
					return httpx.Internal("failed to list notes", err)
				}
				return httpx.WriteJSON(w, stdhttp.StatusCreated, map[string]any{"items": notes})
			default:
				return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet, stdhttp.MethodPost)
			}
		case "reset-password", "risk-segment", "limits":
			// reset-password: deferred (spans the auth service — needs a flow
			// decision). risk-segment + limits: removed from the office UI as
			// sportsbook leftovers (CLAUDE.md rule #2); kept here as 501 so any
			// stale caller gets a clear answer rather than a fake success.
			return httpx.NewError(stdhttp.StatusNotImplemented, "not_implemented",
				action+" is not available on the prediction platform yet", nil, nil)
		default:
			return httpx.NotFound("punter route not found")
		}
	}))
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
