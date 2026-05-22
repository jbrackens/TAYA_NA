package http

import (
	"context"
	"encoding/json"
	stdhttp "net/http"
	"sort"
	"strconv"
	"strings"

	"phoenix-revival/gateway/internal/prediction"
	"phoenix-revival/gateway/internal/wallet"
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
	GetPortfolioSummary(ctx context.Context, userID string) (*prediction.PortfolioSummary, error)
	ListPuntersRealizedPnl(ctx context.Context, userIDs []string) (map[string]int64, error)
	ListSettledPositions(ctx context.Context, userID string, page, pageSize int) ([]prediction.Payout, int, error)
}

// adminWalletBalanceReader is the wallet access the admin punter routes need:
// a single cash balance (detail) and a batched lookup (list). Satisfied by
// *wallet.Service — kept behind an interface so the http layer stays testable.
type adminWalletBalanceReader interface {
	Balance(userID string) int64
	Balances(userIDs []string) map[string]int64
	Ledger(userID string, limit int) []wallet.LedgerEntry
}

// allowedPunterAdminStatuses gates the status values the office can set.
var allowedPunterAdminStatuses = map[string]struct{}{
	"active":        {},
	"suspended":     {},
	"self_excluded": {},
	"deactivated":   {},
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
func registerPredictionAdminRoutes(mux *stdhttp.ServeMux, repo predictionAdminReader, wallet adminWalletBalanceReader) {
	registerAdminPuntersList(mux, "/api/v1/admin/punters", repo, wallet)
	registerAdminPuntersList(mux, "/admin/punters", repo, wallet)
	registerAdminPunterDetail(mux, "/api/v1/admin/punters/", repo, wallet)
	registerAdminPunterDetail(mux, "/admin/punters/", repo, wallet)
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
func registerAdminPunterDetail(mux *stdhttp.ServeMux, prefix string, repo predictionAdminReader, wallet adminWalletBalanceReader) {
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
			// Enrich with the player's financials: wallet cash balance + the
			// prediction portfolio summary (value, realized P&L, positions,
			// accuracy). Reuses the same GetPortfolioSummary the player app uses.
			ps, err := repo.GetPortfolioSummary(r.Context(), id)
			if err != nil {
				return httpx.Internal("failed to load portfolio", err)
			}
			detail := prediction.AdminPunterDetail{
				AdminPunter:        *p,
				WalletBalanceCents: wallet.Balance(id),
				Portfolio:          *ps,
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, detail)
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
		case "settlements":
			// Settled-position (trade) history for the Trade History tab.
			if r.Method != stdhttp.MethodGet {
				return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
			}
			page, pageSize := parseAdminPaging(r)
			payouts, total, err := repo.ListSettledPositions(r.Context(), id, page, pageSize)
			if err != nil {
				return httpx.Internal("failed to load settlement history", err)
			}
			if payouts == nil {
				payouts = []prediction.Payout{}
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
				"items": payouts,
				"total": total,
			})
		case "wallet":
			// Wallet transaction ledger for the Wallet tab.
			if r.Method != stdhttp.MethodGet {
				return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
			}
			limit := 50
			if v := strings.TrimSpace(r.URL.Query().Get("limit")); v != "" {
				if n, convErr := strconv.Atoi(v); convErr == nil && n > 0 && n <= 200 {
					limit = n
				}
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
				"items": wallet.Ledger(id, limit),
			})
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

func registerAdminPuntersList(mux *stdhttp.ServeMux, path string, repo predictionAdminReader, wallet adminWalletBalanceReader) {
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

		// Enrich the page with the two financials the roster shows — wallet
		// balance + realized P&L — batch-fetched for all rows (not per-row).
		ids := make([]string, 0, len(items))
		for _, it := range items {
			ids = append(ids, it.ID)
		}
		balances := wallet.Balances(ids)
		pnls, err := repo.ListPuntersRealizedPnl(r.Context(), ids)
		if err != nil {
			return httpx.Internal("failed to load punter financials", err)
		}
		enriched := make([]prediction.AdminPunterListItem, 0, len(items))
		for _, it := range items {
			enriched = append(enriched, prediction.AdminPunterListItem{
				AdminPunter:        it,
				WalletBalanceCents: balances[it.ID],
				RealizedPnlCents:   pnls[it.ID],
			})
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"items":      enriched,
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

		// Audit entries live in two stores: the audit_logs table (admin + demo
		// rows) and the in-process provider-ops store, where privileged
		// money-moving actions (wallet adjustments, settlements) are recorded.
		// Merge both so money/settlement audit surfaces in the office view, then
		// sort + paginate the combined set.
		dbItems, _, err := repo.ListAuditLogsAdmin(r.Context(), filter, 1, mergedAuditFetchCap)
		if err != nil {
			return httpx.Internal("failed to list audit logs", err)
		}
		merged := append(dbItems, providerOpsAuditAsAdminLogs(filter)...)
		sort.SliceStable(merged, func(i, j int) bool {
			return merged[i].OccurredAt > merged[j].OccurredAt
		})
		items, meta := paginateAdminAuditLogs(merged, page, pageSize)
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"items":      items,
			"pagination": meta,
		})
	}))
}

// mergedAuditFetchCap bounds how many audit_logs rows are pulled for the
// in-memory merge with the provider-ops store. audit_logs is small (admin +
// demo rows); the provider-ops store is itself capped at providerOpsAuditLimit.
const mergedAuditFetchCap = 1000

// providerOpsAuditAsAdminLogs converts the in-process provider-ops audit store
// (where money-moving actions are recorded) into the admin audit-log shape,
// applying the same filter as the SQL query. resourceType is derived from the
// action prefix (e.g. "wallet.credit" -> "wallet") so the resourceType filter
// works for these entries too.
func providerOpsAuditAsAdminLogs(filter prediction.AdminAuditLogFilter) []prediction.AdminAuditLog {
	entries := providerOpsAuditSnapshot()
	out := make([]prediction.AdminAuditLog, 0, len(entries))
	for _, e := range entries {
		resourceType := e.Action
		if i := strings.IndexByte(e.Action, '.'); i > 0 {
			resourceType = e.Action[:i]
		}
		if filter.Action != "" && e.Action != filter.Action {
			continue
		}
		if filter.ResourceType != "" && resourceType != filter.ResourceType {
			continue
		}
		if filter.ActorID != "" && e.ActorID != filter.ActorID {
			continue
		}
		item := prediction.AdminAuditLog{
			ID:         e.ID,
			Action:     e.Action,
			Status:     "recorded",
			OccurredAt: e.OccurredAt,
		}
		if e.ActorID != "" {
			actor := e.ActorID
			item.ActorID = &actor
		}
		if resourceType != "" {
			rt := resourceType
			item.ResourceType = &rt
		}
		if e.TargetID != "" {
			target := e.TargetID
			item.TargetID = &target
		}
		if d := strings.TrimSpace(e.Details); d != "" {
			if json.Valid([]byte(d)) {
				item.Details = json.RawMessage(d)
			} else if encoded, err := json.Marshal(d); err == nil {
				item.Details = encoded
			}
		}
		out = append(out, item)
	}
	return out
}

// paginateAdminAuditLogs slices the merged audit list to the requested page.
func paginateAdminAuditLogs(items []prediction.AdminAuditLog, page, pageSize int) ([]prediction.AdminAuditLog, prediction.PageMeta) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 50
	}
	total := len(items)
	start := (page - 1) * pageSize
	if start > total {
		start = total
	}
	end := start + pageSize
	if end > total {
		end = total
	}
	pageItems := append([]prediction.AdminAuditLog{}, items[start:end]...)
	return pageItems, prediction.PageMeta{
		Page:     page,
		PageSize: pageSize,
		Total:    total,
		HasNext:  end < total,
	}
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
