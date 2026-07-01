package http

import (
	"encoding/json"
	"log/slog"
	stdhttp "net/http"
	"strings"

	"phoenix-revival/gateway/internal/prediction"
	"phoenix-revival/gateway/internal/prediction/feed"
	"phoenix-revival/platform/transport/httpx"
)

// resolutionSourceHealthReporter is the slice of the AutoSettler the admin
// health endpoint needs (decouples the http layer from the worker concretely).
type resolutionSourceHealthReporter interface {
	Health() []feed.SourceHealth
}

// registerResolutionSourceRoutes exposes per-source resolution health for the
// office (ADR-0003 source-health monitoring + alerting):
//
//	GET /api/v1/admin/resolution-sources -> {items: [{source, healthy, ...}]}
//
// A degraded source (consecutive fetch failures) shows here so ops can act;
// the worker meanwhile leaves affected markets for manual settle.
func registerResolutionSourceRoutes(mux *stdhttp.ServeMux, reporter resolutionSourceHealthReporter) {
	mux.Handle("/api/v1/admin/resolution-sources", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if err := requireAdminRole(r); err != nil {
			return err
		}
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"items": resolutionSourceHealthPayloads(reporter.Health())})
	}))
	slog.Info("admin resolution-source health route registered")
}

func resolutionSourceHealthPayloads(items []feed.SourceHealth) []feed.SourceHealth {
	if items == nil {
		return nil
	}
	out := make([]feed.SourceHealth, len(items))
	for i, item := range items {
		out[i] = item
		out[i].LastError = redactLaunchProhibitedUserText(item.LastError)
	}
	return out
}

// registerAdminDisputeRoutes wires the office dispute-review queue (ADR-0004 #6):
//
//	GET  /api/v1/admin/disputes               -> open dispute queue
//	POST /api/v1/admin/disputes/{id}/resolve  -> uphold (void+refund) | reject
//
// All routes require the validated admin session role. Resolving applies the
// engine's dual-control (the reviewing admin must differ from the proposer).
// Market finalize lives on /api/v1/admin/markets/{id}/finalize (settlement
// routes); identity for dual-control is the session uid (userIDFromRequest) on
// every leg so the proposer/approver comparison is apples-to-apples.
func registerAdminDisputeRoutes(mux *stdhttp.ServeMux, svc *prediction.Service, store prediction.ResolutionStore) {
	// Queue: open disputes across all markets for the office review table.
	mux.Handle("/api/v1/admin/disputes", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if err := requireAdminRole(r); err != nil {
			return err
		}
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		status := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("status")))
		if status != "" && status != "open" {
			// The admin queue is open-only (the column is indexed for it); a
			// market's full dispute history is the per-market user GET.
			return httpx.BadRequest("only status=open is supported on the admin queue", map[string]any{"status": status})
		}
		disputes, err := store.ListOpenDisputes(r.Context())
		if err != nil {
			return httpx.Internal("failed to list disputes", err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"items": disputePayloads(disputes)})
	}))

	// Resolve: uphold (void the market, refund) or reject a single dispute.
	mux.Handle("/api/v1/admin/disputes/", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if err := requireAdminPermission(r, "settlements:resolve"); err != nil {
			return err
		}
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}
		rest := strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/v1/admin/disputes/"), "/")
		parts := strings.Split(rest, "/")
		if len(parts) != 2 || parts[0] == "" || strings.ToLower(parts[1]) != "resolve" {
			return httpx.NotFound("route not found")
		}
		disputeID := parts[0]

		var req struct {
			Decision string `json:"decision"` // "uphold" | "reject"
			Note     string `json:"note"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			return httpx.BadRequest("invalid request body", nil)
		}
		var uphold bool
		switch strings.ToLower(strings.TrimSpace(req.Decision)) {
		case "uphold":
			uphold = true
		case "reject":
			uphold = false
		default:
			return httpx.BadRequest("decision must be 'uphold' or 'reject'", map[string]any{"decision": req.Decision})
		}

		note := strings.TrimSpace(req.Note)
		if err := validateLaunchFacingReason("note", note); err != nil {
			return err
		}
		adminID := userIDFromRequest(r)
		dispute, err := svc.ResolveDispute(r.Context(), disputeID, uphold, note, actorIDPointer(adminID))
		if err != nil {
			return serviceBadRequestError(err, nil)
		}
		recordProviderOpsAuditAction(adminID, "dispute.resolved", dispute.MarketID, map[string]any{
			"disputeId": dispute.ID,
			"decision":  dispute.Status,
		})
		return httpx.WriteJSON(w, stdhttp.StatusOK, disputePayload(*dispute))
	}))

	slog.Info("admin dispute-review routes registered")
}
